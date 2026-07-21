# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class OnboardingPortalForms(Document):
    def validate(self):
        self.validate_single_default()
        self.validate_user_assignment_target()

    def validate_user_assignment_target(self):
        """A form matches candidates, so every assignment must select candidates.

        The field's set_query already filters the dropdown, but that's only a UI
        convenience — an assignment retargeted after being linked, or a form
        written via the API, would otherwise never match anyone and silently
        fall through to the Default form.
        """
        for row in self.user_assignment:
            if not row.user_assignment:
                continue

            target_type = frappe.db.get_value(
                "Dynamic User Assignment", row.user_assignment, "target_type"
            )
            if target_type != "Job Applicant":
                frappe.throw(
                    _(
                        "User Assignment {0} has Target Type {1}, so it cannot select candidates. "
                        "Pick an assignment with Target Type = Job Applicant."
                    ).format(
                        frappe.bold(row.user_assignment),
                        frappe.bold(target_type or _("not set")),
                    )
                )

    def validate_single_default(self):
        if not self.default:
            return

        existing_default = frappe.db.get_value(
            "Onboarding Portal Forms",
            {
                "default": 1,
                "name": ("!=", self.name or ""),
            },
            "name",
        )

        if existing_default:
            frappe.throw(
                _(
                    "Only one Onboarding Portal Form can be marked as Default. "
                    "Current default record is {0}."
                ).format(frappe.bold(existing_default))
            )
