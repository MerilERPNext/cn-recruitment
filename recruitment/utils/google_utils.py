import frappe

def get_google_oauth_credentials():
    settings = frappe.get_single("Google Settings")
    if not settings.enable:
        frappe.throw("Google integration is not enabled in Google Settings.")

    if not settings.client_id or not settings.client_secret:
        frappe.throw("Google Client ID or Client Secret is missing in Google Settings.")

    return {
        "client_id": settings.client_id,
        "client_secret": settings.client_secret
    }
