"""Whitelisted endpoints + doc-event guards for the Job Offer review flow.

API endpoints:
  - get_review_urls(name): returns signed Approve/Reject URLs the funnel
    embeds in the reviewer's email (also exposed as a Jinja method via
    recruitment/hooks.py so the email template can call it directly).
  - review_decision(name, action, ...): what those URLs hit. HMAC-signed +
    re-verifies the logged-in user is the assigned reviewer (or HR Manager).

Doc-event guards (wired in hooks.py doc_events):
  - lock_review_status (before_save): only the assigned reviewer (or HR
    Manager) can change custom_review_status once it's been set.
  - block_submit_during_review (before_submit): refuse to submit while
    Review Status is Pending or Rejected.

Note on submit ordering: the modal Submit button is hijacked by the NextAI
funnel JS override, so Frappe's standard submit pipeline (validate ->
before_submit -> on_submit) does NOT run for the modal flow. The funnel
sets docstatus directly via frappe.db.set_value, bypassing before_submit.
block_submit_during_review here is therefore a backstop that only fires on
direct REST submits (frappe.client.submit) and on the candidate accept-flow
path that uses doc.save(). lock_review_status DOES fire on every save,
including the reviewer's Approve API call and the candidate accept flow.
"""

from urllib.parse import quote

import frappe
from frappe import _
from frappe.utils import get_url
from frappe.utils.verified_command import get_signed_params, verify_request


def lock_review_status(doc, method=None):
	"""before_save guard: only the assigned reviewer (or HR Manager) can change
	custom_review_status once it's been set."""
	if not doc.custom_reviewer or doc.is_new():
		return

	prev_status = frappe.db.get_value("Job Offer", doc.name, "custom_review_status")
	if (prev_status or "") == (doc.custom_review_status or ""):
		return

	reviewer_user = frappe.db.get_value("Employee", doc.custom_reviewer, "user_id")
	if frappe.session.user == reviewer_user:
		return
	if "HR Manager" in frappe.get_roles():
		return

	frappe.throw(
		_("Only the assigned reviewer ({0}) can change Review Status.").format(
			reviewer_user or _("unassigned")
		)
	)


def block_submit_during_review(doc, method=None):
	"""before_submit guard: refuse to submit while review is Pending or Rejected."""
	if doc.custom_review_status in ("Pending", "Rejected"):
		frappe.throw(
			_("Cannot submit while Review Status is {0}. "
			  "Reviewer must Approve first, or HR Manager must clear the status."
			).format(doc.custom_review_status)
		)


@frappe.whitelist()
def get_review_urls(name: str) -> dict:
    base = get_url() + "/api/method/recruitment.api.job_offer_review.review_decision?"
    return {
        "approve": base + get_signed_params({"name": name, "action": "approve"}),
        "reject": base + get_signed_params({"name": name, "action": "reject"}),
    }


@frappe.whitelist()
def get_reviewer_employees():
    """Active employees whose linked user holds the 'Job Approver' role.
    """
    users = frappe.get_all(
        "Has Role",
        filters={"role": "Job Approver", "parenttype": "User"},
        pluck="parent",
    )
    if not users:
        return []
    return frappe.get_all(
        "Employee",
        filters={"status": "Active", "user_id": ["in", users]},
        fields=["name", "employee_name", "user_id"],
        order_by="employee_name asc",
        limit_page_length=0,
    )


@frappe.whitelist(allow_guest=True)
def review_decision(name: str, action: str, **kwargs):
    if action not in ("approve", "reject"):
        frappe.throw(_("Invalid action."))

    if not verify_request():
        frappe.throw(_("Invalid or expired review link."))

    # Force login if reached via guest session.
    if frappe.session.user == "Guest":
        redirect_to = quote(frappe.local.request.url, safe="")
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = f"/login?redirect-to={redirect_to}"
        return

    jo = frappe.get_doc("Job Offer", name)
    reviewer_user = frappe.db.get_value("Employee", jo.custom_reviewer, "user_id")

    if frappe.session.user != reviewer_user and "HR Manager" not in frappe.get_roles():
        frappe.throw(
            _("Only the assigned reviewer ({0}) can act on this offer.").format(
                reviewer_user or _("unassigned")
            )
        )

    # Only allow a decision when the review is actually pending. Any other
    # state (Approved, Rejected, blank) means the link has already been used or
    # the offer was never sent for review -- bail out with an "already marked"
    # message regardless of which action the user clicked.
    if jo.custom_review_status != "Pending":
        return _(
            "This Job Offer is already marked {0}. The Approve / Reject link can no longer be used."
        ).format(jo.custom_review_status or _("(no review pending)"))

    new_status = "Approved" if action == "approve" else "Rejected"
    jo.custom_review_status = new_status
    jo.flags.ignore_permissions = True

    if action == "approve":
        # Reset the idempotency flag so the post-approval funnel chain (which
        # gates on `not custom_offer_email_sent`) can fire -- handles the
        # cancel+amend case where the flag persists through the duplicate.
        jo.custom_offer_email_sent = 0

        # Submit the record so the on_submit hook fires -> the post-approval
        # document_event_trigger picks it up and emails the candidate (with the
        # Job Offer Walnut PDF attached, which lands in the activity timeline).
        if jo.docstatus == 0:
            jo.submit()
        else:
            jo.save()
    else:
        # action == "reject" -- keep the doc in Draft, just persist the rejection.
        jo.save()

    # Audit trail: record WHO acted and when, alongside the auto-Communication.
    _log_review_decision(jo, action, reviewer_user)

    if action == "approve":
        return _(
            "Approved and submitted. Candidate offer email is being sent now. You can close this tab."
        )
    return _("Marked Rejected. You can close this tab.")


def _log_review_decision(jo, action: str, reviewer_user: str | None) -> None:
    reviewer_name = (
        frappe.db.get_value("Employee", jo.custom_reviewer, "employee_name")
        or jo.custom_reviewer
        or "(unassigned)"
    )
    label = "Approved" if action == "approve" else "Rejected"
    actor = frappe.session.user
    frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Info",
            "reference_doctype": "Job Offer",
            "reference_name": jo.name,
            "content": (
                f"Review <b>{label}</b> by {reviewer_name} ({actor}) on {frappe.utils.now()}."
                + (f" Reviewer's registered user: {reviewer_user}." if reviewer_user and reviewer_user != actor else "")
            ),
        }
    ).insert(ignore_permissions=True)
