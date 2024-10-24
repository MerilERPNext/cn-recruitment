import frappe
from frappe.model.mapper import get_mapped_doc

@frappe.whitelist()
def make_job_opening(source_name, target_doc=None):
	def set_missing_values(source, target):
		target.job_title = source.designation
		target.status = "Open"
		target.currency = frappe.db.get_value("Company", source.company, "default_currency")
		target.lower_range = source.expected_compensation
		target.description = source.description

	return get_mapped_doc(
		"Job Requisition",
		source_name,
		{
			"Job Requisition": {
				"doctype": "Job Opening",
			},
			"field_map": {
				"designation": "designation",
				"name": "job_requisition",
				"department": "department",
				"custom_preffered_companies":"custom_preffered_company",
				"custom_location":"custom_location",
				"custom_shortlist_by_hiring_manager":"custom_shortlisted_by_hiring_manager",
			},
			"Candidate List": {
				"doctype": "Candidate List",
			},
			"field_map": {
				"*": "*"
			},
			"Qualifications": {
				"doctype": "Qualifications",
			},
			"field_map": {
				"*": "*"
			},
		},
		
		target_doc,
		set_missing_values,
	)

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

@frappe.whitelist()
def assign_task(reference_doctype, reference_name, assign_to, description=""):
	existing_todo = frappe.get_all('ToDo', filters={
        'reference_type': reference_doctype,
        'reference_name': reference_name,
        'status': 'Open'
    })
	for todo in existing_todo:
		frappe.delete_doc('ToDo', todo.name, ignore_permissions=True)
	todo = frappe.get_doc({
        'doctype': 'ToDo',
        'allocated_to': assign_to,
        'reference_type': reference_doctype,
        'reference_name': reference_name,
        'description': description,
        'status': 'Open',
        'priority': 'Medium'
    })
	todo.insert(ignore_permissions=True)
	frappe.db.commit()


