import frappe
import json
from frappe.utils import now, get_url, validate_email_address

@frappe.whitelist()
def create_bulk_job_offer(applicants):

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
                ["name", "applicant_name", "email_id", "designation", "custom_expected_doj", "phone_number"],
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

            job_offer.offer_date = frappe.utils.today()

            job_offer.insert(ignore_permissions=True)
            frappe.db.set_value("Job Applicant", applicant.name, "status", "Offer to be Sent")

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
            site_url = get_url()
            offer_url = f"{site_url}/job_offer?appl={applicant.name}"
            first_name = (job_offer.applicant_name or "Candidate").split(" ")[0]

            email_context = {
                "first_name": first_name,
                "offer_url": offer_url
            }

            # ----------------------------
            # Render Template
            # ----------------------------
            subject_template = frappe.db.get_value("Email Template", JOB_OFFER_TEMPLATE, "subject")
            message_template = frappe.db.get_value("Email Template", JOB_OFFER_TEMPLATE, "response_html")

            subject = frappe.render_template(subject_template, email_context)
            message = frappe.render_template(message_template, email_context)

            # ----------------------------
            # Send Email
            # ----------------------------
            try:
                frappe.sendmail(
                    recipients=[email],
                    subject=subject,
                    message=message,
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
            applicant.flags.ignore_notify = True
            applicant.status = "Offered"
            applicant.save(ignore_permissions=True)

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