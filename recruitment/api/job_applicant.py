# recruitment/recruitment/api/job_applicant.py

import frappe
from frappe.utils import getdate, formatdate
from frappe import _

@frappe.whitelist()
def get_job_applicant_details(applicant_name):
    """
    Fetches comprehensive details for a Job Applicant,
    including main fields, employment history, education history, and notes.
    """
    if not applicant_name:
        frappe.throw(_("Job Applicant Name is required"), frappe.ValidationError)

    try:
        applicant_doc = frappe.get_doc("Job Applicant", applicant_name)
    except frappe.DoesNotExistError:
        frappe.throw(_(f"Job Applicant '{applicant_name}' not found."), frappe.DoesNotExistError)

    # Prepare basic applicant details
    job_applicant_data = {
        "name": applicant_doc.name,
        "applicant_name": f"{applicant_doc.applicant_name or ''} {applicant_doc.custom_applicant_last_name_ or ''}".strip(),
        "email_id": applicant_doc.email_id,
        "phone_number": applicant_doc.phone_number or "N/A",
        "job_title": applicant_doc.job_title,
        "designation": applicant_doc.designation,
        "status": applicant_doc.status,
        "sub_status": applicant_doc.custom_substatus or "N/A",
        "location": f"{applicant_doc.custom_location or ''}{', ' if applicant_doc.custom_location and applicant_doc.country else ''}{applicant_doc.country or ''}".strip(),
        "experience": applicant_doc.custom_total_experience or "N/A",
        "expected_ctc": f"{applicant_doc.currency or ''} {applicant_doc.custom_expected_ctc or applicant_doc.lower_range or 0} / Annum".strip(),
        "notice_period": applicant_doc.custom_bond_if_any or "N/A", # Using bond field for now
        "profile_image": None, # Confirm if there's a specific field for this, otherwise defaults to None
        "resume_attachment": applicant_doc.resume_attachment,
        "creation": applicant_doc.creation,
        "custom_recruiter_name": applicant_doc.custom_recruiter_name or "N/A",
        # Add other main fields you might need
        "custom_current_designation": applicant_doc.custom_current_designation or "N/A",
        "custom_current_company_name": applicant_doc.custom_current_company_name or "N/A",
        "custom_linkedin_url": applicant_doc.custom_linkedin_url or "N/A",
        "custom_permanent_address": applicant_doc.custom_permanent_address or "N/A",
        "custom_current_address": applicant_doc.custom_current_address or "N/A",
        "custom_expected_doj": applicant_doc.custom_expected_doj,
        "source": applicant_doc.source or "N/A",
        "applicant_rating": applicant_doc.applicant_rating,
        "custom_home_town": applicant_doc.custom_home_town or "N/A",
        "custom_recruiter_remark": applicant_doc.custom_recruiter_remark or "N/A",
    }

    # Fetch Employment History
    employment_history = []
    if applicant_doc.custom_previous_work_experience:
        for entry in applicant_doc.custom_previous_work_experience:
            from_date = formatdate(entry.custom_from_datee) if entry.custom_from_datee else "N/A"
            to_date = formatdate(entry.custom_to_datee) if entry.custom_to_datee else "Present" if not entry.custom_to_datee else "N/A"
            # Attempt to calculate duration if dates are available
            duration = ""
            if entry.custom_from_datee and entry.custom_to_datee:
                try:
                    start = getdate(entry.custom_from_datee)
                    end = getdate(entry.custom_to_datee)
                    diff_months = (end.year - start.year) * 12 + (end.month - start.month)
                    years = diff_months // 12
                    months = diff_months % 12
                    duration = f"{years} yrs {months} mos"
                except Exception:
                    pass
            elif entry.custom_from_datee:
                try:
                    start = getdate(entry.custom_from_datee)
                    today = getdate(frappe.utils.today())
                    diff_months = (today.year - start.year) * 12 + (today.month - start.month)
                    years = diff_months // 12
                    months = diff_months % 12
                    duration = f"{years} yrs {months} mos (Ongoing)"
                except Exception:
                    pass

            employment_history.append({
                "company_name": entry.company_name,
                "designation": entry.designation,
                "start_date": from_date,
                "end_date": to_date,
                "duration": duration,
                "address": entry.address,
                "salary": entry.salary,
                # "description": entry.description or "", # Add if you have a description field in this child table
            })

    # Fetch Education History
    education_history = []
    if applicant_doc.custom_educational_qualification:
        for entry in applicant_doc.custom_educational_qualification:
            # Prioritize custom_passing_year if available, else year_of_passing (which was 0 in sample)
            education_year = entry.custom_passing_year or (str(entry.year_of_passing) if entry.year_of_passing != 0 else "N/A")

            education_history.append({
                "university": entry.school_univ,
                "degree": entry.qualification,
                "field_of_study": entry.custom_educational_details or "N/A",
                "level": entry.level,
                "start_year": education_year, # Assuming start and end year are the same or derived from this
                "end_year": education_year,
                # "class_percentage": entry.class_per # Add if you want this
            })

    # Fetch Notes from custom_crm_note child table
    notes = []
    if applicant_doc.custom_crm_note:
        for note_entry in applicant_doc.custom_crm_note:
            notes.append({
                "id": note_entry.name,
                "timestamp": note_entry.added_on,
                "author": note_entry.added_by,
                "content": note_entry.note,
                "type": note_entry.custom_comment_type # Keep type for potential timeline integration
            })

    # Timeline (can be expanded later with Interview/Communication events)
    timeline_events = []
    # Add application creation event
    timeline_events.append({
        "id": "application_created",
        "type": "Application Submitted",
        "timestamp": applicant_doc.creation,
        "description": f"Applied for {applicant_doc.job_title} role.",
        "by_user": applicant_doc.owner
    })
    # Add CRM notes to timeline
    for note in notes:
        timeline_events.append({
            "id": note["id"],
            "type": f"Note ({note['type']})", # Use the type from CRM note
            "timestamp": note["timestamp"],
            "description": f"Internal note added: {note['content'][:100]}...", # Truncate for timeline
            "by_user": note["author"]
        })

    # Sort timeline events by timestamp
    timeline_events.sort(key=lambda x: x["timestamp"])


    return {
        "job_applicant": job_applicant_data,
        "employment_history": employment_history,
        "education_history": education_history,
        "notes": notes,
        "timeline_events": timeline_events
    }