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
            ["name", "date_of_joining", "designation", "custom_work_location"],
            as_dict=True,
            order_by="creation desc",
        )

        if not row:
            return _error_response("No Employee Onboarding record found for this candidate.", 404)

        key_contacts = frappe.get_all(
            "Employee Key Contact",
            filters={"parent": row.name, "parenttype": DOCTYPENAME},
            fields=["name", "employee", "role", "email", "phone_number", "idx"],
            order_by="idx asc",
        )

        for contact in key_contacts:
            contact["employee_name"] = (
                frappe.db.get_value("Employee", contact["employee"], "employee_name")
                if contact.get("employee")
                else None
            )

        work_location_details = None
        if row.custom_work_location:
            work_location_details = frappe.db.get_value(
                "Branch",
                row.custom_work_location,
                [
                    "name",
                    "branch",
                    "custom_location_code",
                    "custom_address",
                    "custom_location_area",
                    "custom_office_area",
                    "custom_office_city",
                    "custom_city",
                    "custom_state",
                    "custom_country",
                    "custom_pin_code",
                    "custom_office_email",
                    "custom_mobile_no",
                    "custom_telephone_no",
                    "custom_google_map_link",
                    "custom_location_url",
                ],
                as_dict=True,
            )

        data = {
            "name": row.name,
            "date_of_joining": row.date_of_joining,
            "designation": row.designation,
            "work_location": row.custom_work_location,
            "work_location_details": work_location_details,
            "key_contacts": key_contacts,
        }

        return _success_response("Onboarding dashboard fetched successfully.", data)

    except frappe.PermissionError:
        return _error_response("You are not permitted to access this onboarding record.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Onboarding Dashboard API Error")
        return _error_response("Unable to fetch onboarding dashboard right now.", 500)
