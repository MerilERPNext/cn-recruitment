import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""GAP-34: add a per-grade Default Leave Policy used to auto-assign leave on hire.

	HR sets this once per Employee Grade (e.g. School -> School Leave policy,
	HO -> HO Leave policy). ``create_leave_policy_assignment`` reads it on hire.
	"""
	create_custom_fields(
		{
			"Employee Grade": [
				{
					"fieldname": "custom_default_leave_policy",
					"label": "Default Leave Policy",
					"fieldtype": "Link",
					"options": "Leave Policy",
					"insert_after": "default_base_pay",
					"description": (
						"New hires with this grade automatically receive a submitted "
						"Leave Policy Assignment for this policy on creation (GAP-34)."
					),
				}
			]
		},
		update=True,
	)
