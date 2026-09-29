"""Direct Applicant Onboarding — the candidate side of a CTC Proposal.

Two ways in, same rules behind them:

* The emailed link (no login): the proposal found by the link token's hash is
  the only identity.

      GET  get_proposal(t)
      POST respond(t, response, expected_ctc=None, comment=None)

* The Candidate Portal (logged in): the Action Center card opens
  /ctc_proposal?proposal=<name>; these serve the proposal only to the logged-in
  candidate it was sent to.

      GET  get_my_proposal(proposal)
      POST respond_my_proposal(proposal, response, expected_ctc=None, comment=None)

The candidate can respond only while the proposal is Sent and unexpired;
afterwards it shows the outcome. Nothing trusts an applicant id or email from
the caller.
"""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, flt, get_datetime, now_datetime

from recruitment.api import ctc_proposal as cp
from recruitment.api import direct_applicant_form as dform
from recruitment.api.candidate_auth import candidate_required, get_current_candidate
from recruitment.api.direct_applicant import SETTINGS, is_enabled

HOUR = 60 * 60
RESPONSES = {"Accept": cp.ACCEPTED, "Negotiate": cp.NEGOTIATE, "Reject": cp.REJECTED}
MAX_COMMENT = 2000


class LinkUnavailable(frappe.PermissionError):
	pass


def _unavailable(message):
	frappe.throw(message, LinkUnavailable, title=_("Link unavailable"))


def _proposal_for(token, for_response=False):
	if not is_enabled() or not token or len(token) > 100:
		_unavailable(_("This link is not valid."))
	name = frappe.db.get_value(cp.DOCTYPE, {"token_hash": dform.hash_token(token)}, "name")
	if not name:
		_unavailable(_("This link is not valid or has been replaced by a newer proposal."))
	return _check_respondable(frappe.get_doc(cp.DOCTYPE, name), for_response)


def _proposal_for_candidate(name, for_response=False):
	"""The proposal ``name`` — only for the logged-in candidate it was sent to,
	and never a Draft HR has not sent yet."""
	candidate = (get_current_candidate() or "").strip().lower()
	if not is_enabled() or not name or not frappe.db.exists(cp.DOCTYPE, name):
		_unavailable(_("This proposal is not available."))
	doc = frappe.get_doc(cp.DOCTYPE, name)
	if not candidate or (doc.email or "").strip().lower() != candidate or doc.status == cp.DRAFT:
		# Same answer as a missing proposal: never confirm whose it is.
		_unavailable(_("This proposal is not available."))
	return _check_respondable(doc, for_response)


def _check_respondable(doc, for_response):
	if for_response:
		if doc.status != cp.SENT:
			_unavailable(_("You have already responded to this proposal."))
		if doc.expires_on and get_datetime(doc.expires_on) < now_datetime():
			_unavailable(_("This proposal has expired. Please contact HR."))
	return doc


def max_rounds():
	return cint(frappe.db.get_single_value(SETTINGS, "da_max_negotiation_rounds"))


def can_negotiate(doc):
	return cint(doc.negotiation_round) < max_rounds()


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=120, seconds=HOUR)
def get_proposal(t):
	return _payload(_proposal_for(t))


def _payload(doc):
	expired = bool(doc.expires_on) and get_datetime(doc.expires_on) < now_datetime()
	currency = frappe.db.get_value("Company", doc.company, "default_currency")
	return {
		"applicant_name": doc.applicant_name,
		"company": doc.company,
		"designation": frappe.db.get_value("Designation", doc.designation, "designation_name") or doc.designation,
		"department": frappe.db.get_value("Department", doc.department, "department_name") if doc.department else "",
		"employment_type": frappe.db.get_value("Employment Type", doc.employment_type, "employee_type_name") or doc.employment_type,
		"expected_doj": doc.expected_doj,
		"currency": currency,
		"ctc": doc.ctc,
		"annual_ctc": doc.annual_ctc,
		"earnings": [{"component": r.component, "monthly": r.amount, "annual": flt(r.amount) * 12} for r in doc.earnings],
		"deductions": [{"component": r.component, "monthly": r.amount, "annual": flt(r.amount) * 12} for r in doc.deductions],
		"monthly_gross": doc.monthly_gross,
		"monthly_deductions": doc.monthly_deductions,
		"monthly_net": doc.monthly_net,
		"hr_note": doc.hr_note or "",
		"version": doc.version,
		"status": doc.status,
		"expired": expired,
		"expires_on": doc.expires_on,
		"can_respond": doc.status == cp.SENT and not expired,
		"can_negotiate": can_negotiate(doc),
		"negotiations_left": max(0, max_rounds() - cint(doc.negotiation_round)),
		"response": doc.candidate_response or "",
	}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=HOUR)
def respond(t, response, expected_ctc=None, comment=None):
	return _respond(_proposal_for(t, for_response=True), response, expected_ctc, comment)


def _respond(doc, response, expected_ctc=None, comment=None):
	status = RESPONSES.get(response)
	if not status:
		frappe.throw(_("Choose Accept, Negotiate or Reject."))
	comment = (comment or "").strip()[:MAX_COMMENT]
	expected = flt(expected_ctc)
	if status == cp.NEGOTIATE:
		if not can_negotiate(doc):
			frappe.throw(_("This proposal can no longer be negotiated. Please accept or reject it."))
		if expected <= 0:
			frappe.throw(_("Enter the CTC you expect."))

	doc.update({
		"status": status,
		"candidate_response": {"Accept": "Accepted", "Negotiate": "Negotiate", "Reject": "Rejected"}[response],
		"expected_ctc": expected if status == cp.NEGOTIATE else 0,
		"candidate_comment": comment,
		"responded_on": now_datetime(),
	})
	doc.flags.da_system = True
	doc.save(ignore_permissions=True)
	if doc.action_item and frappe.db.exists(dform.ACTION_ITEM, doc.action_item):
		frappe.db.set_value(dform.ACTION_ITEM, doc.action_item, "status", "Completed", update_modified=False)
	cp.set_applicant_status(doc)

	if status == cp.ACCEPTED:
		# Creates and sends the Job Offer; alerts HR itself when something needs them.
		offer = cp.on_accepted(doc)
		doc.reload()
		if not offer or doc.offer_error:
			return {"status": doc.status}
		event = _("accepted the CTC proposal. Job Offer {0} was created and sent.").format(offer)
	else:
		event = {
			cp.NEGOTIATE: _("wants to negotiate the CTC proposal"),
			cp.REJECTED: _("rejected the CTC proposal"),
		}[status]
	try:
		cp.email_hr(doc, event)
	except Exception:
		frappe.log_error(title="Direct Applicant: CTC proposal HR alert failed")
	return {"status": doc.status}


# --------------------------------------------------------------------------- #
# Candidate Portal (logged-in candidate)
# --------------------------------------------------------------------------- #
@candidate_required(methods=["GET"])
@rate_limit(limit=120, seconds=HOUR)
def get_my_proposal(proposal):
	return _payload(_proposal_for_candidate(proposal))


@candidate_required(methods=["POST"])
@rate_limit(limit=20, seconds=HOUR)
def respond_my_proposal(proposal, response, expected_ctc=None, comment=None):
	return _respond(_proposal_for_candidate(proposal, for_response=True), response, expected_ctc, comment)
