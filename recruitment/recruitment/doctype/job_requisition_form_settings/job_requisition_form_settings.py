# Copyright (c) 2026, NextAI and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class JobRequisitionFormSettings(Document):
	def validate(self):
		self.drop_duplicate_field_rows()

	def drop_duplicate_field_rows(self):
		"""Keep one row per (applies_to, fieldname).

		A field can only sit in one tab/section, but the child table has no
		uniqueness constraint and the Advanced raw grid lets rows be added by
		hand. A duplicate is not a harmless extra: the builder would render the
		field in two places and the API would pick one of them, so what HR sees
		configured is not what the form serves.

		The row with the lowest `order` wins — the same rule
		`_load_form_overrides` applies — so deduping here never moves a field.
		"""
		rows = self.get("field_overrides") or []
		if not rows:
			return

		def order_of(row):
			try:
				return int(row.get("order") or 0) or 10**9
			except (TypeError, ValueError):
				return 10**9

		kept = {}
		for row in rows:
			if not row.get("fieldname"):
				continue
			key = (row.get("applies_to") or "Parent", row.get("fieldname"))
			winner = kept.get(key)
			if winner is None or order_of(row) < order_of(winner):
				kept[key] = row

		if len(kept) == len(rows):
			return

		dropped = [
			f"{r.get('applies_to') or 'Parent'} · {r.get('fieldname')}"
			for r in rows
			if r not in kept.values()
		]
		# Renumber so the surviving rows keep a clean ascending sequence.
		survivors = sorted(kept.values(), key=order_of)
		self.set("field_overrides", [])
		for index, row in enumerate(survivors, start=1):
			row.order = index * 10
			row.idx = index
			self.append("field_overrides", row)

		frappe.msgprint(
			_("Removed {0} duplicate field row(s): {1}").format(
				len(dropped), ", ".join(sorted(set(dropped))[:10])
			),
			indicator="orange",
			alert=True,
		)
