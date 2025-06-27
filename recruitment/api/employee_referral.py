import frappe
import json
import base64
from frappe.utils import nowdate,formatdate, format_time, get_datetime

@frappe.whitelist()
def submit_employee_referral(data, resume_file=None):
    try:
        # Parse incoming data
        data = json.loads(data)

        if isinstance(resume_file, str):
            resume_file = json.loads(resume_file)

        # Split full name into first and last name
        full_name = data.get("candidate_name", "").strip()
        name_parts = full_name.split()
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        if not first_name or not data.get("email"):
            frappe.throw("Candidate name and email are mandatory.")

        # ✅ Get logged-in user's employee ID
        user = frappe.session.user
        employee_id = frappe.db.get_value("Employee", {"user_id": user}, "name")
        employee_name = frappe.db.get_value("Employee", employee_id, "employee_name") if employee_id else None

        if not employee_id:
            frappe.throw("Logged-in user is not linked to any Employee record.")

        # Create the Employee Referral document
        doc = frappe.new_doc("Employee Referral")
        doc.first_name = first_name
        doc.last_name = last_name
        doc.full_name = full_name
        doc.email = data.get("email")
        doc.contact_no = data.get("contact_no")
        doc.date = nowdate()
        doc.status = "Pending"
        doc.for_designation = data.get("for_designation")
        doc.current_employer = data.get("current_employer")
        doc.current_job_title = data.get("current_job_title")
        doc.work_references = data.get("work_references")
        doc.qualification_reason = data.get("qualification_reason")

        # ✅ Set referrer to logged-in employee
        doc.referrer = employee_id
        doc.referrer_name = employee_name

        doc.insert(ignore_permissions=True)

        # Handle resume attachment
        if resume_file and resume_file.get("filename") and resume_file.get("content"):
            file_doc = frappe.get_doc({
                "doctype": "File",
                "file_name": resume_file["filename"],
                "attached_to_doctype": doc.doctype,
                "attached_to_name": doc.name,
                "is_private": 1,
                "content": resume_file["content"],
            })
            file_doc.insert(ignore_permissions=True)
            doc.resume = file_doc.file_url
            doc.save()

        frappe.db.commit()

        return {
            "status": "success",
            "name": doc.name,
            "resume_url": doc.resume,
            "message": f"Referral {doc.name} submitted successfully."
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Referral Submission Error")
        return {
            "status": "error",
            "message": str(e)
        }




@frappe.whitelist()
def get_my_referrals():
    user = frappe.session.user

    # Get the Employee ID for the logged-in user
    employee_id = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not employee_id:
        return {
            "status": "error",
            "message": "No Employee record linked to this user."
        }

    # Fetch referrals where current user is the referrer
    referrals = frappe.get_all(
        "Employee Referral",
        filters={"referrer": employee_id},
        fields=["name", "full_name", "email", "status", "for_designation", "date", "referrer"],
        order_by="creation desc"
    )

    return {
        "status": "success",
        "referrals": referrals
    }


@frappe.whitelist()
def get_referral_status(referral_id):
    if not referral_id:
        return {"status": "error", "message": "Referral ID is required."}

    referral = frappe.get_doc("Employee Referral", referral_id)
    email = referral.email
    referrer = referral.referrer
    referrer_name = referral.referrer_name
    referral_date = get_datetime(referral.date)

    status_map = []
    job_applicant_id = None
    interview_datetime = None

    # Status priority (higher means more progressed)
    status_priority = {
        "Application Received": 1,
        "Interview Scheduled": 2,
        "Interview Cleared": 3,
        "Interview Under Review": 3,
        "Interview Not Cleared": 3,
        "Interview Pending": 3,
        "Appointment Letter Issued": 4,
        "Job Offer: Pending": 5,
        "Job Offer: Accepted": 6,
        "Job Offer: Rejected": 6
    }

    # 1. Job Applicant
    job_app = frappe.get_all(
        "Job Applicant",
        filters={"email_id": email},
        fields=["name", "creation"],
        order_by="creation desc",
        limit=1
    )
    if job_app:
        job_applicant_id = job_app[0].name
        status_map.append({
            "status": "Application Received",
            "date": get_datetime(job_app[0].creation),
            "priority": status_priority["Application Received"]
        })

    # 2. Interview (with status)
    if job_applicant_id:
        interviews = frappe.get_all(
            "Interview",
            filters={"job_applicant": job_applicant_id},
            fields=["name", "scheduled_on", "status"],
            order_by="scheduled_on desc"
        )
        for iv in interviews:
            if iv.get("scheduled_on"):
                interview_datetime = get_datetime(iv.scheduled_on)

            if iv.status == "Cleared":
                status_map.append({
                    "status": "Interview Cleared",
                    "date": get_datetime(iv.scheduled_on),
                    "priority": status_priority["Interview Cleared"]
                })
                break
            elif iv.status in ["Scheduled"]:
                status_map.append({
                    "status": "Interview Scheduled",
                    "date": get_datetime(iv.scheduled_on),
                    "priority": status_priority["Interview Scheduled"]
                })
            elif iv.status in ["Under Review",]:
                status_map.append({
                    "status": "Interview Under Review",
                    "date": get_datetime(iv.scheduled_on),
                    "priority": status_priority["Interview Under Review"]
                })
            elif iv.status in ["Pending",]:
                status_map.append({
                    "status": "Interview Pending",
                    "date": get_datetime(iv.scheduled_on),
                    "priority": status_priority["Interview Pending"]
                })
            elif iv.status in ["Rejected",]:
                status_map.append({
                    "status": "Interview Not Cleared",
                    "date": get_datetime(iv.scheduled_on),
                    "priority": status_priority["Interview Not Cleared"]
                })
            
                break

        # 3. Appointment Letter
        offer_letter = frappe.get_all(
            "Appointment Letter",
            filters={"job_applicant": job_applicant_id},
            fields=["name", "creation"],
            order_by="creation desc",
            limit=1
        )
        if offer_letter:
            status_map.append({
                "status": "Appointment Letter Issued",
                "date": get_datetime(offer_letter[0].creation),
                "priority": status_priority["Appointment Letter Issued"]
            })

        # 4. Job Offer
        job_offer = frappe.get_all(
            "Job Offer",
            filters={"job_applicant": job_applicant_id},
            fields=["name", "creation", "status"],
            order_by="creation desc",
            limit=1
        )
        if job_offer:
            offer_status = job_offer[0].status or "Pending"
            key = f"Job Offer: {offer_status}"
            priority = status_priority.get(key, 5)
            status_map.append({
                "status": key,
                "date": get_datetime(job_offer[0].creation),
                "priority": priority
            })

    # Get highest priority, then latest
    if status_map:
        latest = sorted(status_map, key=lambda x: (x["priority"], x["date"]), reverse=True)[0]
        final_status = latest["status"]
        final_date = latest["date"]
    else:
        final_status = "Pending"
        final_date = referral_date

    return {
        "status": "success",
        "data": {
            "referral_id": referral_id,
            "candidate_name": referral.full_name,
            "position": referral.for_designation,
            "referrer": referrer,
            "referrer_name": referrer_name,
            "referral_date": formatdate(referral_date),
            "latest_status": final_status,
            "status_date": formatdate(final_date),
            "resume_url": frappe.utils.get_url(referral.resume) if referral.resume else None,
            "interview_datetime": (
                formatdate(interview_datetime) + " " + format_time(interview_datetime)
                if interview_datetime else None
            )
        }
    }


@frappe.whitelist()
def add_referral_comment(referral_id, content):
    if not referral_id or not content:
        frappe.throw("Referral ID and comment content are required.")

    frappe.get_doc({
        "doctype": "Communication",
        "communication_type": "Comment",
        "reference_doctype": "Employee Referral",
        "reference_name": referral_id,
        "content": content
    }).insert(ignore_permissions=True)

    return {"status": "success", "message": "Comment added successfully"}

#/api/method/upload_file