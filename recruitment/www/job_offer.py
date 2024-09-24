import frappe

def get_context(context):
	frappe.set_user("Administrator")
	query_params = frappe.request.args
	appl = query_params.get("appl")
	job_offers = frappe.db.get_list(
		'Job Offer',
		fields=['name', 'status'],
		filters={
			'job_applicant': appl
		},
		order_by='modified desc',
		limit = 1
	)
	status = frappe.db.get_value("Job Offer",job_offers[0]["name"],"status")
	if job_offers[0]["status"] == "Awaiting Response":
		context.doc =job_offers[0]["name"]
	else:
		context.status = status
