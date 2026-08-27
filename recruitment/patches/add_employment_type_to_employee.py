"""Carry the Employment Type tag from the offer, through onboarding, to the Employee.

The tag a requisition is raised with — Freelancer, Trainee, Permanent — already
rides most of the pipeline on its own:

    Job Requisition.custom_employment_type_link
      -> Job Opening.employment_type           (the requisition -> opening mapper)
      -> Job Applicant.custom_employment_type  (fetch_from job_title.employment_type)
      -> Job Offer.custom_employment_type      (fetch_from, then set_employment_type)

and then stops dead. Employee Onboarding has no employment-type field at all, so
the tag never crosses the last hop and the record of the person who was hired
does not say what they were hired as. Anyone asking "which of our people are
freelancers?" has to go back through the offer to find out.

This adds the missing middle and joins it up:

  * Employee Onboarding.custom_employment_type, fetched from its Job Offer,
  * the Recruitment Settings mapping row that copies it onto the Employee when
    the Employee record is created.

The Employee end is NOT created here. ERPNext 15 ships no employment-type field,
but sites commonly add one — this one has ``Employee.employment_type`` as a
Custom Field, labelled "Employee Type". Creating our own alongside it would
leave two employment-type fields on Employee disagreeing with each other, so we
target whatever the site already has and only add a field when there is none.

The mapping row goes into whichever table this site reads. ``build_employee``
uses the Recruitment Tool table and falls back to the legacy Fields Mapping
table ONLY when Recruitment Tool holds nothing for this doctype pair (see
``auto_fetch_fields.build_employee``). So on a site still using the legacy
table, adding a single Recruitment Tool row would make the map truthy and
silently discard every other mapping on it. We append to the table already in
use instead.

Idempotent — create_custom_fields updates a field that already exists, the
mapping row is added only when absent, and the backfills write only blanks.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from recruitment.auto_fetch_fields import parse_field_ref

MODULE = "Recruitment"
FIELDNAME = "custom_employment_type"
LABEL = "Employment Type"

# Employee field names we will map onto, best first. The site's own field wins;
# ours is only created when it has none.
EMPLOYEE_CANDIDATES = ("employment_type", "custom_employment_type")

ONBOARDING_FIELD = {
	"Employee Onboarding": [
		{
			"fieldname": FIELDNAME,
			"fieldtype": "Link",
			"label": LABEL,
			"options": "Employment Type",
			"insert_after": "employee_grade",
			# The offer is where the type is finally settled — it is the document
			# the candidate accepted. fetch_if_empty so HR can still correct it.
			"fetch_from": "job_offer.custom_employment_type",
			"fetch_if_empty": 1,
			"description": (
				"Carried from the accepted Job Offer, and copied onto the Employee "
				"when the Employee record is created."
			),
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(ONBOARDING_FIELD, ignore_validate=True)
	employee_field = _resolve_employee_field()
	_ensure_mapping_row(employee_field)
	_backfill_onboarding()
	_backfill_employees(employee_field)
	frappe.db.commit()
	for doctype in ("Employee Onboarding", "Employee"):
		frappe.clear_cache(doctype=doctype)


def _resolve_employee_field():
	"""The Employee field the tag lands on — the site's own where it has one."""
	meta = frappe.get_meta("Employee")
	for fieldname in EMPLOYEE_CANDIDATES:
		if meta.has_field(fieldname):
			return fieldname

	create_custom_fields(
		{
			"Employee": [
				{
					"fieldname": FIELDNAME,
					"fieldtype": "Link",
					"label": LABEL,
					"options": "Employment Type",
					"insert_after": "designation",
					"description": "Set from Employee Onboarding when the employee is created.",
					"module": MODULE,
				},
			]
		},
		ignore_validate=True,
	)
	return FIELDNAME


def _ensure_mapping_row(employee_field):
	"""Map Employee Onboarding.custom_employment_type -> the Employee field.

	Appends to whichever mapping table this site reads — see the module docstring
	for why the choice matters.
	"""
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
				and parse_field_ref(row.source_field) == FIELDNAME
				and parse_field_ref(row.target_field) == employee_field
			):
				return
		target_label = frappe.get_meta("Employee").get_label(employee_field) or LABEL
		settings.append(
			"recruitment_tool",
			{
				"source_doctype": "Employee Onboarding",
				"source_field": f"{LABEL} ({FIELDNAME}) [Link]",
				"target_doctype": "Employee",
				"target_field": f"{target_label} ({employee_field}) [Link]",
				# Employment type is agreed once, at the offer. Re-copying it on
				# every later onboarding save would overwrite an HR correction
				# made on the Employee itself.
				"fetch_on_update": 0,
			},
		)
	else:
		# Legacy rows are read as bare fieldnames, not picker strings.
		for row in settings.mapping_fields:
			if row.employee_onboarding == FIELDNAME and row.employee == employee_field:
				return
		settings.append(
			"mapping_fields",
			{"employee_onboarding": FIELDNAME, "employee": employee_field},
		)

	settings.save(ignore_permissions=True)


def _backfill_onboarding():
	"""Employee Onboarding <- its Job Offer.

	fetch_from only fires on save, so every onboarding created before this patch
	has nothing on it. Submitted onboardings are included deliberately: fetch_from
	is skipped once a document is submitted, so a direct write is the only way
	they ever get the type.
	"""
	frappe.db.sql(
		"""
		update `tabEmployee Onboarding` eo
		join `tabJob Offer` jo on jo.name = eo.job_offer
		set eo.custom_employment_type = jo.custom_employment_type
		where coalesce(eo.custom_employment_type, '') = ''
		  and coalesce(jo.custom_employment_type, '') != ''
		"""
	)


def _backfill_employees(employee_field):
	"""Employee <- the onboarding they were created from.

	Only blanks are written: an employment type already on an Employee was put
	there by someone and is not ours to overwrite. Anyone added to Employee
	directly has no onboarding to read a type from and is left alone rather than
	guessed at.
	"""
	frappe.db.sql(
		f"""
		update `tabEmployee` e
		join `tabEmployee Onboarding` eo on eo.employee = e.name
		set e.`{employee_field}` = eo.custom_employment_type
		where coalesce(e.`{employee_field}`, '') = ''
		  and coalesce(eo.custom_employment_type, '') != ''
		"""
	)
