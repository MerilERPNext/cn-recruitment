"""Job Offer eligibility — the gates a candidate must clear before being offered.

Three checks, in the order a recruiter meets them coming from the Job Applicant's
hiring workflow ("Create Job Offer" on the Offer stage):

1. **Active offer** — a candidate already holding a live offer can't be given
   another, unless Recruitment Settings → "Allow Multiple Active Job Offers per
   Candidate" is ticked. Active means not cancelled and not Rejected, so both a
   draft "Awaiting Response" and a submitted "Accepted" offer block a second one.

2. **No requisition** — openings are sometimes raised directly, with no
   requisition behind them. There is then no approved headcount to offer
   against, so the offer is refused until one is linked.

3. **No positions left** — the requisition's headcount is already consumed by
   active offers. Where the headcount lives depends on how the requisition was
   raised:
     * campus / Fresher hiring budgets openings per **region** (Job Requisition
       Region.no_of_openings), so the candidate's own region is what's checked;
     * everything else uses the **position list** (Position Details rows), and
       falls back to `no_of_positions` for requisitions that keep no rows.

One function backs both entry points. The workflow button asks before opening a
blank Job Offer, so the recruiter is told *before* filling anything in; Job
Offer.validate asks again on insert, so the rule can't be walked around by
creating the offer from somewhere else (bulk creation included).
"""

import frappe
from frappe import _
from frappe.query_builder.functions import Coalesce, Count
from frappe.utils import cint

JOB_OFFER = "Job Offer"
JOB_OPENING = "Job Opening"
JOB_REQUISITION = "Job Requisition"

# An offer stops counting against headcount only once it is cancelled, refused by
# the candidate (Rejected), pulled by the company (Withdrawn) or lapsed unanswered
# (Expired). Each of those also releases the position it held — see
# recruitment.api.offer_position and recruitment.api.offer_expiry.
REJECTED_STATUS = "Rejected"
INACTIVE_STATUSES = (REJECTED_STATUS, "Withdrawn", "Expired")


def _allow_multiple_offers() -> bool:
	"""Read the override switch, tolerating a site that hasn't migrated yet.

	`get_single_value` raises for an unknown fieldname, and this runs inside Job
	Offer.validate — an un-migrated site would fail every offer save rather than
	just missing the setting.
	"""
	if not frappe.get_meta("Recruitment Settings").has_field("allow_multiple_job_offers"):
		return False
	return bool(
		frappe.db.get_single_value("Recruitment Settings", "allow_multiple_job_offers")
	)


def _accepted_direct_proposal(job_applicant: str) -> bool:
	"""A direct applicant (feature on) whose CTC Proposal was accepted."""
	from recruitment.api.direct_applicant import is_direct, is_enabled

	if not is_enabled() or not is_direct(
		frappe.db.get_value("Job Applicant", job_applicant, ["custom_da_is_direct"], as_dict=True)
	):
		return False
	return bool(frappe.db.exists(
		"CTC Proposal",
		{"job_applicant": job_applicant, "status": ["in", ("Accepted", "Offer Created", "Offer Failed")]},
	))


def _deny(code: str, message: str) -> dict:
	return {"allowed": False, "code": code, "message": message}


def _active_offer_for_applicant(job_applicant: str, exclude_offer: str | None = None) -> dict | None:
	filters = {
		"job_applicant": job_applicant,
		"docstatus": ["!=", 2],
		"status": ["not in", INACTIVE_STATUSES],
	}
	if exclude_offer:
		filters["name"] = ["!=", exclude_offer]
	return frappe.db.get_value(
		JOB_OFFER, filters, ["name", "status", "designation"], as_dict=True
	)


def _pre_offer_not_approved(job_applicant: str) -> str | None:
	"""Why a pre-offer that was sent still blocks the first offer, or None.

	Only a candidate who was actually SENT the pre-offer form is held: a Pre Offer
	stage skipped without sending has nothing to approve. A candidate who already
	has an offer (a revision, a resend) is not re-checked — the gate is for the
	first offer, and older offers predate it.
	"""
	if not frappe.db.exists(
		"Job Applicant Pre Offer Form", {"parent": job_applicant, "parenttype": "Job Applicant"}
	):
		return None
	# Any offer already on record — including the one a resend check excludes,
	# which is exactly the offer being revised. A brand-new offer is not in the
	# database yet while it validates, so it never counts itself.
	if frappe.db.exists(JOB_OFFER, {"job_applicant": job_applicant}):
		return None

	rows = frappe.get_all(
		"Job Applicant Pre Offer Field",
		filters={"parent": job_applicant, "parenttype": "Job Applicant"},
		fields=["label", "fieldname", "approval_status"],
		order_by="idx asc",
	)
	if not rows:
		return _(
			"The Pre Offer form was sent to the candidate but has not been submitted yet. "
			"The Job Offer can be created once the candidate submits it and every field is approved."
		)
	open_fields = [r.label or r.fieldname for r in rows if (r.approval_status or "") != "Approved"]
	if open_fields:
		return _(
			"Every Pre Offer field must be approved before the Job Offer is created. Still open: {0}"
		).format(", ".join(open_fields))
	return None


def _offers_against(requisition: str, region: str | None, exclude_offer: str | None = None) -> int:
	"""Active offers drawing on this requisition's headcount, in one query.

	Job Offer carries the applicant, not the opening, so the opening is reached
	through the applicant — a two-join count rather than listing the openings and
	then counting offers against them.

	Built with `frappe.qb` rather than raw SQL: the query builder emits the right
	dialect for MariaDB and Postgres alike, and doesn't rely on backtick quoting.
	"""
	Offer = frappe.qb.DocType(JOB_OFFER)
	Applicant = frappe.qb.DocType("Job Applicant")
	Opening = frappe.qb.DocType(JOB_OPENING)

	query = (
		frappe.qb.from_(Offer)
		.inner_join(Applicant)
		.on(Applicant.name == Offer.job_applicant)
		.inner_join(Opening)
		.on(Opening.name == Applicant.job_title)
		.select(Count("*"))
		.where(Opening.job_requisition == requisition)
		.where(Offer.docstatus != 2)
		# Coalesce, not a plain NOT IN: in SQL a NULL status would fail the
		# comparison and quietly stop counting against headcount.
		.where(Coalesce(Offer.status, "").notin(INACTIVE_STATUSES))
	)
	if region:
		query = query.where(Opening.custom_region == region)
	if exclude_offer:
		query = query.where(Offer.name != exclude_offer)

	rows = query.run()
	return cint(rows[0][0]) if rows else 0


def _capacity(requisition: str, region: str | None) -> tuple:
	"""Headcount available to this offer, plus a label for the error message.

	Reads only the numbers it needs — loading the Job Requisition document would
	pull every child table on it (positions, position summary, regions,
	qualifications, skills, screening questions) to read one integer.

	Campus/Fresher requisitions carry no position rows: their headcount sits in
	the Regions table, one row per region. Everything else counts the position
	list, which `sync_no_of_positions` keeps `no_of_positions` in step with; the
	field is the fallback for requisitions that keep no rows.
	"""
	if region:
		# 1 query — the budgeted openings for exactly this region.
		openings = frappe.db.get_value(
			"Job Requisition Region",
			{"parent": requisition, "parenttype": JOB_REQUISITION, "region": region},
			"no_of_openings",
		)
		# None => the opening names a region this requisition doesn't budget for.
		return cint(openings), _("region {0}").format(region)

	# 1 query, and a 2nd only for requisitions that keep no position rows.
	position_rows = frappe.db.count(
		"Position Details", {"parent": requisition, "parenttype": JOB_REQUISITION}
	)
	if position_rows:
		return cint(position_rows), _("position list")

	return (
		cint(frappe.db.get_value(JOB_REQUISITION, requisition, "no_of_positions")),
		_("requisition headcount"),
	)


def check_offer_allowed(job_applicant: str, exclude_offer: str | None = None) -> dict:
	"""Return {"allowed": bool, "code": str, "message": str} for this candidate."""
	applicant = frappe.db.get_value(
		"Job Applicant",
		job_applicant,
		["name", "applicant_name", "job_title", "designation"],
		as_dict=True,
	)
	if not applicant:
		return _deny("applicant_missing", _("Job Applicant {0} not found.").format(job_applicant))

	# 1 — candidate already holds a live offer
	if not _allow_multiple_offers():
		existing = _active_offer_for_applicant(job_applicant, exclude_offer)
		if existing:
			return _deny(
				"active_offer",
				_("Cannot initiate offer as candidate has an active offer for designation - {0}.").format(
					existing.designation or applicant.designation or _("this role")
				)
				+ " "
				+ _("Enable 'Allow Multiple Active Job Offers per Candidate' in Recruitment Settings to override."),
			)

	# 1b — a pre-offer form that went out must be fully approved first
	pending = _pre_offer_not_approved(job_applicant)
	if pending:
		return _deny("pre_offer_pending", pending)

	# Direct Applicant Onboarding: no Job Opening or requisition by design — the
	# CTC Proposal the candidate accepted stands in for the headcount. Only with
	# the feature on and such a proposal; checks 1 and 1b still apply.
	if not applicant.job_title and _accepted_direct_proposal(job_applicant):
		return {"allowed": True, "code": "direct_applicant", "message": ""}

	# 2 — the opening must sit under a requisition
	if not applicant.job_title:
		return _deny(
			"no_opening",
			_("{0} is not linked to a Job Opening, so there is no headcount to offer against.").format(
				applicant.applicant_name or job_applicant
			),
		)

	opening = frappe.db.get_value(
		JOB_OPENING,
		applicant.job_title,
		["name", "job_requisition", "custom_region", "custom_hiring_type"],
		as_dict=True,
	)
	if not opening:
		return _deny("no_opening", _("Job Opening {0} not found.").format(applicant.job_title))

	if not opening.job_requisition:
		return _deny(
			"no_requisition",
			_("Job Opening {0} has no linked Job Requisition, so there is no approved headcount to offer against. Link a requisition to the opening before making an offer.").format(
				opening.name
			),
		)

	# 3 — headcount must be left on that requisition
	requisition = opening.job_requisition
	if not frappe.db.exists(JOB_REQUISITION, requisition):
		return _deny(
			"no_requisition",
			_("Job Requisition {0} linked to opening {1} no longer exists.").format(
				requisition, opening.name
			),
		)

	region = opening.custom_region
	capacity, source = _capacity(requisition, region)

	# Only worth counting offers once we know there's headcount to compare against.
	if capacity <= 0:
		return _deny(
			"no_positions",
			_("No positions available on Job Requisition {0} ({1}). Add headcount there before making an offer.").format(
				requisition, source
			),
		)

	consumed = _offers_against(requisition, region, exclude_offer)
	if consumed >= capacity:
		return _deny(
			"no_positions",
			_("No positions available on Job Requisition {0} ({1}) — {2} of {3} already offered.").format(
				requisition, source, consumed, capacity
			),
		)

	return {
		"allowed": True,
		"code": "ok",
		"message": "",
		"requisition": requisition,
		"region": region,
		"capacity": capacity,
		"consumed": consumed,
	}


@frappe.whitelist()
def can_create_job_offer(job_applicant: str) -> dict:
	"""Asked by the hiring workflow before it opens a blank Job Offer."""
	return check_offer_allowed(job_applicant)


def validate_job_offer(doc, method=None):
	"""Job Offer `validate` — the same gates, on the way in.

	Only on insert: re-checking a saved offer would fail its own duplicate check
	(the offer being edited is itself the candidate's active offer) and would
	block routine edits such as recording acceptance.
	"""
	if not doc.get("job_applicant") or not doc.is_new():
		return

	result = check_offer_allowed(doc.job_applicant, exclude_offer=doc.name)
	if not result.get("allowed"):
		frappe.throw(result["message"], title=_("Cannot Create Job Offer"))
