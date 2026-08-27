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
"""

import frappe
from frappe import _
from frappe.utils import cint

from recruitment.customizations.ta_duplicity_check import (
	get_settings,
	match_fields,
	resolve_company,
	user_can_override,
	_setting,
)
from recruitment.customizations.ta_rehire_check import (
	ALLOW,
	BLOCK,
	EXCEPTIONAL,
	find_matches,
)

JOB_OFFER = "Job Offer"
JOB_APPLICANT = "Job Applicant"

EXCEPTION_FLAG = "custom_duplicity_exception_required"
EXCEPTION_REASON = "custom_duplicity_exception_reason"

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
		return

	_check_active_offer(offer, applicant, settings)
	_check_employee_pool(offer, applicant, settings, reasons)

	_stamp(offer, reasons)


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


def _check_active_offer(offer, applicant, settings):
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
	frappe.throw(
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

def _check_employee_pool(offer, applicant, settings, reasons):
	"""Apply the configured outcome for each employee-pool match."""
	# Nothing configured to act on — skip the Employee read entirely.
	configured = [
		_setting(settings, f, ALLOW)
		for f in ("active_employee_non_ijp_action", "do_not_rehire_action")
	]
	if not cint(_setting(settings, "days_before_reapplication_post_exit")) and all(
		a in (ALLOW, None, "") for a in configured
	):
		return

	result = find_matches(applicant, settings=settings)

	# The employee this application was raised from is not a discovery — the IJP
	# flow linked them on purpose.
	matches = [m for m in result["matches"] if not m.get("is_linked")]
	if not matches:
		return

	blocking = [m for m in matches if m.get("action") == BLOCK]
	if blocking:
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

	for match in matches:
		if match.get("action") != EXCEPTIONAL:
			continue
		reasons.append(
			_("{0} ({1} — {2}): {3}").format(
				match.get("verdict_label"),
				match.get("name"),
				match.get("employee_name") or "",
				match.get("verdict_detail") or "",
			)
		)


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

	offer.set(EXCEPTION_FLAG, 1 if reasons else 0)
	if meta.has_field(EXCEPTION_REASON):
		offer.set(EXCEPTION_REASON, "\n".join(reasons) if reasons else None)

	if reasons:
		frappe.msgprint(
			_("This offer matches the employee pool and needs exceptional approval. "
			  "It has been routed to the configured approval flow.<br><br>{0}").format(
				"<br>".join(reasons)
			),
			title=_("Exceptional Approval Required"),
			indicator="orange",
		)
