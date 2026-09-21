# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

"""Which hiring workflow a Job Opening gets — decided by **attributes**.

A TA Interview Strategy Template is the master list of interview rounds a Job
Opening starts with. Picking the right template used to run on the *population*
axis of a Dynamic User Assignment: ``applicable_to`` named DUAs and this module
walked their ``assignment_conditions`` itself, re-implementing the operator
semantics (``like``, ``between``, ``in``, join types…) of nextai's engine against
an in-memory Job Opening. That was a second, drifting copy of a matcher, and it
answered the wrong question — conditions say *who an assignment resolves to*, not
*which openings a template covers*.

Selection now uses the same primitive every other consumer in this app uses: a
DUA of purpose **Attributes** carries rows of ``(scope_doctype, scope_field,
value)`` — "on a Job Opening, ``department`` may be Sales". ``applicable_to``
names those assignments and the opening must satisfy them. Scoping by a new field
is a configuration change on the DUA; nothing ships.

Matching semantics come from :mod:`nextai...dynamic_user_assignment.attributes`
and are not reinvented here:

* values within one field OR;
* fields combine per the DUA's ``attribute_match`` (AND by default);
* a field the DUA does not mention imposes nothing;
* an empty value on the opening **defers** (``None``) rather than failing;
* several DUAs on one template OR — any one admitting is enough, which is how a
  Table MultiSelect of assignments reads.

Assignments of purpose *People* in ``applicable_to`` are **skipped**, not treated
as an unrestricted match: since assignments OR, admitting one would cancel every
attribute rule beside it. :meth:`validate` rejects them outright so a template
cannot be saved in that shape.

Ranking and the default
-----------------------
When several templates admit an opening the **most specific** wins — the one
whose admitting assignment pins down the most fields, so "Sales in Pune" beats
"Sales". Ties break on the most recently created template, which is what this
module did before. The template flagged ``is_default`` never competes; it is the
fallback used when nothing matches.

Deferral is why matching is strict. A half-filled Job Opening form re-asks on
every relevant field change, and filling it with the *default* template's rounds
the moment Department is still blank would be wrong — the tab is only prefilled
while it is empty, so that first wrong answer is the one the recruiter keeps.
When some template could still match once the opening is filled in, this returns
no stages and says ``deferred``; the fallback runs only when nothing is pending.
"""

import json

import frappe
from frappe import _

from frappe.model.document import Document

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	PURPOSE_ATTRIBUTES,
	PURPOSE_PEOPLE,
	AttributeIndex,
	load_attributes,
)

TEMPLATE_DOCTYPE = "TA Interview Strategy Template"
ASSIGNMENT_CHILD = "Dynamic User Assignment Table"
ASSIGNMENT_FIELD = "applicable_to"

OPENING_DOCTYPE = "Job Opening"
REQUISITION_DOCTYPE = "Job Requisition"

# `applicable_for_process` tags a DUA with the processes it is offered to.
# "Job Opening" is the document actually being matched, and is what the rest of
# this app tags with (see the Job Requisition / Job Offer consumers). Templates
# configured before attributes existed were tagged with the *consumer* doctype
# instead, so both are accepted rather than hiding assignments an administrator
# has already set up.
APPLICABLE_PROCESSES = (OPENING_DOCTYPE, TEMPLATE_DOCTYPE)


class TAInterviewStrategyTemplate(Document):
	def validate(self):
		self.validate_applicable_to()
		self.validate_default()

	def validate_applicable_to(self):
		"""Every "Applicable To" assignment must carry attributes.

		A People assignment resolves to a set of Employees; it says nothing about
		which openings this template covers. Silently skipping one at match time
		would leave a template that looks configured and never applies, so it is
		refused here where the administrator can see why.
		"""
		names = [row.dynamic_user_assignment for row in (self.applicable_to or []) if row.dynamic_user_assignment]
		if not names:
			return

		purposes = frappe.get_all(
			"Dynamic User Assignment",
			filters={"name": ["in", names]},
			fields=["name", "assignment_purpose"],
		)
		wrong = [
			p.name for p in purposes if (p.assignment_purpose or PURPOSE_PEOPLE) != PURPOSE_ATTRIBUTES
		]
		if wrong:
			frappe.throw(
				_(
					"{0} restricts which Job Openings this template covers, so every "
					"assignment in it must have Assignment Purpose <b>Attributes</b>. "
					"These do not: {1}"
				).format(_("Applicable To"), ", ".join(frappe.bold(n) for n in wrong))
			)

	def validate_default(self):
		# Keep a single default — checking this one clears the flag on the rest.
		if not self.is_default:
			return
		for name in frappe.get_all(
			TEMPLATE_DOCTYPE,
			filters={"is_default": 1, "name": ["!=", self.name]},
			pluck="name",
		):
			frappe.db.set_value(TEMPLATE_DOCTYPE, name, "is_default", 0)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_hiring_workflow_user_assignments(doctype, txt, searchfield, start, page_len, filters):
	"""Link query for the master's "Applicable To" field.

	Offers only Dynamic User Assignments of purpose **Attributes** — the only kind
	that can restrict which openings a template covers. An assignment is in scope
	when it is tagged for one of :data:`APPLICABLE_PROCESSES`, or carries no
	process tags at all (an untagged assignment is applicable everywhere, the same
	reading the Job Requisition scope picker uses).
	"""
	return frappe.db.sql(
		"""
		SELECT dua.name, dua.assignment_name
		FROM `tabDynamic User Assignment` dua
		WHERE IFNULL(dua.assignment_purpose, %(people)s) = %(purpose)s
		  AND (dua.name LIKE %(txt)s OR IFNULL(dua.assignment_name, '') LIKE %(txt)s)
		  AND (
			NOT EXISTS (
				SELECT 1 FROM `tabGlobal Search DocType` any_gsd
				WHERE any_gsd.parent = dua.name
				  AND any_gsd.parenttype = 'Dynamic User Assignment'
			)
			OR EXISTS (
				SELECT 1 FROM `tabGlobal Search DocType` gsd
				WHERE gsd.parent = dua.name
				  AND gsd.parenttype = 'Dynamic User Assignment'
				  AND gsd.document_type IN ({placeholders})
			)
		  )
		ORDER BY dua.modified DESC
		LIMIT %(start)s, %(page_len)s
		""".format(placeholders=", ".join(f"%(process{i})s" for i in range(len(APPLICABLE_PROCESSES)))),
		{
			"txt": f"%{txt}%",
			"people": PURPOSE_PEOPLE,
			"purpose": PURPOSE_ATTRIBUTES,
			"start": start,
			"page_len": page_len,
			**{f"process{i}": p for i, p in enumerate(APPLICABLE_PROCESSES)},
		},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_interviewer_user_assignments(doctype, txt, searchfield, start, page_len, filters):
	"""Link query for a round's "Interviewer User Assignment" field.

	The mirror image of :func:`get_hiring_workflow_user_assignments`: a panel is
	made of *people*, so this offers **People** assignments — the only kind that
	resolves to anybody — while ``applicable_to`` offers Attributes ones. Picking
	from the wrong list is the easy mistake here, so neither picker shows the
	other's assignments.
	"""
	return frappe.db.sql(
		"""
		SELECT dua.name, dua.assignment_name
		FROM `tabDynamic User Assignment` dua
		WHERE IFNULL(dua.assignment_purpose, %(people)s) = %(people)s
		  AND (dua.name LIKE %(txt)s OR IFNULL(dua.assignment_name, '') LIKE %(txt)s)
		ORDER BY dua.modified DESC
		LIMIT %(start)s, %(page_len)s
		""",
		{
			"txt": f"%{txt}%",
			"people": PURPOSE_PEOPLE,
			"start": start,
			"page_len": page_len,
		},
	)


# ── Rounds → stages ───────────────────────────────────────────────────────────


# Step types a round may carry. They are Job Opening Hiring Stage types verbatim,
# so a round's stage behaves exactly like one added on the opening by hand
# (Screen / Shortlist actions, status mapping in api.hiring_stage).
ROUND_STAGE_TYPES = ("Screening", "Shortlist", "Interview")


def _stage_type_for_round(round_row):
	"""Map a template round's step_type onto a Job Opening Hiring Stage type.

	A blank step type is a screening round — the only non-interview kind rounds
	could express before Screening and Shortlist were offered.
	"""
	step_type = (round_row.get("step_type") or "").strip()
	return step_type if step_type in ROUND_STAGE_TYPES else "Screening"


def _is_mandatory(row):
	"""Whether a round may never be skipped on a Job Applicant.

	Two fields say it, and either is enough: the explicit ``is_mandatory`` tick,
	and ``allow_skipping = "No"``. They were added for the same reason and an
	administrator who sets one expects the other's behaviour.
	"""
	if row.get("is_mandatory"):
		return 1
	return 1 if (row.get("allow_skipping") or "").strip() == "No" else 0


def _map_rounds_to_stages(template_doc):
	"""Convert a template's interview rounds into Job Opening Hiring Stage rows."""
	stages = []
	for child in template_doc.interview_rounds or []:
		if not child.round_name:
			continue
		row = child.as_dict()
		stages.append({
			"stage_name": row["round_name"],
			"stage_type": _stage_type_for_round(row),
			"is_mandatory": _is_mandatory(row),
			# The panel travels with the stage: who interviews is per round, and
			# the Job Opening's stage row is what hiring_stage reads when an
			# interview is actually created.
			"interviewer_pool": row.get("interviewer_pool"),
			"interviewer_role": row.get("interviewer_role"),
			"sla": 0,
			"sla_unit": "d",
			"notify": 1,
			"auto": 0,
		})
	return stages


# ── Opening context ───────────────────────────────────────────────────────────


class _OpeningContext:
	"""The documents an attribute row may be matched against, resolved lazily.

	A DUA names the doctype it scopes, so the caller cannot know up front whether
	the Job Opening alone or its Job Requisition will be needed. Each is fetched
	on first request and never twice; a configuration that only scopes Job Opening
	fields costs no extra read at all.
	"""

	def __init__(self, opening):
		self._opening = dict(opening or {})
		self._opening["doctype"] = OPENING_DOCTYPE
		self._cache = {OPENING_DOCTYPE: self._opening}

	def get(self, scope_doctype):
		if scope_doctype not in self._cache:
			self._cache[scope_doctype] = self._resolve(scope_doctype)
		return self._cache[scope_doctype]

	def _resolve(self, scope_doctype):
		if scope_doctype == REQUISITION_DOCTYPE:
			return self._linked(REQUISITION_DOCTYPE, self._opening.get("job_requisition"))
		# Any other doctype an assignment scopes has no path from a Job Opening,
		# so there is nothing to match it against. _assignment_verdict reads that
		# as deferred, never as an admit.
		return None

	def _linked(self, scope_doctype, name):
		if not name:
			return None
		try:
			values = frappe.db.get_value(scope_doctype, name, "*", as_dict=True)
		except Exception:
			return None
		if not values:
			return None
		values["doctype"] = scope_doctype
		return values


# ── Matching ──────────────────────────────────────────────────────────────────


def _and(verdicts):
	"""Three-valued AND — False beats None beats True, per the attribute contract."""
	if any(v is False for v in verdicts):
		return False
	if any(v is None for v in verdicts):
		return None
	return True


def _assignment_verdict(dua, scoped, index, context):
	"""``(verdict, specificity)`` for one Dynamic User Assignment.

	``specificity`` is how many fields the assignment actually pins down. It is
	what makes "Sales in Pune" win over "Sales", so an opening that qualifies for
	both is prefilled from the narrower template rather than whichever was created
	last.
	"""
	verdicts = []
	fields = 0
	for scope_doctype, by_field in scoped.items():
		fields += len(by_field)
		doc = context.get(scope_doctype)
		if doc is None:
			# The assignment scopes a document this opening has no link to (or one
			# this app does not resolve). Nothing to match against yet — defer,
			# never silently admit.
			verdicts.append(None)
			continue
		verdicts.append(index.satisfied([dua], doc, combine="all"))

	return _and(verdicts), fields


def _template_verdict(assignments, scoped_by_dua, index, context):
	"""``(verdict, specificity)`` for one template's "Applicable To" list."""
	scoping = [dua for dua in assignments if scoped_by_dua.get(dua)]
	if not scoping:
		# Nothing restricts this template. That is not a catch-all here — the
		# `is_default` flag is — so it admits nothing rather than every opening.
		return False, 0

	# Several assignments OR: any one admitting is enough. The specificity that
	# survives is the narrowest *admitting* assignment's, not the narrowest
	# overall — a template must not be ranked on a rule that rejected this opening.
	best = None
	deferred = False
	for dua in scoping:
		verdict, fields = _assignment_verdict(dua, scoped_by_dua[dua], index, context)
		if verdict is True:
			best = fields if best is None else max(best, fields)
		elif verdict is None:
			deferred = True
	if best is not None:
		return True, best
	return (None, 0) if deferred else (False, 0)


def _assignments_by_template(names):
	"""``{template: [dua, ...]}`` — one query for every template's assignments."""
	if not names or not frappe.db.table_exists(ASSIGNMENT_CHILD):
		return {}

	child = frappe.qb.DocType(ASSIGNMENT_CHILD)
	rows = (
		frappe.qb.from_(child)
		.select(child.parent, child.dynamic_user_assignment)
		.where(
			(child.parenttype == TEMPLATE_DOCTYPE)
			& (child.parentfield == ASSIGNMENT_FIELD)
			& (child.parent.isin(list(names)))
			& child.dynamic_user_assignment.notnull()
			& (child.dynamic_user_assignment != "")
		)
	).run(as_dict=True)

	out = {}
	for row in rows:
		out.setdefault(row["parent"], []).append(row["dynamic_user_assignment"])
	return out


def resolve_strategy_templates(opening, permissive=False):
	"""Templates whose attributes admit this Job Opening, best first.

	Each entry is ``{"name", "template_name", "specificity", "deferred"}``, ordered
	most-specific first and then most recently created, so the same opening always
	resolves to the same template.

	``permissive`` also returns templates that merely *could* still match once the
	opening is filled in. Only a caller that wants to explain the wait should ask
	for that; the prefill path wants a definite answer.
	"""
	rows = frappe.get_all(
		TEMPLATE_DOCTYPE,
		filters={"is_default": 0},
		fields=["name", "template_name", "creation"],
		order_by="creation desc",
		# Every template, not the first page: get_all paginates at 20 by default,
		# and a matcher that silently stops looking after 20 rows would prefill the
		# default workflow for whatever the 21st covers.
		limit_page_length=0,
	)
	if not rows:
		return []

	assignments = _assignments_by_template([r["name"] for r in rows])
	referenced = {dua for duas in assignments.values() for dua in duas}
	scoped_by_dua, _modes = load_attributes(referenced) if referenced else ({}, {})
	index = AttributeIndex(referenced)
	context = _OpeningContext(opening)

	matched = []
	for i, row in enumerate(rows):
		verdict, specificity = _template_verdict(
			assignments.get(row["name"]) or [], scoped_by_dua, index, context
		)
		if verdict is True or (permissive and verdict is None):
			matched.append({
				"name": row["name"],
				"template_name": row["template_name"],
				# A deferred match ranks below every definite one.
				"specificity": specificity if verdict is True else -1,
				"deferred": verdict is None,
				# `rows` is already ordered creation desc, so the index is the
				# creation tiebreak without re-comparing timestamps.
				"_order": i,
			})

	matched.sort(key=lambda t: (-t["specificity"], t["_order"]))
	return matched


def _default_template():
	default = frappe.get_all(
		TEMPLATE_DOCTYPE,
		filters={"is_default": 1},
		fields=["name"],
		order_by="creation desc",
		limit=1,
	)
	return default[0].name if default else None


@frappe.whitelist()
def get_hiring_stages_for_job_opening(job_opening=None, doc=None):
	"""Return the hiring stages of the TA Interview Strategy Template that
	applies to the given Job Opening.

	Each template's ``applicable_to`` lists Dynamic User Assignments of purpose
	*Attributes*. A template applies when one of those assignments' attributes
	(department, designation, location, company, …) is satisfied by the Job
	Opening's own field values. When more than one applies, the most specific wins.
	If nothing applies, the template flagged ``is_default`` is used as a fallback.

	When some template could still apply once the opening is filled in, no stages
	are returned and ``deferred`` is set — prefilling the default's rounds over a
	half-filled form would leave the recruiter with the wrong workflow, since the
	tab is only auto-filled while it is empty.

	``doc`` (JSON of the live form) is preferred so unsaved openings match too;
	otherwise the saved Job Opening named by ``job_opening`` is loaded.
	"""
	# Respect the master switch — when the Hiring Workflow feature is off, never
	# auto-fill stages so Job Openings behave exactly as before.
	from recruitment.api.hiring_stage import is_hiring_workflow_enabled

	if not is_hiring_workflow_enabled():
		return {"template": None, "stages": [], "enabled": False}

	opening = None
	if doc:
		opening = json.loads(doc) if isinstance(doc, str) else doc
	elif job_opening:
		opening = frappe.get_doc(OPENING_DOCTYPE, job_opening).as_dict()

	if not opening:
		return {"template": None, "stages": []}

	matches = resolve_strategy_templates(opening, permissive=True)
	definite = [m for m in matches if not m["deferred"]]

	if definite:
		template_doc = frappe.get_doc(TEMPLATE_DOCTYPE, definite[0]["name"])
		return {
			"template": template_doc.name,
			"template_name": template_doc.template_name,
			"stages": _map_rounds_to_stages(template_doc),
		}

	if matches:
		# Everything that could apply is still waiting on a field the recruiter has
		# not filled in. Say so rather than falling back to the default workflow.
		return {
			"template": None,
			"stages": [],
			"deferred": True,
			"pending": [m["template_name"] for m in matches],
		}

	default = _default_template()
	if default:
		default_doc = frappe.get_doc(TEMPLATE_DOCTYPE, default)
		return {
			"template": default_doc.name,
			"template_name": default_doc.template_name,
			"stages": _map_rounds_to_stages(default_doc),
			"is_default": True,
		}

	return {"template": None, "stages": []}
