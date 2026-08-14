"""What a candidate's education row shows — the whole field set, in order.

`Employee Education` is an erpnext doctype that several installed apps customise,
and `sync_customizations` re-applies every app's version of those property setters
on each migrate — in installed-app order, so the app that syncs last wins. A patch
cannot hold this ground: patches run before the customisation sync, so whatever a
later app declares silently replaces it (which is exactly how "Education Stage"
kept reverting to "Highest Qualification").

So this is applied from `after_migrate`, the last thing to run, and it is the one
place the decision lives.

What it decides: `FIELDS` below is the education row. Every other field the doctype
carries — erpnext's own plus the thirty-odd left behind by imports and other apps
(three separate year-of-passing fields, two GPA fields, the "(Naukri)" copies) — is
HIDDEN. Hidden is deliberate rather than deleted: the columns keep whatever they
hold, other apps can go on writing to them, and nothing outside this list reaches
HR, the candidate portal, or the eligibility rule builder (which lists a child
table's non-hidden fields).

Hiding is global to the doctype, so the Employee form shows the same clean set.
"""

import frappe

CHILD_DOCTYPE = "Employee Education"
STAGE_FIELD = "qualification"

# Course Type is a master (empty on a fresh site); these are the two the education
# row is meant to offer. Seeded, not hardcoded, so HR can add to them.
COURSE_TYPES = ("Full Time", "Part Time")

# Standard fields we must never retype: a fieldtype property setter on one of these
# makes Frappe rewrite an erpnext column on every migrate. `class_per` was retyped
# to Float before custom_gpa_percentage existed; the setter is removed here so the
# column settles back to what erpnext declares and stays there.
NEVER_RETYPE = ("class_per",)
LEGACY_GPA_FIELD = "class_per"
GPA_FIELD = "custom_gpa_percentage"

# The education row, in display order.
#   `columns`   -> also a grid column (the grid has ten units in total; the rest of
#                  the fields open with the row's pencil).
#   `fieldtype` -> what the field MUST be. Created with it when the doctype lacks
#                  the field, and re-asserted when something has changed it since:
#                  a patch's fieldtype property setter does not survive another
#                  app's customisation sync, which is how Education Stage silently
#                  went back to being a text box after being made a Link.
#   no fieldtype -> an existing field kept as it is, relabelled, for its data.
FIELDS = [
	{"fieldname": "custom_institute", "label": "Institute", "columns": 2,
	 "fieldtype": "Link", "options": "Institute",
	 "description": "The college from the Institute master — campus drives run on it. "
	                "Leave blank for a school or college that isn't one."},
	{"fieldname": STAGE_FIELD, "label": "Education Stage", "columns": 2,
	 "fieldtype": "Link", "options": "Education Stage"},
	{"fieldname": "school_univ", "label": "School / College Name", "columns": 2},
	{"fieldname": "custom_college_city", "label": "College City",
	 "fieldtype": "Data"},
	{"fieldname": "custom_college_state", "label": "College State",
	 "fieldtype": "Data"},
	{"fieldname": "custom_college_country", "label": "College Country",
	 "fieldtype": "Link", "options": "Country"},
	{"fieldname": "custom_graduated", "label": "Graduated",
	 "fieldtype": "Select", "options": "\nYes\nNo"},
	{"fieldname": "custom_course_type", "label": "Course Type"},
	{"fieldname": "custom_course_name", "label": "Course Name",
	 "fieldtype": "Data"},
	{"fieldname": "custom_registration_number", "label": "Registration No / Roll No"},
	# OUR field, created as a number, rather than retyping erpnext's `class_per`.
	# Changing the type of a standard field rewrites its column on every migrate —
	# varchar to decimal and back, depending on which app's customisation synced
	# last — and that ALTER fails the moment one row holds "First Class". `class_per`
	# is left exactly as erpnext ships it (and hidden); what it held is copied here
	# once, where it can be compared ("GPA / Percentage ≥ 60").
	{"fieldname": "custom_gpa_percentage", "label": "GPA / Percentage", "columns": 2,
	 "fieldtype": "Float",
	 "description": "Marks as a number — 82 for 82%, 8.5 for a 8.5 CGPA."},
	{"fieldname": "custom_start_date", "label": "Start Date"},
	{"fieldname": "custom_completion_date", "label": "End Date"},
	{"fieldname": "year_of_passing", "label": "Year of Passing", "columns": 2},
	{"fieldname": "custom_educated_overseas", "label": "Educated in Overseas",
	 "fieldtype": "Select", "options": "\nYes\nNo"},
	{"fieldname": "maj_opt_subj", "label": "Major / Specialization"},
]

ORDER = [f["fieldname"] for f in FIELDS]


def _set(fieldname, prop, value, property_type):
	frappe.make_property_setter({
		"doctype": CHILD_DOCTYPE,
		"fieldname": fieldname,
		"property": prop,
		"value": value,
		"property_type": property_type,
	}, is_system_generated=False)


def _ensure(df, prop, value, property_type):
	"""Write the property setter only when the field doesn't already say this.

	This runs on every migrate over ~50 fields; make_property_setter deletes and
	re-inserts a row each time it is called, so comparing first turns a settled
	doctype's pass into no writes at all.
	"""
	current = df.get(prop)
	if isinstance(value, int) and not isinstance(value, bool):
		same = frappe.utils.cint(current) == value
	else:
		same = (current or "") == (value or "")
	if same:
		return False
	_set(df.fieldname, prop, value, property_type)
	return True


def _drop_our_fieldtype_setters():
	"""Take back any fieldtype we imposed on a standard field. Idempotent."""
	dropped = []
	for fieldname in NEVER_RETYPE:
		for name in frappe.get_all("Property Setter", filters={
			"doc_type": CHILD_DOCTYPE, "field_name": fieldname, "property": "fieldtype",
		}, pluck="name"):
			frappe.delete_doc("Property Setter", name, force=True, ignore_permissions=True)
			dropped.append(fieldname)
	return dropped


def _backfill_gpa():
	"""Copy what `class_per` holds into our own field, where it is a number.

	Once only, and never over a value someone has already put in the new field. Text
	that isn't a number ("First Class") is left behind in the hidden field rather
	than being turned into a 0 that reads as a real mark.
	"""
	if not (frappe.db.has_column(CHILD_DOCTYPE, GPA_FIELD)
	        and frappe.db.has_column(CHILD_DOCTYPE, LEGACY_GPA_FIELD)):
		return 0
	rows = frappe.db.sql(
		f"""select name, `{LEGACY_GPA_FIELD}` as legacy from `tab{CHILD_DOCTYPE}`
		    where ifnull(`{GPA_FIELD}`, 0) = 0
		      and `{LEGACY_GPA_FIELD}` is not null and `{LEGACY_GPA_FIELD}` != ''""",
		as_dict=True)
	moved = 0
	for row in rows:
		try:
			value = float(str(row.legacy).replace("%", "").replace(",", "").strip())
		except (TypeError, ValueError):
			continue
		if not value:
			continue
		frappe.db.set_value(CHILD_DOCTYPE, row.name, GPA_FIELD, value, update_modified=False)
		moved += 1
	return moved


def _ensure_course_types():
	for name in COURSE_TYPES:
		if not frappe.db.exists("Course Type", name):
			doc = frappe.get_doc({"doctype": "Course Type", "course_type": name})
			doc.flags.ignore_mandatory = True
			doc.insert(ignore_permissions=True)


def _ensure_fields(meta):
	"""Create the fields the doctype doesn't have yet, in FIELDS order."""
	from frappe.custom.doctype.custom_field.custom_field import create_custom_field

	created, previous = [], None
	for spec in FIELDS:
		name = spec["fieldname"]
		if meta.get_field(name):
			previous = name
			continue
		if not spec.get("fieldtype"):
			# An existing field this site doesn't have (an app that ships it isn't
			# installed) — nothing to create it from, so leave it out.
			continue
		create_custom_field(CHILD_DOCTYPE, {
			"fieldname": name,
			"label": spec["label"],
			"fieldtype": spec["fieldtype"],
			"options": spec.get("options"),
			"description": spec.get("description"),
			"insert_after": previous,
		})
		created.append(name)
		previous = name
	return created


def apply_education_presentation():
	"""Idempotent — safe to run on every migrate."""
	if not frappe.db.exists("DocType", CHILD_DOCTYPE):
		return {"created": [], "hidden": 0}

	if frappe.db.exists("DocType", "Course Type"):
		_ensure_course_types()

	meta = frappe.get_meta(CHILD_DOCTYPE)
	if not meta.get_field(STAGE_FIELD):
		return {"created": [], "hidden": 0}

	dropped = _drop_our_fieldtype_setters()
	created = _ensure_fields(meta)
	if created or dropped:
		frappe.clear_cache(doctype=CHILD_DOCTYPE)
		meta = frappe.get_meta(CHILD_DOCTYPE)

	ours = {f["fieldname"]: f for f in FIELDS}
	hidden, retyped, changed = 0, [], 0
	for df in meta.fields:
		spec = ours.get(df.fieldname)
		if spec:
			changed += _ensure(df, "hidden", 0, "Check")
			changed += _ensure(df, "label", spec["label"], "Data")
			changed += _ensure(df, "in_list_view", 1 if spec.get("columns") else 0, "Check")
			if spec.get("columns"):
				changed += _ensure(df, "columns", spec["columns"], "Int")
			# Re-assert the type when it has drifted — another app's customisation
			# sync wipes the property setter a patch left behind.
			if spec.get("fieldtype") and df.fieldtype != spec["fieldtype"]:
				_set(df.fieldname, "fieldtype", spec["fieldtype"], "Select")
				retyped.append(f"{df.fieldname}: {df.fieldtype} -> {spec['fieldtype']}")
				changed += 1
			if spec.get("options"):
				changed += _ensure(df, "options", spec["options"], "Text")
			continue
		# Everything else: out of sight, out of the grid, and out of the field lists
		# built from this doctype (the eligibility builder skips hidden fields).
		changed += _ensure(df, "hidden", 1, "Check")
		changed += _ensure(df, "in_list_view", 0, "Check")
		hidden += 1

	# Ours first and in order; the hidden remainder keeps its existing order after.
	rest = [df.fieldname for df in meta.fields if df.fieldname not in ours]
	present = [f for f in ORDER if meta.get_field(f)]
	order = frappe.as_json(present + rest)
	# field_order is a doctype-level setter, so it carries no field_name (NULL) — do
	# not filter on one, or this never matches and rewrites the row every migrate.
	if frappe.db.get_value("Property Setter", {"doc_type": CHILD_DOCTYPE,
	                                           "property": "field_order"}, "value") != order:
		frappe.make_property_setter({
			"doctype": CHILD_DOCTYPE, "doctype_or_field": "DocType", "property": "field_order",
			"value": order, "property_type": "Text",
		}, is_system_generated=False)
		changed += 1

	moved = _backfill_gpa() if created else 0
	if changed or created or dropped:
		frappe.clear_cache(doctype=CHILD_DOCTYPE)
	return {"created": created, "retyped": retyped, "hidden": hidden, "visible": present,
	        "changed": changed, "untyped": dropped, "gpa_backfilled": moved}
