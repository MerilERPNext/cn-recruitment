"""Link-field query for Campus doctypes.

Filters the Job Opening picker (Campus Invite → job_openings, Campus Drive →
linked_job_openings) to only those openings that are actively posted to the
Campus channel - i.e. their `custom_posting_options` has a row with
post_to = "Campus", status = "Active", and today within display_from/display_to.

Reuses the same rule the Careers / IJP / Refer channels use, via
_common.get_openings_active_on_channel("campus").
"""

import frappe

from recruitment.api.channels._common import get_openings_active_on_channel


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def campus_job_opening_query(doctype, txt, searchfield, start, page_len, filters):
	names = get_openings_active_on_channel("campus")
	if not names:
		return []

	or_conditions = None
	if txt:
		like = f"%{txt}%"
		or_conditions = [["name", "like", like], ["job_title", "like", like]]

	return frappe.get_all(
		"Job Opening",
		filters={"name": ["in", names]},
		or_filters=or_conditions,
		fields=["name", "job_title"],
		order_by="job_title asc",
		start=start,
		page_length=page_len,
		as_list=True,
	)
