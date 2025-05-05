import frappe
import urllib.parse
import requests
from frappe.utils import now_datetime, add_to_date

CLIENT_ID = "your-google-client-id"
CLIENT_SECRET = "your-google-client-secret"
SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
TOKEN_URL = "https://oauth2.googleapis.com/token"

@frappe.whitelist()
def start_google_auth(user):
    site_url = frappe.utils.get_url()
    redirect_uri = f"{site_url}/api/method/recruitment.api.google_auth.google_auth_callback"

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&scope={urllib.parse.quote(SCOPES)}"
        f"&access_type=offline&prompt=consent"
    )

    frappe.cache().set_value(f"auth_user_{user}", user)

    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = auth_url

@frappe.whitelist(allow_guest=True)
def google_auth_callback(code=None):
    site_url = frappe.utils.get_url()
    redirect_uri = f"{site_url}/api/method/recruitment.api.google_auth.google_auth_callback"

    user = frappe.cache().get_value("auth_user_" + frappe.session.user)

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

    doc = frappe.get_doc({
        "doctype": "Google Token",
        "user": user,
        "google_email": google_email,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expiry": add_to_date(now_datetime(), seconds=expires_in),
        "is_active": 1
    })
    doc.insert(ignore_permissions=True)

    return frappe.redirect_to_message("Google Connected", "Google Account linked successfully. You can now schedule meetings.")
