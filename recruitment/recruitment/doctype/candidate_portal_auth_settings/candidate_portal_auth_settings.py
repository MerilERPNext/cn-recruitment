import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


DEFAULT_EMAIL_SUBJECT = "Your Candidate Portal OTP"
DEFAULT_EMAIL_TEMPLATE = (
    "<p>Your OTP for {{ purpose }} is <strong>{{ otp }}</strong>.</p>"
    "<p>This code expires in {{ expiry_minutes }} minutes.</p>"
)
DEFAULT_SMS_TEMPLATE = "Your Candidate Portal OTP is {{ otp }}. It expires in {{ expiry_minutes }} minutes."


class CandidatePortalAuthSettings(Document):
    def validate(self):
        self.email_otp_subject = self.email_otp_subject or DEFAULT_EMAIL_SUBJECT
        self.email_otp_template = self.email_otp_template or DEFAULT_EMAIL_TEMPLATE
        self.sms_otp_template = self.sms_otp_template or DEFAULT_SMS_TEMPLATE
        self._validate_policy_numbers()
        self._validate_channels()

    def _validate_policy_numbers(self):
        limits = {
            "otp_length": (4, 10),
            "otp_expiry_minutes": (1, 120),
            "max_attempts_per_otp": (1, 20),
            "resend_cooldown_seconds": (0, 3600),
            "max_otps_per_hour": (1, 60),
            "session_expiry_hours": (1, 720),
        }
        for fieldname, (minimum, maximum) in limits.items():
            value = cint(self.get(fieldname))
            if value < minimum or value > maximum:
                label = self.meta.get_label(fieldname) or fieldname
                frappe.throw(_("{0} must be between {1} and {2}.").format(label, minimum, maximum))

    def _validate_channels(self):
        if not cint(self.enable_email_otp) and not cint(self.enable_mobile_otp):
            frappe.throw(_("Enable at least one OTP channel."))
        if cint(self.enable_mobile_otp) and self.mobile_delivery_mode == "Disabled":
            frappe.throw(_("Select a mobile delivery mode when mobile OTP is enabled."))


def get_settings():
    settings = frappe.get_single("Candidate Portal Auth Settings")
    apply_missing_defaults(settings)
    return settings


def apply_missing_defaults(settings):
    changed = False
    defaults = {
        "enabled": 1,
        "allow_password_login": 1,
        "allow_email_otp_login": 1,
        "allow_signup": 1,
        "signup_requires_otp_verification": 1,
        "enable_email_signup": 0,
        "require_otp_on_password_login": 0,
        "session_expiry_hours": 24,
        "otp_length": 6,
        "otp_expiry_minutes": 10,
        "max_attempts_per_otp": 5,
        "resend_cooldown_seconds": 60,
        "max_otps_per_hour": 5,
        "enable_email_otp": 1,
        "enable_mobile_otp": 0,
        "mobile_delivery_mode": "Disabled",
        "email_otp_subject": DEFAULT_EMAIL_SUBJECT,
        "email_otp_template": DEFAULT_EMAIL_TEMPLATE,
        "sms_otp_template": DEFAULT_SMS_TEMPLATE,
        "revoke_existing_otps_on_new_request": 1,
        "logout_other_sessions_on_login": 0,
        "store_plain_otp_for_debug": 0,
        "debug_allowed_for_system_manager_only": 1,
        "cookie_same_site": "Lax",
        "cookie_secure": 0,
    }
    for fieldname, value in defaults.items():
        if settings.get(fieldname) in (None, ""):
            settings.set(fieldname, value)
            changed = True

    if changed:
        settings.save(ignore_permissions=True)
        frappe.db.commit()
    return settings
