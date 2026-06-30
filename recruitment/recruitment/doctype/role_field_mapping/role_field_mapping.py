# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class RoleFieldMapping(Document):
	pass




@frappe.whitelist()
def get_link_fields_for_doctype(from_doctype, linked_field_doctype):
 
    if not from_doctype or not linked_field_doctype:
        return {"fields": []}

    try:
        meta = frappe.get_meta(from_doctype)
    except Exception:
        return {"fields": []}

    results = []
    for df in meta.fields:
        if df.fieldtype == "Link" and (not getattr(df, "hidden", False)):
            if (df.options or "").strip() == linked_field_doctype:
                label = df.label or df.fieldname
                results.append({"label": label, "fieldname": df.fieldname})

    results = sorted(results, key=lambda x: x["label"].lower())
    return {"fields": results}




@frappe.whitelist()
def get_separation_form_and_permission(employee_id, user=None):

    try:
        # Always evaluate permission for the authenticated caller — never trust a
        # client-supplied `user` (it decided the permission on an attacker-
        # controlled identity).
        user = frappe.session.user
        
        employee_user_id = frappe.db.get_value("Employee", employee_id, "user_id")
        
        separation_policy_name = None
        policies = frappe.get_all("Separation Policy", fields=["name"])
        
        for policy in policies:
            sp_doc = frappe.get_doc("Separation Policy", policy.name)
            for assignment in sp_doc.applicable_to:
                assignment_code = assignment.select_visibility_restriction
                if assignment_code:
                    try:
                        dy_ass = frappe.get_doc("Dynamic User Assignment", assignment_code)
                        assigned_ids = [u.employee_id for u in dy_ass.assigned_users]
                        if employee_id in assigned_ids:
                            separation_policy_name = sp_doc.name
                            break
                    except Exception:
                        pass
            if separation_policy_name:
                break
        
        if not separation_policy_name:
            return {
                "success": False,
                "show_button": False,
                "role": None
            }
        
        sp_doc = frappe.get_doc("Separation Policy", separation_policy_name)
        approval_flow = sp_doc.approval_flow_configuration
        show_button = False
        button_role = None
        
        if user == employee_user_id:
            for row in approval_flow:
                if row.initiator == "Employee":
                    show_button = True
                    button_role = "Employee"
                    break
        
        if not show_button:
            user_roles = [r.role for r in frappe.get_all("Has Role", filters={"parent": user}, fields=["role"])]
            
            for row in approval_flow:
                initiator_role = row.initiator
                
                if initiator_role == "Employee":
                    continue
                
                if initiator_role in user_roles:
                    show_button = True
                    button_role = initiator_role
                    break
                
                role_mapping_response = get_role_field_mapping(initiator_role, initiator_role)
                
                if role_mapping_response.get("success"):
                    linked_field_doctype = role_mapping_response.get("linked_field_doctype")
                    field_name = role_mapping_response.get("field_name")
                    
                    if linked_field_doctype == "User":
                        field_value = frappe.db.get_value("Employee", employee_id, field_name)
                        if field_value == user:
                            show_button = True
                            button_role = initiator_role
                            break
                    
                    elif linked_field_doctype == "Employee":
                        field_value = frappe.db.get_value("Employee", employee_id, field_name)
                        if field_value:
                            field_user_id = frappe.db.get_value("Employee", field_value, "user_id")
                            if field_user_id == user:
                                show_button = True
                                button_role = initiator_role
                                break
        
        return {
            "success": True,
            "show_button": show_button,
            "role": button_role
        }
    
    except Exception as e:
        frappe.log_error(f"Error in get_separation_form_and_permission: {str(e)}")
        return {
            "success": False,
            "show_button": False,
            "role": None
        }


@frappe.whitelist()
def get_role_field_mapping(doctype, role):
  
    try:
        mapping_doc = frappe.get_single("Role Field Mapping")
        
        for row in mapping_doc.mapping:
            if row.from_doctype == doctype and row.role == role:
                return {
                    "success": True,
                    "field_name": row.link_field_name,
                    "linked_field_doctype": row.linked__field_doctype
                }
        
        return {
            "success": False,
            "message": f"No mapping found for doctype: {doctype} and role: {role}"
        }
    
    except Exception as e:
        frappe.log_error(f"Error in get_role_field_mapping: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }
