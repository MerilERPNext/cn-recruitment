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
                            Date and version N+1 is raised with the same terms,
                            submitted and emailed at once (Awaiting Response).
                            The expired offer stays Expired as history, and both
                            offers log the resend in their activity. When the
                            terms must change, `offer_lifecycle.resend_job_offer`
                            raises N+1 as a Draft for HR to edit instead.

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
    """May this expired offer be resent as a new version on a new expiry date?

    Read by `offer_lifecycle.get_offer_actions`, so the form button and the
    endpoint below can never disagree.
    """
    from recruitment.api.offer_lifecycle import _newer_offer_exists
    from recruitment.recruitment.offer_send_rules import EMAIL_SENT

    if doc.docstatus == 2:
        return _deny(_("This offer is cancelled."))
    if (doc.get("status") or "") != EXPIRED:
        return _deny(
            _("Only an expired offer can be resent with a new expiry date. This one is {0}.").format(
                _(doc.get("status") or "Draft")
            )
        )
    if doc.get("email_status") != EMAIL_SENT and not doc.get("email_sent_on"):
        return _deny(_("This offer's letter was never emailed. Use 'Send Job Offer' instead."))
    if _newer_offer_exists(doc):
        return _deny(_("A newer version of this offer already exists."))
    if not frappe.has_permission(JOB_OFFER, "write", doc=doc.name):
        return _deny(_("You do not have permission to change this Job Offer."))
    # Resending raises, submits and sends a new version — the same rights the
    # endpoint checks, so the button is not offered to someone it would refuse.
    if not (frappe.has_permission(JOB_OFFER, "create") and frappe.has_permission(JOB_OFFER, "submit")):
        return _deny(_("You need permission to create and submit Job Offers to resend this offer letter."))
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


# Fields that say HR Ops has verified the offer's terms. The new version carries
# the same terms, so it carries that verification over instead of waiting on HR
# Ops a second time (Recruitment Settings -> Require HR Ops Verification).
_HR_OPS_FIELDS = ("custom_hr_ops_notified", "custom_hr_ops_notified_on", "custom_hr_ops_notified_by")


@frappe.whitelist()
def resend_offer_letter(job_offer, expiry_date):
    """Resend an expired offer to the candidate as a new version on a new expiry date.

    Version N+1 is copied from the expired offer with the same terms, given the
    new Expiry Date, submitted and emailed straight away, so the candidate is
    back in front of a live offer. The expired offer stays Expired as history.
    Both offers log the resend in their activity, and the candidate's hiring
    workflow records "Offer Resent".

    Use `offer_lifecycle.resend_job_offer` instead when the terms must change: it
    raises N+1 as a Draft for HR to edit.

    The whole thing is one transaction: if the new version cannot be submitted or
    its email cannot go out, nothing is kept and the old offer stays Expired.
    """
    from recruitment.api.bulk_job_offer import send_bulk_job_offer
    from recruitment.api.hiring_stage import record_offer_event
    from recruitment.recruitment.offer_send_rules import EMAIL_SENT
    from recruitment.api.offer_lifecycle import raise_new_version, version_of
    from recruitment.api.offer_validation import check_offer_allowed

    if not job_offer:
        frappe.throw(_("Job Offer is required."))
    frappe.has_permission(JOB_OFFER, "write", doc=job_offer, throw=True)
    frappe.has_permission(JOB_OFFER, "create", throw=True)
    frappe.has_permission(JOB_OFFER, "submit", throw=True)

    old = frappe.get_doc(JOB_OFFER, job_offer)
    rule = resend_letter_rule(old)
    if not rule["allowed"]:
        frappe.throw(rule["reason"], title=_("Cannot Resend Offer Letter"))

    expiry = _validated_expiry(old, expiry_date)

    # Resending puts the candidate back in front of an active offer, so it has to
    # clear the same gates a fresh offer does — the position the expired offer
    # released may well have been spoken for while it sat expired.
    allowed = check_offer_allowed(old.job_applicant, exclude_offer=old.name)
    if not allowed.get("allowed"):
        frappe.throw(allowed.get("message"), title=_("Cannot Resend Offer Letter"))

    overrides = {EXPIRY_FIELD: expiry}
    overrides.update({f: old.get(f) for f in _HR_OPS_FIELDS})
    new = raise_new_version(old, overrides)
    new.submit()

    result = send_bulk_job_offer([new.name])
    # `email_sent_on` is stamped the moment the mail is out and nothing after
    # clears it. send_bulk_job_offer can still report the offer as failed when a
    # later step (its Communication log) breaks — the candidate has the letter
    # all the same, so that must not roll the new version away.
    emailed = result.get("sent") or frappe.db.get_value(JOB_OFFER, new.name, "email_sent_on")
    if not emailed:
        # Roll everything back — the new version must not sit submitted but unsent.
        email_error = frappe.db.get_value(JOB_OFFER, new.name, "email_error")
        if result.get("pending_hr_ops"):
            reason = _("HR Ops has not been notified for this offer yet. Click 'Notify HR Ops' first.")
        else:
            reason = email_error or _("The offer email could not be sent.")
        frappe.throw(
            _("The offer letter was not resent: {0}").format(reason),
            title=_("Cannot Resend Offer Letter"),
        )

    if not result.get("sent"):
        # Sent, but a post-send step marked it Failed — say what actually happened.
        frappe.db.set_value(JOB_OFFER, new.name, "email_status", EMAIL_SENT, update_modified=False)
    # The candidate has this version now: keep it, whatever the bookkeeping below does.
    frappe.db.commit()

    new.reload()
    previous_expiry = old.get(EXPIRY_FIELD)
    version = version_of(new)
    try:
        new.add_comment(
            "Comment",
            _("Version {0}, resent from {1} (Expired). Offer letter emailed to the candidate, valid until {2}.").format(
                version, old.name, formatdate(expiry)
            ),
        )
        old.add_comment(
            "Comment",
            _("Superseded by version {0}: {1}. Offer letter resent with a new expiry date ({2}).").format(
                version, new.name, formatdate(expiry)
            ),
        )
        record_offer_event(
            new,
            "Offer Resent",
            notes=_("{0} (version {1}), resent from {2} after it expired").format(new.name, version, old.name),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"Resend Offer Letter: logging failed for {new.name}")

    return {
        "job_offer": new.name,
        "version": version,
        "previous_offer": old.name,
        "status": new.status,
        "expiry_date": str(expiry),
        "previous_expiry_date": str(previous_expiry) if previous_expiry else None,
    }
