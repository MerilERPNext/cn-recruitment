import frappe

from recruitment.api.candidate_auth import (
    candidate_required,
    get_current_candidate,
)

APPLICANT_DOCTYPE = "Job Applicant"

# NOTE: The application save / draft endpoints now live in a single place —
# recruitment.api.channels.careers:
#   submit_application, get_draft, delete_draft, get_applied_jobs
# Only `get_job_applicant` (fetch one applicant by name, identity-checked)
# remains here.


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": None}


@candidate_required
def get_job_applicant(job_applicant):
    if not job_applicant:
        return _err("job_applicant is required.", 400)

    applicant_name = job_applicant.strip()

    if not frappe.db.exists(APPLICANT_DOCTYPE, applicant_name):
        return _ok("No Job Applicant found.", {})

    doc = frappe.get_doc(APPLICANT_DOCTYPE, applicant_name)

    session_email = (get_current_candidate() or "").lower()
    if (doc.email_id or "").lower() != session_email:
        frappe.local.response["http_status_code"] = 403
        return _err("Not allowed to access this Job Applicant.", 403)

    return _ok("Job Applicant fetched.", doc.as_dict(convert_dates_to_str=True))
