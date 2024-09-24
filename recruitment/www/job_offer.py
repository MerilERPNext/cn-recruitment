import frappe

def get_context(context):
	frappe.set_user("Administrator")
	query_params = frappe.request.args
	appl = query_params.get("appl")
	status = frappe.db.get_value("Job Offer",{"job_applicant":appl},"status")
	if status == "Awaiting Response":
		context.doc =frappe.db.get_value("Job Offer",{"job_applicant":appl})
	else:
		context.status = status
