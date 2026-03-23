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

#             # Only allow submitted job offers
#             if job_offer.docstatus != 1:
#                 skipped += 1
#                 continue

#             if not job_offer.job_applicant:
#                 failed += 1
#                 continue

#             applicant = frappe.get_doc("Job Applicant", job_offer.job_applicant)

#             # Skip if offer already processed
#             if applicant.status in ["Offered", "Offer Accepted", "Offer Rejected"]:
#                 skipped += 1
#                 continue

#             email = applicant.email_id

#             if not email:
#                 failed += 1
#                 continue

#             site_url = frappe.utils.get_url()
#             offer_url = f"{site_url}/job_offer?appl={applicant.name}"

#             # Extract first name
#             first_name = (job_offer.applicant_name or "").split(" ")[0]

#             subject = "Internship Offer Letter – HomeFirst Finance"

#             message = f"""
# <p>Dear {first_name},</p>

# <p>
# We are pleased to inform you that you have been selected for an internship with
# HomeFirst Finance Company India Ltd.
# </p>

# <p>
# Please find your offer letter attached. Kindly review the offer letter and click on the below link to accept the offer.
# </p>

# <p>
# Link - <a href="{offer_url}">Click here to view your offer letter</a>
# </p>

# <p>
# We look forward to welcoming you onboard and wish you a successful internship with us.
# </p>

# <p>
# Warm regards,<br>
# Team HR
# </p>
# """

#             frappe.enqueue(
#                 method=frappe.sendmail,
#                 recipients=[email],
#                 subject=subject,
#                 message=message,
#                 reference_doctype="Job Offer",
#                 reference_name=job_offer.name
#             )

#             # Update applicant status
#             applicant.status = "Offered"
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

                job_offer.db_set({
                    "email_status": "Failed",
                    "email_error": "Missing Job Applicant"
                })

                continue

            applicant = frappe.get_doc("Job Applicant", job_offer.job_applicant)

            # Skip if offer already processed
            if applicant.status in ["Offered", "Accepted", "Rejected"]:
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

            site_url = frappe.utils.get_url()
            offer_url = f"{site_url}/job_offer?appl={applicant.name}"

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

            job_offer.db_set({
                "email_status": "Sent",
                "email_error": "",
                "email_sent_on": frappe.utils.now()
            })

            # Update applicant status
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




# def sync_applicant_status(doc, method):

#     if not doc.job_applicant:
#         return

#     applicant = frappe.get_doc("Job Applicant", doc.job_applicant)

#     if doc.status == "Accepted":
#         applicant.status = "Accepted"

#     elif doc.status == "Rejected":
#         applicant.status = "Rejected"

#     elif doc.status == "Cancelled":
#         applicant.status = "Hold"

#     applicant.save(ignore_permissions=True)


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