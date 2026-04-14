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
            "designation_name": frappe.db.get_value("Designation", employee.designation, "designation_name") if employee.designation else None,
            "department": employee.department,
            "department_name": frappe.db.get_value("Department", employee.department, "department_name") if employee.department else None,
            "company": employee.company,
            "company_name": frappe.db.get_value("Company", employee.company, "company_name") if employee.company else None,
            "branch": employee.branch,
            "branch_name": frappe.db.get_value("Branch", employee.branch, "branch") if employee.branch else None,
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
            "employment_type": employee.employment_type,
            "custom_employment_status": employee.custom_employment_status,
            "final_confirmation_date": employee.final_confirmation_date,
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
def get_user_roles(user=None):
    """Get user roles in a format safe for Administrator and regular users"""
    try:
        if not user:
            user = frappe.session.user
        
        # frappe.get_roles() handles Administrator correctly (returns all roles)
        roles = frappe.get_roles(user)
        
        # Return roles in the expected format: [{"role": "Role Name"}, ...]
        return [{"role": role} for role in roles]
        
    except Exception as e:
        frappe.log_error(f"Error fetching user roles: {str(e)}")
        # Return empty list on error - frontend will handle gracefully
        return []

@frappe.whitelist()
def get_ticket_count(doctype="HD Ticket", filters=None, or_filters=None):
    """
    Get count of tickets with support for OR filters.
    This is a workaround for frappe.client.get_count which doesn't support or_filters.
    """
    try:
        # Parse JSON strings if passed as strings
        if isinstance(filters, str):
            filters = json.loads(filters) if filters else None
        if isinstance(or_filters, str):
            or_filters = json.loads(or_filters) if or_filters else None
        
        # Use frappe.get_list with minimal fields for counting
        # This properly handles or_filters unlike frappe.client.get_count
        result = frappe.get_list(
            doctype,
            fields=["name"],
            filters=filters or {},
            or_filters=or_filters or [],
            limit_page_length=0,  # Get all matching records
            ignore_permissions=False,
        )
        
        return len(result)
        
    except Exception as e:
        frappe.log_error(f"Error fetching ticket count: {str(e)}")
        # Return 0 on error - frontend will handle gracefully
        return 0

@frappe.whitelist()
def get_ticket_list_data(
    doctype="HD Ticket",
    filters=None,
    or_filters=None,
    order_by="modified desc",
    page_length=20,
    rows=None,
    columns=None,
    show_customer_portal_fields=False,
):
    """
    Get ticket list data with support for OR filters.
    Custom implementation that uses frappe.get_list() directly with or_filters support.
    Returns the same structure as helpdesk.api.doc.get_list_data.
    """
    try:
        # Parse JSON strings if passed as strings
        if isinstance(filters, str):
            filters = json.loads(filters) if filters else {}
        if isinstance(or_filters, str):
            or_filters = json.loads(or_filters) if or_filters else []
        if isinstance(rows, str):
            rows = json.loads(rows) if rows else None
        if isinstance(columns, str):
            columns = json.loads(columns) if columns else None
        
        # Normalize filters and or_filters
        if filters is None:
            filters = {}
        if or_filters is None:
            or_filters = []
        
        # Handle @me support (convert @me to current user)
        from helpdesk.api.doc import handle_at_me_support
        filters = handle_at_me_support(filters)
        
        # Parse rows and columns
        if rows is None:
            rows = []
        if columns is None:
            columns = []
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = []
        
        # Ensure columns is a list
        if not isinstance(columns, list):
            columns = []
        
        # Default columns if empty
        if not columns:
            columns = [
                {"label": "Name", "type": "Data", "key": "name", "width": "16rem"},
                {
                    "label": "Last Modified",
                    "type": "Datetime",
                    "key": "modified",
                    "width": "8rem",
                },
            ]
        
        # Default rows if empty
        if not rows:
            rows = ["name"]
        
        # Ensure name is in rows
        if "name" not in rows:
            rows.append("name")
        
        # Add all column keys to rows if not present
        for column in columns:
            if column.get("key") and column.get("key") not in rows:
                rows.append(column.get("key"))
        
        # Get field metadata
        from frappe.model import no_value_fields
        meta_fields = frappe.get_meta(doctype).fields
        meta_fields = [field for field in meta_fields if field.fieldtype not in no_value_fields]
        fields = [
            {
                "label": field.label,
                "type": field.fieldtype,
                "value": field.fieldname,
                "options": field.options,
            }
            for field in meta_fields
            if field.label and field.fieldname
        ]
        
        # Add standard fields
        std_fields = [
            {"label": "Name", "type": "Data", "value": "name"},
            {"label": "Created On", "type": "Datetime", "value": "creation"},
            {"label": "Last Modified", "type": "Datetime", "value": "modified"},
            {
                "label": "Modified By",
                "type": "Link",
                "value": "modified_by",
                "options": "User",
            },
            {"label": "Assigned To", "type": "Text", "value": "_assign"},
            {"label": "Owner", "type": "Link", "value": "owner", "options": "User"},
            {"label": "Response By", "type": "Datetime", "value": "response_by"},
            {"label": "Resolution By", "type": "Datetime", "value": "resolution_by"},
        ]
        
        for field in std_fields:
            if field.get("value") not in rows:
                rows.append(field.get("value"))
            if field not in fields:
                fields.append(field)
        
        # Handle customer portal fields filtering
        if show_customer_portal_fields:
            from helpdesk.api.doc import get_customer_portal_fields
            fields = get_customer_portal_fields(doctype, fields)
        
        # Get ticket data using frappe.get_list with or_filters support
        data = (
            frappe.get_list(
                doctype,
                fields=rows,
                filters=filters,
                or_filters=or_filters if or_filters else None,
                order_by=order_by,
                page_length=page_length,
            )
            or []
        )
        for tic in data:
            emp=frappe.db.get_value("Employee",{"user_id":tic.raised_by},"employee_name")
            if emp:
                tic["raise_by_name"]=emp
        
        # Calculate total count with same filters and or_filters
        # Use frappe.get_list with minimal fields and count the results
        total_count_result = frappe.get_list(
            doctype,
            filters=filters,
            or_filters=or_filters if or_filters else None,
            fields=["name"],
            limit_page_length=0,  # Get all matching records
        )
        total_count = len(total_count_result) if total_count_result else 0
        
        # Return response matching helpdesk.api.doc.get_list_data structure
        return {
            "data": data,
            "columns": columns,
            "rows": rows,
            "fields": fields if doctype == "HD Ticket" else [],
            "total_count": total_count,
            "row_count": len(data),
            "group_by_field": None,
            "view_type": None,
        }
        
    except Exception as e:
        frappe.log_error(f"Error fetching ticket list data: {str(e)}", "get_ticket_list_data")
        # Return empty structure instead of throwing to avoid 417 errors
        return {
            "data": [],
            "columns": [],
            "rows": [],
            "fields": [],
            "total_count": 0,
            "row_count": 0,
            "group_by_field": None,
            "view_type": None,
        }

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
