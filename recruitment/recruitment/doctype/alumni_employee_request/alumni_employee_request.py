# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

"""Controller for the `Alumni Employee Request` doctype.

Business logic lives in ``recruitment.recruitment.alumni_employee_request_service``
so it is reusable from the Guest API, Desk and scripts alike. The controller only
keeps derived/read-only fields fresh and defers validation and the
approve → mark-alumni transition to the service layer.
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document

from recruitment.recruitment import alumni_employee_request_service as service


class AlumniEmployeeRequest(Document):
    def validate(self) -> None:
        """Refresh read-only info fields and enforce the shared request rules.

        The full rule set (existence, Active, not-already-alumni, linked User,
        duplicate check) runs for every save EXCEPT for post-creation edits made
        purely by the workflow engine, where the employee context is unchanged.
        """
        self._sync_derived_fields()

        # Keep `status` in step with the workflow state on every save path.
        if self.workflow_state:
            self.status = service.status_for_state(self.workflow_state)

        # Only re-run the (potentially blocking) validation while the request is
        # still open and the employee/email can still change — never on the
        # approval transitions, which must not be second-guessed here.
        if self.is_new() or self.has_value_changed("employee") or self.has_value_changed("email"):
            if self.workflow_state in (None, "", "Draft", "Pending Approval"):
                service.validate_alumni_request(
                    self.employee, self.email, ignore_request=self.name
                )

    def _sync_derived_fields(self) -> None:
        """Populate the read-only User / verification fields from the Employee."""
        if not self.employee:
            return
        emp = frappe.db.get_value(
            "Employee",
            self.employee,
            ["employee_name", "user_id", "company", "status"],
            as_dict=True,
        )
        if not emp:
            self.employee_exists = 0
            self.current_alumni_status = "Employee Not Found"
            return

        self.employee_exists = 1
        if not self.employee_name:
            self.employee_name = emp.employee_name
        if not self.user:
            self.user = emp.user_id
        if not self.company:
            self.company = emp.company
        self.current_alumni_status = (
            "Alumni" if service.is_already_alumni(self.employee) else "Not Alumni"
        )

    def on_update(self) -> None:
        """Run the approve → mark-employee-alumni transition (idempotent)."""
        service.handle_workflow_transition(self, "on_update")
