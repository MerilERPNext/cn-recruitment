import frappe

def get_context(context):
    frappe.set_user("Administrator")
    query_params = frappe.request.args
    appl = query_params.get("appl")
    job_offers = frappe.db.get_all(
        'Job Offer',
        fields=['name', 'status'],
        filters={
            'job_applicant': appl,
            'docstatus': ['!=', 2]
        },
        order_by='modified desc',
        limit=1
    )
    if job_offers:
        status = job_offers[0]["status"]
        if status == "Awaiting Response":
            context.doc = job_offers[0]["name"]
    
    context.no_cache = 1 # don't allow any caching of data based on parameters.
    return context

