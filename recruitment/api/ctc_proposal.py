"""Direct Applicant Onboarding — Phase 3: the CTC Proposal and its negotiation.

Once the candidate's form is in (every mandatory detail filled, no open
duplicity flag), HR raises a CTC Proposal: HR enters only the annual CTC, and
the earnings / deductions are worked out from the salary structure of the dummy
Salary Structure Assignment in Recruitment Settings — the same calculation a
Job Offer's "Salary Structure" method runs, so the offer made from an accepted
proposal comes out identical.

The candidate opens /ctc-proposal?t=<token> (no login) and Accepts, Negotiates
(expected CTC + comment — up to Recruitment Settings -> "Max Negotiation
Rounds") or Rejects. HR answers a negotiation (or a rejection) with Revise: a
new version, linked to the previous one, which is superseded when the new one is
sent. Every version is kept.

HR endpoints (desk):
    get_proposal_defaults(job_applicant)
    send_proposal(proposal)
    revise_proposal(proposal)
    withdraw_proposal(proposal)
Candidate endpoints (guest, token-guarded): ctc_proposal_portal.py
"""

import secrets

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, get_url, now_datetime

from recruitment.api import direct_applicant_form as dform
from recruitment.api.direct_applicant import SETTINGS, is_direct, is_enabled

DOCTYPE = "CTC Proposal"
SSA = "Salary Structure Assignment"
PAGE_ROUTE = "ctc-proposal"

DRAFT = "Draft"
SENT = "Sent"
NEGOTIATE = "Negotiation Requested"
ACCEPTED = "Accepted"
REJECTED = "Rejected"
SUPERSEDED = "Superseded"
WITHDRAWN = "Withdrawn"
OFFER_CREATED = "Offer Created"
OFFER_FAILED = "Offer Failed"

# A candidate has at most one proposal in play; these block raising another.
LIVE = (DRAFT, SENT, NEGOTIATE, ACCEPTED, OFFER_CREATED, OFFER_FAILED)
# HR answers these with a new version.
REVISABLE = (NEGOTIATE, REJECTED)

APPLICANT_STATUS_FIELD = "custom_da_proposal_status"
APPLICANT_LINK_FIELD = "custom_da_ctc_proposal"

# Changing any of these changes what the candidate is offered: allowed only in Draft.
LOCKED_AFTER_SEND = (
	"company", "designation", "department", "employment_type", "expected_doj", "ctc",
	"salary_structure", "income_tax_slab", "epf", "epf_type", "hr_note", "offer_letter_template",
	"job_applicant",
)
# Written only by this module (send / respond / revise / offer), never by a save
# from the form or REST: a changed status, token or offer link would bypass the
# flow's checks.
SYSTEM_FIELDS = (
	"status", "token_hash", "job_offer", "offer_error", "candidate_response", "expected_ctc",
	"candidate_comment", "responded_on", "sent_by", "sent_on", "expires_on", "action_item",
	"version", "previous_proposal", "negotiation_round",
)
BREAKUP_INPUTS = ("ctc", "salary_structure", "income_tax_slab", "epf", "epf_type")
DEFAULT_EXPIRY_DAYS = 7


# --------------------------------------------------------------------------- #
# Breakup (shared with the Job Offer "Salary Structure" method's inputs)
# --------------------------------------------------------------------------- #
class _Rows:
	"""Collects the rows make_salary_slip appends (it writes onto its first argument)."""

	def __init__(self):
		self.tables = {}

	def append(self, table, row):
		self.tables.setdefault(table, []).append(row)


def _dummy_assignment():
	name = frappe.db.get_single_value(SETTINGS, "dummy_salary_structure_assignment")
	if not name or not frappe.db.exists(SSA, name):
		frappe.throw(
			_("Set a Dummy Salary Structure Assignment in Recruitment Settings to calculate the CTC breakup.")
		)
	return name


def _set_if_field(doc, fieldname, value):
	if doc.meta.has_field(fieldname):
		doc.set(fieldname, value)


def compute_breakup(proposal):
	"""Fill the proposal's earnings, deductions and totals from its CTC.

	Runs the Job Offer's calculation: the inputs go onto the dummy assignment
	(CTC as its Annual Fixed Gross, which the structure's formulas read) and a
	preview salary slip is built from the structure. The assignment row is
	locked first, so two calculations never read each other's figures.
	"""
	from recruitment.customizations.job_offer import make_salary_slip

	name = _dummy_assignment()
	frappe.db.sql(f"select name from `tab{SSA}` where name = %s for update", name)
	ssa = frappe.get_doc(SSA, name)
	ssa.salary_structure = proposal.salary_structure
	_set_if_field(ssa, "custom_fixed_ctc_annual", flt(proposal.ctc))
	_set_if_field(ssa, "custom_fixed_gross_annual", flt(proposal.ctc))
	ssa.income_tax_slab = proposal.income_tax_slab
	_set_if_field(ssa, "custom_is_epf", cint(proposal.epf))
	_set_if_field(ssa, "custom_epf_type", proposal.epf_type if cint(proposal.epf) else None)
	ssa.flags.ignore_permissions = True
	ssa.save()

	rows = _Rows()
	slip = make_salary_slip(rows, proposal.salary_structure, employee=ssa.employee)
	earnings = [r for r in rows.tables.get("custom_earnings", []) if flt(r["amount"])]
	deductions = [r for r in rows.tables.get("custom_deduction", []) if flt(r["amount"])]
	proposal.set("earnings", [{"component": r["component"], "amount": flt(r["amount"], 2)} for r in earnings])
	proposal.set("deductions", [{"component": r["component"], "amount": flt(r["amount"], 2)} for r in deductions])
	proposal.monthly_gross = flt(slip.gross_pay, 2) if slip else sum(flt(r["amount"]) for r in earnings)
	proposal.monthly_deductions = flt(slip.total_deduction, 2) if slip else sum(flt(r["amount"]) for r in deductions)
	proposal.monthly_net = flt(slip.net_pay, 2) if slip else proposal.monthly_gross - proposal.monthly_deductions
	proposal.annual_ctc = _annual_ctc(earnings + deductions, proposal.ctc)


def _annual_ctc(rows, fallback):
	"""Components flagged Part of CTC, x 12 (the payroll app's definition)."""
	if not frappe.get_meta("Salary Component").has_field("custom_is_part_of_ctc"):
		return flt(fallback)
	part = set(frappe.get_all("Salary Component", filters={"custom_is_part_of_ctc": 1}, pluck="name"))
	return flt(12 * sum(flt(r["amount"]) for r in rows if r["component"] in part), 0)


# --------------------------------------------------------------------------- #
# Validation (CTC Proposal controller)
# --------------------------------------------------------------------------- #
def validate_proposal(doc):
	if not is_enabled():
		frappe.throw(_("Direct Applicant Onboarding is not enabled in Recruitment Settings."))
	applicant = frappe.get_doc("Job Applicant", doc.job_applicant)
	if not is_direct(applicant):
		frappe.throw(_("CTC Proposals are only for direct applicants."))
	if doc.is_new():
		if not doc.flags.da_system:
			_start_fresh(doc)
		_validate_can_raise(doc)
	elif not doc.flags.da_system:
		before = doc.get_doc_before_save()
		if before and any(_norm(before.get(f)) != _norm(doc.get(f)) for f in SYSTEM_FIELDS):
			frappe.throw(
				_("Status, link and candidate-response fields are set by the proposal flow and cannot be edited."),
				title=_("Not Allowed"),
			)
	if doc.status != DRAFT:
		_block_changes_after_send(doc)
		return
	if flt(doc.ctc) <= 0:
		frappe.throw(_("Enter the Annual CTC."))
	before = doc.get_doc_before_save()
	if doc.is_new() or not doc.earnings or any(
		before is None or before.get(f) != doc.get(f) for f in BREAKUP_INPUTS
	):
		compute_breakup(doc)


def _norm(value):
	"""None, "" and 0 compare equal (the database hands back "" / 0 for None)."""
	return None if value in (None, "", 0) else str(value)


def _start_fresh(doc):
	"""A proposal HR creates starts as a Draft with nothing set by the flow, and
	continues the applicant's version / negotiation count — so withdrawing and
	starting over cannot reset Max Negotiation Rounds."""
	for field in SYSTEM_FIELDS:
		doc.set(field, None)
	doc.status = DRAFT
	past = frappe.get_all(
		DOCTYPE, filters={"job_applicant": doc.job_applicant},
		fields=["version", "negotiation_round", "candidate_response"],
	)
	doc.version = max((cint(p.version) for p in past), default=0) + 1
	doc.negotiation_round = max(
		(cint(p.negotiation_round) + (1 if p.candidate_response == "Negotiate" else 0) for p in past), default=0
	)


def is_expired(doc):
	return bool(doc.expires_on) and frappe.utils.get_datetime(doc.expires_on) < now_datetime()


def _revisable(doc):
	"""Negotiated, rejected, or sent but left to expire."""
	return doc.status in REVISABLE or (doc.status == SENT and is_expired(doc))


def _validate_can_raise(doc):
	ok, reason = dform.form_ready_for_proposal(doc.job_applicant)
	if not ok:
		frappe.throw(reason, title=_("Cannot Raise CTC Proposal"))
	live = frappe.get_all(
		DOCTYPE,
		# The version being revised is still Negotiation Requested until this one is sent.
		filters={
			"job_applicant": doc.job_applicant,
			"status": ["in", LIVE],
			"name": ["not in", [doc.name or "", doc.previous_proposal or ""]],
		},
		pluck="name",
	)
	if live:
		frappe.throw(
			_("{0} already has CTC Proposal {1} in progress.").format(doc.job_applicant, frappe.bold(live[0])),
			title=_("Cannot Raise CTC Proposal"),
		)
	if doc.previous_proposal and not _revisable(frappe.get_doc(DOCTYPE, doc.previous_proposal)):
		frappe.throw(_("Only a proposal the candidate negotiated or rejected, or one that expired, can be revised."))


def _block_changes_after_send(doc):
	if doc.flags.da_system:
		return
	before = doc.get_doc_before_save()
	changed = [f for f in LOCKED_AFTER_SEND if before and before.get(f) != doc.get(f)]
	if changed:
		frappe.throw(
			_("A proposal cannot be changed after it is sent. Use Revise to send a new version."),
			title=_("Proposal Locked"),
		)


# --------------------------------------------------------------------------- #
# HR actions
# --------------------------------------------------------------------------- #
def _require_hr(proposal, ptype="write"):
	if not is_enabled():
		frappe.throw(_("Direct Applicant Onboarding is not enabled in Recruitment Settings."))
	doc = frappe.get_doc(DOCTYPE, proposal)
	doc.check_permission(ptype)
	return doc


def can_raise(job_applicant, applicant=None, request=None):
	"""(ok, reason) for the "Create CTC Proposal" button."""
	ok, reason = dform.form_ready_for_proposal(job_applicant, applicant=applicant, request=request)
	if not ok:
		return ok, reason
	live = frappe.db.get_value(DOCTYPE, {"job_applicant": job_applicant, "status": ["in", LIVE]}, "name")
	if live:
		return False, _("CTC Proposal {0} is already in progress.").format(live)
	return True, ""


@frappe.whitelist()
def get_proposal_defaults(job_applicant):
	"""Values a new proposal starts with: the applicant's position and the
	dummy assignment's structure / tax slab / EPF."""
	if not is_enabled():
		frappe.throw(_("Direct Applicant Onboarding is not enabled in Recruitment Settings."))
	frappe.has_permission(DOCTYPE, "create", throw=True)
	applicant = frappe.get_doc("Job Applicant", job_applicant)
	applicant.check_permission("read")
	ok, reason = can_raise(job_applicant)
	if not ok:
		frappe.throw(reason, title=_("Cannot Raise CTC Proposal"))
	ssa = frappe.get_doc(SSA, _dummy_assignment())
	values = {
		"job_applicant": applicant.name,
		"company": applicant.get("custom_company_finalized"),
		"designation": applicant.get("designation"),
		"department": applicant.get("custom_department"),
		"employment_type": applicant.get("custom_employment_type"),
		"salary_structure": ssa.salary_structure,
		"income_tax_slab": ssa.income_tax_slab,
		"epf": cint(ssa.get("custom_is_epf")),
		"epf_type": ssa.get("custom_epf_type") or "",
	}
	values["offer_letter_template"] = _only_template(values)
	return values


def _only_template(values):
	"""Pre-fill the Offer Letter Template only when exactly one applies — HR still
	sees it on the draft before sending."""
	from recruitment.recruitment.offer_document_template import (
		is_document_template_offer_enabled,
		resolve_offer_document_templates,
	)

	if not is_document_template_offer_enabled():
		return None
	matches = resolve_offer_document_templates(overlay=offer_overlay(frappe._dict(values)))
	return matches[0]["name"] if len(matches) == 1 else None


def offer_overlay(doc):
	"""The proposal as the Job Offer it becomes, for matching Offer Letter Templates."""
	return {
		"job_applicant": doc.job_applicant,
		"company": doc.company,
		"designation": doc.designation,
		"custom_employment_type": doc.employment_type,
		"custom_expected_doj": str(doc.expected_doj or ""),
	}


def _validate_offer_letter_template(doc):
	"""With offers sent as Document Templates, the letter is chosen by HR on the
	proposal (never picked silently — see offer_document_template) and must be one
	that applies to the offer this proposal becomes."""
	from recruitment.recruitment.offer_document_template import (
		is_document_template_offer_enabled,
		resolve_offer_document_templates,
	)

	if not is_document_template_offer_enabled():
		return
	allowed = [t["name"] for t in resolve_offer_document_templates(overlay=offer_overlay(doc))]
	if not allowed:
		frappe.throw(
			_("No Offer Letter Template applies to this offer (company, designation, employment type). "
			  "Set one up before sending the proposal — the Job Offer is sent with it once the candidate accepts."),
			title=_("Offer Letter Template Needed"),
		)
	if not doc.offer_letter_template:
		frappe.throw(
			_("Select the {0} the Job Offer will be sent with.").format(frappe.bold(_("Offer Letter Template"))),
			title=_("Offer Letter Template Needed"),
		)
	if doc.offer_letter_template not in allowed:
		frappe.throw(
			_("Offer Letter Template {0} does not apply to this offer.").format(frappe.bold(doc.offer_letter_template)),
			title=_("Offer Letter Template Needed"),
		)


@frappe.whitelist(methods=["POST"])
def send_proposal(proposal):
	"""Draft -> Sent: email the candidate a fresh link; supersede earlier versions."""
	doc = _require_hr(proposal)
	if doc.status != DRAFT:
		frappe.throw(_("Only a Draft proposal can be sent."))
	# Checked before the candidate is asked: an accepted proposal must be able to
	# become an offer without anyone picking a letter afterwards.
	_validate_offer_letter_template(doc)
	# The form may have changed since the draft was raised.
	ok, reason = dform.form_ready_for_proposal(doc.job_applicant)
	if not ok:
		frappe.throw(reason, title=_("Cannot Send CTC Proposal"))
	if not doc.email:
		frappe.throw(_("The applicant has no email address to send the proposal to."))
	# The breakup is recalculated at send time so the candidate sees current figures.
	compute_breakup(doc)

	token = secrets.token_urlsafe(32)
	days = cint(frappe.db.get_single_value(SETTINGS, "da_proposal_link_expiry_days")) or DEFAULT_EXPIRY_DAYS
	doc.update({
		"status": SENT,
		"sent_by": frappe.session.user,
		"sent_on": now_datetime(),
		"expires_on": add_days(now_datetime(), days),
		"token_hash": dform.hash_token(token),
	})
	doc.flags.da_system = True
	doc.save(ignore_permissions=True)

	_supersede_earlier(doc)
	set_applicant_status(doc)
	_sync_action_item(doc, _("A CTC proposal is ready for you. Review it and accept, negotiate or reject."))
	_email_candidate(doc, token)
	return {"status": doc.status, "expires_on": doc.expires_on}


@frappe.whitelist(methods=["POST"])
def revise_proposal(proposal):
	"""A new Draft version answering a negotiation / rejection. Returns its name."""
	doc = _require_hr(proposal)
	frappe.has_permission(DOCTYPE, "create", throw=True)
	if not _revisable(doc):
		frappe.throw(_("Only a proposal the candidate negotiated or rejected, or one that expired, can be revised."))
	new = frappe.copy_doc(doc)
	new.update({
		"status": DRAFT,
		"version": cint(doc.version) + 1,
		"previous_proposal": doc.name,
		"negotiation_round": cint(doc.negotiation_round) + (1 if doc.status == NEGOTIATE else 0),
		# Start from what the candidate asked for; HR edits before sending.
		"ctc": flt(doc.expected_ctc) or flt(doc.ctc),
		"hr_note": "",
	})
	new.flags.da_system = True
	new.insert()
	return {"name": new.name}


@frappe.whitelist(methods=["POST"])
def withdraw_proposal(proposal):
	doc = _require_hr(proposal)
	if doc.status not in (SENT, NEGOTIATE):
		frappe.throw(_("Only a sent proposal awaiting the candidate or HR can be withdrawn."))
	_close(doc, WITHDRAWN)
	set_applicant_status(doc)
	return {"status": doc.status}


OFFER_SAVEPOINT = "direct_applicant_offer"
# Job Offer fields set from the proposal, when the site has them.
OFFER_FIELD_MAP = {
	"custom_employment_type": "employment_type",
	"custom_expected_doj": "expected_doj",
	"custom_employee_salary_structure": "salary_structure",
	"custom_base_salary": "ctc",
	"custom_income_tax_slab": "income_tax_slab",
	"custom_epf": "epf",
	"custom_epf_type": "epf_type",
}


def on_accepted(doc):
	"""The candidate accepted ``doc``: create the Job Offer from it, submit it and
	send it exactly like the desk's "Send Job Offer" button
	(bulk_job_offer.send_bulk_job_offer) — from there the existing offer flow
	(Action Center item, accept on /job_offer, Employee Onboarding) runs as usual.

	The offer carries the proposal's own inputs under the "Salary Structure"
	method, so its breakup is recalculated identically. When HR Ops verification
	is on, HR Ops is notified instead and releases the offer as for any other.

	Never raises — the candidate's acceptance is already saved. If the offer
	cannot be created it is rolled back, the proposal is marked Offer Failed with
	the reason, and HR is alerted (and can retry: retry_offer).
	"""
	from recruitment.recruitment.utils import as_administrator

	frappe.db.savepoint(OFFER_SAVEPOINT)
	messages = len(frappe.local.message_log or [])
	try:
		# The candidate's request runs as Guest; the offer is HR's document.
		with as_administrator():
			offer = _create_offer(doc)
	except Exception as e:
		frappe.db.rollback(save_point=OFFER_SAVEPOINT)
		# Validation messages are for HR, not the candidate's response.
		del frappe.local.message_log[messages:]
		reason = frappe.utils.strip_html(str(e)) or e.__class__.__name__
		frappe.log_error(title="Direct Applicant: Job Offer could not be created")
		_record_offer(doc, OFFER_FAILED, error=reason[:1000])
		_alert_hr(doc, _("accepted the CTC proposal, but the Job Offer could not be created: {0}").format(reason))
		return None

	# The offer exists: record it and commit before emailing. The commit releases
	# the dummy Salary Structure Assignment row the offer's salary calculation
	# locked, so HR saving other offers does not wait out the PDF render and the
	# mail send; and a send failure can no longer undo the offer.
	_record_offer(doc, OFFER_CREATED, job_offer=offer.name)
	_commit()
	try:
		with as_administrator():
			note = _release_offer(offer)
	except Exception as e:
		del frappe.local.message_log[messages:]
		frappe.log_error(title="Direct Applicant: Job Offer created but not sent")
		note = _("it could not be sent ({0}). Open the Job Offer and use Send Job Offer.").format(
			frappe.utils.strip_html(str(e)) or e.__class__.__name__
		)
	if note:
		_record_offer(doc, OFFER_CREATED, job_offer=offer.name, error=note)
	if note:
		_alert_hr(doc, _("accepted the CTC proposal. Job Offer {0} was created: {1}").format(offer.name, note))
	return offer.name


def _commit():
	"""A seam for tests, which must not commit."""
	frappe.db.commit()


def _create_offer(doc):
	applicant = frappe.get_doc("Job Applicant", doc.job_applicant)
	offer = frappe.new_doc("Job Offer")
	offer.update({
		"job_applicant": applicant.name,
		"applicant_name": applicant.applicant_name,
		"applicant_email": applicant.email_id,
		"designation": doc.designation,
		"company": doc.company,
		"offer_date": frappe.utils.today(),
	})
	_set_if_field(offer, "custom_compensation_method", "Salary Structure")
	_set_if_field(offer, "custom_offer_letter_template", doc.get("offer_letter_template"))
	for target, source in OFFER_FIELD_MAP.items():
		_set_if_field(offer, target, doc.get(source))
	offer.flags.ignore_permissions = True
	offer.insert()
	offer.submit()
	return offer


def _release_offer(offer):
	"""Send the offer (or hand it to HR Ops). Returns a note for HR when the offer
	was created but not sent, else ""."""
	from recruitment.api.bulk_job_offer import send_bulk_job_offer
	from recruitment.recruitment.hr_ops_offer_review import verification_enabled

	if verification_enabled():
		from recruitment.api.hr_ops_notify import notify_hr_ops

		notify_hr_ops([offer.name])
		return _("waiting for HR Ops to verify and send it")
	result = send_bulk_job_offer([offer.name]) or {}
	if result.get("sent"):
		return ""
	error = frappe.db.get_value("Job Offer", offer.name, "email_error")
	return _("it was not emailed ({0}). Open the Job Offer and use Send Job Offer.").format(
		error or _("see the Error Log")
	)


def _record_offer(doc, status, job_offer=None, error=None):
	doc.update({"status": status, "job_offer": job_offer, "offer_error": error or None})
	doc.flags.da_system = True
	doc.save(ignore_permissions=True)
	set_applicant_status(doc)


def _alert_hr(doc, event):
	try:
		email_hr(doc, event)
	except Exception:
		frappe.log_error(title="Direct Applicant: CTC proposal HR alert failed")


@frappe.whitelist(methods=["POST"])
def retry_offer(proposal):
	"""HR retries creating the Job Offer for an accepted proposal whose offer failed."""
	doc = _require_hr(proposal)
	frappe.has_permission("Job Offer", "create", throw=True)
	# Row lock: two clicks must not create two offers.
	frappe.db.sql(f"select name from `tab{DOCTYPE}` where name = %s for update", doc.name)
	doc.reload()
	# Offer Failed, or Accepted with no offer (the offer step never ran).
	if not (doc.status == OFFER_FAILED or (doc.status == ACCEPTED and not doc.job_offer)):
		frappe.throw(_("Only a proposal whose Job Offer failed can be retried."))
	name = on_accepted(doc)
	doc.reload()
	if not name:
		frappe.throw(_("The Job Offer could not be created: {0}").format(doc.offer_error or "-"))
	return {"job_offer": name, "status": doc.status}


def _supersede_earlier(doc):
	for name in frappe.get_all(
		DOCTYPE,
		filters={"job_applicant": doc.job_applicant, "status": ["in", REVISABLE + (SENT,)], "name": ["!=", doc.name]},
		pluck="name",
	):
		earlier = frappe.get_doc(DOCTYPE, name)
		# A still-open Sent proposal is only superseded when this version revises it (it expired).
		if earlier.status == SENT and earlier.name != doc.previous_proposal:
			continue
		_close(earlier, SUPERSEDED)


def _close(doc, status):
	"""Final status for HR's side: the link stops working and the card goes."""
	doc.status = status
	doc.token_hash = None
	doc.flags.da_system = True
	doc.save(ignore_permissions=True)
	if doc.action_item and frappe.db.exists(dform.ACTION_ITEM, doc.action_item):
		frappe.delete_doc(dform.ACTION_ITEM, doc.action_item, ignore_permissions=True, force=True)
	# Action Center items are named "<email> - 0001"...: a deleted name is reused by
	# the next card, so a stale pointer here would later act on someone else's card.
	doc.db_set("action_item", None, update_modified=False)


def set_applicant_status(doc):
	frappe.db.set_value(
		"Job Applicant",
		doc.job_applicant,
		{APPLICANT_STATUS_FIELD: doc.status if doc.status != SUPERSEDED else None, APPLICANT_LINK_FIELD: doc.name},
		update_modified=False,
	)


# --------------------------------------------------------------------------- #
# Action center / email
# --------------------------------------------------------------------------- #
def proposal_link(token):
	"""The emailed link: the candidate portal's page when its URL is configured,
	else this site's own /ctc-proposal page (same path, same endpoints)."""
	return dform.portal_url(f"/{PAGE_ROUTE}?t={token}")


# Candidate Portal page the Action Center card opens (the portal's own route).
PORTAL_ROUTE = "/ctc_proposal"


def _sync_action_item(doc, description):
	"""The candidate's card. It links to the Candidate Portal page by proposal
	name only — no token — and that page's endpoints serve the proposal only to
	the logged-in candidate it was sent to (ctc_proposal_portal.get_my_proposal)."""
	from recruitment.api.action_center import _upsert_minimal_item

	item = _upsert_minimal_item(
		candidate_email=doc.email,
		reference_doctype=DOCTYPE,
		reference_docname=doc.name,
		redirect_url=f"{PORTAL_ROUTE}?proposal={doc.name}",
		description=description,
		commit=False,
	)
	frappe.db.set_value(dform.ACTION_ITEM, item.name, "status", "Action Required", update_modified=False)
	doc.db_set("action_item", item.name, update_modified=False)


def _email_candidate(doc, token):
	context = {
		"applicant_name": doc.applicant_name,
		"proposal_link": proposal_link(token),
		"ctc": frappe.utils.fmt_money(doc.ctc, currency=frappe.db.get_value("Company", doc.company, "default_currency")),
		"designation": doc.designation,
		"company": doc.company,
		"expires_on": frappe.utils.format_datetime(doc.expires_on),
		"version": doc.version,
		"portal_link": dform.portal_url(f"{PORTAL_ROUTE}?proposal={doc.name}"),
	}
	context = dform.safe_context(context)
	subject, message = dform._render_template(
		frappe.db.get_single_value(SETTINGS, "da_proposal_email_template"), context
	)
	if not subject:
		subject = _("Your CTC proposal from {0}").format(doc.company)
		message = frappe.render_template(DEFAULT_CANDIDATE_EMAIL, context)
	dform.send_candidate_email(
		doc.email, subject, message, proposal_link(token),
		job_applicant=doc.job_applicant, reference_doctype=DOCTYPE, reference_name=doc.name,
	)


def email_hr(doc, event):
	"""Tell whoever sent the proposal how the candidate responded."""
	if not doc.sent_by or doc.sent_by in ("Administrator", "Guest"):
		return
	context = {
		"applicant_name": doc.applicant_name,
		"job_applicant": doc.job_applicant,
		"event": event,
		"link": get_url(f"/app/ctc-proposal/{doc.name}"),
	}
	context = dform.safe_context(context)
	subject, message = dform._render_template(
		frappe.db.get_single_value(SETTINGS, "da_hr_alert_email_template"), context
	)
	if not subject:
		subject = _("{0} {1}").format(doc.applicant_name, event)
		message = frappe.render_template(dform.DEFAULT_HR_EMAIL, context)
	frappe.sendmail(
		recipients=[doc.sent_by], subject=subject, message=message,
		reference_doctype=DOCTYPE, reference_name=doc.name,
	)


DEFAULT_CANDIDATE_EMAIL = """
<p>{{ _("Dear") }} {{ applicant_name }},</p>
<p>{{ _("We are pleased to share a CTC proposal of {0} per annum for the role of {1} at {2}.").format(ctc, designation, company) }}</p>
<p><a href="{{ proposal_link }}">{{ _("View the proposal and respond") }}</a></p>
<p>{{ _("This link is valid till {0}.").format(expires_on) }}</p>
{% if portal_link %}<p>{{ _("You can also respond from your Action Center in the candidate portal:") }}
<a href="{{ portal_link }}">{{ _("Candidate portal") }}</a>.</p>{% endif %}
"""
