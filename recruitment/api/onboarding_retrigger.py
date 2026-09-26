"""Desk actions for onboarding that has stalled or was never started.

  * `retrigger_onboarding` — the "Retrigger Onboarding" button on Employee
    Onboarding. A live onboarding gets its candidate invite re-sent and its
    Action Center card re-opened; a cancelled one is initiated afresh, through
    the same path that created it (recruitment or New Hire).
  * `initiate_pending` — the "Initiate" button on the Onboarding Pending
    Initiation report, for accepted candidates and new hires who never got an
    onboarding.
"""

import frappe
from frappe import _

from recruitment.api import new_hire
from recruitment.api.action_center import (
    ACTION_DOCTYPE,
    initiate_onboarding_for_applicant,
    sync_onboarding_action_item,
)

EMPLOYEE_ONBOARDING = "Employee Onboarding"
SOURCE_JOB_APPLICANT = "Job Applicant"
SOURCE_NEW_HIRE = "New Hire"


@frappe.whitelist()
def retrigger_onboarding(employee_onboarding):
    """Resend a live onboarding to the candidate, or re-initiate a cancelled one.

    Returns {"employee_onboarding", "reinitiated", "existing", "warning"}. The name
    is the new onboarding when a cancelled one was re-initiated, or the candidate's
    live onboarding (``existing``) when they already have one.
    """
    if not employee_onboarding or not frappe.db.exists(EMPLOYEE_ONBOARDING, employee_onboarding):
        frappe.throw(_("Employee Onboarding not found."))

    eo = frappe.get_doc(EMPLOYEE_ONBOARDING, employee_onboarding)
    if not eo.job_applicant:
        frappe.throw(_("{0} has no Job Applicant, so there is no candidate to send it to.").format(eo.name))

    # Company / user restrictions apply to the onboarding in hand, cancelled or not.
    eo.check_permission("write")

    if eo.docstatus == 2:
        result = _reinitiate(eo)
        if not result["created"]:
            # An older cancelled onboarding: the candidate already has a live one.
            # Nothing to create, send or record — point HR at it instead.
            return {
                "employee_onboarding": result["name"],
                "reinitiated": False,
                "existing": True,
                "warning": _("This candidate already has an active onboarding, {0}. Retrigger it from there.").format(
                    result["name"]
                ),
            }
        new_eo = frappe.get_doc(EMPLOYEE_ONBOARDING, result["name"])
        warnings = list(result["warnings"])
        # A New Hire initiation already emails the invite when its form says so.
        if not result["invite_sent"]:
            warnings.append(_send_invite(new_eo))
        new_eo.add_comment("Info", _("Onboarding re-initiated from cancelled {0}.").format(eo.name))
        frappe.db.commit()
        return {
            "employee_onboarding": new_eo.name,
            "reinitiated": True,
            "existing": False,
            # Plain text (messages can carry <strong> etc.), escaped, one per line.
            "warning": "<br>".join(
                frappe.utils.escape_html(frappe.utils.strip_html(str(w))) for w in warnings if w
            ) or None,
        }

    if (eo.boarding_status or "").strip().lower() == "completed":
        frappe.throw(_("Onboarding {0} is already completed; there is nothing to retrigger.").format(eo.name))

    _reopen_action_item(eo)
    warning = _send_invite(eo)
    eo.add_comment("Info", _("Onboarding retriggered: invite re-sent to the candidate."))
    frappe.db.commit()
    return {"employee_onboarding": eo.name, "reinitiated": False, "warning": warning}


@frappe.whitelist()
def initiate_pending(source, name):
    """Initiate onboarding for a row of the Onboarding Pending Initiation report."""
    frappe.has_permission(EMPLOYEE_ONBOARDING, "create", throw=True)
    if source == SOURCE_JOB_APPLICANT:
        result = initiate_onboarding_for_applicant(name)
        eo_name = result["employee_onboarding"]
    elif source == SOURCE_NEW_HIRE:
        eo_name = _initiate_new_hire(name)["name"]
    else:
        frappe.throw(_("Unknown source: {0}").format(source))
    frappe.db.commit()
    return {"employee_onboarding": eo_name}


def _reinitiate(eo):
    """Initiate afresh through the path that created ``eo``.

    {"name", "created", "invite_sent", "warnings"} — ``created`` is False when the
    candidate already had a live onboarding and that one was handed back.
    """
    frappe.has_permission(EMPLOYEE_ONBOARDING, "create", throw=True)
    if eo.get("custom_direct_hire") and eo.employee:
        return _initiate_new_hire(eo.employee)
    result = initiate_onboarding_for_applicant(eo.job_applicant)
    return {
        "name": result["employee_onboarding"],
        "created": not result.get("already_existed"),
        "invite_sent": False,
        "warnings": [],
    }


def _initiate_new_hire(employee):
    response = new_hire.initiate_onboarding(employee)
    # The New Hire API answers with a status code instead of raising; this is a
    # desk call, so reset it and surface the message as an error.
    frappe.local.response.pop("http_status_code", None)
    if not response.get("success"):
        frappe.throw(response.get("message") or _("Onboarding could not be initiated."))
    data = response.get("data") or {}
    return {
        "name": data["employee_onboarding"],
        "created": not data.get("already_initiated"),
        "invite_sent": bool(data.get("portal_invite_sent")),
        "warnings": response.get("warnings") or [],
    }


def _reopen_action_item(eo):
    """Make sure the candidate's card for this onboarding is there and open."""
    email = frappe.db.get_value("Job Applicant", eo.job_applicant, "email_id")
    if not email:
        return
    existing = frappe.db.get_value(
        ACTION_DOCTYPE,
        {
            "candidate_email": email.strip().lower(),
            "reference_doctype": EMPLOYEE_ONBOARDING,
            "reference_docname": eo.name,
        },
        "name",
    )
    if existing:
        frappe.db.set_value(ACTION_DOCTYPE, existing, "status", "Action Required")
    else:
        sync_onboarding_action_item(eo)


def _send_invite(eo):
    """Email the candidate their portal link. Returns a warning, or None.

    A New Hire onboarding goes through the New Hire invite, with the form's own
    email template; any other gets the same default message. Never raises — the
    onboarding stands whatever happens to one email.
    """
    applicant = frappe.get_doc("Job Applicant", eo.job_applicant)

    if eo.get("custom_direct_hire") and eo.employee and frappe.db.exists("Employee", eo.employee):
        employee = frappe.get_doc("Employee", eo.employee)
        form_doc = new_hire.resolve_form(form=employee.get(new_hire.FORM_FIELD))
        if form_doc:
            return new_hire._send_portal_invite(applicant, eo, employee, form_doc)

    email = (applicant.email_id or "").strip()
    if not email:
        return _("No email on the Job Applicant, so no invite was sent.")
    try:
        from recruitment.api.candidate_auth import ensure_candidate_for_invite
        from recruitment.recruitment.communication_log import sendmail_with_log

        full_name = applicant.applicant_name or eo.employee_name
        ensure_candidate_for_invite(email, full_name=full_name, job_applicant=applicant.name)

        escape = frappe.utils.escape_html
        company = eo.company or ""
        context = {
            "applicant_name": escape(full_name or ""),
            "employee": escape(eo.employee or ""),
            "employee_onboarding": escape(eo.name),
            "portal_url": escape(new_hire._portal_url(applicant, eo)),
            "company": escape(company),
        }
        sendmail_with_log(
            recipients=[email],
            subject=new_hire._FALLBACK_INVITE_SUBJECT.format(company=company),
            message=frappe.render_template(new_hire._FALLBACK_INVITE_MESSAGE, context),
            reference_doctype=EMPLOYEE_ONBOARDING,
            reference_name=eo.name,
        )
        return None
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"retrigger_onboarding: invite failed for {eo.name}")
        return _("The invite email could not be sent. The candidate can still sign in with {0}.").format(email)
