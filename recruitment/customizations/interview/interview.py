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
        
        if not frappe.db.exists("DocShare", {"user": inter.interviewer,"share_doctype":"Interview","share_name":docname}):
            intDocShare = frappe.new_doc("DocShare")
            intDocShare.user = inter.interviewer
            intDocShare.share_doctype = "Interview"
            intDocShare.share_name = docname
            intDocShare.read = 1
            intDocShare.notify_by_email = 1
            intDocShare.save()

@frappe.whitelist()
def share_job_applicants(docname):
    frappe.set_user("Administrator")
    inter_doc = frappe.get_doc("Interview",docname)
    for inter in inter_doc.interview_details:
        user = frappe.get_doc("User", inter.interviewer)
        if not any(role.role == "Interviewer" for role in user.get("roles")):
            user.append("roles", {
                "role": "Interviewer"
            })
            user.save()
            frappe.db.commit()
        if not frappe.db.exists("User Permission", {"user": inter.interviewer,"allow":"Interview","for_value":docname}):
            DocShare = frappe.new_doc("User Permission")
            DocShare.user = inter.interviewer
            DocShare.allow = "Interview"
            DocShare.for_value = docname
            DocShare.apply_to_all_doctypes = 0
            DocShare.save()
