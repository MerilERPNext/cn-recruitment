"""Alumni Employee checkbox handler — checkbox-based Alumni User provisioning.

The `custom_is_alumni_employee` checkbox is the **only** trigger for creating the
alumni (personal-email) User. It can be set:
  * Manually by HR / System Manager on an exited (Left / Inactive) employee
  * Automatically by workflow/approval (e.g., Alumni Employee Request approval)
  * By `sync_alumni_flag`, which defaults it on when status transitions to Left

Division of responsibility (see also ``employee_user_state``):
  * ``Employee.status`` (Left / Inactive) governs the **company-email** User:
    it is disabled by ``employee_user_state.disable_company_user_on_exit``
    (and by ERPNext's own status sync).
  * ``custom_is_alumni_employee`` governs the **alumni personal-email** User:
    0→1 creates / re-enables it, 1→0 disables it.

This module therefore never touches the company-email User. In particular,
unticking the checkbox does NOT re-enable the company login of an exited
employee — that stays disabled as long as the status says Left / Inactive.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, validate_email_address

from recruitment.recruitment.alumni_portal import ALUMNI_FLAG
from recruitment.recruitment.alumni_user_switch import (
    _find_user,
    _create_alumni_user,
    _configure_alumni_user,
)
from recruitment.recruitment.employee_user_state import EXITED_STATUSES

_LOGGER = "alumni_checkbox_handler"


def _log(event: str, employee: str, **extra) -> None:
    """Structured, non-sensitive audit line."""
    detail = " ".join(f"{k}={v}" for k, v in extra.items() if v is not None)
    frappe.logger(_LOGGER).info(f"{event} employee={employee} {detail}".strip())


def _is_alumni_checkbox_enabling(doc) -> bool:
    """True when `custom_is_alumni_employee` is being enabled (0→1)."""
    before = doc.get_doc_before_save()
    old_value = cint(before.get(ALUMNI_FLAG)) if before else 0
    new_value = cint(doc.get(ALUMNI_FLAG))
    return old_value == 0 and new_value == 1


def _is_alumni_checkbox_disabling(doc) -> bool:
    """True when `custom_is_alumni_employee` is being disabled (1→0)."""
    before = doc.get_doc_before_save()
    old_value = cint(before.get(ALUMNI_FLAG)) if before else 0
    new_value = cint(doc.get(ALUMNI_FLAG))
    return old_value == 1 and new_value == 0


def validate_alumni_personal_email_for_checkbox(doc, method: str | None = None) -> None:
    """Employee ``validate`` hook: when the alumni checkbox is being enabled by
    hand (0→1), require an exited status and a usable Personal Email.

    Ordinary saves of an already-alumni employee are untouched.

    When the checkbox is set by the Alumni Request approval workflow (via
    `mark_employee_as_alumni()`), these checks are bypassed — they apply to
    manual user-initiated changes only. The `on_update` handler then attempts
    Alumni User creation and handles a missing Personal Email gracefully.
    """
    if not _is_alumni_checkbox_enabling(doc):
        return

    # Skip validation if this is being set by the approval workflow, not a manual user action.
    if frappe.local.flags.get("_alumni_checkbox_from_approval_workflow"):
        return

    # An alumni account is for someone who has left: the personal-email User is
    # created for an exited (Left / Inactive) employee only.
    if (doc.status or "") not in EXITED_STATUSES:
        frappe.throw(
            _("Alumni Employee can only be enabled for an employee whose status is "
              "Left or Inactive (current status: {0}).").format(doc.status or "-"),
            title=_("Employee Still Active"),
        )

    personal = (doc.get("personal_email") or "").strip()
    if not personal:
        frappe.throw(
            _("Personal Email is required to enable Alumni Employee status."),
            title=_("Personal Email Required"),
        )

    try:
        validate_email_address(personal, throw=True)
    except frappe.PermissionError:
        raise
    except Exception:
        frappe.throw(
            _("Personal Email '{0}' is not a valid email address.").format(personal),
            title=_("Invalid Personal Email"),
        )

    # Prevent creating an Alumni User with the same address as the company login.
    company_login = (doc.get("user_id") or "").strip()
    company_email = (doc.get("company_email") or "").strip()
    if personal in {company_login, company_email} and personal:
        frappe.throw(
            _("Personal Email must be different from the company email so the "
              "alumni account is independent."),
            title=_("Personal Email Conflict"),
        )


def handle_alumni_checkbox_change(doc, method: str | None = None) -> None:
    """Employee ``on_update`` hook: provision or disable the alumni User on
    checkbox changes.

    When `custom_is_alumni_employee` changes:
      * 0→1 (enabling alumni):
        - Create (or reuse and re-enable) the Alumni User from Personal Email
        - Link it to the Employee via `custom_alumni_user`
      * 1→0 (disabling alumni):
        - Disable the Alumni Personal Email User

    The company-email User is never touched here: its enabled state follows
    `Employee.status` (see ``employee_user_state``).

    Runs only on actual checkbox changes; ordinary saves never re-create users.
    Any failure is logged — this must never block Employee saves.
    """
    if _is_alumni_checkbox_enabling(doc):
        try:
            personal = (doc.get("personal_email") or "").strip()
            if not personal:
                # Personal Email is missing. This can happen when the checkbox is set
                # by the Alumni Request approval workflow (which bypasses validation),
                # but the Employee hasn't added a Personal Email yet. Skip Alumni User
                # creation for now — it will be created once the Employee adds a
                # Personal Email and the checkbox is re-saved.
                _log("alumni_enable_skipped_no_personal_email", doc.name)
                return

            company_user = (doc.get("user_id") or "").strip()
            if personal == company_user:
                # Same address — no separate account needed.
                _log("alumni_enable_skipped_same_address", doc.name)
                return

            # Find or create the Alumni User (both paths leave it enabled)
            existing = _find_user(personal)
            if existing:
                _configure_alumni_user(existing)
                alumni_user = existing
                _log("alumni_user_reused_on_checkbox", doc.name, user=alumni_user)
            else:
                alumni_user = _create_alumni_user(doc, personal)
                _log("alumni_user_created_on_checkbox", doc.name, user=alumni_user)

            # Link the Alumni User to the Employee
            if frappe.get_meta("Employee").get_field("custom_alumni_user"):
                if doc.get("custom_alumni_user") != alumni_user:
                    doc.db_set("custom_alumni_user", alumni_user, update_modified=False)

            # Make sure the Alumni User is enabled
            if cint(frappe.db.get_value("User", alumni_user, "enabled")) == 0:
                frappe.db.set_value(
                    "User", alumni_user, "enabled", 1, update_modified=False
                )
                _log("alumni_user_enabled_on_checkbox", doc.name, user=alumni_user)

        except Exception:
            _log("alumni_checkbox_enable_failed", doc.name)
            frappe.log_error(
                frappe.get_traceback(),
                f"Failed to enable Alumni User for Employee {doc.name}",
            )

    elif _is_alumni_checkbox_disabling(doc):
        try:
            alumni_user = (doc.get("custom_alumni_user") or "").strip() or _find_user(
                (doc.get("personal_email") or "").strip()
            )
            company_user = (doc.get("user_id") or "").strip()
            if alumni_user and alumni_user == company_user:
                # Shared address: that login is the company account -- leave it to status.
                _log("alumni_disable_skipped_same_address", doc.name, user=alumni_user)
                return

            if alumni_user and frappe.db.exists("User", alumni_user):
                if cint(frappe.db.get_value("User", alumni_user, "enabled")):
                    frappe.db.set_value(
                        "User", alumni_user, "enabled", 0, update_modified=False
                    )
                    _log("alumni_user_disabled_on_checkbox", doc.name, user=alumni_user)

        except Exception:
            _log("alumni_checkbox_disable_failed", doc.name)
            frappe.log_error(
                frappe.get_traceback(),
                f"Failed to disable Alumni User for Employee {doc.name}",
            )
