import hashlib
import hmac
import json
import random
import re
import secrets
from functools import wraps

import frappe
from frappe import _
from frappe.utils import add_to_date, cint, get_datetime, now_datetime
from frappe.utils.jinja import render_template

from recruitment.recruitment.doctype.candidate_portal_auth_settings.candidate_portal_auth_settings import (
    DEFAULT_PRIMARY_COLOR,
    get_settings,
)


COOKIE_NAME = "candidate_portal_session"
FINAL_OTP_STATUSES = ("Verified", "Failed", "Expired", "Revoked")
SAFE_SETTINGS_FIELDS = (
    "enabled",
    "allow_password_login",
    "allow_email_otp_login",
    "allow_signup",
    "signup_requires_otp_verification",
    "enable_email_signup",
    "require_otp_on_password_login",
    "enable_email_otp",
    "enable_mobile_otp",
    "mobile_delivery_mode",
    "redirect_to",
    "primary_color",
    "enable_theme_mode",
)


def candidate_required(fn):
    """Whitelisted endpoint that requires a valid Candidate Portal Session cookie.

    Validates the `candidate_portal_session` cookie, refuses unauthenticated
    callers with 401, and stashes the resolved candidate on `frappe.local`
    so the endpoint body can read it via `get_current_candidate()`.
    """

    @frappe.whitelist(allow_guest=True)
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_session_cookie()
        if not token:
            frappe.local.response["http_status_code"] = 401
            frappe.throw(_("Authentication required."), frappe.AuthenticationError)

        session = _get_active_session(token)
        if not session:
            _delete_session_cookie()
            frappe.local.response["http_status_code"] = 401
            frappe.throw(_("Session expired. Please log in again."), frappe.AuthenticationError)

        session.last_seen_at = now_datetime()
        session.save(ignore_permissions=True)

        frappe.local.candidate_session = session
        frappe.local.candidate = session.candidate
        return fn(*args, **kwargs)

    return wrapper


def get_current_candidate():
    """Return the authenticated candidate's name (Candidate Portal User id).

    Only meaningful inside an endpoint wrapped by `@candidate_required`.
    Returns None outside that scope.
    """
    return getattr(frappe.local, "candidate", None)


def get_current_candidate_session():
    """Return the active Candidate Portal Session document for the current request."""
    return getattr(frappe.local, "candidate_session", None)


def enforce_candidate_identity(email=None, job_applicant_id=None):
    """Assert any supplied identifier belongs to the authenticated candidate."""
    session_email = get_current_candidate()
    if not session_email:
        frappe.local.response["http_status_code"] = 401
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    if email and (email or "").strip().lower() != session_email.lower():
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not allowed to access this resource."), frappe.PermissionError)

    if job_applicant_id:
        # Primary link: the Candidate Portal User points at this applicant.
        linked = frappe.db.get_value("Candidate Portal User", session_email, "job_applicant")
        if not (linked and linked == job_applicant_id):
            # A candidate can have multiple Job Applicant records (one per
            # application) while the CPU links only one. Fall back to email
            # ownership: allow when the applicant's email_id matches the
            # authenticated candidate. Secure — a candidate can only reach
            # applicants carrying their own login email.
            applicant_email = frappe.db.get_value("Job Applicant", job_applicant_id, "email_id")
            if not applicant_email or applicant_email.strip().lower() != session_email.lower():
                frappe.local.response["http_status_code"] = 403
                frappe.throw(_("Not allowed to access this resource."), frappe.PermissionError)

    return session_email


@frappe.whitelist(allow_guest=True)
def get_auth_settings():
    settings = get_settings()
    data = {
        field: cint(settings.get(field)) if field.startswith(("allow_", "enable_", "signup_", "require_", "enabled")) else settings.get(field)
        for field in SAFE_SETTINGS_FIELDS
    }
    # Defaulted here, not in apply_missing_defaults: a missing value there makes
    # this guest endpoint save the Single, so one unauthenticated hit per upgraded
    # site would fire a full document write.
    data["primary_color"] = data["primary_color"] or DEFAULT_PRIMARY_COLOR
    return data


@frappe.whitelist(allow_guest=True)
def signup(email, password, full_name=None, mobile_no=None, candidate_source=None):
    settings = get_settings()
    _require_enabled(settings)
    if not cint(settings.allow_signup):
        frappe.throw(_("Candidate signup is disabled."), frappe.PermissionError)

    email = _normalize_email(email)
    full_name = (full_name or "").strip()
    if frappe.db.exists("Candidate Portal User", email):
        frappe.throw(_("Candidate already registered."), frappe.DuplicateEntryError)

    # Campus candidates arrive from the registration email → the frontend sends
    # candidate_source="Campus" (a provenance flag). The specific invite is NOT
    # stored here; it's chosen per application (see campus.get_my_invites).
    candidate = _create_candidate(email, password, full_name, mobile_no,
                                  candidate_source=candidate_source)
    if cint(settings.signup_requires_otp_verification):
        if not cint(settings.enable_email_otp):
            frappe.throw(_("Email OTP must be enabled when signup OTP verification is required."))
        result = _issue_otp(settings, email, "Signup", "Email", candidate=candidate.name)
        frappe.db.commit()
        return {
            "status": "otp_required",
            "user": _public_candidate(candidate.name),
            "otp_log": result.get("otp_log"),
            "delivery_status": result.get("delivery_status"),
        }

    candidate.status = "Active"
    candidate.email_verified = 1
    candidate.save(ignore_permissions=True)
    session = _create_candidate_session(candidate.name, settings, "Signup Email OTP")
    _set_session_cookie(session.session_token, settings)
    frappe.db.commit()
    return {"status": "success", "user": _public_candidate(candidate.name), "session_id": session.name}


@frappe.whitelist(allow_guest=True)
def login(email, password):
    settings = get_settings()
    _require_enabled(settings)
    if not cint(settings.allow_password_login):
        frappe.throw(_("Password login is disabled."), frappe.PermissionError)

    email = _normalize_email(email)
    candidate = _get_candidate_for_login(email)
    _assert_candidate_can_login(candidate)
    if not _candidate_has_password(candidate):
        frappe.throw(_("This account has not finished activation. Please complete the activation flow."), frappe.PermissionError)
    _verify_candidate_password(candidate, password)

    if cint(settings.require_otp_on_password_login):
        frappe.db.commit()
        return {"status": "otp_required", "user": _public_candidate(candidate.name)}

    session = _create_candidate_session(candidate.name, settings, "Password")
    _set_session_cookie(session.session_token, settings)
    frappe.db.commit()
    return {"status": "success", "user": _public_candidate(candidate.name), "session_id": session.name}


@frappe.whitelist(allow_guest=True)
def request_email_signup_otp(email, full_name=None, mobile_no=None, mode=None,
                             candidate_source=None):
    settings = get_settings()
    _require_enabled(settings)
    if not cint(settings.enable_email_otp):
        frappe.throw(_("Email OTP is disabled."), frappe.PermissionError)

    email = _normalize_email(email)
    mode = (mode or "").strip().lower() or None
    if mode and mode not in ("verify_email", "password_reset"):
        frappe.throw(_("Invalid mode."))
    existing_name = frappe.db.get_value("Candidate Portal User", {"email": email}, "name")

    if existing_name:
        candidate = frappe.get_doc("Candidate Portal User", existing_name)
        if candidate.status == "Disabled":
            frappe.throw(_("Candidate account is disabled."), frappe.PermissionError)

        already_verified = candidate.status == "Active" and cint(candidate.email_verified)
        if mode == "verify_email" and already_verified:
            frappe.throw(_("Email already verified. Please log in to your account."))

        if candidate.status == "Pending Verification" and not cint(candidate.email_verified):
            if mode == "password_reset":
                frappe.throw(_("This account is not activated yet. Please verify your email first."), frappe.PermissionError)
            if not cint(settings.enable_email_signup):
                frappe.throw(_("Email signup is disabled."), frappe.PermissionError)
            _assert_candidate_can_login(candidate, allow_pending=True)
            result = _issue_otp(settings, email, "Signup", "Email", candidate=candidate.name)
            frappe.db.commit()
            return {"mode": "signup", "purpose": "Signup", **result}

        if not cint(settings.allow_password_login):
            frappe.throw(_("Password reset is disabled."), frappe.PermissionError)
        _assert_candidate_can_login(candidate)
        result = _issue_otp(settings, email, "Password Reset", "Email", candidate=candidate.name)
        frappe.db.commit()
        return {"mode": "password_reset", "purpose": "Password Reset", **result}

    if mode == "password_reset":
        frappe.throw(_("No candidate account found for this email."), frappe.DoesNotExistError)
    if not cint(settings.enable_email_signup):
        frappe.throw(_("Email signup is disabled."), frappe.PermissionError)

    first_name, last_name = _split_name(full_name or email.split("@")[0])
    try:
        candidate = frappe.new_doc("Candidate Portal User")
        candidate.email = email
        candidate.full_name = full_name or " ".join(part for part in (first_name, last_name) if part)
        candidate.mobile_no = mobile_no
        candidate.status = "Pending Verification"
        candidate.email_verified = 0
        candidate.mobile_verified = 0
        _apply_signup_source(candidate, candidate_source, default_source="Email Signup")
        candidate.signup_ip_address = _request_ip()
        candidate.signup_user_agent = _request_user_agent()
        candidate.insert(ignore_permissions=True)
    except frappe.DuplicateEntryError:
        # Lost the race / unique constraint caught a concurrent insert.
        # Recover by loading the row that won and continuing.
        fallback_name = frappe.db.get_value("Candidate Portal User", {"email": email}, "name")
        if not fallback_name:
            raise
        candidate = frappe.get_doc("Candidate Portal User", fallback_name)

    result = _issue_otp(settings, email, "Signup", "Email", candidate=candidate.name)
    frappe.db.commit()
    return {"mode": "signup", "purpose": "Signup", **result}


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

    if purpose == "Activate" and identifier_type != "Email":
        frappe.throw(_("Activation requires an email identifier."))

    candidate = _resolve_candidate_for_identifier(identifier, identifier_type, purpose)
    if purpose == "Login":
        _assert_candidate_can_login(candidate)
    elif purpose == "Activate":
        _assert_candidate_can_activate(candidate)

    result = _issue_otp(settings, identifier, purpose, identifier_type, candidate=candidate.name if candidate else None)
    frappe.db.commit()
    return result


@frappe.whitelist(allow_guest=True)
def verify_otp(identifier, otp, purpose="Login", identifier_type="Email", otp_log=None):
    settings = get_settings()
    _require_enabled(settings)
    identifier_type = _clean_identifier_type(identifier_type)
    identifier = _normalize_identifier(identifier, identifier_type)
    otp = (otp or "").strip()
    if not otp:
        frappe.throw(_("OTP is required."))

    log = _load_otp_log_for_verify(identifier, identifier_type, purpose, otp_log)
    if not log:
        frappe.throw(_("No active OTP found. Please request a new OTP."), frappe.DoesNotExistError)
    purpose = log.purpose

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

    if not log.candidate:
        frappe.throw(_("No candidate is linked to this OTP request."))

    candidate = frappe.get_doc("Candidate Portal User", log.candidate)
    if purpose in ("Signup", "Verify Email"):
        candidate.status = "Active"
        candidate.email_verified = 1
        candidate.save(ignore_permissions=True)
    elif purpose == "Activate":
        candidate.email_verified = 1
        candidate.save(ignore_permissions=True)
    elif purpose == "Password Reset":
        candidate.require_password_reset = 1
        candidate.save(ignore_permissions=True)
    _assert_candidate_can_login(candidate, allow_pending=purpose in ("Signup", "Verify Email", "Activate"))

    if purpose == "Signup":
        login_method = "Signup Email OTP"
    elif purpose == "Activate":
        login_method = "Activation Email OTP"
    elif purpose == "Password Reset":
        login_method = "Password Reset Email OTP"
    else:
        login_method = "Password + Email OTP"
    session = _create_candidate_session(candidate.name, settings, login_method, otp_log=log.name)
    _set_session_cookie(session.session_token, settings)
    frappe.db.commit()

    user_payload = _public_candidate(candidate.name)
    response = {"status": "success", "user": user_payload, "session_id": session.name}
    if user_payload and user_payload.get("password_setup_required"):
        response["status"] = "password_setup_required"
    return response


@frappe.whitelist(allow_guest=True)
def logout():
    token = _get_session_cookie()
    if token:
        session = _get_active_session(token)
        if session:
            _revoke_session(session, "Logout")
    _delete_session_cookie()
    frappe.db.commit()
    return {"status": "success"}


@candidate_required
def set_password(password):
    """First-time / forced password setup for the authenticated candidate.

    Only callable when the candidate has no password yet, or `require_password_reset`
    is set. Transitions Pending Verification → Active.
    """
    candidate = frappe.get_doc("Candidate Portal User", get_current_candidate())
    if _candidate_has_password(candidate) and not cint(candidate.require_password_reset):
        frappe.throw(_("Password is already set. Use the password reset flow to change it."), frappe.PermissionError)

    candidate.password_hash = _hash_password(password)
    candidate.password_updated_at = now_datetime()
    candidate.require_password_reset = 0
    if candidate.status == "Pending Verification":
        candidate.status = "Active"
    candidate.email_verified = 1
    candidate.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "user": _public_candidate(candidate.name)}


@candidate_required
def change_password(current_password, new_password, confirm_password=None):
    """Change password for the authenticated candidate from the profile page."""
    candidate = frappe.get_doc("Candidate Portal User", get_current_candidate())

    current_password = (current_password or "").strip()
    new_password = new_password or ""
    confirm_password = new_password if confirm_password is None else confirm_password

    if not current_password:
        frappe.throw(_("Current password is required."))
    if not new_password:
        frappe.throw(_("New password is required."))
    if new_password != confirm_password:
        frappe.throw(_("New password and confirm password do not match."))
    if not _candidate_has_password(candidate):
        frappe.throw(
            _("This account has not finished password setup yet. Please use the set password flow first."),
            frappe.PermissionError,
        )

    stored_hash = candidate.get_password("password_hash") or candidate.password_hash
    if not _check_password(current_password, stored_hash):
        frappe.throw(_("Current password is incorrect."), frappe.AuthenticationError)
    if _check_password(new_password, stored_hash):
        frappe.throw(_("New password must be different from the current password."))

    candidate.password_hash = _hash_password(new_password)
    candidate.password_updated_at = now_datetime()
    candidate.require_password_reset = 0
    if candidate.status == "Pending Verification":
        candidate.status = "Active"
    candidate.email_verified = 1
    candidate.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "message": _("Password updated successfully."), "user": _public_candidate(candidate.name)}


@frappe.whitelist(allow_guest=True)
def me():
    token = _get_session_cookie()
    if not token:
        return {"user": None}

    session = _get_active_session(token)
    if not session:
        _delete_session_cookie()
        return {"user": None}

    session.last_seen_at = now_datetime()
    session.save(ignore_permissions=True)
    user = _public_candidate(session.candidate)
    if user:
        user["last_login_at"] = frappe.db.get_value("Candidate Portal User", session.candidate, "last_login_at")
    return {"user": user, "session_id": session.name}


@candidate_required
def update_me(data=None):
    """Patch the authenticated candidate's editable profile fields."""
    candidate_name = get_current_candidate()
    doc = frappe.get_doc("Candidate Portal User", candidate_name)

    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.throw(_("Invalid data format. Expected JSON object."))

    if not isinstance(data, dict) or not data:
        frappe.throw(_("Profile update payload is required."))

    updates = _sanitize_candidate_profile_update(data, doc)
    if not updates:
        frappe.throw(_("No editable profile fields were provided."))

    for fieldname, value in updates.items():
        doc.set(fieldname, value)

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "user": _public_candidate(doc.name)}


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


def _create_candidate(email, password, full_name=None, mobile_no=None, candidate_source=None):
    first_name, last_name = _split_name(full_name or email.split("@")[0])
    candidate = frappe.new_doc("Candidate Portal User")
    candidate.email = email
    candidate.full_name = full_name or " ".join(part for part in (first_name, last_name) if part)
    candidate.mobile_no = mobile_no
    candidate.status = "Pending Verification"
    candidate.email_verified = 0
    candidate.mobile_verified = 0
    candidate.password_hash = _hash_password(password)
    candidate.password_updated_at = now_datetime()
    candidate.signup_ip_address = _request_ip()
    candidate.signup_user_agent = _request_user_agent()
    _apply_signup_source(candidate, candidate_source)
    candidate.insert(ignore_permissions=True)
    return candidate


def _apply_signup_source(candidate, candidate_source=None, default_source=None):
    """Stamp the signup provenance flag the frontend sends (e.g. candidate_source=
    'Campus'). We deliberately do NOT store a specific campus invite on the user: a
    candidate can be registered across many invites, so the invite is a per-application
    value (passed at apply time and stored on the Job Applicant), never a user attribute."""
    source = (candidate_source or "").strip() or default_source
    if source:
        candidate.candidate_source = source


def ensure_candidate_for_invite(email, full_name=None, mobile_no=None, job_applicant=None, candidate_source=None):
    """Idempotently provision a Candidate Portal User for the invite/activation flow.

    Returns the existing CPU if one is already linked to this email. Otherwise
    creates a Pending Verification row with no password — the candidate will
    set one via the OTP activation flow.
    """
    email = _normalize_email(email)
    if frappe.db.exists("Candidate Portal User", email):
        candidate = frappe.get_doc("Candidate Portal User", email)
        if job_applicant and not candidate.job_applicant:
            candidate.job_applicant = job_applicant
            candidate.save(ignore_permissions=True)
        return candidate

    first_name, last_name = _split_name(full_name or email.split("@")[0])
    candidate = frappe.new_doc("Candidate Portal User")
    candidate.email = email
    candidate.full_name = full_name or " ".join(part for part in (first_name, last_name) if part)
    candidate.mobile_no = mobile_no
    candidate.status = "Pending Verification"
    candidate.email_verified = 0
    candidate.mobile_verified = 0
    candidate.job_applicant = job_applicant
    candidate.candidate_source = candidate_source or "Job Offer Invite"
    candidate.signup_ip_address = _request_ip()
    candidate.signup_user_agent = _request_user_agent()
    candidate.insert(ignore_permissions=True)
    return candidate


def _issue_otp(settings, identifier, purpose, identifier_type, candidate=None):
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
    log.candidate = candidate
    log.expires_at = add_to_date(now_datetime(), minutes=cint(settings.otp_expiry_minutes))
    log.otp_hash = _hash_otp(identifier, otp)
    log.otp_preview = otp if cint(settings.store_plain_otp_for_debug) else ""
    log.attempts = 0
    log.max_attempts = cint(settings.max_attempts_per_otp)
    log.delivery_channel = delivery_channel
    log.delivery_status = "Pending"
    log.session_id = _get_session_cookie()
    log.ip_address = _request_ip()
    log.user_agent = _request_user_agent()
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
    context = {"otp": otp, "purpose": purpose, "expiry_minutes": cint(settings.otp_expiry_minutes)}
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


def _create_candidate_session(candidate, settings, login_method, otp_log=None):
    if cint(settings.logout_other_sessions_on_login):
        _revoke_candidate_sessions(candidate, "New login")

    token = secrets.token_urlsafe(48)
    now = now_datetime()
    session = frappe.new_doc("Candidate Portal Session")
    session.candidate = candidate
    session.status = "Active"
    session.login_method = login_method
    session.otp_log = otp_log
    session.issued_at = now
    session_hours = cint(settings.get("session_expiry_hours")) or 24
    session.expires_at = add_to_date(now, hours=session_hours)
    session.last_seen_at = now
    session.session_token_hash = _hash_session_token(token)
    session.ip_address = _request_ip()
    session.user_agent = _request_user_agent()
    session.request_id = frappe.get_request_header("X-Request-ID") if getattr(frappe.local, "request", None) else None
    session.insert(ignore_permissions=True)
    session.session_token = token

    frappe.db.set_value(
        "Candidate Portal User",
        candidate,
        {
            "last_login_at": now,
            "last_session": session.name,
            "last_login_ip_address": session.ip_address,
            "last_login_user_agent": session.user_agent,
            "failed_login_attempts": 0,
        },
    )
    return session


def _get_active_session(token):
    token_hash = _hash_session_token(token)
    name = frappe.db.get_value(
        "Candidate Portal Session",
        {"session_token_hash": token_hash, "status": "Active"},
        "name",
        order_by="creation desc",
    )
    if not name:
        return None

    session = frappe.get_doc("Candidate Portal Session", name)
    if get_datetime(session.expires_at) < now_datetime():
        _revoke_session(session, "Expired", status="Expired")
        return None

    candidate_status = frappe.db.get_value("Candidate Portal User", session.candidate, "status")
    if candidate_status != "Active":
        _revoke_session(session, "Candidate inactive")
        return None
    return session


def _revoke_candidate_sessions(candidate, reason):
    names = frappe.get_all(
        "Candidate Portal Session",
        filters={"candidate": candidate, "status": "Active"},
        pluck="name",
    )
    for name in names:
        _revoke_session(frappe.get_doc("Candidate Portal Session", name), reason)


def _revoke_session(session, reason, status="Revoked"):
    session.status = status
    session.revoked_at = now_datetime()
    session.revoked_reason = reason
    session.save(ignore_permissions=True)


def _get_candidate_for_login(email):
    if not frappe.db.exists("Candidate Portal User", email):
        frappe.throw(_("No candidate account found for this email."), frappe.DoesNotExistError)
    return frappe.get_doc("Candidate Portal User", email)


def _resolve_candidate_for_identifier(identifier, identifier_type, purpose):
    if identifier_type == "Email":
        name = frappe.db.get_value("Candidate Portal User", {"email": identifier}, "name")
    else:
        name = frappe.db.get_value("Candidate Portal User", {"mobile_no": identifier}, "name")
    if purpose == "Login" and not name:
        frappe.throw(_("No candidate account found for this identifier."), frappe.DoesNotExistError)
    if purpose == "Activate" and not name:
        frappe.throw(_("No invitation found for this email. Please contact HR."), frappe.DoesNotExistError)
    return frappe.get_doc("Candidate Portal User", name) if name else None


def _assert_candidate_can_activate(candidate):
    """Activation is only valid for invited candidates who have not yet set a password."""
    if candidate.status == "Disabled":
        frappe.throw(_("Candidate account is disabled."), frappe.PermissionError)
    if candidate.status == "Locked":
        frappe.throw(_("Candidate account is locked."), frappe.PermissionError)
    if _candidate_has_password(candidate):
        frappe.throw(_("This account is already activated. Please sign in with your password."), frappe.PermissionError)


def _candidate_has_password(candidate):
    """True if the candidate already has a stored password hash."""
    try:
        stored = candidate.get_password("password_hash") if hasattr(candidate, "get_password") else None
    except Exception:
        stored = None
    return bool(stored or candidate.get("password_hash"))


def _assert_candidate_can_login(candidate, allow_pending=False):
    if candidate.status == "Disabled":
        frappe.throw(_("Candidate account is disabled."), frappe.PermissionError)
    if candidate.status == "Locked":
        if candidate.locked_until and get_datetime(candidate.locked_until) <= now_datetime():
            _clear_candidate_lock(candidate)
            return
        frappe.throw(_("Candidate account is locked."), frappe.PermissionError)
    if candidate.status == "Pending Verification" and not allow_pending:
        frappe.throw(_("Please verify your email OTP before signing in."), frappe.PermissionError)


def _clear_candidate_lock(candidate):
    candidate.status = "Active"
    candidate.failed_login_attempts = 0
    candidate.locked_until = None
    candidate.save(ignore_permissions=True)
    frappe.db.commit()


def _verify_candidate_password(candidate, password):
    if candidate.locked_until and get_datetime(candidate.locked_until) > now_datetime():
        frappe.throw(_("Candidate account is temporarily locked."), frappe.PermissionError)

    stored_hash = candidate.get_password("password_hash") or candidate.password_hash
    if not _check_password(password, stored_hash):
        candidate.failed_login_attempts = cint(candidate.failed_login_attempts) + 1
        if candidate.failed_login_attempts >= 5:
            candidate.status = "Locked"
            candidate.locked_until = add_to_date(now_datetime(), minutes=15)
        candidate.save(ignore_permissions=True)
        frappe.db.commit()
        frappe.throw(_("Invalid email or password."), frappe.AuthenticationError)


def _resolve_candidate_full_name(values):
    """Prefer the candidate's real name from their Job Applicant record
    (applicant_name + custom_applicant_last_name) so the dashboard shows the full
    name instead of the signup email prefix.

    In this flow the Job Applicant (and offer) exist before the candidate logs in,
    so the name is available. Resolution order: the Candidate Portal User's linked
    `job_applicant`, then the most recent Job Applicant matching the candidate's
    email. Returns None when nothing usable is found (callers fall back to the CPU
    full_name / email). Best-effort — never raises, so `me`/login can't break."""
    try:
        job_applicant = values.get("job_applicant")
        if not job_applicant and values.get("email"):
            job_applicant = frappe.db.get_value(
                "Job Applicant", {"email_id": values.get("email")}, "name", order_by="creation desc"
            )
        if not job_applicant:
            return None
        from recruitment.api.applicant_name import get_full_name

        return get_full_name(job_applicant) or None
    except Exception:
        return None


def _public_candidate(candidate):
    values = frappe.db.get_value(
        "Candidate Portal User",
        candidate,
        ["name", "email", "full_name", "name_is_custom", "mobile_no", "avatar_url", "status", "email_verified", "require_password_reset", "job_applicant"],
        as_dict=True,
    )
    if not values:
        return None
    # When the candidate hasn't set their own name yet (name_is_custom == 0),
    # prefer the real name from their Job Applicant over the signup email prefix.
    # Once they edit it via the profile page, name_is_custom flips to 1 and their
    # stored full_name always wins.
    full_name = values.full_name or values.email
    if not cint(values.name_is_custom):
        full_name = _resolve_candidate_full_name(values) or full_name
    doc = frappe.get_doc("Candidate Portal User", values.name)
    password_setup_required = not _candidate_has_password(doc) or bool(cint(values.require_password_reset))
    return {
        "id": values.name,
        "name": values.name,
        "email": values.email,
        "full_name": full_name,
        "first_name": _split_name(full_name)[0],
        "last_name": _split_name(full_name)[1],
        "mobile_no": values.mobile_no,
        "avatar_url": values.avatar_url,
        "enabled": values.status == "Active",
        "status": values.status,
        "password_setup_required": password_setup_required,
        "user_type": "Candidate Portal User",
        "roles": ["Candidate"],
        "user_metadata": {"full_name": full_name, "email": values.email, "avatar_url": values.avatar_url},
    }


def _sanitize_candidate_profile_update(data, doc):
    updates = {}

    raw_full_name = data.get("full_name")
    raw_first_name = data.get("first_name")
    raw_last_name = data.get("last_name")
    if raw_full_name is not None or raw_first_name is not None or raw_last_name is not None:
        if raw_full_name is not None:
            full_name = " ".join((str(raw_full_name) or "").split()).strip()
        else:
            first = " ".join((str(raw_first_name) or "").split()).strip()
            last = " ".join((str(raw_last_name) or "").split()).strip()
            full_name = " ".join(part for part in (first, last) if part).strip()
        if not full_name:
            frappe.throw(_("Full name cannot be empty."))
        updates["full_name"] = full_name
        # The candidate is setting their own name — stop auto-resolving it from
        # the Job Applicant so this value sticks on subsequent fetches.
        updates["name_is_custom"] = 1

    if "mobile_no" in data:
        mobile_no = (str(data.get("mobile_no") or "")).strip()
        if mobile_no and not re.fullmatch(r"[0-9]{10,15}", mobile_no):
            frappe.throw(_("Mobile number must contain 10 to 15 digits."))
        updates["mobile_no"] = mobile_no

    if "avatar_url" in data:
        avatar_url = (str(data.get("avatar_url") or "")).strip()
        updates["avatar_url"] = avatar_url

    # Block accidental email changes through this endpoint.
    if "email" in data and (str(data.get("email") or "").strip().lower() != (doc.email or "").strip().lower()):
        frappe.throw(_("Email cannot be changed from the profile page."))

    return updates


def _set_session_cookie(token, settings):
    if not getattr(frappe.local, "cookie_manager", None):
        return
    session_hours = cint(settings.get("session_expiry_hours")) or 24
    frappe.local.cookie_manager.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=bool(cint(settings.cookie_secure)),
        samesite=settings.cookie_same_site or "Lax",
        max_age=session_hours * 60 * 60,
    )


def _delete_session_cookie():
    if getattr(frappe.local, "cookie_manager", None):
        frappe.local.cookie_manager.delete_cookie(COOKIE_NAME)


def _get_session_cookie():
    if getattr(frappe.local, "request", None):
        return frappe.local.request.cookies.get(COOKIE_NAME)
    return None


def _hash_password(password):
    if not password or len(password) < 8:
        frappe.throw(_("Password must be at least 8 characters."))
    salt = secrets.token_hex(16)
    iterations = 260000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def _check_password(password, encoded):
    try:
        algorithm, iterations, salt, digest = (encoded or "").split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        candidate_digest = hashlib.pbkdf2_hmac("sha256", (password or "").encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(candidate_digest, digest)
    except Exception:
        return False


def _hash_session_token(token):
    key = frappe.conf.get("encryption_key") or frappe.local.site or "candidate-portal"
    return hmac.new(str(key).encode(), token.encode(), hashlib.sha256).hexdigest()


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


def _load_otp_log_for_verify(identifier, identifier_type, purpose, otp_log):
    if otp_log:
        if not frappe.db.exists("Candidate Portal OTP Log", otp_log):
            return None
        log = frappe.get_doc("Candidate Portal OTP Log", otp_log)
        if log.identifier != identifier or log.identifier_type != identifier_type:
            return None
        if log.status in FINAL_OTP_STATUSES:
            return None
        return log

    purpose = _clean_purpose(purpose)
    log = _get_active_otp_log(identifier, purpose, identifier_type)
    if log:
        return log

    name = frappe.db.get_value(
        "Candidate Portal OTP Log",
        {
            "identifier": identifier,
            "identifier_type": identifier_type,
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
        {"identifier": identifier, "identifier_type": identifier_type, "purpose": purpose, "creation": (">=", since)},
    )
    if count >= cint(settings.max_otps_per_hour):
        frappe.throw(_("Too many OTP requests. Please try again later."))


def _revoke_active_otps(identifier, purpose, identifier_type):
    names = frappe.get_all(
        "Candidate Portal OTP Log",
        filters={"identifier": identifier, "identifier_type": identifier_type, "purpose": purpose, "status": ("not in", FINAL_OTP_STATUSES)},
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
    allowed = ("Signup", "Login", "Verify Email", "Verify Mobile", "Password Reset", "Activate")
    if purpose not in allowed:
        frappe.throw(_("Invalid OTP purpose."))
    return purpose


def _split_name(full_name):
    parts = (full_name or "").strip().split()
    if not parts:
        return "Candidate", ""
    return parts[0], " ".join(parts[1:])


def _request_ip():
    return getattr(frappe.local, "request_ip", None)


def _request_user_agent():
    return frappe.get_request_header("User-Agent") if getattr(frappe.local, "request", None) else None
