import frappe

@frappe.whitelist(allow_guest=True)
def job_offer_update(status,appl):
	jo_id = frappe.db.get_value("Job Offer",{"job_applicant":appl})
	settings = frappe.get_doc("Recruitment Settings")
	frappe.db.set_value('Job Offer',jo_id, {'status': status,'docstatus':1})
	job_applicant=frappe.db.get_value("Job Offer",jo_id,"job_applicant")
	frappe.db.set_value("Job Applicant",job_applicant,"status",status)
	return {"jo_id":jo_id,"webform":settings.employee_onboarding_webform}

@frappe.whitelist()
def send_job_offer(job_offer_url,candidate,mail_id):
	email_context={"canditate":candidate,"job_offer_url":job_offer_url}
	settings =  frappe.get_doc("Recruitment Settings")
	job_offer_temp = settings.job_offer_template
	frappe.sendmail(
		recipients=[mail_id],
		subject=frappe.render_template(
			frappe.db.get_value("Email Template", job_offer_temp, "subject")
		),
		message=frappe.render_template(
			frappe.db.get_value("Email Template", job_offer_temp, "response"),
			email_context
		),
		args=email_context
	)
	frappe.msgprint("Job Offer Sent Successfully")