"""Company login state follows ``Employee.status``.

Two independent accounts can hang off one Employee, and they are governed by
two independent switches:

* the **company-email User** (``Employee.user_id``) follows ``Employee.status``:
  when the employee is ``Left`` or ``Inactive`` that login is disabled here;
* the **alumni personal-email User** (``Employee.custom_alumni_user``) follows the
  ``custom_is_alumni_employee`` checkbox, in ``alumni_checkbox_handler``.

Neither switch touches the other's account, so ticking / unticking the alumni
checkbox never re-enables a company login, and a status change never touches
the alumni account.

ERPNext's own ``Employee.validate_for_enabled_user_id`` already keeps
``User.enabled`` in step with ``status`` on every save. This hook is the explicit,
app-owned statement of the Left/Inactive rule so it holds even if that ERPNext
behaviour is patched away or changes shape between versions.
"""

from __future__ import annotations

import frappe
from frappe.utils import cint

#: Statuses on which the company-email login must be disabled.
EXITED_STATUSES = frozenset({"Left", "Inactive"})

_LOGGER = "employee_user_state"


def _log(event: str, employee: str, **extra) -> None:
    """Structured, non-sensitive audit line."""
    detail = " ".join(f"{k}={v}" for k, v in extra.items() if v is not None)
    frappe.logger(_LOGGER).info(f"{event} employee={employee} {detail}".strip())


def disable_company_user_on_exit(doc, method: str | None = None) -> None:
    """Employee ``on_update`` hook: disable the company-email User when the
    employee's status is ``Left`` or ``Inactive``.

    Idempotent — only writes when the User is currently enabled — and runs on
    every save of an exited employee, so a login re-enabled by hand while the
    employee is still exited is switched off again on the next save.

    The alumni personal-email account is never touched here, even when it is
    (unexpectedly) the same address as ``user_id``. Any failure is logged; an
    Employee save is never blocked by this.
    """
    if (doc.status or "") not in EXITED_STATUSES:
        return

    company_user = (doc.get("user_id") or "").strip()
    if not company_user:
        return

    alumni_user = (doc.get("custom_alumni_user") or "").strip()
    if alumni_user and alumni_user == company_user:
        # Same login serves as the alumni account -- leave it to the checkbox.
        return

    try:
        if not frappe.db.exists("User", company_user):
            return
        if cint(frappe.db.get_value("User", company_user, "enabled")):
            frappe.db.set_value("User", company_user, "enabled", 0, update_modified=False)
            _log(
                "company_user_disabled_on_exit",
                doc.name,
                user=company_user,
                status=doc.status,
            )
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            f"Failed to disable company User for exited Employee {doc.name}",
        )
