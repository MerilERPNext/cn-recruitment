import requests
import frappe
from urllib.parse import urlencode
from frappe.utils import now_datetime
from datetime import timedelta

@frappe.whitelist()
def generate_travel_request(interview_id):
    in_doc = frappe.get_doc("Interview", interview_id).as_dict()
    tr_doc = frappe.new_doc("Travel Request")

    tr_doc.travel_type = "Domestic"
    tr_doc.travel_funding = "Fully Sponsored"
    tr_doc.purpose_of_travel = "Interview"

    emp_id = None
    cur_user = frappe.session.user

    emp_id = frappe.db.get_value("Employee", {"user_id": cur_user})
    interviewers = []

    for inter in in_doc.interview_details:
        interviewers.append(
            frappe.db.get_value(
                "Employee", {"user_id": inter.interviewer}, ["employee_name"]
            )
        )
    description = (
        "Applicant Name: "
        + str(
            frappe.db.get_value("Job Applicant", in_doc.job_applicant, "applicant_name")
        )
        + "\nInterview Date: "
        + str(in_doc.scheduled_on)
        + "\nCreated By: "
        + frappe.db.get_value(
            "Employee",
            {"user_id": cur_user},
            ["employee_name"],
        )
    )
    tr_doc.description = description
    if emp_id:
        tr_doc.employee = emp_id
        tr_doc.save()
        frappe.msgprint("Travel Request Created Succefully!")
    else:
        frappe.msgprint("User Administrator can't create travel request")


@frappe.whitelist()
def share_job_opening(docname):
    inter_doc = frappe.get_doc("Interview",docname)
    for inter in inter_doc.interview_details:
        if not frappe.db.exists("DocShare", {"user": inter.interviewer,"share_doctype":"Job Opening","share_name":inter_doc.job_opening}):
            DocShare = frappe.new_doc("DocShare")
            DocShare.user = inter.interviewer
            DocShare.share_doctype = "Job Opening"
            DocShare.share_name = inter_doc.job_opening
            DocShare.read = 1
            DocShare.notify_by_email = 1
            DocShare.save()

@frappe.whitelist()
def check_feedback_of_previous_interview(self, method):
    interviews = frappe.get_all("Interview", filters={"job_applicant": self.job_applicant}, pluck="name")    
    for interview in interviews:
        interview_doc = frappe.get_doc("Interview", interview)        
        for interviewer in interview_doc.interview_details:
            if not frappe.db.exists("Interview Feedback", {"interviewer": interviewer.interviewer,"job_applicant":self.job_applicant}):
                pass
                # frappe.throw(
                #     f"Please provide feedback for Interview: {frappe.utils.get_link_to_form('Interview', interview)} by {interviewer.interviewer}"
                # )

@frappe.whitelist()
def get_interview_feedback_records(interview_id):
    interview_feedback_records = []
    
    # Fetch submitted feedbacks
    interview_feedbacks = frappe.get_all("Interview Feedback", filters={"interview": interview_id}, pluck="name")
    for interview_feedback in interview_feedbacks:
        feedback_doc = frappe.get_doc("Interview Feedback", interview_feedback)
        interview_feedback_records.append({
            "interviewer": feedback_doc.interviewer,
            "feedback": feedback_doc.feedback,
            "result": feedback_doc.result,
            "creation": feedback_doc.creation
        })
    
    # If no feedback records found, fetch interviewers and mark them as pending
    if not interview_feedback_records:
        interview = frappe.get_doc("Interview", interview_id)
        assigned_interviewers = [
            row.custom_full_name for row in interview.interview_details
        ]
        for interviewer_name in assigned_interviewers:
            interview_feedback_records.append({
                "interviewer": interviewer_name,
                "feedback": "Pending",
                "result": "Pending",
                "creation": "N/A"
            })
    
    return interview_feedback_records

        

@frappe.whitelist()
def get_teams_auth_url():
    settings = frappe.get_single("Microsoft Teams App Settings")
    params = {
        "client_id": settings.client_id,
        "response_type": "code",
        "redirect_uri": settings.redirect_uri,
        "response_mode": "query",
        "scope": "offline_access User.Read Calendars.ReadWrite",
        "state": frappe.session.user
    }
    auth_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/authorize?{urlencode(params)}"
    return auth_url


@frappe.whitelist(allow_guest=True)
def teams_oauth_callback(code=None, state=None):
    user = state
    settings = frappe.get_single("Microsoft Teams App Settings")

    token_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/token"
    
    data = {
        "client_id": settings.client_id,
        "client_secret": settings.client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.redirect_uri
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    response = requests.post(token_url, data=data, headers=headers)

    if response.status_code != 200:
        frappe.throw(f"Token fetch failed: {response.text}")

    res = response.json()

    token_doc = frappe.get_doc({
        "doctype": "Microsoft Teams User Token",
        "user": user,
        "access_token": res.get("access_token"),
        "refresh_token": res.get("refresh_token"),
        "token_expiry": now_datetime() + timedelta(seconds=res.get("expires_in"))
    })

    existing = frappe.db.exists("Microsoft Teams User Token", {"user": user})
    if existing:
        old = frappe.get_doc("Microsoft Teams User Token", existing)
        old.access_token = token_doc.access_token
        old.refresh_token = token_doc.refresh_token
        old.token_expiry = token_doc.token_expiry
        old.save(ignore_permissions=True)
    else:
        token_doc.insert(ignore_permissions=True)
        frappe.db.commit()

    return "Microsoft Teams authorized successfully."


@frappe.whitelist()
def schedule_teams_meeting(interview_id):
    doc = frappe.get_doc("Interview", interview_id)
    job_applicant = frappe.get_doc("Job Applicant", doc.job_applicant)

    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})
    if token_doc.token_expiry <= now_datetime():
        refresh_access_token(frappe.session.user)
        token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})
    headers = {
        "Authorization": f"Bearer {token_doc.access_token}",
        "Content-Type": "application/json"
    }
    
    attendees = [{
        "upn": job_applicant.email_id,
        "type": "required"
    }]

    for row in doc.interview_details:
        if row.interviewer:
            attendees.append({
                "upn": row.interviewer,
                "type": "required"
            })

    payload = {
        "startDateTime": str(doc.from_time),
        "endDateTime": str(doc.to_time),
        "subject": f"Interview with {job_applicant.applicant_name} {job_applicant.custom_applicant_last_name_ or ''}",
        "participants": {
            "attendees": attendees
        }
    }

    response = requests.post("https://graph.microsoft.com/v1.0/me/onlineMeetings", headers=headers, json=payload)

    if response.status_code == 201:
        join_url = response.json().get("joinUrl")
        if not join_url:
            frappe.throw("Meeting created but join URL not found.")
        doc.db_set("custom_teams_meeting_link", join_url)
        return join_url
    else:
        frappe.throw(f"Failed to create Teams meeting: {response.text}")


def refresh_access_token(user):
    settings = frappe.get_single("Microsoft Teams App Settings")
    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": user})
    token_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/token"
    data = {
        "client_id": settings.client_id,
        "client_secret": settings.client_secret,
        "grant_type": "refresh_token",
        "refresh_token": token_doc.refresh_token,
        "redirect_uri": settings.redirect_uri
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(token_url, data=data, headers=headers)

    if response.status_code != 200:
        frappe.throw(f"Token refresh failed: {response.text}")
    res = response.json()
    token_doc.access_token = res.get("access_token")
    token_doc.refresh_token = res.get("refresh_token")
    token_doc.token_expiry = now_datetime() + timedelta(seconds=res.get("expires_in"))
    token_doc.save(ignore_permissions=True)



        