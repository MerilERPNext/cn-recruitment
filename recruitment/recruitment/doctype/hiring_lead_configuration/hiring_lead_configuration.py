# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Hiring Lead Configuration
==========================

Decides which Employees are offerable as a Job Requisition's **Hiring lead**, and
which Users as its **Assign to Recruiter**. Two independent matching modes, unioned:

* **Company Wise** — ``applicable_companies``. The configuration applies when the
  requisition's ``company`` is one of them.

* **Assignment Framework** — ``applicable_assignments`` names User Assignments of
  purpose **Attributes**. Each carries the values it permits for named fields of a
  Job Requisition — Company, Department, Designation, Location, or any other Link
  field. The configuration applies when the requisition **satisfies** them.

  This basis used to membership-test the assignments instead: it read their
  ``assigned_users`` and asked whether the requisition's Hiring Manager was among
  them. That answered "who is this assignment about", which is the wrong question
  here — the configuration already names its hiring leads explicitly, so what was
  missing was *when* they apply. Attributes answer exactly that, and scoping by a
  fourth field becomes a configuration change rather than a release. See
  ``nextai.nextai.doctype.dynamic_user_assignment.attributes``.

  Note an Attributes assignment resolves to **nobody**, so the old membership test
  would turn every attribute-scoped configuration into a blanket denial. The
  picker (:func:`assignment_query`) offers Attributes assignments only, which is
  what stops the two kinds being mixed up.

**Unconfigured ⇒ unrestricted.** When no configuration matches either way the
resolvers return empty sets and every caller falls back to the full Employee /
User list. Requisition creation is never blocked by this doctype.

Three-valued attribute results are collapsed deliberately: a *deferred* match
(``None`` — the requisition has not filled the field an assignment restricts yet)
counts as **no match**, so an empty form offers everyone and the list narrows as
Company / Department / Designation are filled. Deferring to "restricted" instead
would close the pickers before the user could possibly satisfy them.
"""

import json

import frappe
from frappe.model.document import Document

from nextai.nextai.doctype.dynamic_user_assignment.attributes import request_index

CONFIG_DOCTYPE = "Hiring Lead Configuration"
ASSIGNMENT_CHILD = "Hiring Lead Configuration Assignment"
ASSIGNMENT_FIELD = "applicable_assignments"
ASSIGNMENT_TYPE_ATTRIBUTES = "Assignment Framework"
ASSIGNMENT_TYPE_COMPANY = "Company Wise"

# The document an Assignment Framework configuration's attributes are matched
# against. Attributes name fields on this doctype, so scoping by a new field
# (Location, Division, Grade) ships no code.
REQUISITION_DOCTYPE = "Job Requisition"


class HiringLeadConfiguration(Document):
	pass


def _resolve_config_users(parents):
	"""Return ``(hiring_lead_users, recruiter_users)`` for the given Hiring Lead
	Configuration ``parents`` (a list of config names).

	Hiring leads / recruiters are selected as Employees; each is resolved to its
	linked system User (``user_id``) so callers keep working in terms of Users.
	Employees without a linked User simply drop out (they can't act in Desk).
	Shared by the Company Wise and Assignment Framework resolvers.
	"""
	if not parents:
		return set(), set()

	def _users(parentfield):
		employees = frappe.get_all(
			"Hiring Lead Configuration Employee",
			filters={
				"parenttype": CONFIG_DOCTYPE,
				"parentfield": parentfield,
				"parent": ["in", parents],
			},
			pluck="employee",
		)
		if not employees:
			return set()
		return set(frappe.get_all(
			"Employee",
			filters={"name": ["in", employees], "user_id": ["is", "set"]},
			pluck="user_id",
		))

	return _users("hiring_leads"), _users("recruiters")


def get_config_users_for_company(company):
	"""Return ``(hiring_lead_users, recruiter_users)`` — the union of Users (resolved
	from the configured Employees' linked ``user_id``) across every **Company Wise**
	Hiring Lead Configuration whose Applicable Companies include ``company``.

	Returns two empty sets when ``company`` is falsy or nothing matches, so callers
	can fall back to unrestricted behaviour (the requisition flow is never blocked).

	Assignment Framework configurations are matched separately via
	:func:`get_config_users_for_attributes`.
	"""
	if not company:
		return set(), set()

	# Company Wise configs that list this company in `applicable_companies`.
	parents = list(set(frappe.get_all(
		"Hiring Lead Configuration Company",
		filters={
			"parenttype": CONFIG_DOCTYPE,
			"parentfield": "applicable_companies",
			"company": company,
		},
		pluck="parent",
	)))
	if not parents:
		return set(), set()

	# Defensive: keep only configs that are actually Company Wise.
	parents = frappe.get_all(
		CONFIG_DOCTYPE,
		filters={"name": ["in", parents], "assignment_type": ASSIGNMENT_TYPE_COMPANY},
		pluck="name",
	)
	return _resolve_config_users(parents)


def _assignment_framework_configs():
	"""``{config: [dynamic_user_assignment, ...]}`` for every Assignment Framework
	configuration on the site.

	One query for all of them. These are a handful of administrator-authored
	records, so reading the set and evaluating in Python beats a round trip per
	candidate — and the attribute rows they point at are batched into a single
	query and cached by ``AttributeIndex`` regardless of how many configs cite them.

	Read through ``frappe.qb`` rather than ``frappe.get_all`` for the reasons
	documented on ``raise_requisition_scope._grouped_child``: ``DatabaseQuery``
	strips columns whose name contains ``_assign``, and reading a child doctype
	without a ``parent_doctype`` is increasingly restricted.
	"""
	parent = frappe.qb.DocType(CONFIG_DOCTYPE)
	child = frappe.qb.DocType(ASSIGNMENT_CHILD)

	rows = (
		frappe.qb.from_(parent)
		.inner_join(child)
		.on(
			(child.parent == parent.name)
			& (child.parenttype == CONFIG_DOCTYPE)
			& (child.parentfield == ASSIGNMENT_FIELD)
		)
		.select(parent.name.as_("config"), child.dynamic_user_assignment.as_("dua"))
		.where(parent.assignment_type == ASSIGNMENT_TYPE_ATTRIBUTES)
	).run(as_dict=True)

	configs = {}
	for r in rows:
		if r["dua"]:
			configs.setdefault(r["config"], []).append(r["dua"])
	return configs


def get_config_users_for_attributes(context=None):
	"""Return ``(hiring_lead_users, recruiter_users)`` — the union of Users across
	every **Assignment Framework** Hiring Lead Configuration whose User Assignments
	admit ``context``.

	``context`` is a plain dict of Job Requisition field values — whatever the form
	has filled so far, or the requisition document itself. Nothing here names a
	field: the assignments' attribute rows do, and :meth:`AttributeIndex.satisfied`
	reads ``context[row.scope_field]`` itself.

	A configuration's assignments OR together (``combine="any"``), matching how its
	Table MultiSelect reads. Within one assignment, fields combine per its own
	``attribute_match`` and values within a field always OR.

	Only a definite ``True`` counts as a match — a *deferred* ``None`` (the context
	has not filled a field the assignment restricts) does not, so an empty form
	stays unrestricted rather than being closed before it can be satisfied.

	Assignments that restrict **nothing** about a Job Requisition are dropped
	before the match rather than trusted. ``satisfied`` answers ``True`` for an
	assignment with no attributes for the doctype — "unrestricted, so nothing here
	objects", which is the right answer for a deny-by-default gate and the wrong
	one here. This basis *selects*: an assignment saying nothing about
	requisitions is no reason to apply a configuration, and treating it as one
	would make a configuration pointing at a People assignment (or at attributes
	written for some other document) apply to every requisition ever raised. A
	configuration left with no scoping assignment therefore matches nothing, which
	the picker keeps administrators out of in the first place.

	Returns two empty sets when nothing matches, preserving the unrestricted
	fallback.
	"""
	configs = _assignment_framework_configs()
	if not configs:
		return set(), set()

	doc = {k: v for k, v in (context or {}).items() if v}
	doc["doctype"] = REQUISITION_DOCTYPE

	index = request_index()
	index.add({dua for duas in configs.values() for dua in duas})

	matched = []
	for config, duas in configs.items():
		# `allowed_values` is empty exactly when the assignment names no field of
		# this doctype. It reads the same batch the match will, so this costs a
		# dict lookup, not a query.
		scoping = [d for d in duas if index.allowed_values([d], REQUISITION_DOCTYPE)]
		if not scoping:
			continue
		if index.satisfied(scoping, doc, combine="any") is True:
			matched.append(config)

	return _resolve_config_users(matched)


def _as_context(context):
	"""Whitelisted args arrive as a JSON string from the client."""
	if not context:
		return {}
	if isinstance(context, str):
		try:
			context = json.loads(context)
		except ValueError:
			return {}
	return dict(context) if isinstance(context, dict) else {}


def get_config_users(company=None, employee=None, context=None):
	"""Return ``(hiring_lead_users, recruiter_users)`` combining both matching modes:
	Company Wise (by ``company``) and Assignment Framework (by the attributes the
	requisition ``context`` satisfies).

	``company`` and ``employee`` fold into the attribute context as the Job
	Requisition fields they are — ``company`` and ``requested_by``, both Link fields
	and both scopeable — so a caller that only has those two keeps working and an
	assignment may legitimately scope by either. Explicit ``context`` values win.

	The two result sets are unioned, so a caller that supplies both keys sees every
	configured user that applies through either path. Empty sets when nothing
	matches, preserving the unrestricted fallback."""
	leads_c, recruiters_c = get_config_users_for_company(company)

	ctx = _as_context(context)
	if company:
		ctx.setdefault("company", company)
	if employee:
		ctx.setdefault("requested_by", employee)
	leads_a, recruiters_a = get_config_users_for_attributes(ctx)

	return leads_c | leads_a, recruiters_c | recruiters_a


def is_hiring_lead_for_company(company, user=None):
	"""True when `user` (default: current session user) is a configured Hiring Lead
	for `company` via a Company Wise Hiring Lead Configuration. Returns False when
	`company` is empty or no config matches — so permission gates impose NO
	restriction in that case (never blocking users outside the configuration).

	Deliberately Company Wise only: the permission gates in
	``customizations/hiring_lead_permissions`` ask "is this user a hiring lead for
	this document's company", and a document being edited carries no requisition
	context for attributes to match against."""
	if not company:
		return False
	user = user or frappe.session.user
	leads, _ = get_config_users_for_company(company)
	return user in leads


@frappe.whitelist()
def get_hiring_lead_config_users(company=None, employee=None, context=None):
	"""Form-script friendly view of get_config_users:
	``{"hiring_leads": [user, ...], "recruiters": [user, ...]}``.

	Matches Company Wise configs by `company` and Assignment Framework configs by
	the attributes the requisition satisfies. `context` is the requisition's field
	values as a dict (or a JSON string of one) — pass whatever the form has filled;
	unfilled fields simply defer. Empty lists when no configuration matches."""
	leads, recruiters = get_config_users(company, employee, context)
	return {"hiring_leads": sorted(leads), "recruiters": sorted(recruiters)}


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def assignment_query(doctype, txt, searchfield, start, page_len, filters):
	"""Picker for ``applicable_assignments`` — **Attributes** User Assignments
	tagged (via ``applicable_for_process``) for Job Requisition.

	Both filters matter. A *People* assignment carries no attribute values, so it
	would look like a scope while restricting nothing and, worse, resolve to nobody
	if anything still membership-tested it. An assignment tagged for a different
	process carries values for *that* document's fields, which say nothing about a
	requisition. Assignments tagged for nothing are still offered — untagged
	conventionally means "applies anywhere", and excluding them would hide
	legitimate configuration.

	Shares ``raise_requisition_scope._assignment_query`` rather than restating its
	SQL: the "untagged means anywhere" rule is a semantic both pickers must agree
	on, and two copies of it would drift. Imported locally to keep this module's
	import graph to the attribute engine alone.
	"""
	from nextai.nextai.doctype.dynamic_user_assignment.attributes import PURPOSE_ATTRIBUTES

	from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
		_assignment_query,
	)

	return _assignment_query(PURPOSE_ATTRIBUTES, REQUISITION_DOCTYPE, txt, start, page_len)
