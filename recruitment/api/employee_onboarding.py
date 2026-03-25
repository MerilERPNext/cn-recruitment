import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def update_onboarding_details(email, data):
    """
    Updates an Employee Onboarding record given the email (stored in job_applicant).
    
    :param email: The email address mapping to the `job_applicant` field in Employee Onboarding
    :param data: JSON string or Dictionary of fields to update
    """
    # Ensure default response acts correctly
    frappe.local.response['http_status_code'] = 200
    
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response['http_status_code'] = 400
            return {
                "status": "error", 
                "code": 400, 
                "message": "Invalid data format. Expected JSON."
            }
            
    if not data or not isinstance(data, dict):
        frappe.local.response['http_status_code'] = 400
        return {
            "status": "error", 
            "code": 400, 
            "message": "Data must be a valid dictionary of fields to update."
        }
        
    # Find the Employee Onboarding doc where job_applicant matches the email
    onboarding_name = frappe.db.get_value(
        "Employee Onboarding", 
        {"job_applicant": email}, 
        "name"
    )
    
    if not onboarding_name:
        frappe.local.response['http_status_code'] = 404
        return {
            "status": "error", 
            "code": 404, 
            "message": f"No Employee Onboarding record found for {email}"
        }
        
    try:
        doc = frappe.get_doc("Employee Onboarding", onboarding_name)
        
        # Update the document with provided data
        for key, value in data.items():
            df = doc.meta.get_field(key)
            if df and df.fieldtype == "Table" and isinstance(value, list):
                # Clear existing rows for this child table
                doc.set(key, [])
                # Append new rows
                for row_data in value:
                    doc.append(key, row_data)
            else:
                doc.set(key, value)
        
        # Save the document
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "status": "success", 
            "code": 200,
            "message": "Employee Onboarding updated successfully", 
            "data": {
                "name": doc.name,
                "job_applicant": doc.job_applicant
            }
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="Employee Onboarding Update Failed")
        frappe.local.response['http_status_code'] = 500
        return {
            "status": "error",
            "code": 500,
            "message": str(e)
        }
