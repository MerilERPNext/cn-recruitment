"""
Job Requisition list view API
=============================

get_job_requisitions_with_stats(status=..., search=..., start=..., page_length=..., order_by=...)
    Returns paginated requisitions enriched with:
      - requester display info
      - relative "expected_by" hint ("in 27d", "1mo ago")
      - tab counts (All + every status option from the doctype meta)

The status options driving the tabs come from the Job Requisition doctype meta
at runtime, so new options Just Work.
"""

import frappe
from frappe.utils import cint, getdate, today


def _avatar_initials(name):
	parts = [p for p in (name or "").replace("@", " ").split() if p]
	if not parts:
		return "?"
	return ((parts[0][0] if parts else "") + (parts[1][0] if len(parts) > 1 else "")).upper()


def _relative_date(d):
	"""Return a short hint like 'in 27d', '2mo ago', 'today'."""
	if not d:
		return ""
	try:
		target = getdate(d)
	except Exception:
		return ""
	today_d = getdate(today())
	diff = (target - today_d).days
	if diff == 0:
		return "today"
	future = diff > 0
	n = abs(diff)
	if n < 30:
		return f"in {n}d" if future else f"{n}d ago"
	months = n // 30
	if months < 12:
		return f"in {months}mo" if future else f"{months}mo ago"
	years = months // 12
	return f"in {years}y" if future else f"{years}y ago"


@frappe.whitelist()
def get_job_requisitions_with_stats(
	status=None,
	search=None,
	start=0,
	page_length=20,
	order_by="modified desc",
):
	start = cint(start)
	page_length = cint(page_length) or 20

	status_field = frappe.get_meta("Job Requisition").get_field("status")
	status_options = [
		s.strip()
		for s in (status_field.options or "").split("\n")
		if s and s.strip()
	]

	filters = {}
	if status and status != "All" and status in status_options:
		filters["status"] = status

	or_filters = None
	if search:
		like = f"%{search}%"
		or_filters = [
			["name", "like", like],
			["designation", "like", like],
			["department", "like", like],
			["requested_by_name", "like", like],
		]

	fields = [
		"name",
		"designation",
		"department",
		"status",
		"custom_employment_type",
		"requested_by",
		"requested_by_name",
		"no_of_positions",
		"expected_compensation",
		"expected_by",
		"company",
		"modified",
		"creation",
	]

	rows = frappe.get_list(
		"Job Requisition",
		filters=filters,
		or_filters=or_filters,
		fields=fields,
		start=start,
		page_length=page_length,
		order_by=order_by,
	) or []

	total_count = len(
		frappe.get_list(
			"Job Requisition",
			filters=filters,
			or_filters=or_filters,
			fields=["name"],
			limit_page_length=0,
		)
	)

	# Tab counts (All + each status), ignoring the current status filter
	tab_counts = {
		"All": len(
			frappe.get_list(
				"Job Requisition",
				or_filters=or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)
	}
	for opt in status_options:
		tab_counts[opt] = len(
			frappe.get_list(
				"Job Requisition",
				filters={"status": opt},
				or_filters=or_filters,
				fields=["name"],
				limit_page_length=0,
			)
		)

	# Currency for compensation formatting — use first row's company or default
	default_currency = (
		frappe.db.get_default("currency")
		or frappe.db.get_value("Company", rows[0].company if rows else None, "default_currency")
		or "INR"
	)

	results = []
	for r in rows:
		requester_full = r.requested_by_name or r.requested_by or ""
		first = requester_full.split()[0] if requester_full else ""
		results.append(
			{
				"name": r.name,
				"designation": r.designation,
				"department": r.department,
				"status": r.status,
				"employment_type": r.custom_employment_type,
				"requester": {
					"id": r.requested_by,
					"name": requester_full,
					"first_name": first,
					"initials": _avatar_initials(requester_full),
				},
				"no_of_positions": cint(r.no_of_positions),
				"expected_compensation": float(r.expected_compensation or 0),
				"currency": default_currency,
				"expected_by": r.expected_by,
				"expected_by_hint": _relative_date(r.expected_by),
				"modified": r.modified,
			}
		)

	return {
		"data": results,
		"total_count": total_count,
		"tab_counts": tab_counts,
		"status_options": status_options,
	}
