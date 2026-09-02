import frappe
import json
from frappe import _
from frappe.utils import now, get_url, validate_email_address

from recruitment.job_offer_utils import (
    get_culture_book_attachment,
    get_job_offer_document_template,
    render_job_offer_via_document_template,
)


def _get_support_email():
    """Org-wide support address used by the offer/onboarding email templates
    (referenced as {{ support_email }}).

    Sourced from the default outgoing Email Account so we never hardcode an
    address; falls back to `support_email` in site config, else empty string.
    """
    return (
        frappe.db.get_value("Email Account", {"default_outgoing": 1}, "email_id")
        or frappe.conf.get("support_email")
        or ""
    )


def _job_offer_email_context(job_offer, applicant):
    """Single source of truth for the variables available to the Job Offer
    email template. Add new template variables here so every send path
    (bulk / single) stays in sync.
    """
    site_url = get_url()
    from recruitment.recruitment.link_token import offer_token
    offer_url = f"{site_url}/job_offer?appl={applicant.name}&token={offer_token(applicant.name)}"
    applicant_name = job_offer.applicant_name or applicant.applicant_name
    first_name = (applicant_name or "Candidate").split(" ")[0]

    return {
        # full doc so templates may also use {{ doc.<fieldname> }}
        "doc": job_offer,
        # flat variables the configured templates use directly
        "first_name": first_name,
        "applicant_name": applicant_name,
        "applicant_email": job_offer.get("applicant_email") or applicant.email_id,
        "offer_url": offer_url,
        "portal_link": offer_url,
        "support_email": _get_support_email(),
    }


@frappe.whitelist()
def resend_welcome_email(job_offer):
    """Re-send the welcome / offer email for a single Job Offer to its candidate.

    Manual "Retrigger Welcome Email" action from the Job Offer form. Uses the
    Email Template configured in Recruitment Settings (`job_offer_template`) and
    the SAME context builder as the bulk / single offer send, so the content and
    template variables never drift between paths. Unlike `send_bulk_job_offer`
    this is an explicit re-send: it does not skip already-responded candidates and
    does not overwrite the offer's `email_status` bookkeeping.

    Requires the email to have gone out once already (`email_status` == "Sent",
    stamped by `send_bulk_job_offer`) — the guard matching the hidden form button,
    so this cannot be used as a first send. Repeat retriggers stay allowed.
    """
    frappe.has_permission("Job Offer", "write", throw=True)

    offer = frappe.get_doc("Job Offer", job_offer)
    if not offer.job_applicant:
        frappe.throw(_("This Job Offer has no linked Job Applicant."))

    if offer.get("email_status") != "Sent" and not offer.get("email_sent_on"):
        frappe.throw(
            _("The welcome email has not been sent for this offer yet. Use 'Send Job Offer' first.")
        )

    applicant = frappe.get_doc("Job Applicant", offer.job_applicant)
    email = (offer.get("applicant_email") or applicant.get("email_id") or "").strip()
    if not email:
        frappe.throw(_("The candidate has no email address."))
    if not validate_email_address(email, throw=False):
        frappe.throw(_("The candidate's email address is invalid: {0}").format(email))

    template_name = frappe.db.get_single_value("Recruitment Settings", "job_offer_template")
    if not template_name:
        frappe.throw(
            _("No welcome email template configured. Set 'Job Offer Template' in Recruitment Settings.")
        )

    context = _job_offer_email_context(offer, applicant)
    subject_t = frappe.db.get_value("Email Template", template_name, "subject") or ""
    message_t = frappe.db.get_value("Email Template", template_name, "response_html") or ""
    subject = frappe.render_template(subject_t, context)
    message = frappe.render_template(message_t, context)

    # The Culture Book rides along when one is configured; None when it isn't, so
    # the re-send carries exactly what the original send did.
    culture_book = get_culture_book_attachment()

    frappe.sendmail(
        recipients=[email],
        subject=subject,
        message=message,
        attachments=[culture_book] if culture_book else None,
        reference_doctype="Job Offer",
        reference_name=offer.name,
        args=context,
        now=True,
    )

    return {"status": "ok", "email": email}


@frappe.whitelist()
def create_job_offer_for_applicant(job_applicant):
	"""Create a single Job Offer from a Job Applicant (used by the Offer stage of
	the hiring-workflow flow). Idempotent: returns the existing offer if one is
	already open."""
	frappe.has_permission("Job Offer", "create", throw=True)

	applicant = frappe.db.get_value(
		"Job Applicant",
		job_applicant,
		["name", "applicant_name", "email_id", "designation", "custom_expected_doj", "phone_number", "custom_employment_type"],
		as_dict=True,
	)
	if not applicant:
		frappe.throw(_("Job Applicant {0} not found.").format(job_applicant))

	existing = frappe.db.exists(
		"Job Offer", {"job_applicant": applicant.name, "docstatus": ["!=", 2]}
	)
	if existing:
		return {"job_offer": existing, "already_existed": True}

	job_offer = frappe.new_doc("Job Offer")
	job_offer.job_applicant = applicant.name
	job_offer.applicant_name = applicant.applicant_name
	job_offer.applicant_email = applicant.email_id
	job_offer.designation = applicant.designation
	job_offer.custom_expected_doj = applicant.custom_expected_doj
	job_offer.custom_phone_number = applicant.phone_number
	job_offer.custom_employment_type = applicant.custom_employment_type
	job_offer.offer_date = frappe.utils.today()
	job_offer.insert(ignore_permissions=True)
	_mark_offer_stage(applicant.name, SUB_STATUS_TO_SEND)

	return {"job_offer": job_offer.name, "already_existed": False}



# The candidate is at the OFFER stage once an offer exists — not back at "Open",
# which is what a brand-new application looks like and is how offered candidates
# went missing from every "who is still in play" view. "Hired" is that stage; the
# sub-status says how far the offer itself has got, and the candidate's own reply
# moves them on to "Accepted" (advance_on_job_offer_outcome).
OFFER_STATUS = "Hired"
SUB_STATUS_TO_SEND = "Offer To Be Sent"
SUB_STATUS_SENT = "Offer Sent"


def _mark_offer_stage(applicant, sub_status):
    """Put the candidate at the offer stage, without disturbing a decided one."""
    from recruitment.api.hiring_stage import _ensure_sub_status_option

    current = frappe.db.get_value("Job Applicant", applicant, "status")
    if current in ("Accepted", "Rejected"):
        # Already decided — an offer email going out again must not reopen them.
        return
    _ensure_sub_status_option(OFFER_STATUS, sub_status)
    frappe.db.set_value("Job Applicant", applicant,
                        {"status": OFFER_STATUS, "custom_substatus": sub_status},
                        update_modified=False)


@frappe.whitelist()
def create_bulk_job_offer(applicants):
    # Creates Job Offers (was ignore_permissions with no role gate). Require
    # Job Offer create — the desk HR caller already has it.
    frappe.has_permission("Job Offer", "create", throw=True)

    # Convert string to list if required
    if isinstance(applicants, str):
        applicants = json.loads(applicants)

    created = 0
    skipped = 0
    failed = 0

    for app in applicants:

        try:

            applicant = frappe.db.get_value(
                "Job Applicant",
                app,
                ["name", "applicant_name", "email_id", "designation", "custom_expected_doj", "phone_number", "custom_employment_type"],
                as_dict=True
            )

            existing_offer = frappe.db.exists(
                "Job Offer",
                {"job_applicant": applicant.name, "docstatus": ["!=", 2]}
            )

            if existing_offer:
                skipped += 1
                continue

            job_offer = frappe.new_doc("Job Offer")

            job_offer.job_applicant = applicant.name
            job_offer.applicant_name = applicant.applicant_name
            job_offer.applicant_email = applicant.email_id
            job_offer.designation = applicant.designation
            job_offer.custom_expected_doj = applicant.custom_expected_doj
            job_offer.custom_phone_number = applicant.phone_number
            job_offer.custom_employment_type = applicant.custom_employment_type

            job_offer.offer_date = frappe.utils.today()

            job_offer.insert(ignore_permissions=True)
            _mark_offer_stage(applicant.name, SUB_STATUS_TO_SEND)

            created += 1

        except Exception:
            failed += 1
            frappe.log_error(frappe.get_traceback(), "Bulk Job Offer Creation")

    return {
        "created": created,
        "skipped": skipped,
        "failed": failed
    }

@frappe.whitelist()
def send_bulk_job_offer(job_offers):
    # Sends offer emails + flips applicant status. Require Job Offer write.
    frappe.has_permission("Job Offer", "write", throw=True)

    if isinstance(job_offers, str):
        job_offers = json.loads(job_offers)

    sent = 0
    skipped = 0
    failed = 0

    settings = frappe.get_doc("Recruitment Settings")
    JOB_OFFER_TEMPLATE = settings.job_offer_template

    if not JOB_OFFER_TEMPLATE:
        frappe.throw("Job Offer Email Template not set in Recruitment Settings")

    for jo in job_offers:

        try:

            job_offer = frappe.get_doc("Job Offer", jo)

            # Only allow submitted job offers
            if job_offer.docstatus != 1:
                skipped += 1
                continue

            if not job_offer.job_applicant:
                failed += 1
                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": "Missing Job Applicant"
                })
                continue

            applicant = frappe.get_doc("Job Applicant", job_offer.job_applicant)

            if applicant.status in ["Accepted", "Rejected"]:
                skipped += 1
                continue

            email = applicant.email_id

            if not email:
                failed += 1
                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": "Missing Email ID"
                })
                continue

            if not validate_email_address(email, throw=False):
                failed += 1
                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": "Invalid Email Format"
                })
                continue

            # ----------------------------
            # Dynamic Context
            # ----------------------------
            email_context = _job_offer_email_context(job_offer, applicant)

            # ----------------------------
            # Render Template
            # ----------------------------
            subject_template = frappe.db.get_value("Email Template", JOB_OFFER_TEMPLATE, "subject")
            message_template = frappe.db.get_value("Email Template", JOB_OFFER_TEMPLATE, "response_html")

            subject = frappe.render_template(subject_template, email_context)
            message = frappe.render_template(message_template, email_context)

            # ----------------------------
            # Attach Document-Template PDF (only when the offer Document
            # Template feature is enabled and one resolves for this offer).
            # Bulk offers otherwise remain link-only, as before.
            # ----------------------------
            attachments = None
            template_name = get_job_offer_document_template(job_offer)
            if template_name:
                pdf_bytes, filename = render_job_offer_via_document_template(
                    job_offer, template_name
                )
                if pdf_bytes:
                    attachments = [{
                        "fname": filename,
                        "fcontent": pdf_bytes,
                        "content_type": "application/pdf",
                    }]

            # Culture Book (Recruitment Settings -> culture_book), appended after
            # the letter so the offer stays the first attachment. None when the
            # setting is blank or the file cannot be read, in which case the email
            # goes out exactly as it did before the feature existed.
            culture_book = get_culture_book_attachment()
            if culture_book:
                attachments = (attachments or []) + [culture_book]

            # ----------------------------
            # Send Email
            # ----------------------------
            try:
                frappe.sendmail(
                    recipients=[email],
                    subject=subject,
                    message=message,
                    attachments=attachments,
                    reference_doctype="Job Offer",
                    reference_name=job_offer.name,
                    args=email_context,
                    now=True
                )
            except Exception as mail_error:
                failed += 1
                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": f"Send Failed: {str(mail_error)}"
                })
                frappe.log_error(frappe.get_traceback(), "Email Send Failure")
                continue

            # ----------------------------
            # Email Queue Check
            # ----------------------------
            email_queue = frappe.get_all(
                "Email Queue",
                filters={
                    "reference_doctype": "Job Offer",
                    "reference_name": job_offer.name
                },
                fields=["status"],
                order_by="creation desc",
                limit=1
            )

            queue_status = email_queue[0].status if email_queue else None

            if queue_status == "Error":
                failed += 1
                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": "Email Queue Failed"
                })
                continue

            # ----------------------------
            # Update Job Offer
            # ----------------------------
            job_offer.db_set({
                "email_status": "Sent",
                "email_error": "",
                "email_sent_on": now()
            })

            # ----------------------------
            # Create Communication Log
            # ----------------------------
            communication_doc = frappe.new_doc("Communication")
            communication_doc.subject = subject
            communication_doc.content = message
            communication_doc.reference_doctype = "Job Offer"
            communication_doc.reference_name = job_offer.name
            communication_doc.recipients = email + ","
            communication_doc.save(ignore_permissions=True)

            # ----------------------------
            # Update Applicant
            # ----------------------------
            _mark_offer_stage(applicant.name, SUB_STATUS_SENT)

            sent += 1

        except Exception as e:
            failed += 1

            frappe.db.set_value("Job Offer", jo, {
                "email_status": "Failed",
                "email_error": str(e)
            })

            frappe.log_error(frappe.get_traceback(), "Bulk Job Offer Email Error")

    return {
        "sent": sent,
        "skipped": skipped,
        "failed": failed
    }


def check_email_bounce():
    communications = frappe.get_all(
        "Communication",
        filters={
            "communication_medium": "Email",
            "sent_or_received": "Received"
        },
        fields=["name", "reference_doctype", "reference_name", "subject", "content", "text_content"],
        order_by="creation desc",
        limit=50
    )

    for comm in communications:

        if comm.reference_doctype != "Job Offer" or not comm.reference_name:
            continue

        content = ((comm.content or "") + " " + (comm.text_content or "")).lower()

        if any(keyword in content for keyword in [
            "failed",
            "undelivered",
            "bounce",
            "address not found",
            "does not exist",
            "550 5.1.1",
            "no such user",
            "mail delivery subsystem"
        ]):

            frappe.db.set_value("Job Offer", comm.reference_name, {
                "email_status": "Failed",
                "email_error": "Email bounced (delivery failed)"
            })

def sync_applicant_status(doc, method):

    if not doc.job_applicant:
        return

    if doc.status not in ["Accepted", "Rejected", "Cancelled"]:
        return

    status_map = {
        "Accepted": "Accepted",
        "Rejected": "Rejected",
        "Cancelled": "Hold"
    }

    frappe.db.set_value(
        "Job Applicant",
        doc.job_applicant,
        "status",
        status_map.get(doc.status)
    )