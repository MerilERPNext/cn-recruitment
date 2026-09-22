"""Job Offer lifecycle — Draft -> sent -> withdrawn / rejected -> resent as a new version.

    Draft               created (and possibly submitted); the candidate has not had it
    Awaiting Response   "Send Job Offer" emailed it (bulk_job_offer.send_bulk_job_offer)
    Accepted            the candidate accepted
    Rejected            the candidate declined
    Withdrawn           HR pulled it back after sending (offer_position.withdraw_offer)

A withdrawn, rejected or cancelled offer is history, never edited back to life.
"Resend Job Offer" copies it into a new Draft — the next version, linked through
`custom_previous_offer` — which HR edits, submits and sends like any other offer.

`get_offer_actions` is the single answer to "what may be done to this offer now";
the Job Offer form and the hiring workflow both draw their buttons from it, and
the endpoints re-check it, so a hidden button cannot be bypassed. The Recruitment
Settings -> Job Offer Rules keep their meaning: they are read here, not duplicated.
"""

import frappe
from frappe import _
from frappe.utils import cint, today

JOB_OFFER = "Job Offer"

DRAFT = "Draft"
AWAITING_RESPONSE = "Awaiting Response"
ACCEPTED = "Accepted"
REJECTED = "Rejected"
WITHDRAWN = "Withdrawn"

# The candidate is done with these; a new version may be raised against them.
CLOSED_STATUSES = (REJECTED, WITHDRAWN)

VERSION_FIELD = "custom_offer_version"
PREVIOUS_FIELD = "custom_previous_offer"
RELEASED_POSITION_FIELD = "custom_released_position"

# Cleared on the new version: they describe what happened to the old letter.
RESET_ON_RESEND = {
    "email_status": "Pending",
    "email_sent_on": None,
    "email_error": None,
    "custom_hr_ops_notified": 0,
    "custom_hr_ops_notified_on": None,
    "custom_hr_ops_notified_by": None,
    "custom_offer_accepted_on": None,
    "custom_rejection_reason": None,
    "custom_rejection_message": None,
    "amended_from": None,
}


def _setting(fieldname):
    return frappe.db.get_single_value("Recruitment Settings", fieldname)


def version_of(doc):
    return cint(doc.get(VERSION_FIELD)) or 1


# ---------------------------------------------------------------------------
# Which offer is "the" offer
# ---------------------------------------------------------------------------

def offers_of(job_applicant, fields=("name",)):
    """Every offer to the candidate, newest first (cancelled ones included)."""
    return frappe.get_all(
        JOB_OFFER,
        filters={"job_applicant": job_applicant},
        fields=list(fields),
        order_by="creation desc",
    )


def current_offer_name(job_applicant):
    """The offer the candidate should be looking at: the newest one still in play,
    else the newest uncancelled one (so a declined offer still shows as declined).

    Replaces unordered `get_value("Job Offer", {"job_applicant": ...})` lookups,
    which could hand back a superseded version once an offer has been resent.
    """
    if not job_applicant:
        return None
    base = {"job_applicant": job_applicant, "docstatus": ["!=", 2]}
    live = frappe.get_all(
        JOB_OFFER,
        filters={**base, "status": ["not in", CLOSED_STATUSES]},
        pluck="name",
        order_by="creation desc",
        limit=1,
    )
    if live:
        return live[0]
    latest = frappe.get_all(JOB_OFFER, filters=base, pluck="name", order_by="creation desc", limit=1)
    return latest[0] if latest else None


def _newer_offer_exists(doc):
    return bool(
        frappe.db.exists(
            JOB_OFFER,
            {"job_applicant": doc.job_applicant, "creation": [">", doc.creation], "name": ["!=", doc.name]},
        )
    )


# ---------------------------------------------------------------------------
# What may be done now
# ---------------------------------------------------------------------------

def _deny(reason):
    return {"allowed": False, "reason": reason}


_ALLOW = {"allowed": True, "reason": None}


def _send_rule(doc):
    from recruitment.recruitment.hr_ops_offer_review import send_blocked as hr_ops_send_blocked
    from recruitment.recruitment.offer_send_rules import send_locked

    if doc.docstatus == 2:
        return _deny(_("This offer is cancelled."))
    if doc.status in (ACCEPTED, REJECTED, WITHDRAWN):
        return _deny(_("This offer is {0}.").format(_(doc.status)))
    if doc.docstatus != 1:
        return _deny(_("Submit the offer before sending it."))
    if not cint(_setting("enable_send_job_offer_button")):
        return _deny(_("Sending is turned off in Recruitment Settings (Enable Send Job Offer Button)."))
    if send_locked(doc):
        return _deny(_("This offer has already been sent. Use 'Retrigger Welcome Email' to re-send it."))
    if hr_ops_send_blocked(doc):
        return _deny(_("HR Ops has not been notified for this offer yet. Click 'Notify HR Ops' first."))
    return _ALLOW


def _withdraw_rule(doc):
    from recruitment.recruitment.offer_send_rules import is_offer_sent

    if doc.docstatus == 2:
        return _deny(_("This offer is cancelled."))
    if doc.status == DRAFT:
        return _deny(
            _("This offer has not been sent yet, so there is nothing to withdraw. Edit it, or cancel / delete it instead.")
        )
    if doc.status != AWAITING_RESPONSE:
        return _deny(_("Only an offer awaiting the candidate's response can be withdrawn. This one is {0}.").format(_(doc.status)))
    # Recruitment Settings -> Allow Withdraw Offer Only After It Is Sent.
    if cint(_setting("withdraw_offer_only_after_sent")) and not is_offer_sent(doc):
        return _deny(_("This offer can only be withdrawn after it has been submitted and its offer email sent."))
    return _ALLOW


def _resend_rule(doc):
    from recruitment.api.offer_validation import check_offer_allowed

    if not (doc.docstatus == 2 or doc.status in CLOSED_STATUSES):
        return _deny(_("An offer can be resent only after it is withdrawn, rejected or cancelled."))
    if _newer_offer_exists(doc):
        return _deny(_("A newer version of this offer already exists."))
    if frappe.db.get_value("Job Applicant", doc.job_applicant, "status") == ACCEPTED:
        return _deny(_("This candidate has already accepted an offer."))
    if not frappe.has_permission(JOB_OFFER, "create"):
        return _deny(_("You do not have permission to create a Job Offer."))
    # Same gates as a fresh offer: no other live offer, requisition, headcount.
    allowed = check_offer_allowed(doc.job_applicant, exclude_offer=doc.name)
    if not allowed.get("allowed"):
        return _deny(allowed.get("message"))
    return _ALLOW


def offer_actions(doc):
    return {
        "send": _send_rule(doc),
        "withdraw": _withdraw_rule(doc),
        "resend": _resend_rule(doc),
    }


@frappe.whitelist()
def get_offer_actions(job_offer):
    """Buttons for the Job Offer form and the hiring workflow, with the reason
    for each one that is not available."""
    frappe.has_permission(JOB_OFFER, "read", doc=job_offer, throw=True)
    doc = frappe.get_doc(JOB_OFFER, job_offer)
    return {"job_offer": doc.name, "status": doc.status, "version": version_of(doc), **offer_actions(doc)}


# ---------------------------------------------------------------------------
# Resend — a new version
# ---------------------------------------------------------------------------

def _position_for_resend(old, requisition):
    """The seat the new version claims: the one the old offer gave back if it is
    still free, otherwise the first free one. None when nothing is free."""
    from recruitment.api.offer_position import (
        JOB_REQUISITION_POSITION,
        _is_offerable,
        _positions_held_by_other_offers,
        _requisition_is_active,
        first_available_position,
    )

    previous = old.get(RELEASED_POSITION_FIELD) or old.get("custom_requisition_position")
    if previous:
        row = frappe.db.get_value(
            JOB_REQUISITION_POSITION, previous, ["name", "parent", "status", "candidate"], as_dict=True
        )
        if (
            row
            and row.parent == requisition
            and row.name not in _positions_held_by_other_offers(requisition)
            and _is_offerable(row, _requisition_is_active(requisition))
        ):
            return row.name
    row = first_available_position(requisition)
    return row.name if row else None


@frappe.whitelist()
def resend_job_offer(job_offer):
    """Copy a withdrawn / rejected / cancelled offer into a new Draft version.

    The new version is not sent: HR reviews it, submits and clicks "Send Job
    Offer" as for any other offer. Returns the new offer's name.
    """
    from recruitment.api.offer_position import requires_position
    from recruitment.customizations.job_offer import _requisition_for_applicant

    if not job_offer:
        frappe.throw(_("Job Offer is required."))
    frappe.has_permission(JOB_OFFER, "read", doc=job_offer, throw=True)
    frappe.has_permission(JOB_OFFER, "create", throw=True)

    old = frappe.get_doc(JOB_OFFER, job_offer)
    rule = _resend_rule(old)
    if not rule["allowed"]:
        frappe.throw(rule["reason"], title=_("Cannot Resend Job Offer"))

    new = frappe.copy_doc(old)
    new.docstatus = 0
    new.status = DRAFT
    new.offer_date = today()
    new.set(VERSION_FIELD, version_of(old) + 1)
    new.set(PREVIOUS_FIELD, old.name)
    new.set(RELEASED_POSITION_FIELD, None)
    for fieldname, value in RESET_ON_RESEND.items():
        if new.meta.has_field(fieldname):
            new.set(fieldname, value)

    requisition = old.get("custom_job_requisition") or _requisition_for_applicant(old.job_applicant)
    new.set("custom_job_requisition", requisition)
    new.set("custom_requisition_position", None)
    new.set("custom_position_label", None)
    if requisition and requires_position(requisition):
        position = _position_for_resend(old, requisition)
        if not position:
            frappe.throw(
                _("Every position on {0} is filled or claimed by another offer, so a new version cannot be raised.").format(
                    frappe.bold(requisition)
                ),
                title=_("No Position Available"),
            )
        new.set("custom_requisition_position", position)

    new.insert()

    new.add_comment(
        "Comment",
        _("Version {0}, resent from {1} ({2}).").format(
            version_of(new), old.name, _("Cancelled") if old.docstatus == 2 else _(old.status)
        ),
    )
    old.add_comment("Comment", _("Superseded by version {0}: {1}.").format(version_of(new), new.name))

    from recruitment.api.hiring_stage import record_offer_event

    record_offer_event(new, "Offer Revised")

    return {
        "job_offer": new.name,
        "version": version_of(new),
        "previous_offer": old.name,
        "position": new.get("custom_requisition_position"),
        "position_label": new.get("custom_position_label"),
    }


# ---------------------------------------------------------------------------
# Doc events
# ---------------------------------------------------------------------------

def on_offer_cancel(doc, method=None):
    """`on_cancel`: tell the candidate's workflow the offer is off the table.

    Only the newest version speaks for the candidate — cancelling a superseded
    one changes nothing for them. Never raises.
    """
    try:
        if _newer_offer_exists(doc):
            return
        from recruitment.api.hiring_stage import record_offer_event

        record_offer_event(doc, "Offer Cancelled")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Offer: cancel event failed")
