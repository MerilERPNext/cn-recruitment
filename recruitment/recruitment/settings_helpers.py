"""Reading Single-doctype settings without mistaking "never saved" for "off"."""

import frappe

# Sentinel: a stored value of None is a real answer, so it cannot double as "absent".
_ABSENT = object()


def single_value_or_default(doctype, fieldname, default):
	"""The stored value of a Single's field, or ``default`` when it has none.

	``frappe.db.get_single_value`` casts through the fieldtype, so a Check whose
	row was never written comes back as ``0`` — identical to someone deliberately
	unticking it. A feature toggle that ships on would therefore be silently off on
	every site until an admin happens to open the settings form and save it.

	The tabSingles row is checked directly because its absence is the only honest
	signal of "no answer stored".
	"""
	row = frappe.db.sql(
		"select `value` from `tabSingles` where `doctype` = %s and `field` = %s limit 1",
		(doctype, fieldname),
	)
	if not row:
		return default
	stored = frappe.db.get_single_value(doctype, fieldname)
	return default if stored is _ABSENT else stored
