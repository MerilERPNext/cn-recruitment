"""TA SLA & TAT engine.

Makes the **TA SLA Settings** single-doctype functional. It reads the admin's
configuration and, *only when configured*, computes recruitment Turn Around
Times (TAT) and flags stage SLA breaches. Nothing here runs — and nothing about
existing recruitment behaviour changes — unless:

	1. Recruitment Settings -> "Enable SLA & TAT Tracking" is ON, **and**
	2. TA SLA Settings actually holds the relevant configuration
	   (TAT start/end points, SLA task durations, or target rows).

Everything is additive and defensive: every public entry point returns an empty
/ no-op result when the feature is disabled or unconfigured, and every resolver
returns ``None`` (rather than raising) when a timestamp cannot be determined, so
a partially-configured setup degrades gracefully instead of breaking.

Three capabilities
------------------
* **TAT metrics** — Time to Fill / Time to Hire / Time to First Action, each
  measured between the Start and End "points" the admin picked, and compared
  against the Target TAT for the candidate's recruiter (User) or Designation.
  Read-only; surfaced through :func:`get_applicant_tat` and the
  "TA SLA and TAT" report. No side effects.
* **SLA breach detection** — a daily scheduler scan (:func:`scan_sla_breaches`)
  that checks how long each active candidate has sat in its current hiring
  stage against the matching SLA Task duration, and raises a ToDo for the
  recruiter when the duration is exceeded (once per stage entry).
* **Archival** — the same ToDos are auto-closed by
  :func:`archive_sla_breach_todos` after the task's Archival Duration, keeping
  the engine self-contained (it only ever touches artefacts it created).
"""

import frappe
from frappe.utils import cint, date_diff, get_datetime, getdate, now_datetime

SETTINGS_DOCTYPE = "TA SLA Settings"

# Marker prefix on every ToDo the engine creates, so archival/dedupe only ever
# touch our own artefacts (never a user's or another feature's ToDo).
SLA_TODO_MARKER = "[TA-SLA]"


# --------------------------------------------------------------------------- #
# Gating
# --------------------------------------------------------------------------- #
def is_enabled():
	"""Master switch. False when the flag is off — or when the field doesn't
	exist yet (e.g. before migrate), which raises rather than returning None, so
	we swallow it and treat the feature as disabled."""
	try:
		return bool(frappe.db.get_single_value("Recruitment Settings", "enable_sla_tat"))
	except Exception:
		return False


def _get_settings():
	"""Cached TA SLA Settings single, or ``None`` if unavailable."""
	try:
		return frappe.get_cached_doc(SETTINGS_DOCTYPE)
	except Exception:
		return None


# --------------------------------------------------------------------------- #
# Point resolution
# --------------------------------------------------------------------------- #
# Keyword sets used to locate a milestone inside a candidate's stage history
# (stage names are user-defined per TA Interview Strategy Template, so we match
# by intent rather than an exact string).
_STAGE_KEYWORDS = {
	"Candidate Screening": ["screen"],
	"Shortlisting": ["shortlist"],
	"Interview Scheduling": ["interview"],
	"Interview Completion": ["interview"],
	"Assessment Scheduling": ["assessment", "assess", "test"],
	"Assessment Completion": ["assessment", "assess", "test"],
	"Pre-BGV Initiation": ["bgv", "background", "verification"],
	"Pre-BGV Completion": ["bgv", "background", "verification"],
	"Pre-Offer Stage": ["pre-offer", "pre offer", "preoffer"],
	"Offer Proposal Stage": ["offer"],
	"Offer Letter Stage": ["offer"],
}

# Points that mean "this stage has concluded" (need a filled ``result``).
_COMPLETION_POINTS = {
	"Interview Completion",
	"Assessment Completion",
	"Pre-BGV Completion",
}


def _stage_rows(applicant):
	return applicant.get("custom_stage_history") or []


def _find_stage_date(applicant, keywords, want_completion=False, latest=False):
	"""``entered_on`` (as a date) of the stage-history row matching any keyword.

	``want_completion`` requires the row to carry a non-empty ``result``.
	``latest`` returns the last match instead of the first.
	"""
	rows = _stage_rows(applicant)
	if latest:
		rows = list(reversed(rows))
	for row in rows:
		name = (row.get("stage_name") or "").lower()
		if not any(k in name for k in keywords):
			continue
		if want_completion and not (row.get("result") or "").strip():
			continue
		if row.get("entered_on"):
			return getdate(row.get("entered_on"))
	return None


def _first_offer(applicant_name, accepted_only=False, latest=False):
	"""Earliest/latest Job Offer for the applicant (optionally accepted)."""
	filters = {"job_applicant": applicant_name}
	if accepted_only:
		filters["status"] = "Accepted"
	rows = frappe.get_all(
		"Job Offer",
		filters=filters,
		fields=["name", "offer_date", "status", "creation", "modified"],
		order_by="creation " + ("desc" if latest else "asc"),
		limit=1,
	)
	return rows[0] if rows else None


def resolve_point(point, applicant, opening):
	"""Resolve a TAT point name to a ``date`` for this candidate, or ``None``.

	``applicant`` is the Job Applicant document; ``opening`` is the resolved
	Job Opening dict (may be ``None``). Never raises — an unknown/unreachable
	point yields ``None`` so the dependent metric is simply skipped.
	"""
	if not point:
		return None
	try:
		# --- Document-level anchors -------------------------------------- #
		if point == "Position Opened Date (First)":
			return getdate(opening.get("posted_on")) if opening and opening.get("posted_on") else None
		if point == "Position Opened Date (Latest)":
			if opening and opening.get("custom_approved_on"):
				return getdate(opening.get("custom_approved_on"))
			return getdate(opening.get("posted_on")) if opening and opening.get("posted_on") else None
		if point == "Candidate Application Date":
			return getdate(applicant.get("creation"))
		if point == "Date of Joining":
			return getdate(applicant.get("custom_expected_doj")) if applicant.get("custom_expected_doj") else None

		# --- Offer anchors ----------------------------------------------- #
		if point == "Offer Proposal Stage":
			offer = _first_offer(applicant.name)
			return getdate(offer.get("creation")) if offer else _find_stage_date(applicant, _STAGE_KEYWORDS[point])
		if point == "Offer Letter Stage":
			offer = _first_offer(applicant.name)
			if offer and offer.get("offer_date"):
				return getdate(offer.get("offer_date"))
			return _find_stage_date(applicant, _STAGE_KEYWORDS[point])
		if point == "Offer Acceptance by Candidate Date (First)":
			offer = _first_offer(applicant.name, accepted_only=True)
			return getdate(offer.get("modified")) if offer else None
		if point == "Offer Acceptance by Candidate Date (Latest)":
			offer = _first_offer(applicant.name, accepted_only=True, latest=True)
			return getdate(offer.get("modified")) if offer else None

		# --- Stage-history anchors --------------------------------------- #
		if point in _STAGE_KEYWORDS:
			want_completion = point in _COMPLETION_POINTS
			date = _find_stage_date(
				applicant,
				_STAGE_KEYWORDS[point],
				want_completion=want_completion,
				latest=want_completion,
			)
			if date:
				return date
			# Fallback: the screening evaluation timestamp for the screening point.
			if point == "Candidate Screening" and applicant.get("custom_screening_evaluated_on"):
				return getdate(applicant.get("custom_screening_evaluated_on"))
			return None
	except Exception:
		frappe.log_error(frappe.get_traceback(), "TA SLA/TAT: point resolution failed")
	return None


# --------------------------------------------------------------------------- #
# TAT computation
# --------------------------------------------------------------------------- #
def _days_between(start, end):
	"""Whole days from ``start`` to ``end``; ``None`` unless both resolve and
	end is not before start."""
	if not start or not end:
		return None
	days = date_diff(end, start)
	return days if days is not None and days >= 0 else None


def _get_opening(applicant):
	if not applicant.get("job_title"):
		return None
	return frappe.db.get_value(
		"Job Opening",
		applicant.get("job_title"),
		["name", "posted_on", "custom_approved_on", "designation", "custom_recruiter"],
		as_dict=True,
	)


def get_target_tat(applicant):
	"""Target days for this candidate from TA SLA Settings -> Target TAT
	Assignments. A ``User`` row matching the recruiter wins over a
	``Designation`` row. Returns ``{fill, hire, first_action}`` (values may be
	``None``)."""
	settings = _get_settings()
	target = {"fill": None, "hire": None, "first_action": None}
	if not settings:
		return target

	recruiter = applicant.get("custom_recruiter")
	designation = applicant.get("designation")
	by_user, by_designation = None, None
	for row in settings.get("target_tat_assignments") or []:
		if row.target_type == "User" and recruiter and row.target_value == recruiter:
			by_user = row
		elif row.target_type == "Designation" and designation and row.target_value == designation:
			by_designation = row

	row = by_user or by_designation
	if row:
		target = {
			"fill": cint(row.target_time_to_fill) or None,
			"hire": cint(row.target_time_to_hire) or None,
			"first_action": cint(row.target_time_to_first_action) or None,
		}
	return target


def compute_applicant_tat(applicant):
	"""Full TAT picture for a Job Applicant. Returns ``{}`` when the feature is
	disabled/unconfigured. Otherwise a dict of metrics (each ``None`` when its
	endpoints can't be resolved) plus targets and breach flags.

	``applicant`` may be a name (str) or a Document.
	"""
	if not is_enabled():
		return {}
	settings = _get_settings()
	if not settings:
		return {}

	if isinstance(applicant, str):
		applicant = frappe.get_doc("Job Applicant", applicant)
	opening = _get_opening(applicant)

	def metric(start_point, end_point):
		return _days_between(
			resolve_point(start_point, applicant, opening),
			resolve_point(end_point, applicant, opening),
		)

	result = {
		"time_to_fill": None,
		"time_to_hire": None,
		"time_to_first_action": None,
	}

	# Time to Fill — start/end points are mandatory on the settings form.
	if settings.tat_fill_start_point and settings.tat_fill_end_point:
		result["time_to_fill"] = metric(settings.tat_fill_start_point, settings.tat_fill_end_point)

	# Time to Hire — opt-in.
	if settings.enable_time_to_hire and settings.tat_hire_start_point and settings.tat_hire_end_point:
		result["time_to_hire"] = metric(settings.tat_hire_start_point, settings.tat_hire_end_point)

	# Time to First Action — opt-in.
	if (
		settings.enable_time_to_first_action
		and settings.tat_first_action_start_point
		and settings.tat_first_action_end_point
	):
		result["time_to_first_action"] = metric(
			settings.tat_first_action_start_point, settings.tat_first_action_end_point
		)

	target = get_target_tat(applicant)
	result["target"] = target
	result["breach"] = {
		"fill": _is_breach(result["time_to_fill"], target["fill"]),
		"hire": _is_breach(result["time_to_hire"], target["hire"]),
		"first_action": _is_breach(result["time_to_first_action"], target["first_action"]),
	}
	return result


def _is_breach(actual, target):
	if actual is None or not target:
		return False
	return actual > target


@frappe.whitelist()
def get_applicant_tat(applicant):
	"""Whitelisted wrapper for client scripts / reports."""
	return compute_applicant_tat(applicant)


# --------------------------------------------------------------------------- #
# SLA breach detection (scheduler)
# --------------------------------------------------------------------------- #
# Keyword sets mapping a candidate's current hiring stage to an SLA Task.
_SLA_TASK_KEYWORDS = {
	"screening_stage": ["screen"],
	"shortlisting_stage": ["shortlist"],
	"interview_scheduling": ["interview"],
	"interview_completion": ["interview"],
	"assessment_scheduling": ["assessment", "assess", "test"],
	"assessment_completion": ["assessment", "assess", "test"],
	"pre_bgv_initiation": ["bgv", "background", "verification"],
	"pre_bgv_completion": ["bgv", "background", "verification"],
	"pre_offer_stage": ["pre-offer", "pre offer", "preoffer"],
	"offer_proposal_stage": ["offer"],
	"offer_letter_stage": ["offer"],
	"candidate_review": ["review"],
	"interview_feedback": ["feedback"],
}

# Candidate statuses still "in flight" — closed/rejected candidates are skipped.
_ACTIVE_STATUSES = ("Open", "Replied", "Hold")


def _match_sla_task(stage_name, sla_tasks):
	"""Return the SLA Task row whose keywords match ``stage_name``, or ``None``."""
	name = (stage_name or "").lower()
	if not name:
		return None
	for task in sla_tasks:
		keywords = _SLA_TASK_KEYWORDS.get(task.task_key)
		if keywords and any(k in name for k in keywords):
			return task
	return None


def _current_stage_entry(applicant):
	"""The stage-history row for the candidate's current stage (last match)."""
	current = applicant.get("custom_current_stage")
	if not current:
		return None
	for row in reversed(_stage_rows(applicant)):
		if (row.get("stage_name") or "") == current:
			return row
	return None


def _open_sla_todo(applicant_name, task_key):
	"""Existing open engine-ToDo for this candidate+task, or ``None`` (dedupe)."""
	rows = frappe.get_all(
		"ToDo",
		filters={
			"reference_type": "Job Applicant",
			"reference_name": applicant_name,
			"status": "Open",
			"description": ["like", f"%{SLA_TODO_MARKER}|{task_key}|%"],
		},
		limit=1,
	)
	return rows[0].name if rows else None


def _create_sla_todo(applicant, task, days_in_stage, stage_name):
	"""Raise a breach ToDo for the recruiter (or document owner)."""
	assignee = applicant.get("custom_recruiter") or applicant.get("owner")
	description = (
		f"{SLA_TODO_MARKER}|{task.task_key}| SLA breached for "
		f"<b>{frappe.utils.escape_html(applicant.get('applicant_name') or applicant.name)}</b> "
		f"at stage <b>{frappe.utils.escape_html(stage_name)}</b>: "
		f"{days_in_stage} day(s) elapsed vs SLA of {cint(task.sla_duration)} day(s)."
	)
	todo = frappe.get_doc({
		"doctype": "ToDo",
		"allocated_to": assignee,
		"reference_type": "Job Applicant",
		"reference_name": applicant.name,
		"date": getdate(now_datetime()),
		"priority": "High",
		"description": description,
	})
	todo.insert(ignore_permissions=True)


def scan_sla_breaches():
	"""Daily scan: flag active candidates overdue in their current stage.

	No-op unless the feature is enabled. Only SLA Tasks with a positive
	duration participate; each stage entry is flagged at most once.
	"""
	if not is_enabled():
		return
	settings = _get_settings()
	if not settings:
		return
	# Tasks with a configured (>0) SLA duration; nothing to enforce otherwise.
	sla_tasks = [t for t in (settings.get("sla_tasks") or []) if cint(t.sla_duration) > 0]
	if not sla_tasks:
		return

	candidates = frappe.get_all(
		"Job Applicant",
		filters={
			"status": ["in", _ACTIVE_STATUSES],
			"custom_current_stage": ["is", "set"],
		},
		pluck="name",
	)
	today = getdate(now_datetime())
	flagged = 0
	for name in candidates:
		try:
			applicant = frappe.get_doc("Job Applicant", name)
			entry = _current_stage_entry(applicant)
			if not entry or not entry.get("entered_on"):
				continue
			task = _match_sla_task(entry.get("stage_name"), sla_tasks)
			if not task:
				continue
			days_in_stage = date_diff(today, getdate(entry.get("entered_on")))
			if days_in_stage is None or days_in_stage <= cint(task.sla_duration):
				continue
			if _open_sla_todo(name, task.task_key):
				continue
			_create_sla_todo(applicant, task, days_in_stage, entry.get("stage_name"))
			flagged += 1
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"TA SLA breach scan failed for {name}")
	frappe.db.commit()
	return flagged


# --------------------------------------------------------------------------- #
# Archival (scheduler)
# --------------------------------------------------------------------------- #
def archive_sla_breach_todos():
	"""Close engine-created breach ToDos older than their task's Archival
	Duration. Only touches ToDos carrying the :data:`SLA_TODO_MARKER`, so no
	user or third-party ToDo is ever affected. No-op when disabled."""
	if not is_enabled():
		return
	settings = _get_settings()
	if not settings:
		return
	# task_key -> archival days (only tasks with a positive archival duration).
	archival = {
		t.task_key: cint(t.task_archival_duration)
		for t in (settings.get("sla_tasks") or [])
		if cint(t.task_archival_duration) > 0
	}
	if not archival:
		return

	todos = frappe.get_all(
		"ToDo",
		filters={"status": "Open", "description": ["like", f"%{SLA_TODO_MARKER}|%"]},
		fields=["name", "description", "creation"],
	)
	today = getdate(now_datetime())
	closed = 0
	for todo in todos:
		task_key = _parse_task_key(todo.description)
		days = archival.get(task_key)
		if not days:
			continue
		if date_diff(today, getdate(todo.creation)) >= days:
			frappe.db.set_value("ToDo", todo.name, "status", "Closed")
			closed += 1
	frappe.db.commit()
	return closed


def _parse_task_key(description):
	"""Extract ``task_key`` from a marked ToDo description (``[TA-SLA]|key|``)."""
	if not description or SLA_TODO_MARKER not in description:
		return None
	try:
		return description.split(SLA_TODO_MARKER + "|", 1)[1].split("|", 1)[0].strip()
	except Exception:
		return None
