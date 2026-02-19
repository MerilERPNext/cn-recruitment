import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	custom_fields = {
		"HR Settings": [
			{
				"fieldname": "custom_duplicate_employee_check_section",
				"fieldtype": "Section Break",
				"label": "Duplicate Employee Check",
				"insert_after": "unlink_payment_on_cancellation_of_employee_advance",
				"module": "Recruitment",
			},
			{
				"fieldname": "custom_enable_duplicate_check",
				"fieldtype": "Check",
				"label": "Enable Duplicate Employee Check",
				"insert_after": "custom_duplicate_employee_check_section",
				"default": "0",
				"description": "When enabled, the system will check for duplicate employees based on the configured fields before creating a new employee.",
				"module": "Recruitment",
			},
			{
				"fieldname": "custom_duplicate_check_fields",
				"fieldtype": "Small Text",
				"label": "Duplicate Check Fields",
				"insert_after": "custom_enable_duplicate_check",
				"hidden": 1,
				"module": "Recruitment",
			},
			{
				"fieldname": "custom_duplicate_check_trigger",
				"fieldtype": "Select",
				"label": "Validate On",
				"insert_after": "custom_duplicate_check_fields",
				"options": "New Employee Only\nNew + Existing Employee",
				"default": "New Employee Only",
				"depends_on": "eval:doc.custom_enable_duplicate_check",
				"module": "Recruitment",
			},
			{
				"fieldname": "custom_duplicate_check_html",
				"fieldtype": "HTML",
				"label": "Duplicate Check Configuration",
				"insert_after": "custom_duplicate_check_trigger",
				"depends_on": "eval:doc.custom_enable_duplicate_check",
				"module": "Recruitment",
			},
		]
	}

	create_custom_fields(custom_fields, update=True)
