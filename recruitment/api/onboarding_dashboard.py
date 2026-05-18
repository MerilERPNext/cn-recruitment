import frappe
from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity

DOCTYPENAME = "Employee Onboarding"


def _success_response(message, data):
    frappe.local.response["http_status_code"] = 200
    return {"success": True, "message": message, "data": data}


def _error_response(message, status_code=400):
    frappe.local.response["http_status_code"] = status_code
    return {"success": False, "message": message, "data": {}}




@candidate_required
def get_dashboard(email):
    try:
        if not email:
            return _error_response("email is required.", 400)
        enforce_candidate_identity(email=email)

        row = frappe.db.get_value(
            DOCTYPENAME,
            {"job_applicant": email, "docstatus": ("<", 2)},
            ["name", "date_of_joining", "designation", "department", "custom_work_location"],
            as_dict=True,
            order_by="creation desc",
        )

        if not row:
            # No Employee Onboarding record – fall back to Job Applicant status
            ja_status = frappe.db.get_value("Job Applicant", email, "status") or ""
            if ja_status == "Accepted":
                return _success_response(
                    "Onboarding dashboard fetched successfully.",
                    {
                        "name": None,
                        "date_of_joining": None,
                        "designation": None,
                        "department": None,
                        "work_location": None,
                        "work_location_details": None,
                        "key_contacts": [],
                        "onboarding_status": True,
                        "form_completion": {
                            "total_fields": 0,
                            "filled_fields": 0,
                            "percentage": 0.0,
                        },
                        "onboarding_stage": "Onboarding Pending",
                    },
                )
            # Neither condition satisfied
            return _success_response(
                "Onboarding dashboard fetched successfully.",
                {
                    "name": None,
                    "date_of_joining": None,
                    "designation": None,
                    "department": None,
                    "work_location": None,
                    "work_location_details": None,
                    "key_contacts": [],
                    "onboarding_status": False,
                    "form_completion": {
                        "total_fields": 0,
                        "filled_fields": 0,
                        "percentage": 0.0,
                        "fields": [],
                    },
                    "onboarding_stage": "Onboarding Pending",
                },
            )

        # ── Onboarding Status ──────────────────────────────────────────────────
        # true  : Employee Onboarding record exists
        # true  : No record yet but Job Applicant status is "Accepted"
        # false : Neither condition is met
        onboarding_status = True  # we already have a record at this point

        # ── Form Completion (from custom_candidate_portal_fields) ──────────────
        # A field is "filled" when the candidate has submitted data (current_value is non-empty).
        total_fields, filled_fields = frappe.db.sql(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN current_value IS NOT NULL AND current_value != '' THEN 1 ELSE 0 END) AS filled
            FROM `tabEmployee Onboarding Portal Field`
            WHERE parent = %s AND parenttype = %s
            """,
            (row.name, DOCTYPENAME),
        )[0]
        total_fields = int(total_fields or 0)
        filled_fields = int(filled_fields or 0)
        percentage = round((filled_fields / total_fields) * 100, 2) if total_fields else 0.0
        form_completion = {
            "total_fields": total_fields,
            "filled_fields": filled_fields,
            "percentage": percentage,
        }

        # ── Onboarding Stage ──────────────────────────────────────────────────
        if form_completion["percentage"] == 100.0 and form_completion["total_fields"] > 0:
            onboarding_stage = "Onboarding Complete"
        else:
            onboarding_stage = "Onboarding Pending"

        # ── Key Contacts ──────────────────────────────────────────────────────
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

        # ── Work Location ─────────────────────────────────────────────────────
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
            "department": row.department,
            "work_location": row.custom_work_location,
            "work_location_details": work_location_details,
            "key_contacts": key_contacts,
            # ── New fields ──────────────────────────────────────────────────
            "onboarding_status": onboarding_status,
            "form_completion": form_completion,
            "onboarding_stage": onboarding_stage,
        }

        return _success_response("Onboarding dashboard fetched successfully.", data)

    except frappe.PermissionError:
        return _error_response("You are not permitted to access this onboarding record.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Onboarding Dashboard API Error")
        return _error_response("Unable to fetch onboarding dashboard right now.", 500)
