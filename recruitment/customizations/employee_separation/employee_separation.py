import frappe

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
