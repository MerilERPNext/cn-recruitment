import frappe
from frappe.model.mapper import get_mapped_doc
import json

@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    doc = frappe.get_doc("Employee Onboarding", source_name)
    settings = frappe.get_doc('Recruitment Settings')
   
    field_map={}
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
		target_doc
	)
    return doc