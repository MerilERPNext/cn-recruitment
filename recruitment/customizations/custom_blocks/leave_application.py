import frappe
from frappe.utils import today

@frappe.whitelist()
def get_all_todays_leaves():
    return frappe.get_all(
        "Leave Application",
        filters={
            "from_date": ["<=", today()],
            "to_date": [">=", today()],
            "status": ["not in", ["Rejected", "Cancelled"]]
        },
        fields=[
            "name", "employee", "employee_name", "from_date",
            "to_date", "leave_type", "workflow_state"
        ],
        order_by="from_date desc"
    )


@frappe.whitelist()
def get_employees(text=None):
    if not text:
        return []

    return frappe.get_all(
        "Employee",
        filters={"employee_name": ["like", f"%{text}%"]},
        fields=["name", "employee_name"],
        limit_page_length=1000,
        ignore_permissions=True
    )
