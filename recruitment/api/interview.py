# import frappe
# from frappe import _

# @frappe.whitelist()
# def create_interview(data: str):
#     """
#     Custom API to create an Interview record.
#     `data` should be a JSON string with the required fields.
#     """
#     try:
#         data = frappe.parse_json(data)

#         doc = frappe.new_doc("Interview")
#         doc.job_applicant = data.get("job_applicant")
#         doc.interview_round = data.get("interview_round")
#         doc.date = data.get("date")
#         doc.time = data.get("time")
#         doc.mode_of_interview = data.get("mode_of_interview")
#         doc.status = data.get("status")
#         doc.interview_panel = data.get("interview_panel", [])  # must be list of dicts
#         doc.insert()
#         return {"success": True, "name": doc.name}
    
#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Interview API Error")
#         return {"success": False, "error": str(e)}


# your_app/api/interview.py

import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_interview_data():
    try:
        # Fetch all interviews (you can filter or paginate as needed)
        interviews = frappe.get_all("Interview", fields=["*"])  # get all fields
        return {
            "status": "success",
            "data": interviews
        }
    except Exception as e:
        frappe.log_error(message=str(e), title="Interview API Error")
        return {
            "status": "error",
            "message": str(e)
        }
