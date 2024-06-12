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
	if len(interviewers)>0:
		description = description+ "\nInterviewer Name: "
        + ", ".join(interviewers)
	tr_doc.description = description
    if emp_id:
        tr_doc.employee = emp_id
        tr_doc.save()
        frappe.msgprint("Travel Request Created Succefully!")
