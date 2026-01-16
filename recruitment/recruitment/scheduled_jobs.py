# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import add_days, getdate, today


def trigger_confirmation_todos():
   
    current_date = getdate(today())

    policies = frappe.get_all(
        "Confirmation Policy",
        filters={},
        fields=[
            "name",
            "policy_title",
            "triggered_number_of_days_before_confirmation",
            "triggered_days_before_extension_confirmation"
        ]
    )

    for policy in policies:

        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)

        applicable_employees = get_applicable_employees(policy_doc)

        if not applicable_employees:
            continue

        for emp_name in applicable_employees:
            employee = frappe.get_doc("Employee", emp_name)

            if not employee.final_confirmation_date:
                continue

            if employee.status not in ["Active"]:
                continue

            existing_confirmation = frappe.db.get_value(
                "Employee Confirmation",
                {
                    "employee": emp_name,
                    "docstatus": 1,
                    "status": "Probation Extended"
                },
                "name"
            )

            if existing_confirmation:
                if not policy.triggered_days_before_extension_confirmation:
                    continue

                trigger_days = policy.triggered_days_before_extension_confirmation
                todo_type = "extension"
            else:
                if not policy.triggered_number_of_days_before_confirmation:
                    continue
                trigger_days = policy.triggered_number_of_days_before_confirmation
                todo_type = "confirmation"

            confirmation_date = getdate(employee.final_confirmation_date)
            days_until_confirmation = (confirmation_date - current_date).days
  
            if 0 <= days_until_confirmation <= trigger_days:

                if todo_type == "extension":
                    todo_subject = "Extension Confirmation Pending"
                else:
                    todo_subject = "Employee Confirmation Pending"

                existing_todo = frappe.db.exists(
                    "ToDo",
                    {
                        "reference_type": "Employee",
                        "reference_name": emp_name,
                        "status": "Open",
                        "description": ("like", f"%{todo_subject}%")
                    }
                )

                if not existing_todo:
                    create_confirmation_todo(employee, policy_doc, todo_type)
                


def get_applicable_employees(policy_doc):
   
    applicable_employees = []

    if not policy_doc.applicable_to or len(policy_doc.applicable_to) == 0:
        return []

    for row in policy_doc.applicable_to:
 
        if not row.select_visibility_restriction:
            continue

        assigned_users = frappe.get_all(
            "Assigned Users",
            filters={"parent": row.select_visibility_restriction},
            fields=["employee_id"]
        )

        for user in assigned_users:
            if user.employee_id:
                applicable_employees.append(user.employee_id)

    result = list(set(applicable_employees))
    return result


def create_confirmation_todo(employee, policy_doc, todo_type="confirmation"):
  
    if todo_type == "extension":
        description = f"Extension Confirmation Pending for {employee.employee_name}"
    else:
        description = f"Employee Confirmation Pending for {employee.employee_name}"

    todo = frappe.new_doc("ToDo")
    todo.owner = "Administrator" 
    todo.allocated_to = employee.user_id 
    todo.reference_type = "Employee"
    todo.reference_name = employee.name
    todo.description = description
    todo.date = employee.final_confirmation_date
    todo.priority = "High"
    todo.status = "Open"

    if hasattr(todo, "custom_redirect_url"):
        todo.custom_redirect_url = "flow-app/confirmation"

    if hasattr(todo, "custom_category"):
        todo.custom_category = "Employee Confirmation"

    todo.flags.ignore_permissions = True
    todo.insert()

    frappe.db.commit()
