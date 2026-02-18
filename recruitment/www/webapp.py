import frappe
from frappe import _
from frappe.utils import get_url
from frappe.website.utils import get_home_page

def get_context(context):
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/webapp"
        raise frappe.Redirect

    csrf_token = frappe.sessions.get_csrf_token()
    frappe.db.commit()

    context.update({
        "csrf_token": csrf_token,
    })
    return context
