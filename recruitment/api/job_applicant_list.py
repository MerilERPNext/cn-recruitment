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


def _normalize_count_filters(filters):
	"""Turn the list view's active filters into a get_list filter list, dropping any
	`status` condition (the tabs count PER status, so status must not pre-filter) and
	normalizing both [doctype, field, op, value] and [field, op, value] shapes."""
	if isinstance(filters, str):
		try:
			filters = json.loads(filters)
		except (ValueError, TypeError):
			filters = []
	out = []
	for f in filters or []:
		if not isinstance(f, (list, tuple)):
			continue
		if len(f) == 4:
			field, op, val = f[1], f[2], f[3]
		elif len(f) == 3:
			field, op, val = f[0], f[1], f[2]
		else:
			continue
		if not field or field == "status":
			continue
		out.append([field, op, val])
	return out


@frappe.whitelist()
def get_job_applicants_with_stats(job_opening=None, owners=None, filters=None):
	"""Return tab counts + status options (+ opening header + owner display info).

	Tab counts honour ALL of the list view's active filters (institute, campus invite,
	opening, …) EXCEPT status — so each status tab shows how many of the *currently
	filtered* applicants sit in that status, and the numbers match the visible rows.
	"""

	status_options = _status_options()

	# All active list filters except status, plus the scoped opening (back-compat when
	# the opening arrives only as the job_opening arg and not as a live filter).
	scoped = _normalize_count_filters(filters)
	if job_opening and not any(f[0] == "job_title" for f in scoped):
		scoped.append(["job_title", "=", job_opening])

	# ONE permission-scoped query fetching just `status`, tallied in Python.
	# Avoids both the ~11 unbounded per-status pulls of the original AND the
	# SQL-function-in-fields aggregate (count(name) as c) that Frappe v16 rejects
	# ("SQL functions are not allowed as strings in SELECT"). get_list keeps the
	# user's permission filtering, so counts match the visible rows.
	# `pluck` returns a flat list of values instead of a dict per row — same single
	# query, but none of the per-row dict building on a table that can be large.
	statuses = frappe.get_list("Job Applicant", filters=scoped, pluck="status", limit_page_length=0)
	tab_counts = {"All": len(statuses)}
	for opt in status_options:
		tab_counts[opt] = 0
	for status in statuses:
		if status in tab_counts:
			tab_counts[status] += 1

	# --- Opening header (when scoped) ---
	opening_info = None
	if job_opening:
		# `job_requisition` rides along in the same row read — the header links to it,
		# and an opening without one drives the "no requisition" message.
		op = frappe.db.get_value(
			"Job Opening",
			job_opening,
			["name", "job_title", "designation", "department", "location", "status", "job_requisition"],
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
