"""Give a Trainee offer its own joining date, separate from Expected DOJ.

A Trainee is sent two letters — the Management Trainee Offer Letter and the
Permanent Employee Offer Letter (see Recruitment Settings' print-format
mapping) — and the two start on different days: the traineeship begins first,
the permanent role begins when it converts. Both letters were printing
``custom_expected_doj``, so whichever date HR entered was wrong on one of them.

``custom_expected_doj`` keeps its meaning: the date onboarding, the joining kit
and the permanent letter plan around. ``custom_trainee_doj`` is the new one, the
day the traineeship itself starts, and it is what the Management Trainee letter
prints.

``custom_employment_type_name`` exists only so the new field can be shown for
Trainees and hidden for everyone else. ``Employment Type`` is autonamed
``EMPTYPE_.#``, so its link value is an opaque id that says nothing about which
type it is; a ``depends_on`` written against that id would be a different string
on every site. Mirroring the readable name onto the offer keeps the rule
site-independent.

Idempotent — create_custom_fields updates a field that already exists, and the
backfill only writes rows that have nothing on them yet.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"
TRAINEE = "Trainee"

CUSTOM_FIELDS = {
	"Job Offer": [
		{
			"fieldname": "custom_employment_type_name",
			"fieldtype": "Data",
			"label": "Employment Type Name",
			"insert_after": "custom_employment_type",
			"fetch_from": "custom_employment_type.employee_type_name",
			"read_only": 1,
			"hidden": 1,
			"description": (
				"Mirrors the Employment Type's readable name so form rules can test "
				"it. Employment Type is autonamed, so its link value is an opaque id."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_trainee_doj",
			"fieldtype": "Date",
			"label": "Management Trainee Joining Date",
			"insert_after": "custom_expected_doj",
			"depends_on": 'eval:doc.custom_employment_type_name=="{0}"'.format(TRAINEE),
			"description": (
				"The day the traineeship starts — printed on the Management Trainee "
				"Offer Letter. Expected DOJ stays the date the permanent offer letter "
				"and onboarding are planned around."
			),
			"module": MODULE,
		},
	]
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	_place_on_form()
	_backfill_type_name()
	_backfill_trainee_doj()
	frappe.db.commit()
	frappe.clear_cache(doctype="Job Offer")


def _has_columns(doctype, *columns):
	"""Whether every one of `columns` exists on `doctype`'s table.

	The backfills below are raw SQL over Custom Field columns, and custom fields
	shipped in an app's `custom/*.json` are created by `sync_customizations()` —
	which runs AFTER patches in a migrate (see frappe/migrate.py). On a site that
	has not had those fields created yet the column simply is not there and the
	UPDATE dies with "Unknown column".

	Skipping loses nothing: a column that does not exist holds no data to carry
	across, and `fetch_from` fills the field from the next save onward.
	"""
	return all(frappe.db.has_column(doctype, column) for column in columns)


def _place_on_form():
	"""Put the new fields into the saved form layout, next to their anchors.

	Job Offer has been through Customize Form, so a `field_order` Property Setter
	decides the layout and a field missing from it is appended after everything
	listed — the Trainee joining date would sit adrift instead of beside Expected
	DOJ. `insert_after` alone does not cover this.
	"""
	name = "Job Offer-main-field_order"
	if not frappe.db.exists("Property Setter", name):
		return

	try:
		order = frappe.parse_json(frappe.db.get_value("Property Setter", name, "value"))
	except Exception:
		return
	if not isinstance(order, list):
		return

	changed = False
	for anchor, fieldname in (
		("custom_employment_type", "custom_employment_type_name"),
		("custom_expected_doj", "custom_trainee_doj"),
	):
		if fieldname in order or anchor not in order:
			continue
		order.insert(order.index(anchor) + 1, fieldname)
		changed = True

	if changed:
		frappe.db.set_value("Property Setter", name, "value", frappe.as_json(order), update_modified=False)


def _backfill_type_name():
	"""Fill the mirror on offers that already exist.

	`fetch_from` only runs when a document is saved, and submitted offers are not
	going to be saved again — without this their Trainee joining date would stay
	hidden on the form.
	"""
	if not _has_columns("Job Offer", "custom_employment_type", "custom_employment_type_name"):
		return

	frappe.db.sql(
		"""
		update `tabJob Offer` jo
		join `tabEmployment Type` et on et.name = jo.custom_employment_type
		set jo.custom_employment_type_name = et.employee_type_name
		where coalesce(jo.custom_employment_type_name, '') = ''
		"""
	)


def _backfill_trainee_doj():
	"""Seed existing Trainee offers from the date their letters already printed.

	The Management Trainee letter used to render `custom_expected_doj`; copying it
	across means an offer sent before this patch still reprints exactly as it was
	issued. New offers get the date typed in on the form.
	"""
	if not _has_columns(
		"Job Offer", "custom_trainee_doj", "custom_expected_doj", "custom_employment_type_name"
	):
		return

	frappe.db.sql(
		"""
		update `tabJob Offer`
		set custom_trainee_doj = custom_expected_doj
		where custom_trainee_doj is null
		  and custom_expected_doj is not null
		  and custom_employment_type_name = %s
		""",
		TRAINEE,
	)
