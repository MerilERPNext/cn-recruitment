import frappe
from frappe import _
from frappe.utils import get_link_to_form 

def check_feedback_and_update_result(interview_feedback):
    # Fetch the Interview document
    interview = frappe.get_doc('Interview', interview_feedback.interview)
    
    interview_details = interview.get('interview_details')  # This retrieves the child table records
    
    # Fetch all feedback for the interview excluding 'Cancelled' status
    feedbacks = frappe.get_all('Interview Feedback', 
                                filters={'interview': interview_feedback.interview, 'docstatus': 1}, 
                                fields=['interviewer', 'result'])
    
    # Check if all interviewers have provided feedback (excluding cancelled)
    if len(feedbacks) < len(interview_details):
        # If not all feedbacks are received, exit without changing the status
        return

    # Count the number of "Cleared" and "Rejected" votes
    cleared_count = sum(1 for feedback in feedbacks if feedback.result == 'Cleared')
    rejected_count = sum(1 for feedback in feedbacks if feedback.result == 'Rejected')
    
    # Update the status directly on the Interview document
    if cleared_count > rejected_count:
        interview.status = 'Cleared'
    elif rejected_count > cleared_count:
        interview.status = 'Rejected'
    else:
        interview.status = 'Pending'

    # Save the updated status
    interview.save(ignore_permissions=True)

@frappe.whitelist()
def on_submit_feedback(doc, method):
    check_feedback_and_update_result(doc)


def auto_advance_stage(doc, method):
    """After feedback updates the Interview's verdict, let the Hiring Workflow
    auto-advance / reject the candidate (only for stages flagged ``auto``)."""
    from recruitment.api.hiring_stage import advance_on_interview_result

    advance_on_interview_result(doc.interview)


@frappe.whitelist()
def create_interview_feedback(data, interview_name, interviewer, job_applicant):
    import json

    if isinstance(data, str):
        data = frappe._dict(json.loads(data))

    # Check if the current user is the interviewer
    if frappe.session.user != interviewer:
        frappe.throw(_("Only Interviewers are allowed to submit Interview Feedback"))

    # Create a new Interview Feedback document
    interview_feedback = frappe.new_doc("Interview Feedback")
    interview_feedback.interview = interview_name
    interview_feedback.interviewer = interviewer
    interview_feedback.job_applicant = job_applicant

    # Append skill assessments
    for d in data.skill_set:
        d = frappe._dict(d)
        interview_feedback.append("skill_assessment", {"skill": d.skill, "rating": d.rating})

    # Combine recommended grade and feedback if provided
    if data.get("recommended_grade"):
        if data.get("feedback"):
            feedback_content = f"Recommended Grade: {data.recommended_grade}\nFeedback: {data.feedback}"
        else:
            feedback_content = f"Recommended Grade: {data.recommended_grade}"
    else:
        feedback_content = data.feedback or ""

    interview_feedback.feedback = feedback_content
    interview_feedback.result = data.result

    # Save and submit the document
    interview_feedback.save()
    interview_feedback.submit()

    # Notify the user of successful submission
    frappe.msgprint(
        _("Interview Feedback {0} submitted successfully").format(
            get_link_to_form("Interview Feedback", interview_feedback.name)
        )
    )


