"""Move field-based Raise Requisition Scope bases onto User Assignments.

Raise Requisition Scope used to carry three field-based scope bases of its own —
``scope_by_company`` / ``scope_by_department`` / ``scope_by_designation``, each
with a child table of allowed values. Those fields and child doctypes are gone;
the same restriction is now an *attribute* on a Dynamic User Assignment, which is
what lets a fourth field be scoped without a release.

This patch carries existing configuration across. For each scope record that had
any of the three bases ticked, it creates one Dynamic User Assignment of purpose
``Attributes`` holding the same values as attributes on Job Requisition, and
links it into ``scope_of_raising_requisitions``.

Reads the old columns with raw SQL on purpose: the fields are already removed
from the doctype JSON, so ``frappe.get_all`` would not return them, and on a site
that has already migrated the columns may be gone entirely — hence the
table/column existence checks.

Idempotent. Safe to run on a site that never configured a field-based scope,
where it does nothing at all.
"""

import frappe

from nextai.nextai.doctype.dynamic_user_assignment.attributes import PURPOSE_ATTRIBUTES

REQUISITION_DOCTYPE = "Job Requisition"

# old child doctype -> (parentfield, value column, Job Requisition fieldname)
LEGACY_BASES = {
	"Raise Requisition Scope Company": ("scope_companies", "company", "company"),
	"Raise Requisition Scope Department": ("scope_departments", "department", "department"),
	"Raise Requisition Scope Designation": ("scope_designations", "designation", "designation"),
}


def execute():
	if not frappe.db.table_exists("Raise Requisition Scope"):
		return

	scope_columns = {
		row.Field if hasattr(row, "Field") else row[0]
		for row in frappe.db.sql("DESC `tabRaise Requisition Scope`", as_dict=False)
	}
	legacy_checks = [
		c
		for c in ("scope_by_company", "scope_by_department", "scope_by_designation")
		if c in scope_columns
	]
	if not legacy_checks:
		# Columns already dropped by a later migration — nothing to carry.
		return

	records = frappe.db.sql(
		"SELECT name, {} FROM `tabRaise Requisition Scope`".format(", ".join(f"`{c}`" for c in legacy_checks)),
		as_dict=True,
	)

	for record in records:
		if not any(record.get(c) for c in legacy_checks):
			continue
		_migrate_record(record["name"])


def _migrate_record(scope_name):
	values = _legacy_values(scope_name)
	if not values:
		return

	assignment_name = f"RRS Scope - {scope_name}"[:140]
	if frappe.db.exists("Dynamic User Assignment", assignment_name):
		_link(scope_name, assignment_name)
		return

	doc = frappe.new_doc("Dynamic User Assignment")
	doc.assignment_name = assignment_name
	doc.assignment_code = assignment_name
	doc.assignment_purpose = PURPOSE_ATTRIBUTES
	doc.target_type = "Employee"
	doc.description = (
		f"Created automatically from the Company / Department / Designation scope "
		f"that used to live on Raise Requisition Scope '{scope_name}'."
	)
	doc.append("applicable_for_process", {"document_type": REQUISITION_DOCTYPE})
	# The old bases were three independent lists AND-ed together, which is what
	# "All fields must match" means here.
	doc.attribute_match = "All fields must match (AND)"
	# The old cascade validation ran when the values were first entered, so
	# re-running it now could reject configuration that is already live. Carry it
	# across as-is and let the administrator re-enable the check.
	doc.validate_attribute_hierarchy = 0

	for fieldname, entries in values.items():
		for value in entries:
			doc.append(
				"assignment_attributes",
				{
					"scope_doctype": REQUISITION_DOCTYPE,
					"scope_field": fieldname,
					"attribute_value": value,
				},
			)

	doc.insert(ignore_permissions=True)
	_link(scope_name, doc.name)
	frappe.db.commit()


def _legacy_values(scope_name):
	"""``{job requisition fieldname: [value, ...]}`` from the old child tables."""
	out = {}
	for child_dt, (parentfield, column, req_field) in LEGACY_BASES.items():
		if not frappe.db.table_exists(child_dt):
			continue
		rows = frappe.db.sql(
			f"""
			SELECT `{column}` AS value FROM `tab{child_dt}`
			WHERE parent = %(parent)s AND parenttype = 'Raise Requisition Scope'
			  AND parentfield = %(parentfield)s AND IFNULL(`{column}`, '') != ''
			""",
			{"parent": scope_name, "parentfield": parentfield},
			as_dict=True,
		)
		values = [r["value"] for r in rows]
		if values:
			out[req_field] = values
	return out


def _link(scope_name, assignment_name):
	"""Point the scope record at the assignment, and tick the basis."""
	already = frappe.db.exists(
		"Raise Requisition Scope Assignment",
		{
			"parent": scope_name,
			"parenttype": "Raise Requisition Scope",
			"parentfield": "scope_of_raising_requisitions",
			"user_assignment": assignment_name,
		},
	)
	if already:
		return

	doc = frappe.get_doc("Raise Requisition Scope", scope_name)
	doc.append("scope_of_raising_requisitions", {"user_assignment": assignment_name})
	doc.scope_by_user_assignment = 1
	doc.save(ignore_permissions=True)
