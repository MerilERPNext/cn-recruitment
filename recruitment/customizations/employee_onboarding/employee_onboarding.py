import requests
import frappe
from frappe.model.mapper import get_mapped_doc
import json

@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    doc = frappe.get_doc("Employee Onboarding", source_name)
    settings = frappe.get_doc('Recruitment Settings')

    def set_missing_values(source, target):
        target.personal_email = frappe.db.get_value("Job Applicant", source.job_applicant, "email_id")
        target.status = "Active"

    field_map = {}
    for fieldrow in settings.mapping_fields:
        field_map[fieldrow.employee_onboarding] = fieldrow.employee

    doc = get_mapped_doc(
        "Employee Onboarding",
        source_name,
        {
            "Employee Onboarding": {
                "doctype": "Employee",
                "field_map": field_map,
            }
        },
        target_doc,
        set_missing_values,
    )
    return doc

@frappe.whitelist()
def fetch_employee_data_by_its_id(its_id):
    """
    Fetch employee data from payroll API based on ITS ID.

    Args:
        its_id: The ITS ID of the employee

    Returns:
        Dictionary containing employee information:
        - employee_name
        - custom_primary_mobile_number
        - custom_whatsapp_number
        - custom_email_id
        - custom_farig_year
        - custom_farig_darajah
    """
    if not its_id:
        frappe.throw("ITS ID is required")

    # Fetch API settings from ITS Settings DocType
    try:
        its_settings = frappe.get_single("ITS Settings")
        api_url = its_settings.api_url
        api_key = its_settings.api_key

        if not api_url or not api_key:
            frappe.throw("ITS Settings: API URL and API Key are required. Please configure ITS Settings.")
    except Exception as e:
        frappe.throw(f"Failed to fetch ITS Settings. Please configure ITS Settings first. Error: {str(e)}")

    # API endpoint
    url = api_url

    # Request payload
    payload = {
        "its": str(its_id),
        "key": api_key
    }
    print("nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",payload)

    # Request headers
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Make POST request
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()  # Raise error for bad status codes

        data = response.json()
        print("=" * 80)
        print("PAYROLL API RESPONSE:")
        print("  Full response:", data)
        print("  Keys in response:", list(data.keys()) if isinstance(data, dict) else "Not a dict")
        print("  fullname:", data.get("fullname"))
        print("  mobile:", data.get("mobile"))
        print("  whatsapp:", data.get("whatsapp"))
        print("  email:", data.get("email"))
        print("=" * 80)

        # Log the API response for debugging
        frappe.log_error(
            message=frappe.as_json(data, indent=2),
            title=f"Payroll API Response - ITS ID: {its_id}"
        )

        # Extract employee data from response
        # Map API response fields to Employee Onboarding fields
        # Try multiple possible field name variations
        mobile = data.get("mobile") or data.get("mobile_number") or data.get("phone") or ""
        print("RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRr",mobile)
        whatsapp = data.get("whatsapp") or data.get("whatsapp_number") or data.get("whatsapp_no") or ""
        print("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTt",whatsapp)

        print("MAPPED VALUES:")
        print("  mobile (mapped):", mobile)
        print("  whatsapp (mapped):", whatsapp)
        print("=" * 80)

        employee_data = {
            "employee_name": data.get("fullname") or "",
            "custom_its_name": data.get("fullname") or "",
            "custom_its_mobile": mobile,
            "custom_whatsapp_no": whatsapp,
            "custom_its_email": data.get("email") or "",
            "custom_farigh_year": data.get("farig_year") or "",
            "custom_farig_darajah": data.get("farig_darajah") or "",
            "success": True,
            "message": "Employee data fetched successfully",
            "raw_response": data
        }

        return employee_data

    except requests.exceptions.Timeout:
        frappe.log_error(
            message=f"Request timeout for ITS ID: {its_id}",
            title="Payroll API Timeout"
        )
        frappe.throw("Request timeout. Please try again.")

    except requests.exceptions.RequestException as e:
        frappe.log_error(
            message=str(e),
            title=f"Payroll API Error - ITS ID: {its_id}"
        )
        frappe.throw(f"Failed to fetch employee data: {str(e)}")

    except Exception as e:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Error fetching employee data - ITS ID: {its_id}"
        )
        frappe.throw(f"An error occurred: {str(e)}")
