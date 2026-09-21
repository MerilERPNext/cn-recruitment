# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Config record behind one New Hire form.

The form itself renders from the Employee DocType meta — the record it creates
IS the Employee, held at ``status = "Pending"`` until onboarding completes. This
record only stores *overrides*: which Employee fields appear, under which tab and
section, in what order, and which are mandatory. A field with no override row
follows the Employee meta exactly.

Several profiles can exist so a Freelancer intake and a Permanent intake are not
forced to be the same form; :func:`recruitment.api.new_hire.resolve_form` picks
between them on company + employment type, falling back to the default.
"""

import frappe
from frappe import _
from frappe.model.document import Document


class NewHireForm(Document):
	def validate(self):
		self.validate_single_default()
		self.validate_fields_exist()
		self.apply_source_mandatory_fields()

	def apply_source_mandatory_fields(self):
		"""Keep every field made mandatory at a hiring source on the form, Required.

		Here as well as in the settings hook so a new form starts with them, and a
		row the admin removed or made optional comes straight back on save.
		"""
		from recruitment.recruitment.new_hire_source_fields import apply_to_form, describe

		line = describe(apply_to_form(self))
		if line and not self.flags.source_fields_synced:
			frappe.msgprint(
				_("Mandatory in Job Applicant Profile Settings for a hiring source — {0}.").format(line),
				alert=True,
			)

	def validate_single_default(self):
		"""At most one enabled default, so form resolution is never ambiguous."""
		if not self.is_default or self.disabled:
			return
		clash = frappe.db.get_value(
			"New Hire Form",
			{"is_default": 1, "disabled": 0, "name": ("!=", self.name)},
			"name",
		)
		if clash:
			frappe.throw(
				_("{0} is already the default New Hire Form. Clear it there first.").format(
					frappe.bold(clash)
				)
			)

	def validate_fields_exist(self):
		"""Reject a row naming a field Employee does not have.

		A stale row is not harmless: with `Show Only Configured Fields` on it is
		the allowlist, so a typo silently drops a field from the form rather than
		erroring anywhere the user would notice.
		"""
		meta = frappe.get_meta("Employee")
		for row in self.field_overrides or []:
			fieldname = (row.fieldname or "").strip()
			if fieldname and not meta.has_field(fieldname):
				frappe.throw(
					_("Row {0}: Employee has no field called {1}.").format(
						row.idx, frappe.bold(fieldname)
					)
				)
