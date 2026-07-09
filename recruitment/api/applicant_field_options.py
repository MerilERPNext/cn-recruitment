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


@frappe.whitelist()
def get_job_applicant_field_options():
	"""Return Job Applicant data fields as ``[{label, value}]`` (label = field
	label, value = fieldname), sorted by label. Used to populate the Select
	pickers on the Job Opening / duplicity / rehire settings grids."""
	meta = frappe.get_meta("Job Applicant")
	out = []
	seen = set()
	for df in meta.fields:
		if df.fieldtype in _SKIP_FIELDTYPES:
			continue
		if not df.fieldname or df.fieldname in seen:
			continue
		seen.add(df.fieldname)
		out.append({"value": df.fieldname, "label": df.label or df.fieldname})
	out.sort(key=lambda x: (x["label"] or "").lower())
	return out
