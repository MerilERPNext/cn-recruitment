import hashlib
import hmac
import json
import random
import re
from datetime import datetime

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.utils import add_to_date, cint, get_datetime, now_datetime
from frappe.utils.jinja import render_template
from frappe.utils.password import check_password

from recruitment.recruitment.doctype.candidate_portal_auth_settings.candidate_portal_auth_settings import (
    get_settings,
)


FINAL_OTP_STATUSES = ("Verified", "Failed", "Expired", "Revoked")
SAFE_SETTINGS_FIELDS = (
    "enabled",
    "allow_password_login",
    "allow_email_otp_login",
    "allow_signup",
    "signup_requires_otp_verification",
    "enable_email_otp",
    "enable_mobile_otp",
    "mobile_delivery_mode",
)


@frappe.whitelist(allow_guest=True)
def get_auth_settings():
    settings = get_settings()
    return {field: cint(settings.get(field)) if field.startswith(("allow_", "enable_", "signup_", "enabled")) else settings.get(field) for field in SAFE_SETTINGS_FIELDS}


@frappe.whitelist(allow_guest=True)
def signup(email, password, full_name=None, mobile_no=None):
    settings = get_settings()
    _require_enabled(settings)
    if not cint(settings.allow_signup):
        frappe.throw(_("Candidate signup is disabled."), frappe.PermissionError)
    if not cint(settings.create_frappe_user_on_signup):
        frappe.throw(_("Candidate user creation is disabled in Candidate Portal Auth Settings."))

    email = _normalize_email(email)
    full_name = (full_name or "").strip()
    if frappe.db.exists("User", email):
        frappe.throw(_("User already registered."), frappe.DuplicateEntryError)

    user = _create_candidate_user(settings, email, password, full_name, mobile_no)
    if cint(settings.signup_requires_otp_verification):
        if not cint(settings.enable_email_otp):
            frappe.throw(_("Email OTP must be enabled when signup OTP verification is required."))
        result = _issue_otp(settings, email, "Signup", "Email", user=user.name)
        frappe.db.commit()
        return {
            "status": "otp_required",
            "user": _public_user(user.name),
            "otp_log": result.get("otp_log"),
            "delivery_status": result.get("delivery_status"),
        }

    if cint(settings.enable_user_after_otp_verification) and not cint(user.enabled):
        frappe.db.set_value("User", user.name, "enabled", 1)
    _login_user(user.name, settings)
    frappe.db.commit()
    return {"status": "success", "user": _public_user(user.name)}


@frappe.whitelist(allow_guest=True)
def login(email, password):
    settings = get_settings()
    _require_enabled(settings)
    if not cint(settings.allow_password_login):
        frappe.throw(_("Password login is disabled."), frappe.PermissionError)

    email = _normalize_email(email)
    if getattr(frappe.local, "request", None):
        LoginManager().authenticate(user=email, pwd=password)
    else:
        check_password(email, password)
    _ensure_candidate_user(email, settings)
    _login_user(email, settings)
    frappe.db.commit()
    return {"status": "success", "user": _public_user(email)}


@frappe.whitelist(allow_guest=True)
def request_otp(identifier, purpose="Login", identifier_type="Email"):
    settings = get_settings()
    _require_enabled(settings)
    identifier_type = _clean_identifier_type(identifier_type)
    purpose = _clean_purpose(purpose)
    identifier = _normalize_identifier(identifier, identifier_type)

    if identifier_type == "Email":
        if not cint(settings.enable_email_otp):
            frappe.throw(_("Email OTP is disabled."), frappe.PermissionError)
        if purpose == "Login" and not cint(settings.allow_email_otp_login):
            frappe.throw(_("Email OTP login is disabled."), frappe.PermissionError)
    elif not cint(settings.enable_mobile_otp):
        frappe.throw(_("Mobile OTP is disabled."), frappe.PermissionError)

    user = _resolve_user_for_identifier(identifier, identifier_type, purpose)
    if purpose == "Login":
        _ensure_candidate_user(user, settings)

    result = _issue_otp(settings, identifier, purpose, identifier_type, user=user)
    frappe.db.commit()
    return result


@frappe.whitelist(allow_guest=True)
def verify_otp(identifier, otp, purpose="Login", identifier_type="Email"):
    settings = get_settings()
    _require_enabled(settings)
    identifier_type = _clean_identifier_type(identifier_type)
    purpose = _clean_purpose(purpose)
    identifier = _normalize_identifier(identifier, identifier_type)
    otp = (otp or "").strip()
    if not otp:
        frappe.throw(_("OTP is required."))

    log = _get_active_otp_log(identifier, purpose, identifier_type)
    if not log:
        frappe.throw(_("No active OTP found. Please request a new OTP."), frappe.DoesNotExistError)

    now = now_datetime()
    if get_datetime(log.expires_at) < now:
        _mark_otp_log(log, "Expired", failure_reason="OTP expired")
        frappe.throw(_("OTP has expired. Please request a new OTP."))

    log.attempts = cint(log.attempts) + 1
    log.last_attempt_at = now
    if not _verify_otp_hash(log.get_password("otp_hash") or log.otp_hash, identifier, otp):
        if log.attempts >= cint(log.max_attempts):
            _mark_otp_log(log, "Failed", failure_reason="Maximum attempts exceeded")
        else:
            log.save(ignore_permissions=True)
        frappe.throw(_("Invalid OTP."))

    log.status = "Verified"
    log.verified_at = now
    log.save(ignore_permissions=True)

    if not log.user:
        frappe.throw(_("No user is linked to this OTP request."))

    if purpose in ("Signup", "Verify Email") and cint(settings.enable_user_after_otp_verification):
        frappe.db.set_value("User", log.user, "enabled", 1)

    _ensure_candidate_user(log.user, settings)
    _login_user(log.user, settings)
    frappe.db.commit()
    return {"status": "success", "user": _public_user(log.user)}


@frappe.whitelist()
def logout():
    if getattr(frappe.local, "login_manager", None):
        frappe.local.login_manager.logout()
    else:
        LoginManager().logout()
    frappe.db.commit()
    return {"status": "success"}


@frappe.whitelist(allow_guest=True)
def me():
    user = getattr(frappe.session, "user", "Guest")
    if not user or user == "Guest":
        return {"user": None}
    settings = get_settings()
    if not _has_candidate_role(user, settings.candidate_role):
        return {"user": None}
    return {"user": _public_user(user)}


@frappe.whitelist()
def get_latest_debug_otp(identifier, purpose="Login", identifier_type="Email"):
    settings = get_settings()
    if not cint(settings.store_plain_otp_for_debug):
        frappe.throw(_("OTP preview is disabled in Candidate Portal Auth Settings."), frappe.PermissionError)
    if cint(settings.debug_allowed_for_system_manager_only) and "System Manager" not in frappe.get_roles():
        frappe.throw(_("Only System Manager can read OTP previews."), frappe.PermissionError)

    identifier_type = _clean_identifier_type(identifier_type)
    purpose = _clean_purpose(purpose)
    identifier = _normalize_identifier(identifier, identifier_type)
    name = frappe.db.get_value(
        "Candidate Portal OTP Log",
        {"identifier": identifier, "identifier_type": identifier_type, "purpose": purpose},
        "name",
        order_by="creation desc",
    )
    if not name:
        return None
    log = frappe.get_doc("Candidate Portal OTP Log", name)
    return {"otp": log.otp_preview, "status": log.status, "expires_at": log.expires_at}


def _issue_otp(settings, identifier, purpose, identifier_type, user=None):
    _enforce_otp_rate_limits(settings, identifier, purpose, identifier_type)
    if cint(settings.revoke_existing_otps_on_new_request):
        _revoke_active_otps(identifier, purpose, identifier_type)

    otp = _generate_otp(cint(settings.otp_length))
    delivery_channel = "Email" if identifier_type == "Email" else "SMS"
    log = frappe.new_doc("Candidate Portal OTP Log")
    log.identifier = identifier
    log.identifier_type = identifier_type
    log.purpose = purpose
    log.status = "Generated"
    log.user = user
    log.expires_at = add_to_date(now_datetime(), minutes=cint(settings.otp_expiry_minutes))
    log.otp_hash = _hash_otp(identifier, otp)
    log.otp_preview = otp if cint(settings.store_plain_otp_for_debug) else ""
    log.attempts = 0
    log.max_attempts = cint(settings.max_attempts_per_otp)
    log.delivery_channel = delivery_channel
    log.delivery_status = "Pending"
    log.session_id = getattr(frappe.session, "sid", None)
    log.ip_address = getattr(frappe.local, "request_ip", None)
    log.user_agent = frappe.get_request_header("User-Agent") if getattr(frappe.local, "request", None) else None
    log.request_id = frappe.get_request_header("X-Request-ID") if getattr(frappe.local, "request", None) else None
    log.settings_snapshot = json.dumps(_settings_snapshot(settings))
    log.created_by_api = 1
    log.insert(ignore_permissions=True)

    delivery = _deliver_otp(settings, identifier, purpose, delivery_channel, otp)
    log.delivery_status = delivery["status"]
    log.status = "Sent" if delivery["status"] == "Sent" else "Generated"
    log.sent_at = now_datetime() if delivery["status"] == "Sent" else None
    log.provider_reference = delivery.get("provider_reference")
    log.error_message = delivery.get("error_message")
    log.save(ignore_permissions=True)

    return {"status": "otp_required", "otp_log": log.name, "delivery_status": log.delivery_status}


def _deliver_otp(settings, identifier, purpose, delivery_channel, otp):
    context = {
        "otp": otp,
        "purpose": purpose,
        "expiry_minutes": cint(settings.otp_expiry_minutes),
    }
    try:
        if delivery_channel == "Email":
            frappe.sendmail(
                recipients=[identifier],
                subject=render_template(settings.email_otp_subject, context),
                message=render_template(settings.email_otp_template, context),
                sender=settings.email_sender or None,
                delayed=False,
            )
        else:
            from frappe.core.doctype.sms_settings.sms_settings import send_sms

            send_sms([identifier], render_template(settings.sms_otp_template, context))
        return {"status": "Sent"}
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "Candidate Portal OTP Delivery Failed")
        return {"status": "Failed", "error_message": str(exc)}


def _create_candidate_user(settings, email, password, full_name=None, mobile_no=None):
    first_name, last_name = _split_name(full_name or email.split("@")[0])
    user = frappe.new_doc("User")
    user.email = email
    user.username = email
    user.first_name = first_name
    user.last_name = last_name
    user.user_type = "Website User"
    user.enabled = 0 if cint(settings.signup_requires_otp_verification) else 1
    user.send_welcome_email = cint(settings.send_frappe_welcome_email)
    user.mobile_no = mobile_no
    user.append("roles", {"role": settings.candidate_role})
    user.new_password = password
    user.insert(ignore_permissions=True)
    return user


def _login_user(user, settings):
    if not getattr(frappe.local, "request", None):
        frappe.set_user(user)
        return

    login_manager = LoginManager()
    login_manager.login_as(user)
    frappe.local.login_manager = login_manager
    if cint(settings.logout_other_sessions_on_login):
        from frappe.sessions import clear_sessions

        clear_sessions(user, keep_current=True)


def _ensure_candidate_user(user, settings):
    if not frappe.db.exists("User", user):
        frappe.throw(_("User not found."), frappe.DoesNotExistError)
    if not cint(frappe.db.get_value("User", user, "enabled")):
        frappe.throw(_("User is disabled. Please verify OTP first."), frappe.PermissionError)
    if not _has_candidate_role(user, settings.candidate_role):
        frappe.throw(_("User is not allowed to access the candidate portal."), frappe.PermissionError)


def _has_candidate_role(user, role):
    return bool(frappe.db.exists("Has Role", {"parent": user, "role": role}))


def _public_user(user):
    values = frappe.db.get_value(
        "User",
        user,
        ["name", "email", "first_name", "last_name", "full_name", "user_image", "enabled", "user_type"],
        as_dict=True,
    )
    if not values:
        return None
    values["roles"] = frappe.get_roles(user)
    return values


def _resolve_user_for_identifier(identifier, identifier_type, purpose):
    if identifier_type == "Email":
        user = frappe.db.get_value("User", {"email": identifier}, "name")
    else:
        user = frappe.db.get_value("User", {"mobile_no": identifier}, "name")

    if purpose == "Login" and not user:
        frappe.throw(_("No candidate account found for this identifier."), frappe.DoesNotExistError)
    return user


def _get_active_otp_log(identifier, purpose, identifier_type):
    name = frappe.db.get_value(
        "Candidate Portal OTP Log",
        {
            "identifier": identifier,
            "identifier_type": identifier_type,
            "purpose": purpose,
            "status": ("not in", FINAL_OTP_STATUSES),
        },
        "name",
        order_by="creation desc",
    )
    return frappe.get_doc("Candidate Portal OTP Log", name) if name else None


def _enforce_otp_rate_limits(settings, identifier, purpose, identifier_type):
    latest = _get_active_otp_log(identifier, purpose, identifier_type)
    now = now_datetime()
    if latest and latest.creation:
        cooldown_ends = add_to_date(latest.creation, seconds=cint(settings.resend_cooldown_seconds))
        if get_datetime(cooldown_ends) > now:
            frappe.throw(_("Please wait before requesting another OTP."))

    since = add_to_date(now, hours=-1)
    count = frappe.db.count(
        "Candidate Portal OTP Log",
        {
            "identifier": identifier,
            "identifier_type": identifier_type,
            "purpose": purpose,
            "creation": (">=", since),
        },
    )
    if count >= cint(settings.max_otps_per_hour):
        frappe.throw(_("Too many OTP requests. Please try again later."))


def _revoke_active_otps(identifier, purpose, identifier_type):
    names = frappe.get_all(
        "Candidate Portal OTP Log",
        filters={
            "identifier": identifier,
            "identifier_type": identifier_type,
            "purpose": purpose,
            "status": ("not in", FINAL_OTP_STATUSES),
        },
        pluck="name",
    )
    for name in names:
        log = frappe.get_doc("Candidate Portal OTP Log", name)
        _mark_otp_log(log, "Revoked")


def _mark_otp_log(log, status, failure_reason=None):
    log.status = status
    if status == "Revoked":
        log.revoked_at = now_datetime()
    if failure_reason:
        log.failure_reason = failure_reason
    log.save(ignore_permissions=True)


def _settings_snapshot(settings):
    return {
        "otp_length": cint(settings.otp_length),
        "otp_expiry_minutes": cint(settings.otp_expiry_minutes),
        "max_attempts_per_otp": cint(settings.max_attempts_per_otp),
        "resend_cooldown_seconds": cint(settings.resend_cooldown_seconds),
        "max_otps_per_hour": cint(settings.max_otps_per_hour),
        "enable_email_otp": cint(settings.enable_email_otp),
        "enable_mobile_otp": cint(settings.enable_mobile_otp),
        "mobile_delivery_mode": settings.mobile_delivery_mode,
        "candidate_role": settings.candidate_role,
    }


def _require_enabled(settings):
    if not cint(settings.enabled):
        frappe.throw(_("Candidate portal authentication is disabled."), frappe.PermissionError)


def _generate_otp(length):
    start = 10 ** (length - 1)
    end = (10 ** length) - 1
    return str(random.SystemRandom().randint(start, end))


def _hash_otp(identifier, otp):
    salt = frappe.conf.get("encryption_key") or frappe.local.site or "candidate-portal"
    value = f"{salt}|{identifier}|{otp}".encode()
    return hashlib.sha256(value).hexdigest()


def _verify_otp_hash(stored_hash, identifier, otp):
    return hmac.compare_digest(stored_hash or "", _hash_otp(identifier, otp))


def _normalize_email(email):
    email = (email or "").strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        frappe.throw(_("Enter a valid email address."))
    return email


def _normalize_identifier(identifier, identifier_type):
    if identifier_type == "Email":
        return _normalize_email(identifier)
    cleaned = re.sub(r"[^\d+]", "", identifier or "")
    if len(cleaned) < 8:
        frappe.throw(_("Enter a valid mobile number."))
    return cleaned


def _clean_identifier_type(identifier_type):
    identifier_type = (identifier_type or "Email").strip()
    if identifier_type not in ("Email", "Mobile"):
        frappe.throw(_("Invalid identifier type."))
    return identifier_type


def _clean_purpose(purpose):
    purpose = (purpose or "Login").strip()
    allowed = ("Signup", "Login", "Verify Email", "Verify Mobile", "Password Reset")
    if purpose not in allowed:
        frappe.throw(_("Invalid OTP purpose."))
    return purpose


def _split_name(full_name):
    parts = (full_name or "").strip().split()
    if not parts:
        return "Candidate", ""
    return parts[0], " ".join(parts[1:])
