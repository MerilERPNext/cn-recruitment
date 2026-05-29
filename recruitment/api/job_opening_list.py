"""
Job Opening list view API
=========================

get_job_openings_with_stats(status=..., search=..., start=..., page_length=..., order_by=...)
    Returns paginated job openings enriched with:
      - total applicants
      - per-pipeline-stage counts (Applied / Screening / Interview / Offer / Hired / Rejected)
      - active interviews count
      - days the opening has been posted ("Open For")
      - owner display name
      - status group counts for top tabs (All / Open / Draft / Closed)

Status mapping
--------------
Job Opening has only Open/Closed in the base doctype, so "Draft" here is
inferred as Open openings with `publish = 0` (not yet published).

Pipeline mapping for Job Applicant (kept intentionally simple):
    Applied   -> status='Open' and no Interview record
    Screening -> status='Replied'
    Interview -> status NOT IN ('Rejected') and has at least one Interview
    Offer     -> has a Job Offer with status='Awaiting Response'
    Hired     -> status='Accepted' OR has a Job Offer with status='Accepted'
    Rejected  -> status='Rejected'

Each applicant is counted in at most one stage; later stages win over earlier ones.
"""

import frappe
from frappe import _
from frappe.utils import cint, getdate, today


PIPELINE_STAGES = (
	"Draft",
	"Open",
	"Shortlisted",
	"Interview",
	"Hold",
	"Approvals",
	"Accepted",
	"Rejected",
)


def _empty_pipeline():
	return {stage: 0 for stage in PIPELINE_STAGES}


def _days_open(posted_on, closed_on):
	if not posted_on:
		return 0
	end = getdate(closed_on) if closed_on else getdate(today())
	return max(0, (end - getdate(posted_on)).days)


def _owner_label(user_id, user_full_name_cache):
	if not user_id:
		return {"id": None, "name": "", "initials": ""}

	full_name = user_full_name_cache.get(user_id)
	if full_name is None:
		full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
		user_full_name_cache[user_id] = full_name

	parts = [p for p in full_name.replace("@", " ").split() if p]
	initials = ((parts[0][0] if parts else "") + (parts[1][0] if len(parts) > 1 else "")).upper()
	return {"id": user_id, "name": full_name, "initials": initials or "?"}


@frappe.whitelist()
def get_job_openings_with_stats(
	status=None,
	search=None,
	start=0,
	page_length=20,
	order_by="modified desc",
):
	"""Return job openings + enriched stats + tab counts in a single call."""

	start = cint(start)
	page_length = cint(page_length) or 20

	# --- Resolve status options from the doctype meta so new statuses appear automatically ---
	status_field = frappe.get_meta("Job Opening").get_field("status")
	status_options = [
		s.strip()
		for s in (status_field.options or "").split("\n")
		if s and s.strip()
	]

	# --- Build filters for the openings list ---
	filters = {}
	if status and status != "All" and status in status_options:
		filters["status"] = status
	# "All" / None / unknown → no status filter

	or_filters = None
	if search:
		like = f"%{search}%"
		or_filters = [
			["job_title", "like", like],
			["name", "like", like],
			["designation", "like", like],
			["department", "like", like],
			["location", "like", like],
		]

	fields = [
		"name",
		"job_title",
		"designation",
		"department",
		"location",
		"status",
		"publish",
		"posted_on",
		"closes_on",
		"closed_on",
		"owner",
		"modified",
		"creation",
		"company",
	]

	openings = frappe.get_list(
		"Job Opening",
		filters=filters,
		or_filters=or_filters,
		fields=fields,
		start=start,
		page_length=page_length,
		order_by=order_by,
	) or []

	total_count = len(
		frappe.get_list(
			"Job Opening",
			filters=filters,
			or_filters=or_filters,
			fields=["name"],
			limit_page_length=0,
		)
	)

	# --- Compute tab counts (All + every status option) ignoring the current status filter ---
	tab_or_filters = or_filters
	tab_counts = {
		"All": len(
			frappe.get_list(
				"Job Opening",
				or_filters=tab_or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)
	}
	for opt in status_options:
		tab_counts[opt] = len(
			frappe.get_list(
				"Job Opening",
				filters={"status": opt},
				or_filters=tab_or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)

	# --- Enrich each opening with stats ---
	opening_names = [o.name for o in openings]
	pipeline_by_opening = {n: _empty_pipeline() for n in opening_names}
	total_applicants_by_opening = {n: 0 for n in opening_names}
	active_interviews_by_opening = {n: 0 for n in opening_names}

	if opening_names:
		# Pull all applicants for these openings in one query
		applicants = frappe.get_all(
			"Job Applicant",
			filters={"job_title": ["in", opening_names]},
			fields=["name", "job_title", "status"],
		)
		applicant_names = [a.name for a in applicants]

		# Map applicant -> interviews (for active interview count)
		interviews_by_applicant = {}
		today_str = today()
		if applicant_names:
			interview_rows = frappe.get_all(
				"Interview",
				filters={"job_applicant": ["in", applicant_names]},
				fields=["job_applicant", "status", "scheduled_on"],
			)
			for row in interview_rows:
				interviews_by_applicant.setdefault(row.job_applicant, []).append(row)

		stage_set = set(PIPELINE_STAGES)
		for a in applicants:
			opening = a.job_title
			if opening not in pipeline_by_opening:
				continue
			total_applicants_by_opening[opening] += 1
			if a.status in stage_set:
				pipeline_by_opening[opening][a.status] += 1

			# Active interviews = upcoming, not finalised
			for iv in interviews_by_applicant.get(a.name, []):
				if iv.status in ("Pending", "Under Review") and iv.scheduled_on:
					try:
						if getdate(iv.scheduled_on) >= getdate(today_str):
							active_interviews_by_opening[opening] += 1
					except Exception:
						pass

	# --- Owner display info ---
	owner_cache = {}
	results = []
	for o in openings:
		results.append(
			{
				"name": o.name,
				"job_title": o.job_title,
				"designation": o.designation,
				"department": o.department,
				"location": o.location,
				"status": o.status,
				"publish": cint(o.publish),
				"display_status": o.status,
				"posted_on": o.posted_on,
				"closes_on": o.closes_on,
				"closed_on": o.closed_on,
				"open_for_days": _days_open(o.posted_on or o.creation, o.closed_on),
				"total_applicants": total_applicants_by_opening.get(o.name, 0),
				"pipeline": pipeline_by_opening.get(o.name, _empty_pipeline()),
				"active_interviews": active_interviews_by_opening.get(o.name, 0),
				"owner": _owner_label(o.owner, owner_cache),
				"modified": o.modified,
			}
		)

	return {
		"data": results,
		"total_count": total_count,
		"tab_counts": tab_counts,
		"status_options": status_options,
	}
