"""Add show_act_button_on_all_tasks custom field to System Settings.

Controls whether the Act button is shown for all tasks (assigned and unassigned)
or only unassigned tasks on My Request pages for users with the System Manager role.

Idempotent — create_custom_fields updates a field that already exists.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"

CUSTOM_FIELDS = {
	"System Settings": [
		{
			"fieldname": "show_act_button_on_all_tasks",
			"fieldtype": "Check",
			"label": "Show Act button on all tasks",
			"insert_after": "apply_strict_user_permissions",
			"default": "0",
			"description": "Show the Act button for all tasks (assigned and unassigned) on My Request pages.",
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	frappe.db.commit()
	frappe.clear_cache(doctype="System Settings")
