import requests
import frappe
from urllib.parse import urlencode
from frappe.utils import now_datetime,get_time,getdate
from datetime import timedelta,datetime
import json
import jwt
import pytz
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

    access_token = token_doc.access_token
    if not access_token:
        raise frappe.ValidationError("Access token is missing or empty.")

    settings = frappe.get_single("Microsoft Teams App Settings")
    allowed_domain = settings.tenant_domain  # e.g., '@incubyte.co'
    tz = frappe.db.get_single_value("System Settings", "time_zone")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": f"outlook.timezone=\"{tz}\""
    }

    attendees = []

    for row in doc.interview_details:
        if row.interviewer and row.interviewer.endswith(allowed_domain):
            attendees.append({
                "upn": row.interviewer,
                "role": "attendee"
            })

    if frappe.session.user.endswith(allowed_domain):
        attendees.append({
            "upn": frappe.session.user,
            "role": "attendee"
        })

    if job_applicant.email_id and job_applicant.email_id.endswith(allowed_domain):
        attendees.append({
            "upn": job_applicant.email_id,
            "role": "attendee"
        })

    if not doc.from_time or not doc.to_time:
        frappe.throw("Please set both From Time and To Time in the Interview.")

    from_time = get_time(doc.from_time)
    to_time = get_time(doc.to_time)
    if not from_time or not to_time:
        frappe.throw("Invalid time format in From Time or To Time.")

    from_datetime = datetime.combine(doc.scheduled_on, from_time)
    to_datetime = datetime.combine(doc.scheduled_on, to_time)
    formatted_from = from_datetime.astimezone(pytz.timezone(tz)).isoformat()
    formatted_to = to_datetime.astimezone(pytz.timezone(tz)).isoformat()

    subject = f"Interview with {job_applicant.applicant_name} {job_applicant.custom_applicant_last_name_ or ''}"

    payload = {
        "startDateTime": formatted_from,
        "endDateTime": formatted_to,
        "subject": subject,
        "participants": {
            "attendees": attendees
        }
    }

    url = "https://graph.microsoft.com/v1.0/me/onlineMeetings"
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 201:
        join_url = response.json().get("joinUrl")
        if join_url:
            doc.db_set("custom_meet_link", join_url)

            calendar_attendees = []
            for a in attendees:
                calendar_attendees.append({
                    "emailAddress": {
                        "address": a["upn"],
                        "name": a["upn"]
                    },
                    "type": "required"
                })

            # Add job applicant to calendar even if not internal
            if job_applicant.email_id and not job_applicant.email_id.endswith(allowed_domain):
                calendar_attendees.append({
                    "emailAddress": {
                        "address": job_applicant.email_id,
                        "name": f"{job_applicant.applicant_name} {job_applicant.custom_applicant_last_name_ or ''}"
                    },
                    "type": "required"
                })

            event_payload = {
                "subject": subject,
                "start": {
                    "dateTime": formatted_from,
                    "timeZone": tz
                },
                "end": {
                    "dateTime": formatted_to,
                    "timeZone": tz
                },
                "body": {
                    "contentType": "HTML",
                    "content": f"Join Teams Meeting: <a href='{join_url}'>{join_url}</a>"
                },
                "location": {
                    "displayName": "Microsoft Teams"
                },
                "isOnlineMeeting": True,
                "onlineMeetingProvider": "teamsForBusiness",
                "attendees": calendar_attendees
            }

            calendar_url = "https://graph.microsoft.com/v1.0/me/events"
            calendar_response = requests.post(calendar_url, headers=headers, json=event_payload)
            if calendar_response.status_code in [200, 201]:
                calendar_event_id = calendar_response.json().get("id")
                if calendar_event_id:
                    doc.db_set("custom_calendar_event_id", calendar_event_id)

        return join_url
    else:
        frappe.local.response["http_status_code"] = 400
        frappe.local.response["message"] = f"Failed to create Teams meeting: {response.text}"
        return

@frappe.whitelist()
def reschedule_teams_meeting(interview_id, scheduled_on, from_time, to_time):

    doc = frappe.get_doc("Interview", interview_id)

    if not doc.custom_meet_link or not doc.custom_calendar_event_id:
        frappe.throw("Missing meeting link or calendar event ID. Cannot reschedule.")

    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})
    if token_doc.token_expiry <= now_datetime():
        refresh_access_token(frappe.session.user)
        token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

    access_token = token_doc.access_token
    tz = frappe.utils.get_system_timezone()
    timezone = pytz.timezone(tz)

    from_dt = datetime.combine(getdate(scheduled_on), get_time(from_time)).astimezone(timezone).isoformat()
    to_dt = datetime.combine(getdate(scheduled_on), get_time(to_time)).astimezone(timezone).isoformat()
    job_applicant = frappe.get_doc("Job Applicant", doc.job_applicant)
    applicant_name = f"{job_applicant.applicant_name} {job_applicant.custom_applicant_last_name_ or ''}"

    payload = {
        "start": {
            "dateTime": from_dt,
            "timeZone": tz
        },
        "end": {
            "dateTime": to_dt,
            "timeZone": tz
        },
        "subject": f"Rescheduled Interview with {applicant_name}"
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    url = f"https://graph.microsoft.com/v1.0/me/events/{doc.custom_calendar_event_id}"

    response = requests.patch(url, headers=headers, json=payload)

    if response.status_code in [200, 202]:
        return doc.custom_meet_link
    else:
        frappe.throw(f"Reschedule failed: {response.text}")

@frappe.whitelist()
def cancel_teams_meeting(interview_id):

    doc = frappe.get_doc("Interview", interview_id)

    if not doc.custom_calendar_event_id:
        frappe.throw("No calendar event ID found to cancel.")

    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})
    if token_doc.token_expiry <= now_datetime():
        refresh_access_token(frappe.session.user)
        token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

    access_token = token_doc.access_token

    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    url = f"https://graph.microsoft.com/v1.0/me/events/{doc.custom_calendar_event_id}"

    response = requests.delete(url, headers=headers)

    if response.status_code == 204:
        # Clean up fields in Interview doc
        doc.db_set("custom_meet_link", "")
        doc.db_set("custom_calendar_event_id", "")
        return "Meeting cancelled successfully."
    else:
        frappe.throw(f"Cancellation failed: {response.text}")

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



        