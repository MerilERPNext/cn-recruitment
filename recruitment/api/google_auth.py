import frappe
import urllib.parse
import requests
from frappe.utils import now_datetime, add_to_date
import datetime


CLIENT_ID = "1070310945857-f62fvq1oku4fong8h2aer38ipbsd4qpp.apps.googleusercontent.com"
CLIENT_SECRET = "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"
SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
TOKEN_URL = "https://oauth2.googleapis.com/token"

@frappe.whitelist(allow_guest=True)
def start_google_auth(user):
    site_url = "https://incubyte-uat.frappe.cloud"
    redirect_uri = f"{site_url}/api/method/recruitment.api.google_auth.google_auth_callback"

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&scope={urllib.parse.quote(SCOPES)}"
        f"&access_type=offline&prompt=consent"
    )

    frappe.cache().set_value("auth_user", user)
    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = auth_url

@frappe.whitelist(allow_guest=True)
def google_auth_callback(code=None):
    site_url = "https://incubyte-uat.frappe.cloud"
    redirect_uri = f"{site_url}/api/method/recruitment.api.google_auth.google_auth_callback"

    user = "smriti@incubyte.co"

    data = {
        "code": code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    r = requests.post(TOKEN_URL, data=data).json()
    access_token = r.get("access_token")
    refresh_token = r.get("refresh_token")
    expires_in = r.get("expires_in")

    google_user_info = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    google_email = google_user_info.get("email")

    doc = frappe.new_doc("Google Token")
    doc.user = user
    doc.google_email = google_email
    doc.access_token = access_token
    doc.refresh_token = refresh_token
    doc.token_expiry = add_to_date(now_datetime(), seconds=expires_in)
    doc.is_active = 1

    frappe.log_error(f"prepared doc: {frappe.as_json(doc.as_dict())}", "Before Insert")

    doc.insert(ignore_permissions=True)

    frappe.log_error(f"inserted doc: {frappe.as_json(doc.as_dict())}", "After Insert")

    return frappe.redirect_to_message("Google Connected", "Google Account linked successfully. You can now schedule meetings.")
