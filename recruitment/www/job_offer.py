import frappe
from frappe.utils import add_days, getdate,date_diff

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


# this function is used to get the nearest working day based on holiday list
@frappe.whitelist()
def get_next_working_day(date, employee):
    """Finds the nearest working day before the given date"""
    date = getdate(date)
    holiday_list = frappe.db.get_value("Employee", employee, "holiday_list")
    if not holiday_list:
        return str(add_days(date, 0))

    while frappe.db.exists("Holiday", {"parent": holiday_list, "holiday_date": date}):
        date = add_days(date, -1)
    return str(date)

@frappe.whitelist()
def custom_manual_relieving_date(doc):
    doc = frappe.parse_json(doc)

    notice_period_days = frappe.db.get_value("Employment Type", {"name": doc.get("custom_employment_type")}, "custom_notice_period_days") or 0

    relieving_date = getdate(doc.get("custom_manual_relieving_date"))
    resignation_date = getdate(doc.get("custom_resignation_date"))

    days_served = date_diff(relieving_date, resignation_date)
    if relieving_date == resignation_date:
        days_served = 1

    days_exceeded = max(0, days_served - notice_period_days)
    custom_notice_period_served = 1 if days_served >= notice_period_days else 0

    return {
        "relieving_date": str(relieving_date),
        "days_served": days_served,
        "days_exceeded": days_exceeded,
        "custom_notice_period_served": custom_notice_period_served
    }