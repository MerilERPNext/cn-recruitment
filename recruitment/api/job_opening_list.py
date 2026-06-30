"""
Job Opening list view — auxiliary data API
==========================================

The Job Opening desk list is rendered by a custom table
(`public/js/job_opening_list.js`) that sits on top of Frappe's native list view.
Frappe itself owns the row data, filtering, sorting, pagination, selection and
the Actions menu.

This endpoint supplies only the bits the table can't get from Frappe's standard
list query:
  - tab_counts      : status group counts for the top tabs (All + each status)
  - status_options  : status field options (drive the tabs), from doctype meta
  - stats           : per-opening aggregates for the *visible* rows (passed in
                      via `names`) — total applicants, pipeline stage counts,
                      active interviews and the resolved owner name.

Pipeline mapping: each applicant is counted into the pipeline stage matching its
own `status` (Draft/Open/Shortlisted/Interview/Hold/Approvals/Accepted/Rejected).
"""

import json

import frappe
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


def _owner_label(user_id, cache):
	if not user_id:
		return {"id": None, "name": "", "initials": "?"}
	full_name = cache.get(user_id)
	if full_name is None:
		full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
		cache[user_id] = full_name
	parts = [p for p in full_name.replace("@", " ").split() if p]
	initials = ((parts[0][0] if parts else "") + (parts[1][0] if len(parts) > 1 else "")).upper()
	return {"id": user_id, "name": full_name, "initials": initials or "?"}


def _status_options():
	status_field = frappe.get_meta("Job Opening").get_field("status")
	return [s.strip() for s in (status_field.options or "").split("\n") if s and s.strip()]


@frappe.whitelist()
def get_job_openings_with_stats(names=None):
	"""Return tab counts + status options, plus per-opening stats for `names`."""

	status_options = _status_options()

	# --- Tab counts (All + each status) — one permission-scoped grouped query
	# (get_list keeps user permissions) instead of one unbounded pull per status. ---
	grouped = frappe.get_list(
		"Job Opening",
		fields=["status", "count(name) as c"],
		group_by="status",
		limit_page_length=0,
	)
	by_status = {row.status: row.c for row in grouped}

	tab_counts = {"All": sum(by_status.values())}
	for opt in status_options:
		tab_counts[opt] = by_status.get(opt, 0)

	# --- Per-opening stats for the visible rows ---
	if isinstance(names, str):
		try:
			names = json.loads(names)
		except (ValueError, TypeError):
			names = [names] if names else []
	names = [n for n in (names or []) if n]

	stats = {}
	if names:
		pipeline_by_opening = {n: _empty_pipeline() for n in names}
		total_by_opening = {n: 0 for n in names}
		interviews_by_opening = {n: 0 for n in names}

		applicants = frappe.get_all(
			"Job Applicant",
			filters={"job_title": ["in", names]},
			fields=["name", "job_title", "status"],
		)
		applicant_names = [a.name for a in applicants]

		interviews_by_applicant = {}
		if applicant_names:
			for row in frappe.get_all(
				"Interview",
				filters={"job_applicant": ["in", applicant_names]},
				fields=["job_applicant", "status", "scheduled_on"],
			):
				interviews_by_applicant.setdefault(row.job_applicant, []).append(row)

		stage_set = set(PIPELINE_STAGES)
		today_d = getdate(today())
		for a in applicants:
			opening = a.job_title
			if opening not in pipeline_by_opening:
				continue
			total_by_opening[opening] += 1
			if a.status in stage_set:
				pipeline_by_opening[opening][a.status] += 1
			for iv in interviews_by_applicant.get(a.name, []):
				if iv.status in ("Pending", "Under Review") and iv.scheduled_on:
					try:
						if getdate(iv.scheduled_on) >= today_d:
							interviews_by_opening[opening] += 1
					except Exception:
						pass

		owner_cache = {}
		owners = {
			o.name: o.owner
			for o in frappe.get_all(
				"Job Opening", filters={"name": ["in", names]}, fields=["name", "owner"]
			)
		}
		for n in names:
			stats[n] = {
				"total_applicants": total_by_opening.get(n, 0),
				"pipeline": pipeline_by_opening.get(n, _empty_pipeline()),
				"active_interviews": interviews_by_opening.get(n, 0),
				"owner": _owner_label(owners.get(n), owner_cache),
			}

	return {
		"tab_counts": tab_counts,
		"status_options": status_options,
		"stats": stats,
	}
