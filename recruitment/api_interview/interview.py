import frappe

@frappe.whitelist()
def get_interview_and_round(interview_id):
    interview = frappe.get_doc("Interview", interview_id)

    rounds_data = []
    child_table = interview.get("interview_rounds") or []  # ✅ correct fieldname
    for round in child_table:
        rounds_data.append({
            "round_name": round.round_name,
            "status": round.status,
            "scheduled_on": round.scheduled_on
        })

    return {
        "status": "success",
        "interview": interview,
        "rounds": rounds_data
    }



import json
import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)  # Only if Guest access is needed; remove if only authenticated users should post
def create_interview_feedback():
    if frappe.request.method != "POST":
        frappe.throw(_("Only POST requests are allowed"))

    try:
        raw_data = frappe.request.data
        if not raw_data:
            frappe.throw(_("No data received in request body"))

        try:
            data = json.loads(raw_data)
        except Exception:
            frappe.throw(_("Invalid JSON format in request body"))

        # Validate top-level required fields
        required_fields = [
            "interview", "interviewer", "interview_round",
            "result", "job_applicant", "feedback", "rating"
        ]

        for field in required_fields:
            if not data.get(field):
                frappe.throw(_("Missing required field: {0}").format(field))

        # Validate linked documents
        if not frappe.db.exists("Interview", data["interview"]):
            frappe.throw(_("Interview '{0}' does not exist").format(data["interview"]))
        if not frappe.db.exists("Interview Round", data["interview_round"]):
            frappe.throw(_("Interview Round '{0}' does not exist").format(data["interview_round"]))
        if not frappe.db.exists("Job Applicant", data["job_applicant"]):
            frappe.throw(_("Job Applicant '{0}' does not exist").format(data["job_applicant"]))
        if not frappe.db.exists("User", data["interviewer"]):
            frappe.throw(_("Interviewer '{0}' does not exist").format(data["interviewer"]))

        # Validate skill_assessment child table
        if not data.get("skill_assessment") or not isinstance(data["skill_assessment"], list):
            frappe.throw(_("Missing or invalid field: skill_assessment"))

        for i, row in enumerate(data["skill_assessment"], start=1):
            if not row.get("skill"):
                frappe.throw(_("Missing 'skill' in skill_assessment row {0}").format(i))
            if not row.get("rating"):
                frappe.throw(_("Missing 'rating' in skill_assessment row {0}").format(i))

        # Create Interview Feedback document
        doc = frappe.new_doc("Interview Feedback")
        doc.update(data)
        doc.flags.ignore_permissions = True  # Optional: Only use if Guest user must be allowed to insert
        doc.insert()
        frappe.db.commit()

        return {
            "status": "success",
            "message": "Interview feedback submitted successfully.",
            "name": doc.name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Interview Feedback API Error")
        frappe.throw(_("Error submitting feedback: {0}").format(str(e)))