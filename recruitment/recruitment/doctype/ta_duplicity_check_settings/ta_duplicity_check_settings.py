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

The Allow Hiring workflows are checked too, but only warned about, so a setting
can be saved while its approval flow is still being built.
"""

import frappe
from frappe import _
from frappe.utils import today
from frappe.model.document import Document

ALL_COMPANIES = "All Group Companies"
SPECIFIC_COMPANIES = "Specific Companies"

JOB_OFFER = "Job Offer"
# The Job Offer field an Allow Hiring approval flow triggers on; it is stamped
# with flow_trigger_value(). See ta_duplicity_job_offer.
APPROVAL_TRIGGER_FIELD = "custom_duplicity_approval_trigger"


def flow_trigger_value(flow):
	"""The value a Job Offer's approval trigger carries for *flow*: the name of the
	flow's FIRST version.

	A new Flow Config version is a new record ("Title (v2)") whose ``original_flow``
	points at the version it was copied from, and the copy keeps the trigger value.
	The first version's name is therefore the one value every version still matches
	— and settings records that share a flow share its trigger, while different
	flows never collide.
	"""
	seen = set()
	while flow and flow not in seen:
		seen.add(flow)
		parent = frappe.db.get_value("Flow Config", flow, "original_flow")
		if not parent:
			return flow
		flow = parent
	return flow


class TADuplicityCheckSettings(Document):
	def before_insert(self):
		if not self.created_on:
			self.created_on = today()

	def validate(self):
		self.validate_scope()
		self.validate_no_overlap()
		self.validate_override_roles()
		self.validate_allow_hiring()

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

	# ------------------------------------------------------------------
	# Allow Hiring on Duplicity Match
	# ------------------------------------------------------------------

	def validate_allow_hiring(self):
		if not self.allow_hiring_on_duplicity_match:
			return

		if not frappe.db.get_single_value("Recruitment Settings", "enable_hiring_workflow"):
			frappe.msgprint(
				_("Hiring Workflow is switched off in Recruitment Settings, so flagged candidates "
				  "will follow no hiring stages until it is enabled."),
				indicator="orange",
				alert=True,
			)

		problems = self._approval_flow_problems()
		if problems:
			frappe.msgprint(
				_("{0} will not start for flagged Job Offers until it is set up as follows:<br>{1}").format(
					frappe.bold(self.exceptional_approval_workflow), "<br>".join(problems)
				),
				title=_("Exceptional Approval Workflow Not Wired"),
				indicator="orange",
			)

	def _approval_flow_problems(self):
		"""What the linked Flow Config still needs to fire on this record's offers."""
		if not self.exceptional_approval_workflow:
			return []

		flow = frappe.db.get_value(
			"Flow Config",
			self.exceptional_approval_workflow,
			["module_transaction", "trigger_type", "doc_event_type", "doc_event_field",
			 "doc_event_field_value", "is_archived"],
			as_dict=True,
		)
		if not flow:
			return []

		expected = (
			("module_transaction", _("Module Transaction"), JOB_OFFER),
			("trigger_type", _("Trigger Type"), "Document Event"),
			("doc_event_type", _("Doc Event Type"), "on_update"),
			("doc_event_field", _("Doc Event Field"), APPROVAL_TRIGGER_FIELD),
			("doc_event_field_value", _("Value"), flow_trigger_value(self.exceptional_approval_workflow)),
		)
		problems = [
			_("{0} = {1}").format(label, frappe.bold(value))
			for field, label, value in expected
			if (flow.get(field) or "").strip() != value
		]
		if flow.is_archived:
			problems.append(_("pick the current version — this one is archived"))
		return problems
