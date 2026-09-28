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

from recruitment.api.interview_feedback_form import form_for_interviewer, get_form_schema, interview_forms

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
	"""True when the log is an interviewer's feedback task on an Interview: its
	form is one of the interview's forms, or it is a panel-row task (whose stored
	form may predate a later change — _current_form serves the live one)."""
	if not tracker or tracker.get("doc_type") != INTERVIEW:
		return False
	form = approval_log.get("form_for_approval")
	if not form:
		return False
	# The interview's form, or one panel member's own (interviewers may be given
	# different forms — see interview_feedback_form.form_for_interviewer).
	return form in interview_forms(tracker.get("doc_name")) or _is_panel_row_log(approval_log)


def _is_panel_row_log(approval_log):
	return bool(approval_log.get("is_row_log")) and approval_log.get("row_parentfield") == "interview_details"


def _current_form(approval_log, tracker):
	"""The form this log's interviewer fills in NOW — their own panel-row form or
	the interview's — so a form picked after the task went out still reaches them."""
	interview = tracker.get("doc_name")
	interviewer = _interviewer_for(approval_log, interview, approval_log.get("user"))
	return form_for_interviewer(interview, interviewer)


# --------------------------------------------------------------------------- #
# nextai hooks
# --------------------------------------------------------------------------- #
def add_result_question(schema, approval_log, tracker):
	"""``approval_form_schema`` hook: the interviewer's own form, plus Result."""
	if not _is_interview_feedback_form(approval_log, tracker):
		return schema
	form = _current_form(approval_log, tracker)
	if form and form != approval_log.get("form_for_approval"):
		schema = get_form_schema(form) or schema
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
		# nextai runs this hook BEFORE it records the approval on the log, which is
		# still Pending here. Mark the feedback so close_approval_task_on_feedback
		# leaves this interviewer's task for nextai to approve — cancelling it made
		# nextai treat the approval as already done and drop it.
		feedback.flags.from_approval_task = True
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
	feedback.custom_evaluation_form = form_for_interviewer(interview, interviewer)
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
def _stage_interviews(job_applicant, stage_name):
	"""The applicant's live (not cancelled) interviews for one hiring stage."""
	from recruitment.api.hiring_stage import get_interview_round_field
	from recruitment.api.stage_interview import CANCELLED

	round_field = get_interview_round_field()
	if not round_field:
		return []
	return frappe.get_all(
		INTERVIEW,
		filters={
			"job_applicant": job_applicant,
			round_field: stage_name,
			"docstatus": ["<", 2],
			"status": ["!=", CANCELLED],
		},
		pluck="name",
		order_by="creation asc",
	)


def _form_label(widget):
	return frappe.db.get_value("Microapp Form Widget", widget, "label") or widget


def _full_names(users):
	users = [u for u in dict.fromkeys(users) if u]
	if not users:
		return {}
	return dict(frappe.get_all(
		"User", filters={"name": ["in", users]}, fields=["name", "full_name"], as_list=True
	))


@frappe.whitelist()
def get_stage_feedback_form_preview(job_applicant, stage_name):
	"""Every feedback form a hiring stage uses, as interviewers will see it.

	The stage's own form first, then whatever its interview actually carries — the
	interview's form and each panel member's own — so the preview still works on a
	stage configured without a form but whose interview was given one. ``forms`` is
	the full list; the top-level keys repeat the first entry.
	"""
	frappe.has_permission("Job Applicant", "read", doc=job_applicant, throw=True)
	from recruitment.api.hiring_stage import _find_stage, get_applicant_stages

	stages = get_applicant_stages(frappe.get_doc("Job Applicant", job_applicant))
	idx = _find_stage(stages, stage_name)

	# widget -> interviewers filling it in (empty for a form nobody has yet).
	owners = {}
	stage_form = stages[idx].get("evaluation_form") if idx >= 0 else None
	if stage_form:
		owners[stage_form] = []
	for interview in _stage_interviews(job_applicant, stage_name):
		panel = frappe.get_all(
			INTERVIEW_DETAIL,
			filters={"parent": interview, "parenttype": INTERVIEW},
			pluck="interviewer",
			order_by="idx asc",
		)
		for interviewer in panel or [None]:
			widget = form_for_interviewer(interview, interviewer)
			if widget:
				owners.setdefault(widget, [])
				if interviewer and interviewer not in owners[widget]:
					owners[widget].append(interviewer)

	if not owners:
		return {"forms": []}

	names = _full_names([u for users in owners.values() for u in users])
	forms = []
	for widget, users in owners.items():
		schema = get_form_schema(widget)
		forms.append({
			"widget": widget,
			"label": _form_label(widget),
			"schema": with_result_question(schema) if schema else None,
			"interviewers": [names.get(u) or u for u in users],
		})
	return {**forms[0], "forms": forms}


@frappe.whitelist()
def get_stage_submitted_feedback(job_applicant, stage_name):
	"""Submitted Interview Feedback for a hiring stage, one entry per interviewer.

	A form-based feedback comes back with the form it was filled on and the answers
	(plus Result) to render it read-only; one filed on the standard grid comes back
	with its skill ratings instead.
	"""
	frappe.has_permission("Job Applicant", "read", doc=job_applicant, throw=True)
	from recruitment.api.interview_feedback_form import _parse

	interviews = _stage_interviews(job_applicant, stage_name)
	if not interviews:
		return {"feedback": []}

	meta = frappe.get_meta(FEEDBACK)
	optional = [f for f in (
		"custom_evaluation_form", "custom_form_response", "custom_recommended_region",
		"custom_region_recommendation_reason", "custom_work_location",
	) if meta.has_field(f)]
	rows = frappe.get_all(
		FEEDBACK,
		filters={"interview": ["in", interviews], "docstatus": 1},
		fields=["name", "interview", "interviewer", "result", "feedback", "average_rating", "modified"] + optional,
		order_by="modified asc",
	)
	if not rows:
		return {"feedback": []}

	skills = {}
	for s in frappe.get_all(
		"Skill Assessment",
		filters={"parenttype": FEEDBACK, "parent": ["in", [r.name for r in rows]]},
		fields=["parent", "skill", "rating"],
		order_by="idx asc",
	):
		skills.setdefault(s.parent, []).append({"skill": s.skill, "rating": s.rating})

	names = _full_names([r.interviewer for r in rows])
	schemas = {}
	out = []
	for r in rows:
		widget = r.get("custom_evaluation_form")
		schema = None
		if widget:
			if widget not in schemas:
				s = get_form_schema(widget)
				schemas[widget] = with_result_question(s) if s else None
			schema = schemas[widget]
		answers = _parse(r.get("custom_form_response")) or {}
		extras = [
			(meta.get_label(f), r.get(f))
			for f in ("custom_recommended_region", "custom_region_recommendation_reason", "custom_work_location")
			if r.get(f)
		]
		out.append({
			"name": r.name,
			"interview": r.interview,
			"interviewer": names.get(r.interviewer) or r.interviewer,
			"result": r.result,
			"submitted_on": r.modified,
			"average_rating": r.average_rating,
			"feedback": r.feedback,
			"widget": widget,
			"label": _form_label(widget) if widget else None,
			"schema": schema,
			"data": {**answers, RESULT_KEY: r.result} if schema else None,
			"skills": skills.get(r.name, []),
			"extras": [{"label": label, "value": value} for label, value in extras],
		})
	return {"feedback": out}


# --------------------------------------------------------------------------- #
# Keeping the approval tasks in step with the hiring workflow
# --------------------------------------------------------------------------- #
# On a site whose Approval Policy Matrix sends Interview feedback out per panel
# row, the interviewers' tasks ARE those approval logs — created once, when the
# Interview is first saved. These keep them true afterwards: forms picked later,
# a cancelled interview, a changed panel, feedback given straight on the form.
TRACKER = "Approval Tracker"
LOG = "Approval Log Entry"


def _pending_panel_logs(interview):
	trackers = frappe.get_all(
		TRACKER, filters={"doc_type": INTERVIEW, "doc_name": interview, "status": "Pending"}, pluck="name"
	)
	if not trackers:
		return []
	return frappe.get_all(
		LOG,
		filters={"parent": ["in", trackers], "parenttype": TRACKER, "is_row_log": 1,
		         "row_parentfield": "interview_details", "status": "Pending"},
		fields=["name", "parent", "user", "todo_reference", "form_for_approval", "row_docnames"],
	)


def _log_user(log):
	return log.get("user") or (
		frappe.db.get_value("ToDo", log.todo_reference, "allocated_to") if log.get("todo_reference") else None
	)


def has_live_approval(interview):
	"""True when the interviewers' feedback tasks are nextai approval logs."""
	return bool(_pending_panel_logs(interview))


def approval_task_users(interview):
	"""Interviewers holding a pending approval task on ``interview``."""
	return {u for u in (_log_user(log) for log in _pending_panel_logs(interview)) if u}


def sync_approval_forms(interview):
	"""Point each pending task at its interviewer's current form. Never raises."""
	try:
		for log in _pending_panel_logs(interview):
			form = form_for_interviewer(interview, _log_user(log))
			if form and form != log.form_for_approval:
				frappe.db.set_value(LOG, log.name, "form_for_approval", form, update_modified=False)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Interview approval: form sync failed")


def cancel_approval_tasks(interview, users=None, reason=None):
	"""Cancel pending panel tasks (all, or only ``users``'). With no ``users`` the
	whole approval is revoked — the interview itself is off. Never raises."""
	try:
		logs = _pending_panel_logs(interview)
		if users is not None:
			users = set(users)
			logs = [log for log in logs if _log_user(log) in users]
		for log in logs:
			values = {"status": "Cancelled"}
			if reason:
				values["delegation_notes"] = reason
			frappe.db.set_value(LOG, log.name, values, update_modified=False)
			if log.todo_reference and frappe.db.exists("ToDo", log.todo_reference):
				frappe.db.set_value("ToDo", log.todo_reference, "status", "Cancelled", update_modified=False)
		if users is None:
			for tracker in frappe.get_all(
				TRACKER, filters={"doc_type": INTERVIEW, "doc_name": interview, "status": "Pending"}, pluck="name"
			):
				frappe.db.set_value(TRACKER, tracker, "status", "Revoked", update_modified=False)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Interview approval: task cancel failed")


# doc_events --------------------------------------------------------------- #
def sync_forms_on_interview_update(doc, method=None):
	"""Interview on_update: forms picked or changed after the tasks went out."""
	if doc.get("status") != "Cancelled":
		sync_approval_forms(doc.name)


def close_approval_task_on_feedback(doc, method=None):
	"""Interview Feedback on_submit: feedback given straight on the Interview form
	(not through the task) settles that interviewer's task, so it doesn't linger in
	their Tasks list. Feedback filed FROM the task is left alone: nextai approves
	that task itself right after this hook, and needs it still Pending to do so."""
	if (getattr(doc, "flags", None) or {}).get("from_approval_task"):
		return
	if doc.get("interview") and doc.get("interviewer"):
		cancel_approval_tasks(doc.interview, users=[doc.interviewer],
		                      reason=_("Feedback submitted on the Interview form."))


def reconcile_interview_approval(doc, method=None):
	"""Approval Tracker on_update: nextai creates the interviewers' tasks after the
	Interview's save has committed, so anything settled before that — a form given
	per interviewer, feedback already in, the interview cancelled — is applied to
	the tasks here, when they land. Writes rows directly, so it can't re-trigger
	itself. Never raises."""
	if doc.get("doc_type") != INTERVIEW or doc.get("status") != "Pending" or not doc.get("doc_name"):
		return
	interview = doc.doc_name
	try:
		if frappe.db.get_value(INTERVIEW, interview, "status") == "Cancelled":
			cancel_approval_tasks(interview, reason=_("Interview cancelled."))
			return
		sync_approval_forms(interview)
		done = frappe.get_all(FEEDBACK, filters={"interview": interview, "docstatus": 1}, pluck="interviewer")
		if done:
			cancel_approval_tasks(interview, users=done, reason=_("Feedback already submitted."))
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Interview approval: reconcile failed")
