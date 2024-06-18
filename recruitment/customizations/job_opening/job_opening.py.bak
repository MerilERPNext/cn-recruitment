import frappe


@frappe.whitelist()
def generate_job_applicant(docname):
	jo_doc = frappe.get_doc("Job Opening",docname).as_dict()
	for can in jo_doc["custom_shortlisted_by_hiring_manager"]:
		if can.status=="Approved":
			if not frappe.db.exists("Job Applicant", {"applicant_name":can.name_of_candidate,"email_id":can.email_id}, cache=True):
				new_ja = frappe.new_doc("Job Applicant")
				new_ja.applicant_name=can.name_of_candidate
				new_ja.email_id = can.email_id
				new_ja.job_title = docname
				new_ja.designation = jo_doc.designation
				new_ja.status="Open"
				new_ja.custom_shortlisted_by_hiring_manager="Yes"
				new_ja.resume_attachment = can.resume_attach
				new_ja.save()
	frappe.msgprint("Job Applicants Created Successfully!")
