"""Interview-stage actions on the hiring workflow (hiring_workflow_flow.js).

* **Cancel** an interview that has not happened. A Pending interview is a draft,
  and Frappe cannot cancel a draft (HRMS lets only Cleared / Rejected interviews be
  submitted), so it is marked with the ``Cancelled`` status instead. It stays on
  record, drops out of its stage, and the stage can be scheduled again.
* **Reschedule** it — a new date / time and, if needed, a different panel.
* **Feedback tasks** — the evaluation form picked at the feedback step goes to
  every interviewer still owing feedback as a ToDo, which is what their Tasks list
  shows. The ToDo opens the Interview, where the existing feedback dialog renders
  that form, and it closes itself once they submit.

Cancel and reschedule are refused for anything that is already under way: the
guard lives in :func:`change_blocker`, which the flow also uses to grey the
buttons out, so the screen and the server cannot disagree.
"""

import json

import frappe
from frappe import _
from frappe.utils import cint, get_datetime, getdate, now_datetime, today

from recruitment.api.interview_feedback_approval import (
	approval_task_users,
	cancel_approval_tasks,
	has_live_approval,
	sync_approval_forms,
)
from recruitment.recruitment.communication_log import sendmail_with_log

INTERVIEW = "Interview"
FEEDBACK = "Interview Feedback"
FORM_WIDGET = "Microapp Form Widget"

CANCELLED = "Cancelled"
# Still waiting to happen — the only states a panel or a date may change in.
CHANGEABLE_STATUSES = ("Pending", "Not Appeared")
# The interview is over: nobody owes feedback any more.
DECIDED_STATUSES = ("Cleared", "Rejected", CANCELLED)

# Doc types an evaluation form may be built on (same as the Interview form's query).
FORM_DOC_TYPES = (FEEDBACK, INTERVIEW)

# Tags the ToDos this module creates, so closing them never touches anybody
# else's — nextai approval ToDos on the same Interview in particular.
TASK_MARKER = "interview-feedback-task"


# --------------------------------------------------------------------------- #
# Guards
# --------------------------------------------------------------------------- #
def _load(job_applicant, interview):
	from recruitment.api.hiring_stage import _require_applicant_write

	_require_applicant_write(job_applicant)
	iv = frappe.get_doc(INTERVIEW, interview)
	if iv.job_applicant != job_applicant:
		frappe.throw(_("Interview {0} does not belong to this candidate.").format(interview))
	return iv


def has_live_meeting(iv):
	"""A Teams meeting is booked for this interview and not yet cancelled."""
	return bool(iv.get("custom_calendar_event_id")) and iv.get("custom_meeting_status") != CANCELLED


def change_blocker(iv, feedback_given):
	"""Why this interview can't be cancelled or rescheduled, or None if it can.

	``iv`` is a doc or a dict carrying docstatus, status, custom_campus_drive and
	the Teams meeting fields; ``feedback_given`` is its submitted-feedback count.
	"""
	if iv.get("custom_campus_drive"):
		return _("Campus interviews are managed from their Campus Drive.")
	if cint(iv.get("docstatus")) != 0:
		return _("A submitted interview can't be changed.")
	status = iv.get("status") or "Pending"
	if status not in CHANGEABLE_STATUSES:
		return _("This interview is {0} and can no longer be changed.").format(_(status))
	if feedback_given:
		return _("Feedback has already been submitted for this interview.")
	if has_live_meeting(iv):
		# The meeting belongs to its organiser's Microsoft account, so only they
		# can cancel it — doing it here would leave a live invite behind.
		return _("A Teams meeting is booked for this interview. Cancel the meeting from the Interview form first.")
	return None


def _submitted_by(interview):
	return set(frappe.get_all(
		FEEDBACK, filters={"interview": interview, "docstatus": 1}, pluck="interviewer"
	))


def _assert_changeable(iv):
	reason = change_blocker(iv, len(_submitted_by(iv.name)))
	if reason:
		frappe.throw(reason, title=_("Not Allowed"))


def _panel(iv):
	return [r.interviewer for r in (iv.get("interview_details") or []) if r.interviewer]


def _candidate(job_applicant):
	# Through the doc, not a column read: a site that hasn't migrated the derived
	# `custom_full_name` yet must still get a name.
	doc = frappe.get_cached_doc("Job Applicant", job_applicant)
	return doc.get("custom_full_name") or doc.get("applicant_name") or job_applicant


def _when(iv):
	bits = [frappe.format(iv.scheduled_on, {"fieldtype": "Date"}) if iv.scheduled_on else ""]
	if iv.from_time:
		# A saved Time comes back as a timedelta, whose str() is "9:30:00" before
		# 10am — slicing that printed "9:30:". Format it properly instead.
		hhmm = lambda t: frappe.utils.get_time(t).strftime("%H:%M")  # noqa: E731
		bits.append(hhmm(iv.from_time) + (" - " + hhmm(iv.to_time) if iv.to_time else ""))
	return " ".join(b for b in bits if b)


def _round(iv):
	from recruitment.api.hiring_stage import get_interview_round_field

	field = get_interview_round_field() or "interview_round"
	return iv.get(field) or ""


def _notify(recipients, subject, message, interview):
	"""Best effort: a mail server hiccup must not undo the change itself."""
	recipients = [r for r in dict.fromkeys(recipients or []) if r]
	if not recipients:
		return
	try:
		sendmail_with_log(
			recipients=recipients,
			subject=subject,
			message=message,
			reference_doctype=INTERVIEW,
			reference_name=interview,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: interview notification failed")


def _log(iv, text):
	"""The same note on the Interview and on the candidate's timeline."""
	for doctype, name in ((INTERVIEW, iv.name), ("Job Applicant", iv.job_applicant)):
		try:
			frappe.get_doc(doctype, name).add_comment("Comment", text)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Hiring Workflow: interview note failed")


# --------------------------------------------------------------------------- #
# Cancel
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def cancel_interview(job_applicant, interview, reason=None):
	"""Mark an interview that has not taken place as Cancelled."""
	reason = (reason or "").strip()
	if not reason:
		frappe.throw(_("Give a reason for cancelling the interview."))
	iv = _load(job_applicant, interview)
	_assert_changeable(iv)

	panel = _panel(iv)
	iv.status = CANCELLED
	# Permission was checked on the candidate above; recruiters drive the
	# workflow without necessarily holding write on every Interview.
	iv.flags.ignore_permissions = True
	iv.save()
	close_feedback_tasks(iv.name)
	# And the panel's approval tasks, where feedback goes out through the matrix.
	cancel_approval_tasks(iv.name, reason=_("Interview cancelled: {0}").format(reason))

	candidate = _candidate(job_applicant)
	# Names and the round reach HTML (timeline note, mail body): escaped. The
	# candidate's name comes from the portal. Subjects are plain text.
	h = frappe.utils.escape_html
	_log(iv, _("Interview {0} ({1}) cancelled. Reason: {2}").format(iv.name, h(_round(iv)), h(reason)))
	_notify(
		panel,
		_("Interview cancelled — {0}").format(candidate),
		_("Hello,<br><br>The <b>{0}</b> interview with <b>{1}</b> scheduled for {2} has been cancelled."
		  "<br><br>Reason: {3}<br><br>Regards,<br>Recruitment Team").format(
			h(_round(iv)), h(candidate), _when(iv), h(reason)),
		iv.name,
	)
	return {"interview": iv.name, "status": CANCELLED}


# --------------------------------------------------------------------------- #
# Reschedule
# --------------------------------------------------------------------------- #
def _parse_users(interviewers):
	if isinstance(interviewers, str):
		try:
			interviewers = json.loads(interviewers)
		except ValueError:
			interviewers = interviewers.split(",")
	users = [u.strip() for u in (interviewers or []) if u and u.strip()]
	return list(dict.fromkeys(users))


def _assert_valid_panel(users):
	if not users:
		frappe.throw(_("Select at least one interviewer."))
	enabled = set(frappe.get_all("User", filters={"name": ["in", users], "enabled": 1}, pluck="name"))
	bad = [u for u in users if u not in enabled]
	if bad:
		frappe.throw(_("These interviewers are not active users: {0}").format(", ".join(bad)))


@frappe.whitelist()
def reschedule_interview(job_applicant, interview, scheduled_on, from_time, to_time,
                         interviewers, reason=None):
	"""Move an interview to a new slot and/or hand it to a different panel.

	Interviewers kept on the panel keep their rows; anyone taken off loses the
	interview (access follows the panel) and any feedback task they were given.
	"""
	iv = _load(job_applicant, interview)
	_assert_changeable(iv)

	users = _parse_users(interviewers)
	_assert_valid_panel(users)
	if not (scheduled_on and from_time and to_time):
		frappe.throw(_("Date, From Time and To Time are required."))
	start = get_datetime(f"{scheduled_on} {from_time}")
	end = get_datetime(f"{scheduled_on} {to_time}")
	if end <= start:
		frappe.throw(_("To Time must be after From Time."))
	if start <= now_datetime():
		frappe.throw(_("The new slot must be in the future."))

	old_panel = _panel(iv)
	old_when = _when(iv)
	same_slot = (
		iv.scheduled_on and getdate(iv.scheduled_on) == getdate(scheduled_on)
		and get_datetime(f"{scheduled_on} {iv.from_time}") == start
		and get_datetime(f"{scheduled_on} {iv.to_time}") == end
	)
	if same_slot and old_panel == users:
		frappe.throw(_("Nothing to change — the slot and the panel are the same."))

	removed = [u for u in old_panel if u not in users]
	added = [u for u in users if u not in old_panel]

	# HRMS marks the slot set-only-once (its own reschedule_interview db_sets it
	# too), so it is written straight to the row; the rest goes through save().
	iv.db_set({"scheduled_on": scheduled_on, "from_time": from_time, "to_time": to_time})
	iv.reload()
	# A candidate who didn't turn up gets another go.
	iv.status = "Pending"
	if iv.meta.has_field("reminded"):
		iv.reminded = 0  # so HRMS reminds the panel for the new slot
	iv.set("interview_details", [r for r in iv.get("interview_details") if r.interviewer in users])
	for u in added:
		iv.append("interview_details", {"interviewer": u})
	iv.flags.ignore_permissions = True
	iv.save()
	close_feedback_tasks(iv.name, users=removed)
	candidate = _candidate(job_applicant)
	if removed:
		cancel_approval_tasks(iv.name, users=removed, reason=_("Taken off the panel on reschedule."))
	# The matrix hands out tasks once, when the interview is first saved, so a
	# newcomer would never get one — give them the fallback task instead.
	if added and has_live_approval(iv.name):
		create_feedback_tasks(iv, added, candidate)
	names = dict(frappe.get_all("User", filters={"name": ["in", users + removed]},
	                            fields=["name", "full_name"], as_list=True))
	h = frappe.utils.escape_html
	# Escaped: panel names go into the timeline note and the mail body (HTML).
	label = lambda us: h(", ".join(names.get(u) or u for u in us))  # noqa: E731
	note = _("Interview {0} rescheduled from {1} to {2}.").format(iv.name, old_when, _when(iv))
	if added or removed:
		note += " " + _("Panel: {0}.").format(label(users))
	if (reason or "").strip():
		note += " " + _("Reason: {0}").format(frappe.utils.escape_html(reason.strip()))
	_log(iv, note)

	_notify(
		users,
		_("Interview rescheduled — {0}").format(candidate),
		_("Hello,<br><br>The <b>{0}</b> interview with <b>{1}</b> is now scheduled for <b>{2}</b>."
		  "<br>Panel: {3}<br><br><a href='{4}'>Open the interview</a><br><br>Regards,<br>Recruitment Team").format(
			h(_round(iv)), h(candidate), _when(iv), label(users),
			frappe.utils.get_url("/app/interview/" + iv.name)),
		iv.name,
	)
	_notify(
		removed,
		_("Interview reassigned — {0}").format(candidate),
		_("Hello,<br><br>You are no longer on the panel for the <b>{0}</b> interview with <b>{1}</b> "
		  "(previously {2}). No action is needed from you.<br><br>Regards,<br>Recruitment Team").format(
			h(_round(iv)), h(candidate), old_when),
		iv.name,
	)
	return {"interview": iv.name, "added": added, "removed": removed}


# --------------------------------------------------------------------------- #
# Feedback tasks
# --------------------------------------------------------------------------- #
def validate_evaluation_form(widget):
	"""Refuse a form the Interview form's own picker would not offer."""
	row = frappe.db.get_value(FORM_WIDGET, widget, ["doc_type", "is_archived"], as_dict=True)
	if not row:
		frappe.throw(_("Feedback form {0} does not exist.").format(widget))
	if cint(row.is_archived):
		frappe.throw(_("Feedback form {0} is archived.").format(widget))
	if row.doc_type not in FORM_DOC_TYPES:
		frappe.throw(_("Feedback form {0} is not an interview evaluation form.").format(widget))


def set_evaluation_form(iv, widget):
	"""Point the interview at ``widget`` — only while nobody has started feedback
	on another form, so one interview's answers are never split across two."""
	if not widget or widget == iv.get("custom_evaluation_form"):
		return
	validate_evaluation_form(widget)
	if frappe.db.exists(FEEDBACK, {"interview": iv.name, "docstatus": ["<", 2]}):
		frappe.throw(
			_("Feedback has already been started on form {0}, so the form can't be changed now.").format(
				iv.get("custom_evaluation_form") or _("the standard skill assessment")),
			title=_("Form Locked"),
		)
	iv.db_set("custom_evaluation_form", widget)
	sync_approval_forms(iv.name)


def set_interviewer_forms(iv, forms):
	"""Give panel members their own forms: ``{interviewer: widget}``.

	A blank widget puts the interviewer back on the interview's Evaluation Form.
	Each interviewer's form is locked on its own once THEY have started feedback —
	a colleague's draft doesn't stop the rest of the panel being re-assigned.
	Returns the interviewers whose form actually changed.
	"""
	from recruitment.api.interview_feedback_form import ROW_FORM_FIELD, form_for_interviewer

	if not frappe.get_meta("Interview Detail").has_field(ROW_FORM_FIELD):
		frappe.throw(_("Per-interviewer forms need a migrate on this site (Interview Detail has no Feedback Form column yet)."))
	rows = {r.interviewer: r for r in (iv.get("interview_details") or []) if r.interviewer}
	unknown = [u for u in forms if u not in rows]
	if unknown:
		frappe.throw(_("Not on this interview's panel: {0}").format(", ".join(unknown)))

	started = set(frappe.get_all(
		FEEDBACK, filters={"interview": iv.name, "docstatus": ["<", 2]}, pluck="interviewer"
	))
	changed = []
	for user, widget in forms.items():
		widget = widget or None
		current = form_for_interviewer(iv.name, user)
		effective = widget or iv.get("custom_evaluation_form")
		if effective == current and (rows[user].get(ROW_FORM_FIELD) or None) == widget:
			continue
		if widget:
			validate_evaluation_form(widget)
		if user in started and effective != current:
			frappe.throw(
				_("{0} has already started feedback on {1}, so their form can't be changed now.").format(
					user, current or _("the standard skill assessment")),
				title=_("Form Locked"),
			)
		frappe.db.set_value("Interview Detail", rows[user].name, ROW_FORM_FIELD, widget)
		if effective != current:
			changed.append(user)
	sync_approval_forms(iv.name)
	return changed


def _open_tasks(interview, users=None):
	filters = {
		"reference_type": INTERVIEW,
		"reference_name": interview,
		"status": "Open",
		"description": ["like", f"%{TASK_MARKER}%"],
	}
	if users is not None:
		filters["allocated_to"] = ["in", users]
	return frappe.get_all("ToDo", filters=filters, fields=["name", "allocated_to"])


def create_feedback_tasks(iv, users, candidate):
	"""One open ToDo per interviewer in ``users`` — never a second one. Each task
	names the form that interviewer fills in."""
	from recruitment.api.interview_feedback_form import form_for_interviewer

	have = {t.allocated_to for t in _open_tasks(iv.name, users)}
	created = []
	for user in users:
		if user in have:
			continue
		form = form_for_interviewer(iv.name, user)
		form_label = (frappe.db.get_value(FORM_WIDGET, form, "label") or form) if form else None
		desc = _("Submit interview feedback for <b>{0}</b> — {1} ({2})").format(
			frappe.utils.escape_html(candidate), frappe.utils.escape_html(_round(iv)), iv.name)
		if form_label:
			desc += "<br>" + _("Form: {0}").format(frappe.utils.escape_html(form_label))
		todo = frappe.get_doc({
			"doctype": "ToDo",
			"allocated_to": user,
			"assigned_by": frappe.session.user,
			"reference_type": INTERVIEW,
			"reference_name": iv.name,
			"priority": "High",
			"date": today(),
			"description": f'{desc}<span class="{TASK_MARKER}"></span>',
		})
		todo.insert(ignore_permissions=True)
		created.append(user)
	return created


def close_feedback_tasks(interview, users=None, status=None):
	"""Close this module's open feedback ToDos on ``interview`` (optionally only
	``users``'). ``status`` defaults to Cancelled; callers settling a decided
	interview pass "Closed"."""
	if users is not None and not users:
		return
	for t in _open_tasks(interview, users):
		todo = frappe.get_doc("ToDo", t.name)
		todo.status = status or "Cancelled"
		todo.flags.ignore_permissions = True
		todo.save()


# doc_events --------------------------------------------------------------- #
def close_task_on_feedback(doc, method=None):
	"""Interview Feedback on_submit: that interviewer's task is done."""
	if doc.get("interview") and doc.get("interviewer"):
		close_feedback_tasks(doc.interview, users=[doc.interviewer], status="Closed")


def close_tasks_when_decided(doc, method=None):
	"""Interview on_update: a decided or cancelled interview owes nobody feedback."""
	status = doc.get("status")
	if status in DECIDED_STATUSES:
		close_feedback_tasks(doc.name, status="Cancelled" if status == CANCELLED else "Closed")


def block_feedback_on_cancelled(doc, method=None):
	"""Interview Feedback validate: nothing is filed against a cancelled interview."""
	if doc.get("interview") and frappe.db.get_value(INTERVIEW, doc.interview, "status") == CANCELLED:
		frappe.throw(_("Interview {0} was cancelled; feedback can't be recorded against it.").format(doc.interview))


# --------------------------------------------------------------------------- #
# Interview stages added for one candidate
# --------------------------------------------------------------------------- #
def _extra_stage_context(job_applicant):
	"""The candidate, their stages and where they stand — refusing anyone whose
	flow can't take a per-candidate stage."""
	from recruitment.api.hiring_stage import (
		STAGE_FIELD, _find_stage, _require_applicant_write, get_applicant_stages,
		is_hiring_workflow_enabled,
	)

	_require_applicant_write(job_applicant)
	if not is_hiring_workflow_enabled():
		frappe.throw(_("The Hiring Workflow is disabled in Recruitment Settings."))
	doc = frappe.get_doc("Job Applicant", job_applicant)
	if not doc.meta.has_field("custom_extra_hiring_stages"):
		frappe.throw(_("Adding stages needs a migrate on this site."))
	# Campus candidates run on their drive's rounds, which the drive schedules
	# and caches per opening — a stage for one of them would never be scheduled.
	if doc.get("custom_campus_drive") or doc.get("custom_campus_invite"):
		frappe.throw(_("Campus candidates follow their Campus Drive's rounds; stages can't be added for them."))
	if doc.status in ("Rejected", "Accepted"):
		frappe.throw(_("This candidate is {0}; their hiring flow is closed.").format(_(doc.status)))
	stages = get_applicant_stages(doc)
	current = _find_stage(stages, doc.get(STAGE_FIELD)) if doc.get(STAGE_FIELD) else -1
	if current < 0:
		frappe.throw(_("Place the candidate on a hiring stage first."))
	return doc, stages, current


@frappe.whitelist()
def add_interview_stage(job_applicant, stage_name, after_stage=None, evaluation_form=None,
                        is_mandatory=0):
	"""Add an Interview stage to THIS candidate's flow only.

	It goes directly after ``after_stage`` (default: the stage they are on), which
	must be their current stage or a later one — never behind them, where it would
	count as skipped, and never after the offer stages, which always close the flow.
	"""
	from recruitment.api.hiring_stage import EXTRA_STAGES_FIELD, OFFER_STAGE_TYPES, _find_stage

	doc, stages, current = _extra_stage_context(job_applicant)
	stage_name = " ".join((stage_name or "").split())
	if not stage_name:
		frappe.throw(_("Give the new stage a name."))
	if len(stage_name) > 120:
		frappe.throw(_("Keep the stage name under 120 characters."))
	if any((s.get("stage_name") or "").strip().lower() == stage_name.lower() for s in stages):
		frappe.throw(_("This candidate already has a stage called {0}.").format(frappe.bold(stage_name)))

	after_stage = after_stage or stages[current].get("stage_name")
	at = _find_stage(stages, after_stage)
	if at < 0:
		frappe.throw(_("Stage {0} is not in this candidate's flow.").format(after_stage))
	if at < current:
		frappe.throw(_("The candidate has already passed {0}; add the stage after where they are now.").format(
			frappe.bold(after_stage)))
	if (stages[at].get("stage_type") or "") in OFFER_STAGE_TYPES:
		frappe.throw(_("Interview stages go before the offer stages."))
	if evaluation_form:
		validate_evaluation_form(evaluation_form)

	doc.append(EXTRA_STAGES_FIELD, {
		"stage_type": "Interview",
		"stage_name": stage_name,
		"after_stage": after_stage,
		"evaluation_form": evaluation_form or None,
		"is_mandatory": cint(is_mandatory),
		"owner_role": "Recruiter",
		"notify": 0,
		"auto": 1,
		"notes": _("Added for this candidate by {0}").format(frappe.session.user),
	})
	doc.save(ignore_permissions=True)  # permission checked in _extra_stage_context
	doc.add_comment("Comment", _("Added interview stage <b>{0}</b> after {1}.").format(
		frappe.utils.escape_html(stage_name), frappe.utils.escape_html(after_stage)))
	return {"stage_name": stage_name, "after_stage": after_stage}


@frappe.whitelist()
def remove_interview_stage(job_applicant, stage_name):
	"""Take back a stage added for this candidate, while it is still ahead of them
	and nothing has been scheduled for it. The opening's own stages can't be removed
	here — skipping one is what "Mark as Not Required" is for."""
	from recruitment.api.hiring_stage import (
		EXTRA_STAGES_FIELD, _find_stage, _find_stage_interview, _round_title_field,
		get_interview_round_doctype,
	)

	doc, stages, current = _extra_stage_context(job_applicant)
	row = next((r for r in doc.get(EXTRA_STAGES_FIELD) or [] if r.stage_name == stage_name), None)
	if not row:
		frappe.throw(_("{0} was not added for this candidate, so it can't be removed.").format(frappe.bold(stage_name)))
	if _find_stage(stages, stage_name) <= current:
		frappe.throw(_("The candidate has already reached {0}; it can't be removed now.").format(frappe.bold(stage_name)))
	# Look the round up — never create one just to check.
	round_doctype = get_interview_round_doctype()
	title = _round_title_field(round_doctype) if round_doctype else None
	round_name = round_doctype and frappe.db.get_value(round_doctype, {title or "name": stage_name}, "name")
	interview = round_name and _find_stage_interview(doc.name, round_name)
	if interview:
		frappe.throw(_("Interview {0} is scheduled for this stage. Cancel it first.").format(interview))

	# Stages added after this one keep their place in the flow.
	for other in doc.get(EXTRA_STAGES_FIELD):
		if other.after_stage == stage_name:
			other.after_stage = row.after_stage
	doc.remove(row)
	doc.save(ignore_permissions=True)
	doc.add_comment("Comment", _("Removed interview stage <b>{0}</b>.").format(frappe.utils.escape_html(stage_name)))
	return {"removed": stage_name}
