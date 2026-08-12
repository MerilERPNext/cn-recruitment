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
from frappe.utils import flt, get_url, now_datetime, today

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
			"stage_name", "stage_type", "sla", "sla_unit",
			"owner_role", "notify", "auto", "notes", "idx",
		],
		order_by="idx asc",
	)
	if not rows:
		return rows
	return _append_offer_stages(job_opening, rows)


def _terminal_stage(name, stage_type, idx):
	return {
		"stage_name": name, "stage_type": stage_type,
		"sla": 0, "sla_unit": "d", "owner_role": "HR",
		"notify": 0, "auto": 0, "notes": "", "idx": idx,
	}


def _append_offer_stages(job_opening, rows, enable_pre=None):
	"""Append the virtual Pre Job Offer / Job Offer terminal stages.

	``enable_pre`` lets a caller that already knows the opening's
	``custom_enable_pre_job_offer`` flag pass it in (see ``get_openings_stages``),
	so a batch over many openings doesn't re-query it one opening at a time.
	"""
	try:
		types_present = {(r.get("stage_type") or "") for r in rows}
		idx = max([(r.get("idx") or 0) for r in rows] or [0])
		if enable_pre is None:
			enable_pre = frappe.db.get_value(
				"Job Opening", job_opening, "custom_enable_pre_job_offer"
			)
		if enable_pre and "Pre Offer" not in types_present:
			idx += 1
			rows.append(_terminal_stage("Pre Job Offer", "Pre Offer", idx))
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
			"parent", "stage_name", "stage_type", "sla", "sla_unit",
			"owner_role", "notify", "auto", "notes", "idx",
		],
		order_by="parent asc, idx asc",
	)
	pre_flags = {
		r.name: r.custom_enable_pre_job_offer
		for r in frappe.get_all(
			"Job Opening",
			filters={"name": ["in", openings]},
			fields=["name", "custom_enable_pre_job_offer"],
		)
	}

	grouped = {o: [] for o in openings}
	for row in rows:
		grouped[row.pop("parent")].append(row)

	return {
		o: (_append_offer_stages(o, stages, enable_pre=pre_flags.get(o)) if stages else stages)
		for o, stages in grouped.items()
	}


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


def _notify_stage_entry(doc, stage):
	"""Best-effort candidate email on stage entry. Never blocks the transition."""
	try:
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

	# Forward-only: a completed / current stage can't be revisited.
	current = doc.get(STAGE_FIELD)
	cur_idx = _find_stage(stages, current) if current else -1
	if idx <= cur_idx:
		frappe.throw(_("The hiring workflow moves forward only — you can't return to a completed or the current stage."))

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
	stages = get_opening_stages(doc.get("job_title"))
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
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
		stages = get_opening_stages(doc.get("job_title"))
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
		stages = get_opening_stages(doc.get("job_title"))
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
		stages = get_opening_stages(ja.get("job_title"))
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
			"score": r.get("class_per"),
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
@frappe.whitelist()
def complete_interview(job_applicant, rating, comments=None, assessment=None, stage_name=None):
	"""Create (and submit) an Interview Feedback for the candidate's current (or
	given) Interview stage, then let the auto-advance hook move them on.

	``assessment`` is "Candidate Selected" (→ Cleared → advance) or
	"Candidate Rejected" (→ Rejected → reject). ``rating`` is 1–5.
	"""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
	if idx < 0:
		frappe.throw(_("Select an interview stage first."))
	stage = stages[idx]
	round_name = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))

	# Reuse an interview scheduled for this stage, else create one now.
	# Resolved, not named: v16 dropped `interview_round` for `interview_type`, and
	# the old column survives the upgrade — so filtering on the literal matched
	# nothing there and a fresh interview was created on every click.
	round_field = get_interview_round_field()
	interview = frappe.db.get_value(
		"Interview",
		{"job_applicant": doc.name, **({round_field: round_name} if round_field else {}),
		 "docstatus": ["<", 2]},
		"name",
	)
	if not interview:
		iv = frappe.new_doc("Interview")
		iv.job_applicant = doc.name
		if round_field:
			iv.set(round_field, round_name)
		iv.job_opening = doc.get("job_title")
		if doc.get("designation"):
			iv.designation = doc.get("designation")
		iv.scheduled_on = today()
		# At least one interviewer is mandatory (the feedback's on_submit re-saves
		# the Interview, re-running validation) — use the acting HR user.
		iv.append("interview_details", {"interviewer": frappe.session.user})
		iv.flags.ignore_mandatory = True
		# Rounds are shared by stage name across designations; skip HRMS's
		# round↔designation validation so completing feedback never gets blocked.
		iv.flags.ignore_validate = True
		iv.insert(ignore_permissions=True)
		interview = iv.name

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
	stages = get_opening_stages(doc.get("job_title"))
	target = stage_name or doc.get(STAGE_FIELD)
	idx = _find_stage(stages, target) if target else -1
	if idx < 0:
		frappe.throw(_("Select a stage first."))
	return stages, idx


@frappe.whitelist()
def mark_stage_not_required(job_applicant, stage_name=None, comment=None):
	"""Skip the current (or given) stage — record 'Not Required' (with the HR's
	comment) and advance to the next stage without any action."""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages, idx = _stage_or_throw(doc, stage_name)
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


@frappe.whitelist()
def send_interview_feedback_form(job_applicant, stage_name=None):
	"""Ensure an Interview exists for the stage and email its interviewer(s) a
	request to submit feedback (a link to the Interview)."""
	_require_applicant_write(job_applicant)
	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages, idx = _stage_or_throw(doc, stage_name)
	stage = stages[idx]
	round_name = _ensure_interview_round(stage.get("stage_name"), doc.get("designation"))

	# Resolved, not named: v16 dropped `interview_round` for `interview_type`, and
	# the old column survives the upgrade — so filtering on the literal matched
	# nothing there and a fresh interview was created on every click.
	round_field = get_interview_round_field()
	interview = frappe.db.get_value(
		"Interview",
		{"job_applicant": doc.name, **({round_field: round_name} if round_field else {}),
		 "docstatus": ["<", 2]},
		"name",
	)
	if not interview:
		iv = frappe.new_doc("Interview")
		iv.job_applicant = doc.name
		if round_field:
			iv.set(round_field, round_name)
		iv.job_opening = doc.get("job_title")
		iv.scheduled_on = today()
		iv.append("interview_details", {"interviewer": frappe.session.user})
		iv.flags.ignore_mandatory = True
		iv.flags.ignore_validate = True
		iv.insert(ignore_permissions=True)
		interview = iv.name

	iv = frappe.get_doc("Interview", interview)
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
		frappe.sendmail(
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


@frappe.whitelist()
def get_workflow_view(job_applicant):
	"""Everything the visual stepper needs in one round-trip: the ordered stages
	with per-stage state, interviews grouped by stage, and pre-offer / job-offer
	status for the Offer stage."""
	if not is_hiring_workflow_enabled():
		return {"enabled": False, "stages": []}

	doc = frappe.get_doc("Job Applicant", job_applicant)
	stages = get_opening_stages(doc.get("job_title"))
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
		filters={"job_applicant": doc.name},
		fields=["name", "scheduled_on", "status", "average_rating"]
		       + ([round_field] if round_field else []),
		order_by="scheduled_on asc, creation asc",
	):
		interviews_by_stage.setdefault(
			(iv.get(round_field) if round_field else "") or "", []).append(iv)

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
			"state": state,
			"entered_on": info.get("entered_on"),
			"result": info.get("result"),
			"interviews": interviews_by_stage.get(s.get("stage_name"), []),
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

	offer = frappe.db.get_value(
		"Job Offer",
		{"job_applicant": doc.name, "docstatus": ["!=", 2]},
		["name", "status", "docstatus"],
		as_dict=True,
	)

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
	}
