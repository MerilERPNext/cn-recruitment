"""Carry "Is Relocation Employee" from the Job Offer to the Employee.

The Employee already has the flag (`custom_is_relocation_employee`, from
chatnext_expense_trips): it is what makes someone eligible for relocation
expenses. Whether a hire relocates is agreed at the offer, so the flag now
starts there and rides the same road as Employment Type:

    Job Offer.custom_is_relocation_employee            (fixture, ticked by HR)
      -> Employee Onboarding.custom_is_relocation_employee
                                                       (fixture; copied on creation by
                                                        candidate_portal._auto_map_offer_applicant_fields)
      -> Employee.custom_is_relocation_employee        (the mapping row added here)

`auto_fetch_fields.build_employee` also sets the Employee's "Relocation Based
On" to Date Of Joining for such a hire, without which the expense app never
opens (or closes) their relocation window.

The row goes into whichever mapping table this site reads, for the reason given
in patches/add_employment_type_to_employee.py. Idempotent.
"""

import json
import os

import frappe

from recruitment.auto_fetch_fields import parse_field_ref

FIELDNAME = "custom_is_relocation_employee"
LABEL = "Is Relocation Employee"


def _sync_fields():
	"""`bench migrate` syncs the custom/ folder only AFTER every patch has run, so
	the new fields would not exist yet. Sync the two files now (idempotent)."""
	from frappe.modules.utils import sync_customizations_for_doctype

	folder = frappe.get_app_path("recruitment", "recruitment", "custom")
	for filename in ("job_offer.json", "employee_onboarding.json"):
		with open(os.path.join(folder, filename)) as f:
			sync_customizations_for_doctype(json.load(f), folder, filename)
	for doctype in ("Job Offer", "Employee Onboarding"):
		frappe.clear_cache(doctype=doctype)


def execute():
	# The Employee end belongs to chatnext_expense_trips; without it there is
	# nothing to carry the flag to.
	if not frappe.get_meta("Employee").has_field(FIELDNAME):
		return
	_sync_fields()

	settings = frappe.get_doc("Recruitment Settings")
	uses_recruitment_tool = any(
		row.source_doctype == "Employee Onboarding" and row.target_doctype == "Employee"
		for row in settings.recruitment_tool
	)

	if uses_recruitment_tool:
		if any(
			row.source_doctype == "Employee Onboarding"
			and row.target_doctype == "Employee"
			and parse_field_ref(row.source_field) == FIELDNAME
			for row in settings.recruitment_tool
		):
			return
		settings.append(
			"recruitment_tool",
			{
				"source_doctype": "Employee Onboarding",
				"source_field": f"{LABEL} ({FIELDNAME}) [Check]",
				"target_doctype": "Employee",
				"target_field": f"{LABEL} ({FIELDNAME}) [Check]",
				# Copied once, when the Employee is created. The expense app clears
				# the flag when the relocation window lapses; re-copying on later
				# onboarding saves would switch it back on.
				"fetch_on_update": 0,
			},
		)
	else:
		if any(row.employee_onboarding == FIELDNAME for row in settings.mapping_fields):
			return
		settings.append("mapping_fields", {"employee_onboarding": FIELDNAME, "employee": FIELDNAME})

	settings.save(ignore_permissions=True)
	frappe.db.commit()
