import frappe


@frappe.whitelist()
def generate_job_opening(job_requisition):
	jr_doc = frappe.get_doc("Job Requisition",job_requisition).as_dict()
	job_title = None
	if not frappe.db.exists("Job Opening", {"job_requisition":job_requisition}, cache=True):
		new_jo = frappe.new_doc("Job Opening")
		new_jo.job_title = jr_doc.designation
		new_jo.designation = jr_doc.designation
		new_jo.company=jr_doc.company
		new_jo.description = jr_doc.description
		new_jo.closes_on = jr_doc.expected_by
		new_jo.publish=1
		new_jo.job_requisition=job_requisition
		for qu in jr_doc.custom_qualifications:
			row = new_jo.append('custom_qualifications', {})
			row.schooluniversity = qu.schooluniversity
			row.qualification = qu.qualification
			row.level = qu.level
			row.year_of_passing = qu.year_of_passing
		for shm in jr_doc.custom_shortlist_by_hiring_manager:
			row = new_jo.append('custom_shortlisted_by_hiring_manager', {})
			row.name_of_candidate = shm.name_of_candidate
			row.email_id = shm.email_id
			row.domain = shm.domain
			row.current_salary = shm.current_salary
			row.location = shm.location
			row.remark = shm.remark
			row.resume_attach = shm.resume_attach
			row.status = shm.status
		new_jo.save()
		frappe.msgprint("Job Opening Created Successfully!")
		job_title =  new_jo.name
	for can in jr_doc["custom_shortlist_by_hiring_manager"]:
		if can.status=="Approved":
			if not frappe.db.exists("Job Applicant", {"applicant_name":can.name_of_candidate,"email_id":can.email_id}, cache=True):
				new_ja = frappe.new_doc("Job Applicant")
				new_ja.applicant_name=can.name_of_candidate
				new_ja.email_id = can.email_id
				if job_title:
					new_ja.job_title = job_title
				else:
					new_ja.job_title=frappe.db.get_value("Job Opening",{"job_requisition":job_requisition},["name"])
				new_ja.designation = jr_doc.designation
				new_ja.status="Open"
				new_ja.custom_shortlisted_by_hiring_manager="Yes"
				new_ja.resume_attachment = can.resume_attach
				new_ja.save()
	frappe.msgprint("Job Applicants Created Successfully!")
