# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class OnboardingPortalForms(Document):
    def validate(self):
        self.validate_single_default()

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
