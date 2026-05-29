"""
Job Applicant list view API
===========================

get_job_applicants_with_stats(job_opening=..., status=..., search=..., start=..., page_length=...)
    Returns paginated applicants enriched with stats + tab counts. Used by the
    customized Frappe desk list view at /app/job-applicant.

    When `job_opening` is passed, the response also includes the parent opening's
    title/name so the UI can render the "APPLICANTS FOR ..." header.

The status options driving the tabs and pipeline bar are read from the
Job Applicant doctype meta at runtime, so new options Just Work.
"""

import frappe
from frappe import _
from frappe.utils import cint


def _build_or_filters(search):
	if not search:
		return None
	like = f"%{search}%"
	return [
		["applicant_name", "like", like],
		["email_id", "like", like],
		["name", "like", like],
		["phone_number", "like", like],
	]


def _avatar_initials(name):
	parts = [p for p in (name or "").replace("@", " ").split() if p]
	if not parts:
		return "?"
	return ((parts[0][0] if parts else "") + (parts[1][0] if len(parts) > 1 else "")).upper()


@frappe.whitelist()
def get_job_applicants_with_stats(
	job_opening=None,
	status=None,
	search=None,
	start=0,
	page_length=20,
	order_by="creation desc",
):
	start = cint(start)
	page_length = cint(page_length) or 20

	status_field = frappe.get_meta("Job Applicant").get_field("status")
	status_options = [
		s.strip()
		for s in (status_field.options or "").split("\n")
		if s and s.strip()
	]

	# --- Filters ---
	filters = {}
	if job_opening:
		filters["job_title"] = job_opening
	if status and status != "All" and status in status_options:
		filters["status"] = status

	or_filters = _build_or_filters(search)

	fields = [
		"name",
		"applicant_name",
		"email_id",
		"phone_number",
		"status",
		"job_title",
		"designation",
		"source",
		"source_name",
		"applicant_rating",
		"custom_total_experience",
		"owner",
		"creation",
		"modified",
	]

	rows = frappe.get_list(
		"Job Applicant",
		filters=filters,
		or_filters=or_filters,
		fields=fields,
		start=start,
		page_length=page_length,
		order_by=order_by,
	) or []

	total_count = len(
		frappe.get_list(
			"Job Applicant",
			filters=filters,
			or_filters=or_filters,
			fields=["name"],
			limit_page_length=0,
		)
	)

	# --- Tab counts (All + each status), scoped to the opening if given ---
	scoped_filters = {}
	if job_opening:
		scoped_filters["job_title"] = job_opening

	tab_counts = {
		"All": len(
			frappe.get_list(
				"Job Applicant",
				filters=scoped_filters,
				or_filters=or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)
	}
	for opt in status_options:
		tab_counts[opt] = len(
			frappe.get_list(
				"Job Applicant",
				filters={**scoped_filters, "status": opt},
				or_filters=or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)

	# --- Owner lookup cache (User.full_name) ---
	owner_cache = {}

	def owner_info(user_id):
		if not user_id:
			return {"id": None, "name": "", "initials": "?"}
		if user_id not in owner_cache:
			full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
			owner_cache[user_id] = full_name
		full_name = owner_cache[user_id]
		first = full_name.split()[0] if full_name else user_id
		return {"id": user_id, "name": full_name, "first_name": first, "initials": _avatar_initials(full_name)}

	# --- Opening header (when scoped) ---
	opening_info = None
	if job_opening:
		op = frappe.db.get_value(
			"Job Opening",
			job_opening,
			["name", "job_title", "designation", "department", "location", "status"],
			as_dict=True,
		)
		if op:
			opening_info = op

	results = []
	for r in rows:
		results.append(
			{
				"name": r.name,
				"applicant_name": r.applicant_name,
				"email_id": r.email_id,
				"phone_number": r.phone_number,
				"status": r.status,
				"job_opening": r.job_title,
				"designation": r.designation,
				"source": r.source,
				"source_name": r.source_name,
				"applicant_rating": float(r.applicant_rating or 0),
				"score_pct": int(round(float(r.applicant_rating or 0) * 20)),  # 0–5 → 0–100
				"experience": r.custom_total_experience,
				"applied_on": r.creation,
				"owner": owner_info(r.owner),
				"initials": _avatar_initials(r.applicant_name or r.email_id or r.name),
			}
		)

	return {
		"data": results,
		"total_count": total_count,
		"tab_counts": tab_counts,
		"status_options": status_options,
		"opening": opening_info,
	}
