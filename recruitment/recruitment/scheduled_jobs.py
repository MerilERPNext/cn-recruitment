# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import add_days, getdate, today, cint


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

    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_final_last_working_day": ["<=", current_date],
            "docstatus": ["!=", 2],
            "custom_resignaion_type": ["!=", "Termination"]
        },
        fields=["name", "employee", "custom_final_last_working_day"]
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

            if sep_docstatus == 0:
                sep_doc = frappe.get_doc("Employee Separation", sep.name)
                sep_doc.flags.ignore_permissions = True
                sep_doc.submit()

            employee_doc = frappe.get_doc("Employee", sep.employee)
            employee_doc.flags.ignore_permissions = True
            employee_doc.status = "Left"
            employee_doc.custom_employment_status = "Separated"
            employee_doc.relieving_date = sep.custom_final_last_working_day
            employee_doc.save()

            employee_name = frappe.db.get_value("Employee", sep.employee, "employee_name")

            frappe.log_error(
                message=f"Auto-separated employee {employee_name} ({sep.employee}) on LWD {sep.custom_final_last_working_day}. Employee Separation {sep.name} submitted.",
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


def mark_relieved_employees_as_left():
    current_date = getdate(today())

    employees = frappe.get_all(
        "Employee",
        filters=[
            ["relieving_date", "is", "set"],
            ["relieving_date", "<=", current_date],
            ["status", "!=", "Left"],
        ],
        fields=["name", "employee_name", "user_id", "relieving_date"],
    )

    for emp in employees:
        is_termination = frappe.db.exists("Employee Separation", {
            "employee": emp.name,
            "custom_resignaion_type": "Termination",
            "docstatus": 1,
        })
        frappe.db.set_value("Employee", emp.name, {
            "status": "Left",
            "custom_employment_status": "Terminated" if is_termination else "Left",
        })

        if emp.user_id:
            frappe.db.set_value("User", emp.user_id, "enabled", 0)

        frappe.log_error(
            message=f"Marked employee {emp.employee_name} ({emp.name}) as Left on relieving date {emp.relieving_date}. User {emp.user_id or 'N/A'} disabled.",
            title="Employee Marked as Left",
        )

    if employees:
        frappe.db.commit()


def reassign_employee_relationships_on_relieving():
    current_date = getdate(today())

    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_status": "Approved",
            "custom_reassign_relationships": 1,
            "custom_relationships_reassigned": 0,
        },
        fields=["name", "employee"],
    )

    reassigned_any = False

    for sep in separations:
        if not sep.employee:
            continue

        relieving = frappe.db.get_value("Employee", sep.employee, "relieving_date")
        if not relieving or getdate(relieving) > current_date:
            continue

        sep_doc = frappe.get_doc("Employee Separation", sep.name)

        changes_by_employee = {}
        for row in (sep_doc.custom_relationship_reassignments or []):
            if not row.employee or not row.relationship_field or not row.new_assignee:
                continue
            if row.new_assignee == row.employee:
                continue
            changes_by_employee.setdefault(row.employee, {})[row.relationship_field] = row.new_assignee

        for emp_name, field_map in changes_by_employee.items():
            try:
                emp_doc = frappe.get_doc("Employee", emp_name)
                for fieldname, new_value in field_map.items():
                    emp_doc.set(fieldname, new_value)
                emp_doc.save(ignore_permissions=True)
            except Exception:
                frappe.log_error(
                    message=frappe.get_traceback(),
                    title=f"Relationship Reassignment Error ({emp_name})",
                )

        frappe.db.set_value(
            "Employee Separation", sep.name,
            "custom_relationships_reassigned", 1,
            update_modified=False,
        )
        reassigned_any = True

    if reassigned_any:
        frappe.db.commit()


def process_separation_leave_attendance_requests():
    current_date = getdate(today())

    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "custom_leave_attendance_action": ["in", ["Approve", "Reject"]],
            "docstatus": 1,
        },
        fields=[
            "name",
            "employee",
            "custom_leave_attendance_action",
            "custom_action_days_before_relieving",
        ],
    )

    for sep in separations:
        if not sep.employee:
            continue

        relieving_date = frappe.db.get_value("Employee", sep.employee, "relieving_date")
        if not relieving_date:
            continue

        days_before = cint(sep.custom_action_days_before_relieving)
        if current_date != add_days(getdate(relieving_date), -days_before):
            continue

        action = sep.custom_leave_attendance_action
        _process_separation_leave_applications(sep.employee, action)
        _process_separation_attendance_requests(sep.employee, action)

    frappe.db.commit()


def _process_separation_leave_applications(employee, action):
    new_status = "Approved" if action == "Approve" else "Rejected"

    leaves = frappe.get_all(
        "Leave Application",
        filters={"employee": employee, "docstatus": 0, "status": "Open"},
        pluck="name",
    )

    for name in leaves:
        try:
            leave_doc = frappe.get_doc("Leave Application", name)
            leave_doc.status = new_status
            leave_doc.submit()
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"Separation auto-{action} Leave Application failed: {name}",
            )


def _process_separation_attendance_requests(employee, action):
    new_status = "Approved" if action == "Approve" else "Rejected"

    requests = frappe.get_all(
        "Attendance Request",
        filters={
            "employee": employee,
            "docstatus": 0,
            "custom_status": ["not in", ["Approved", "Rejected"]],
        },
        pluck="name",
    )

    for name in requests:
        try:
            req_doc = frappe.get_doc("Attendance Request", name)
            req_doc.custom_status = new_status
            req_doc.save(ignore_permissions=True)
            req_doc.submit()
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"Separation auto-{action} Attendance Request failed: {name}",
            )


def auto_confirm_employees_without_policy():
    current_date = getdate(today())

    employees = frappe.get_all(
        "Employee",
        filters=[
            ["status", "=", "Active"],
            ["custom_employment_status", "in", ["On Probation", "Probation Extended"]],
            ["final_confirmation_date", "is", "set"],
            ["final_confirmation_date", "<=", current_date],
        ],
        fields=["name", "employee_name", "final_confirmation_date"],
    )

    all_policy_employees = set()
    policies = frappe.get_all("Confirmation Policy", fields=["name"])
    for policy in policies:
        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)
        applicable = get_applicable_employees(policy_doc)
        all_policy_employees.update(applicable)

    for emp in employees:
        if emp.name in all_policy_employees:
            continue

        existing = frappe.db.exists("Employee Confirmation", {
            "employee": emp.name,
            "docstatus": ["!=", 2],
        })
        if existing:
            continue

        try:
            confirmation_doc = frappe.get_doc({
                "doctype": "Employee Confirmation",
                "employee": emp.name,
                "status": "Confirmed",
            })
            confirmation_doc.insert(ignore_permissions=True, ignore_mandatory=True)
            confirmation_doc.submit()

            frappe.db.set_value("Employee", emp.name, {
                "custom_employment_status": "Confirmed",
            })

            frappe.log_error(
                message=f"Auto-confirmed employee {emp.employee_name} ({emp.name}) - no confirmation policy assigned. Confirmation date: {emp.final_confirmation_date}",
                title="Auto Confirmation Executed",
            )
        except Exception as e:
            frappe.log_error(
                message=f"Failed to auto-confirm {emp.employee_name} ({emp.name}): {str(e)}",
                title="Auto Confirmation Failed",
            )

    frappe.db.commit()


@frappe.whitelist()
def should_show_confirmation_button():
    import json

    user = frappe.session.user

    user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    user_roles = frappe.get_roles(user)

    target_employee_header = None
    try:
        target_employee_header = frappe.request.headers.get("X-Target-Employee-Id")
    except Exception:
        target_employee_header = None

    if target_employee_header:
        if not frappe.db.exists("Employee", target_employee_header):
            return {"show_button": False, "error": "Target employee not found"}
        scope_employee = target_employee_header
    else:
        scope_employee = user_employee

    if not scope_employee:
        return {"show_button": False}

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

        if scope_employee not in applicable_employees:
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
        if scope_employee in target_employees:
            target_employees = [scope_employee]
        else:
            target_employees = []

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


@frappe.whitelist()
def should_show_separation_button():
    import json

    user = frappe.session.user

    user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    user_roles = frappe.get_roles(user)

    target_employee_header = None
    try:
        target_employee_header = frappe.request.headers.get("X-Target-Employee-Id")
    except Exception:
        target_employee_header = None

    print("[SEP] === should_show_separation_button START ===")
    print("[SEP] session_user:", user, "| user_employee:", user_employee)
    print("[SEP] X-Target-Employee-Id header:", target_employee_header)

    if target_employee_header:
        if not frappe.db.exists("Employee", target_employee_header):
            print("[SEP] STOP: target employee in header does not exist")
            return {"show_button": False, "error": "Target employee not found"}
        scope_employee = target_employee_header
    else:
        scope_employee = user_employee

    print("[SEP] scope_employee (employee we are deciding for):", scope_employee)

    if not scope_employee:
        print("[SEP] STOP: no scope_employee (caller has no Employee and no header)")
        return {"show_button": False}

    policies = frappe.get_all(
        "Confirmation Policy",
        fields=["name", "triggered_number_of_days_before_confirmation", "separation_initiators"]
    )

    current_date = getdate(today())
    print("[SEP] today:", current_date, "| policies found:", len(policies))

    for policy in policies:
        print("[SEP] --- checking policy:", policy.name, "---")
        policy_doc = frappe.get_doc("Confirmation Policy", policy.name)
        applicable_employees = get_applicable_employees(policy_doc)
        if not applicable_employees:
            print("[SEP]   skip: policy has no applicable employees")
            continue

        if scope_employee not in applicable_employees:
            print("[SEP]   skip:", scope_employee, "not in this policy's applicable employees")
            continue

        initiator_cfg = {}
        try:
            initiator_cfg = json.loads(policy_doc.separation_initiators or "{}")
        except Exception:
            pass
        if not isinstance(initiator_cfg, dict):
            initiator_cfg = {}

        has_self = initiator_cfg.get("self", False)
        cfg_roles = initiator_cfg.get("roles", [])
        cfg_users = initiator_cfg.get("users", [])
        cfg_fields = initiator_cfg.get("employee_fields", [])
        print("[SEP]   separation_initiators -> self:", has_self, "| roles:", cfg_roles, "| users:", cfg_users, "| employee_fields:", cfg_fields)

        # Separation must be explicitly configured - no implicit self fallback.
        if not has_self and not cfg_roles and not cfg_users and not cfg_fields:
            print("[SEP]   skip: separation_initiators is empty / not configured")
            continue

        target_employees = []

        if has_self:
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
        print("[SEP]   employees the CALLER is allowed to initiate for:", target_employees)
        if scope_employee in target_employees:
            target_employees = [scope_employee]
        else:
            print("[SEP]   skip: caller (", user, "/ emp", user_employee, ") is NOT an allowed separation initiator for", scope_employee)
            print("[SEP]          (self is", has_self, "- if you are testing as the employee, turn Self ON; if reports_to, call as the manager WITH the X-Target-Employee-Id header)")
            target_employees = []

        if not target_employees:
            continue

        for emp_id in target_employees:
            emp_doc = frappe.get_doc("Employee", emp_id)
            print("[SEP]   employee", emp_id, "status:", emp_doc.status, "| employment_status:", emp_doc.custom_employment_status, "| final_confirmation_date:", emp_doc.final_confirmation_date)

            if emp_doc.status != "Active":
                print("[SEP]   skip: employee status is not Active")
                continue
            if emp_doc.custom_employment_status not in ("On Probation", "Probation Extended"):
                print("[SEP]   skip: employment_status is not On Probation / Probation Extended")
                continue
            if not emp_doc.final_confirmation_date:
                print("[SEP]   skip: final_confirmation_date is empty")
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

            if extension_count > 0:
                if policy_doc.extension_workflow_configurations:
                    for row in policy_doc.extension_workflow_configurations:
                        if row.extension_number == extension_count:
                            trigger_days = row.trigger_days_before_extension or 0
                            break
                if not trigger_days:
                    print("[SEP]   skip: extended probation but no matching extension trigger_days")
                    continue
            else:
                trigger_days = policy_doc.triggered_number_of_days_before_confirmation

            print("[SEP]   days_until_confirmation:", days_until_confirmation, "| trigger_days:", trigger_days, "| extension_count:", extension_count)

            if not trigger_days:
                print("[SEP]   skip: trigger_days is 0 / not set")
                continue

           
            if days_until_confirmation > trigger_days:
                is_self = (emp_id == user_employee)
                print("[SEP]   MATCH: days_until > trigger_days -> show_button TRUE")
                return {
                    "show_button": True,
                    "employee": emp_id,
                    "employee_name": emp_doc.employee_name,
                    "is_self": is_self,
                    "days_until_confirmation": days_until_confirmation,
                    "trigger_days": trigger_days,
                    "confirmation_date": str(confirmation_date),
                    "separation_hidden_from_date": str(add_days(confirmation_date, -trigger_days)),
                    "extension_count": extension_count
                }
            else:
                print("[SEP]   skip: days_until (", days_until_confirmation, ") <= trigger_days (", trigger_days, ") -> inside confirmation window, separation hides")

    print("[SEP] === RESULT: show_button FALSE ===")
    return {"show_button": False}
