# Copyright (c) 2026, ChatNext and contributors
# For license information, please see license.txt

"""Company / Assignment applicability for Job Applicant profile fields.

A field set up in Job Applicant Profile Settings can be limited to some Job
Openings: those of chosen Companies, or those an Attributes-purpose Dynamic User
Assignment admits. The rule is matched against the opening, not the applicant —
careers, campus and refer render their form before any applicant exists.

Rules:
* switch off, no conditions, or field on the exclusion list → shown everywhere
* otherwise shown when ANY condition admits the opening (conditions OR together)
* an Assignment that can't be evaluated because the opening leaves a field blank
  admits — hiding fields on missing data is harder to diagnose than showing them
"""

import json

import frappe
from frappe import _
from frappe.utils import cint
from frappe.utils.caching import request_cache

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	PURPOSE_ATTRIBUTES,
	AttributeIndex,
)

from recruitment.recruitment.doctype.job_applicant_applicability_configuration.job_applicant_applicability_configuration import (
	excluded_field_refs,
)

OPENING_DOCTYPE = "Job Opening"
ASSIGNMENT_DOCTYPE = "Dynamic User Assignment"
SETTINGS_DOCTYPE = "Job Applicant Profile Settings"
CONFIG_ROUTE = "/app/job-applicant-applicability-configuration"

# Cap for the dialog's live preview; the response says when it was reached.
PREVIEW_OPENING_LIMIT = 500

TYPE_COMPANY = "Company"
TYPE_ASSIGNMENT = "Assignment"
APPLICABLE_TYPES = (TYPE_COMPANY, TYPE_ASSIGNMENT)


# --------------------------------------------------------------------- config --

def parse_config(raw):
	"""``[{"type", "value"}]`` from a stored rule. Malformed input means no rule —
	this runs on every candidate form load and must never raise."""
	if not raw:
		return []
	if isinstance(raw, (list, tuple)):
		parsed = list(raw)
	else:
		try:
			parsed = json.loads(raw)
		except (ValueError, TypeError):
			return []
	if not isinstance(parsed, list):
		return []

	out = []
	for entry in parsed:
		if not isinstance(entry, dict):
			continue
		etype = str(entry.get("type") or "").strip()
		value = str(entry.get("value") or "").strip()
		if etype in APPLICABLE_TYPES and value:
			out.append({"type": etype, "value": value})
	return out


def serialize_config(entries):
	"""Canonical stored form: de-duplicated and sorted, so a no-op edit is not a diff."""
	clean = sorted(
		{(e["type"], e["value"]) for e in parse_config(entries)},
	)
	return json.dumps([{"type": t, "value": v} for t, v in clean], separators=(",", ":")) if clean else ""


def split_config(entries):
	"""``(companies, assignments)`` as lists of names."""
	companies, assignments = [], []
	for entry in entries:
		(companies if entry["type"] == TYPE_COMPANY else assignments).append(entry["value"])
	return companies, assignments


def row_is_restricted(row, excluded=None):
	"""Whether ``row`` has a rule that is enforced. Pass ``excluded`` when looping."""
	if not cint(row.get("applicable_enabled")):
		return False
	if excluded is None:
		excluded = excluded_field_refs()
	if row.get("reference_name") in excluded:
		return False
	return bool(parse_config(row.get("applicability_config")))


# ------------------------------------------------------------------ matching --

def explain_admit(entries, opening_doc, index):
	"""The condition that admits ``opening_doc`` as ``{"type", "value", "deferred"}``,
	or None when nothing does. Empty ``entries`` admit with no reason."""
	if not entries:
		return {"type": None, "value": None, "deferred": False}

	companies, assignments = split_config(entries)

	company = opening_doc.get("company")
	if companies and company in companies:
		return {"type": TYPE_COMPANY, "value": company, "deferred": False}

	if assignments and index.satisfied(assignments, opening_doc, combine="any") is not False:
		for name in assignments:
			if index.satisfied([name], opening_doc) is True:
				return {"type": TYPE_ASSIGNMENT, "value": name, "deferred": False}
		deferred = next(
			(n for n in assignments if index.satisfied([n], opening_doc) is None),
			assignments[0],
		)
		return {"type": TYPE_ASSIGNMENT, "value": deferred, "deferred": True}

	return None


def opening_admits(entries, opening_doc, index):
	"""Whether any of ``entries`` admits ``opening_doc``. Share ``index`` across rows
	so each assignment is loaded once."""
	if not entries:
		return True
	companies, assignments = split_config(entries)
	if companies and opening_doc.get("company") in companies:
		return True
	# None (deferred) admits — see the module docstring.
	return bool(assignments) and index.satisfied(assignments, opening_doc, combine="any") is not False


def _opening_linkfields():
	"""Job Opening's Link fields — the ones an attribute rule can name."""
	fields = [
		df.fieldname
		for df in frappe.get_meta(OPENING_DOCTYPE).fields
		if df.fieldtype in ("Link", "Dynamic Link") and df.fieldname
	]
	if "company" not in fields:
		fields.append("company")
	return fields


@request_cache
def _opening_doc(opening_name):
	"""The opening's link values as a dict (``AttributeIndex`` reads the doctype key).
	Request-cached: a submit builds the field set twice."""
	values = frappe.db.get_value(OPENING_DOCTYPE, opening_name, _opening_linkfields(), as_dict=True)
	if not values:
		return None
	values["doctype"] = OPENING_DOCTYPE
	values["name"] = opening_name
	return values


def filter_rows_for_opening(rows, opening_name):
	"""``rows`` (template dicts) minus the ones whose rule excludes ``opening_name``.
	Without an opening nothing is filtered."""
	if not rows or not opening_name:
		return list(rows or [])

	excluded = excluded_field_refs()
	restricted = {id(r) for r in rows if row_is_restricted(r, excluded)}
	if not restricted:
		return list(rows)  # the usual case: no opening read at all

	opening_doc = _opening_doc(opening_name)
	if opening_doc is None:
		return list(rows)

	index = AttributeIndex()
	return [
		row for row in rows
		if id(row) not in restricted
		or opening_admits(parse_config(row.get("applicability_config")), opening_doc, index)
	]


# -------------------------------------------------------------------- labels --

def _check_settings_read():
	if not frappe.has_permission(SETTINGS_DOCTYPE, "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)


def _labels_for(companies=(), assignments=()):
	"""``{(type, name): label}`` for exactly the names given — never a capped page,
	so a name past the first N is not mistaken for a deleted one."""
	out = {}
	if companies:
		for r in frappe.get_all("Company", filters={"name": ["in", list(companies)]}, fields=["name", "company_name"]):
			out[(TYPE_COMPANY, r.name)] = r.company_name or r.name
	if assignments:
		for r in frappe.get_all(
			ASSIGNMENT_DOCTYPE, filters={"name": ["in", list(assignments)]}, fields=["name", "assignment_name"]
		):
			out[(TYPE_ASSIGNMENT, r.name)] = r.assignment_name or r.name
	return out


def _titles(doctype, names):
	"""``{name: title}`` for Link values whose doctype has a title field
	(``EMPTYPE_0012`` → "Freelancer"). No query for doctypes titled by name."""
	names = [n for n in set(names) if n]
	if not doctype or not names:
		return {}
	try:
		title_field = frappe.get_meta(doctype).get_title_field()
	except Exception:
		return {}
	if not title_field or title_field == "name":
		return {}
	return {
		r.name: r.get(title_field) or r.name
		for r in frappe.get_all(doctype, filters={"name": ["in", names]}, fields=["name", title_field])
	}


def _assignment_conditions(names):
	"""``{assignment: {"conditions": [...], "joiner": "and"|"or"}}`` from each
	assignment's Job Opening attribute rows. No rows means it admits every opening."""
	names = [n for n in names if n]
	if not names:
		return {}

	meta = frappe.get_meta(OPENING_DOCTYPE)
	rows = frappe.get_all(
		"Assignment Attribute",
		filters={"parent": ["in", names], "parenttype": ASSIGNMENT_DOCTYPE, "scope_doctype": OPENING_DOCTYPE},
		fields=["parent", "scope_field", "value_doctype", "attribute_value"],
		order_by="idx asc",
	)
	modes = {
		r.name: r.attribute_match or ""
		for r in frappe.get_all(ASSIGNMENT_DOCTYPE, filters={"name": ["in", names]}, fields=["name", "attribute_match"])
	}

	by_dt = {}
	for r in rows:
		by_dt.setdefault(r.value_doctype, []).append(r.attribute_value)
	titles = {dt: _titles(dt, vals) for dt, vals in by_dt.items()}

	out = {n: {"conditions": [], "joiner": "or" if "OR" in modes.get(n, "") else "and"} for n in names}
	grouped = {}
	for r in rows:
		key = (r.parent, r.scope_field)
		if key not in grouped:
			grouped[key] = {
				"field": r.scope_field,
				"label": _(meta.get_label(r.scope_field) or r.scope_field),
				"values": [],
			}
			out[r.parent]["conditions"].append(grouped[key])
		grouped[key]["values"].append(
			(titles.get(r.value_doctype) or {}).get(r.attribute_value) or r.attribute_value
		)
	return out


# ------------------------------------------------------------------- pickers --

@frappe.whitelist()
def get_excluded_field_refs():
	_check_settings_read()
	return sorted(excluded_field_refs())


@frappe.whitelist()
def get_applicability_bootstrap():
	"""What the settings grid needs in one call: the exclusion list, and labels for
	exactly the Companies / Assignments the rules use."""
	_check_settings_read()

	companies, assignments = set(), set()
	for raw in frappe.get_all(
		"Job Opening Application Field",
		filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE, "applicable_enabled": 1},
		pluck="applicability_config",
	):
		c, a = split_config(parse_config(raw))
		companies.update(c)
		assignments.update(a)

	labels = _labels_for(companies, assignments)
	return {
		"excluded": sorted(excluded_field_refs()),
		"labels": {
			TYPE_COMPANY: {n: labels[(TYPE_COMPANY, n)] for n in companies if (TYPE_COMPANY, n) in labels},
			TYPE_ASSIGNMENT: {n: labels[(TYPE_ASSIGNMENT, n)] for n in assignments if (TYPE_ASSIGNMENT, n) in labels},
		},
		"config_route": CONFIG_ROUTE,
	}


@frappe.whitelist()
def get_applicability_choices(applicable_type, txt=None, limit=50):
	"""Server-side search for the dialog's picker. Assignments carry the Job Opening
	conditions they impose, so the admin can see what one means before choosing it."""
	_check_settings_read()

	applicable_type = (applicable_type or "").strip()
	if applicable_type not in APPLICABLE_TYPES:
		return []

	like = f"%{txt or ''}%"
	limit = min(cint(limit) or 50, 200)

	if applicable_type == TYPE_COMPANY:
		return [
			{"value": row.name, "label": row.company_name or row.name, "abbr": row.abbr or ""}
			for row in frappe.get_all(
				"Company",
				or_filters=[["name", "like", like], ["company_name", "like", like]] if txt else None,
				fields=["name", "company_name", "abbr"],
				order_by="company_name asc",
				limit_page_length=limit,
			)
		]

	# Attributes assignments only — a People assignment answers nothing about an
	# opening. Untagged ones count as "applies anywhere", as in raise_requisition_scope.
	rows = frappe.db.sql(
		"""
		SELECT dua.name, dua.assignment_name
		FROM `tabDynamic User Assignment` dua
		WHERE IFNULL(dua.assignment_purpose, 'People') = %(purpose)s
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
				  AND gsd.document_type = %(process)s
			)
		  )
		ORDER BY dua.modified DESC
		LIMIT %(limit)s
		""",
		{"purpose": PURPOSE_ATTRIBUTES, "txt": like, "process": OPENING_DOCTYPE, "limit": limit},
		as_dict=True,
	)
	conds = _assignment_conditions([r.name for r in rows])
	out = [
		{
			"value": r.name,
			"label": r.assignment_name or r.name,
			"conditions": conds.get(r.name, {}).get("conditions", []),
			"joiner": conds.get(r.name, {}).get("joiner", "and"),
			# Without Job Opening conditions it would admit every opening, so the
			# dialog shows it but won't let it be picked.
			"narrows": bool(conds.get(r.name, {}).get("conditions")),
		}
		for r in rows
	]
	out.sort(key=lambda e: not e["narrows"])
	return out


# ------------------------------------------------------------------- preview --

def _reason_text(reason, labels):
	if not reason or not reason.get("type"):
		return ""
	label = labels.get((reason["type"], reason["value"])) or reason["value"]
	text = _("{0}: {1}").format(_(reason["type"]), label)
	if reason.get("deferred"):
		text += " " + _("(a field it checks is blank on the opening)")
	return text


@frappe.whitelist()
def preview_applicability(config):
	"""Which open Job Openings a draft rule would show the field on (dialog preview).
	Two queries: the openings, and the assignments they are checked against."""
	_check_settings_read()

	entries = parse_config(config)
	openings = frappe.get_all(
		OPENING_DOCTYPE,
		filters={"status": "Open"},
		fields=["name", "job_title", *_opening_linkfields()],
		order_by="modified desc",
		limit_page_length=PREVIEW_OPENING_LIMIT + 1,
	)
	capped = len(openings) > PREVIEW_OPENING_LIMIT
	openings = openings[:PREVIEW_OPENING_LIMIT]

	companies, assignments = split_config(entries)
	labels = _labels_for(companies, assignments)
	index = AttributeIndex(assignments)

	shown, hidden = [], []
	for o in openings:
		o["doctype"] = OPENING_DOCTYPE
		reason = explain_admit(entries, o, index)
		item = {"name": o.name, "title": o.job_title or o.name, "company": o.company or ""}
		if reason is None:
			hidden.append(item)
		else:
			item["reason"] = _reason_text(reason, labels)
			shown.append(item)

	return {
		"total": len(openings),
		"shown_count": len(shown),
		"hidden_count": len(hidden),
		"shown": shown[:8],
		"hidden": hidden[:5],
		"capped": capped,
		"limit": PREVIEW_OPENING_LIMIT,
	}


@frappe.whitelist()
def get_opening_applicability(values):
	"""``{fieldname: {"applicable", "reason"}}`` for the Job Opening form's badges,
	from the form's current (possibly unsaved) values. Only scoped fields appear.
	Needs write, not read: Job Opening read is granted to Guest for the careers page."""
	if not frappe.has_permission(OPENING_DOCTYPE, "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	values = frappe.parse_json(values) if isinstance(values, str) else values
	if not isinstance(values, dict):
		values = {}
	doc = {f: values.get(f) for f in _opening_linkfields()}
	doc["doctype"] = OPENING_DOCTYPE

	excluded = excluded_field_refs()
	rules = [
		(row.reference_name, parse_config(row.applicability_config))
		for row in frappe.get_all(
			"Job Opening Application Field",
			filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE, "applicable_enabled": 1},
			fields=["reference_name", "applicability_config", "applicable_enabled"],
		)
		if row_is_restricted(row, excluded)
	]
	if not rules:
		return {}

	companies, assignments = set(), set()
	for _ref, entries in rules:
		c, a = split_config(entries)
		companies.update(c)
		assignments.update(a)
	labels = _labels_for(companies, assignments)
	index = AttributeIndex(list(assignments))

	out = {}
	for ref, entries in rules:
		reason = explain_admit(entries, doc, index)
		if reason is None:
			names = [labels.get((e["type"], e["value"])) or e["value"] for e in entries]
			out[ref] = {"applicable": 0, "reason": _("Only for: {0}").format(", ".join(names))}
		else:
			out[ref] = {"applicable": 1, "reason": _reason_text(reason, labels)}
	return out
