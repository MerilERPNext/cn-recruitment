import frappe
import json

def reassign_employee_separation_tasks():
    print("Fetching Employee Separations with project set...")
    separations = frappe.get_all(
        "Employee Separation",
        filters={
            "project": ["is", "set"]
        },
        fields=["name", "project", "employee_separation_template"]
    )

    print(f"Found {len(separations)} separation records.")

    all_tasks = []

    for sep in separations:
        project = sep["project"]
        separation_id = sep["name"]
        template_id = sep["employee_separation_template"]

        print(f"\nProcessing Separation: {separation_id}, Project: {project}, Template: {template_id}")

        if not template_id:
            print("No template found. Skipping.")
            continue

        unassigned_tasks = frappe.get_all(
            "Task",
            filters={
                "project": project,
                "status": ["!=", "Completed"],
                "_assign": ["is", "not set"]
            },
            fields=["name", "subject"]
        )

        print(f"  Found {len(unassigned_tasks)} unassigned tasks.")

        for task in unassigned_tasks:
            task["separation_id"] = separation_id
            task["template_id"] = template_id
            all_tasks.append(task)

    print(f"\nTotal tasks to process: {len(all_tasks)}")
    process_separation_tasks(all_tasks)


def process_separation_tasks(tasks):
    for task in tasks:
        print(f"\nProcessing Task: {task['name']} | Subject: {task['subject']}")

        separation_id = task.get("separation_id")
        template_id = task.get("template_id")

        if not separation_id or not template_id:
            print("Missing separation_id or template_id. Skipping task.")
            continue

        template_doc = frappe.get_doc("Employee Separation Template", template_id)
        matched_activity = next(
            (activity for activity in template_doc.activities if activity.activity_name.lower() in task["subject"].lower()), None
        )

        if not matched_activity:
            print("No matched activity found in template. Skipping.")
            continue

        assigned_user = None

        if matched_activity.custom_assignment_condition:
            print(f"  Using assignment condition: {matched_activity.custom_assignment_condition}")
            assigned_user = resolve_user_from_condition("Employee Separation", separation_id, matched_activity.custom_assignment_condition)
        elif matched_activity.custom_assign_based_on_role:
            print(f"  Using role-based assignment: {matched_activity.custom_assign_based_on_role}")
            assigned_user = get_users_by_role(matched_activity.custom_assign_based_on_role)
        else:
            print("  No condition or role defined. Skipping task.")
            continue

        if not assigned_user:
            print("  No user found for assignment.")
            continue

        assign_value = json.dumps(assigned_user if isinstance(assigned_user, list) else [assigned_user])
        frappe.db.set_value("Task", task["name"], "_assign", assign_value)
        frappe.db.commit()
        print(f"  Task assigned to: {assign_value}")


def resolve_user_from_condition(start_doctype, start_docname, condition):

    field_path = condition.strip().split(".")

    current_doctype = start_doctype
    current_docname = start_docname

    for index, field in enumerate(field_path):
        field = field.strip()

        if field == "owner":
            final_value = frappe.db.get_value(current_doctype, current_docname, "owner")
            if final_value:
                return final_value
            else:
                return None  

        field_meta = frappe.db.get_value(
            "DocField",
            {"parent": current_doctype, "fieldname": field},
            ["fieldtype", "options"],
            as_dict=True
        ) or frappe.db.get_value(
            "Custom Field",
            {"dt": current_doctype, "fieldname": field},
            ["fieldtype", "options"],
            as_dict=True
        )

        if not field_meta:
            return None  

        if index == len(field_path) - 1:
            final_value = frappe.db.get_value(current_doctype, current_docname, field)
            if final_value:
                return final_value
            else:
                return None  

        if field_meta["fieldtype"] == "Link":
            linked_docname = frappe.db.get_value(current_doctype, current_docname, field)
            if not linked_docname:
                return None  


            current_doctype = field_meta["options"]
            current_docname = linked_docname

        elif field_meta["fieldtype"] == "Table MultiSelect":
            child_table_doctype = field_meta["options"]

            employee_entries = frappe.get_all(
                child_table_doctype,
                filters={"parent": current_docname},
                fields=["employee"]
            )

            if not employee_entries:
                return None  

            employee_ids = [entry["employee"] for entry in employee_entries if entry.get("employee")]

            resolved_users = []
            for emp_id in employee_ids:
                user_id = frappe.db.get_value("Employee", emp_id, "user_id")
                if user_id:
                    resolved_users.append(user_id)

            if resolved_users:
                return resolved_users  

            return None

        else:
            return None  

    return None


def get_users_by_role(role):
    print(f"    Fetching users with role: {role}")
    users = frappe.get_all(
        "Has Role",
        filters={"role": role},
        fields=["parent"]
    )
    user_list = [user.parent for user in users if user.parent != "Administrator"]
    print(f"    Users found: {user_list}")
    return user_list
