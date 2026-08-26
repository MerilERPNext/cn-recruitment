"""Link-field query for Campus doctypes.

Filters the Job Opening picker (Campus Invite → job_openings, Campus Drive →
linked_job_openings) to only those openings that are actively posted to the
Campus channel - i.e. their `custom_posting_options` has a row with
post_to = "Campus", status = "Active", and today within display_from/display_to.

Reuses the same rule the Careers / IJP / Refer channels use, via
_common.get_openings_active_on_channel("campus").

On Campus Invite the picker is narrowed again by the invite's Region, so HR picks
from the roles that region is actually hiring for instead of every campus opening
on the site. Campus Drive passes no region and keeps the full list.
"""

import frappe

from recruitment.api.channels._common import get_openings_active_on_channel


def campus_openings_for_region(region=None):
	"""Names of the campus-active Job Openings a `region` may be offered.

	That region's own openings, plus the openings carrying no region at all. A blank
	Region means "not tied to one" — the same reading the campus panels already use,
	where a Round Panelist with no Region set covers every region rather than none.
	Excluding them would also make the picker empty for a region that has no opening
	of its own, and Job Openings is a mandatory table: HR would be unable to create
	the invite at all.

	`region` is a Region NAME (the link value), matched against Job Opening's own
	`custom_region` link — never against the `custom_region_name` label, which is a
	display string and does not have to equal the id.
	"""
	names = get_openings_active_on_channel("campus")
	if not names or not region:
		return names

	rows = frappe.get_all("Job Opening", filters={"name": ["in", names]},
	                      fields=["name", "custom_region"])
	return [r.name for r in rows if not r.custom_region or r.custom_region == region]


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def campus_job_opening_query(doctype, txt, searchfield, start, page_len, filters):
	names = campus_openings_for_region((filters or {}).get("region"))
	if not names:
		return []

	or_conditions = None
	if txt:
		like = f"%{txt}%"
		or_conditions = [
			["name", "like", like],
			["job_title", "like", like],
			["custom_region_name", "like", like],
		]

	return frappe.get_all(
		"Job Opening",
		filters={"name": ["in", names]},
		or_filters=or_conditions,
		# A custom link query bypasses the doctype's `search_fields` entirely — the
		# dropdown only ever shows what we select here. Mirror search_fields so these
		# child-table pickers show the same details as a plain Job Opening link.
		fields=["name", "job_title", "custom_region_name", "status"],
		order_by="job_title asc",
		start=start,
		page_length=page_len,
		as_list=True,
	)


@frappe.whitelist()
def openings_outside_region(job_openings, region=None):
	"""Which of `job_openings` the given region may NOT offer.

	Used when HR changes the Region on a Campus Invite that already has openings on
	it: the rows belonging to the region they just left have to go, or the invite
	would send a college roles it is not hiring for there. Region-less rows stay —
	they belong to every region (see `campus_openings_for_region`).

	Answered on the server rather than by comparing in the browser: the child row
	carries `custom_region_name`, a display label, while the match is on the region
	LINK. Those two are not guaranteed to be the same string.
	"""
	if isinstance(job_openings, str):
		job_openings = frappe.parse_json(job_openings)
	job_openings = [o for o in (job_openings or []) if o]
	if not job_openings or not region:
		return []

	allowed = set(campus_openings_for_region(region))
	return [o for o in job_openings if o not in allowed]
