"""Do Not Rehire on the Employee record.

The flag has only ever lived on Employee Separation
(``custom_mark_do_not_rehire``), which misses the person HR wants to bar but who
has no separation record — a contractor, an absconder, someone whose exit was
processed outside the system.

Employee was given ``donot_rehire`` / ``donot_rehire_comments``, but both are
VIRTUAL fields: a virtual field has no column, so it stores nothing when it is
filled in and cannot be selected or filtered in a query. The rehire check reads
the employee pool with ``frappe.get_all``, so it could never see them. They are
hidden here in favour of two real fields, and left in place rather than deleted
because a site may have wired something to their names.

A Check costs one int column. Employee already carries 253 non-virtual custom
fields; the virtual convention on that doctype is for the bulk catalogue fields,
not for a flag that has to be queried.

Backfill: every employee whose latest separation carries the flag is marked, so
the Employee record and the separation agree from the moment the field exists.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"
EMPLOYEE = "Employee"
EMPLOYEE_SEPARATION = "Employee Separation"

FLAG = "custom_do_not_rehire"
COMMENT = "custom_do_not_rehire_comment"

# The unusable virtual pair this replaces.
LEGACY_FIELDS = ("donot_rehire", "donot_rehire_comments")

CUSTOM_FIELDS = {
	EMPLOYEE: [
		{
			"fieldname": FLAG,
			"fieldtype": "Check",
			"label": "Do Not Rehire",
			"insert_after": "relieving_date",
			"no_copy": 1,
			"description": (
				"Bars this person from being hired again. What actually happens to "
				"their next job offer — blocked, allowed, or sent for exceptional "
				"approval — is set per company on TA Duplicity Check Settings."
			),
			"module": MODULE,
		},
		{
			"fieldname": COMMENT,
			"fieldtype": "Small Text",
			"label": "Do Not Rehire Reason",
			"insert_after": FLAG,
			"depends_on": FLAG,
			"no_copy": 1,
			"description": "Shown to the recruiter and to the approver of an exceptional offer.",
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	_hide_legacy_virtual_fields()
	_backfill_from_separations()

	frappe.db.commit()
	frappe.clear_cache(doctype=EMPLOYEE)


def _hide_legacy_virtual_fields():
	"""Hide the virtual pair, so the form carries one Do Not Rehire, not three.

	Only ever touches a field that is still virtual: if a site has since turned
	one into a real, populated field, hiding it would take working data off the
	form.
	"""
	for fieldname in LEGACY_FIELDS:
		name = frappe.db.get_value(
			"Custom Field", {"dt": EMPLOYEE, "fieldname": fieldname, "is_virtual": 1}
		)
		if not name:
			continue
		frappe.db.set_value("Custom Field", name, {
			"hidden": 1,
			"description": f"Replaced by Do Not Rehire ({FLAG}). This field is virtual — it stores nothing.",
		})


def _backfill_from_separations():
	"""Mark every employee already flagged on a separation."""
	if not frappe.get_meta(EMPLOYEE_SEPARATION).has_field("custom_mark_do_not_rehire"):
		return

	rows = frappe.get_all(
		EMPLOYEE_SEPARATION,
		filters={"custom_mark_do_not_rehire": 1, "docstatus": ["<", 2]},
		fields=["employee", "custom_not_to_be_rehired_comment"],
		order_by="modified asc",
		ignore_permissions=True,
	)
	for row in rows:
		if not row.employee or not frappe.db.exists(EMPLOYEE, row.employee):
			continue
		values = {FLAG: 1}
		if row.custom_not_to_be_rehired_comment:
			values[COMMENT] = row.custom_not_to_be_rehired_comment
		frappe.db.set_value(EMPLOYEE, row.employee, values, update_modified=False)
