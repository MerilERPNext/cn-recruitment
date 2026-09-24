"""Alumni User helper functions and relieving date automation.

This module provides:

1. **Helper functions** for finding, creating, and configuring Alumni Users:
   - ``_find_user(email)`` — find existing User by email
   - ``_create_alumni_user(employee, email)`` — create new Alumni User
   - ``_configure_alumni_user(email)`` — enable/configure existing User
   - ``_stamp_alumni_category(email)`` — mark User as Alumni category

   These helpers are reused by the checkbox-based Alumni User provisioning
   logic in ``alumni_checkbox_handler.py``, which triggers on
   ``Employee.custom_is_alumni_employee`` checkbox changes (0→1, 1→0),
   completely independent of Employee status.

2. **Relieving Date automation** via ``auto_set_relieving_date()``:
   - Auto-fills ``relieving_date`` with today when Employee status changes
     to Left/Inactive (unrelated to Alumni User creation).

IMPORTANT: The status-based Alumni User creation trigger that previously ran
on ``Employee.status`` changes (Active → Left/Inactive) has been **removed**.
Alumni User creation is now **ONLY** triggered by the
``custom_is_alumni_employee`` checkbox being set to 1, via the dedicated
``alumni_checkbox_handler`` module.

The company-email account (User) is disabled when Employee.status is Left /
Inactive by ``employee_user_state.disable_company_user_on_exit`` (and ERPNext's
own status sync) — independent of this module and of the alumni checkbox.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, getdate, today, validate_email_address

from recruitment.recruitment.alumni_portal import ALUMNI_FLAG

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

    The company-email account is never touched here — it follows
    Employee.status (see ``employee_user_state``).
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


# ── Relieving Date Automation ─────────────────────────────────────────────────
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
    Only fires on the real transition; saves of an already-exited record are
    untouched.
    """
    before = doc.get_doc_before_save()
    old_status = (before.status if before else None) or ""
    new_status = doc.status or ""

    if new_status not in {"Left", "Inactive"}:
        return
    if old_status in {"Left", "Inactive"}:
        return  # Already exited, not a transition

    if not doc.get("relieving_date"):
        doc.relieving_date = getdate(today())


# ── Deprecated Functions (kept for backward compatibility) ────────────────────
def apply_account_state(employee: str) -> dict:
    """DEPRECATED: This function is kept only for backward compatibility.

    Alumni User creation is now triggered EXCLUSIVELY by the
    ``custom_is_alumni_employee`` checkbox, not by Employee status changes.

    The scheduled relieving job that called this function should be updated
    to set the Alumni checkbox (`` custom_is_alumni_employee``) to 1 when
    marking an employee as Inactive, if Alumni status should be granted.

    Returns a no-op dict for compatibility.
    """
    doc = frappe.get_doc("Employee", employee)
    return {
        "employee": doc.name,
        "status": doc.status,
        "company_user": doc.get("user_id"),
        "alumni_user": doc.get("custom_alumni_user"),
        "note": "Alumni User creation is now checkbox-based, not status-based",
    }


def resync_employee_accounts(employee: str) -> dict:
    """DEPRECATED: This admin utility is no longer needed.

    Alumni User creation is now triggered EXCLUSIVELY by the
    ``custom_is_alumni_employee`` checkbox, not by Employee status changes.

    Returns a no-op dict for compatibility.
    """
    return {
        "success": True,
        "employee": employee,
        "note": "Alumni User creation is now checkbox-based, not status-based",
    }
