import frappe
from frappe import _
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

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

@frappe.whitelist()
def get_user_notices(filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """Get notices for the current user with optional filters"""
    
    if not filters:
        filters = {}
    
    try:
        current_user = frappe.session.user
        
        # Use the existing nextai Notice API function
        from nextai.nextai.doctype.notice.notice import get_user_notices as get_notices_api
        
        # Get notices using the existing well-tested API
        limit = filters.get("limit", 50)
        notices = get_notices_api(user=current_user, limit=limit)
        
        if not notices:
            return []
        
        # Apply frontend filters if any
        filtered_notices = []
        
        for notice in notices:
            # Apply frontend filters
            if filters.get("isUnread") is not None:
                is_unread = not notice.get("read_at")
                if filters["isUnread"] != is_unread:
                    continue
            
            if filters.get("priority"):
                notice_priority_map = {"Low": "low", "Medium": "medium", "High": "high", "Critical": "high"}
                if notice_priority_map.get(notice.get("priority"), "medium") != filters["priority"]:
                    continue
            
            if filters.get("status"):
                notice_status = 'archived' if notice.get('status') == 'Archived' else 'active'
                if notice_status != filters["status"]:
                    continue
            
            # Transform notice for frontend
            transformed_notice = transform_notice_for_frontend(notice)
            filtered_notices.append(transformed_notice)
        
        return filtered_notices
        
    except Exception as e:
        frappe.log_error(f"Error fetching user notices: {str(e)}")
        # Return empty list on error - frontend will handle gracefully
        return []

@frappe.whitelist()
def get_unread_notices_count() -> int:
    """Get count of unread notices for current user"""
    
    try:
        current_user = frappe.session.user
        
        # Use the existing nextai Notice API function  
        from nextai.nextai.doctype.notice.notice import get_unread_notice_count
        
        # Get unread count using existing API
        count = get_unread_notice_count(user=current_user)
        
        return count if isinstance(count, int) else 0
        
    except Exception as e:
        frappe.log_error(f"Error fetching unread notices count: {str(e)}")
        return 0

@frappe.whitelist()
def mark_notice_as_read(notice_id: str) -> bool:
    """Mark a notice as read"""
    
    try:
        current_user = frappe.session.user
        
        # Use the existing nextai Notice API function
        from nextai.nextai.doctype.notice.notice import mark_notice_as_read as mark_read_api
        
        # Mark notice as read using existing API
        result = mark_read_api(notice_id, user=current_user)
        
        return bool(result)
        
    except Exception as e:
        frappe.log_error(f"Error marking notice as read: {str(e)}")
        return False

@frappe.whitelist()
def archive_notice(notice_id: str) -> bool:
    """Archive a notice (admin only)"""
    
    try:
        # Check if user has permission to archive notices
        if not frappe.has_permission('Notice', 'write'):
            frappe.throw(_("You don't have permission to archive notices"))
        
        notice = frappe.get_doc('Notice', notice_id)
        notice.status = 'Archived'
        notice.save()
        frappe.db.commit()
        
        return True
        
    except Exception as e:
        frappe.log_error(f"Error archiving notice: {str(e)}")
        return False

@frappe.whitelist()
def dismiss_notice(notice_id: str) -> bool:
    """Dismiss a notice for current user (mark as acknowledged)"""
    
    try:
        current_user = frappe.session.user
        
        # Use the existing nextai Notice API function
        from nextai.nextai.doctype.notice.notice import mark_notice_as_acknowledged
        
        # Mark notice as acknowledged using existing API  
        result = mark_notice_as_acknowledged(notice_id, user=current_user)
        
        return bool(result)
        
    except Exception as e:
        frappe.log_error(f"Error dismissing notice: {str(e)}")
        return False

def transform_notice_for_frontend(notice: Dict[str, Any]) -> Dict[str, Any]:
    """Transform Frappe notice document for frontend consumption"""
    
    # Calculate relative time
    publish_date = notice.get('publish_date')
    if isinstance(publish_date, str):
        try:
            publish_date = datetime.fromisoformat(publish_date)
        except:
            publish_date = datetime.now()
    elif not publish_date:
        publish_date = datetime.now()
    
    relative_time = get_relative_time(publish_date)
    
    # Map notice type to icon type
    icon_type_map = {
        'Emergency': 'error',
        'Alert': 'error', 
        'Announcement': 'campaign',
        'Policy Update': 'work',
        'System Notice': 'badge',
        'Information': 'campaign'
    }
    
    # Map priority to our format
    priority_map = {
        'Critical': 'high',
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
    }
    
    # Build action object based on notice requirements
    action = None
    if notice.get('allow_acknowledgment') and not notice.get('acknowledged_at'):
        action = {
            'label': 'Acknowledge',
            'type': 'dismiss',
            'variant': 'primary'
        }
    
    # Check if unread
    is_unread = not notice.get('read_at')
    
    return {
        'id': notice['name'],
        'title': notice['title'],
        'message': notice.get('content', ''),
        'time': relative_time,
        'iconType': icon_type_map.get(notice.get('notice_type'), 'campaign'),
        'isUnread': is_unread,
        'priority': priority_map.get(notice.get('priority'), 'medium'),
        'action': action,
        'createdAt': notice['publish_date'].isoformat() if notice.get('publish_date') else None,
        'updatedAt': notice.get('modified', ''),
        'userId': frappe.session.user,
        'category': notice.get('notice_type'),
        'status': 'archived' if notice.get('status') == 'Archived' else 'active'
    }

def get_relative_time(date_obj: datetime) -> str:
    """Calculate relative time string"""
    
    now = datetime.now()
    if date_obj.tzinfo:
        now = now.replace(tzinfo=date_obj.tzinfo)
    
    diff = now - date_obj
    
    total_seconds = int(diff.total_seconds())
    
    if total_seconds < 60:
        return "Now"
    elif total_seconds < 3600:
        minutes = total_seconds // 60
        return f"{minutes}m ago"
    elif total_seconds < 86400:
        hours = total_seconds // 3600
        return f"{hours}h ago"
    elif total_seconds < 604800:
        days = total_seconds // 86400
        return f"{days}d ago"
    else:
        weeks = total_seconds // 604800
        return f"{weeks}w ago"
