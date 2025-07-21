# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DynamicUserAssignment(Document):
	pass


@frappe.whitelist()
def fetch_employees_and_users(docname):
    doc = frappe.get_doc("Dynamic User Assignment", docname)

    doc.set("assigned_users", [])

    filters = {}
    for cond in doc.assignment_conditions:
        if cond.operator == "in":
            filters[cond.field_name] = ["in", [v.strip() for v in cond.value.split(",")]]
        else:
            filters[cond.field_name] = cond.value
    employees = frappe.get_all("Employee", fields=["name", "user_id"], filters=filters)
    for emp in employees:
        doc.append("assigned_users", {
            "employee_id": emp.name,
            "user_id": emp.user_id
        })

    doc.save(ignore_permissions=True)

    return f"{len(employees)} rows added successfully"

