"""Campus eligibility engine.

When a candidate applies through the campus channel and their Job Applicant is
*submitted*, the linked Job Opening's eligibility rules (``custom_eligibility_rules``)
are evaluated against the applicant's own fields:

  - A failing **Knock out** rule  → candidate is put on **Hold** with sub-status
    "Eligibility Not Met" and a comment listing what failed.
  - A failing **Flag** rule        → candidate still passes, but the flag is noted.
  - All rules pass                 → candidate is **Shortlisted**.

Each rule stores an ordinary Job Applicant fieldname (the picker is now a Select
sourced from Job Applicant metadata), so evaluation is just ``doc.get(fieldname)``.
"""

import frappe
from frappe import _
from frappe.utils import cstr, flt

HOLD_STATUS = "Hold"
HOLD_SUBSTATUS = "Eligibility Not Met"
PASS_STATUS = "Shortlisted"

RULES_FIELD = "custom_eligibility_rules"


def _to_float(v):
	try:
		return flt(str(v).replace(",", "").strip())
	except Exception:
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
			fields=["field_name", "operator", "value", "action"],
			order_by="idx asc",
		)
		if not rules:
			return

		knockouts, flags = [], []
		for r in rules:
			if not r.get("field_name"):
				continue
			actual = doc.get(r.get("field_name"))
			if _passes(actual, r.get("operator"), r.get("value")):
				continue
			label = "{0} {1} {2}".format(r.get("field_name"), r.get("operator") or "=", r.get("value"))
			(knockouts if (r.get("action") or "") == "Knock out" else flags).append(label)

		if knockouts:
			doc.db_set("status", HOLD_STATUS, update_modified=False)
			doc.db_set("custom_substatus", HOLD_SUBSTATUS, update_modified=False)
			_comment(doc, _("On Hold — eligibility not met: {0}").format("; ".join(knockouts)))
		else:
			doc.db_set("status", PASS_STATUS, update_modified=False)
			if flags:
				_comment(doc, _("Shortlisted with eligibility flags: {0}").format("; ".join(flags)))
		frappe.db.commit()
	except Exception:
		# Eligibility scoring must never block campus application submission.
		frappe.log_error(frappe.get_traceback(), "Campus eligibility evaluation failed")


def _comment(doc, text):
	try:
		doc.add_comment("Comment", text)
	except Exception:
		pass
