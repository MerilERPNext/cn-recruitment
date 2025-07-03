import frappe
import json



#API for creation Job Requisition

@frappe.whitelist(allow_guest=False)
def create_job_requisition(data):
    try:
        if isinstance(data, str):
            data = json.loads(data)

        doc = frappe.new_doc("Job Requisition")

        # Required fields
        required_fields = [
            "designation", "department", "custom_location", "requested_by",
            "no_of_positions", "expected_by",
            "custom__employee_type", "custom_salary"
        ]
        for field in required_fields:
            if not data.get(field):
                return {
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }
            setattr(doc, field, data[field])

        # ✅ Auto-fetch designation from Employee
        requested_by = data.get("requested_by")
        employee_designation = frappe.db.get_value("Employee", requested_by, "designation")
        if not employee_designation:
            return {
                "status": "error",
                "message": f"Employee '{requested_by}' does not have a designation"
            }

        doc.requested_by_designation = employee_designation

        # ✅ Append to custom_qualifications
        qualifications = data.get("custom_qualifications", [])
        if not qualifications:
            return {
                "status": "error",
                "message": "Qualifications are required"
            }

        for q in qualifications:
            if not q.get("qualification") or not q.get("qualification_level"):
                return {
                    "status": "error",
                    "message": "Each qualification must include 'qualification' and 'qualification_level'"
                }
            doc.append("custom_qualifications", {
                "qualification": q["qualification"],
                "qualification_level": q["qualification_level"]
            })

        # ✅ Append to custom_skills
        skills = data.get("custom_skills", [])
        if not skills:
            return {
                "status": "error",
                "message": "Skills are required"
            }

        for s in skills:
            if not s.get("skill") or not s.get("proficiency"):
                return {
                    "status": "error",
                    "message": "Each skill must include 'skill' and 'proficiency'"
                }
            doc.append("custom_skills", {
                "skill": s["skill"],
                "proficiency": s["proficiency"]
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": "Job Requisition created",
            "name": doc.name
        }

    except Exception as e:
        frappe.log_error(title="Job Requisition Creation Failed", message=frappe.get_traceback())
        frappe.db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }



#API for Filter the List of  Job Requisition

@frappe.whitelist()
def get_my_job_requisitions_on_filter(query=None):
    conditions = ""
    if query:
        query = f"%{query}%"
        conditions = """WHERE (
            jr.designation LIKE %(query)s OR
            jr.department LIKE %(query)s OR
            jr.custom_location LIKE %(query)s
        )"""

    data = frappe.db.sql(f"""
        SELECT
            jr.name,
            jr.designation,
            jr.status,
            jr.requested_by,
            jr.department,
            jr.custom_location
        FROM `tabJob Requisition` jr
        {conditions}
        ORDER BY jr.creation DESC
        LIMIT 20
    """, {"query": query} if query else {}, as_dict=True)

    return data

#API to get List of Job Requisition
@frappe.whitelist()
def get_my_job_requisitions(query=None):
    

    data = frappe.db.sql(f"""
        SELECT
            jr.name,
            jr.designation,
            jr.status,
            jr.requested_by,
            jr.department,
            jr.custom_location
        FROM `tabJob Requisition` jr
        ORDER BY jr.creation DESC
        LIMIT 20
    """, {"query": query} if query else {}, as_dict=True)

    return data


#API for Updating the  Job Requisition
@frappe.whitelist()
def update_job_requisition(name, updates):
   
    try:
        if isinstance(updates, str):
            updates = json.loads(updates)

        if not frappe.db.exists("Job Requisition", name):
            return {"status": "error", "message": f"Job Requisition '{name}' not found"}

        doc = frappe.get_doc("Job Requisition", name)

        # Update fields
        for field, value in updates.items():
            if hasattr(doc, field):
                setattr(doc, field, value)

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": f"Job Requisition '{name}' updated successfully"
        }

    except Exception as e:
        frappe.log_error(title="Update Job Requisition Failed", message=frappe.get_traceback())
        frappe.db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }



#API for Getting Details of Job Requisition
@frappe.whitelist()
def get_job_requisition_details(requisition_name):
    if not requisition_name:
        frappe.throw(_("Job Requisition ID is required"))

    # Get Job Requisition
    job_req = frappe.get_doc("Job Requisition", requisition_name)

    # Get Job Openings under this Job Requisition
    job_openings = frappe.get_all(
        "Job Opening",
        filters={"job_requisition": requisition_name},
        fields=["name"]
    )
    job_opening_names = [jo.name for jo in job_openings]

    if not job_opening_names:
        return {
            "job_requisition": {
                "name": job_req.name,
                "designation": job_req.designation,
                "department": job_req.department,
                "employment_type": job_req.custom__employee_type,
                "expected_by": job_req.expected_by,
                "no_of_positions": job_req.no_of_positions,
                "description": job_req.description,
                "status": job_req.status,
                "salary_range": job_req.custom_salary,
                "deadline": job_req.expected_by,
                "location":job_req.custom_location
            },
            "interviews": [],
            "review_count": 0,
            "job_applicant_count": 0,
            "interview_count": 0
        }

    # Get Job Applicants for the Job Openings under this Job Requisition
    job_applicants = frappe.get_all(
        "Job Applicant",
        filters={"job_title": ["in", job_opening_names]},
        fields=["name"]
    )
    job_applicant_names = [ja.name for ja in job_applicants]

    # Get Interviews for those applicants
    interviews = []
    interview_names = []
    if job_applicant_names:
        interviews = frappe.get_all(
            "Interview",
            filters={"job_applicant": ["in", job_applicant_names]},
            fields=["name", "interview_round", "status", "job_applicant"]
        )
        interview_names = [i.name for i in interviews]

    # Count Interview Feedback
    feedback_count = frappe.db.count("Interview Feedback", {"interview": ["in", interview_names]}) if interview_names else 0
    interviews_count = len(interview_names)
    job_applicants_count = len(job_applicant_names)

    return {
        "job_requisition": {
            "name": job_req.name,
            "designation": job_req.designation,
            "department": job_req.department,
            "employment_type": job_req.custom__employee_type,
            "expected_by": job_req.expected_by,
            "no_of_positions": job_req.no_of_positions,
            "description": job_req.description,
            "status": job_req.status,
            "salary_range": job_req.custom_salary,
            "deadline": job_req.expected_by
        },
        "interviews": interviews,
        "review_count": feedback_count,
        "job_applicant_count": job_applicants_count,
        "interview_count": interviews_count
    }
