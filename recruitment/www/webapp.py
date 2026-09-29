import frappe
from frappe import _
from frappe.utils import get_url
from frappe.website.utils import get_home_page

# The page embeds the session's CSRF token, so it must never be served from the
# per-path website cache: a cached copy hands every visitor (Guests included)
# whichever session rendered it first, and skips the Guest redirect below.
no_cache = 1

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
