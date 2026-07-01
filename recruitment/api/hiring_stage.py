"""Hiring Workflow engine — moves a Job Applicant through the hiring stages
defined on its linked Job Opening (`custom_hiring_stages`).

Flow overview
-------------
1. A Job Opening's "Hiring workflow" tab holds an ordered list of stages
   (Job Opening Hiring Stage), auto-filled from a TA Interview Strategy
   Template. See ``job_opening_hiring_workflow.js``.
2. When a Job Applicant is created for that opening, ``seed_first_stage``
   places them on stage #1 and records the move in ``custom_stage_history``.
3. Recruiters advance candidates with ``move_to_next_stage`` / ``set_stage``
   (the buttons on the Job Applicant form), or reject with
   ``reject_at_current_stage``.
4. For "Interview" stages, ``prepare_interview`` ensures a matching built-in
   Interview Round exists and returns values to prefill a new Interview.
5. When that Interview concludes (Interview Feedback submitted), stages flagged
   ``auto`` advance/reject the candidate automatically via
   ``advance_on_interview_result``.

Everything here is additive and defensive: stage automation never blocks
applicant creation or interview feedback, and the built-in ``status`` field is
kept in sync so existing screens keep working.
"""

import frappe
from frappe import _
from frappe.utils import now_datetime

# Custom fields added on Job Applicant (see recruitment/custom/job_applicant.json)
STAGE_FIELD = "custom_current_stage"
HISTORY_FIELD = "custom_stage_history"

# Job Opening child table that holds the ordered stage list.
STAGES_FIELD = "custom_hiring_stages"


def is_hiring_workflow_enabled():
	"""Master switch — Recruitment Settings → 'Enable Hiring Workflow'.

	When off, the whole feature is dormant and recruitment behaves exactly as it
	did before (no seeding, no buttons, no auto-advance, no auto-fill).
	"""
	return bool(frappe.db.get_single_value("Recruitment Settings", "enable_hiring_workflow"))


@frappe.whitelist()
def is_enabled():
	"""Lightweight flag for client scripts to gate UI."""
	return is_hiring_workflow_enabled()


# --------------------------------------------------------------------------- #
# Reading the workflow definition
# --------------------------------------------------------------------------- #
def get_opening_stages(job_opening):
	"""Return the ordered hiring stages defined on a Job Opening (list of dicts)."""
	if not job_opening:
		return []
	rows = frappe.get_all(
		"Job Opening Hiring Stage",
		filters={
			"parent": job_opening,
			"parenttype": "Job Opening",
			"parentfield": STAGES_FIELD,
		},
		fields=[
			"stage_name", "stage_type", "sla", "sla_unit",
			"owner_role", "notify", "auto", "notes", "idx",
		],
		order_by="idx asc",
	)
	return rows


def _find_stage(stages, stage_name):
	"""Index of ``stage_name`` within the ordered stage list, or -1."""
	for i, s in enumerate(stages):
		if (s.get("stage_name") or "") == (stage_name or ""):
			return i
	return -1


# --------------------------------------------------------------------------- #
# Transition primitives
# --------------------------------------------------------------------------- #
def _append_history(doc, stage, result, interview=None, notes=None):
	doc.append(HISTORY_FIELD, {
		"stage_name": stage.get("stage_name"),
		"stage_type": stage.get("stage_type"),
		"entered_on": now_datetime(),
		"moved_by": frappe.session.user,
		"result": result,
		"interview": interview,
		"notes": notes,
	})


def _enter_stage(doc, stage, result="Moved", interview=None, save=True,
				 ignore_permissions=False, notify=True):
	"""Place ``doc`` into ``stage``: set current stage, log history, sync status."""
	doc.set(STAGE_FIELD, stage.get("stage_name"))
	_append_history(doc, stage, result, interview=interview)

	# Light, non-destructive status sync so existing list/report screens stay
	# meaningful. A "Done" stage means the candidate has cleared the pipeline.
	if (stage.get("stage_type") or "") == "Done":
		doc.status = "Accepted"

	if save:
		doc.save(ignore_permissions=ignore_permissions)
	if notify and stage.get("notify"):
		_notify_stage_entry(doc, stage)
	return stage


def _notify_stage_entry(doc, stage):
	"""Best-effort candidate email on stage entry. Never blocks the transition."""
	try:
		recipient = doc.get("email_id")
		if not recipient:
			return
		subject = _("Update on your application — {0}").format(stage.get("stage_name") or "")
		message = frappe.render_template(
			"Hello {{ name }},<br><br>"
			"Your application for <b>{{ job }}</b> has moved to the "
			"<b>{{ stage }}</b> stage.<br><br>"
			"Regards,<br>Recruitment Team",
			{
				"name": doc.get("applicant_name") or "Candidate",
				"job": doc.get("job_title") or "",
				"stage": stage.get("stage_name") or "",
			},
		)
		frappe.sendmail(
			recipients=[recipient],
			subject=subject,
			message=message,
			reference_doctype="Job Applicant",
			reference_name=doc.name,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: stage notification failed")


# --------------------------------------------------------------------------- #
# Seeding (called from the Job Applicant after_insert hook)
# --------------------------------------------------------------------------- #
def seed_first_stage(doc, method=None):
	"""Place a freshly created Job Applicant on the opening's first stage."""
	try:
		if not is_hiring_workflow_enabled():
			return
		if doc.get(STAGE_FIELD):
			return
		stages = get_opening_stages(doc.get("job_title"))
		if not stages:
			return
		_enter_stage(
			doc, stages[0], result="Applied", ignore_permissions=True, notify=True,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: seed_first_stage failed")


# --------------------------------------------------------------------------- #
# Whitelisted endpoints (Job Applicant form buttons)
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def get_stage_options(job_applicant):
	"""Current stage + the full ordered stage list for the form's controls."""
	if not is_hiring_workflow_enabled():
		return {"enabled": False, "stages": []}

	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1
	current_type = stages[idx].get("stage_type") if idx >= 0 else None
	return {
		"enabled": True,
		"current_stage": current,
		"current_stage_type": current_type,
		"is_last": idx >= 0 and idx == len(stages) - 1,
		"stages": stages,
	}


@frappe.whitelist()
def move_to_next_stage(job_applicant):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	if not stages:
		frappe.throw(_("No hiring stages are defined on the linked Job Opening."))

	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1
	nxt = idx + 1
	if nxt >= len(stages):
		frappe.throw(_("Candidate is already at the final stage."))

	stage = _enter_stage(doc, stages[nxt], result="Moved")
	return {"current_stage": stage.get("stage_name"), "stage_type": stage.get("stage_type")}


@frappe.whitelist()
def set_stage(job_applicant, stage_name):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	idx = _find_stage(stages, stage_name)
	if idx < 0:
		frappe.throw(_("Stage {0} is not part of this Job Opening's workflow.").format(stage_name))

	_enter_stage(doc, stages[idx], result="Set")
	return {"current_stage": stage_name}


@frappe.whitelist()
def reject_at_current_stage(job_applicant, reason=None):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1
	stage = stages[idx] if idx >= 0 else {"stage_name": current or "—", "stage_type": ""}

	_append_history(doc, stage, "Rejected", notes=reason)
	doc.status = "Rejected"
	doc.save()
	return {"status": "Rejected"}


# --------------------------------------------------------------------------- #
# Built-in Interview integration
# --------------------------------------------------------------------------- #
def _ensure_interview_round(stage_name, designation=None):
	"""Return an Interview Round named after the stage, creating it if needed.

	``expected_skill_set`` is a required table on Interview Round; we create the
	master with ``ignore_mandatory`` so recruiters can fill skills later instead
	of being blocked at scheduling time.
	"""
	existing = frappe.db.get_value("Interview Round", {"round_name": stage_name}, "name")
	if existing:
		return existing
	rnd = frappe.new_doc("Interview Round")
	rnd.round_name = stage_name
	if designation:
		rnd.designation = designation
	rnd.flags.ignore_mandatory = True
	rnd.insert(ignore_permissions=True)
	return rnd.name


@frappe.whitelist()
def prepare_interview(job_applicant):
	"""Ensure an Interview Round exists for the candidate's current stage and
	return the values used to prefill a new built-in Interview."""
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1
	if idx < 0:
		frappe.throw(_("Set a hiring stage before scheduling an interview."))

	stage = stages[idx]
	interview_round = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))
	return {
		"job_applicant": doc.name,
		"interview_round": interview_round,
		"designation": doc.get("designation"),
		"job_opening": doc.get("job_title"),
	}


# --------------------------------------------------------------------------- #
# Auto-advance (called after Interview Feedback is submitted)
# --------------------------------------------------------------------------- #
def advance_on_interview_result(interview_name):
	"""Advance / reject the candidate when their interview concludes — but only
	when their current stage is an Interview stage flagged ``auto``."""
	try:
		if not is_hiring_workflow_enabled():
			return
		if not interview_name:
			return
		interview = frappe.get_doc("Interview", interview_name)
		status = interview.get("status")
		if status not in ("Cleared", "Rejected"):
			return
		applicant = interview.get("job_applicant")
		if not applicant:
			return

		doc = frappe.get_doc("Job Applicant", applicant)
		stages = get_opening_stages(doc.get("job_title"))
		current = doc.get(STAGE_FIELD)
		idx = _find_stage(stages, current) if current else -1
		if idx < 0:
			return
		stage = stages[idx]
		if (stage.get("stage_type") or "") != "Interview" or not stage.get("auto"):
			return

		if status == "Rejected":
			_append_history(doc, stage, "Rejected", interview=interview_name)
			doc.status = "Rejected"
			doc.save(ignore_permissions=True)
			return

		# Cleared
		nxt = idx + 1
		if nxt >= len(stages):
			_append_history(doc, stage, "Cleared", interview=interview_name)
			doc.save(ignore_permissions=True)
			return
		_enter_stage(
			doc, stages[nxt], result="Auto (Cleared)",
			interview=interview_name, ignore_permissions=True,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: auto-advance failed")
