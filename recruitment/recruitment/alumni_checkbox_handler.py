"""Alumni Employee checkbox handler — checkbox-based User provisioning.

This module handles Alumni User provisioning based on the `custom_is_alumni_employee`
checkbox, completely decoupled from Employee status changes.

The `custom_is_alumni_employee` checkbox is the **only** trigger for Alumni User
creation. It can be set:
  * Manually by System Manager / Admin
  * Automatically by workflow/approval process (e.g., Alumni Employee Request approval)
  * Any other future process that sets `Employee.custom_is_alumni_employee = 1`

Employee status changes (Active → Inactive, Inactive → Active, etc.) do NOT
automatically trigger Alumni User creation. That is handled by existing ERPNext
logic:
  * `status != Active` → disables the company-email User (ERPNext default)
  * `status == Active` → re-enables the company-email User (ERPNext default)

This module is completely independent of that flow.
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
    """Employee ``validate`` hook: require Personal Email when alumni checkbox
    is being enabled (for manual user actions only).

    Only fires when `custom_is_alumni_employee` changes from 0→1. Ordinary
    saves of an already-alumni employee are untouched.

    When the checkbox is set by the Alumni Request approval workflow
    (via `mark_employee_as_alumni()`), bypass this validation — the Personal
    Email requirement is only enforced for manual user-initiated changes.
    The checkbox handler's `on_update()` will attempt Alumni User creation
    and handle missing Personal Email gracefully.
    """
    if not _is_alumni_checkbox_enabling(doc):
        return

    # Skip validation if this is being set by the approval workflow, not a manual user action.
    # The approval workflow is flagged via the special context variable during programmatic
    # checkpoint updates from `mark_employee_as_alumni()`.
    if frappe.local.flags.get("_alumni_checkbox_from_approval_workflow"):
        return

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
    """Employee ``on_update`` hook: implement full User switching based on
    checkbox changes.

    When `custom_is_alumni_employee` changes:
      * 0→1 (enabling alumni):
        - Create/reuse Alumni User from Personal Email
        - Disable the company-email User
        - Enable the Alumni Personal Email User
        - Link Alumni User to Employee
      * 1→0 (disabling alumni):
        - Disable the Alumni Personal Email User
        - Enable the company-email User
        - Return to normal company-email mode

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

            # Find or create the Alumni User
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

            # Disable the company-email User
            if company_user and frappe.db.exists("User", company_user):
                if cint(frappe.db.get_value("User", company_user, "enabled")):
                    frappe.db.set_value(
                        "User", company_user, "enabled", 0, update_modified=False
                    )
                    _log("company_user_disabled_on_alumni_enable", doc.name, user=company_user)

            # Enable the Alumni User
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
            # Disable the Alumni User
            alumni_user = (doc.get("custom_alumni_user") or "").strip() or _find_user(
                (doc.get("personal_email") or "").strip()
            )
            if alumni_user and frappe.db.exists("User", alumni_user):
                if cint(frappe.db.get_value("User", alumni_user, "enabled")):
                    frappe.db.set_value(
                        "User", alumni_user, "enabled", 0, update_modified=False
                    )
                    _log("alumni_user_disabled_on_checkbox", doc.name, user=alumni_user)

            # Enable the company-email User
            company_user = (doc.get("user_id") or "").strip()
            if company_user and frappe.db.exists("User", company_user):
                if cint(frappe.db.get_value("User", company_user, "enabled")) == 0:
                    frappe.db.set_value(
                        "User", company_user, "enabled", 1, update_modified=False
                    )
                    _log("company_user_enabled_on_alumni_disable", doc.name, user=company_user)

        except Exception:
            _log("alumni_checkbox_disable_failed", doc.name)
            frappe.log_error(
                frappe.get_traceback(),
                f"Failed to disable Alumni User for Employee {doc.name}",
            )
