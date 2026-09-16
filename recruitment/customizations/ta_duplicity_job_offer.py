"""Offer-time duplicity rules — the gate on the Job Offer.

Two groups of rules from TA Duplicity Check Settings are decided here rather than
at the application, because the specification decides them at the offer:

  * "Block Job Offers if an Active Job Offer is Present in Any Job" — the same
    person may not hold two live offers at once, even across two Job Applicant
    records and two openings.
  * "Duplicity Check with Employee Pool" — the candidate matches someone on the
    payroll (Active, or flagged Do Not Rehire, or exited too recently). Detection
    and classification come from ``ta_rehire_check``; this module applies the
    outcome configured for each verdict.

Three outcomes, per verdict:

    Block Job Offer        refuse the save outright
    Exceptional Approval   allow the save, and flag the offer so the approval
                           engine takes it (see below)
    Allow Job Offer        do nothing

Exceptional Approval
--------------------
No approval mechanism is built here. The offer is stamped with
``custom_duplicity_exception_required = 1`` plus the reason, and the existing
approval engine picks it up: a Flow Config whose Module Transaction is Job Offer,
Trigger Type "Document Event" and Doc Event Field
``custom_duplicity_exception_required`` = ``1`` runs the Approval Policy Matrix
listed on it. That keeps routing, stages, notifications and SLA where they are
already configured, instead of a second approval path living in recruitment.

Allow Hiring
------------
With "Allow Hiring Even Though It Matches Duplicity Check Settings" ticked,
nothing here refuses the offer. Every block, every Exceptional Approval outcome,
and every reason the candidate was flagged with at application are gathered into
one approval: ``custom_duplicity_approval_trigger`` is set to the name of the
setting's Exceptional Approval Workflow (its first version, see
``flow_trigger_value``), which starts that Flow Config — its Doc Event Field is
that field and its Value is its own name, so settings sharing a flow share it. The
legacy ``custom_duplicity_exception_required`` flag is left clear on that route,
so a Flow Config still keyed on it does not start a second approval.

New offers
----------
Nextai starts an on_update flow only when the watched field differs from the
document as it was before the save, and skips a document with no "before" — which
every insert is. So on a NEW offer neither trigger is written during the insert;
the reasons are, and ``_schedule_trigger`` re-saves the offer once the insert has
committed, which is the save the flow actually sees.
"""

import frappe
from frappe import _
from frappe.utils import cint, escape_html

from recruitment.customizations.ta_duplicity_check import (
	FLAGGED_FIELD,
	FLAG_REASON_FIELD,
	Gate,
	get_settings,
	match_fields,
	resolve_company,
	user_can_override,
	_setting,
)
from recruitment.customizations.ta_rehire_check import (
	BLOCK,
	controlled_pool_matches,
	match_reason,
)
from recruitment.recruitment.doctype.ta_duplicity_check_settings.ta_duplicity_check_settings import (
	flow_trigger_value,
)

JOB_OFFER = "Job Offer"
JOB_APPLICANT = "Job Applicant"

EXCEPTION_FLAG = "custom_duplicity_exception_required"
EXCEPTION_REASON = "custom_duplicity_exception_reason"

# The Allow Hiring route's trigger, stamped with the approval flow's first-version
# name — the one value every version of that flow keeps matching.
APPROVAL_TRIGGER = "custom_duplicity_approval_trigger"
APPROVAL_REASON = "custom_duplicity_approval_reason"

CANCELLED = 2

# An offer in one of these is finished and cannot conflict with a new one.
# Filtered against the live Select options, so a site without the custom
# withdrawal statuses is unaffected.
# Kept in step with ``api.offer_validation.INACTIVE_STATUSES``; the extra names
# are tolerated for sites that renamed or added withdrawal statuses.
_TERMINAL_OFFER_STATUSES = ("Rejected", "Withdrawn", "Offer Withdrawn", "Declined", "Cancelled")


# ---------------------------------------------------------------------------
# Hook (hooks.py -> Job Offer -> validate)
# ---------------------------------------------------------------------------

def check_job_offer_duplicity(offer, method=None):
	"""Enforce the offer-time rules of TA Duplicity Check Settings."""
	if not offer.get("job_applicant"):
		return

	try:
		applicant = frappe.get_doc(JOB_APPLICANT, offer.job_applicant)
	except frappe.DoesNotExistError:
		return

	company = offer.get("company") or resolve_company(applicant)
	settings = get_settings(company)
	if not settings:
		return

	# Reasons accumulate: an offer can need an exception for more than one thing,
	# and the approver should see all of them, not the first one found.
	reasons = []

	if user_can_override(settings):
		_stamp(offer, [])
		_stamp_allow_hiring(offer, settings, [])
		return

	gate = Gate(settings)
	_check_active_offer(offer, applicant, settings, gate)
	_check_employee_pool(applicant, settings, gate, reasons)

	if not gate.allow_hiring:
		_stamp(offer, reasons)
		_stamp_allow_hiring(offer, settings, [])
		return

	# One approval covers everything: what flagged the candidate at application,
	# and what blocks or needs an exception now.
	approval = _application_reasons(applicant) + gate.reasons + reasons
	_stamp(offer, [])
	_stamp_allow_hiring(offer, settings, list(dict.fromkeys(approval)))


def _application_reasons(applicant):
	"""What the candidate was flagged with when Allow Hiring let them apply.

	Application-time rules are not re-run at the offer, so these are carried from
	the application; a flagged candidate's offer always needs the approval.
	"""
	if not cint(applicant.get(FLAGGED_FIELD)):
		return []
	return [r.strip() for r in (applicant.get(FLAG_REASON_FIELD) or "").split("\n") if r.strip()]


# ---------------------------------------------------------------------------
# Active offer elsewhere
# ---------------------------------------------------------------------------

def _active_offer_statuses():
	"""Statuses that still count as a live offer on this site."""
	meta = frappe.get_meta(JOB_OFFER)
	field = meta.get_field("status")
	options = [
		o.strip() for o in (field.options or "").split("\n") if o.strip()
	] if field else []
	if not options:
		return None  # Unknown schema — fall back to "any non-cancelled offer".
	return [o for o in options if o not in _TERMINAL_OFFER_STATUSES]


def _person_applicants(applicant, settings):
	"""Job Applicant records OTHER than this one that are the same person.

	The whole point of a duplicity check: a second application under a second
	Job Applicant record is still the same candidate, so an offer held against
	that record has to count here too.

	Deliberately excludes the offer's own applicant. That case is already gated
	by ``api.offer_validation`` (Recruitment Settings -> "Allow Multiple Active
	Job Offers per Candidate"), which owns the message and the override for it —
	checking it again here would refuse the same offer twice, with two different
	explanations.
	"""
	fields = match_fields(settings)
	or_filters = [[f, "=", applicant.get(f)] for f in fields if applicant.get(f)]
	if not or_filters:
		return []

	rows = frappe.get_all(
		JOB_APPLICANT,
		filters=[["name", "!=", applicant.name]],
		or_filters=or_filters,
		fields=["name"],
		ignore_permissions=True,
		limit_page_length=100,
	)
	return [r["name"] for r in rows]


def _check_active_offer(offer, applicant, settings, gate):
	if not cint(_setting(settings, "block_job_offer_if_active_offer_exists")):
		return

	applicants = _person_applicants(applicant, settings)
	if not applicants:
		return

	filters = [
		["job_applicant", "in", applicants],
		["docstatus", "!=", CANCELLED],
		["name", "!=", offer.name or ""],
	]
	statuses = _active_offer_statuses()
	if statuses:
		filters.append(["status", "in", statuses])

	rows = frappe.get_all(
		JOB_OFFER,
		filters=filters,
		fields=["name", "job_applicant", "status", "designation"],
		ignore_permissions=True,
		limit_page_length=5,
	)
	if not rows:
		return

	clash = rows[0]
	gate.refuse(
		_("This candidate already holds an active job offer ({0}, status {1}){2}, "
		  "under application {3}. A second offer is not permitted while it is open.").format(
			frappe.bold(clash["name"]),
			frappe.bold(clash.get("status") or ""),
			_(" for {0}").format(frappe.bold(clash["designation"])) if clash.get("designation") else "",
			frappe.bold(clash["job_applicant"]),
		),
		title=_("Active Job Offer Present"),
	)


# ---------------------------------------------------------------------------
# Employee pool
# ---------------------------------------------------------------------------

def _check_employee_pool(applicant, settings, gate, reasons):
	"""Apply the configured outcome for each employee-pool match.

	Under Allow Hiring a block does not refuse; it joins the approval reasons with
	the Exceptional Approval matches.
	"""
	matches = controlled_pool_matches(applicant, settings)

	blocking = [m for m in matches if m.get("action") == BLOCK]
	if blocking and not gate.allow_hiring:
		match = blocking[0]
		frappe.throw(
			_("{0} is already on record as an employee ({1} — {2}). {3}").format(
				frappe.bold(applicant.get("applicant_name") or _("This candidate")),
				match.get("name"),
				match.get("employee_name") or "",
				match.get("verdict_detail") or "",
			),
			title=_("Duplicity Check: {0}").format(match.get("verdict_label")),
		)

	reasons.extend(match_reason(m) for m in matches)


# ---------------------------------------------------------------------------
# The Exceptional Approval stamp
# ---------------------------------------------------------------------------

def _stamp(offer, reasons):
	"""Set or clear the fields the Flow Config document event triggers on.

	Cleared when nothing needs an exception, so an offer that was corrected does
	not stay flagged and re-enter the approval flow on its next save.
	"""
	meta = frappe.get_meta(JOB_OFFER)
	if not meta.has_field(EXCEPTION_FLAG):
		if reasons:
			frappe.msgprint(
				_("This offer requires exceptional approval, but the approval trigger "
				  "field is missing. Run <b>bench migrate</b> to add it.<br><br>{0}").format(
					"<br>".join(reasons)
				),
				title=_("Exceptional Approval Required"),
				indicator="orange",
			)
		return

	# A trigger set during an insert is never seen by the flow — see _schedule_trigger.
	defer = bool(reasons) and offer.is_new()
	offer.set(EXCEPTION_FLAG, 1 if reasons and not defer else 0)
	if defer:
		_schedule_trigger(offer)
	if meta.has_field(EXCEPTION_REASON):
		offer.set(EXCEPTION_REASON, "\n".join(reasons) if reasons else None)

	if reasons and not offer.flags.duplicity_follow_up:
		frappe.msgprint(
			_("This offer matches the employee pool and needs exceptional approval. "
			  "It has been routed to the configured approval flow.<br><br>{0}").format(
				"<br>".join(reasons)
			),
			title=_("Exceptional Approval Required"),
			indicator="orange",
		)


def _stamp_allow_hiring(offer, settings, reasons):
	"""Set or clear the trigger the Allow Hiring approval flow fires on.

	Nextai starts a Document Event flow when the field CHANGES to its value, so
	the approval starts once: re-saving a flagged offer does not start it again,
	and an offer that stops matching is cleared so a later match starts it anew.
	On a new offer the value is written by a follow-up save (``_schedule_trigger``).
	"""
	meta = frappe.get_meta(JOB_OFFER)
	if not meta.has_field(APPROVAL_TRIGGER):
		if reasons:
			frappe.msgprint(
				_("This offer requires exceptional approval, but the approval trigger "
				  "field is missing. Run <b>bench migrate</b> to add it.<br><br>{0}").format(
					"<br>".join(escape_html(r) for r in reasons)
				),
				title=_("Exceptional Approval Required"),
				indicator="orange",
			)
		return

	flow = _setting(settings, "exceptional_approval_workflow", None)
	trigger = flow_trigger_value(flow) if reasons else None

	if reasons and not trigger and not offer.flags.duplicity_follow_up:
		frappe.msgprint(
			_("This offer matches {0} and needs exceptional approval, but no Exceptional "
			  "Approval Workflow is set on it, so no approval has started.<br><br>{1}").format(
				frappe.bold(settings.name), "<br>".join(escape_html(r) for r in reasons)
			),
			title=_("Exceptional Approval Required"),
			indicator="orange",
		)

	newly_set = bool(trigger) and not offer.flags.duplicity_follow_up and (
		offer.is_new() or frappe.db.get_value(JOB_OFFER, offer.name, APPROVAL_TRIGGER) != trigger
	)

	if trigger and offer.is_new():
		# A trigger set during an insert is never seen by the flow — see _schedule_trigger.
		offer.set(APPROVAL_TRIGGER, None)
		_schedule_trigger(offer)
	else:
		offer.set(APPROVAL_TRIGGER, trigger)
	if meta.has_field(APPROVAL_REASON):
		offer.set(APPROVAL_REASON, "\n".join(reasons) if reasons else None)

	if newly_set:
		frappe.msgprint(
			_("This candidate matches {0}. Hiring is allowed under it, so this offer has been "
			  "sent to exceptional approval workflow {1}.<br><br>{2}").format(
				frappe.bold(settings.name),
				frappe.bold(flow),
				"<br>".join(escape_html(r) for r in reasons),
			),
			title=_("Exceptional Approval Required"),
			indicator="orange",
		)


def _schedule_trigger(offer):
	"""Have a NEW offer's approval trigger written by a follow-up save.

	Nextai's on_update trigger compares the watched field with the document as it
	was before the save, and skips a document that has no "before" — which is every
	insert (``on_doctype_events.on_trigger_doc_events``). A second save inside the
	insert's own hooks is not an option either: the document still counts as new
	there, so it would insert again. The offer is therefore re-saved once the insert
	has committed; that save has a "before" with the trigger blank, so the flow
	starts.
	"""
	frappe.enqueue(
		"recruitment.customizations.ta_duplicity_job_offer.apply_approval_trigger",
		queue="short",
		job_id=f"duplicity-approval-trigger::{frappe.local.site}::{offer.name}",
		deduplicate=True,
		enqueue_after_commit=True,
		job_offer=offer.name,
	)


def apply_approval_trigger(job_offer):
	"""Background job: re-save a new offer so the duplicity check writes its trigger."""
	docstatus = frappe.db.get_value(JOB_OFFER, job_offer, "docstatus")
	if docstatus is None or docstatus == CANCELLED:
		return
	try:
		doc = frappe.get_doc(JOB_OFFER, job_offer)
		doc.flags.duplicity_follow_up = True
		doc.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(title=f"Duplicity approval trigger not written for {job_offer}")
		raise
