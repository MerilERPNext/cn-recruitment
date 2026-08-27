import frappe
from frappe import _
from frappe.utils import getdate, formatdate, format_time

from recruitment.api.hiring_stage import get_interview_round_field

# The response key stays `interview_round` whatever HRMS calls the field, so the
# dashboard consuming this API does not have to know which version it is talking to.
ROUND_KEY = "interview_round"
MANAGEMENT_ROUND = "Management Round"


def _round_field(doctype="Interview"):
    """The fieldname holding the round on THIS HRMS version, or None.

    v15 calls it `interview_round`, v16 `interview_type`. Hardcoding either is
    worse than it looks: a site upgraded from v15 keeps the old *column* on
    `tabInterview` long after the field left the DocType, so a raw query against
    the old name does not error — it reads a column that is empty for every row
    and quietly returns nothing. Resolved from the meta instead.
    """
    return get_interview_round_field(doctype)

@frappe.whitelist()
def get_pending_management_interviews():
    if not frappe.has_permission("Interview", "read"):
        frappe.throw(_("Not permitted."), frappe.PermissionError)
    try:
        round_field = _round_field()
        if not round_field:
            # No round field on this version at all — nothing can be a Management
            # Round, so say so plainly rather than returning an unfiltered list.
            return {
                "status": "success",
                "message": "Fetched pending management interviews",
                "data": [],
            }

        interviews = frappe.get_all(
            "Interview",
            filters={
                "status": "Pending",
                round_field: MANAGEMENT_ROUND,
            },
            fields=[
                "name",
                "scheduled_on",
                "from_time",
                "to_time",
                round_field,
                "custom_resume_attachment",
                "custom_zoom_link",
                "job_applicant",
                "designation"
            ],
            order_by="scheduled_on asc"
        )

        result = []
        for interview in interviews:
            scheduled_str = f"{formatdate(interview.scheduled_on)}"
            if interview.from_time and interview.to_time:
                scheduled_str += f" ({format_time(interview.from_time)} - {format_time(interview.to_time)})"

            interview_data = {
                "interview_id": interview.name,
                "scheduled_on": scheduled_str,
                ROUND_KEY: interview.get(round_field),
                "resume_link": frappe.utils.get_url(interview.custom_resume_attachment) if interview.custom_resume_attachment else None,
                "zoom_link": interview.custom_zoom_link,
                "job_applicant": interview.job_applicant,
                "applicant_name": frappe.db.get_value("Job Applicant", interview.job_applicant, "applicant_name"),
                "designation": interview.designation,
                "interviewers": []
            }

            interviewers = frappe.get_all(
                "Interview Detail",
                filters={"parent": interview.name},
                fields=["custom_full_name", "interviewer"]
            )

            for person in interviewers:
                interview_data["interviewers"].append({
                    "full_name": person.custom_full_name,
                    "email": person.interviewer
                })

            result.append(interview_data)

        return {
            "status": "success",
            "message": "Fetched pending management interviews",
            "data": result
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Interview Dashboard API Error")
        return {
            "status": "error",
            "message": "Something went wrong while fetching interview data.",
            "error": str(e)
        }


@frappe.whitelist()
def get_job_applicant_details(applicant_id):
    """
    Fetch full job applicant details including completed interviews with interviewers and feedback.
    """
    if not applicant_id:
        frappe.throw(_("Applicant ID is required"))

    if not frappe.has_permission("Job Applicant", "read", doc=applicant_id):
        frappe.throw(_("Not permitted."), frappe.PermissionError)

    try:
        # Get full Job Applicant doc
        doc = frappe.get_doc("Job Applicant", applicant_id)
        doc_dict = doc.as_dict()

        # Fetch completed Interviews
        round_field = _round_field()
        completed_interviews = frappe.get_all(
            "Interview",
            filters={
                "job_applicant": applicant_id,
                "status": "Cleared"
            },
            fields=["name", "scheduled_on", "status", "job_opening"]
            + ([round_field] if round_field else [])
        )
        for interview in completed_interviews:
            interview_name = interview["name"]

            # Fetch interviewers from child table (assumed "Interview Details")
            interviewers = frappe.get_all(
                "Interview Detail",  # replace with actual child doctype name if different
                filters={
                    "parent": interview_name,
                    "parenttype": "Interview"
                },
                fields=["interviewer"]  # or use correct field names
            )

            # Fetch feedback for this interview
            feedback = frappe.get_all(
                "Interview Feedback",
                filters={
                    "interview": interview_name,
                },
                fields=["interviewer", "average_rating", "feedback"]
            )

            # Republish the round under the stable key the dashboard expects.
            if round_field:
                interview[ROUND_KEY] = interview.get(round_field)
            interview["interviewers"] = interviewers
            interview["feedback"] = feedback

        # Add to response
        doc_dict["interview_details"] = completed_interviews
        return {
            "message": {
                "status": "success",
                "data": doc_dict
            }
        }
    except Exception as e:
        return {
            "message": {
                "status": "error",
                "message": f"An unexpected error occurred: {str(e)}"
            }
        }
