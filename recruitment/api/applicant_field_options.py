"""Job Applicant field options for the rule / screener / check pickers.

Replaces the old ``TA Job Applicant Field`` mirror doctype: instead of maintaining
a synced copy of the Job Applicant schema, the pickers now read the live metadata
directly. Each option shows the field **label** but stores the **fieldname**, so
the eligibility / screener / duplicity / rehire engines keep reading the value as
an ordinary Job Applicant fieldname (``doc.get(fieldname)``).
"""

import frappe

# Layout / display-only fieldtypes hold no queryable value — skip them.
_SKIP_FIELDTYPES = {
	"Section Break", "Column Break", "Tab Break",
	"HTML", "Button", "Heading", "Fold", "Image", "Barcode",
}


_TABLE_FIELDTYPES = {"Table", "Table MultiSelect"}


@frappe.whitelist()
def get_job_applicant_field_options(include_children=0):
	"""Return Job Applicant data fields as ``[{label, value}]`` (label = field
	label, value = fieldname), sorted by label.

	When ``include_children`` is truthy, also append fields from the applicant's
	editable child tables (e.g. Educational Qualification, Previous Work
	Experience) as ``{value: "table::childfield", label: "Table → Field"}`` — so
	eligibility rules can target a value inside a child row (see
	``recruitment.recruitment.eligibility_engine``).
	"""
	include_children = frappe.utils.cint(include_children)
	meta = frappe.get_meta("Job Applicant")
	out = []
	seen = set()
	for df in meta.fields:
		if df.fieldtype in _SKIP_FIELDTYPES or df.fieldtype in _TABLE_FIELDTYPES:
			if include_children and df.fieldtype in _TABLE_FIELDTYPES and df.options \
					and not df.hidden and not df.read_only:
				out.extend(_child_field_options(df))
			continue
		if not df.fieldname or df.fieldname in seen:
			continue
		seen.add(df.fieldname)
		out.append({"value": df.fieldname, "label": df.label or df.fieldname})
	out.sort(key=lambda x: (x["label"] or "").lower())
	return out


def _child_field_options(table_df):
	"""[{value:'table::field', label:'Table → Field'}] for a child table's data fields."""
	rows = []
	try:
		child = frappe.get_meta(table_df.options)
	except Exception:
		return rows
	table_label = table_df.label or table_df.fieldname
	for cf in child.fields:
		if cf.fieldtype in _SKIP_FIELDTYPES or cf.fieldtype in _TABLE_FIELDTYPES:
			continue
		if not cf.fieldname or cf.hidden:
			# Hidden child fields are hidden for a reason — the education table alone
			# carries thirty-odd left behind by imports and other apps. Offering them
			# here put fields nobody can see or fill into rules and application forms.
			continue
		rows.append({
			"value": "{0}::{1}".format(table_df.fieldname, cf.fieldname),
			"label": "{0} → {1}".format(table_label, cf.label or cf.fieldname),
		})
	return rows
