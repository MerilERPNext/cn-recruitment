"""
Job Requisition list view — auxiliary data API
==============================================

The Job Requisition desk list is rendered by a custom table
(`public/js/job_requisition_list.js`) on top of Frappe's native list view, which
owns the row data, filtering, sorting, pagination, selection and Actions menu.
Every column the table shows is a plain doc field, so this endpoint only supplies
the status-tab data:
  - tab_counts      : status group counts for the top tabs (All + each status),
                      honouring every active list filter except status
  - status_options  : status field options, from the doctype meta
"""

import frappe

from recruitment.api.list_filters import normalize_count_filters


def _status_options():
	status_field = frappe.get_meta("Job Requisition").get_field("status")
	return [s.strip() for s in (status_field.options or "").split("\n") if s and s.strip()]


@frappe.whitelist()
def get_job_requisitions_with_stats(filters=None):
	"""Return tab counts + status options for the Job Requisition list tabs.

	Tab counts honour ALL of the list view's active filters (company, department,
	designation, …) EXCEPT status — so each tab shows how many of the *currently
	filtered* requisitions sit in that status, and the numbers match the visible rows.
	"""

	status_options = _status_options()

	# ONE permission-scoped query fetching just `status`, tallied in Python, instead
	# of the previous unbounded pull per status option.
	scoped = normalize_count_filters(filters)
	statuses = frappe.get_list("Job Requisition", filters=scoped, pluck="status", limit_page_length=0)

	tab_counts = {"All": len(statuses)}
	for opt in status_options:
		tab_counts[opt] = 0
	for status in statuses:
		if status in tab_counts:
			tab_counts[status] += 1

	return {
		"tab_counts": tab_counts,
		"status_options": status_options,
	}
