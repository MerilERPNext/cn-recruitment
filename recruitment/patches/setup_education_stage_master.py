"""Make the education stage a controlled, dynamic value.

Previously the eligibility engine hardcoded a list of education stages (10th,
12th, …) plus a big table of spelling synonyms (SSC, Matriculation, …) because
the ``qualification`` field on Employee Education was free-text Data.

This patch removes the need for any of that:

  1. Seeds the new **Education Stage** master with the common stages (editable —
     admins add / rename / reorder freely; the eligibility builder reads it live).
  2. Any qualification value candidates already typed is turned into a stage
     record first, so no existing data is orphaned.
  3. Converts ``Employee Education.qualification`` from Data → **Link → Education
     Stage** via property setters, so every future row is a controlled value.

Idempotent.
"""

import frappe

STAGE_MASTER = "Education Stage"
CHILD_DOCTYPE = "Employee Education"
STAGE_FIELD = "qualification"

# Seed stages (sequence controls builder order). Editable afterwards.
SEED_STAGES = [
	("10th", 10),
	("12th", 20),
	("Diploma", 30),
	("Graduation", 40),
	("Post Graduation", 50),
]


def _ensure_stage(name, sequence=None):
	if not name or not str(name).strip():
		return
	name = str(name).strip()
	if frappe.db.exists(STAGE_MASTER, name):
		return
	frappe.get_doc({
		"doctype": STAGE_MASTER,
		"stage_name": name,
		"sequence": sequence if sequence is not None else 900,
	}).insert(ignore_permissions=True)


def execute():
	if not frappe.db.exists("DocType", STAGE_MASTER):
		# DocType ships with the app; migrate creates it before patches run.
		return

	# 1. Seed the canonical stages.
	for name, seq in SEED_STAGES:
		_ensure_stage(name, seq)

	# 2. Preserve anything candidates already entered so the Link never dangles.
	try:
		existing = frappe.db.sql(
			"select distinct `{0}` from `tab{1}` where `{0}` is not null and `{0}` != ''".format(
				STAGE_FIELD, CHILD_DOCTYPE
			)
		)
		for (val,) in existing:
			_ensure_stage(val)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Education Stage backfill failed")

	# 3. Convert qualification Data -> Link -> Education Stage (property setters).
	frappe.make_property_setter({
		"doctype": CHILD_DOCTYPE,
		"fieldname": STAGE_FIELD,
		"property": "fieldtype",
		"value": "Link",
		"property_type": "Select",
	}, is_system_generated=False)
	frappe.make_property_setter({
		"doctype": CHILD_DOCTYPE,
		"fieldname": STAGE_FIELD,
		"property": "options",
		"value": STAGE_MASTER,
		"property_type": "Text",
	}, is_system_generated=False)

	# The percentage/GPA field is stored as free-text Data — make it a real number
	# so eligibility comparisons (e.g. "Graduation % ≥ 80") are numeric, and so it
	# shows up as a comparable target in the builder.
	frappe.make_property_setter({
		"doctype": CHILD_DOCTYPE,
		"fieldname": "class_per",
		"property": "fieldtype",
		"value": "Data",
		"property_type": "Select",
	}, is_system_generated=False)

	frappe.clear_cache(doctype=CHILD_DOCTYPE)
	frappe.db.commit()
