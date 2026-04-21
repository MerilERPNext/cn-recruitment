import frappe
from frappe import _

DOCTYPENAME = "Employee Onboarding"


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
        "data": {},
    }


def _resolve_onboarding_name(name=None, email=None):
    if name:
        if not frappe.db.exists(DOCTYPENAME, name):
            return None
        return name

    if not email:
        session_user = frappe.session.user
        if session_user and session_user != "Guest":
            email = frappe.db.get_value("User", session_user, "email") or session_user

    if not email:
        return None

    return frappe.db.get_value(
        DOCTYPENAME,
        {"job_applicant": email, "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )


@frappe.whitelist()
def get_dashboard(name=None, email=None):
    try:
        onboarding_name = _resolve_onboarding_name(name=name, email=email)

        if not onboarding_name:
            return _error_response("No Employee Onboarding record found for this candidate.", 404)

        row = frappe.db.get_value(
            DOCTYPENAME,
            onboarding_name,
            ["name", "date_of_joining", "designation"],
            as_dict=True,
        )

        if not row:
            return _error_response("Employee Onboarding record could not be loaded.", 404)

        data = {
            "name": row.name,
            "date_of_joining": row.date_of_joining,
            "designation": row.designation,
        }

        return _success_response("Onboarding dashboard fetched successfully.", data)

    except frappe.PermissionError:
        return _error_response("You are not permitted to access this onboarding record.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Onboarding Dashboard API Error")
        return _error_response("Unable to fetch onboarding dashboard right now.", 500)
