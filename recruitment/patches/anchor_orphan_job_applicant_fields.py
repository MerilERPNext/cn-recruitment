"""Stop stray Job Applicant custom fields from hijacking the first tab.

`Meta.sort_fields()` hoists any custom field with a blank `insert_after` to
position 0 of the doctype. The Job Applicant form now opens on the Hiring
Workflow tab, which only works if its Tab Break really is the first field — a
hoisted field lands in front of it, so Frappe synthesises a stray "Details" tab
(and drops the form dashboard into it) ahead of the workflow.

Fields the app itself lays out are pinned by the `field_order` property setter
and are unaffected. This anchors everything else — fields added directly on a
site — into the Application Details tab, where a loose field belongs anyway.
"""

import json

import frappe

DOCTYPE = "Job Applicant"
# End of the Recruiter Remarks section, i.e. after the app's own fields but
# still inside the Application Details tab.
ANCHOR = "custom_recruiter_remark"


def execute():
	if not frappe.db.exists("Custom Field", {"dt": DOCTYPE, "fieldname": ANCHOR}):
		return

	ordered = _ordered_fieldnames()

	orphans = frappe.get_all(
		"Custom Field",
		filters={"dt": DOCTYPE, "insert_after": ["in", [None, ""]]},
		pluck="fieldname",
	)
	moved = [f for f in orphans if f not in ordered and f != ANCHOR]
	if not moved:
		return

	for fieldname in moved:
		frappe.db.set_value(
			"Custom Field",
			{"dt": DOCTYPE, "fieldname": fieldname},
			"insert_after",
			ANCHOR,
			update_modified=False,
		)

	frappe.clear_cache(doctype=DOCTYPE)
	print(f"Anchored {len(moved)} unplaced {DOCTYPE} field(s) after {ANCHOR}: {', '.join(moved)}")


def _ordered_fieldnames() -> set:
	"""Fieldnames pinned by the doctype's `field_order` property setter."""
	value = frappe.db.get_value(
		"Property Setter",
		{"doc_type": DOCTYPE, "property": "field_order", "field_name": ["in", [None, ""]]},
		"value",
	)
	if not value:
		return set()
	try:
		return set(json.loads(value))
	except (ValueError, TypeError):
		return set()
