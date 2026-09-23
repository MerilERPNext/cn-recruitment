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

import json

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, get_url, now_datetime

from recruitment.recruitment.communication_log import sendmail_with_log

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


# Recruitment Settings check -> stage type it makes compulsory in every workflow.
_COMPULSORY_STAGE_SETTINGS = (
	("mandatory_screening_stage", "Screening"),
	("mandatory_shortlist_stage", "Shortlist"),
)


def enforce_compulsory_stages(rows, type_of, where):
	"""Every hiring workflow must carry the stage types Recruitment Settings makes
	compulsory, and those stages are always Mandatory.

	``rows`` are stage/round child rows; ``type_of(row)`` returns the row's stage
	type. Ticks ``is_mandatory`` on matching rows and throws if a type is missing.
	"""
	if not rows or not is_hiring_workflow_enabled():
		return
	settings = frappe.get_cached_doc("Recruitment Settings")
	required = [t for field, t in _COMPULSORY_STAGE_SETTINGS if settings.get(field)]
	if not required:
		return

	present = set()
	for row in rows:
		stage_type = type_of(row)
		if stage_type in required:
			present.add(stage_type)
			row.is_mandatory = 1

	missing = [t for t in required if t not in present]
	if missing:
		frappe.throw(
			_("{0} must include a {1} stage — Recruitment Settings makes it mandatory in all hiring flows.").format(
				where, frappe.bold(_(" and ").join(missing))
			),
			title=_("Mandatory Stage Missing"),
		)


def stage_rows_changed(doc, fieldname, fields):
	"""True for a new doc or when the child rows' ``fields`` differ from the saved
	version — so unrelated saves of old records aren't blocked by the rule."""
	before = doc.get_doc_before_save() if not doc.is_new() else None
	if before is None:
		return True
	snap = lambda d: [tuple(r.get(f) for f in fields) for r in (d.get(fieldname) or [])]
	return snap(before) != snap(doc)


def validate_job_opening_compulsory_stages(doc, method=None):
	"""Job Opening validate hook. Openings with no stages don't use the workflow."""
	if not stage_rows_changed(doc, STAGES_FIELD, ("stage_type", "stage_name", "is_mandatory")):
		return
	enforce_compulsory_stages(
		doc.get(STAGES_FIELD) or [],
		lambda r: (r.get("stage_type") or "").strip(),
		_("The Job Opening's hiring stages"),
	)


# --------------------------------------------------------------------------- #
# Reading the workflow definition
# --------------------------------------------------------------------------- #
def get_opening_stages(job_opening):
	"""Return the ordered hiring stages for a Job Opening (list of dicts).

	Interview stages come from the opening's ``custom_hiring_stages`` table. Two
	terminal offer stages are then appended *virtually* so every workflow ends the
	same way: an optional **Pre Job Offer** stage (toggled per-opening via
	``custom_enable_pre_job_offer``) followed by the final **Job Offer** stage.
	Keeping them virtual means the toggle takes effect immediately — no re-fetch,
	no stored rows to migrate.
	"""
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
			"stage_name", "stage_type", "is_mandatory",
			"interviewer_pool", "interviewer_role",
			"sla", "sla_unit", "owner_role", "notify", "auto", "notes", "idx",
		],
		order_by="idx asc",
	)
	if not rows:
		return rows
	return _append_offer_stages(job_opening, rows)


def _terminal_stage(name, stage_type, idx):
	return {
		"stage_name": name, "stage_type": stage_type,
		# Off by default; the Pre Job Offer stage takes it from the opening's
		# "Pre Job Offer Mandatory" tick (see _append_offer_stages).
		"is_mandatory": 0,
		"interviewer_pool": None, "interviewer_role": None,
		"sla": 0, "sla_unit": "d", "owner_role": "HR",
		"notify": 0, "auto": 0, "notes": "", "idx": idx,
	}


PRE_OFFER_MANDATORY_FIELD = "custom_pre_job_offer_mandatory"


def _pre_offer_fields():
	"""Job Opening columns holding the Pre Job Offer switches (the mandatory one
	only once migrated)."""
	fields = ["custom_enable_pre_job_offer"]
	if frappe.get_meta("Job Opening").has_field(PRE_OFFER_MANDATORY_FIELD):
		fields.append(PRE_OFFER_MANDATORY_FIELD)
	return fields


def _append_offer_stages(job_opening, rows, enable_pre=None, pre_mandatory=None):
	"""Append the virtual Pre Job Offer / Job Offer terminal stages.

	``enable_pre`` / ``pre_mandatory`` let a caller that already knows the
	opening's Pre Job Offer switches pass them in (see ``get_openings_stages``),
	so a batch over many openings doesn't re-query them one opening at a time.
	"""
	try:
		types_present = {(r.get("stage_type") or "") for r in rows}
		idx = max([(r.get("idx") or 0) for r in rows] or [0])
		if enable_pre is None:
			flags = frappe.db.get_value("Job Opening", job_opening, _pre_offer_fields(), as_dict=True) or {}
			enable_pre = flags.get("custom_enable_pre_job_offer")
			pre_mandatory = flags.get(PRE_OFFER_MANDATORY_FIELD)
		if enable_pre and "Pre Offer" not in types_present:
			idx += 1
			pre_stage = _terminal_stage("Pre Job Offer", "Pre Offer", idx)
			pre_stage["is_mandatory"] = 1 if pre_mandatory else 0
			rows.append(pre_stage)
		if "Offer" not in types_present:
			idx += 1
			rows.append(_terminal_stage("Job Offer", "Offer", idx))
	except Exception:
		# Never let the terminal-stage logic break stage reading.
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: append offer stages failed")
	return rows


def get_openings_stages(job_openings):
	"""``{job_opening: [stages]}`` for MANY openings in a fixed two queries.

	Same shape as ``get_opening_stages`` per opening, terminal stages and all.
	Callers that fan out over a drive's linked openings (the campus stage picker)
	used to pay two queries *per opening*; this keeps it flat however many are
	linked.
	"""
	openings = [o for o in dict.fromkeys(job_openings or []) if o]
	if not openings:
		return {}

	rows = frappe.get_all(
		"Job Opening Hiring Stage",
		filters={
			"parent": ["in", openings],
			"parenttype": "Job Opening",
			"parentfield": STAGES_FIELD,
		},
		fields=[
			"parent", "stage_name", "stage_type", "is_mandatory",
			"interviewer_pool", "interviewer_role",
			"sla", "sla_unit", "owner_role", "notify", "auto", "notes", "idx",
		],
		order_by="parent asc, idx asc",
	)
	pre_flags = {
		r.name: r
		for r in frappe.get_all(
			"Job Opening",
			filters={"name": ["in", openings]},
			fields=["name"] + _pre_offer_fields(),
		)
	}

	grouped = {o: [] for o in openings}
	for row in rows:
		grouped[row.pop("parent")].append(row)

	return {
		o: (
			_append_offer_stages(
				o, stages,
				enable_pre=(pre_flags.get(o) or {}).get("custom_enable_pre_job_offer") or 0,
				pre_mandatory=(pre_flags.get(o) or {}).get(PRE_OFFER_MANDATORY_FIELD),
			) if stages else stages
		)
		for o, stages in grouped.items()
	}


# Job Applicant field naming a hiring workflow that replaces the opening's stages
# for that one candidate. Stamped by the duplicity check when "Allow Hiring Even
# Though It Matches" lets a match through (customizations.ta_duplicity_check).
WORKFLOW_OVERRIDE_FIELD = "custom_duplicity_hiring_workflow"


def get_applicant_stages(applicant):
	"""The ordered hiring stages THIS candidate follows — a doc or a dict carrying
	``job_title`` and ``custom_duplicity_hiring_workflow``.

	Normally the opening's. A candidate let through a duplicity match runs on the
	hiring workflow named on their application instead: the rounds of that TA
	Interview Strategy Template, mapped exactly as a Job Opening is prefilled
	from it, with the opening's virtual offer stages appended — so every consumer
	below treats the two alike. Falls back to the opening's stages when the
	template is gone or has no rounds, rather than leave the candidate stranded.
	"""
	opening = applicant.get("job_title")
	template = applicant.get(WORKFLOW_OVERRIDE_FIELD)
	if template:
		rows = _template_stages(template)
		if rows:
			return _append_offer_stages(opening, rows)
	return get_opening_stages(opening)


def _template_stages(template):
	"""A TA Interview Strategy Template's rounds, shaped like the opening's rows."""
	from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
		_map_rounds_to_stages,
	)

	try:
		doc = frappe.get_doc("TA Interview Strategy Template", template)
	except frappe.DoesNotExistError:
		return []

	rows = _map_rounds_to_stages(doc)
	for idx, row in enumerate(rows, start=1):
		row.setdefault("owner_role", None)
		row.setdefault("notes", "")
		row["idx"] = idx
	return rows


def _require_applicant_write(job_applicant):
	"""Assert the caller may drive this candidate through the hiring workflow.

	Most endpoints here are protected only incidentally, by the ``doc.save()``
	they eventually perform. That is not enough for the ones that save with
	``ignore_permissions=True`` (they must, to append stage history and submit
	feedback on behalf of the workflow) — those bypassed the check entirely, so
	any authenticated user could reject a candidate and file interview feedback
	in someone else's name. Gate them explicitly instead.
	"""
	if not frappe.has_permission("Job Applicant", "write", doc=job_applicant):
		frappe.throw(
			_("You are not permitted to change this candidate's hiring stage."),
			frappe.PermissionError,
		)


def _find_stage(stages, stage_name):
	"""Index of ``stage_name`` within the ordered stage list, or -1."""
	for i, s in enumerate(stages):
		if (s.get("stage_name") or "") == (stage_name or ""):
			return i
	return -1


# --------------------------------------------------------------------------- #
# Mandatory stages
# --------------------------------------------------------------------------- #
# A round ticked "Mandatory" on the TA Interview Strategy Template (or one whose
# "Allow skipping" is No) becomes a stage nobody may step around: it can be
# cleared or it can be rejected, but it cannot be marked Not Required and the
# candidate cannot be jumped past it. The rule lives here rather than in the UI
# because both skip paths are whitelisted endpoints — hiding a button only hides
# the button.
def _is_mandatory(stage):
	return bool((stage or {}).get("is_mandatory"))


def _assert_skippable(stage):
	"""Refuse to skip a stage the workflow marks mandatory."""
	if not _is_mandatory(stage):
		return
	frappe.throw(
		_("<b>{0}</b> is a mandatory stage — it can't be marked Not Required. "
		  "Complete it or reject the candidate.").format(stage.get("stage_name") or "")
	)


def _assert_no_mandatory_skipped(stages, from_idx, to_idx):
	"""Refuse a jump that would step over a mandatory stage.

	``from_idx`` is where the candidate stands (its own stage counts as completed
	by the move, exactly as ``move_to_next_stage`` treats it); everything strictly
	between it and ``to_idx`` would be left with no outcome at all.
	"""
	skipped = [
		s.get("stage_name") for s in stages[from_idx + 1:to_idx] if _is_mandatory(s)
	]
	if not skipped:
		return
	frappe.throw(
		_("This move would skip the mandatory stage(s) {0}. Complete them in order first.").format(
			", ".join(frappe.bold(n or "") for n in skipped)
		)
	)


# --------------------------------------------------------------------------- #
# Transition primitives
# --------------------------------------------------------------------------- #
def _append_history(doc, stage, result, interview=None, notes=None):
	return doc.append(HISTORY_FIELD, {
		"stage_name": stage.get("stage_name"),
		"stage_type": stage.get("stage_type"),
		"entered_on": now_datetime(),
		"moved_by": frappe.session.user,
		"result": result,
		"interview": interview,
		"notes": notes,
	})


# stage_type -> the built-in Job Applicant `status` a candidate should read while
# sitting on it. Types deliberately ABSENT leave `status` alone:
#   Screening / System — owned by the screening + eligibility engines, which park
#   candidates on Hold / Rejected states that must not be stomped on entry.
STATUS_BY_STAGE_TYPE = {
	"Shortlist": "Shortlisted",
	"Interview": "Interview",
	"Pre Offer": "Approvals",
	"Offer": "Approvals",
	"Done": "Accepted",
}


def _sub_status_master():
	"""``{parent_status: (docname, {sub_status, …})}`` for the Sub Status master.

	Loaded once per request: a bulk advance (a whole GD round clearing at once)
	would otherwise re-read the master for every candidate it moves.
	"""
	cache = getattr(frappe.local, "_recruitment_sub_status", None)
	if cache is None:
		cache = {}
		for row in frappe.get_all("Sub Status", fields=["name", "parent_status", "sub_status"]):
			cache[row.parent_status] = (
				row.name,
				{o.strip() for o in (row.sub_status or "").split("\n") if o.strip()},
			)
		frappe.local._recruitment_sub_status = cache
	return cache


def _ensure_sub_status_option(status, sub_status):
	"""Make sure ``sub_status`` is listed under ``status`` in the Sub Status master.

	The Job Applicant form builds its sub-status dropdown from that master (see
	public/js/job_applicant.js), so a value we write that isn't listed renders as
	an empty Select. Stage names are per-opening and admins add new rounds freely,
	so the master is kept in step automatically instead of needing a manual edit
	for every new round.

	Best-effort: master upkeep must never block a stage transition.
	"""
	if not (status and sub_status):
		return
	try:
		cache = _sub_status_master()
		entry = cache.get(status)
		if entry and sub_status in entry[1]:
			return

		if entry:
			name, options = entry
			options.add(sub_status)
			frappe.db.set_value(
				"Sub Status", name, "sub_status",
				"\n".join(sorted(options)), update_modified=False,
			)
		else:
			row = frappe.new_doc("Sub Status")
			row.parent_status = status
			row.sub_status = sub_status
			row.insert(ignore_permissions=True)
			cache[status] = (row.name, {sub_status})
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: sub-status upkeep failed")


def sync_status_for_stage(doc, stage):
	"""Point the built-in ``status`` / ``custom_substatus`` at the stage the
	candidate is actually in, so list views, reports and the portal read true.

	``custom_substatus`` carries the STAGE NAME ("Group Discussion", "HR Round"),
	which is what makes the round visible at a glance; the name is registered in
	the Sub Status master so it stays selectable on the form.

	Returns ``True`` when either field changed.
	"""
	status = STATUS_BY_STAGE_TYPE.get((stage.get("stage_type") or "").strip())
	if not status:
		return False

	stage_name = (stage.get("stage_name") or "").strip()
	changed = False

	if doc.get("status") != status:
		doc.status = status
		changed = True
	if stage_name and doc.get("custom_substatus") != stage_name:
		doc.custom_substatus = stage_name
		changed = True
	if stage_name:
		_ensure_sub_status_option(status, stage_name)
	return changed


def _enter_stage(doc, stage, result="Moved", interview=None, save=True,
				 ignore_permissions=False, notify=True):
	"""Place ``doc`` into ``stage``: set current stage, log history, sync status."""
	doc.set(STAGE_FIELD, stage.get("stage_name"))
	_append_history(doc, stage, result, interview=interview)
	sync_status_for_stage(doc, stage)

	if save:
		doc.save(ignore_permissions=ignore_permissions)
	if notify and stage.get("notify"):
		_notify_stage_entry(doc, stage)
	return stage


def _campus_stage_mail_allowed(doc):
	"""Whether a CAMPUS candidate may be emailed about a stage change.

	A campus drive walks a hall of students through several rounds in a day, so the
	per-stage note that suits a lateral candidate turns into a mail after every
	round for hundreds of people. Off by default; Campus Settings turns it back on.
	Lateral candidates are unaffected — they keep whatever the opening's stage says.
	"""
	if not (doc.get("custom_campus_drive") or doc.get("custom_campus_invite")):
		return True
	return bool(frappe.db.get_single_value("Campus Settings",
	                                       "notify_campus_candidates_on_stage_change"))


def _stage_mail_disabled_site_wide():
	"""Recruitment Settings -> Disable Stage-Change Email to Candidates.

	A "disable" switch on purpose: a Single's checkbox reads 0 until someone
	saves it, so an untouched site keeps sending exactly as before. Checked
	against the meta first so code deployed ahead of `bench migrate` does not
	fail on a field that is not there yet.
	"""
	fieldname = "disable_stage_change_email"
	if not frappe.get_meta("Recruitment Settings").has_field(fieldname):
		return False
	return bool(frappe.db.get_single_value("Recruitment Settings", fieldname))


def _notify_stage_entry(doc, stage):
	"""Best-effort candidate email on stage entry. Never blocks the transition."""
	try:
		if _stage_mail_disabled_site_wide():
			return
		if not _campus_stage_mail_allowed(doc):
			return
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
		sendmail_with_log(
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
		stages = get_applicant_stages(doc)
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
	stages = get_applicant_stages(doc)
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


def _assert_pre_offer_mandatory_filled(doc, stage):
	"""A Pre Offer stage can't be completed while a field marked mandatory for
	pre-offer is still blank on the applicant."""
	if (stage.get("stage_type") or "") != "Pre Offer":
		return
	from recruitment.api.channels._common import get_application_fields_for_channel

	missing = [
		f.get("display_name") or f["reference_name"]
		for f in get_application_fields_for_channel(doc.get("job_title"), "preoffer")
		if f.get("reqd") and doc.get(f["reference_name"]) in (None, "", [])
	]
	if missing:
		frappe.throw(
			_("The Pre Offer stage can't be completed until these mandatory fields are filled: {0}").format(
				frappe.bold(", ".join(missing))
			),
			title=_("Pre Offer Fields Missing"),
		)


@frappe.whitelist()
def move_to_next_stage(job_applicant):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
	if not stages:
		frappe.throw(_("No hiring stages are defined on the linked Job Opening."))

	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1
	nxt = idx + 1
	if nxt >= len(stages):
		frappe.throw(_("Candidate is already at the final stage."))

	if idx >= 0:
		_assert_pre_offer_mandatory_filled(doc, stages[idx])
	stage = _enter_stage(doc, stages[nxt], result="Moved")
	return {"current_stage": stage.get("stage_name"), "stage_type": stage.get("stage_type")}


@frappe.whitelist()
def set_stage(job_applicant, stage_name):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
	idx = _find_stage(stages, stage_name)
	if idx < 0:
		frappe.throw(_("Stage {0} is not part of this candidate's hiring workflow.").format(stage_name))

	# Forward-only: a completed / current stage can't be revisited.
	current = doc.get(STAGE_FIELD)
	cur_idx = _find_stage(stages, current) if current else -1
	if idx <= cur_idx:
		frappe.throw(_("The hiring workflow moves forward only — you can't return to a completed or the current stage."))

	_assert_no_mandatory_skipped(stages, cur_idx, idx)
	if cur_idx >= 0:
		_assert_pre_offer_mandatory_filled(doc, stages[cur_idx])

	_enter_stage(doc, stages[idx], result="Set")
	return {"current_stage": stage_name}


@frappe.whitelist()
def reject_at_current_stage(job_applicant, reason=None):
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
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
# The Interview field that carries the round, in the order we probe for it:
# HRMS v15 ships ``interview_round``; v16 renamed it to ``interview_type``.
_INTERVIEW_ROUND_LINK_FIELDS = ("interview_round", "interview_type")

# Doctypes an Interview may link its round to across HRMS versions.
_INTERVIEW_ROUND_DOCTYPES = ("Interview Round", "Interview Type")


@frappe.whitelist()
def get_interview_round_doctype():
	"""The doctype an Interview links its round to on THIS HRMS version.

	v15 links ``Interview.interview_round`` → "Interview Round"; v16 renamed the
	field to ``interview_type`` and points it at "Interview Type". Nothing here
	hardcodes either name — we read what the installed Interview doctype actually
	links to, so the same code (and the same "Stage Name" picker in the hiring
	workflow) serves both versions.

	Returns ``None`` when HRMS isn't installed / has no such field, in which case
	callers fall back to plain free-text stage names.

	Memoised per request: the bulk campus scheduler resolves this once per
	interview it creates, and the answer can't change inside one request.
	"""
	cached = getattr(frappe.local, "_recruitment_round_doctype", None)
	if cached is not None:
		return cached or None

	resolved = None
	try:
		meta = frappe.get_meta("Interview")
	except Exception:
		meta = None

	if meta:
		for fieldname in _INTERVIEW_ROUND_LINK_FIELDS:
			df = meta.get_field(fieldname)
			if df and df.fieldtype == "Link" and df.options:
				resolved = df.options
				break
		else:
			# Renamed again? Fall back to any Link pointing at a known round doctype.
			for df in meta.fields or []:
				if df.fieldtype == "Link" and df.options in _INTERVIEW_ROUND_DOCTYPES:
					resolved = df.options
					break

	frappe.local._recruitment_round_doctype = resolved or ""
	return resolved


@frappe.whitelist()
def get_interview_round_field(doctype="Interview"):
	"""The fieldname carrying the round on THIS HRMS version.

	The companion to ``get_interview_round_doctype``: that answers *what* a document
	links its round to, this answers *where*. v15 keeps it in ``interview_round``,
	v16 in ``interview_type`` — on Interview and on Interview Feedback alike.
	Resolved from the meta, by finding the Link that points at the round doctype,
	rather than by trusting either name, so a third rename is handled too.

	Returns ``None`` when neither exists, letting callers skip round-specific work
	instead of writing to a field that isn't there — assigning one that is absent
	looks like it worked and is silently dropped on save.
	"""
	round_doctype = get_interview_round_doctype()
	if not round_doctype:
		return None

	try:
		meta = frappe.get_meta(doctype)
	except Exception:
		return None

	for df in meta.fields or []:
		if df.fieldtype == "Link" and df.options == round_doctype:
			return df.fieldname
	return None


def _round_title_field(doctype):
	"""The field carrying the round's display name, or ``None`` when the docname
	*is* the name.

	Read from the doctype's own autoname so a lookup by name always hits the same
	record the picker stores: "Interview Round" autonames ``field:round_name``,
	while "Interview Type" is Prompt-named and so has no such field — its name is
	the label itself.
	"""
	meta = frappe.get_meta(doctype)
	autoname = (meta.autoname or "").strip()
	if autoname.startswith("field:"):
		fieldname = autoname.split(":", 1)[1].strip()
		if meta.get_field(fieldname):
			return fieldname
	if meta.get_field("round_name"):
		return "round_name"
	return None


def _ensure_interview_round(stage_name, designation=None):
	"""Return the interview round named after the stage, creating it if needed.

	The target doctype is resolved per HRMS version (see
	``get_interview_round_doctype``) — "Interview Round" on v15, "Interview Type"
	on v16 — so campus/stage → interview mapping by name works on both.

	Rounds are shared across openings/designations by stage name. We deliberately
	keep them **designation-agnostic** — Interview.designation is fetched from the
	round, and HRMS blocks an interview whose round designation differs from the
	applicant's. Leaving it empty lets HRMS fill in each applicant's own
	designation, so one "Screening"/"Technical Round" round serves every opening.

	``expected_skill_set`` is a required table on Interview Round; we create with
	``ignore_mandatory`` so recruiters can fill skills later.
	"""
	doctype = get_interview_round_doctype()
	if not doctype or not stage_name:
		return None

	title_field = _round_title_field(doctype)
	filters = {title_field: stage_name} if title_field else {"name": stage_name}
	existing = frappe.db.get_value(doctype, filters, "name")
	if existing:
		# Un-pin a legacy round from a single designation so it works for all.
		if frappe.get_meta(doctype).get_field("designation") and frappe.db.get_value(
			doctype, existing, "designation"
		):
			frappe.db.set_value(doctype, existing, "designation", None)
		return existing

	rnd = frappe.new_doc(doctype)
	if title_field:
		rnd.set(title_field, stage_name)
	else:
		# Prompt-named doctype ("Interview Type"): the docname is the label.
		rnd.name = stage_name
	rnd.flags.ignore_mandatory = True
	rnd.insert(ignore_permissions=True)
	return rnd.name


@frappe.whitelist()
def prepare_interview(job_applicant, stage_name=None):
	"""Ensure an Interview Round exists for a stage and return the values used to
	prefill a new built-in Interview.

	``stage_name`` lets the flow schedule an interview for a specific Interview
	stage (the "+" on that stage node); when omitted we use the current stage.
	"""
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
	if idx < 0:
		frappe.throw(_("Set a hiring stage before scheduling an interview."))

	stage = stages[idx]
	interview_round = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))
	return {
		"job_applicant": doc.name,
		"interview_round": interview_round,
		# Named, not assumed: v15 links the round through `interview_round`, v16
		# through `interview_type`. The client sets whichever this site has.
		"interview_round_field": get_interview_round_field() or "interview_round",
		"designation": doc.get("designation"),
		"job_opening": doc.get("job_title"),
		"interviewers": stage_interviewers(stage),
	}


def stage_interviewers(stage):
	"""The panel a stage's interviews are scheduled with — never raises.

	An unresolvable panel must not stop anybody scheduling an interview; an empty
	list simply means the recruiter picks, which is the pre-feature behaviour.
	"""
	try:
		from recruitment.recruitment.interview_panel import interviewers_for_stage

		return interviewers_for_stage(stage)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: interviewer panel resolution failed")
		return []


# --------------------------------------------------------------------------- #
# Auto-advance (called after Interview Feedback is submitted)
# --------------------------------------------------------------------------- #
def _blocked_by_pending_extra_round(job_applicant):
	"""True while this candidate has a campus Additional Round awaiting a verdict.

	Scoped to campus additional rounds — a lateral or referral candidate has none, so
	this never touches the ordinary pipeline.
	"""
	try:
		from recruitment.recruitment.doctype.campus_drive.campus_drive import (
			pending_extra_rounds,
		)

		return bool(pending_extra_rounds([job_applicant]))
	except Exception:
		# A guard that cannot be evaluated must not silently stop the pipeline.
		frappe.log_error(frappe.get_traceback(), "pending extra round check failed")
		return False


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

		# A campus candidate with an undecided Additional Round is held where they
		# are. That second look is an open question about them, so nothing may carry
		# them forward until it is answered — clearing it advances them, rejecting it
		# rejects them, and either way it is that round's verdict that decides, not
		# whichever other interview happens to conclude first.
		#
		# The extra round's OWN feedback never reaches here: auto_advance_stage skips
		# campus extra rounds outright and hands them to advance_after_extra_round.
		if _blocked_by_pending_extra_round(applicant):
			return

		doc = frappe.get_doc("Job Applicant", applicant)
		stages = get_applicant_stages(doc)
		current = doc.get(STAGE_FIELD)
		idx = _find_stage(stages, current) if current else -1
		if idx < 0:
			return
		stage = stages[idx]
		# Auto-advance on any Interview-type stage (the whole pipeline is automated
		# once the Hiring Workflow feature is enabled).
		if (stage.get("stage_type") or "") != "Interview":
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


# --------------------------------------------------------------------------- #
# Screening auto-advance (called after the screening engine persists a result)
# --------------------------------------------------------------------------- #
def advance_on_screening_result(job_applicant, passed):
	"""Advance / reject a candidate sitting on a *Screening* stage when the
	auto-screening result lands. No-op unless the feature is on and the current
	stage is a Screening-type stage."""
	try:
		if not is_hiring_workflow_enabled():
			return
		doc = frappe.get_doc("Job Applicant", job_applicant)
		stages = get_applicant_stages(doc)
		current = doc.get(STAGE_FIELD)
		idx = _find_stage(stages, current) if current else -1
		if idx < 0:
			return
		stage = stages[idx]
		if (stage.get("stage_type") or "") != "Screening":
			return
		if not passed:
			_append_history(doc, stage, "Auto (Rejected)", notes="Screening failed")
			doc.status = "Rejected"
			doc.save(ignore_permissions=True)
			return
		nxt = idx + 1
		if nxt < len(stages):
			_enter_stage(doc, stages[nxt], result="Auto (Screened)", ignore_permissions=True)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: screening advance failed")


# --------------------------------------------------------------------------- #
# Pre-offer auto-advance (called after HR approves pre-offer fields)
# --------------------------------------------------------------------------- #
def advance_on_pre_offer_approved(job_applicant):
	"""When every submitted pre-offer field is Approved and the candidate is on a
	*Pre Offer* stage, advance to the next stage (the Job Offer stage)."""
	try:
		if not is_hiring_workflow_enabled():
			return
		doc = frappe.get_doc("Job Applicant", job_applicant)
		stages = get_applicant_stages(doc)
		current = doc.get(STAGE_FIELD)
		idx = _find_stage(stages, current) if current else -1
		if idx < 0:
			return
		stage = stages[idx]
		if (stage.get("stage_type") or "") != "Pre Offer":
			return
		rows = doc.get("custom_pre_offer_field_approvals") or []
		if not rows:
			return
		if not all((r.get("approval_status") or "") == "Approved" for r in rows):
			return
		nxt = idx + 1
		if nxt < len(stages):
			_enter_stage(doc, stages[nxt], result="Auto (Pre-offer approved)", ignore_permissions=True)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: pre-offer advance failed")


# --------------------------------------------------------------------------- #
# Job Offer outcome (called from the Job Offer doc hooks)
# --------------------------------------------------------------------------- #
def advance_on_job_offer_outcome(doc, method=None):
	"""Reflect a Job Offer's Accepted / Rejected outcome on the candidate when they
	are on the final *Offer* stage: Accepted clears the pipeline, Rejected rejects."""
	try:
		if not is_hiring_workflow_enabled():
			return
		status = doc.get("status")
		if status not in ("Accepted", "Rejected"):
			return
		applicant = doc.get("job_applicant")
		if not applicant:
			return
		ja = frappe.get_doc("Job Applicant", applicant)
		stages = get_applicant_stages(ja)
		current = ja.get(STAGE_FIELD)
		idx = _find_stage(stages, current) if current else -1
		if idx < 0:
			return
		stage = stages[idx]
		if (stage.get("stage_type") or "") != "Offer":
			return
		if status == "Accepted" and ja.status != "Accepted":
			_append_history(ja, stage, "Accepted", notes="Job Offer accepted")
			ja.status = "Accepted"
			ja.save(ignore_permissions=True)
		elif status == "Rejected" and ja.status != "Rejected":
			_append_history(ja, stage, "Rejected", notes="Job Offer declined")
			ja.status = "Rejected"
			ja.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: job offer outcome failed")


# What each offer event does to the candidate's sub-status. "Offer Revised" (a new
# version raised by Resend) reopens a candidate who declined — the new letter is
# on its way, exactly as when the first offer was raised.
_OFFER_EVENT_SUBSTATUS = {
	"Offer Withdrawn": "Offer Withdrawn",
	"Offer Cancelled": "Offer Cancelled",
	"Offer Expired": "Offer Expired",
	# The same letter went out again on a new expiry date
	# (offer_expiry.resend_offer_letter) — the candidate is back to deciding.
	"Offer Resent": "Offer Sent",
}


def record_offer_event(offer, event, notes=None):
	"""Reflect an offer event (Offer Sent / Withdrawn / Cancelled / Revised,
	Rejected) on the candidate: a history row on the Offer stage, and the
	sub-status that says where the offer stands.

	Written straight to the database, like `bulk_job_offer._mark_offer_stage`:
	these events come from raw status writes and bulk loops, and must not run the
	Job Applicant's save hooks. Never raises; skipped for a candidate who has
	already accepted.
	"""
	try:
		applicant = offer.get("job_applicant")
		if not applicant:
			return
		ja = frappe.get_doc("Job Applicant", applicant)
		if ja.status == "Accepted":
			return

		note = notes or _("{0} (version {1})").format(
			offer.get("name"), int(offer.get("custom_offer_version") or 1)
		)

		if is_hiring_workflow_enabled():
			stages = get_applicant_stages(ja)
			current = ja.get(STAGE_FIELD)
			idx = _find_stage(stages, current) if current else -1
			if idx >= 0 and (stages[idx].get("stage_type") or "") == "Offer":
				history = ja.get(HISTORY_FIELD) or []
				last = history[-1] if history else None
				# Desk and portal can report the same outcome twice.
				if not (last and last.result == event and (last.notes or "") == note):
					_append_history(ja, stages[idx], event, notes=note).db_insert()

		if event == "Offer Revised":
			from recruitment.api.bulk_job_offer import OFFER_STATUS, SUB_STATUS_TO_SEND

			updates = {"status": OFFER_STATUS, "custom_substatus": SUB_STATUS_TO_SEND}
		elif event in _OFFER_EVENT_SUBSTATUS and ja.status != "Rejected":
			updates = {"custom_substatus": _OFFER_EVENT_SUBSTATUS[event]}
		else:
			return
		_ensure_sub_status_option(updates.get("status") or ja.status, updates["custom_substatus"])
		frappe.db.set_value("Job Applicant", applicant, updates, update_modified=False)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: offer event failed")


# --------------------------------------------------------------------------- #
# Candidate review (Screening / Shortlist dialogs)
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def get_candidate_review(job_applicant):
	"""Summary + resume for the Screening / Shortlist review dialog."""
	doc = frappe.get_doc("Job Applicant", job_applicant)
	work = [
		{
			"company": r.get("company_name"),
			"designation": r.get("designation"),
			"experience": r.get("total_experience"),
			"address": r.get("address"),
		}
		for r in (doc.get("custom_previous_work_experience") or [])
	]
	edu = [
		{
			"qualification": r.get("qualification"),
			"school": r.get("school_univ"),
			"year": r.get("year_of_passing"),
			# Our own numeric field, with the legacy text one behind it for rows
			# recorded before it existed.
			"score": r.get("custom_gpa_percentage") or r.get("class_per"),
		}
		for r in (doc.get("custom_educational_qualification") or [])
	]
	source = doc.get("source") or ""
	if doc.get("source_name"):
		source = "{0} ({1})".format(source, doc.get("source_name")) if source else doc.get("source_name")
	return {
		"name": doc.get("applicant_name"),
		"email": doc.get("email_id"),
		"phone": doc.get("phone_number"),
		"total_experience": doc.get("custom_total_experience"),
		"current_company": doc.get("custom_current_company_name"),
		"current_designation": doc.get("custom_current_designation"),
		"work_experience": work,
		"education": edu,
		"source": source,
		"resume_url": doc.get("resume_attachment"),
		"resume_link": doc.get("resume_link"),
		"current_stage": doc.get(STAGE_FIELD),
	}


@frappe.whitelist()
def complete_review(job_applicant, action, comment=None, tags=None):
	"""Outcome of a Screening / Shortlist review. ``action`` is 'advance'
	(Screen / Shortlist) or 'reject'. The comment is logged and any tags added."""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	if comment:
		try:
			doc.add_comment("Comment", comment)
		except Exception:
			pass
	if tags:
		tag_list = tags if isinstance(tags, list) else json.loads(tags or "[]")
		for t in tag_list:
			try:
				doc.add_tag(t)
			except Exception:
				pass
	if action == "reject":
		return reject_at_current_stage(job_applicant, reason=comment)
	return move_to_next_stage(job_applicant)


# --------------------------------------------------------------------------- #
# Interview completion ("Mark as Completed" → Interview Feedback)
# --------------------------------------------------------------------------- #
def _find_stage_interview(job_applicant, round_name):
	"""The live Interview scheduled for ``round_name``, or None.

	Resolved, not named: v16 dropped ``interview_round`` for ``interview_type``,
	and the old column survives the upgrade — so filtering on the literal matched
	nothing there and a fresh interview was created on every click.
	"""
	round_field = get_interview_round_field()
	return frappe.db.get_value(
		"Interview",
		{"job_applicant": job_applicant, **({round_field: round_name} if round_field else {}),
		 "docstatus": ["<", 2]},
		"name",
	)


@frappe.whitelist()
def complete_interview(job_applicant, rating, comments=None, assessment=None, stage_name=None):
	"""Submit an Interview Feedback for the candidate's current (or given)
	Interview stage, then let the auto-advance hook move them on.

	``assessment`` is "Candidate Selected" (→ Cleared → advance) or
	"Candidate Rejected" (→ Rejected → reject). ``rating`` is 1–5.

	**An Interview must already exist for the stage.** This used to create one on
	the spot, which meant "Mark as Completed" quietly manufactured an interview
	that was never scheduled, never had real interviewers on it and never
	happened — feedback filed against a record invented one second earlier. The
	stage is completed against the interview that was actually held, or not at all:
	schedule it first.
	"""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
	if idx < 0:
		frappe.throw(_("Select an interview stage first."))
	stage = stages[idx]
	round_name = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))

	interview = _find_stage_interview(doc.name, round_name)
	if not interview:
		frappe.throw(
			_("No interview has been scheduled for <b>{0}</b> yet. "
			  "Schedule the interview before marking this stage as completed.").format(
				stage.get("stage_name") or ""
			)
		)

	cleared = (assessment or "") == "Candidate Selected"
	result = "Cleared" if cleared else "Rejected"

	# Rating comes in as 1–5 stars; Interview Feedback stores it as a 0–1 fraction.
	r = flt(rating)
	avg = r / 5.0 if r > 1 else r

	fb = frappe.new_doc("Interview Feedback")
	fb.interview = interview
	fb_round_field = get_interview_round_field("Interview Feedback")
	if fb_round_field:
		fb.set(fb_round_field, round_name)
	fb.interviewer = frappe.session.user
	fb.job_applicant = doc.name
	fb.feedback = comments or ""
	fb.result = result
	fb.average_rating = avg
	fb.flags.ignore_mandatory = True
	fb.flags.ignore_validate = True
	fb.insert(ignore_permissions=True)

	# Set the interview outcome so the on_submit auto-advance hook acts on it.
	frappe.db.set_value("Interview", interview, "status", result)
	fb.submit()
	frappe.db.commit()

	return {"interview": interview, "feedback": fb.name, "result": result}


def _stage_or_throw(doc, stage_name):
	stages = get_applicant_stages(doc)
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
	if idx < 0:
		frappe.throw(_("Select a stage first."))
	return stages, idx


@frappe.whitelist()
def mark_stage_not_required(job_applicant, stage_name=None, comment=None):
	"""Skip the current (or given) stage — record 'Not Required' (with the HR's
	comment) and advance to the next stage without any action.

	Refused for a stage the workflow marks mandatory; see :func:`_assert_skippable`.
	"""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages, idx = _stage_or_throw(doc, stage_name)
	_assert_skippable(stages[idx])
	_append_history(doc, stages[idx], "Not Required", notes=comment)
	if comment:
		try:
			doc.add_comment(
				"Comment",
				_("Marked <b>{0}</b> as Not Required: {1}").format(stages[idx].get("stage_name"), comment),
			)
		except Exception:
			pass
	nxt = idx + 1
	if nxt >= len(stages):
		doc.save(ignore_permissions=True)
		return {"current_stage": stages[idx].get("stage_name"), "skipped": True}
	stage = _enter_stage(doc, stages[nxt], result="Skipped")
	return {"current_stage": stage.get("stage_name")}


def _interview_is_over(iv):
	"""True once the interview's scheduled date + end time has passed (end of
	day when no end time is set)."""
	if not iv.get("scheduled_on") or iv.get("status") == "Cancelled":
		return False
	end = f"{iv.get('scheduled_on')} {iv.get('to_time') or '23:59:59'}"
	return get_datetime(end) <= now_datetime()


@frappe.whitelist()
def send_interview_feedback_form(job_applicant, stage_name=None):
	"""Email the stage interview's interviewer(s) a request to submit feedback
	(a link to the Interview). Allowed only after the interview is over."""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages, idx = _stage_or_throw(doc, stage_name)
	stage = stages[idx]
	round_name = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))

	interview = _find_stage_interview(doc.name, round_name)
	if not interview:
		frappe.throw(_("No interview has been scheduled for <b>{0}</b> yet.").format(stage.get("stage_name") or ""))

	iv = frappe.get_doc("Interview", interview)
	if not _interview_is_over(iv):
		frappe.throw(_("The feedback form can be sent only after the interview is completed."))
	interviewers = [r.interviewer for r in (iv.get("interview_details") or []) if r.interviewer]
	if not interviewers:
		frappe.throw(_("This interview has no interviewers — schedule it and add interviewers first."))

	url = get_url("/app/interview/" + interview)
	message = frappe.render_template(
		"Hello,<br><br>"
		"Please submit your feedback for the <b>{{ round }}</b> interview with "
		"<b>{{ applicant }}</b>.<br><br>"
		"<a href='{{ url }}'>Open the interview to add feedback</a><br><br>"
		"Regards,<br>Recruitment Team",
		{"applicant": doc.get("applicant_name") or doc.name, "round": round_name, "url": url},
	)
	emailed = True
	try:
		sendmail_with_log(
			recipients=interviewers,
			subject=_("Interview feedback requested — {0}").format(doc.get("applicant_name") or doc.name),
			message=message,
			reference_doctype="Interview",
			reference_name=interview,
		)
	except Exception:
		emailed = False
		frappe.log_error(frappe.get_traceback(), "Hiring Workflow: feedback-form email failed")
	frappe.db.set_value("Interview", interview, "status", "Under Review")
	frappe.db.commit()
	return {"interview": interview, "sent_to": interviewers, "emailed": emailed}


# --------------------------------------------------------------------------- #
# Aggregated view for the visual flow (hiring_workflow_flow.js)
# --------------------------------------------------------------------------- #
def _latest_history_by_stage(doc):
	"""Map stage_name -> latest {entered_on, result} from the applicant's history."""
	latest = {}
	for row in (doc.get(HISTORY_FIELD) or []):
		name = row.get("stage_name")
		if not name:
			continue
		prev = latest.get(name)
		if prev is None or (row.get("entered_on") and row.get("entered_on") >= prev["entered_on"]):
			latest[name] = {"entered_on": row.get("entered_on"), "result": row.get("result")}
	return latest


# An interview is still waiting on its interviewers while it sits in one of
# these; anything else (Cleared / Rejected) has been decided.
_OPEN_INTERVIEW_STATUSES = ("Pending", "Under Review")


def _user_names(users):
	"""[{user, full_name}] for the given user ids, in the order given, resolved in
	one query. An id with no User record still comes back (named after itself)
	rather than vanishing from the list."""
	users = [u for u in dict.fromkeys(users) if u]
	if not users:
		return []
	names = dict(frappe.get_all(
		"User", filters={"name": ["in", users]}, fields=["name", "full_name"], as_list=True
	))
	return [{"user": u, "full_name": names.get(u) or u} for u in users]


def _annotate_interview_owners(interviews_by_stage):
	"""Add `interviewers` and `pending_with` to every interview in place.

	`pending_with` answers "whose action is this waiting on?" — the interviewers
	who have not submitted their Interview Feedback yet, and only while the
	interview itself is still open. A decided interview reports nobody pending
	and keeps `interviewers` so the card can say who gave the feedback.

	Three bulk queries for the whole view (rows, feedback, user names) rather
	than any per-interview lookup, so a long pipeline costs the same as a short
	one."""
	rows = [iv for group in interviews_by_stage.values() for iv in group]
	if not rows:
		return
	names = [iv.get("name") for iv in rows]

	panel = {}
	for d in frappe.get_all(
		"Interview Detail",
		filters={"parenttype": "Interview", "parent": ["in", names]},
		fields=["parent", "interviewer"],
		order_by="idx asc",
	):
		if d.get("interviewer"):
			panel.setdefault(d["parent"], []).append(d["interviewer"])

	# Only a submitted feedback counts as "done" — a draft is still pending.
	submitted = {}
	for f in frappe.get_all(
		"Interview Feedback",
		filters={"interview": ["in", names], "docstatus": 1},
		fields=["interview", "interviewer"],
	):
		submitted.setdefault(f["interview"], set()).add(f.get("interviewer"))

	# One lookup for every interviewer across the whole pipeline.
	lookup = {u["user"]: u for u in _user_names([i for ids in panel.values() for i in ids])}

	for iv in rows:
		interviewers = panel.get(iv.get("name"), [])
		done = submitted.get(iv.get("name"), set())
		iv["interviewers"] = [lookup[u] for u in interviewers if u in lookup]
		iv["pending_with"] = (
			[lookup[u] for u in interviewers if u not in done and u in lookup]
			if (iv.get("status") or "Pending") in _OPEN_INTERVIEW_STATUSES
			else []
		)


def _stage_pending_owner(doc):
	"""Who an Interview stage with nothing scheduled is waiting on: the recruiter
	who owns the linked Job Opening. Empty when the opening names none — better
	to say nothing than to name the wrong person."""
	opening = doc.get("job_title")
	if not opening:
		return []
	try:
		recruiter = frappe.db.get_value("Job Opening", opening, "custom_recruiter")
	except Exception:
		return []
	return _user_names([recruiter]) if recruiter else []


@frappe.whitelist()
def get_workflow_view(job_applicant):
	"""Everything the visual stepper needs in one round-trip: the ordered stages
	with per-stage state, interviews grouped by stage, and pre-offer / job-offer
	status for the Offer stage."""
	if not is_hiring_workflow_enabled():
		return {"enabled": False, "stages": []}

	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_applicant_stages(doc)
	current = doc.get(STAGE_FIELD)
	idx = _find_stage(stages, current) if current else -1

	status = doc.get("status")
	rejected = status == "Rejected"
	accepted = status == "Accepted"
	hist = _latest_history_by_stage(doc)

	# Interviews grouped by round name (rounds are named after the stage).
	interviews_by_stage = {}
	round_field = get_interview_round_field()
	for iv in frappe.get_all(
		"Interview",
		# `docstatus < 2` so a cancelled interview does not make a stage look
		# completable — complete_interview ignores those, and the flow's
		# "Mark as Completed" button is enabled off exactly this list.
		filters={"job_applicant": doc.name, "docstatus": ["<", 2]},
		fields=["name", "scheduled_on", "to_time", "status", "average_rating"]
		       + ([round_field] if round_field else []),
		order_by="scheduled_on asc, creation asc",
	):
		iv["is_over"] = _interview_is_over(iv)
		interviews_by_stage.setdefault(
			(iv.get(round_field) if round_field else "") or "", []).append(iv)

	_annotate_interview_owners(interviews_by_stage)
	# Who a stage with no interview yet is waiting on — the opening's recruiter.
	stage_owner = _stage_pending_owner(doc)

	out_stages = []
	for i, s in enumerate(stages):
		if rejected:
			state = "rejected" if i == idx else ("done" if i < idx else "upcoming")
		elif accepted:
			state = "done" if i <= idx else "upcoming"
		else:
			state = "done" if i < idx else ("current" if i == idx else "upcoming")
		info = hist.get(s.get("stage_name")) or {}
		out_stages.append({
			"stage_name": s.get("stage_name"),
			"stage_type": s.get("stage_type"),
			"is_mandatory": 1 if _is_mandatory(s) else 0,
			"state": state,
			"entered_on": info.get("entered_on"),
			"result": info.get("result"),
			"interviews": interviews_by_stage.get(s.get("stage_name"), []),
			# Named only where the answer is "nobody has been asked yet": an
			# Interview stage still to come/in play with no interview scheduled.
			# Once interviews exist, each one carries its own `pending_with`.
			"pending_with": (
				stage_owner
				if state != "done"
				and (s.get("stage_type") or "") == "Interview"
				and not interviews_by_stage.get(s.get("stage_name"))
				else []
			),
		})

	# Pre-offer round + approval snapshot (fields exist once fixtures are applied).
	pre_offer_rows = doc.get("custom_pre_offer_forms") or []
	approval_rows = doc.get("custom_pre_offer_field_approvals") or []
	approval_counts = {"Pending": 0, "Filled": 0, "Approved": 0, "Rejected": 0}
	for r in approval_rows:
		st = r.get("approval_status")
		if st in approval_counts:
			approval_counts[st] += 1
	pre_offer = {
		"sent": bool(pre_offer_rows),
		"status": (pre_offer_rows[-1].get("status") if pre_offer_rows else None),
		"counts": approval_counts,
		"has_rejections": approval_counts["Rejected"] > 0,
	}

	# Newest version first. A cancelled one still counts — it is what "Resend Job
	# Offer" copies — and the older versions are listed beneath it as history.
	from recruitment.api.offer_lifecycle import offer_actions, offers_of

	versions = offers_of(
		doc.name,
		# offer_date / expiry carry the validity window the flow's "Resend Offer
		# Letter" prompt defaults from.
		fields=(
			"name", "status", "docstatus", "email_status", "custom_offer_version",
			"offer_date", "custom_jo_expiry_date", "creation",
		),
	)
	offer = versions[0] if versions else None
	offer_action_map = None
	if offer:
		offer["version"] = int(offer.get("custom_offer_version") or 1)
		for v in versions[1:]:
			v["version"] = int(v.get("custom_offer_version") or 1)
		offer_action_map = offer_actions(frappe.get_doc("Job Offer", offer.name))

	return {
		"enabled": True,
		"current_stage": current,
		"current_stage_index": idx,
		"current_stage_type": (stages[idx].get("stage_type") if idx >= 0 else None),
		"is_last": idx >= 0 and idx == len(stages) - 1,
		"status": status,
		"is_closed": rejected or accepted,
		"stages": out_stages,
		"pre_offer": pre_offer,
		"job_offer": offer,
		"job_offer_actions": offer_action_map,
		"previous_offers": versions[1:],
	}


@frappe.whitelist()
def get_pre_offer_form_preview(job_applicant):
	"""The pre-offer form as the candidate will receive it, before it is sent.

	Backs the "Preview" button on the Pre Job Offer stage. The stage's existing
	"View Pre Offer Form" opens the approval panel, which is built from the rows
	the candidate's *submission* creates — so before sharing there is nothing to
	look at. This answers the other question: which fields is this opening going
	to ask for?

	Read-only, and deliberately built by the very same function that renders the
	real form (`get_application_fields_for_channel(..., "preoffer")`), so the
	preview cannot drift from what is actually sent. No applicant is passed to
	it: a preview shows the form, not this candidate's answers.
	"""
	if not job_applicant:
		frappe.throw(_("job_applicant is required"))
	frappe.has_permission("Job Applicant", "read", doc=job_applicant, throw=True)

	opening = frappe.db.get_value("Job Applicant", job_applicant, "job_title")

	from recruitment.api.channels import _common

	fields = _common.get_application_fields_for_channel(opening, "preoffer") or []
	return {
		"job_opening": opening,
		"fields": [
			{
				"section": f.get("section") or _("General"),
				"display_name": f.get("display_name"),
				"reference_name": f.get("reference_name"),
				"fieldtype": f.get("fieldtype"),
				"reqd": 1 if f.get("reqd") else 0,
			}
			for f in fields
		],
	}
