import frappe

DOCTYPENAME = "Employee Onboarding"


def _success_response(message, data):
    frappe.local.response["http_status_code"] = 200
    return {"success": True, "message": message, "data": data}


def _error_response(message, status_code=400):
    frappe.local.response["http_status_code"] = status_code
    return {"success": False, "message": message, "data": {}}


@frappe.whitelist()
def get_dashboard(email):
    try:
        if not email:
            return _error_response("email is required.", 400)

        row = frappe.db.get_value(
            DOCTYPENAME,
            {"job_applicant": email, "docstatus": ("<", 2)},
            ["name", "date_of_joining", "designation"],
            as_dict=True,
            order_by="creation desc",
        )

        if not row:
            return _error_response("No Employee Onboarding record found for this candidate.", 404)

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
