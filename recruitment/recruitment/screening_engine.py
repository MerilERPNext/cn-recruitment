# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt
"""Auto-screening engine for Job Applicant.

HR configures conditions per Job Opening (the `custom_screener_questions` table
plus the pre-screening settings). When a Job Applicant is created — or when a
recruiter clicks "Run Screening" — those conditions are evaluated against the
applicant's own field values **in a background worker** so the submit/event path
stays fast.

Outcome (confirmed product decision):
  - any Precondition fails, or score < pass mark  -> Rejected / "Failed Screening"
  - otherwise                                     -> Shortlisted / "Screening Completed"
While the worker is pending the applicant shows "Screening in Progress".
"""

import frappe
from frappe.utils import cint, flt, now_datetime

# --- status / sub-status the engine writes -------------------------------------
SUBSTATUS_IN_PROGRESS = "Screening in Progress"
SUBSTATUS_PASSED = "Screening Completed"
SUBSTATUS_FAILED = "Failed Screening"

STATUS_PASSED = "Shortlisted"
STATUS_FAILED = "Rejected"

# Statuses past which we should not auto-screen (already decided / moved on).
TERMINAL_STATUSES = {"Shortlisted", "Interview", "Hold", "Approvals", "Accepted", "Rejected"}

NUMERIC_OPERATORS = {">=", "<=", ">", "<"}

# Fieldtypes that don't hold a screenable value (layout / display / system).
NON_VALUE_FIELDTYPES = {
	"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading",
	"Fold", "Table", "Table MultiSelect", "Image", "Barcode", "Geolocation",
}


# ==============================================================================
# Applicant-field registry (sourced from Job Applicant meta)
# ==============================================================================
# ==============================================================================
# Triggers
# ==============================================================================
def on_applicant_insert(doc, method=None):
	"""Job Applicant `after_insert` hook.

	Does almost nothing synchronously: flags the applicant as in-progress and
	enqueues the real evaluation so the insert transaction returns immediately.
	"""
	if not screening_enabled(doc.job_title):
		return

	# Single-field write — cheap, no full save on the hot path.
	doc.db_set("custom_substatus", SUBSTATUS_IN_PROGRESS, update_modified=False)
	doc.db_set("custom_screening_result", "Pending", update_modified=False)
	enqueue_screening(doc.name)


@frappe.whitelist()
def run_screening(applicant):
	"""Manual "Run Screening" trigger. Enqueues and returns immediately."""
	if not frappe.db.exists("Job Applicant", applicant):
		frappe.throw(frappe._("Job Applicant {0} not found").format(applicant))

	job_title = frappe.db.get_value("Job Applicant", applicant, "job_title")
	if not screening_enabled(job_title):
		return {"enqueued": False, "reason": "no_screening_configured"}

	frappe.db.set_value(
		"Job Applicant", applicant, "custom_substatus", SUBSTATUS_IN_PROGRESS,
		update_modified=False,
	)
	enqueue_screening(applicant, after_commit=False)
	return {"enqueued": True}


def enqueue_screening(applicant_name, after_commit=True):
	"""Push the evaluation onto the short worker queue (deduped per applicant)."""
	frappe.enqueue(
		"recruitment.recruitment.screening_engine.run_for_applicant",
		queue="short",
		job_id=f"screen::{applicant_name}",
		deduplicate=True,
		enqueue_after_commit=after_commit,
		applicant=applicant_name,
	)


def run_for_applicant(applicant):
	"""Worker entry point: evaluate, persist the result + status, notify."""
	try:
		doc = frappe.get_doc("Job Applicant", applicant)
		result = evaluate_applicant(doc)
		apply_result(doc, result)
		# If the candidate is on a Screening stage of the hiring workflow, advance
		# (pass) or reject (fail) automatically. No-op unless the feature is on.
		from recruitment.api.hiring_stage import advance_on_screening_result
		advance_on_screening_result(applicant, result["result"] == "Passed")
		frappe.db.commit()
		frappe.publish_realtime(
			"screening_done",
			{"applicant": applicant, "result": result["result"]},
			doctype="Job Applicant",
			docname=applicant,
		)
	except Exception:
		frappe.db.rollback()
		frappe.log_error(
			title="Auto-screening failed",
			message=f"Job Applicant: {applicant}\n{frappe.get_traceback()}",
		)


# ==============================================================================
# Evaluation
# ==============================================================================
def screening_enabled(job_title):
	"""True when the opening has anything to screen on."""
	if not job_title:
		return False
	opening = frappe.db.get_value(
		"Job Opening",
		job_title,
		[
			"custom_min_experience_required",
			"custom_auto_reject_ctc_above",
		],
		as_dict=True,
	)
	if not opening:
		return False
	has_questions = frappe.db.exists(
		"Job Opening Screener Question", {"parent": job_title}
	)
	return bool(
		has_questions
		or flt(opening.custom_min_experience_required)
		or flt(opening.custom_auto_reject_ctc_above)
	)


def evaluate_applicant(doc, opening=None):
	"""Pure evaluation — returns a result dict, writes nothing.

	{
	  "result": "Passed" | "Failed",
	  "score": int, "max_score": int, "pass_mark": int,
	  "precondition_failed": bool, "below_pass_mark": bool,
	  "log": [ {source, question, applicant_field, operator,
	            expected_value, actual_value, passed, points_awarded, reason}, ... ]
	}
	"""
	opening = opening or frappe.get_doc("Job Opening", doc.job_title)

	log = []
	score = 0
	max_score = 0
	precondition_failed = False

	for check in _build_checks(doc, opening):
		passed, actual, points, reason = _evaluate_check(doc, check)

		if check["kind"] == "Score-based":
			max_score += cint(check["score"])
			if passed:
				score += points

		# A failed precondition (or a required, missing field) rejects.
		if check["kind"] == "Precondition" and passed is False:
			precondition_failed = True

		log.append({
			"source": check["source"],
			"question": check["label"],
			"applicant_field": check["applicant_field"],
			"operator": check["operator"],
			"expected_value": check["expected"],
			"actual_value": "" if actual is None else str(actual),
			"passed": 1 if passed else 0,
			"points_awarded": points,
			"reason": reason,
		})

	# An explicit Max score on the opening overrides the summed one.
	configured_max = cint(opening.get("custom_screener_max_score"))
	if configured_max:
		max_score = configured_max

	pass_mark = cint(opening.get("custom_screener_pass_mark"))
	# pass_mark > 0 == "auto-reject below pass mark" is in effect.
	below_pass_mark = bool(pass_mark) and score < pass_mark

	result = "Failed" if (precondition_failed or below_pass_mark) else "Passed"

	return {
		"result": result,
		"score": score,
		"max_score": max_score,
		"pass_mark": pass_mark,
		"precondition_failed": precondition_failed,
		"below_pass_mark": below_pass_mark,
		"log": log,
	}


def apply_result(doc, result):
	"""Persist result fields, the per-condition log, and the status transition."""
	passed = result["result"] == "Passed"

	doc.custom_screening_result = result["result"]
	doc.custom_screening_score = result["score"]
	doc.custom_screening_max_score = result["max_score"]
	doc.custom_screening_evaluated_on = now_datetime()

	doc.set("custom_screening_log", [])
	for row in result["log"]:
		doc.append("custom_screening_log", row)

	doc.status = STATUS_PASSED if passed else STATUS_FAILED
	doc.custom_substatus = SUBSTATUS_PASSED if passed else SUBSTATUS_FAILED

	# Background context — bypass permissions; don't re-fire screening.
	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)


# ==============================================================================
# Building & evaluating individual checks
# ==============================================================================
def _build_checks(doc, opening):
	"""Flatten pre-screening rules + screener questions into a uniform list."""
	checks = []

	# --- pre-screening rules (map onto known applicant fields) ---
	min_exp = flt(opening.get("custom_min_experience_required"))
	if min_exp:
		checks.append(_rule(
			label=f"Minimum experience required ({min_exp} yrs)",
			applicant_field="custom_total_experience",
			operator=">=", expected=min_exp, kind="Precondition",
		))

	max_ctc = flt(opening.get("custom_auto_reject_ctc_above"))
	if max_ctc:
		checks.append(_rule(
			label=f"Auto-reject if expected CTC exceeds {max_ctc}",
			applicant_field="custom_expected_ctc",
			operator="<=", expected=max_ctc, kind="Precondition",
		))

	# --- screener questions ---
	for q in opening.get("custom_screener_questions") or []:
		if q.kind == "Informational" or not q.applicant_field:
			# Informational rows (or rows without a mapped field) are recorded
			# for context only — they never pass/fail or score.
			checks.append({
				"source": "Score-based" if q.kind == "Score-based" else "Precondition",
				"label": q.question,
				"applicant_field": q.applicant_field or "",
				"operator": q.operator or "",
				"expected": q.expected_value,
				"kind": "Informational",
				"score": cint(q.score),
				"answer_type": q.answer_type,
				"required": cint(q.required),
				"on_missing": q.on_missing or "Skip",
			})
			continue

		checks.append({
			"source": q.kind,
			"label": q.question,
			"applicant_field": q.applicant_field,
			"operator": q.operator or "",
			"expected": q.expected_value,
			"kind": q.kind,
			"score": cint(q.score),
			"answer_type": q.answer_type,
			"required": cint(q.required),
			"on_missing": q.on_missing or "Skip",
		})

	return checks


def _rule(label, applicant_field, operator, expected, kind):
	return {
		"source": "Pre-screening Rule",
		"label": label,
		"applicant_field": applicant_field,
		"operator": operator,
		"expected": expected,
		"kind": kind,
		"score": 0,
		"answer_type": "Number",
		"required": 1,
		"on_missing": "Fail",
	}


def _evaluate_check(doc, check):
	"""Return (passed, actual_value, points_awarded, reason).

	`passed` is None for Informational / not-applicable rows.
	"""
	if check["kind"] == "Informational":
		actual = doc.get(check["applicant_field"]) if check["applicant_field"] else None
		return None, actual, 0, "Informational — not scored"

	actual = doc.get(check["applicant_field"])

	if actual in (None, ""):
		# Missing applicant value.
		fails = check["on_missing"] == "Fail" or check["required"]
		reason = "No value on applicant; treated as fail" if fails else "No value on applicant; skipped"
		# Skipped checks are reported as passed=None so they don't reject/score.
		return (False if fails else None), actual, 0, reason

	if not check["operator"]:
		return None, actual, 0, "No condition set"

	passed = _compare(actual, check["operator"], check["expected"], check["answer_type"])

	if check["kind"] == "Score-based":
		points = cint(check["score"]) if passed else 0
		reason = f"Awarded {points} pts" if passed else "Condition not met — 0 pts"
		return passed, actual, points, reason

	# Precondition
	reason = "Precondition met" if passed else "Precondition not met — reject"
	return passed, actual, 0, reason


def _compare(actual, operator, expected, answer_type):
	"""Evaluate one condition. Coerces types based on operator / answer type."""
	# Yes / no answers normalise to a canonical yes/no token.
	if answer_type == "Yes / no":
		actual = _norm_bool(actual)
		expected = _norm_bool(expected)

	if operator in NUMERIC_OPERATORS:
		a_ok, a = _to_number(actual)
		e_ok, e = _to_number(expected)
		if not (a_ok and e_ok):
			return False
		if operator == ">=":
			return a >= e
		if operator == "<=":
			return a <= e
		if operator == ">":
			return a > e
		return a < e

	if operator == "contains":
		return str(expected).strip().lower() in str(actual).strip().lower()

	if operator in ("=", "equals"):
		return _eq(actual, expected)

	if operator == "!=":
		return not _eq(actual, expected)

	return False


# --- coercion helpers ----------------------------------------------------------
def _to_number(value):
	"""(ok, float). Strips currency symbols / commas / stray text."""
	if value is None or value == "":
		return False, 0.0
	if isinstance(value, (int, float)):
		return True, float(value)
	import re
	cleaned = re.sub(r"[^0-9.\-]", "", str(value))
	if cleaned in ("", "-", ".", "-."):
		return False, 0.0
	try:
		return True, float(cleaned)
	except ValueError:
		return False, 0.0


def _eq(a, b):
	"""Equality: numeric when both look numeric, else case-insensitive string."""
	a_ok, an = _to_number(a)
	b_ok, bn = _to_number(b)
	if a_ok and b_ok:
		return an == bn
	return str(a).strip().lower() == str(b).strip().lower()


def _norm_bool(value):
	if value is None:
		return ""
	token = str(value).strip().lower()
	if token in ("yes", "y", "true", "1", "checked"):
		return "yes"
	if token in ("no", "n", "false", "0", "unchecked"):
		return "no"
	return token
