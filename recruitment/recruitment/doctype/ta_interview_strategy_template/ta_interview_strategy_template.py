# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import json

import frappe
from frappe.model.document import Document


class TAInterviewStrategyTemplate(Document):
	def validate(self):
		# Keep a single default — checking this one clears the flag on the rest.
		if self.is_default:
			for name in frappe.get_all(
				"TA Interview Strategy Template",
				filters={"is_default": 1, "name": ["!=", self.name]},
				pluck="name",
			):
				frappe.db.set_value("TA Interview Strategy Template", name, "is_default", 0)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_hiring_workflow_user_assignments(doctype, txt, searchfield, start, page_len, filters):
	"""Link query for the master's "Applicable To" field.

	Returns only Dynamic User Assignments that are *explicitly* applicable for
	the hiring-workflow process — i.e. those whose `applicable_for_process`
	includes "TA Interview Strategy Template". Catch-all `default` assignments
	are intentionally excluded: an assignment must be tagged for this process to
	be selectable here.
	"""
	return frappe.db.sql(
		"""
		SELECT dua.name, dua.assignment_name
		FROM `tabDynamic User Assignment` dua
		INNER JOIN `tabGlobal Search DocType` gsd
			ON gsd.parent = dua.name AND gsd.parenttype = 'Dynamic User Assignment'
		WHERE
			gsd.document_type = 'TA Interview Strategy Template'
			AND (dua.name LIKE %(txt)s OR dua.assignment_name LIKE %(txt)s)
		GROUP BY dua.name
		ORDER BY dua.modified DESC
		LIMIT %(start)s, %(page_len)s
		""",
		{
			"txt": f"%{txt}%",
			"start": start,
			"page_len": page_len,
		},
	)


def _stage_type_for_round(round_row):
	"""Map a template round's step_type onto a Job Opening Hiring Stage type."""
	if (round_row.step_type or "").strip() == "Interview":
		return "Interview"
	return "Screening"


def _map_rounds_to_stages(template_doc):
	"""Convert a template's interview rounds into Job Opening Hiring Stage rows."""
	stages = []
	for row in template_doc.interview_rounds or []:
		if not row.round_name:
			continue
		stages.append({
			"stage_name": row.round_name,
			"stage_type": _stage_type_for_round(row),
			"sla": 0,
			"sla_unit": "d",
			"notify": 1,
			"auto": 0,
		})
	return stages


def _to_list(value):
	"""Parse the `value` of an `in` / `not in` condition into a list."""
	v = (value or "")
	if isinstance(v, str):
		v = v.strip()
		if v.startswith("["):
			try:
				return [str(x) for x in json.loads(v)]
			except (ValueError, TypeError):
				pass
		return [x.strip() for x in v.split(",") if x.strip()]
	if isinstance(v, (list, tuple)):
		return [str(x) for x in v]
	return [str(v)]


def _matches_like(actual, pattern):
	"""SQL-LIKE style match. nextai auto-wraps bare values in %...%, so a plain
	value behaves as 'contains'. We honour explicit % / _ wildcards loosely by
	treating the cleaned token as a substring match."""
	token = (pattern or "").replace("%", "").replace("_", "").strip().lower()
	return token in (actual or "").lower()


def _eval_condition(operator, actual, raw_value):
	"""Evaluate a single assignment condition against a Job Opening field value.

	Mirrors the operator semantics of nextai's Dynamic User Assignment engine,
	but compares against an in-memory document value instead of querying the
	Employee table. Operators that are tenure/date-relative (timespan, tenure)
	don't apply to a Job Opening and are treated as non-matching.
	"""
	op = (operator or "").strip().lower()
	actual_s = "" if actual is None else str(actual)
	v = raw_value if not isinstance(raw_value, str) else raw_value.strip()

	if op in ("=", "=="):
		return actual_s == str(v)
	if op in ("!=", "<>"):
		return actual_s != str(v)
	if op in (">", "<", ">=", "<="):
		try:
			af, vf = float(actual), float(v)
		except (TypeError, ValueError):
			return False
		return {">": af > vf, "<": af < vf, ">=": af >= vf, "<=": af <= vf}[op]
	if op == "like":
		return _matches_like(actual_s, str(v))
	if op == "not like":
		return not _matches_like(actual_s, str(v))
	if op == "in":
		return actual_s in _to_list(v)
	if op == "not in":
		return actual_s not in _to_list(v)
	if op == "between":
		parts = str(v).replace(":", ",").split(",", 1)
		if len(parts) != 2:
			return False
		lo, hi = parts[0].strip(), parts[1].strip()
		try:
			return float(lo) <= float(actual) <= float(hi)
		except (TypeError, ValueError):
			return lo <= actual_s <= hi
	# Unsupported for a Job Opening (timespan, tenure, unknown operator).
	return False


def _conditions_satisfied(dua_doc, opening):
	"""True when the Job Opening (`opening` dict) satisfies the Dynamic User
	Assignment's `assignment_conditions`.

	Each condition compares `field_name` on the opening against `value` using
	`operator`; rows are combined left-to-right with each row's `join_type`
	(AND / OR), matching the nextai engine. An assignment with no conditions
	applies to every opening.
	"""
	rows = [c for c in (dua_doc.assignment_conditions or []) if (c.field_name or "").strip()]
	if not rows:
		return True

	result = None
	prev_join = "AND"
	for cond in rows:
		field_name = cond.field_name.strip()
		ok = _eval_condition(cond.operator, opening.get(field_name), cond.value)
		if result is None:
			result = ok
		elif prev_join == "OR":
			result = result or ok
		else:
			result = result and ok
		prev_join = (cond.join_type or "AND").strip().upper()

	return bool(result)


def _template_matches(template_doc, opening):
	"""True when any of the template's `applicable_to` Dynamic User Assignments
	has its conditions satisfied by the Job Opening."""
	for row in template_doc.applicable_to or []:
		assignment = row.dynamic_user_assignment
		if not assignment:
			continue
		try:
			dua = frappe.get_doc("Dynamic User Assignment", assignment)
		except frappe.DoesNotExistError:
			continue
		if _conditions_satisfied(dua, opening):
			return True
	return False


@frappe.whitelist()
def get_hiring_stages_for_job_opening(job_opening=None, doc=None):
	"""Return the hiring stages of the TA Interview Strategy Template that
	applies to the given Job Opening.

	Each template's `applicable_to` lists Dynamic User Assignments. A template
	applies when one of those assignments' `assignment_conditions` (department,
	designation, location, company, etc.) is satisfied by the Job Opening's own
	field values. When more than one template matches, the most recently
	created one wins. If no template's conditions match, the template flagged
	`is_default` is used as a fallback (if one is set).

	`doc` (JSON of the live form) is preferred so unsaved openings match too;
	otherwise the saved Job Opening named by `job_opening` is loaded.
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
		opening = frappe.get_doc("Job Opening", job_opening).as_dict()

	if not opening:
		return {"template": None, "stages": []}

	templates = frappe.get_all(
		"TA Interview Strategy Template",
		fields=["name", "is_default"],
		order_by="creation desc",
	)

	# The default template is reserved purely as a fallback — it never competes
	# in condition matching, so a specific template always wins when it applies.
	for tpl in templates:
		if tpl.is_default:
			continue
		template_doc = frappe.get_doc("TA Interview Strategy Template", tpl.name)
		if _template_matches(template_doc, opening):
			return {
				"template": template_doc.name,
				"template_name": template_doc.template_name,
				"stages": _map_rounds_to_stages(template_doc),
			}

	# No conditional match — fall back to the default template, if one is set.
	default = frappe.get_all(
		"TA Interview Strategy Template",
		filters={"is_default": 1},
		fields=["name"],
		order_by="creation desc",
		limit=1,
	)
	if default:
		default_doc = frappe.get_doc("TA Interview Strategy Template", default[0].name)
		return {
			"template": default_doc.name,
			"template_name": default_doc.template_name,
			"stages": _map_rounds_to_stages(default_doc),
			"is_default": True,
		}

	return {"template": None, "stages": []}
