import frappe
import json
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_interview_and_round(interview_id=None):
    if not interview_id:
        return {"status": "error", "message": "Interview ID is required"}

    try:
        interview = frappe.get_doc("Interview", interview_id)

        rounds_data = []
        child_table = interview.get("interview_rounds") or []
        for round in child_table:
            rounds_data.append({
                "round_name": round.round_name,
                "status": round.status,
                "scheduled_on": round.scheduled_on
            })

        return {
            "status": "success",
            "message": {
                "interview": interview.as_dict(),
                "rounds": rounds_data
            }
        }

    except frappe.DoesNotExistError:
        return {"status": "error", "message": "Interview not found"}


import frappe

@frappe.whitelist(allow_guest=True)
def get_custom_interviews():
    interview_names = frappe.get_all("Interview", fields=["name", "from_time", "to_time","status"])
    
    results = []
    for row in interview_names:
        doc = frappe.get_doc("Interview", row.name)
        results.append({
            "name": doc.name,
            "from_time": doc.from_time,
            "to_time": doc.to_time,
            "status": doc.status,
            "interviewer": getattr(doc, "interview_details", "")
        })

    return {
        "data": results
    }

# recruitment/api/skill.py
import frappe

@frappe.whitelist(allow_guest=True)
def get_skill_names():
    skills = frappe.get_all("Skill", fields=["skill_name", "description"])

    return {
        "success": True,
        "data": skills  # returns a list of dicts with skill_name and description
    }







@frappe.whitelist(allow_guest=True)  
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

        # Assign all fields
        doc.interview = data["interview"]
        doc.interviewer = data["interviewer"]
        doc.interview_round = data["interview_round"]
        doc.job_applicant = data["job_applicant"]
        doc.feedback = data["feedback"]
        doc.result = data["result"]
        doc.average_rating = float(data["rating"])

        # Assign skill_assessment child table
        for row in data["skill_assessment"]:
            doc.append("skill_assessment", {
                "skill": row["skill"],
                "rating": row["rating"],
                "comments": row.get("comments", "")
            })

        # Insert and submit in correct sequence
        doc.flags.ignore_permissions = True
        doc.flags.ignore_validate = True  # Skip validation checks
        doc.flags.ignore_mandatory = True  # Skip mandatory field checks if needed
        doc.insert(ignore_permissions=True)
        doc.submit()  # Submit after successful insertion
        frappe.db.commit()

        return {
            "status": "success",
            "message": "Interview feedback submitted successfully.",
            "name": doc.name,
            "saved_result": doc.result,
            "saved_rating": doc.average_rating,
            "docstatus": doc.docstatus
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Interview Feedback API Error")
        return {
            "status": "error",
            "message": _("Error submitting feedback: {0}").format(str(e))
        }