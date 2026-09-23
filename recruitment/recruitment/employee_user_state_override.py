"""Override ERPNext's automatic User disable on Employee Inactive status.

ERPNext's built-in `Employee.validate_for_enabled_user_id()` automatically
disables the Employee's company-email User whenever Employee.status changes
from Active to Inactive (or any other non-Active status).

In this system, User enable/disable state is controlled ONLY by the
`custom_is_alumni_employee` checkbox:
  * Checkbox 0 (alumni OFF): Company User should remain ACTIVE
  * Checkbox 1 (alumni ON): Company User should be DISABLED (via checkbox handler)

This override patches ERPNext's logic to skip the automatic disable when
Alumni mode is inactive. The checkbox handler takes full control of User state.
"""

from __future__ import annotations

import frappe
from frappe.utils import cint

_PATCHED = "_recruitment_employee_user_state"
ALUMNI_FLAG = "custom_is_alumni_employee"


def _skip_user_disable_on_inactive(doc, enabled: int | None) -> bool:
    """Return True if ERPNext should SKIP auto-disabling the User on Inactive status.

    User disable should NOT happen automatically based on Employee.status.
    Only the Alumni checkbox should control User state.

    So: if Employee.status != Active and Alumni mode is NOT active, skip the
    automatic disable. The company User stays enabled.
    """
    if enabled is None:
        # User doesn't exist or couldn't be loaded — ERPNext will throw
        return False

    # If Alumni mode is active, let the checkbox handler control User state
    if cint(doc.get(ALUMNI_FLAG)):
        return True

    # Alumni mode is NOT active: never auto-disable based on status
    # Company User stays enabled regardless of Employee.status
    return True


def patch_employee_user_state_validation() -> None:
    """Patch Employee.validate_for_enabled_user_id to skip auto-disable logic.

    Runs from the `before_request` hook, once per request, idempotent.
    """
    from erpnext.setup.doctype.employee.employee import Employee

    if getattr(Employee, _PATCHED, False):
        return

    original_validate = Employee.validate_for_enabled_user_id

    def validate_for_enabled_user_id_patched(self, enabled):
        """Patched version: skip auto-disable on Inactive if Alumni mode is OFF."""
        if enabled is None:
            frappe.throw(frappe.bold(self.user_id) + " " + _("does not exist"))

        # SKIP the built-in logic that disables User on non-Active status
        # User state is now controlled ONLY by the Alumni checkbox handler
        if _skip_user_disable_on_inactive(self, enabled):
            return

        # Fallback to original (should not reach here in normal operation)
        original_validate(self, enabled)

    Employee.validate_for_enabled_user_id = validate_for_enabled_user_id_patched
    setattr(Employee, _PATCHED, True)


def apply_patch() -> None:
    """Entry point called from before_request hook."""
    patch_employee_user_state_validation()
