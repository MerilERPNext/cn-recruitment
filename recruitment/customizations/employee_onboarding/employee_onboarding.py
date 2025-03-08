import frappe
from frappe.model.mapper import get_mapped_doc
import json

@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    doc = frappe.get_doc("Employee Onboarding", source_name)
    settings = frappe.get_doc('Recruitment Settings')

    def set_missing_values(source, target):
        target.personal_email = frappe.db.get_value("Job Applicant", source.job_applicant, "email_id")
        target.status = "Active"

    field_map = {}
    for fieldrow in settings.mapping_fields:
        field_map[fieldrow.employee_onboarding] = fieldrow.employee

    doc = get_mapped_doc(
        "Employee Onboarding",
        source_name,
        {
            "Employee Onboarding": {
                "doctype": "Employee",
                "field_map": field_map,
            }
        },
        target_doc,
        set_missing_values,
    )
    return doc