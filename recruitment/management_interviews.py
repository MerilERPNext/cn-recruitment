import frappe
from frappe import _
from frappe.utils import getdate, formatdate, format_time

@frappe.whitelist(allow_guest=True)
def get_pending_management_interviews():
    try:
        interviews = frappe.get_all(
            "Interview",
            filters={
                "status": "Pending",
                "interview_round": "Management Round",
            },
            fields=[
                "name",
                "scheduled_on",
                "from_time",
                "to_time",
                "interview_round",
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
                "interview_round": interview.interview_round,
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


@frappe.whitelist(allow_guest=True)
def get_job_applicant_details(applicant_id):
    """
    Fetch full job applicant details including completed interviews with interviewers and feedback.
    """
    if not applicant_id:
        frappe.throw(_("Applicant ID is required"))

    try:
        # Get full Job Applicant doc
        doc = frappe.get_doc("Job Applicant", applicant_id)
        doc_dict = doc.as_dict()

        # Fetch completed Interviews
        completed_interviews = frappe.get_all(
            "Interview",
            filters={
                "job_applicant": applicant_id,
                "status": "Cleared"
            },
            fields=["name", "scheduled_on", "status", "job_opening", "interview_round"]
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
