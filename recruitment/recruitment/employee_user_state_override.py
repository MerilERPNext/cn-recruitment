# """Take ERPNext's ``Employee.status`` -> ``User.enabled`` sync out of the picture.

# ERPNext's ``Employee.validate_for_enabled_user_id`` keeps ``User.enabled`` in
# lock-step with ``Employee.status`` on every save — disabling the login when the
# Employee is not Active and re-enabling it when they are. This app owns that
# state instead: an account is disabled or enabled only by the
# ``custom_is_alumni_employee`` checkbox, via ``alumni_checkbox_handler``. Leaving
# ERPNext's sync in place would fight it — flipping an alumni Employee back to
# Active would re-enable the company login the checkbox handler just disabled — so
# the method is replaced with a no-op from the ``before_request`` hook.
# """

# from __future__ import annotations

# _PATCHED = "_recruitment_employee_user_state"


# def patch_employee_user_state_validation() -> None:
#     """Replace ``Employee.validate_for_enabled_user_id`` with a no-op (idempotent)."""
#     from erpnext.setup.doctype.employee.employee import Employee

#     if getattr(Employee, _PATCHED, False):
#         return

#     def validate_for_enabled_user_id_patched(self, *args, **kwargs):
#         """Do nothing — User.enabled belongs to the alumni checkbox, not to status."""
#         # The open signature is required, not laziness: ERPNext changed how this
#         # method is called between versions — some pass the User's `enabled` flag,
#         # newer ones pass nothing and look it up themselves. Pinning the parameters
#         # to either shape raises TypeError on the other before the body even runs,
#         # which breaks every Employee save on that version.

#     Employee.validate_for_enabled_user_id = validate_for_enabled_user_id_patched
#     setattr(Employee, _PATCHED, True)


# def apply_patch() -> None:
#     """Entry point for the ``before_request`` hook."""
#     patch_employee_user_state_validation()
