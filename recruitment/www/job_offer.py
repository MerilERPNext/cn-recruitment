import frappe

def get_context(context):
    original_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        query_params = frappe.request.args
        appl = query_params.get("appl")
        
        if not appl:
            frappe.throw("Missing or invalid 'appl' parameter")
        
        job_offers = frappe.db.get_all(
            'Job Offer',
            fields=['name', 'status'],
            filters=[
                ["Job Offer","job_applicant","=", appl],
                ["Job Offer","docstatus","!=", 2],
                ["Job Offer","status","=","Awaiting Response"]],
            order_by='modified desc',
            limit=1
        )
        
        if job_offers:
            context.doc = job_offers[0]["name"]
            context.print = frappe.get_print('Job Offer', context.doc)
            context.expiry_date = frappe.db.get_value('Job Offer', context.doc, 'custom_jo_expiry_date')
        
        context.no_cache = 1 # don't allow any caching of data based on parameters.
    except frappe.DoesNotExistError:
        frappe.throw("Job Offer not found")
    except Exception as e:
        frappe.throw(f"An error occurred: {str(e)}")
    finally:
        frappe.set_user(original_user)
    return context

