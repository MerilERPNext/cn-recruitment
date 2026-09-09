"""The "TAT Information" block on the Job Requisition.

Adds the read-only pipeline roll-up that ``recruitment.api.requisition_pipeline``
fills in: how many candidates the requisition's openings collected and how far
they got, how many are inside vs over their target TAT, and how many of the
requisition's own positions are Approved / Rejected.

Sits directly after the "Existing Workforce & Live Hiring" block, so a reader
goes from "what did we ask for" to "what has happened since" without leaving the
tab.

Idempotent — create_custom_fields updates a field that already exists.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"


def _count(fieldname, label, insert_after, in_list_view=0):
	return {
		"fieldname": fieldname,
		"fieldtype": "Int",
		"label": label,
		"insert_after": insert_after,
		"read_only": 1,
		"no_copy": 1,
		"non_negative": 1,
		# Offered as a list column: how many positions were signed off, and how
		# many turned down, is what a requisition gets compared on.
		"in_list_view": in_list_view,
		"module": MODULE,
	}


CUSTOM_FIELDS = {
	"Job Requisition": [
		{
			"fieldname": "custom_tat_section",
			"fieldtype": "Section Break",
			"label": "TAT Information",
			# End of the headcount block — see add_requisition_headcount_fields.
			"insert_after": "custom_headcount_last_updated",
			"collapsible": 0,
			"module": MODULE,
		},
		_count(
			"custom_candidates_applied", "Candidates Applied", "custom_tat_section",
		),
		_count(
			"custom_candidates_screened", "Screened", "custom_candidates_applied",
		),
		_count(
			"custom_candidates_shortlisted", "Shortlisted", "custom_candidates_screened",
		),
		_count(
			"custom_interviews_scheduled", "Interview Scheduled", "custom_candidates_shortlisted",
		),
		_count(
			"custom_interviews_done", "Interview Done", "custom_interviews_scheduled",
		),
		{
			"fieldname": "custom_tat_column",
			"fieldtype": "Column Break",
			"insert_after": "custom_interviews_done",
			"module": MODULE,
		},
		_count(
			"custom_offers_generated", "Offer Generated", "custom_tat_column",
		),
		_count(
			"custom_within_tat", "Within TAT", "custom_offers_generated",
		),
		_count(
			"custom_outside_tat", "Outside TAT", "custom_within_tat",
		),
		_count(
			"custom_approved_positions", "Approved Positions", "custom_outside_tat",
			in_list_view=1,
		),
		_count(
			"custom_rejected_positions", "Rejected Positions", "custom_approved_positions",
			in_list_view=1,
		),
		{
			"fieldname": "custom_pipeline_last_updated",
			"fieldtype": "Datetime",
			"label": "TAT Info Last Updated",
			"insert_after": "custom_rejected_positions",
			"read_only": 1,
			"no_copy": 1,
			"module": MODULE,
		},
	]
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)

	# These fields carry no description. create_custom_fields only writes the keys
	# it is given, so a field created by an earlier run of this patch would keep
	# the description it had — cleared explicitly here.
	names = [f"Job Requisition-{f['fieldname']}" for f in CUSTOM_FIELDS["Job Requisition"]]
	frappe.db.set_value(
		"Custom Field", {"name": ["in", names]}, "description", "", update_modified=False
	)

	frappe.clear_cache(doctype="Job Requisition")

	# Fill the new columns on everything that already exists, so the block is not
	# blank until each requisition happens to be saved again.
	from recruitment.api.requisition_pipeline import backfill

	backfill()
	frappe.db.commit()
