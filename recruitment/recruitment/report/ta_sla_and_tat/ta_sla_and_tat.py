# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

"""TA SLA and TAT report.

Per-candidate Turn Around Times (Time to Fill / Hire / First Action) measured
against the points and targets configured in **TA SLA Settings**, with breach
flags. Read-only — it computes on the fly via the shared engine and never
mutates data.

When the feature is disabled (Recruitment Settings -> "Enable SLA & TAT
Tracking" off) the report renders empty with an explanatory message, so it is
always safe to open.
"""

import frappe
from frappe import _

from recruitment.recruitment.sla_tat_engine import compute_applicant_tat, is_enabled


def execute(filters=None):
	filters = filters or {}
	columns = get_columns()

	if not is_enabled():
		return columns, [], _(
			"SLA & TAT tracking is disabled. Turn it on in "
			"<b>Recruitment Settings → Enable SLA & TAT Tracking</b> and configure "
			"<b>TA SLA Settings</b> to populate this report."
		)

	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Candidate"), "fieldname": "applicant", "fieldtype": "Link", "options": "Job Applicant", "width": 200},
		{"label": _("Job Opening"), "fieldname": "job_title", "fieldtype": "Link", "options": "Job Opening", "width": 180},
		{"label": _("Designation"), "fieldname": "designation", "fieldtype": "Link", "options": "Designation", "width": 140},
		{"label": _("Recruiter"), "fieldname": "recruiter", "fieldtype": "Link", "options": "User", "width": 150},
		{"label": _("Current Stage"), "fieldname": "current_stage", "fieldtype": "Data", "width": 140},
		{"label": _("Time to Fill"), "fieldname": "time_to_fill", "fieldtype": "Int", "width": 100},
		{"label": _("Target Fill"), "fieldname": "target_fill", "fieldtype": "Int", "width": 100},
		{"label": _("Time to Hire"), "fieldname": "time_to_hire", "fieldtype": "Int", "width": 100},
		{"label": _("Target Hire"), "fieldname": "target_hire", "fieldtype": "Int", "width": 100},
		{"label": _("Time to First Action"), "fieldname": "time_to_first_action", "fieldtype": "Int", "width": 140},
		{"label": _("Breach"), "fieldname": "breach", "fieldtype": "Data", "width": 110},
	]


def get_data(filters):
	applicant_filters = {}
	if filters.get("job_title"):
		applicant_filters["job_title"] = filters["job_title"]
	if filters.get("designation"):
		applicant_filters["designation"] = filters["designation"]
	if filters.get("status"):
		applicant_filters["status"] = filters["status"]

	applicants = frappe.get_all(
		"Job Applicant",
		filters=applicant_filters,
		fields=[
			"name", "applicant_name", "job_title", "designation",
			"custom_recruiter", "custom_current_stage",
		],
		order_by="creation desc",
		limit=500,
	)

	rows = []
	for a in applicants:
		tat = compute_applicant_tat(a.name)
		if not tat:
			continue
		target = tat.get("target") or {}
		breach = tat.get("breach") or {}
		breached = [k.replace("_", " ").title() for k, v in breach.items() if v]
		rows.append({
			"applicant": a.name,
			"applicant_name": a.applicant_name,
			"job_title": a.job_title,
			"designation": a.designation,
			"recruiter": a.custom_recruiter,
			"current_stage": a.custom_current_stage,
			"time_to_fill": tat.get("time_to_fill"),
			"target_fill": target.get("fill"),
			"time_to_hire": tat.get("time_to_hire"),
			"target_hire": target.get("hire"),
			"time_to_first_action": tat.get("time_to_first_action"),
			"breach": ", ".join(breached) or "On Track",
		})
	return rows
