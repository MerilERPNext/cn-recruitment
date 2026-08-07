"""Remap Job Requisition statuses to the client's wording.

Unlike the Job Description backfill, this one is not optional: the option list
no longer contains "Pending" / "Open & Approved" / "Filled", so any record left
on an old value holds a status that is not selectable, does not appear under any
list tab, and falls through the action matrix to Duplicate-only.

Pure value remap — no record changes meaning, so nothing downstream shifts.
"""

import frappe

STATUS_MAP = {
	"Pending": "Approval Pending",
	"Open & Approved": "Approved Draft",
	"Job Opening Created": "Approved Active",  # retired option, if any linger
	"In-Progress": "Approved Active",  # retired option, if any linger
	"Filled": "Auto Archived",
}


def execute():
	if not frappe.db.table_exists("Job Requisition"):
		return

	for old, new in STATUS_MAP.items():
		count = frappe.db.count("Job Requisition", {"status": old})
		if not count:
			continue
		frappe.db.set_value(
			"Job Requisition", {"status": old}, "status", new, update_modified=False
		)
		frappe.logger().info(
			f"rename_job_requisition_statuses: {count} x '{old}' -> '{new}'"
		)
