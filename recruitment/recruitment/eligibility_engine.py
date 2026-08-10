"""Campus eligibility engine.

When a candidate applies through the campus channel and their Job Applicant is
*submitted*, the opening's eligibility rules (``custom_eligibility_rules``) are
evaluated against the applicant's own fields.

Each rule is a TRIGGER, read exactly as the builder renders it —
"when <field> <operator> <value> → <action>":

  - A matching **Knock out** rule → candidate is **Rejected** (sub-status
    "Eligibility Not Met").
  - A matching **Flag** rule      → candidate is put on **Hold** (sub-status
    "Eligibility Flagged").
  - Nothing matches               → candidate is **Shortlisted**.

So "Driving licence = No → Hold" holds back the candidates who answered No, and
leaves everyone else alone. (This used to be inverted — a rule described what the
candidate had to SATISFY, and the action fired when they didn't — which read
backwards from the row on screen and silently held candidates who qualified.
`recruitment/patches/flip_eligibility_rule_semantics.py` flipped the operators of
rules written under the old reading so they still mean the same thing.)

Every outcome logs a comment on the applicant's timeline stating the decision and
the exact rule(s) behind it.

A rule targets either a scalar Job Applicant field (``doc.get(fieldname)``) or a
child-row field (``field_name = "table::field"``, matched by ``match_field`` /
``match_value``). A child rule can only match a row the candidate actually has:
with no Graduation row, a rule about Graduation never fires.
"""

import frappe
from frappe import _
from frappe.utils import cstr

REJECT_STATUS = "Rejected"
HOLD_STATUS = "Hold"
PASS_STATUS = "Shortlisted"
REJECT_SUBSTATUS = "Eligibility Not Met"
HOLD_SUBSTATUS = "Eligibility Flagged"

RULES_FIELD = "custom_eligibility_rules"

def _entry(value, label, df=None, fieldtype=None, options=None):
	"""One catalog entry. `options` carries the raw docfield options — the linked
	doctype for a Link, the newline choices for a Select — so the UI can build the
	right Value control (link search / options dropdown / number / date)."""
	return {
		"value": value,
		"label": label,
		"fieldtype": fieldtype or (df.fieldtype if df else "Data"),
		"options": (options if options is not None else (df.options if df else "")) or "",
	}


OPERATORS = {
	"number": ["≥", "≤", "=", "≠", ">", "<"],
	"choice": ["=", "≠", "one of", "not one of"],
	"text": ["=", "≠", "contains", "does not contain", "one of", "not one of"],
	"date": ["=", "≠", "≥", "≤", ">", "<"],
	"check": ["="],
}


@frappe.whitelist()
def get_eligibility_field_catalog():
	"""Job Applicant fields for the condition builder, grouped by the section they
	sit in on the Job Applicant form.

	One flat list of the applicant's OWN fields — child tables included, as
	pickable entries flagged ``is_table``. Picking one asks
	``get_child_table_fields`` for the columns inside it, so a condition on a table
	is built the way it reads: choose the table, then the column in it.

	(This used to ship a pre-expanded cross-product — "Graduation — GPA/Percentage",
	"12th — GPA/Percentage", one entry per stage × per numeric column — which buried
	the ordinary fields and only ever worked for Education.)

	Every entry carries its `fieldtype` + raw `options`, so the Value control adapts:
	Link → link search, Select → its options, number → number box, Date → datepicker.
	Grouping mirrors the form's own sections via `iter_profile_fields`, the same
	helper the application-fields config groups by — so a field is in the section
	the admin expects to find it in.
	"""
	from recruitment.api.applicant_field_options import _SKIP_FIELDTYPES, _TABLE_FIELDTYPES
	from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
		iter_profile_fields,
	)

	meta = frappe.get_meta("Job Applicant")
	groups, by_section, seen = [], {}, set()

	def _add(section, entry):
		if section not in by_section:
			by_section[section] = {"label": section, "fields": []}
			groups.append(by_section[section])
		by_section[section]["fields"].append(entry)

	for df, section, _tab in iter_profile_fields(meta):
		if df.fieldname in seen or df.fieldtype in _SKIP_FIELDTYPES:
			continue
		seen.add(df.fieldname)
		is_table = df.fieldtype in _TABLE_FIELDTYPES
		if is_table and not df.options:
			continue
		entry = _entry(df.fieldname, df.label or df.fieldname, df)
		entry["is_table"] = 1 if is_table else 0
		entry["child_doctype"] = df.options if is_table else ""
		_add(section, entry)

	return {"groups": groups, "operators": OPERATORS}


@frappe.whitelist()
def get_child_table_fields(child_doctype):
	"""The comparable columns inside a child table, for step two of a table condition.

	Fetched only once a table is picked, so the field list stays the size of one
	doctype instead of every table's columns crossed with every row value.
	"""
	from recruitment.api.applicant_field_options import _SKIP_FIELDTYPES, _TABLE_FIELDTYPES

	if not child_doctype or not frappe.db.exists("DocType", child_doctype):
		return []

	out = []
	for df in frappe.get_meta(child_doctype).fields:
		if not df.fieldname or df.fieldtype in _SKIP_FIELDTYPES or df.fieldtype in _TABLE_FIELDTYPES:
			continue
		if df.hidden:
			continue
		out.append(_entry(df.fieldname, df.label or df.fieldname, df))
	out.sort(key=lambda x: (x["label"] or "").lower())
	return out


def _to_float(v):
	"""Parse a genuine number, else None. Must NOT coerce text like 'Graduation'
	to 0.0 (frappe's flt does), or non-numeric equality checks break."""
	s = cstr(v).replace(",", "").replace("%", "").strip()
	if not s:
		return None
	try:
		return float(s)
	except (ValueError, TypeError):
		return None


def _as_list(v):
	return [p.strip() for p in cstr(v).replace("\n", ",").split(",") if p.strip()]


def _passes(actual, operator, expected):
	"""Compare one value. True when `actual <operator> expected` holds."""
	op = (operator or "=").strip()
	a_num, e_num = _to_float(actual), _to_float(expected)

	if op in ("≥", ">=", "≤", "<=", ">", "<"):
		if a_num is None or e_num is None:
			return False
		if op in ("≥", ">="):
			return a_num >= e_num
		if op in ("≤", "<="):
			return a_num <= e_num
		if op == ">":
			return a_num > e_num
		return a_num < e_num

	if op in ("=", "=="):
		if a_num is not None and e_num is not None:
			return a_num == e_num
		return cstr(actual).strip().lower() == cstr(expected).strip().lower()

	if op in ("≠", "!="):
		if a_num is not None and e_num is not None:
			return a_num != e_num
		return cstr(actual).strip().lower() != cstr(expected).strip().lower()

	if op in ("one of", "not one of"):
		allowed = [x.lower() for x in _as_list(expected)]
		hit = cstr(actual).strip().lower() in allowed
		return hit if op == "one of" else not hit

	if op in ("contains", "does not contain"):
		hit = cstr(expected).strip().lower() in cstr(actual).strip().lower()
		return hit if op == "contains" else not hit

	# Unknown operator — never fire, so a bad rule can't reject anyone.
	return False


def _child_field_label(table, fieldname):
	"""Label for a child field, read from the child doctype's schema (dynamic)."""
	try:
		child_dt = frappe.get_meta("Job Applicant").get_field(table)
		df = frappe.get_meta(child_dt.options).get_field(fieldname) if child_dt else None
		if df and df.label:
			return df.label
	except Exception:
		pass
	return fieldname


def _rule_label(r):
	"""Plain-English rule for the timeline comment (e.g. 'Graduation GPA/Percentage ≥ 65')."""
	fn = r.get("field_name") or ""
	op = r.get("operator") or "="
	val = r.get("value") or ""
	if "::" in fn:
		table, target = fn.split("::", 1)
		check = _child_field_label(table, target)
		test = "{0} {1} {2}".format(check, op, val).strip()

		match_value = cstr(r.get("match_value") or "").strip()
		if not match_value:
			return test
		match_op = (r.get("match_operator") or "=").strip() or "="
		# "Graduation GPA/Percentage < 60" reads best for the usual equality filter;
		# anything else has to name what it compared.
		if match_op == "=":
			return "{0} {1}".format(match_value, test)
		mf = r.get("match_field") or ""
		match_label = _child_field_label(table, mf.split("::", 1)[1] if "::" in mf else mf)
		return "{0} (in rows where {1} {2} {3})".format(test, match_label, match_op, match_value)
	# Scalar field — show the label the admin picked it by, not the fieldname.
	try:
		df = frappe.get_meta("Job Applicant").get_field(fn)
		if df and df.label:
			fn = df.label
	except Exception:
		pass
	return "{0} {1} {2}".format(fn, op, val)


def _rule_matches(doc, r):
	"""True when the applicant's data MATCHES this rule — i.e. it fires.

	Scalar rule → ``_passes(doc.get(field), op, value)``.
	Child-table rule (``field_name = "table::field"``) → narrow the child rows with
	the row filter, then fire if any surviving row matches the operator/value. With
	no such row there is nothing for the rule to be true of, so it does not fire.

	The row filter is a full comparison of its own — ``match_field``
	``match_operator`` ``match_value`` — so rows can be narrowed by "Education Stage
	= Graduation" or just as well by "GPA/Percentage ≥ 60". It runs through the same
	``_passes`` as everything else; an older rule with no stored operator keeps its
	original equality behaviour.
	"""
	fn = r.get("field_name") or ""
	if "::" not in fn:
		return _passes(doc.get(fn), r.get("operator"), r.get("value"))

	table, target = fn.split("::", 1)
	# A table picked in the builder but no column chosen yet. There is nothing to
	# compare, so the rule must not fire — without this, "≠" would be true of the
	# missing value and a half-built condition would start rejecting candidates.
	if not target:
		return False

	mf = r.get("match_field") or ""
	match_field = mf.split("::", 1)[1] if "::" in mf else mf
	match_value = cstr(r.get("match_value") or "").strip()
	match_operator = (r.get("match_operator") or "=").strip() or "="
	rows = doc.get(table) or []

	def _matches(row):
		# No filter, or a filter nobody finished — every row is in scope.
		if not match_field or not match_value:
			return True
		return _passes(row.get(match_field), match_operator, match_value)

	matched = [row for row in rows if _matches(row)]
	if not matched:
		return False
	return any(_passes(row.get(target), r.get("operator"), r.get("value")) for row in matched)


SETTINGS_DOCTYPE = "Campus Eligibility Settings"
CAMPUS_CHANNEL = "Campus"
DEFAULTS_APPLIED_FIELD = "custom_eligibility_defaults_applied"


def _is_campus_opening(doc):
	"""True when the opening is posted to the Campus channel (row not disabled)."""
	for row in doc.get("custom_posting_options") or []:
		if (row.get("post_to") or "") == CAMPUS_CHANNEL and (row.get("status") or "Active") != "Inactive":
			return True
	return False


def apply_default_eligibility_rules(doc, method=None):
	"""Seed a campus opening with the default conditions from Campus Eligibility Settings.

	Runs on Job Opening validate, and copies exactly once — the first save on which
	the opening is on the Campus channel. Afterwards ``custom_eligibility_defaults_applied``
	stays set, so the recruiter's edits (including deleting every condition) survive
	every later save, and changing the defaults never rewrites a live opening. The
	builder's "Load defaults" button is the way to pull them in again on purpose.
	"""
	try:
		if doc.get(DEFAULTS_APPLIED_FIELD):
			return
		if not _is_campus_opening(doc):
			return
		if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
			return

		settings = frappe.get_single(SETTINGS_DOCTYPE)
		if not settings.get("apply_to_new_campus_openings"):
			return

		# Never overwrite conditions the recruiter already wrote on this opening.
		if not doc.get(RULES_FIELD):
			for row in settings.get("eligibility_rules") or []:
				if not row.field_name:
					continue
				doc.append(RULES_FIELD, {
					"field_name": row.field_name,
					"match_field": row.match_field or "",
					"match_operator": row.match_operator or "=",
					"match_value": row.match_value or "",
					"operator": row.operator or "=",
					"value": row.value or "",
					"action": row.action or "Knock out",
				})

		if doc.meta.has_field(DEFAULTS_APPLIED_FIELD):
			doc.set(DEFAULTS_APPLIED_FIELD, 1)
	except Exception:
		# Defaults are a convenience — never block saving an opening over them.
		frappe.log_error(frappe.get_traceback(), "Campus eligibility defaults failed")


def evaluate_eligibility(job_applicant):
	"""Evaluate the opening's eligibility rules and set the candidate's outcome.

	Safe to call on any Job Applicant: no-op when there are no rules. ``job_applicant``
	may be a name or a Document.
	"""
	try:
		doc = (
			job_applicant
			if hasattr(job_applicant, "doctype")
			else frappe.get_doc("Job Applicant", job_applicant)
		)
		opening = doc.get("job_title")
		if not opening:
			return

		rules = frappe.get_all(
			"Job Opening Eligibility Rule",
			filters={"parent": opening, "parenttype": "Job Opening", "parentfield": RULES_FIELD},
			fields=["field_name", "match_field", "match_operator", "match_value",
			        "operator", "value", "action"],
			order_by="idx asc",
		)
		if not rules:
			return

		# A rule fires when the candidate MATCHES it — the row on screen reads
		# "when <field> <op> <value> → <action>", and this is that sentence.
		knockouts, flags = [], []
		for r in rules:
			if not r.get("field_name"):
				continue
			if not _rule_matches(doc, r):
				continue
			(knockouts if (r.get("action") or "") == "Knock out" else flags).append(_rule_label(r))

		# Knock out → Rejected · Flag → Hold · nothing matched → Shortlisted. A
		# timeline comment always records the decision + the exact reason.
		if knockouts:
			doc.db_set("status", REJECT_STATUS, update_modified=False)
			doc.db_set("custom_substatus", REJECT_SUBSTATUS, update_modified=False)
			_comment(doc, _("❌ <b>Rejected</b> — matched knock-out condition: {0}").format("; ".join(knockouts)))
		elif flags:
			doc.db_set("status", HOLD_STATUS, update_modified=False)
			doc.db_set("custom_substatus", HOLD_SUBSTATUS, update_modified=False)
			_comment(doc, _("⏸️ <b>On Hold</b> — matched condition to review: {0}").format("; ".join(flags)))
		else:
			doc.db_set("status", PASS_STATUS, update_modified=False)
			_comment(doc, _("✅ <b>Shortlisted</b> — no eligibility condition matched."))
		frappe.db.commit()
	except Exception:
		# Eligibility scoring must never block campus application submission.
		frappe.log_error(frappe.get_traceback(), "Campus eligibility evaluation failed")


def _comment(doc, text):
	try:
		doc.add_comment("Comment", text)
	except Exception:
		pass
