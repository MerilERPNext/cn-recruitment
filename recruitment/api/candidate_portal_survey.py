import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from recruitment.api.candidate_auth import candidate_required, get_current_candidate


ACTION_CENTER_URL = "/action-center"
JOB_OFFER_URL_TEMPLATE = "/job_offer?appl={applicant}"


@candidate_required
def get_post_login_route():
    """Tell the candidate portal where to land after login.

    - Survey enabled + not yet submitted → render the survey (frontend
      uses the returned Form.io schema, then calls `submit_survey`).
    - Survey enabled + already submitted → redirect to the job offer page.
    - Survey not enabled → redirect to the action center, which handles
      per-client routing (pre-offer form / job offer / onboarding).
    """
    applicant_name, opening_name = _resolve_candidate_application()
    if not applicant_name or not opening_name:
        return {"survey_required": False, "redirect_url": ACTION_CENTER_URL}

    opening = frappe.get_doc("Job Opening", opening_name)
    if not _is_survey_enabled(opening) or not opening.get("custom_recruitment_survey_form"):
        return {"survey_required": False, "redirect_url": ACTION_CENTER_URL}

    if frappe.db.exists("Recruitment Survey Response", {"job_applicant": applicant_name}):
        return {"survey_required": False, "redirect_url": _job_offer_url(applicant_name)}

    widget_name = opening.get("custom_recruitment_survey_form")
    widget = frappe.get_doc("Microapp Form Widget", widget_name)
    return {
        "survey_required": True,
        "form_name": widget_name,
        "form_schema": _parse_form_schema(widget.get("custom_form_data")),
        "job_applicant": applicant_name,
        "job_opening": opening_name,
    }


@candidate_required
def submit_survey(response):
    """Persist the candidate's survey response and return the job-offer URL.

    Idempotent — a repeat submission for the same applicant returns
    the job-offer redirect without creating a duplicate row.
    """
    applicant_name, opening_name = _resolve_candidate_application()
    if not applicant_name:
        frappe.throw(_("No job application is linked to your account."))
    if not opening_name:
        frappe.throw(_("No job opening is linked to your application."))

    opening = frappe.get_doc("Job Opening", opening_name)
    if not _is_survey_enabled(opening):
        frappe.throw(_("Recruitment survey is not enabled for this job opening."))

    if frappe.db.exists("Recruitment Survey Response", {"job_applicant": applicant_name}):
        return {"status": "success", "redirect_url": _job_offer_url(applicant_name)}

    doc = frappe.new_doc("Recruitment Survey Response")
    doc.job_applicant = applicant_name
    doc.candidate_email = get_current_candidate()
    doc.job_opening = opening_name
    doc.microapp_form_widget = opening.get("custom_recruitment_survey_form")
    doc.response_json = _serialize_response(response)
    doc.submitted_at = now_datetime()
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "redirect_url": _job_offer_url(applicant_name)}


def _resolve_candidate_application():
    """Return (job_applicant_name, job_opening_name) for the current candidate."""
    email = get_current_candidate()
    if not email:
        return None, None
    applicant_name = frappe.db.get_value("Candidate Portal User", email, "job_applicant")
    if not applicant_name:
        applicant_name = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
    if not applicant_name:
        return None, None
    opening_name = frappe.db.get_value("Job Applicant", applicant_name, "job_title")
    return applicant_name, opening_name


def _is_survey_enabled(opening):
    return (
        bool(cint(opening.get("custom_enable_recruitment_survey")))
        and bool(cint(opening.get("custom_recruitment_survey_mandatory_before_offer")))
    )


def _parse_form_schema(form_data):
    if not form_data:
        return None
    if isinstance(form_data, (dict, list)):
        return form_data
    try:
        return frappe.parse_json(form_data)
    except Exception:
        return form_data


def _serialize_response(response):
    if isinstance(response, str):
        return response
    return frappe.as_json(response)


def _job_offer_url(applicant_name):
    return JOB_OFFER_URL_TEMPLATE.format(applicant=applicant_name)
