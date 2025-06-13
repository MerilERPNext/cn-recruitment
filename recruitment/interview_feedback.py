import frappe
from frappe import _

@frappe.whitelist(allow_guest=False)
def submit_interview_feedback(interview, interview_round, job_applicant, interviewer, result, custom_ctc=None, custom_bond=None):
    # Check for existing feedback
    existing = frappe.get_all("Interview Feedback", filters={
        "interview": interview,
        "interview_round": interview_round,
        "interviewer": interviewer
    })

    if existing:
        return {
            "status": "duplicate",
            "message": "Feedback already submitted for this round.",
            "existing_doc": existing[0].name
        }

    try:
        # Create and submit Interview Feedback
        doc = frappe.new_doc("Interview Feedback")
        doc.interview = interview
        doc.interview_round = interview_round
        doc.job_applicant = job_applicant
        doc.interviewer = interviewer
        doc.result = result
        doc.custom_ctc = custom_ctc
        doc.custom_bond = custom_bond

        doc.insert(ignore_permissions=True)
        doc.submit()

        return {
            "status": "success",
            "message": "Feedback submitted successfully",
            "docname": doc.name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Interview Feedback Submission Error")
        return {
            "status": "error",
            "message": f"Submission failed: {str(e)}"
        }

#recruitment.interview_feedback.submit_interview_feedback