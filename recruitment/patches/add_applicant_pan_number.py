"""Capture PAN on the candidate, and carry it to the Employee record.

The rehire check asks "have we employed this person before?", and it can only
ask that of a field both sides hold. Email and phone are the obvious keys and
both are already there — but both change. People switch jobs and lose the work
address they applied with; they change numbers. PAN does not change, which makes
it the key that still matches five years later, when it matters most.

Employee already holds ``pan_number`` (added by HRMS's India regional setup).
The gap was on the candidate side, so this adds:

  * Job Applicant.custom_pan_number — what the candidate supplies,
  * Employee Onboarding.custom_pan_number, fetched from the applicant,
  * the mapping row that copies it onto Employee.pan_number at hire.

Adding it to Job Applicant is also what puts it in the duplicity / rehire field
pickers: those read Job Applicant meta live, so the field becomes selectable as
a match key the moment it exists.

The Employee side is conditional. ``pan_number`` only exists on sites where the
India regional setup has run; on a site without it we still capture the PAN on
the candidate and simply have nowhere to carry it to, rather than seeding a
mapping row pointing at a column that isn't there.

Idempotent.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from recruitment.auto_fetch_fields import parse_field_ref

MODULE = "Recruitment"
PAN_FIELD = "custom_pan_number"
EMPLOYEE_PAN_FIELD = "pan_number"

DESCRIPTION = (
	"Ten characters — five letters, four digits, then one letter. Used to match "
	"the candidate against past and present employees."
)

CUSTOM_FIELDS = {
	"Job Applicant": [
		{
			"fieldname": PAN_FIELD,
			"fieldtype": "Data",
			"label": "PAN",
			"insert_after": "phone_number",
			"length": 10,
			"description": DESCRIPTION,
			"module": MODULE,
		},
	],
	"Employee Onboarding": [
		{
			"fieldname": PAN_FIELD,
			"fieldtype": "Data",
			"label": "PAN",
			"insert_after": "employee_name",
			"fetch_from": "job_applicant.custom_pan_number",
			"fetch_if_empty": 1,
			"length": 10,
			"description": DESCRIPTION,
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	_ensure_mapping_row()
	_backfill_onboarding()
	frappe.db.commit()
	for doctype in ("Job Applicant", "Employee Onboarding"):
		frappe.clear_cache(doctype=doctype)


def _ensure_mapping_row():
	"""Map Employee Onboarding.custom_pan_number -> Employee.pan_number.

	Appends to whichever mapping table this site reads — see
	``add_employment_type_to_employee`` for why the choice matters: adding a lone
	Recruitment Tool row to a site using the legacy Fields Mapping table would
	discard every other mapping on it.
	"""
	if not frappe.get_meta("Employee").has_field(EMPLOYEE_PAN_FIELD):
		# India regional setup hasn't run here — nothing to carry the PAN into.
		return

	settings = frappe.get_doc("Recruitment Settings")

	uses_recruitment_tool = any(
		row.source_doctype == "Employee Onboarding" and row.target_doctype == "Employee"
		for row in settings.recruitment_tool
	)

	if uses_recruitment_tool:
		for row in settings.recruitment_tool:
			if (
				row.source_doctype == "Employee Onboarding"
				and row.target_doctype == "Employee"
				and parse_field_ref(row.source_field) == PAN_FIELD
				and parse_field_ref(row.target_field) == EMPLOYEE_PAN_FIELD
			):
				return
		settings.append(
			"recruitment_tool",
			{
				"source_doctype": "Employee Onboarding",
				"source_field": f"PAN ({PAN_FIELD}) [Data]",
				"target_doctype": "Employee",
				"target_field": f"PAN Number ({EMPLOYEE_PAN_FIELD}) [Data]",
				# A PAN corrected on the Employee is the authoritative one; do not
				# overwrite it from the onboarding on every later save.
				"fetch_on_update": 0,
			},
		)
	else:
		for row in settings.mapping_fields:
			if row.employee_onboarding == PAN_FIELD and row.employee == EMPLOYEE_PAN_FIELD:
				return
		settings.append(
			"mapping_fields",
			{"employee_onboarding": PAN_FIELD, "employee": EMPLOYEE_PAN_FIELD},
		)

	settings.save(ignore_permissions=True)


def _backfill_onboarding():
	"""Employee Onboarding <- its Job Applicant.

	fetch_from only fires on save, and is skipped entirely once a document is
	submitted, so existing onboardings need the direct write.
	"""
	frappe.db.sql(
		"""
		update `tabEmployee Onboarding` eo
		join `tabJob Applicant` ja on ja.name = eo.job_applicant
		set eo.custom_pan_number = ja.custom_pan_number
		where coalesce(eo.custom_pan_number, '') = ''
		  and coalesce(ja.custom_pan_number, '') != ''
		"""
	)
