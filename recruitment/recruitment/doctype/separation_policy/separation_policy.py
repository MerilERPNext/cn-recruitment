# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class SeparationPolicy(Document):
	pass

@frappe.whitelist()
def get_employee_form_widget(target_employee, session_employee):
    user_assignments = frappe.get_all(
        "User Assignment Table",
        filters={"parenttype": "Separation Policy"},
        fields=["parent", "select_visibility_restriction"]
    )

    for assignment in user_assignments:
        assignment_doc = frappe.get_doc("Dynamic User Assignment", assignment.select_visibility_restriction)
        for user in assignment_doc.assigned_users:
            if user.employee_id == target_employee:
                policy_doc = frappe.get_doc("Separation Policy", assignment.parent)
                return get_form_widget_from_policy(policy_doc, target_employee, session_employee)

    return None


def get_form_widget_from_policy(policy_doc, target_employee, session_employee):
    session_user = get_user_by_employee(session_employee)
    session_user_roles = frappe.get_roles(session_user) if session_user else []

    for config in policy_doc.approval_flow_configuration:
        if target_employee == session_employee and config.initiator == "Self":
            return config.action
        if config.initiator in session_user_roles:
            return config.action

    return None
    
        
def get_user_by_employee(employee):
    if not employee:
        return None

    user = frappe.db.get_value("Employee", employee, "user_id")
    return user