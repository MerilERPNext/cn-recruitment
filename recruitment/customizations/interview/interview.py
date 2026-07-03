import frappe


@frappe.whitelist()
def generate_travel_request(interview_id):
    in_doc = frappe.get_doc("Interview", interview_id).as_dict()
    tr_doc = frappe.new_doc("Travel Request")

    tr_doc.travel_type = "Domestic"
    tr_doc.travel_funding = "Fully Sponsored"
    tr_doc.purpose_of_travel = "Interview"

    emp_id = None
    cur_user = frappe.session.user

    emp_id = frappe.db.get_value("Employee", {"user_id": cur_user})
    interviewers = []

    for inter in in_doc.interview_details:
        interviewers.append(
            frappe.db.get_value(
                "Employee", {"user_id": inter.interviewer}, ["employee_name"]
            )
        )
    description = (
        "Applicant Name: "
        + str(
            frappe.db.get_value("Job Applicant", in_doc.job_applicant, "applicant_name")
        )
        + "\nInterview Date: "
        + str(in_doc.scheduled_on)
        + "\nCreated By: "
        + frappe.db.get_value(
            "Employee",
            {"user_id": cur_user},
            ["employee_name"],
        )
    )
    tr_doc.description = description
    if emp_id:
        tr_doc.employee = emp_id
        tr_doc.save()
        frappe.msgprint("Travel Request Created Succefully!")
    else:
        frappe.msgprint("User Administrator can't create travel request")


@frappe.whitelist()
def share_job_opening(docname):
    inter_doc = frappe.get_doc("Interview",docname)
    for inter in inter_doc.interview_details:
        if not frappe.db.exists("DocShare", {"user": inter.interviewer,"share_doctype":"Job Opening","share_name":inter_doc.job_opening}):
            DocShare = frappe.new_doc("DocShare")
            DocShare.user = inter.interviewer
            DocShare.share_doctype = "Job Opening"
            DocShare.share_name = inter_doc.job_opening
            DocShare.read = 1
            DocShare.notify_by_email = 1
            DocShare.save()

@frappe.whitelist()
def check_feedback_of_previous_interview(self, method):
    interviews = frappe.get_all("Interview", filters={"job_applicant": self.job_applicant}, pluck="name")    
    for interview in interviews:
        interview_doc = frappe.get_doc("Interview", interview)        
        for interviewer in interview_doc.interview_details:
            if not frappe.db.exists("Interview Feedback", {"interviewer": interviewer.interviewer,"job_applicant":self.job_applicant}):
                pass
                # frappe.throw(
                #     f"Please provide feedback for Interview: {frappe.utils.get_link_to_form('Interview', interview)} by {interviewer.interviewer}"
                # )

@frappe.whitelist()
def get_interview_feedback_records(interview_id):
    interview_feedback_records = []
    
    # Fetch submitted feedbacks
    interview_feedbacks = frappe.get_all("Interview Feedback", filters={"interview": interview_id}, pluck="name")
    for interview_feedback in interview_feedbacks:
        feedback_doc = frappe.get_doc("Interview Feedback", interview_feedback)
        interview_feedback_records.append({
            "interviewer": feedback_doc.interviewer,
            "feedback": feedback_doc.feedback,
            "result": feedback_doc.result,
            "creation": feedback_doc.creation
        })
    
    # If no feedback records found, fetch interviewers and mark them as pending
    if not interview_feedback_records:
        interview = frappe.get_doc("Interview", interview_id)
        assigned_interviewers = [
            row.custom_full_name for row in interview.interview_details
        ]
        for interviewer_name in assigned_interviewers:
            interview_feedback_records.append({
                "interviewer": interviewer_name,
                "feedback": "Pending",
                "result": "Pending",
                "creation": "N/A"
            })
    
    return interview_feedback_records


def reset_follow_up_on_verdict(self, method):
    """Clear the applicant's follow-up dropdown once a round reaches a verdict.

    Fires on Interview ``on_update`` / ``on_update_after_submit``. When an
    Interview transitions into ``"Cleared"`` or ``"Rejected"``, the linked Job
    Applicant's ``Follow-up Interview Needed?`` dropdown
    (``custom_follow_up_interview_needed``) is reset to blank so HR can decide
    again (after a Cleared round) or is left locked out (after a Rejected one).

    Only the *transition* into a verdict is acted on — re-saving an already
    Cleared interview must not wipe a decision HR has made in the meantime.

    :param self: the Interview document being saved.
    :param method: the doc-event name (unused).
    """
    if self.status not in ("Cleared", "Rejected"):
        return
    if not self.job_applicant:
        return

    before = self.get_doc_before_save()
    if before and before.get("status") == self.status:
        # Status did not change into a verdict on this save.
        return

    current = frappe.db.get_value(
        "Job Applicant", self.job_applicant, "custom_follow_up_interview_needed"
    )
    if current:
        frappe.db.set_value(
            "Job Applicant",
            self.job_applicant,
            "custom_follow_up_interview_needed",
            "",
        )

        