import frappe
import requests
from frappe.utils import now_datetime

GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

def get_user_token(user):
    token = frappe.get_value('Google Token', {'user': user, 'is_active': 1}, 'access_token')
    if not token:
        frappe.throw("Google account not connected. Please click 'Connect Google Account' first.")
    return token

@frappe.whitelist()
def schedule_meeting(interview_id):
    doc = frappe.get_doc('Interview', interview_id)
    token = get_user_token(frappe.session.user)

    event_data = {
        'summary': f'Interview: {doc.candidate_name}',
        'description': f'Interview for {doc.job_title}',
        'start': {
            'dateTime': doc.scheduled_from.isoformat(),
            'timeZone': 'Asia/Kolkata'
        },
        'end': {
            'dateTime': doc.scheduled_to.isoformat(),
            'timeZone': 'Asia/Kolkata'
        },
        'conferenceData': {
            'createRequest': {'requestId': frappe.generate_hash()}
        }
    }

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    res = requests.post(
        GOOGLE_CALENDAR_API,
        headers=headers,
        json=event_data,
        params={'conferenceDataVersion': 1}
    )

    if res.status_code == 200:
        event = res.json()
        doc.google_event_id = event['id']
        doc.google_meet_link = event['hangoutLink']
        doc.save(ignore_permissions=True)
        return event['hangoutLink']
    else:
        frappe.throw(f"Failed to create meeting: {res.text}")

@frappe.whitelist()
def reschedule_meeting(interview_id):
    doc = frappe.get_doc('Interview', interview_id)
    token = get_user_token(frappe.session.user)

    event_data = {
        'start': {
            'dateTime': doc.scheduled_from.isoformat(),
            'timeZone': 'Asia/Kolkata'
        },
        'end': {
            'dateTime': doc.scheduled_to.isoformat(),
            'timeZone': 'Asia/Kolkata'
        }
    }

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    res = requests.patch(
        f'{GOOGLE_CALENDAR_API}/{doc.google_event_id}',
        headers=headers,
        json=event_data
    )

    if res.status_code == 200:
        return "Rescheduled successfully"
    else:
        frappe.throw(f"Failed to reschedule meeting: {res.text}")

@frappe.whitelist()
def cancel_meeting(interview_id):
    doc = frappe.get_doc('Interview', interview_id)
    token = get_user_token(frappe.session.user)

    headers = {
        'Authorization': f'Bearer {token}'
    }

    res = requests.delete(
        f'{GOOGLE_CALENDAR_API}/{doc.google_event_id}',
        headers=headers
    )

    if res.status_code in [200, 204]:
        doc.google_event_id = ''
        doc.google_meet_link = ''
        doc.save(ignore_permissions=True)
        return "Meeting canceled"
    else:
        frappe.throw(f"Failed to cancel meeting: {res.text}")
