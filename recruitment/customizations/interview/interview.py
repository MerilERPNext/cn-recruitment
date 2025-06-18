import requests
import frappe
from frappe import _
from urllib.parse import urlencode
from frappe.utils import now_datetime,get_time,getdate
from datetime import timedelta,datetime
import json
import jwt
import pytz
from frappe.utils.password import get_decrypted_password
from frappe.utils import get_url_to_form

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
def get_teams_auth_url(interview_id=None, user_id=None, doctype=None, docname=None):
    settings = frappe.get_single("Microsoft Teams App Settings")
    if user_id and doctype and docname:
        state = f"{user_id}|{doctype}|{docname}"
    elif interview_id:
        state = f"{frappe.session.user}|{interview_id}"
    elif user_id:
        state = user_id
    else:
        state = frappe.session.user
    params = {
        "client_id": settings.client_id,
        "response_type": "code",
        "redirect_uri": settings.redirect_uri,
        "response_mode": "query",
        "scope": "offline_access User.Read Calendars.ReadWrite",
        "state": state
    }
    auth_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/authorize?{urlencode(params)}"
    return auth_url


@frappe.whitelist(allow_guest=True)
def teams_oauth_callback(code=None, state=None):
    interview_id = None
    doctype = None
    docname = None

    parts = state.split("|")

    if len(parts) == 3:
        user, doctype, docname = parts
    elif len(parts) == 2:
        user, interview_id = parts
    else:
        user = state

    settings = frappe.get_single("Microsoft Teams App Settings")

    token_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/token"
    client_secret = get_decrypted_password("Microsoft Teams App Settings", settings.name, "client_secret")

    data = {
        "client_id": settings.client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.redirect_uri
    }

    response = requests.post(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})

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

    if doctype and docname:
        redirect_url = f"/app/{slugify_doctype(doctype)}/{docname}"
    elif interview_id:
        redirect_url = f"/app/{slugify_doctype('Interview')}/{interview_id}"
    else:
        redirect_url = f"/app/user/{user}"

    if frappe.session.user == "Guest":
        frappe.local.login_manager.login_as(user)

    redirect_text = f"{doctype} document" if doctype else "Interview page"
    frappe.respond_as_web_page(
        title=_("Microsoft Teams Authorized"),
        html=f"""
            <p> Microsoft Teams authorized successfully.</p>
            <p>Redirecting to {redirect_text}</p>
            <script>
                setTimeout(function() {{
                    window.location.href = "{redirect_url}";
                }}, 1500);
            </script>
        """,
        success=True,
        http_status_code=200
    )



@frappe.whitelist()
def schedule_teams_meeting(doctype, docname, field_config, email_type="schedule", participant_config=None):
    if isinstance(field_config, str):
        field_config = json.loads(field_config)
    if isinstance(participant_config, str):
        participant_config = json.loads(participant_config)

    doc = frappe.get_doc(doctype, docname)
    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

    if token_doc.token_expiry <= now_datetime():
        refresh_access_token(frappe.session.user)
        token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

    access_token = token_doc.access_token
    if not access_token:
        raise frappe.ValidationError("Access token is missing or empty.")

    settings = frappe.get_single("Microsoft Teams App Settings")
    allowed_domain = settings.tenant_domain  
    tz = frappe.db.get_single_value("System Settings", "time_zone")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": f"outlook.timezone=\"{tz}\""
    }

    from_time = get_time(doc.get(field_config.get("from_time_field")))
    to_time = get_time(doc.get(field_config.get("to_time_field")))
    scheduled_on = doc.get(field_config.get("scheduled_on_field"))

    if not from_time or not to_time or not scheduled_on:
        frappe.throw("Scheduled date and time fields must be filled.")

    timezone = pytz.timezone(tz)
    from_datetime = timezone.localize(datetime.combine(scheduled_on, from_time))
    to_datetime = timezone.localize(datetime.combine(scheduled_on, to_time))
    formatted_from = from_datetime.isoformat()
    formatted_to = to_datetime.isoformat()

    email_templates = get_teams_email_templates(doctype)
    context = build_dynamic_context(doc)
    subject, content = render_email_template(email_templates.get(email_type), context)
    print("===== Rendered Content =====")
    print(content)

    calendar_attendees = get_participant_emails(doc, participant_config or {})

    event_payload = {
        "subject": subject,
        "start": {"dateTime": formatted_from, "timeZone": tz},
        "end": {"dateTime": formatted_to, "timeZone": tz},
        "body": {
            "contentType": "HTML",
            "content": frappe.utils.strip_html_tags(content) if "<" not in content else content
        },
        "location": {"displayName": "Microsoft Teams"},
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness",
        "attendees": [{
            "emailAddress": {"address": a["email"], "name": a["name"]},
            "type": a["type"]
        } for a in calendar_attendees]
    }

    calendar_url = "https://graph.microsoft.com/v1.0/me/events"
    calendar_response = requests.post(calendar_url, headers=headers, json=event_payload)

    if calendar_response.status_code in [200, 201]:
        calendar_data = calendar_response.json()
        join_url = calendar_data.get("onlineMeeting", {}).get("joinUrl")

        if join_url:
            short_url = shorten_url_tinyurl(join_url)
            doc.db_set(field_config.get("zoom_link_field"), short_url)
            doc.db_set(field_config.get("meeting_status_field"), "Scheduled")
            doc.db_set(field_config.get("event_id_field"), calendar_data.get("id"))
            return short_url
        else:
            frappe.throw("Meeting created but joinUrl not found.")
    else:
        frappe.throw(f"Failed to create Teams meeting: {calendar_response.text}")

@frappe.whitelist()
def reschedule_teams_meeting(doctype, docname, field_config, scheduled_on, from_time, to_time):
    if isinstance(field_config, str):
        field_config = json.loads(field_config)

    doc = frappe.get_doc(doctype, docname)

    if doc.get(field_config.get("event_id_field")):
        cancel_teams_meeting(doctype, docname, field_config)

    doc.db_set(field_config.get("scheduled_on_field"), scheduled_on)
    doc.db_set(field_config.get("from_time_field"), from_time)
    doc.db_set(field_config.get("to_time_field"), to_time)

    return schedule_teams_meeting(doctype, docname, field_config, email_type="reschedule")


@frappe.whitelist()
def cancel_teams_meeting(doctype, docname, field_config):
    if isinstance(field_config, str):
        field_config = json.loads(field_config)

    doc = frappe.get_doc(doctype, docname)
    event_id = doc.get(field_config.get("event_id_field"))

    if not event_id:
        frappe.throw("No calendar event ID to cancel.")

    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})
    if token_doc.token_expiry <= now_datetime():
        refresh_access_token(frappe.session.user)
        token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

    access_token = token_doc.access_token
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://graph.microsoft.com/v1.0/me/events/{event_id}"

    response = requests.delete(url, headers=headers)

    if response.status_code == 204:
        doc.db_set(field_config.get("zoom_link_field"), "")
        doc.db_set(field_config.get("event_id_field"), "")
        doc.db_set(field_config.get("meeting_status_field"), "Cancelled")

        # Send Cancel Email if template exists
        email_templates = get_teams_email_templates(doctype)
        context = build_dynamic_context(doc)
        subject, content = render_email_template(email_templates["cancel"], context)
        if content:
            frappe.sendmail(
                recipients=[frappe.session.user],
                subject=subject,
                message=content
            )

        return "Meeting cancelled successfully."
    else:
        frappe.throw(f"Cancellation failed: {response.text}")

def refresh_access_token(user):
    settings = frappe.get_single("Microsoft Teams App Settings")
    token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": user})
    token_url = f"https://login.microsoftonline.com/{settings.tenant_id}/oauth2/v2.0/token"
    client_secret = get_decrypted_password("Microsoft Teams App Settings", settings.name, "client_secret")
    data = {
        "client_id": settings.client_id,
        "client_secret": client_secret,
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



def shorten_url_tinyurl(long_url):
    try:
        response = requests.get("https://tinyurl.com/api-create.php", params={"url": long_url})
        if response.status_code == 200:
            return response.text
    except Exception:
        pass
    return long_url 


def get_teams_email_templates(doctype):
    settings = frappe.get_single("Microsoft Teams App Settings")
    for row in settings.get("teams_email_template_mapping", []):
        if row.select_doctype == doctype:
            return {
                "schedule": row.schedule_email_template,
                "reschedule": row.reschedule_email_template,
                "cancel": row.cancel_email_template
            }
    return {"schedule": None, "reschedule": None, "cancel": None}

def build_dynamic_context(doc):
    context = {}
    for field in doc.meta.fields:
        context[field.fieldname] = doc.get(field.fieldname)
    if getattr(doc, "job_applicant", None):
        job_applicant = frappe.get_doc("Job Applicant", doc.job_applicant)
        for field in job_applicant.meta.fields:
            context[f"job_applicant_{field.fieldname}"] = job_applicant.get(field.fieldname)
    emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    if emp:
        emp_doc = frappe.get_doc("Employee", emp)
        for field in emp_doc.meta.fields:
            context[f"employee_{field.fieldname}"] = emp_doc.get(field.fieldname)
    context["created_by"] = frappe.session.user
    context["interview"] = doc.name
    context["doctype"] = doc.doctype
    context["name"] = doc.name
    return context


def render_email_template(template_name, context):
    if not template_name:
        doctype = context.get("doctype") or context.get("interview_doctype") or "Interview"
        name = context.get("name") or context.get("interview") or ""
        link = get_url_to_form(doctype, name)

        subject = "Interview Scheduled"
        html = f"""
            Dear User,<br><br>
            You have been scheduled to take an interview.<br>
            For more details, visit: <a href="{link}">{name}</a><br><br>
            Regards,<br>
            HR Team
        """
        return subject, html

    template_doc = frappe.get_doc("Email Template", template_name)
    subject = frappe.render_template(template_doc.subject or "", context)
    html = frappe.render_template(template_doc.response_html or "", context, is_path=False)
    return subject, html


def get_participant_emails(doc, participant_config):
    participant_emails = []
    domain = frappe.db.get_single_value("Microsoft Teams App Settings", "tenant_domain")

    candidate_field = participant_config.get("candidate_email_field")
    if candidate_field:
        candidate_email = doc.get(candidate_field)
        if candidate_email:
            participant_emails.append({
                "email": candidate_email,
                "name": candidate_email,
                "type": "required"
            })

    interviewer_field = participant_config.get("interviewers_field")
    fieldtype = participant_config.get("interviewers_fieldtype")
    if interviewer_field:
        interviewers = doc.get(interviewer_field)
        if fieldtype == "Table":
            for row in interviewers:
                user_id = row.get("interviewer")
                email = user_id if "@" in user_id else frappe.db.get_value("User", user_id, "email")
                if email:
                    participant_emails.append({
                        "email": email,
                        "name": email,
                        "type": "required"
                    })
        elif fieldtype == "Table MultiSelect":
            for row in interviewers:
                if hasattr(row, 'get') and callable(row.get):
                    user_id = row.get("user")
                elif hasattr(row, 'user'):
                    user_id = row.user
                else:
                    user_id = row

                if not user_id:
                    continue

                if isinstance(user_id, str) and "@" in user_id:
                    email = user_id
                else:
                    email = frappe.db.get_value("User", user_id, "email")

                if email:
                    participant_emails.append({
                        "email": email,
                        "name": email,
                        "type": "required"
                    })
                    

    return participant_emails

def slugify_doctype(doctype):
    return doctype.lower().replace(" ", "-").replace("_", "-")
