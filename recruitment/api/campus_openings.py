"""Link-field query for Campus doctypes.

Filters the Job Opening picker (Campus Invite → job_openings, Campus Drive →
linked_job_openings) down to the openings a campus drive can actually be run for.
Three rules, narrowing in turn:

* **Posted to Campus.** The opening's `custom_posting_options` carries an Active row
  with post_to = "Campus" and today inside its display window. Same rule the Careers
  / IJP / Refer channels use, via `_common.get_openings_active_on_channel`.
* **Fresher.** Campus hiring IS fresher hiring — a college drive cannot fill a
  lateral role. `custom_hiring_type` defaults to "Lateral", so without this the
  picker offers roles no campus candidate is eligible for.
* **The invite's Region**, when one is set. Campus Invite passes it; Campus Drive
  does not and keeps the whole list.
"""

import frappe

from recruitment.api.channels._common import get_openings_active_on_channel

# What a campus drive hires. The Job Opening field is a Select of Fresher / Lateral
# defaulting to Lateral, so this is a real filter, not a formality.
CAMPUS_HIRING_TYPE = "Fresher"
HIRING_TYPE_FIELD = "custom_hiring_type"


def _hiring_type_filter():
	"""``{custom_hiring_type: "Fresher"}``, or nothing on a site without the field.

	Guarded rather than hardcoded: the field is a customization, and an install that
	has not got it should keep seeing every campus opening rather than an empty
	picker it cannot explain.
	"""
	if not frappe.get_meta("Job Opening").has_field(HIRING_TYPE_FIELD):
		return None
	return {HIRING_TYPE_FIELD: CAMPUS_HIRING_TYPE}


def campus_openings(region=None):
	"""Names of the Job Openings a campus invite / drive may offer.

	Campus-active and Fresher always; narrowed to `region` when one is given —
	that region's own openings plus the ones carrying no region at all. A blank
	Region means "not tied to one", the same reading the campus panels already use,
	where a Round Panelist with no Region set covers every region rather than none.
	Excluding them would also empty the picker for a region with no opening of its
	own, and Job Openings is a mandatory table: HR could not create the invite.

	`region` is a Region NAME (the link value), matched against Job Opening's own
	`custom_region` link — never against the `custom_region_name` label, which is a
	display string and does not have to equal the id.
	"""
	names = get_openings_active_on_channel("campus", _hiring_type_filter())
	if not names or not region:
		return names

	rows = frappe.get_all("Job Opening", filters={"name": ["in", names]},
	                      fields=["name", "custom_region"])
	return [r.name for r in rows if not r.custom_region or r.custom_region == region]


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def campus_job_opening_query(doctype, txt, searchfield, start, page_len, filters):
	names = campus_openings((filters or {}).get("region"))
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
	"""Which of `job_openings` belong to a region other than `region`.

	Used when HR changes the Region on a Campus Invite that already has openings on
	it: the rows belonging to the region they just left have to go, or the invite
	would send a college roles it is not hiring for there. Region-less rows stay —
	they belong to every region.

	Deliberately region-only, not "everything `campus_openings` would no longer
	offer": changing the region should remove what the region change invalidated and
	nothing else. An opening that stopped being Fresher, or came off the Campus
	channel, is a different problem and silently dropping it here would hide it.

	Answered on the server rather than by comparing in the browser: the child row
	carries `custom_region_name`, a display label, while the match is on the region
	LINK. Those two are not guaranteed to be the same string.
	"""
	if isinstance(job_openings, str):
		job_openings = frappe.parse_json(job_openings)
	job_openings = [o for o in (job_openings or []) if o]
	if not job_openings or not region:
		return []

	rows = frappe.get_all("Job Opening", filters={"name": ["in", job_openings]},
	                      fields=["name", "custom_region"])
	return [r.name for r in rows if r.custom_region and r.custom_region != region]
