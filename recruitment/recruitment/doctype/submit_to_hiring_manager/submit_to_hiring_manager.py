# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SubmitToHiringManager(Document):
	def validate(self):
		all_approved = True
		all_rejected = True

		# Replace 'child_table_name' with your actual child table field name
		for row in self.shortlisted_candidate:
			if row.status == 'Pending':
				all_approved = False
		
		if all_approved:
			self.is_approvable = 1
		else:
			self.is_approvable = 0

@frappe.whitelist()
def generate_job_applicant(docname):
	jo_doc = frappe.get_doc("Submit To Hiring Manager",docname).as_dict()
	job_app = 0
	for can in jo_doc["shortlisted_candidate"]:
		if can.status=="Select" or can.status=="Selected":
			if not frappe.db.exists("Job Applicant", {"applicant_name":can.first_name,"email_id":can.email_id}, cache=True):
				new_ja = frappe.new_doc("Job Applicant")
				new_ja.applicant_name=can.first_name
				new_ja.custom_applicant_last_name_ = can.last_name
				new_ja.email_id = can.email_id
				new_ja.job_title = jo_doc.job_opening
				new_ja.status="Open"
				new_ja.custom_shortlisted_by_hiring_manager="Yes"
				new_ja.resume_attachment = can.resume
				new_ja.custom_recruiter=jo_doc.owner
				new_ja.custom_recruit__hiring_manager=jo_doc.assigned_to
				if can.custom_current_company:
					new_ja.custom_current_employer = can.custom_current_company
				if can.custom_notice_period:
					new_ja.custom_notice_period_in_days = can.custom_notice_period
				new_ja.save()
				job_app+=1
	if job_app>0:
		frappe.msgprint("Job Applicants Created Successfully!")
	else:
		frappe.msgprint("Job Applicants has been already created!")

@frappe.whitelist()
def get_hiring_managers():
    hiring_managers = frappe.db.sql("""
        SELECT
            DISTINCT tabUser.name
        FROM
            `tabHas Role`
        JOIN
            `tabUser` ON `tabHas Role`.parent = `tabUser`.name
        WHERE
            `tabHas Role`.role = 'Hiring Manager'
            AND `tabUser`.enabled = 1
    """, as_list=True)
    
    # Flatten the list of lists to a single list of user names
    hiring_managers = [user[0] for user in hiring_managers]
    
    return hiring_managers

