"""
Job Applicant list view — auxiliary data API
============================================

The Job Applicant desk list is rendered by a custom table
(`public/js/job_applicant_list.js`) on top of Frappe's native list view, which
owns the row data, filtering, sorting, pagination, selection and Actions menu.

This endpoint supplies only the bits the table can't get from the standard list
query:
  - tab_counts      : status group counts (All + each status), scoped to the
                      opening when `job_opening` is given
  - status_options  : status field options (drive the tabs + top pipeline bar)
  - opening         : the parent opening's title/meta, for the "Applicants for…"
                      header (only when scoped by `job_opening`)
  - users           : display info (name / first_name / initials) for the owner
                      ids of the visible rows (passed in via `owners`)
"""

import json

import frappe


def _avatar_initials(name):
	parts = [p for p in (name or "").replace("@", " ").split() if p]
	if not parts:
		return "?"
	return ((parts[0][0] if parts else "") + (parts[1][0] if len(parts) > 1 else "")).upper() or "?"


def _status_options():
	status_field = frappe.get_meta("Job Applicant").get_field("status")
	return [s.strip() for s in (status_field.options or "").split("\n") if s and s.strip()]


@frappe.whitelist()
def get_job_applicants_with_stats(job_opening=None, owners=None):
	"""Return tab counts + status options (+ opening header + owner display info)."""

	status_options = _status_options()

	scoped = {"job_title": job_opening} if job_opening else {}

	def _count(extra=None):
		filters = dict(scoped)
		if extra:
			filters.update(extra)
		return len(frappe.get_list("Job Applicant", filters=filters, fields=["name"], limit_page_length=0))

	tab_counts = {"All": _count()}
	for opt in status_options:
		tab_counts[opt] = _count({"status": opt})

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

	# --- Owner display info for the visible rows ---
	if isinstance(owners, str):
		try:
			owners = json.loads(owners)
		except (ValueError, TypeError):
			owners = [owners] if owners else []
	owners = [o for o in (owners or []) if o]

	users = {}
	if owners:
		for u in frappe.get_all(
			"User", filters={"name": ["in", list(set(owners))]}, fields=["name", "full_name"]
		):
			full_name = u.full_name or u.name
			users[u.name] = {
				"name": full_name,
				"first_name": full_name.split()[0] if full_name else u.name,
				"initials": _avatar_initials(full_name),
			}

	return {
		"tab_counts": tab_counts,
		"status_options": status_options,
		"opening": opening_info,
		"users": users,
	}
