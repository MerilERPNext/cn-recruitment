"""How the education child table presents itself: its grid columns and the name of
the stage field.

`Employee Education` is an erpnext doctype that several installed apps customise,
and `sync_customizations` re-applies every app's version of those property setters
on each migrate — in installed-app order, so the app that syncs last wins. A patch
cannot hold this ground: patches run before the customisation sync, so whatever a
later app declares silently replaces it (which is exactly how "Education Stage"
kept reverting to "Highest Qualification").

So this is applied from `after_migrate`, the last thing to run, and it is the one
place the decision lives — the patches that introduced it just call in here.
"""

import frappe

CHILD_DOCTYPE = "Employee Education"
STAGE_FIELD = "qualification"

# `qualification` is a Link to the Education Stage master — 10th, 12th, Diploma,
# Graduation. Every row carries one, so "Highest Qualification" described the wrong
# thing on every row but the last.
STAGE_LABEL = "Education Stage"

# The grid has ten column units. Left to itself the table flags eight fields for
# it, so the ones declared first win and the ones that matter drop off. These four,
# at these widths, are the grid; everything else lives behind the row's pencil.
GRID_COLUMNS = {
	"school_univ": 3,
	STAGE_FIELD: 3,
	"class_per": 2,
	"year_of_passing": 2,
}

HIDE_FROM_GRID = (
	"level",
	"maj_opt_subj",
	"custom_educational_details",
	"custom_passing_year",
)


def _set(fieldname, prop, value, property_type):
	frappe.make_property_setter({
		"doctype": CHILD_DOCTYPE,
		"fieldname": fieldname,
		"property": prop,
		"value": value,
		"property_type": property_type,
	}, is_system_generated=False)


def apply_education_presentation():
	"""Idempotent — safe to run on every migrate."""
	if not frappe.db.exists("DocType", CHILD_DOCTYPE):
		return

	meta = frappe.get_meta(CHILD_DOCTYPE)
	if not meta.get_field(STAGE_FIELD):
		return

	_set(STAGE_FIELD, "label", STAGE_LABEL, "Data")

	for fieldname, width in GRID_COLUMNS.items():
		if not meta.get_field(fieldname):
			continue
		_set(fieldname, "in_list_view", 1, "Check")
		_set(fieldname, "columns", width, "Int")

	for fieldname in HIDE_FROM_GRID:
		if not meta.get_field(fieldname):
			continue
		_set(fieldname, "in_list_view", 0, "Check")

	frappe.clear_cache(doctype=CHILD_DOCTYPE)
