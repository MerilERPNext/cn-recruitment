import frappe
import json

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
                ["name", "applicant_name", "email_id", "designation", "custom_expected_doj"],
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

            job_offer.offer_date = frappe.utils.today()

            job_offer.insert(ignore_permissions=True)
            job_offer.submit()

            created += 1

        except Exception:
            failed += 1
            frappe.log_error(frappe.get_traceback(), "Bulk Job Offer Creation")

    return {
        "created": created,
        "skipped": skipped,
        "failed": failed
    }


# @frappe.whitelist()
# def send_bulk_job_offer(job_offers):

#     if isinstance(job_offers, str):
#         job_offers = json.loads(job_offers)

#     sent = 0
#     skipped = 0
#     failed = 0

#     for jo in job_offers:

#         try:

#             job_offer = frappe.get_doc("Job Offer", jo)

#             if job_offer.docstatus != 1:
#                 skipped += 1
#                 continue

#             if not job_offer.job_applicant:
#                 failed += 1
#                 continue

#             applicant = frappe.get_doc("Job Applicant", job_offer.job_applicant)

#             if applicant.status in ["Approvals", "Accepted", "Rejected"]:
#                 skipped += 1
#                 continue

#             email = applicant.email_id

#             if not email:
#                 failed += 1
#                 continue

#             site_url = frappe.utils.get_url()
#             offer_url = f"{site_url}/job_offer?appl={applicant.name}"

#             message = f"""
#             <p>Dear {job_offer.applicant_name or ""},</p>
#             <p>Your Job Offer has been issued.</p>
#             <p><a href="{offer_url}">View Job Offer</a></p>
#             """

#             frappe.enqueue(
#                 method=frappe.sendmail,
#                 recipients=[email],
#                 subject="Job Offer",
#                 message=message,
#                 reference_doctype="Job Offer",
#                 reference_name=job_offer.name
#             )

#             applicant.status = "Approvals"
#             applicant.custom_substatus = "Offer Sent"
#             applicant.save(ignore_permissions=True)

#             sent += 1

#         except Exception:

#             failed += 1
#             frappe.log_error(frappe.get_traceback(), "Bulk Job Offer Email Error")

#     return {
#         "sent": sent,
#         "skipped": skipped,
#         "failed": failed
#     }

@frappe.whitelist()
def send_bulk_job_offer(job_offers):

    if isinstance(job_offers, str):
        job_offers = json.loads(job_offers)

    sent = 0
    skipped = 0
    failed = 0

    for jo in job_offers:

        try:

            job_offer = frappe.get_doc("Job Offer", jo)

            # Only allow submitted job offers
            if job_offer.docstatus != 1:
                skipped += 1
                continue

            if not job_offer.job_applicant:
                failed += 1
                continue

            applicant = frappe.get_doc("Job Applicant", job_offer.job_applicant)

            # Skip if offer already processed
            if applicant.status in ["Approvals", "Accepted", "Rejected"]:
                skipped += 1
                continue

            email = applicant.email_id

            if not email:
                failed += 1
                continue

            site_url = frappe.utils.get_url()
            offer_url = f"{site_url}/job_offer?appl={applicant.name}"

            # Extract first name
            first_name = (job_offer.applicant_name or "").split(" ")[0]

            subject = "Internship Offer Letter – HomeFirst Finance"

            message = f"""
<p>Dear {first_name},</p>

<p>
We are pleased to inform you that you have been selected for an internship with
HomeFirst Finance Company India Ltd.
</p>

<p>
Please find your offer letter attached. Kindly review the offer letter and click on the below link to accept the offer.
</p>

<p>
Link - <a href="{offer_url}">Click here to view your offer letter</a>
</p>

<p>
We look forward to welcoming you onboard and wish you a successful internship with us.
</p>

<br>

<p>
Warm regards,<br>
Team HR
</p>
"""

            frappe.enqueue(
                method=frappe.sendmail,
                recipients=[email],
                subject=subject,
                message=message,
                reference_doctype="Job Offer",
                reference_name=job_offer.name
            )

            # Update applicant status
            applicant.status = "Approvals"
            applicant.save(ignore_permissions=True)

            sent += 1

        except Exception:
            failed += 1
            frappe.log_error(frappe.get_traceback(), "Bulk Job Offer Email Error")

    return {
        "sent": sent,
        "skipped": skipped,
        "failed": failed
    }



def sync_applicant_status(doc, method):

    if not doc.job_applicant:
        return

    applicant = frappe.get_doc("Job Applicant", doc.job_applicant)

    if doc.status == "Accepted":
        applicant.status = "Accepted"

    elif doc.status == "Rejected":
        applicant.status = "Rejected"

    elif doc.status == "Cancelled":
        applicant.status = "Hold"

    applicant.save(ignore_permissions=True)