"""Job Offer expiry — the letter the candidate never answered.

Every offer carries a validity date (Expiry Date, `custom_jo_expiry_date`): the
last day the candidate may accept or decline it. Once that day is past and the
letter is still unanswered the offer is no use to anyone — it must not go on
holding a requisition position, and the candidate must not be able to accept
terms the company stopped standing behind.

    expire_overdue_offers   daily scheduler. Every offer still Awaiting Response
                            whose Expiry Date is before today becomes "Expired":
                            the position goes back to Open, the candidate's
                            Action Center item is removed, and the hiring
                            workflow records "Offer Expired". An offer with no
                            Expiry Date never expires.

    resend_offer_letter     what the recruiter does next. They pick a new Expiry
                            Date and the SAME letter goes out again, the offer
                            back to Awaiting Response on the same position.
                            Nothing about the terms changes, so no new version
                            is raised — when the terms must change,
                            `offer_lifecycle.resend_job_offer` raises version
                            N+1 instead, which an expired offer allows too.

Expired is a releasing status everywhere the other closed statuses are
(offer_position, offer_validation, offer_lifecycle), so an expired letter stops
counting against headcount the moment it lapses rather than when HR notices.
"""

import frappe
from frappe import _
from frappe.utils import formatdate, getdate, today

JOB_OFFER = "Job Offer"
EXPIRY_FIELD = "custom_jo_expiry_date"

AWAITING_RESPONSE = "Awaiting Response"
EXPIRED = "Expired"


def has_expiry_field():
    """Sites that have not migrated the Expiry Date field yet simply never expire."""
    return frappe.get_meta(JOB_OFFER).has_field(EXPIRY_FIELD)


def is_past_expiry(expiry, as_of=None):
    """The validity period is inclusive: an offer expiring today is still live
    today and lapses tomorrow."""
    if not expiry:
        return False
    return getdate(expiry) < getdate(as_of or today())


def offer_has_lapsed(doc):
    """Already Expired, or Awaiting Response with its Expiry Date behind us.

    The second half matters between scheduler runs: the candidate must not be
    able to accept at 09:00 an offer that lapsed at midnight just because the
    daily job has not relabelled it yet.
    """
    status = (doc.get("status") or "").strip()
    if status == EXPIRED:
        return True
    return status == AWAITING_RESPONSE and is_past_expiry(doc.get(EXPIRY_FIELD))


# ---------------------------------------------------------------------------
# The daily sweep
# ---------------------------------------------------------------------------

def expire_overdue_offers():
    """Daily scheduler entry point. One offer failing never stops the rest."""
    if not has_expiry_field():
        return

    cutoff = getdate(today())
    # A NULL Expiry Date fails the `<` comparison in SQL, which is exactly the
    # rule we want: an offer with no validity period never lapses.
    names = frappe.get_all(
        JOB_OFFER,
        filters={"docstatus": ["<", 2], "status": AWAITING_RESPONSE, EXPIRY_FIELD: ["<", cutoff]},
        pluck="name",
        order_by="creation asc",
    )

    for name in names:
        try:
            doc = frappe.get_doc(JOB_OFFER, name)
            # Re-read rather than trust the list: the candidate may have answered
            # between the query and this row.
            if doc.status != AWAITING_RESPONSE or not is_past_expiry(doc.get(EXPIRY_FIELD), cutoff):
                continue
            apply_expiry(doc)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(frappe.get_traceback(), f"Offer expiry failed: {name}")


def apply_expiry(doc, comment=None):
    """Mark the offer Expired and do everything that goes with it: hand the
    position back, close the candidate's Action Center item, record the event on
    their hiring workflow, fire the expiry notifications and leave `comment` on
    the offer. Callers do their own permission / eligibility checks.

    Deliberately shaped like `offer_position.apply_withdrawal` — the two are the
    same kind of event (the offer leaves the table without the candidate
    accepting), and only the wording and the notification hook differ.
    """
    from recruitment.api.action_center import sync_job_offer_action_item
    from recruitment.api.hiring_stage import record_offer_event
    from recruitment.api.offer_position import (
        POSITION_FIELD,
        run_offer_notifications,
        sync_offer_position,
    )

    job_offer = doc.name
    row_name = doc.get(POSITION_FIELD)

    # Snapshot the pre-expiry state so a Value Change notification on `status`
    # sees Awaiting Response -> Expired.
    doc.load_doc_before_save()

    # Submitted offers only accept allow-on-submit writes, so go through the db.
    frappe.db.set_value(JOB_OFFER, job_offer, "status", EXPIRED)
    doc.status = EXPIRED
    # Expired is a releasing status, so this returns the position to Open and
    # rolls the requisition back out of Auto Archived. Never raises.
    sync_offer_position(doc)

    # The raw write above fires no doc_events: close the candidate's Action
    # Center item and put the lapse on their hiring workflow here.
    try:
        sync_job_offer_action_item(doc)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Offer: action item close on expiry failed")
    record_offer_event(doc, "Offer Expired")
    # Configure as a Notification on Job Offer with Send Alert On "Method" and
    # Trigger Method "on_offer_expired", or on a Value Change of `status`.
    run_offer_notifications(doc, ("on_change", "on_offer_expired"), "expiry")

    expiry = doc.get(EXPIRY_FIELD)
    doc.add_comment(
        "Comment",
        comment
        or _("Offer expired: the candidate did not respond by the expiry date ({0}).").format(
            formatdate(expiry) if expiry else "?"
        ),
    )

    return {
        "job_offer": job_offer,
        "status": EXPIRED,
        "changed": True,
        "position_released": row_name,
    }


# ---------------------------------------------------------------------------
# Resending the same letter
# ---------------------------------------------------------------------------

def _deny(reason):
    return {"allowed": False, "reason": reason}


_ALLOW = {"allowed": True, "reason": None}


def resend_letter_rule(doc):
    """May this expired offer's letter be sent again as it stands?

    Read by `offer_lifecycle.get_offer_actions`, so the form button and the
    endpoint below can never disagree.
    """
    from recruitment.api.offer_lifecycle import _newer_offer_exists
    from recruitment.recruitment.offer_send_rules import EMAIL_SENT

    if doc.docstatus == 2:
        return _deny(_("This offer is cancelled."))
    if (doc.get("status") or "") != EXPIRED:
        return _deny(
            _("Only an expired offer can be resent as it stands. This one is {0}.").format(
                _(doc.get("status") or "Draft")
            )
        )
    if doc.get("email_status") != EMAIL_SENT and not doc.get("email_sent_on"):
        return _deny(_("This offer's letter was never emailed. Use 'Send Job Offer' instead."))
    if _newer_offer_exists(doc):
        return _deny(_("A newer version of this offer already exists."))
    if not frappe.has_permission(JOB_OFFER, "write", doc=doc.name):
        return _deny(_("You do not have permission to change this Job Offer."))
    return _ALLOW


def _validated_expiry(doc, expiry_date):
    """The new Expiry Date, or a thrown message saying why it is no good."""
    if not expiry_date:
        frappe.throw(_("Pick a new expiry date for the offer."), title=_("Expiry Date Required"))
    expiry = getdate(expiry_date)
    if expiry < getdate(today()):
        frappe.throw(
            _("The new expiry date must be today or later — {0} has already passed.").format(
                formatdate(expiry)
            ),
            title=_("Expiry Date in the Past"),
        )
    offer_date = doc.get("offer_date")
    if offer_date and expiry < getdate(offer_date):
        frappe.throw(
            _("The expiry date must be on or after the offer date ({0}).").format(formatdate(offer_date)),
            title=_("Invalid Expiry Date"),
        )
    return expiry


def _reclaim_position(doc):
    """Take back the position the offer gave up when it lapsed.

    While the offer sat Expired its seat was Open and another offer may have
    taken it, so this asks for the released one first and falls back to whatever
    is still free — the same rule `resend_job_offer` uses for a new version.
    """
    from recruitment.api.offer_lifecycle import _position_for_resend
    from recruitment.api.offer_position import POSITION_FIELD, requires_position

    requisition = doc.get("custom_job_requisition")
    if not requisition or not requires_position(requisition) or doc.get(POSITION_FIELD):
        return

    position = _position_for_resend(doc, requisition)
    if not position:
        frappe.throw(
            _(
                "Every position on {0} is filled or claimed by another offer, so this letter "
                "cannot be sent again. Withdraw the offer holding the position, or raise a new version."
            ).format(frappe.bold(requisition)),
            title=_("No Position Available"),
        )
    frappe.db.set_value(JOB_OFFER, doc.name, POSITION_FIELD, position, update_modified=False)
    doc.set(POSITION_FIELD, position)


@frappe.whitelist()
def resend_offer_letter(job_offer, expiry_date):
    """Give an expired offer a new validity period and email the same letter again.

    The offer itself does not change — same terms, same version, same letter —
    so this is not `resend_job_offer`, which copies the offer into a new Draft
    version for HR to edit. Use this one when the candidate simply ran out of
    time; use that one when anything about the offer has to change.

    The whole thing is one transaction: if the email cannot go out, the offer
    stays Expired rather than sitting at Awaiting Response with nothing sent.
    """
    from recruitment.api.action_center import sync_job_offer_action_item
    from recruitment.api.bulk_job_offer import resend_welcome_email
    from recruitment.api.hiring_stage import record_offer_event
    from recruitment.api.offer_position import sync_offer_position
    from recruitment.api.offer_validation import check_offer_allowed

    if not job_offer:
        frappe.throw(_("Job Offer is required."))
    frappe.has_permission(JOB_OFFER, "write", doc=job_offer, throw=True)

    doc = frappe.get_doc(JOB_OFFER, job_offer)
    rule = resend_letter_rule(doc)
    if not rule["allowed"]:
        frappe.throw(rule["reason"], title=_("Cannot Resend Offer Letter"))

    expiry = _validated_expiry(doc, expiry_date)

    # Reviving the letter puts the candidate back in front of an active offer,
    # so it has to clear the same gates a fresh offer does — the position it
    # released may well have been spoken for while it sat expired.
    allowed = check_offer_allowed(doc.job_applicant, exclude_offer=doc.name)
    if not allowed.get("allowed"):
        frappe.throw(allowed.get("message"), title=_("Cannot Resend Offer Letter"))

    _reclaim_position(doc)

    previous_expiry = doc.get(EXPIRY_FIELD)
    frappe.db.set_value(
        JOB_OFFER, doc.name, {EXPIRY_FIELD: expiry, "status": AWAITING_RESPONSE}
    )
    doc.set(EXPIRY_FIELD, expiry)
    doc.status = AWAITING_RESPONSE

    # Raw writes fire no doc_events: re-claim the position, put the offer back in
    # the candidate's Action Center and tell the hiring workflow it is live again.
    sync_offer_position(doc)
    try:
        sync_job_offer_action_item(doc)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Offer: action item on letter resend failed")
    record_offer_event(doc, "Offer Resent")

    # Last, and not wrapped: a failed send must roll the status back with it.
    resend_welcome_email(doc.name)

    doc.add_comment(
        "Comment",
        _("Offer letter resent to the candidate. Expiry date moved from {0} to {1}.").format(
            formatdate(previous_expiry) if previous_expiry else _("none"), formatdate(expiry)
        ),
    )

    return {
        "job_offer": doc.name,
        "status": AWAITING_RESPONSE,
        "expiry_date": str(expiry),
        "previous_expiry_date": str(previous_expiry) if previous_expiry else None,
    }
