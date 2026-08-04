"""Campus eligibility engine.

When a candidate applies through the campus channel and their Job Applicant is
*submitted*, the linked Job Opening's eligibility rules (``custom_eligibility_rules``)
are evaluated against the applicant's own fields:

  - A failing **Knock out** rule  → candidate is **Rejected** (sub-status
    "Eligibility Not Met").
  - A failing **Flag** rule        → candidate is put on **Hold** (sub-status
    "Eligibility Flagged").
  - All rules pass                 → candidate is **Shortlisted**.

Every outcome logs a comment on the applicant's timeline stating the decision and
the exact rule(s) behind it.

A rule targets either a scalar Job Applicant field (``doc.get(fieldname)``) or a
child-row field (``field_name = "table::field"``, matched by ``match_field`` /
``match_value``).
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

# The child table on Job Applicant that stores education rows, the child doctype
# behind it, and the field on that row that identifies the stage. `qualification`
# is a Link to the "Education Stage" master (a controlled value), so a rule that
# targets "Graduation" matches exactly — no spelling variants, no synonym lists.
EDU_TABLE = "custom_educational_qualification"
EDU_CHILD_DOCTYPE = "Employee Education"
EDU_STAGE_FIELD = "qualification"
EDU_STAGE_MASTER = "Education Stage"
WORK_TABLE = "custom_previous_work_experience"

# Field types that can be compared numerically — these become the per-stage
# Education "targets" (Percentage, Year of Passing, …). Derived from the child
# doctype's schema at runtime, so any numeric field an admin adds to Employee
# Education automatically shows up in the builder.
_TARGET_FIELDTYPES = ("Float", "Int", "Currency", "Percent")


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


def _education_stages():
	"""The stage list, read live from the Education Stage master (ordered)."""
	try:
		return [
			r.name
			for r in frappe.get_all(
				EDU_STAGE_MASTER, fields=["name"], order_by="sequence asc, name asc"
			)
		]
	except Exception:
		return []


def _education_targets():
	"""Comparable child fields (Percentage, Year, …) read from the Employee
	Education schema — never hardcoded. Excludes the stage field itself."""
	out = []
	try:
		cmeta = frappe.get_meta(EDU_CHILD_DOCTYPE)
		for df in cmeta.fields:
			if not df.fieldname or df.fieldname == EDU_STAGE_FIELD:
				continue
			if df.fieldtype in _TARGET_FIELDTYPES:
				out.append(df)
	except Exception:
		pass
	return out


@frappe.whitelist()
def get_eligibility_field_catalog():
	"""Field catalog for the inline eligibility builder, field-first + type-aware.

	Grouped Job Applicant / Education / Work Experience. Each entry carries its
	`fieldtype` + raw `options` so the Value control adapts: Link → link search,
	Select → options dropdown, number → number box, Date → date. Everything is
	derived at runtime — Job Applicant fields from its meta, education stages from
	the Education Stage master, education/work targets from the child schema.
	Values are namespaced: ``ja|<fieldname>`` · ``edu|<stage>|<target>`` · ``we|<fieldname>``.
	"""
	from recruitment.api.applicant_field_options import _SKIP_FIELDTYPES, _TABLE_FIELDTYPES

	meta = frappe.get_meta("Job Applicant")
	ja, seen = [], set()
	for df in meta.fields:
		if df.fieldtype in _SKIP_FIELDTYPES or df.fieldtype in _TABLE_FIELDTYPES:
			continue
		if not df.fieldname or df.fieldname in seen:
			continue
		seen.add(df.fieldname)
		ja.append(_entry("ja|" + df.fieldname, df.label or df.fieldname, df))
	ja.sort(key=lambda x: (x["label"] or "").lower())

	# Education: one direct "which stage" entry (Link → Education Stage master),
	# then, for each stage, one entry per comparable child field.
	edu = []
	try:
		stage_df = frappe.get_meta(EDU_CHILD_DOCTYPE).get_field(EDU_STAGE_FIELD)
		edu.append(_entry(
			"edu||{0}".format(EDU_STAGE_FIELD),
			(stage_df.label if stage_df else "Qualification") + " (candidate has this stage)",
			df=stage_df,
			fieldtype=(stage_df.fieldtype if stage_df else "Link"),
			options=(stage_df.options if stage_df else EDU_STAGE_MASTER),
		))
	except Exception:
		pass
	targets = _education_targets()
	stages = _education_stages()
	for stage in stages:
		for t in targets:
			edu.append(_entry(
				"edu|{0}|{1}".format(stage, t.fieldname),
				"{0} — {1}".format(stage, t.label or t.fieldname),
				df=t,
			))

	we = []
	try:
		wmeta = frappe.get_meta("Employee External Work History")
		for cf in wmeta.fields:
			if cf.fieldtype in _SKIP_FIELDTYPES or cf.fieldtype in _TABLE_FIELDTYPES or not cf.fieldname:
				continue
			we.append(_entry("we|" + cf.fieldname, cf.label or cf.fieldname, cf))
	except Exception:
		pass

	return {
		"sources": [
			{"key": "job_applicant", "label": "Job Applicant"},
			{"key": "education", "label": "Education"},
			{"key": "work_experience", "label": "Work Experience"},
		],
		"fields": {"job_applicant": ja, "education": edu, "work_experience": we},
		# operator sets per field-type family — the UI shows the right ones.
		"operators": {
			"number": ["≥", "≤", "=", "≠", ">", "<"],
			"choice": ["=", "≠", "one of"],
			"text": ["=", "≠", "contains", "one of"],
			"date": ["=", "≠", "≥", "≤", ">", "<"],
			"check": ["="],
		},
	}


@frappe.whitelist()
def get_education_stages():
	"""Stage list from the Education Stage master, for the eligibility builder UI."""
	return [{"value": s, "label": s} for s in _education_stages()]


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
	"""Evaluate one rule. Returns True when the candidate SATISFIES the rule."""
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

	if op == "one of":
		allowed = [x.lower() for x in _as_list(expected)]
		return cstr(actual).strip().lower() in allowed

	if op == "contains":
		return cstr(expected).strip().lower() in cstr(actual).strip().lower()

	# Unknown operator — don't block the candidate.
	return True


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
		stage = (r.get("match_value") or "").strip()
		if stage:
			return "{0} {1} {2} {3}".format(stage, check, op, val).strip()
		return "{0} {1} {2}".format(check, op, val).strip()
	return "{0} {1} {2}".format(fn, op, val)


def _rule_satisfied(doc, r):
	"""True when the applicant meets one eligibility rule.

	Scalar rule → ``_passes(doc.get(field), op, value)``.
	Child-table rule (``field_name = "table::field"``) → look at the child rows,
	keep the ones whose ``match_field`` equals ``match_value`` (the stage is a
	controlled Link value, so an exact case-insensitive match is correct — no
	synonyms needed), and require at least one such row to satisfy the operator/
	value. A rule with no matching row is NOT satisfied (candidate lacks the entry).
	"""
	fn = r.get("field_name") or ""
	if "::" not in fn:
		return _passes(doc.get(fn), r.get("operator"), r.get("value"))

	table, target = fn.split("::", 1)
	mf = r.get("match_field") or ""
	match_field = mf.split("::", 1)[1] if "::" in mf else mf
	match_value = (r.get("match_value") or "").strip().lower()
	rows = doc.get(table) or []

	def _matches(row):
		if not match_field or not match_value:
			return True
		return cstr(row.get(match_field)).strip().lower() == match_value

	matched = [row for row in rows if _matches(row)]
	if not matched:
		return False
	return any(_passes(row.get(target), r.get("operator"), r.get("value")) for row in matched)


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
			fields=["field_name", "match_field", "match_value", "operator", "value", "action"],
			order_by="idx asc",
		)
		if not rules:
			return

		knockouts, flags = [], []
		for r in rules:
			if not r.get("field_name"):
				continue
			if _rule_satisfied(doc, r):
				continue
			(knockouts if (r.get("action") or "") == "Knock out" else flags).append(_rule_label(r))

		# Knock out → Rejected · Flag → Hold · all passed → Shortlisted. A timeline
		# comment on the applicant always records the decision + the exact reason.
		if knockouts:
			doc.db_set("status", REJECT_STATUS, update_modified=False)
			doc.db_set("custom_substatus", REJECT_SUBSTATUS, update_modified=False)
			_comment(doc, _("❌ <b>Rejected</b> — failed eligibility (Knock out): {0}").format("; ".join(knockouts)))
		elif flags:
			doc.db_set("status", HOLD_STATUS, update_modified=False)
			doc.db_set("custom_substatus", HOLD_SUBSTATUS, update_modified=False)
			_comment(doc, _("⏸️ <b>On Hold</b> — eligibility flags to review: {0}").format("; ".join(flags)))
		else:
			doc.db_set("status", PASS_STATUS, update_modified=False)
			_comment(doc, _("✅ <b>Shortlisted</b> — met all eligibility conditions."))
		frappe.db.commit()
	except Exception:
		# Eligibility scoring must never block campus application submission.
		frappe.log_error(frappe.get_traceback(), "Campus eligibility evaluation failed")


def _comment(doc, text):
	try:
		doc.add_comment("Comment", text)
	except Exception:
		pass
