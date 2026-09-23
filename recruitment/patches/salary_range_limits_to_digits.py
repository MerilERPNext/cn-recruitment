"""Salary Range Limit moved from amounts (min_amount / max_amount) to digit
counts (min_digits / max_digits). Carry each configured amount over as the
number of digits in its whole part (1000 -> 4, 500000 -> 6). The old columns
are left in place by the model sync, so they are read straight from the table.
Idempotent: rows that already have digits are left alone.
"""

import frappe


def execute():
	columns = frappe.db.get_table_columns("Salary Range Limit")
	if "min_amount" not in columns or "max_amount" not in columns:
		return

	rows = frappe.db.sql(
		"""select name, min_amount, max_amount, min_digits, max_digits
		from `tabSalary Range Limit`""",
		as_dict=True,
	)
	for row in rows:
		updates = {}
		for amount_field, digits_field in (("min_amount", "min_digits"), ("max_amount", "max_digits")):
			amount = frappe.utils.flt(row.get(amount_field))
			if amount > 0 and not frappe.utils.cint(row.get(digits_field)):
				updates[digits_field] = len(str(int(amount)))
		if updates:
			frappe.db.set_value("Salary Range Limit", row.name, updates, update_modified=False)
