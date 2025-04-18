import frappe
from frappe import _ 
from frappe.utils import get_link_to_form, getdate, pretty_date
from hrms.hr.doctype.job_opening.job_opening import JobOpening

class CustomJobOpening(JobOpening):
    def get_context(self, context):
        super().get_context(context)
        context.custom_google_map_link = frappe.db.get_value("Branch", self.location, "custom_google_map_link")

        context.jd_details = [
            {
                "label": row.label,
                "description": row.description
            } for row in self.custom_jd_details
        ]

