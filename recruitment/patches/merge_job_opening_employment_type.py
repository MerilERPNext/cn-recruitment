"""Collapse the two Employment Type fields on Job Opening into the standard one.

Job Opening carried both the stock `employment_type` and a hand-made
`custom_default_employment_type` ("Default Employment Type"), which read as two
competing answers to the same question on the form. Only `employment_type` was
ever wired up — the careers portal lists it and
`recruitment.customizations.job_offer.set_employment_type` falls back to it —
so the custom one was collecting values nothing downstream ever looked at.

The stock field wins and the custom one is deleted; any opening that had a type
only on the custom field has it copied across first, so no value is lost. The
custom field lives only in site databases (it was never in an app's fixtures),
so nothing recreates it after this runs.

Also seeds Job Applicant's Employment Type from the opening, which closes the
chain the offer already relied on: Job Opening -> Job Applicant -> Job Offer.
Both hops fetch only when empty, so a type chosen by hand is never overwritten.
"""
import frappe

_CUSTOM_FIELD = "Job Opening-custom_default_employment_type"
_OLD_FIELDNAME = "custom_default_employment_type"


def execute():
	_carry_values_to_standard_field()
	_delete_custom_field()
	_seed_applicant_from_opening()

	frappe.db.commit()
	for doctype in ("Job Opening", "Job Applicant"):
		frappe.clear_cache(doctype=doctype)


def _carry_values_to_standard_field():
	"""Copy the custom field's value onto `employment_type` wherever that is blank.

	Where both are filled they already agree, and the stock field is the one the
	rest of the system reads, so it is never overwritten.
	"""
	if not frappe.db.has_column("Job Opening", _OLD_FIELDNAME):
		return

	frappe.db.sql(
		"""
		update `tabJob Opening`
		set employment_type = `{old}`
		where coalesce(employment_type, '') = ''
		  and coalesce(`{old}`, '') != ''
		""".format(old=_OLD_FIELDNAME)
	)


def _delete_custom_field():
	if frappe.db.exists("Custom Field", _CUSTOM_FIELD):
		frappe.delete_doc("Custom Field", _CUSTOM_FIELD, force=1, ignore_permissions=True)

	# Any per-property override left pointing at a field that no longer exists.
	for name in frappe.get_all(
		"Property Setter",
		filters={"doc_type": "Job Opening", "field_name": _OLD_FIELDNAME},
		pluck="name",
	):
		frappe.delete_doc("Property Setter", name, force=1, ignore_permissions=True)

	_drop_from_field_order()


def _drop_from_field_order():
	"""Take the removed field out of the saved form layout.

	A `field_order` naming a field that no longer exists is tolerated by Frappe,
	but it leaves the stale name to be re-read on every later Customize Form save.
	"""
	name = "Job Opening-main-field_order"
	if not frappe.db.exists("Property Setter", name):
		return

	value = frappe.db.get_value("Property Setter", name, "value")
	try:
		order = frappe.parse_json(value)
	except Exception:
		return
	if not isinstance(order, list) or _OLD_FIELDNAME not in order:
		return

	order = [f for f in order if f != _OLD_FIELDNAME]
	frappe.db.set_value("Property Setter", name, "value", frappe.as_json(order), update_modified=False)


def _seed_applicant_from_opening():
	"""Point Job Applicant's Employment Type at the opening it was applied to.

	`fetch_if_empty` matters as much as `fetch_from` here: without it Frappe
	re-fetches on every save and would overwrite a type HR set by hand.
	"""
	name = "Job Applicant-custom_employment_type"
	if not frappe.db.exists("Custom Field", name):
		return

	field = frappe.get_doc("Custom Field", name)
	if field.fetch_from == "job_title.employment_type" and field.fetch_if_empty:
		return

	field.fetch_from = "job_title.employment_type"
	field.fetch_if_empty = 1
	field.save(ignore_permissions=True)
