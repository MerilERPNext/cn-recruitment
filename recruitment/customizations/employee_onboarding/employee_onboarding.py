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

        # Connector for the Field Flow chain: setting it before insert lets the
        # managed fetch_from fields auto-populate from Onboarding -> Employee.
        from recruitment.recruitment.field_flow_sync import populate_employee_connector

        populate_employee_connector(target, source.name)

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