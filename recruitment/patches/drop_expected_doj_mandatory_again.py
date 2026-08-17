"""Remove the Property Setter that makes Job Applicant's Expected DOJ mandatory.

``Job Applicant-custom_expected_doj-mandatory_depends_on`` carries
``eval:doc.status != "Draft"``. A Job Applicant is almost never Draft, so the field
is in practice required on EVERY save — recruiters are blocked at every stage over a
date nobody knows until the offer is agreed.

``drop_expected_doj_mandatory`` already deleted this once. It came back, which it can
only do by hand through Customize Form (it is in no fixture and no
``recruitment/custom/*.json``). So this runs again, and any future recurrence means
someone re-added it in the UI rather than a migration re-creating it.

Deliberately NOT touched: the Custom Field ``Job Applicant-custom_expected_doj``
itself. It holds real data, and both Job Offer (via ``fetch_from``) and the SLA / TAT
engine, bulk offer creation, the offer web form, the pipeline block and the hiring
workflow all read it. Removing the field would destroy data and break those; only the
mandatory rule is the problem.
"""

import frappe

APPLICANT = "Job Applicant"
FIELD = "custom_expected_doj"


def execute():
	removed = []

	# Any property setter on this field that forces it to be filled in. Matched by
	# property rather than by name, so a differently-named setter with the same
	# effect is caught too.
	for row in frappe.get_all(
		"Property Setter",
		filters={
			"doc_type": APPLICANT,
			"field_name": FIELD,
			"property": ["in", ("mandatory_depends_on", "reqd")],
		},
		fields=["name", "property", "value"],
	):
		frappe.delete_doc("Property Setter", row.name, force=True, ignore_permissions=True)
		removed.append(f"{row.name} ({row.property}={row.value})")

	# The same rule could equally have been set on the Custom Field.
	if frappe.db.exists("Custom Field", f"{APPLICANT}-{FIELD}"):
		current = frappe.db.get_value(
			"Custom Field", f"{APPLICANT}-{FIELD}", ["reqd", "mandatory_depends_on"], as_dict=True
		)
		if current and (current.reqd or current.mandatory_depends_on):
			frappe.db.set_value("Custom Field", f"{APPLICANT}-{FIELD}",
			                    {"reqd": 0, "mandatory_depends_on": None})
			removed.append("Custom Field reqd/mandatory_depends_on cleared")

	frappe.clear_cache(doctype=APPLICANT)
	frappe.db.commit()
	print("Expected DOJ mandatory rule: " + (", ".join(removed) if removed else "nothing to remove"))
