"""Interview feedback collected through the approval matrix.

A row level stage on ``interview_details`` gives each interviewer a task whose form
is the Interview's evaluation form. ``add_result_question`` adds the required Result
(``approval_form_schema`` hook); ``create_feedback_from_approval`` files the answers
as that interviewer's Interview Feedback (``on_approval_form_submit`` hook).

Never raise from the submit hook: nextai commits the submission before it runs. A
feedback that can't be submitted is kept as a draft, with the reason noted on the
Interview.
"""

import copy
import json

import frappe
from frappe import _

from recruitment.api.interview_feedback_form import get_form_schema

INTERVIEW = "Interview"
FEEDBACK = "Interview Feedback"
INTERVIEW_DETAIL = "Interview Detail"

RESULT_KEY = "interview_result"
RESULT_OPTIONS = ("Cleared", "Rejected")

NON_ANSWER_KEYS = {"submit", RESULT_KEY}


def result_component():
	return {
		"label": _("Result"),
		"key": RESULT_KEY,
		"type": "select",
		"widget": "choicesjs",
		"input": True,
		"tableView": True,
		"dataSrc": "values",
		"data": {"values": [{"label": _(o), "value": o} for o in RESULT_OPTIONS]},
		"validate": {"required": True},
	}


def with_result_question(schema):
	"""The schema with a required Result question before any trailing buttons."""
	schema = copy.deepcopy(schema or {})
	components = list(schema.get("components") or [])
	if any(isinstance(c, dict) and c.get("key") == RESULT_KEY for c in components):
		return schema
	at = len(components)
	while at and isinstance(components[at - 1], dict) and components[at - 1].get("type") == "button":
		at -= 1
	components.insert(at, result_component())
	schema["components"] = components
	return schema


def _is_interview_feedback_form(approval_log, tracker):
	"""True when the log's form is the interview's own evaluation form."""
	if not tracker or tracker.get("doc_type") != INTERVIEW:
		return False
	form = approval_log.get("form_for_approval")
	return bool(form) and form == frappe.db.get_value(
		INTERVIEW, tracker.get("doc_name"), "custom_evaluation_form"
	)


# --------------------------------------------------------------------------- #
# nextai hooks
# --------------------------------------------------------------------------- #
def add_result_question(schema, approval_log, tracker):
	"""``approval_form_schema`` hook."""
	if not _is_interview_feedback_form(approval_log, tracker):
		return schema
	return with_result_question(schema)


def create_feedback_from_approval(approval_log, outcome, submission, user_id):
	"""``on_approval_form_submit`` hook — file the answers as Interview Feedback."""
	if outcome != "Approved":
		return
	tracker = frappe.get_doc("Approval Tracker", approval_log.parent)
	if not _is_interview_feedback_form(approval_log, tracker):
		return

	interview = tracker.doc_name
	interviewer = _interviewer_for(approval_log, interview, user_id)
	result = (submission or {}).get(RESULT_KEY)
	answers = {k: v for k, v in (submission or {}).items() if k not in NON_ANSWER_KEYS}

	if result not in RESULT_OPTIONS:
		_note(interview, _("Feedback from {0} was not filed: the form came back without a Result.").format(interviewer))
		return

	frappe.db.savepoint("approval_feedback")
	try:
		feedback = _feedback_doc(interview, interviewer)
		if feedback is None:
			_note(interview, _("{0} has already submitted feedback for this interview.").format(interviewer))
			return
		_fill(feedback, interview, interviewer, result, answers, user_id)
		feedback.flags.ignore_permissions = True
		feedback.save()
		try:
			frappe.db.savepoint("approval_feedback_submit")
			feedback.submit()
		except Exception as e:
			# Keep the answers as a draft that can be submitted later.
			frappe.db.rollback(save_point="approval_feedback_submit")
			frappe.clear_messages()
			_note(
				interview,
				_("Feedback from {0} was saved as draft {1} but could not be submitted: {2}").format(
					interviewer, feedback.name, _message(e)
				),
			)
	except Exception as e:
		frappe.db.rollback(save_point="approval_feedback")
		frappe.clear_messages()
		frappe.log_error(frappe.get_traceback(), "Approval: interview feedback not created")
		_note(interview, _("Feedback from {0} could not be filed: {1}").format(interviewer, _message(e)))


def _interviewer_for(approval_log, interview, user_id):
	"""The panel member on this log's row(s) — the approver when they are on it."""
	rows = [r.strip() for r in (approval_log.get("row_docnames") or "").split(",") if r.strip()]
	if rows:
		panel = frappe.get_all(
			INTERVIEW_DETAIL,
			filters={"name": ["in", rows], "parent": interview},
			pluck="interviewer",
		)
		if user_id in panel:
			return user_id
		if panel and panel[0]:
			return panel[0]
	return user_id


def _feedback_doc(interview, interviewer):
	"""This interviewer's draft to finish, a new one, or None if already submitted."""
	existing = frappe.get_all(
		FEEDBACK,
		filters={"interview": interview, "interviewer": interviewer, "docstatus": ["<", 2]},
		fields=["name", "docstatus"],
		order_by="creation desc",
	)
	if any(f.docstatus == 1 for f in existing):
		return None
	if existing:
		return frappe.get_doc(FEEDBACK, existing[0].name)
	return frappe.new_doc(FEEDBACK)


def _fill(feedback, interview, interviewer, result, answers, user_id):
	iv = frappe.db.get_value(
		INTERVIEW, interview, ["interview_round", "job_applicant", "custom_evaluation_form"], as_dict=True
	)
	feedback.interview = interview
	feedback.interviewer = interviewer
	feedback.interview_round = iv.interview_round
	feedback.job_applicant = iv.job_applicant
	feedback.custom_evaluation_form = iv.custom_evaluation_form
	feedback.custom_form_response = json.dumps(answers, default=str)
	feedback.result = result
	if feedback.meta.has_field("custom_feedback_given_by"):
		feedback.custom_feedback_given_by = user_id


def _note(interview, text):
	try:
		frappe.get_doc(INTERVIEW, interview).add_comment("Comment", text)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Approval: interview feedback note failed")


def _message(e):
	return frappe.utils.strip_html(str(e)) or e.__class__.__name__


# --------------------------------------------------------------------------- #
# Preview from the hiring workflow
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def get_stage_feedback_form_preview(job_applicant, stage_name):
	"""The feedback form tagged on a hiring stage, as interviewers will see it."""
	frappe.has_permission("Job Applicant", "read", doc=job_applicant, throw=True)
	from recruitment.api.hiring_stage import _find_stage, get_applicant_stages

	stages = get_applicant_stages(frappe.get_doc("Job Applicant", job_applicant))
	idx = _find_stage(stages, stage_name)
	widget = stages[idx].get("evaluation_form") if idx >= 0 else None
	if not widget:
		return {}
	schema = get_form_schema(widget)
	if not schema:
		return {"widget": widget}
	return {
		"widget": widget,
		"label": frappe.db.get_value("Microapp Form Widget", widget, "label") or widget,
		"schema": with_result_question(schema),
	}
