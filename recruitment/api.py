import frappe
from frappe import _

@frappe.whitelist()
def get_employee_details(employee_id):
    """Get employee details for ID card"""
    try:
        # Fetch employee data with required fields
        employee = frappe.get_doc("Employee", employee_id)
        
        # Check if user has permission to view this employee
        if not frappe.has_permission("Employee", "read", employee_id):
            frappe.throw(_("You don't have permission to view this employee"), frappe.PermissionError)
        
        # Return employee data
        return {
            "name": employee.name,
            "employee_name": employee.employee_name,
            "first_name": employee.first_name,
            "middle_name": employee.middle_name,
            "last_name": employee.last_name,
            "employee_number": employee.employee_number,
            "designation": employee.designation,
            "department": employee.department,
            "company": employee.company,
            "branch": employee.branch,
            "date_of_joining": employee.date_of_joining,
            "date_of_birth": employee.date_of_birth,
            "gender": employee.gender,
            "image": employee.image,
            "status": employee.status,
            "cell_number": employee.cell_number,
            "personal_email": employee.personal_email,
            "company_email": employee.company_email,
            "prefered_email": employee.prefered_email,
            "current_address": employee.current_address,
            "person_to_be_contacted": employee.person_to_be_contacted,
            "emergency_phone_number": employee.emergency_phone_number,
            "blood_group": employee.blood_group,
            "custom_aadhar_no": employee.custom_aadhar_no,
            "employment_type": employee.employment_type
        }
    except frappe.DoesNotExistError:
        frappe.throw(_("Employee not found"), frappe.DoesNotExistError)
    except Exception as e:
        frappe.log_error(f"Error fetching employee details: {str(e)}")
        frappe.throw(_("Error fetching employee details"))

@frappe.whitelist()
def get_current_employee():
    """Get current user's employee record"""
    try:
        user = frappe.session.user
        if user == "Guest":
            frappe.throw(_("Please login to view employee details"), frappe.PermissionError)
        
        # Find employee record linked to current user
        employee_list = frappe.get_all(
            "Employee", 
            filters={"user_id": user, "status": "Active"}, 
            fields=["name"],
            limit=1
        )
        
        if not employee_list:
            return None
        
        # Get full employee details
        return get_employee_details(employee_list[0].name)
        
    except Exception as e:
        frappe.log_error(f"Error fetching current employee: {str(e)}")
        frappe.throw(_("Error fetching current employee details"))

@frappe.whitelist()
def search_employees(search_term="", limit=20):
    """Search employees by name or employee number"""
    try:
        if not search_term:
            return []
        
        filters = [
            ["Employee", "status", "=", "Active"],
            ["Employee", "employee_name", "like", f"%{search_term}%"]
        ]
        
        # Also search by employee number if search term looks like an ID
        if search_term.isalnum():
            filters = [
                ["Employee", "status", "=", "Active"],
                "|",
                ["Employee", "employee_name", "like", f"%{search_term}%"],
                ["Employee", "employee_number", "like", f"%{search_term}%"]
            ]
        
        employees = frappe.get_all(
            "Employee",
            filters=filters,
            fields=[
                "name", "employee_name", "employee_number", 
                "designation", "department", "status", "image"
            ],
            limit=limit,
            order_by="employee_name asc"
        )
        
        return employees
        
    except Exception as e:
        frappe.log_error(f"Error searching employees: {str(e)}")
        frappe.throw(_("Error searching employees"))

@frappe.whitelist()
def get_employee_list(department=None, designation=None, limit=50):
    """Get list of employees with optional filters"""
    try:
        filters = {"status": "Active"}
        
        if department:
            filters["department"] = department
        if designation:
            filters["designation"] = designation
        
        employees = frappe.get_all(
            "Employee",
            filters=filters,
            fields=[
                "name", "employee_name", "employee_number",
                "designation", "department", "status", "image"
            ],
            limit=limit,
            order_by="employee_name asc"
        )
        
        return employees
        
    except Exception as e:
        frappe.log_error(f"Error fetching employee list: {str(e)}")
        frappe.throw(_("Error fetching employee list")) 