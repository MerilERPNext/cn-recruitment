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
    interview_feedback_records=[]
    interview_feedbacks = frappe.get_all("Interview Feedback", filters={"interview": interview_id}, pluck="name")
    for interview_feedback in interview_feedbacks:
        feedback_doc=frappe.get_doc("Interview Feedback", interview_feedback)
        interview_feedback_records.append({
            "interviewer": feedback_doc.interviewer,
            "feedback": feedback_doc.feedback,
            "result": feedback_doc.result,
            "creation": feedback_doc.creation
        })
    return interview_feedback_records
        