import frappe

def get_context(context):
	# do your magic here
	pass

@frappe.whitelist(allow_guest=True)
def update_status_from_web(docname, status):
    if not docname or not status:
        frappe.throw("Invalid request.")

    doc = frappe.get_doc("Internship Letter", docname)

    # Prevent multiple actions
    if doc.status in ["Accepted", "Rejected"]:
        frappe.throw("Action already taken.")

    if status not in ["Accepted", "Rejected"]:
        frappe.throw("Invalid status.")

    doc.status = status
    doc.save(ignore_permissions=True)

    frappe.db.commit()

@frappe.whitelist(allow_guest=True)
def get_internship_offer(docname):
    if not docname:
        frappe.throw("Invalid request")

    doc = frappe.get_doc("Internship Letter", docname)

    return {
        "name": doc.name,
        "job_applicant": doc.job_applicant,
        "status": doc.status,
        "name_of_the_intern": doc.name_of_the_intern,
        "name_of_the_college": doc.name_of_the_college,
        "internship_letter_date": doc.internship_letter_date,
        "address_of_the_college__residential_address": doc.address_of_the_college__residential_address,
        "enrolment_no": doc.enrolment_no,
        "position_title": doc.position_title,
        "company": doc.company,
        "department": doc.department,
        "start_date": doc.start_date,
        "end_date": doc.end_date,
        "stipend": doc.stipend,
        "office_location": doc.office_location,
        "reporting_to": doc.reporting_to,
        "reporting_name": doc.reporting_name,
        "reporting_designation": doc.reporting_designation
    }
