"""Keep the candidate's name in clean parts, and show the full name.

The campus application overwrote ``applicant_name`` — the field labelled "Applicant
First Name" — with the candidate's WHOLE name, so that lists showed something
complete. Every screen that then joined first + surname rendered the surname twice:
"Neha Iyer Iyer", "yaswanth kumar kumar".

This patch:
  1. adds ``custom_applicant_middle_name`` (the TPO already collects a middle name on
     Candidate Registration; Job Applicant had nowhere to put it),
  2. adds the derived ``custom_full_name`` and makes it the doctype's title, so the
     list view, breadcrumb and link previews show the whole name while the parts stay
     clean,
  3. repairs the rows already written: where the first-name box ends with the stored
     surname, that surname is taken back out, and anything between becomes the middle
     name.

Idempotent: rows whose first name no longer contains the surname are left alone.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from recruitment.api.applicant_name import (
	FIRST_FIELD, FULL_FIELD, LAST_FIELD, MIDDLE_FIELD, full_name,
)

MODULE = "Recruitment"
APPLICANT = "Job Applicant"
TITLE_PROPERTY_SETTER = "Job Applicant-title_field"

CUSTOM_FIELDS = {
	APPLICANT: [
		{
			"fieldname": MIDDLE_FIELD,
			"fieldtype": "Data",
			"label": "Applicant Middle Name",
			"insert_after": FIRST_FIELD,
			"module": MODULE,
			"description": "Optional. Kept separate so the full name can be rebuilt.",
		},
		{
			"fieldname": FULL_FIELD,
			"fieldtype": "Data",
			"label": "Full Name",
			"insert_after": LAST_FIELD,
			"read_only": 1,
			"no_copy": 1,
			"in_global_search": 1,
			"module": MODULE,
			"description": (
				"First + middle + surname, rebuilt on every save. This is the name "
				"shown in lists and links — edit the parts, not this."
			),
		},
	]
}


def _add_fields():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)


def _make_full_name_the_title():
	"""Title = the full name, so nothing has to join the parts just to show a name."""
	frappe.make_property_setter(
		{
			"doctype": APPLICANT,
			"doctype_or_field": "DocType",
			"property": "title_field",
			"value": FULL_FIELD,
			"property_type": "Data",
		},
		is_system_generated=False,
	)
	frappe.make_property_setter(
		{
			"doctype": APPLICANT,
			"doctype_or_field": "DocType",
			"property": "show_title_field_in_link",
			"value": "1",
			"property_type": "Check",
		},
		is_system_generated=False,
	)


def _repair_rows():
	"""Take the surname back out of the first-name box, and fill the derived name.

	Written with db.set_value: these are thousands-of-rows-safe field writes that must
	not fire validations or notifications on historical applicants.
	"""
	rows = frappe.get_all(
		APPLICANT,
		fields=["name", FIRST_FIELD, MIDDLE_FIELD, LAST_FIELD],
		limit_page_length=0,
	)
	repaired = filled = 0
	for row in rows:
		first = " ".join((row.get(FIRST_FIELD) or "").split())
		middle = " ".join((row.get(MIDDLE_FIELD) or "").split())
		last = " ".join((row.get(LAST_FIELD) or "").split())
		updates = {}

		# "Yashwanth Kumar Dasari" in the first-name box + "Dasari" as the surname:
		# strip the trailing surname, and promote whatever is left over to the middle
		# name. Only a TRAILING match is stripped — a first name that merely contains
		# the surname's letters is left alone.
		if last and first.lower().endswith(" " + last.lower()):
			remainder = first[: -(len(last) + 1)].strip()
			parts = remainder.split()
			if parts:
				updates[FIRST_FIELD] = parts[0]
				if len(parts) > 1 and not middle:
					middle = " ".join(parts[1:])
					updates[MIDDLE_FIELD] = middle
				first = parts[0]
				repaired += 1

		derived = full_name(first, middle, last) or first
		if derived and derived != (row.get(FULL_FIELD) if FULL_FIELD in row else None):
			updates[FULL_FIELD] = derived
			filled += 1

		if updates:
			frappe.db.set_value(APPLICANT, row.name, updates, update_modified=False)

	return repaired, filled


def execute():
	_add_fields()
	_make_full_name_the_title()
	frappe.clear_cache(doctype=APPLICANT)

	repaired, filled = _repair_rows()
	frappe.db.commit()
	print(f"Job Applicant names: {repaired} first-name field(s) un-merged, "
	      f"{filled} full name(s) written")
