import frappe
import re

DOCTYPENAME = "Employee Onboarding"
MAX_PAGE_LENGTH = 100


def _success_response(message, data, **meta):
    frappe.local.response["http_status_code"] = 200
    response = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta:
        response["meta"] = meta
    return response


def _error_response(message, status_code=400):
    frappe.local.response["http_status_code"] = status_code
    return {
        "success": False,
        "message": message,
        "data": [],
    }


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


def _to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sanitize_order_by(order_by, allowed_fields, default_field):
    default_order = f"{default_field} asc"
    raw = (order_by or "").strip() or default_order
    match = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*)(?:\s+(asc|desc))?", raw, flags=re.IGNORECASE)

    if not match:
        raise frappe.ValidationError(
            "Invalid order_by format. Use '<fieldname> asc|desc', e.g. 'boarding_status asc'."
        )

    fieldname = match.group(1)
    direction = (match.group(2) or "asc").lower()

    # Backward compatibility: some clients still send custom_final_status.
    if fieldname == "custom_final_status":
        fieldname = "boarding_status"

    if fieldname not in allowed_fields:
        raise frappe.ValidationError(
            f"Invalid order_by field '{fieldname}'. Allowed fields: {', '.join(sorted(allowed_fields))}."
        )

    return f"{fieldname} {direction}"


@frappe.whitelist()
def get_employee_onboarding_list(order_by="boarding_status asc", page_length=10, start=0):
    """
    Employee Onboarding list API for frontend list view.
    Accepts: order_by, page_length, start
    """
    try:
        frappe.has_permission(DOCTYPENAME, "read", throw=True)

        page_length_value = _to_int(page_length)
        start_value = _to_int(start)

        if page_length_value is None:
            return _error_response("Invalid page_length. It must be an integer.", 400)
        if start_value is None:
            return _error_response("Invalid start. It must be an integer.", 400)
        if page_length_value < 1:
            return _error_response("Invalid page_length. It must be >= 1.", 400)
        if start_value < 0:
            return _error_response("Invalid start. It must be >= 0.", 400)

        page_length_value = min(page_length_value, MAX_PAGE_LENGTH)

        requested_fields = [
            "name",
            "employee_name",
            "job_applicant",
            "employee",
            "department",
            "designation",
            "date_of_joining",
            "boarding_begins_on",
            "boarding_status",
            "creation",
            "modified",
        ]

        meta = frappe.get_meta(DOCTYPENAME)
        valid_fields = {"name"}
        valid_fields.update(df.fieldname for df in meta.fields if df.fieldname)
        fields = [field for field in requested_fields if field in valid_fields]

        if not fields:
            return _error_response("No valid fields configured for list view.", 500)

        allowed_order_fields = {
            "name",
            "employee_name",
            "department",
            "designation",
            "date_of_joining",
            "boarding_status",
            "creation",
            "modified",
        }
        allowed_order_fields = {field for field in allowed_order_fields if field in valid_fields}
        default_order_field = "boarding_status" if "boarding_status" in allowed_order_fields else "creation"
        safe_order_by = _sanitize_order_by(order_by, allowed_order_fields, default_order_field)

        data = frappe.get_list(
            DOCTYPENAME,
            fields=fields,
            order_by=safe_order_by,
            start=start_value,
            page_length=page_length_value,
        )

        count_result = frappe.get_list(
            DOCTYPENAME,
            fields=["count(name) as total_count"],
            page_length=1,
        )
        total_count = int((count_result[0] or {}).get("total_count") or 0) if count_result else 0

        return _success_response(
            "Employee onboarding list fetched successfully.",
            data,
            pagination={
                "start": start_value,
                "page_length": page_length_value,
                "total_count": total_count,
                "has_more": (start_value + page_length_value) < total_count,
            },
            order_by=safe_order_by,
        )
    except frappe.ValidationError as e:
        return _error_response(str(e), 400)
    except frappe.PermissionError:
        return _error_response("You are not permitted to access Employee Onboarding records.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Employee Onboarding List API Error")
        return _error_response("Unable to fetch Employee Onboarding list right now.", 500)
