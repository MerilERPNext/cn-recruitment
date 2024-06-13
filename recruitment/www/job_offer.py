import frappe

def get_context(context):
	frappe.set_user("Administrator")
	query_params = frappe.request.args
	appl = query_params.get("appl")
	status = frappe.db.get_value("Job Offer",{"job_applicant":appl},"status")
	jo_id = frappe.db.get_value("Job Offer",{"job_applicant":appl})
	if status == "Awaiting Response":
		context.doc =jo_id
	else:
		context.status = status