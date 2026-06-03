"""
Job Requisition list view — auxiliary data API
==============================================

The Job Requisition desk list is rendered by a custom table
(`public/js/job_requisition_list.js`) on top of Frappe's native list view, which
owns the row data, filtering, sorting, pagination, selection and Actions menu.
Every column the table shows is a plain doc field, so this endpoint only supplies
the status-tab data:
  - tab_counts      : status group counts for the top tabs (All + each status)
  - status_options  : status field options, from the doctype meta
"""

import frappe


def _status_options():
	status_field = frappe.get_meta("Job Requisition").get_field("status")
	return [s.strip() for s in (status_field.options or "").split("\n") if s and s.strip()]


@frappe.whitelist()
def get_job_requisitions_with_stats():
	"""Return tab counts + status options for the Job Requisition list tabs."""

	status_options = _status_options()

	def _count(filters=None):
		return len(frappe.get_list("Job Requisition", filters=filters or {}, fields=["name"], limit_page_length=0))

	tab_counts = {"All": _count()}
	for opt in status_options:
		tab_counts[opt] = _count({"status": opt})

	return {
		"tab_counts": tab_counts,
		"status_options": status_options,
	}
