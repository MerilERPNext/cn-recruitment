"""Withdraw offers whose candidate never became an employee.

Recruitment Settings -> "Auto-withdraw Offer if Candidate Not Activated by DOJ"
with "Grace Period after DOJ (Days)". Once a day, every sent (Awaiting Response)
or Accepted offer whose Date of Joining plus the grace period has passed is
withdrawn when the candidate has not been activated:

    DOJ          the candidate's Employee Onboarding `date_of_joining` (kept
                 current by a Postponed DOJ outcome), else the offer's
                 Expected DOJ. An offer with neither is never touched.
    activated    an Employee exists for the candidate. Any Employee record —
                 Active or still Pending — takes the candidate out of this job:
                 a Pending one is HR's to activate or clean up, not ours.

Also left alone: a candidate whose onboarding has really started — marked
"Joined", Completed, onboarding tasks created, or statutory forms generated.
Withdrawing an accepted offer cancels its pending onboarding (outcome Not
Joined) and puts the candidate back at the offer stage, so a revised offer can
be resent. Off by default: nothing happens until HR ticks
the setting.
"""

import frappe
from frappe import _
from frappe.utils import add_days, cint, getdate, today

JOB_OFFER = "Job Offer"
ONBOARDING = "Employee Onboarding"
ACTION_ITEM = "Candidate Action Center Item"

ELIGIBLE_STATUSES = ("Awaiting Response", "Accepted")


def auto_withdraw_unjoined_offers():
    """Daily scheduler entry point. One offer failing never stops the rest."""
    settings = frappe.get_cached_doc("Recruitment Settings")
    if not cint(settings.get("auto_withdraw_unjoined_offers")):
        return
    grace_days = max(cint(settings.get("offer_joining_grace_days")), 0)
    # DOJ must be before this date for the offer to be overdue.
    cutoff = getdate(add_days(today(), -grace_days))

    for offer, onboarding, doj in _overdue_offers(cutoff):
        try:
            if _skip_reason(offer):
                continue
            _withdraw(offer, onboarding, doj, grace_days)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(frappe.get_traceback(), f"Auto-withdraw unjoined offer failed: {offer.name}")


def _overdue_offers(cutoff):
    """(offer, onboarding, doj) for every eligible offer whose DOJ is before
    `cutoff` and whose candidate has no Employee. A fixed handful of queries,
    however many offers there are."""
    filters = {"docstatus": ["<", 2], "status": ["in", ELIGIBLE_STATUSES]}
    fields = ["name", "job_applicant", "status"]
    if frappe.get_meta(JOB_OFFER).has_field("custom_expected_doj"):
        fields.append("custom_expected_doj")
        # An onboarding DOJ only ever moves later (Postponed), so an Expected
        # DOJ on or after the cutoff can't be overdue yet. Blank ones may still
        # have an onboarding DOJ.
        or_filters = [["custom_expected_doj", "<", cutoff], ["custom_expected_doj", "is", "not set"]]
    else:
        or_filters = None
    offers = frappe.get_all(JOB_OFFER, filters=filters, or_filters=or_filters, fields=fields)
    applicants = list({o.job_applicant for o in offers if o.job_applicant})
    if not applicants:
        return []

    employed = set(
        frappe.get_all("Employee", filters={"job_applicant": ["in", applicants]}, pluck="job_applicant")
    )
    # The candidate's newest live onboarding — looked up by applicant, so one
    # raised against an earlier version of the offer still counts.
    onboarding_of = {}
    for eo in frappe.get_all(
        ONBOARDING,
        filters={"job_applicant": ["in", applicants], "docstatus": ["<", 2]},
        fields=["name", "job_applicant", "date_of_joining"],
        order_by="creation desc",
    ):
        onboarding_of.setdefault(eo.job_applicant, eo)

    due = []
    for offer in offers:
        if not offer.job_applicant or offer.job_applicant in employed:
            continue
        onboarding = onboarding_of.get(offer.job_applicant)
        doj = (onboarding and onboarding.date_of_joining) or offer.get("custom_expected_doj")
        if doj and getdate(doj) < cutoff:
            due.append((offer, onboarding, doj))
    return due


def _skip_reason(offer):
    """Why this candidate counts as joined, or onboarding has really started
    (Employee, Joined outcome, Completed, tasks created, statutory forms), else
    None — the same test that stops an accepted offer being resent."""
    from recruitment.api.offer_lifecycle import _onboarding_block_reason

    return _onboarding_block_reason(offer.job_applicant)


def _withdraw(offer, onboarding, doj, grace_days):
    from recruitment.api.offer_position import apply_withdrawal

    doc = frappe.get_doc(JOB_OFFER, offer.name)
    was_accepted = doc.status == "Accepted"

    if onboarding:
        _cancel_onboarding(onboarding)
    if was_accepted and doc.job_applicant:
        # Back to the offer stage, as when an accepted offer is resent — else the
        # candidate stays "Accepted" and no revised offer can be raised.
        frappe.db.set_value(
            "Job Applicant",
            doc.job_applicant,
            {
                "status": "Hired",
                "custom_substatus": None,
                "custom_pre_onboarding_status": "",
                "custom_pre_onboarding_employee_onboarding": None,
            },
            update_modified=False,
        )

    comment = _(
        "Offer automatically withdrawn: the candidate was not activated as an employee within "
        "{0} day(s) of the Date of Joining ({1})."
    ).format(grace_days, frappe.utils.formatdate(doj))
    if onboarding:
        comment += " " + _("Employee Onboarding {0} cancelled.").format(onboarding.name)
    apply_withdrawal(doc, comment)


def _cancel_onboarding(onboarding):
    """Close the pending onboarding the way a "Not Joined" outcome does — raw
    writes, so the outcome hook doesn't also cancel the offer we are withdrawing."""
    frappe.db.delete(ACTION_ITEM, {"reference_doctype": ONBOARDING, "reference_docname": onboarding.name})
    frappe.db.set_value(
        ONBOARDING,
        onboarding.name,
        {"custom_doj_outcome": "Not Joined", "docstatus": 2},
        update_modified=False,
    )
