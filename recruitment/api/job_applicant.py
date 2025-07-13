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
        "profile_image": None, 
        "resume_attachment": applicant_doc.resume_attachment,
        "creation": applicant_doc.creation,
        "custom_recruiter_name": applicant_doc.custom_recruiter_name or "N/A",
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
                "start_year": education_year, 
                "end_year": education_year,
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
                "type": note_entry.custom_comment_type 
            })

    # Mock data for Applicant Timeline and Communication History
    mock_timeline_events = [
        {
            "id": "app_submitted",
            "type": "Application Submitted",
            "timestamp": "2025-07-10T11:00:00Z",
            "description": "Applied for Senior Frontend Developer role.",
            "by_user": "Applicant"
        },
        {
            "id": "status_changed_screening",
            "type": "Status Changed",
            "timestamp": "2025-07-11T16:15:00Z",
            "description": "Status changed: Sourced → Screening. Sub-status changed to HR Round.",
            "by_user": "Sarah Wilson"
        },
        {
            "id": "interview_scheduled_tech",
            "type": "Interview Scheduled",
            "timestamp": "2025-07-12T10:30:00Z",
            "description": "Technical Round with John Smith.",
            "by_user": "Recruiter"
        }
    ]

    mock_communication_history = [
        {
            "id": "whatsapp_confirm",
            "type": "WhatsApp Message",
            "timestamp": "2025-07-12T10:35:00Z",
            "description": "Confirming interview schedule.",
            "icon": "chat" 
        },
        {
            "id": "outgoing_call_expectations",
            "type": "Outgoing Call",
            "timestamp": "2025-07-11T16:00:00Z",
            "description": "Duration: 5m 32s. Spoke about role expectations.",
            "icon": "call"
        },
        {
            "id": "email_screening_invite",
            "type": "Email Sent",
            "timestamp": "2025-07-10T14:00:00Z",
            "description": "Invitation for initial screening call.",
            "icon": "mail" 
        }
    ]

    return {
        "job_applicant": job_applicant_data,
        "employment_history": employment_history,
        "education_history": education_history,
        "notes": notes,
        "applicant_timeline_events": mock_timeline_events,
        "communication_history": mock_communication_history 
    }
    
    
@frappe.whitelist()
def get_job_applicant_field_options():
    """
    Fetches the options for 'status' and 'custom_substatus' fields
    of the Job Applicant DocType.
    """
    status_options = []
    substatus_options = []

    # Get options for 'status' field
    status_field = frappe.get_meta("Job Applicant").get_field("status")
    if status_field and status_field.options:
        status_options = [s.strip() for s in status_field.options.split('\n') if s.strip()]

    # Get options for 'custom_substatus' field
    substatus_field = frappe.get_meta("Job Applicant").get_field("custom_substatus")
    if substatus_field and substatus_field.options:
        substatus_options = [s.strip() for s in substatus_field.options.split('\n') if s.strip()]

    return {
        "status_options": status_options,
        "sub_status_options": substatus_options
    }
