"""Move the Job Offer letter choice off Recruitment Settings and onto the templates.

The offer letter used to be picked in Recruitment Settings: one default
``job_offer_document_template``, plus a ``Job Offer Document Template Mapping``
table giving a template per Employment Type. Both are gone. Selection now lives
on the Document Template itself — its ``assignment_type`` (Company, or the
attributes on the Dynamic User Assignments in ``user_assignment``) — which is
what lets a letter be scoped by Designation, Department or Location without a
release. See :mod:`recruitment.recruitment.offer_document_template`.

This patch carries existing configuration across so a site keeps sending the same
letters it sent before the change:

* Each mapped template gets **one** Dynamic User Assignment of purpose
  ``Attributes`` holding every Employment Type that mapped to it — values within
  one field OR, so a template mapped to Intern *and* Trainee still serves both.
  A template that already restricted itself to a Company keeps that restriction
  as a second attribute (fields AND), rather than losing it to the conversion.
* The single default template is left unrestricted, which is exactly what a
  default means under the new rules: it admits every offer, and any template with
  attributes outranks it because the resolver prefers the more specific match.

Finally the mapping child doctype and its rows are dropped.

Reads the old columns with raw SQL on purpose: the fields are already removed
from the Recruitment Settings JSON, so ``get_single_value`` would not return
them. Frappe does not drop columns when a field is removed, so they are still
readable — the existence checks cover a site where they genuinely are not.

Idempotent, and a no-op on a site that never configured an offer Document Template.
"""

import frappe

from nextai.nextai.doctype.dynamic_user_assignment.attributes import PURPOSE_ATTRIBUTES

SETTINGS = "Recruitment Settings"
TEMPLATE_DOCTYPE = "Document Template"
MAPPING_DOCTYPE = "Job Offer Document Template Mapping"
OFFER_DOCTYPE = "Job Offer"

EMPLOYMENT_TYPE_FIELD = "custom_employment_type"
COMPANY_FIELD = "company"


def execute():
	mapped = _legacy_mapping()
	default = _legacy_default()

	for template, employment_types in mapped.items():
		_scope_template(template, employment_types)

	if default and default not in mapped:
		_report_default(default)

	_drop_mapping_doctype()

	frappe.reload_doctype(SETTINGS)
	frappe.db.commit()


# ── Reading the old configuration ─────────────────────────────────────────────


def _legacy_mapping():
	"""``{template: [employment type, ...]}`` from the old child table."""
	if not frappe.db.table_exists(MAPPING_DOCTYPE):
		return {}

	rows = frappe.db.sql(
		f"""
		SELECT document_template, employment_type
		FROM `tab{MAPPING_DOCTYPE}`
		WHERE parenttype = %(parenttype)s
		  AND parentfield = %(parentfield)s
		  AND IFNULL(document_template, '') != ''
		  AND IFNULL(employment_type, '') != ''
		""",
		{"parenttype": SETTINGS, "parentfield": "job_offer_document_template_mapping"},
		as_dict=True,
	)

	out = {}
	for row in rows:
		types = out.setdefault(row["document_template"], [])
		if row["employment_type"] not in types:
			types.append(row["employment_type"])
	return out


def _legacy_default():
	"""The old single ``job_offer_document_template``, or None.

	Recruitment Settings is a Single, so its values live as rows in ``tabSingles``
	rather than columns on a table of its own — and a Single keeps a row for a
	field long after the field is removed from the doctype, which is what makes
	this readable at all.
	"""
	# Raw SQL rather than get_value: that appends ``ORDER BY modified``, and
	# ``tabSingles`` has no such column.
	rows = frappe.db.sql(
		"SELECT value FROM `tabSingles` WHERE doctype = %(doctype)s AND field = %(field)s LIMIT 1",
		{"doctype": SETTINGS, "field": "job_offer_document_template"},
		as_dict=False,
	)
	return (rows[0][0] if rows and rows[0] else None) or None


# ── Writing the new configuration ─────────────────────────────────────────────


def _scope_template(template, employment_types):
	"""Give ``template`` a User Assignment restricting it to ``employment_types``."""
	if not frappe.db.exists(TEMPLATE_DOCTYPE, template):
		return

	doc = frappe.get_doc(TEMPLATE_DOCTYPE, template)

	# A template already scoped to a Company must not lose that when it becomes a
	# User Assignment one — carry the company across as a second attribute so the
	# two AND together, exactly as "this company's Intern letter" always read.
	company = doc.get("company") if (doc.get("assignment_type") or "") == "Company" else None

	assignment = _ensure_assignment(template, employment_types, company)
	if not assignment:
		return

	already = any(
		row.get("dynamic_user_assignment") == assignment for row in (doc.get("user_assignment") or [])
	)
	if not already:
		doc.append("user_assignment", {"dynamic_user_assignment": assignment})

	doc.assignment_type = "User Assignment"
	# Old template rows can predate fields that are mandatory today; this patch is
	# preserving configuration, not re-validating records nobody has touched.
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)


def _ensure_assignment(template, employment_types, company=None):
	"""The Attributes assignment for ``template``, created on first run."""
	name = f"Offer Letter - {template}"[:140]
	if frappe.db.exists("Dynamic User Assignment", name):
		return name

	doc = frappe.new_doc("Dynamic User Assignment")
	doc.assignment_name = name
	doc.assignment_code = name
	doc.assignment_purpose = PURPOSE_ATTRIBUTES
	doc.target_type = "Employee"
	doc.description = (
		"Created automatically from the Employment Type mapping that used to live in "
		f"Recruitment Settings for Job Offer Document Template '{template}'."
	)
	doc.append("applicable_for_process", {"document_type": OFFER_DOCTYPE})
	# Company AND Employment Type; the Employment Types within their field OR.
	doc.attribute_match = "All fields must match (AND)"
	# The old mapping never cross-checked its values, so re-running the hierarchy
	# check now could reject configuration that is already live. Carry it across
	# as-is and let the administrator switch the check on.
	doc.validate_attribute_hierarchy = 0

	if company:
		doc.append(
			"assignment_attributes",
			{"scope_doctype": OFFER_DOCTYPE, "scope_field": COMPANY_FIELD, "attribute_value": company},
		)
	for employment_type in employment_types:
		doc.append(
			"assignment_attributes",
			{
				"scope_doctype": OFFER_DOCTYPE,
				"scope_field": EMPLOYMENT_TYPE_FIELD,
				"attribute_value": employment_type,
			},
		)

	doc.flags.ignore_permissions = True
	doc.insert(ignore_permissions=True)
	return doc.name


def _report_default(template):
	"""Say what became of the old default, and warn when the site loses its catch-all.

	Nothing is written. An empty ``assignment_type`` already means "admits every
	offer" under the new rules, so a default that carried no scoping of its own
	keeps working untouched — and any template with attributes outranks it,
	because the resolver prefers the more specific match.

	A default that was *already* restricted is the case worth shouting about. It
	was never really the catch-all; it only looked like one because Recruitment
	Settings named it. After this patch it admits only what its own assignment
	admits, so offers outside that will resolve to no letter at all and be refused
	at submit. Clearing the restriction here would be worse — it would start
	sending one company's letter to everyone — so the administrator is told
	instead of overruled.
	"""
	if not frappe.db.exists(TEMPLATE_DOCTYPE, template):
		return

	assignment_type = frappe.db.get_value(TEMPLATE_DOCTYPE, template, "assignment_type")
	if not assignment_type:
		frappe.logger("recruitment").info(
			f"Offer document template '{template}' kept as the unrestricted default."
		)
		return

	frappe.logger("recruitment").warning(
		f"Offer document template '{template}' was the Recruitment Settings default but "
		f"restricts itself by {assignment_type}. It is no longer a catch-all: offers it "
		"does not admit will have no offer letter and cannot be submitted. Add a template "
		"with no Assignment Type if a fallback letter is wanted."
	)


def _drop_mapping_doctype():
	"""Remove the child doctype and its rows; the field it filled is already gone."""
	if frappe.db.exists("DocType", MAPPING_DOCTYPE):
		frappe.delete_doc("DocType", MAPPING_DOCTYPE, force=True, ignore_permissions=True)
	if frappe.db.table_exists(MAPPING_DOCTYPE):
		# DDL after the writes above trips Frappe's implicit-commit guard: MySQL
		# commits the open transaction on its own for a DROP, so the guard refuses
		# rather than let that happen invisibly. Close the transaction here, which
		# is what it is asking for — everything before this point is the
		# configuration carry-across, and it is idempotent if the DROP then fails.
		frappe.db.commit()
		frappe.db.sql(f"DROP TABLE IF EXISTS `tab{MAPPING_DOCTYPE}`")
