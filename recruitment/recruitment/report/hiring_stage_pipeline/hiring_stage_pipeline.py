# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Hiring Stage Pipeline — candidate counts per hiring stage.

Reads the ordered stages from a Job Opening's ``custom_hiring_stages`` and
counts Job Applicants currently sitting on each stage
(``custom_current_stage``). Pick a Job Opening in the filter to see that
opening's funnel in stage order; leave it blank for an overall view.
"""

import frappe

from recruitment.api.hiring_stage import get_opening_stages


def execute(filters=None):
	filters = filters or {}
	job_opening = filters.get("job_opening")

	columns = [
		{"label": "Stage", "fieldname": "stage_name", "fieldtype": "Data", "width": 240},
		{"label": "Type", "fieldname": "stage_type", "fieldtype": "Data", "width": 120},
		{"label": "Candidates", "fieldname": "candidates", "fieldtype": "Int", "width": 120},
	]

	# Count applicants by current stage, scoped to the opening when given.
	# Counted in Python to stay clear of SQL aggregate functions in field strings.
	ja_filters = {}
	if job_opening:
		ja_filters["job_title"] = job_opening
	counts = {}
	for row in frappe.get_all(
		"Job Applicant",
		filters=ja_filters,
		fields=["custom_current_stage"],
	):
		key = (row.get("custom_current_stage") or "").strip()
		counts[key] = counts.get(key, 0) + 1

	data = []
	if job_opening:
		# Preserve the opening's configured stage order; show empty stages as 0.
		for stage in get_opening_stages(job_opening):
			name = (stage.get("stage_name") or "").strip()
			data.append({
				"stage_name": name,
				"stage_type": stage.get("stage_type"),
				"candidates": counts.pop(name, 0),
			})
		# Any leftover stages (renamed / legacy) still surface so nobody is lost.
		for name, count in counts.items():
			if name:
				data.append({"stage_name": name, "stage_type": "", "candidates": count})
	else:
		for name, count in sorted(counts.items(), key=lambda kv: -kv[1]):
			if name:
				data.append({"stage_name": name, "stage_type": "", "candidates": count})

	return columns, data
