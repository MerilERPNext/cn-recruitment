"""Shared validators for the campus doctypes."""

import frappe
from frappe import _


def validate_unique_job_openings(doc, table_fieldname="job_openings", link_fieldname="job_opening"):
	"""Block the same Job Opening appearing twice in a child table.

	Used by Campus Invite (`job_openings`) and Campus Drive (`linked_job_openings`);
	both child rows carry the opening in a `job_opening` link field.
	"""
	seen = {}
	for row in (doc.get(table_fieldname) or []):
		value = row.get(link_fieldname)
		if not value:
			continue
		if value in seen:
			frappe.throw(
				_("Job Opening {0} is already added in row {1}. Each opening can be listed only once.").format(
					frappe.bold(value), seen[value]
				),
				title=_("Duplicate Job Opening"),
			)
		seen[value] = row.idx
