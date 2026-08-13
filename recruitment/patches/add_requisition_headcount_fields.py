"""Store existing strength / live hiring on the Job Requisition.

Adds the totals block that ``recruitment.api.requisition_headcount`` fills in:
how many active employees already hold this designation in the requisition's
region(s), and how much hiring for the same role is already in flight there.

The per-region breakdown lives on the Job Requisition Region child table (shipped
in its doctype JSON); these are the roll-ups shown on the requisition itself and
available to list views and reports.

Idempotent — create_custom_fields updates a field that already exists.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"

CUSTOM_FIELDS = {
	"Job Requisition": [
		{
			"fieldname": "custom_workforce_section",
			"fieldtype": "Section Break",
			"label": "Existing Workforce & Live Hiring",
			"insert_after": "custom_regions",
			"collapsible": 0,
			"module": MODULE,
		},
		{
			"fieldname": "custom_active_employees",
			"fieldtype": "Int",
			"label": "Active Employees",
			"insert_after": "custom_workforce_section",
			"read_only": 1,
			"no_copy": 1,
			"non_negative": 1,
			# Shown as a list-view column: the whole point of the number is to sit
			# next to the ask, and the list is where requisitions get compared.
			"in_list_view": 1,
			"description": (
				"Employees currently on the rolls holding this designation in this "
				"requisition's region(s). Counted from the Employee master."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_active_requisitions",
			"fieldtype": "Int",
			"label": "Active Requisitions",
			"insert_after": "custom_active_employees",
			"read_only": 1,
			"no_copy": 1,
			"non_negative": 1,
			"description": (
				"Other requisitions already hiring this designation in the same "
				"region(s) and awaiting approval or approved."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_workforce_column",
			"fieldtype": "Column Break",
			"insert_after": "custom_active_requisitions",
			"module": MODULE,
		},
		{
			"fieldname": "custom_active_openings",
			"fieldtype": "Int",
			"label": "Hiring in Progress",
			"insert_after": "custom_workforce_column",
			"read_only": 1,
			"no_copy": 1,
			"non_negative": 1,
			"in_list_view": 1,
			"description": (
				"Headcount those other live requisitions have already budgeted for "
				"the same region(s)."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_headcount_last_updated",
			"fieldtype": "Datetime",
			"label": "Counts Last Updated",
			"insert_after": "custom_active_openings",
			"read_only": 1,
			"no_copy": 1,
			"module": MODULE,
			"description": "Refreshed on every save, and by the Refresh Counts action.",
		},
	]
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	frappe.clear_cache(doctype="Job Requisition")

	# Fill the new columns on everything that already exists, so the numbers are
	# not blank until each requisition happens to be saved again.
	from recruitment.api.requisition_headcount import backfill

	backfill()
	frappe.db.commit()
