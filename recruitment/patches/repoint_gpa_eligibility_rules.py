"""Point eligibility rules at the education row's current GPA field.

The candidate's marks moved to ``custom_gpa_percentage`` — our own Float field —
because retyping erpnext's ``class_per`` rewrote its column on every migrate (see
recruitment.recruitment.education_presentation). The retired fields are hidden and
nothing writes to them any more.

A rule still naming one would therefore read an empty value and quietly stop
firing: "GPA ≥ 60 → Knock out" would never knock anyone out, and auto-shortlist
would pass candidates it was configured to hold. So every rule that names a
retired GPA field is re-pointed here, in both places rules live — a Job Opening's
own rules and the campus defaults in Campus Eligibility Settings, which share one
child doctype.

Idempotent: a rule already naming the new field is left alone.
"""

import frappe

RULE_DT = "Job Opening Eligibility Rule"
TABLE = "custom_educational_qualification"
NEW_FIELD = "custom_gpa_percentage"
# The two the education row used to carry: erpnext's own, and the duplicate an
# import left behind. Both are hidden now.
RETIRED = ("class_per", "custom_max_gpapercentage")


def _repointed(value):
	"""The rule target with a retired GPA field swapped out, or None if unaffected."""
	if not value:
		return None
	for old in RETIRED:
		if value in (old, f"{TABLE}::{old}"):
			return f"{TABLE}::{NEW_FIELD}" if "::" in value else NEW_FIELD
	return None


def execute():
	if not frappe.db.exists("DocType", RULE_DT):
		return

	moved = 0
	for row in frappe.get_all(RULE_DT, fields=["name", "parent", "field_name", "match_field"],
	                          limit_page_length=0):
		update = {}
		for column in ("field_name", "match_field"):
			target = _repointed(row.get(column))
			if target:
				update[column] = target
		if not update:
			continue
		frappe.db.set_value(RULE_DT, row.name, update, update_modified=False)
		moved += 1
		print(f"  {row.parent}: {row.field_name} -> {update.get('field_name', row.field_name)}")

	frappe.db.commit()
	print(f"GPA eligibility rules re-pointed: {moved}")
