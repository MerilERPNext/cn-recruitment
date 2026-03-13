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
  
            if days_until_confirmation <= trigger_days:

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


def create_extension_confirmations():

    current_date = getdate(today())

    policies = frappe.get_all(
        "Confirmation Policy",
        fields=["name"]
    )

    for policy in policies:
        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)
        applicable_employees = get_applicable_employees(policy_doc)

        if not applicable_employees:
            continue

        for emp_name in applicable_employees:
            employee = frappe.get_doc("Employee", emp_name)

            if employee.status != "Active":
                continue

            if employee.custom_employment_status != "Probation Extended":
                continue

            if not employee.final_confirmation_date:
                continue

            if getdate(employee.final_confirmation_date) > current_date:
                continue

            existing = frappe.db.exists(
                "Employee Confirmation",
                {
                    "employee": emp_name,
                    "docstatus": 0,
                }
            )
            if existing:
                continue

            extension_count = frappe.db.count(
                "Employee Confirmation",
                {
                    "employee": emp_name,
                    "docstatus": 1,
                    "status": "Probation Extended",
                }
            )

            extension_workflow = None
            for config in policy_doc.extension_workflow_configurations:
                if config.extension_number == extension_count:
                    extension_workflow = config.extension_workflow
                    break

            doc = frappe.new_doc("Employee Confirmation")
            doc.employee = emp_name
            doc.confirmation_policy = policy.name
            doc.probation_end_date = employee.final_confirmation_date
            doc.is_extension_confirmation = 1
            doc.extension_workflow = extension_workflow
            doc.flags.ignore_permissions = True
            doc.insert()

    frappe.db.commit()


def auto_separate_employees_on_lwd():
  
    current_date = getdate(today())

    auto_terminate_employees(current_date)

    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_actual_last_working_date": ["<=", current_date],
            "docstatus": ["!=", 2],
            "custom_resignaion_type": ["!=", "Termination"]
        },
        fields=["name", "employee", "custom_actual_last_working_date"]
    )

    for sep in separations:
        if not sep.employee:
            continue

        employee_status = frappe.db.get_value("Employee", sep.employee, "status")
        if employee_status == "Left":
            continue

        force_separate = False
        custom_flow = frappe.db.get_value("Employee Separation", sep.name, "custom_flow")
        if custom_flow and frappe.db.exists("Flow Config", custom_flow):
            force_separate = bool(frappe.db.get_value("Flow Config", custom_flow, "force_separate_employee_on_lwd_as_per_notice_period"))
        if not force_separate:
            separation_policy = get_applicable_separation_policy(sep.employee)
            if separation_policy:
                sp_doc = frappe.get_doc("Separation Policy", separation_policy)
                force_separate = bool(sp_doc.force_separate_employee_on_lwd_as_per_notice_period)

        if force_separate:
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


def auto_terminate_employees(current_date):
    termination_seps = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_resignaion_type": "Termination",
            "custom_date_of_exit": ["<=", current_date],
            "custom_marked_employee_as_terminated": 0,
            "docstatus": ["!=", 2]
        },
        fields=["name", "employee", "custom_date_of_exit"]
    )

    for sep in termination_seps:
        if not sep.employee:
            continue

        employee_status = frappe.db.get_value("Employee", sep.employee, "status")
        if employee_status == "Left":
            continue

        frappe.db.set_value("Employee", sep.employee, {
            "status": "Suspended",
            "custom_employment_status": "Terminated",
        })

        frappe.db.set_value("Employee Separation", sep.name, "custom_marked_employee_as_terminated", 1)

        employee_name = frappe.db.get_value("Employee", sep.employee, "employee_name")

        frappe.log_error(
            message=f"Auto-terminated employee {employee_name} ({sep.employee}) on exit date {sep.custom_date_of_exit}. Employee Separation {sep.name}.",
            title="Auto Termination Executed"
        )


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


def mark_relieved_employees_as_left():
    current_date = getdate(today())

    employees = frappe.get_all(
        "Employee",
        filters={
            "relieving_date": ["<=", current_date],
            "status": ["!=", "Left"],
        },
        fields=["name", "employee_name", "user_id", "relieving_date"],
    )

    for emp in employees:
        frappe.db.set_value("Employee", emp.name, {
            "status": "Left",
            "custom_employment_status": "Left",
        })

        if emp.user_id:
            frappe.db.set_value("User", emp.user_id, "enabled", 0)

        frappe.log_error(
            message=f"Marked employee {emp.employee_name} ({emp.name}) as Left on relieving date {emp.relieving_date}. User {emp.user_id or 'N/A'} disabled.",
            title="Employee Marked as Left",
        )

    if employees:
        frappe.db.commit()


@frappe.whitelist()
def should_show_confirmation_button():
    import json

    user = frappe.session.user

    user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    user_roles = frappe.get_roles(user)

    policies = frappe.get_all(
        "Confirmation Policy",
        fields=["name", "triggered_number_of_days_before_confirmation", "initiator"]
    )

    current_date = getdate(today())

    for policy in policies:
        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)
        applicable_employees = get_applicable_employees(policy_doc)
        if not applicable_employees:
            continue

        initiator_cfg = {}
        try:
            initiator_cfg = json.loads(policy_doc.initiator or "{}")
        except Exception:
            pass

        has_self = initiator_cfg.get("self", False)
        cfg_roles = initiator_cfg.get("roles", [])
        cfg_users = initiator_cfg.get("users", [])
        cfg_fields = initiator_cfg.get("employee_fields", [])
        no_initiator_configured = not has_self and not cfg_roles and not cfg_users and not cfg_fields

        target_employees = []

        if no_initiator_configured or has_self:
            if user_employee and user_employee in applicable_employees:
                target_employees.append(user_employee)

        if cfg_roles:
            if any(r in user_roles for r in cfg_roles):
                target_employees.extend(applicable_employees)

        if cfg_users:
            if user in cfg_users:
                target_employees.extend(applicable_employees)

        if cfg_fields and user_employee:
            for emp_id in applicable_employees:
                for f in cfg_fields:
                    field_name = f.get("field", "")
                    if not field_name:
                        continue
                    val = frappe.db.get_value("Employee", emp_id, field_name)
                    if val == user_employee:
                        target_employees.append(emp_id)

        target_employees = list(set(target_employees))
        if not target_employees:
            continue

        for emp_id in target_employees:
            emp_doc = frappe.get_doc("Employee", emp_id)

            if emp_doc.status != "Active":
                continue
            if not emp_doc.final_confirmation_date:
                continue

            confirmation_date = getdate(emp_doc.final_confirmation_date)
            days_until_confirmation = (confirmation_date - current_date).days

            extension_count = frappe.db.count(
                "Employee Confirmation",
                {
                    "employee": emp_id,
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
                    continue
                confirmation_type = "extension"
            else:
                trigger_days = policy_doc.triggered_number_of_days_before_confirmation

            if not trigger_days:
                continue

            if days_until_confirmation <= trigger_days:
                is_self = (emp_id == user_employee)
                return {
                    "show_button": True,
                    "employee": emp_id,
                    "employee_name": emp_doc.employee_name,
                    "is_self": is_self,
                    "days_until_confirmation": days_until_confirmation,
                    "trigger_days": trigger_days,
                    "confirmation_date": str(confirmation_date),
                    "button_visible_from_date": str(add_days(confirmation_date, -trigger_days)),
                    "confirmation_type": confirmation_type,
                    "extension_count": extension_count
                }

    return {"show_button": False}
