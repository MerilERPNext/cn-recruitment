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
            "triggered_number_of_days_before_confirmation"
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

            extension_count = frappe.db.count(
                "Employee Confirmation",
                {
                    "employee": emp_name,
                    "docstatus": 1,
                    "status": "Probation Extended"
                }
            )

            if extension_count > 0:
                trigger_days = get_extension_trigger_days(policy_doc, extension_count)
                if not trigger_days:
                    continue
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
                


def get_extension_trigger_days(policy_doc, extension_count):
  
    if not policy_doc.extension_workflow_configurations:
        return None

    for row in policy_doc.extension_workflow_configurations:
        if row.extension_number == extension_count:
            return row.trigger_days_before_extension or 0

    return None


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


def auto_separate_employees_on_lwd():
  
    current_date = getdate(today())

    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_actual_last_working_date": ["<=", current_date],
            "docstatus": ["!=", 2]  # Not cancelled
        },
        fields=["name", "employee", "custom_actual_last_working_date"]
    )

    for sep in separations:
        if not sep.employee:
            continue

        employee_status = frappe.db.get_value("Employee", sep.employee, "status")
        if employee_status == "Left":
            continue

        separation_policy = get_applicable_separation_policy(sep.employee)

        if not separation_policy:
            continue

        sp_doc = frappe.get_doc("Separation Policy", separation_policy)

        if sp_doc.force_separate_employee_on_lwd_as_per_notice_period:
            sep_docstatus = frappe.db.get_value("Employee Separation", sep.name, "docstatus")

            if sep_docstatus == 0:  # Draft
                sep_doc = frappe.get_doc("Employee Separation", sep.name)
                sep_doc.flags.ignore_permissions = True
                sep_doc.submit()

            frappe.db.set_value("Employee", sep.employee, {
                "status": "Left",
                "custom_employment_status": "Separated",
                "relieving_date": sep.custom_actual_last_working_date
            })

            employee_name = frappe.db.get_value("Employee", sep.employee, "employee_name")

            frappe.log_error(
                message=f"Auto-separated employee {employee_name} ({sep.employee}) on LWD {sep.custom_actual_last_working_date}. Employee Separation {sep.name} submitted.",
                title="Auto Separation Executed"
            )

    frappe.db.commit()


def get_applicable_separation_policy(employee_id):
    policies = frappe.get_all("Separation Policy", fields=["name"])

    for policy in policies:
        sp_doc = frappe.get_doc("Separation Policy", policy.name)
        for assignment in sp_doc.applicable_to:
            if assignment.select_visibility_restriction:
                try:
                    dy_ass = frappe.get_doc("Dynamic User Assignment", assignment.select_visibility_restriction)
                    assigned_ids = [u.employee_id for u in dy_ass.assigned_users]
                    if employee_id in assigned_ids:
                        return policy.name
                except Exception:
                    pass
    return None


@frappe.whitelist()
def should_show_confirmation_button():

    user = frappe.session.user

    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not employee:
        return {"show_button": False}

    employee_doc = frappe.get_doc("Employee", employee)

    if employee_doc.status != "Active":
        return {"show_button": False}

    if not employee_doc.final_confirmation_date:
        return {"show_button": False}

    confirmation_date = getdate(employee_doc.final_confirmation_date)
    current_date = getdate(today())
    days_until_confirmation = (confirmation_date - current_date).days

    policies = frappe.get_all(
        "Confirmation Policy",
        fields=[
            "name",
            "triggered_number_of_days_before_confirmation"
        ]
    )

    for policy in policies:
        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)

        if employee not in get_applicable_employees(policy_doc):
            continue

        extension_count = frappe.db.count(
            "Employee Confirmation",
            {
                "employee": employee,
                "docstatus": 1,
                "status": "Probation Extended"
            }
        )

        trigger_days = None
        confirmation_type = "confirmation"

        if extension_count > 0:
            if policy_doc.extension_workflow_configurations:
                for row in policy_doc.extension_workflow_configurations:
                    if row.extension_number == extension_count:
                        trigger_days = row.trigger_days_before_extension or 0
                        break

            if not trigger_days:
                return

            confirmation_type = "extension"
        else:
            trigger_days = policy_doc.triggered_number_of_days_before_confirmation

        if not trigger_days:
            continue

        button_visible_from_date = add_days(confirmation_date, -trigger_days)

        if 0 <= days_until_confirmation <= trigger_days:
            return {
                "show_button": True,
                "days_until_confirmation": days_until_confirmation,
                "trigger_days": trigger_days,
                "confirmation_date": str(confirmation_date),
                "button_visible_from_date": str(button_visible_from_date),
                "confirmation_type": confirmation_type,
                "extension_count": extension_count
            }

    return {
        "show_button": False,
        "days_until_confirmation": days_until_confirmation if 'days_until_confirmation' in dir() else None
    }
