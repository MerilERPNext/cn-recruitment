"""Employee user switching on employment-status change (Recruitment app).

When an employee leaves, their company-email User is disabled and a User built
from their `personal_email` takes over as the Alumni Portal account. When they
rejoin, the switch is reversed.

This module owns ONLY the account switching. It deliberately reuses the alumni
mechanisms that already exist rather than adding a parallel system:

* ``User.custom_is_alumni_employee``  — the flag that gates portal login
  (created in ``recruitment.install``); this module sets it on the personal
  User and clears it on rejoin.
* ``Employee.custom_is_alumni_employee`` — HR's manual grant/revoke checkbox,
  mirrored onto the linked User by
  ``recruitment.recruitment.alumni_portal.sync_alumni_flag``.
* ``recruitment.recruitment.alumni_guard`` — the auth hook that already confines
  an alumni session to the alumni namespace and rejects Desk / ESS / resource
  APIs. No new authorization layer is introduced here.
* ``Employee.custom_alumni_user`` — Link to the provisioned personal User, so
  the portal can resolve Employee <-> alumni User deterministically.

The COMPANY-email account is deliberately NOT touched here. ERPNext already
enables/disables it from Employee.status in
``Employee.validate_for_enabled_user_id`` (erpnext/setup/doctype/employee):

    status != Active and user enabled  -> disable the user
    status == Active and user disabled -> enable the user

Duplicating that would be a second, competing implementation of the same rule.
This module therefore owns only the part that does not already exist: the
personal-email Alumni account and its link back to the Employee.

Hooked from ``hooks.py`` as an Employee ``on_update`` event; it acts only on a
real status transition, never on every save.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, getdate, today, validate_email_address

from recruitment.recruitment.alumni_portal import ALUMNI_FLAG

#: Employee statuses that mean "no longer working here".
EXITED_STATUSES = {"Left", "Inactive"}

#: Alumni Users are Website Users: Frappe itself then denies Desk access, so the
#: restriction does not depend on roles or on any frontend route guard.
ALUMNI_USER_TYPE = "Website User"

_LOGGER = "alumni_user_switch"


def _log(event: str, employee: str, **extra) -> None:
    """Structured, non-sensitive audit line. Never logs credentials."""
    detail = " ".join(f"{k}={v}" for k, v in extra.items() if v is not None)
    frappe.logger(_LOGGER).info(f"{event} employee={employee} {detail}".strip())


# ── User helpers ──────────────────────────────────────────────────────────────
def _set_alumni_user_enabled(email: str, enabled: int) -> bool:
    """Enable/disable the ALUMNI (personal-email) User only.

    The company-email account is left to ERPNext — see the module docstring.
    Returns True when the value actually changed.
    """
    if not email or not frappe.db.exists("User", email):
        return False
    if cint(frappe.db.get_value("User", email, "enabled")) == cint(enabled):
        return False
    frappe.db.set_value("User", email, "enabled", cint(enabled), update_modified=False)
    return True


def _find_user(email: str) -> str | None:
    """Existing User for `email`, matched on name or the email field."""
    if not email:
        return None
    if frappe.db.exists("User", email):
        return email
    return frappe.db.get_value("User", {"email": email}, "name")


def _create_alumni_user(employee, email: str) -> str:
    """Create the personal-email User as a Website User with no extra roles."""
    user = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": employee.first_name or employee.employee_name or email,
            "last_name": employee.last_name or "",
            "user_type": ALUMNI_USER_TYPE,
            "enabled": 1,
            "send_welcome_email": 0,
            ALUMNI_FLAG: 1,
        }
    )
    user.flags.ignore_permissions = True
    user.insert(ignore_permissions=True)
    _stamp_alumni_category(user.name)
    return user.name


def _stamp_alumni_category(email: str) -> None:
    """Mark the User as an Alumni account in custom_user_category (if the field exists)."""
    if not frappe.get_meta("User").get_field("custom_user_category"):
        return
    if frappe.db.get_value("User", email, "custom_user_category") != "Alumni":
        frappe.db.set_value("User", email, "custom_user_category", "Alumni", update_modified=False)


def _configure_alumni_user(email: str) -> None:
    """Make an existing User usable as an alumni account, minimally.

    Idempotent: only writes values that differ, and never grants a role.
    """
    values = {}
    current = frappe.db.get_value(
        "User", email, ["enabled", "user_type", ALUMNI_FLAG], as_dict=True
    ) or {}

    if not cint(current.get("enabled")):
        values["enabled"] = 1
    if not cint(current.get(ALUMNI_FLAG)):
        values[ALUMNI_FLAG] = 1
    # Only ever narrow access. A System User who happens to share this address
    # is left alone rather than silently downgraded.
    if not current.get("user_type"):
        values["user_type"] = ALUMNI_USER_TYPE

    if values:
        frappe.db.set_value("User", email, values, update_modified=False)
    _stamp_alumni_category(email)


# ── Transitions ───────────────────────────────────────────────────────────────
def _switch_to_alumni(doc) -> None:
    """Active -> Left/Inactive: provision the alumni account, then disable work one."""
    personal = (doc.get("personal_email") or "").strip()

    if not personal:
        # No alumni account can be provisioned. ERPNext still disables the
        # company account for a non-Active employee, so this is logged loudly:
        # the person ends up with no usable login until HR adds a personal email.
        _log("switch_skipped_no_personal_email", doc.name)
        frappe.log_error(
            f"Employee {doc.name} became {doc.status} but has no personal_email; "
            "alumni account was not provisioned and the company user was left enabled.",
            "Alumni user switch skipped",
        )
        return

    try:
        validate_email_address(personal, throw=True)
    except Exception:
        _log("switch_failed_invalid_personal_email", doc.name)
        frappe.log_error(
            f"Employee {doc.name}: personal_email is not a valid address; "
            "alumni account not provisioned.",
            "Alumni user switch failed",
        )
        return

    company_user = (doc.get("user_id") or "").strip()
    if personal == company_user:
        # Same address on both fields — there is no second account to switch to.
        _log("switch_skipped_same_address", doc.name)
        return

    # 1. Find or create the alumni account FIRST, so a failure here never leaves
    #    the employee with a disabled company user and nothing to log in with.
    existing = _find_user(personal)
    if existing:
        _configure_alumni_user(existing)
        alumni_user = existing
        _log("alumni_user_reused", doc.name, user=alumni_user)
    else:
        alumni_user = _create_alumni_user(doc, personal)
        _log("alumni_user_created", doc.name, user=alumni_user)

    # 2. Record the link so the portal can resolve Employee <-> alumni User.
    if frappe.get_meta("Employee").get_field("custom_alumni_user"):
        if doc.get("custom_alumni_user") != alumni_user:
            doc.db_set("custom_alumni_user", alumni_user, update_modified=False)

    # The company account is disabled by ERPNext's own status rule; it is kept
    # for history and never deleted here.
    _log("switch_to_alumni_complete", doc.name, user=alumni_user, company_user=company_user)


def _switch_to_company(doc) -> None:
    """Left/Inactive -> Active: restore the work account, retire the alumni one."""
    # ERPNext re-enables the company account itself when status returns to
    # Active; this module only retires the alumni account.
    company_user = (doc.get("user_id") or "").strip()

    alumni_user = (doc.get("custom_alumni_user") or "").strip() or _find_user(
        (doc.get("personal_email") or "").strip()
    )
    # Never touch the company account in the alumni branch, even if the two
    # addresses happen to be the same record.
    if alumni_user and alumni_user != company_user:
        # Revoke portal access but keep the account (history / audit).
        if cint(frappe.db.get_value("User", alumni_user, ALUMNI_FLAG)):
            frappe.db.set_value(
                "User", alumni_user, ALUMNI_FLAG, 0, update_modified=False
            )
        if _set_alumni_user_enabled(alumni_user, 0):
            _log("alumni_user_disabled", doc.name, user=alumni_user)

    _log("switch_to_company_complete", doc.name, user=company_user)


# ── Validation ────────────────────────────────────────────────────────────────
def _is_conversion_to_alumni(doc) -> bool:
    """True only on the *transition* Active -> Left/Inactive (a fresh alumni
    conversion), not on ordinary saves of an already-exited employee."""
    new_status = doc.status or ""
    if new_status not in EXITED_STATUSES:
        return False
    before = doc.get_doc_before_save()
    old_status = (before.status if before else None) or ""
    return old_status not in EXITED_STATUSES


def auto_set_relieving_date(doc, method: str | None = None) -> None:
    """Employee ``validate`` hook: auto-fill ``relieving_date`` ("Last Working
    Day") with today's date on the real transition into Left/Inactive, if HR
    hasn't already set one on the form.

    ERPNext already makes ``relieving_date`` mandatory once status is "Left"
    (see ``employee.json``'s ``mandatory_depends_on``), but never fills it in
    for you, and applies no such rule at all for "Inactive". This does the
    filling, for both.

    Never overwrites an explicitly-set date — if HR already picked a real last
    working day (e.g. backdated, or a future one), that stays authoritative.
    Only fires on the real transition (same gate as
    ``validate_alumni_personal_email``); saves of an already-exited record are
    untouched. The Employee Separation submit path
    (``update_employee_relieving_date``) sets this via a raw ``db.set_value``
    outside the doc lifecycle, so it never reaches this hook at all — the two
    don't conflict.
    """
    if not _is_conversion_to_alumni(doc):
        return
    if not doc.get("relieving_date"):
        doc.relieving_date = getdate(today())


def validate_alumni_personal_email(doc, method: str | None = None) -> None:
    """Employee ``validate`` hook: block conversion to alumni without a usable
    personal email.

    Runs *before* the save commits (and before ERPNext disables the company-email
    User on the status change), so a failure aborts the whole transition — the
    employee is never left with a disabled company account and no alumni login.

    Only fires on the real transition into ``Left``/``Inactive``; edits to an
    already-exited record, and non-``save`` status changes (e.g. the relieving
    scheduler's ``db.set_value``), are not affected.
    """
    if not _is_conversion_to_alumni(doc):
        return

    personal = (doc.get("personal_email") or "").strip()
    if not personal:
        frappe.throw(
            _("Personal Email is required before converting this employee to Alumni."),
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

    # A personal email identical to the company login gives no separate alumni
    # account: ERPNext would disable that very User, leaving no way to sign in.
    company_login = (doc.get("user_id") or "").strip()
    company_email = (doc.get("company_email") or "").strip()
    if personal in {company_login, company_email} and personal:
        frappe.throw(
            _("Personal Email must be different from the company email so the "
              "alumnus has a separate login after the company account is disabled."),
            title=_("Personal Email Conflict"),
        )


# ── Hook ──────────────────────────────────────────────────────────────────────
def handle_employee_status_change(doc, method: str | None = None) -> None:
    """Employee ``on_update``: switch accounts when `status` actually changes.

    Runs only on a real transition, so ordinary saves never re-create users or
    re-apply permissions. Any failure is logged and swallowed — account
    switching must never block HR from saving an Employee record.
    """
    if not doc.has_value_changed("status"):
        return

    before = doc.get_doc_before_save()
    old_status = (before.status if before else None) or ""
    new_status = doc.status or ""
    if old_status == new_status:
        return

    try:
        if new_status in EXITED_STATUSES and old_status not in EXITED_STATUSES:
            _switch_to_alumni(doc)
        elif new_status not in EXITED_STATUSES and old_status in EXITED_STATUSES:
            _switch_to_company(doc)
    except Exception:
        _log("switch_failed", doc.name, old=old_status, new=new_status)
        frappe.log_error(
            frappe.get_traceback(),
            f"Alumni user switch failed for Employee {doc.name} "
            f"({old_status} -> {new_status})",
        )


# ── Manual / backfill entry point ─────────────────────────────────────────────
def apply_account_state(employee: str) -> dict:
    """Bring one Employee's accounts in line with their current status.

    Entry point for callers that change `status` WITHOUT saving the document —
    notably the relieving scheduler, which uses `frappe.db.set_value` and so
    never fires the `on_update` hook. Idempotent.
    """
    doc = frappe.get_doc("Employee", employee)
    if doc.status in EXITED_STATUSES:
        _switch_to_alumni(doc)
    else:
        _switch_to_company(doc)
    return {
        "employee": doc.name,
        "status": doc.status,
        "company_user": doc.get("user_id"),
        "alumni_user": doc.get("custom_alumni_user"),
    }


@frappe.whitelist()
def resync_employee_accounts(employee: str) -> dict:
    """Re-apply the correct account state for one Employee (admin utility).

    Idempotent; useful for records whose status changed before this hook
    existed, or where the earlier switch failed.
    """
    if not frappe.has_permission("Employee", "write"):
        frappe.throw(_("Not permitted."), frappe.PermissionError)

    apply_account_state(employee)
    frappe.db.commit()

    doc = frappe.get_doc("Employee", employee)

    return {
        "success": True,
        "employee": doc.name,
        "status": doc.status,
        "company_user": doc.get("user_id"),
        "alumni_user": doc.get("custom_alumni_user"),
    }
