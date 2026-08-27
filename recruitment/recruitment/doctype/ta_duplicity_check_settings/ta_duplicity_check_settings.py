"""TA Duplicity Check Settings — one record per company (or one for the group).

The enforcement that reads this document lives in
``recruitment.customizations.ta_duplicity_check`` (application-time rules) and
``recruitment.customizations.ta_duplicity_job_offer`` (offer-time rules).

Two things are guarded here, because both would silently mis-route enforcement
at runtime rather than fail loudly:

  * a company may not be claimed by two settings records — the lookup resolves a
    company to exactly one setting, so an overlap makes which rules apply depend
    on row order;
  * only one record may claim "All Group Companies", for the same reason.
"""

import frappe
from frappe import _
from frappe.utils import today
from frappe.model.document import Document

ALL_COMPANIES = "All Group Companies"
SPECIFIC_COMPANIES = "Specific Companies"


class TADuplicityCheckSettings(Document):
	def before_insert(self):
		if not self.created_on:
			self.created_on = today()

	def validate(self):
		self.validate_scope()
		self.validate_no_overlap()
		self.validate_override_roles()

	# ------------------------------------------------------------------
	# Scope
	# ------------------------------------------------------------------

	def validate_scope(self):
		"""Keep scope and the company table consistent.

		The company rows are cleared when the scope is the whole group — leaving
		them behind would make the child table say one thing and the scope
		another, and the lookup reads the child table.
		"""
		if not self.applicable_to_scope:
			self.applicable_to_scope = SPECIFIC_COMPANIES

		if self.applicable_to_scope == ALL_COMPANIES:
			self.applicable_to = []
		elif not self.applicable_to:
			frappe.throw(
				_("Select at least one company, or set Applicable To to {0}.").format(
					frappe.bold(ALL_COMPANIES)
				),
				title=_("Companies Required"),
			)

	def validate_no_overlap(self):
		if self.applicable_to_scope == ALL_COMPANIES:
			existing = frappe.db.get_value(
				self.doctype,
				{"applicable_to_scope": ALL_COMPANIES, "name": ["!=", self.name or ""]},
				"name",
			)
			if existing:
				frappe.throw(
					_("{0} already applies to {1}. Only one setting may cover the whole group.").format(
						frappe.bold(existing), frappe.bold(ALL_COMPANIES)
					),
					title=_("Duplicate Group Setting"),
				)
			return

		seen = set()
		for row in self.applicable_to or []:
			if not row.company:
				continue
			if row.company in seen:
				frappe.throw(
					_("{0} is listed more than once.").format(frappe.bold(row.company)),
					title=_("Duplicate Company"),
				)
			seen.add(row.company)

			clash = frappe.db.sql(
				"""
				select parent from `tabTA Duplicity Check Company`
				where company = %s and parenttype = %s and parent != %s
				limit 1
				""",
				(row.company, self.doctype, self.name or ""),
			)
			if clash:
				frappe.throw(
					_("{0} is already covered by {1}. A company may belong to only one "
					  "Duplicity Check Setting.").format(
						frappe.bold(row.company), frappe.bold(clash[0][0])
					),
					title=_("Company Already Covered"),
				)

	def validate_override_roles(self):
		"""Roles listed but the master switch off would read as an active override."""
		if self.override_roles and not self.allow_override_by_admins_and_roles:
			frappe.msgprint(
				_("Override Roles are listed but overriding is switched off — they will be ignored."),
				indicator="orange",
				alert=True,
			)
