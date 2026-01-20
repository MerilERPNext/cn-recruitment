import frappe
from frappe.utils import getdate, add_days, today

def update_employee_relieving_date(doc, method=None):
    if not doc.custom_actual_last_working_date or not doc.employee_name:
        return

    employee_doc = frappe.get_doc("Employee", {"employee_name": doc.employee_name})
    if employee_doc:
        frappe.db.set_value(
            "Employee",
            employee_doc.name,
            "relieving_date",
            frappe.utils.getdate(doc.custom_actual_last_working_date)
        )


def calculate_lwd_from_notice_period(doc, method=None):
   
    if not doc.employee:
        return

    if doc.custom_actual_last_working_date:
        return

    employee = frappe.get_doc("Employee", doc.employee)

    notice_period_name = employee.custom_notice_period
    if not notice_period_name:
        return

    try:
        notice_period = frappe.get_doc("Notice Period", notice_period_name)
    except frappe.DoesNotExistError:
        return

    employment_status = employee.custom_employment_status or ""

    notice_days = 0

    if employment_status in ["On Probation", "Probation Extended"]:
        notice_days = notice_period.duration_of_notice_period_under_probation or 0
    elif employment_status == "Confirmed":
        notice_days = notice_period.duration_of_notice_period_after_confirmation or 0
    else:
        notice_days = notice_period.duration_of_notice_period_under_probation or 0

    if notice_days > 0:
        lwd = add_days(getdate(today()), notice_days)
        doc.custom_actual_last_working_date = lwd
