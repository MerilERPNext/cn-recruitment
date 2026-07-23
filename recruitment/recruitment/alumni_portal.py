"""Alumni Portal authentication (part of the Recruitment app).

A former employee (Employee.status == "Left") is flagged on their User via the
`custom_is_alumni_employee` checkbox (kept in sync by `sync_alumni_flag`, and
created/back-filled in recruitment.install). That single checkbox is the gate
for the Alumni Portal — no separate app, no Portal Configuration doctype.

The login flow is intentionally identical to a normal Frappe login
(`LoginManager.authenticate` -> check gate -> `post_login`); the only difference
is the extra "is this user an alumni employee?" check before the session is
created. Nothing here changes any existing HRMS behaviour (it never touches
Employee.status or User.enabled).

Endpoints (call as `recruitment.recruitment.alumni_portal.<fn>`):
    portal_login, get_alumni_context, portal_logout,
    request_password_otp, verify_password_otp, reset_password_with_otp
"""

from __future__ import annotations

import html

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.rate_limiter import rate_limit

ALUMNI_FLAG = "custom_is_alumni_employee"


# ── Gate ──────────────────────────────────────────────────────────────────────
def is_alumni_employee(user: str | None) -> bool:
    """True if this User is flagged as an alumni employee (Employee.status=Left)."""
    if not user or user == "Guest":
        return False
    return bool(frappe.db.get_value("User", user, ALUMNI_FLAG))


@frappe.whitelist(allow_guest=True, methods=["POST"])
def check_alumni_eligibility(email: str) -> dict:
    """Report whether an email can use the Alumni Portal.

    Powers the warning on the forgot-password screen so a non-alumnus is told
    immediately instead of waiting for a code that never arrives.

    NOTE: unlike request_password_otp, this DELIBERATELY reveals whether an
    address is an alumni account — a deliberate trade of enumeration-resistance
    for clearer UX.
    """
    if not email:
        frappe.local.response["http_status_code"] = 400
        return {"eligible": False, "message": _("Email is required.")}

    user = frappe.db.get_value(
        "User", {"email": email}, ["name", "enabled"], as_dict=True
    )
    if not user or not is_alumni_employee(user.name):
        return {
            "eligible": False,
            "message": _("This email isn't registered as an alumni employee."),
        }
    # Delete this block if you'd rather let disabled alumni reset a password
    # they can't yet log in with.
    if not user.enabled:
        return {
            "eligible": False,
            "message": _("Your alumni account isn't active yet. Please contact HR."),
        }
    return {"eligible": True}


# ── Login / session ───────────────────────────────────────────────────────────
@frappe.whitelist(allow_guest=True, methods=["POST"])
def portal_login(email: str, password: str) -> dict:
    """Authenticate an alumni employee into the Alumni Portal.

    Same auth flow as a normal login: validate credentials, then (before the
    session is created) require that the user is an alumni employee. A
    non-alumni gets 403 and no session.
    """
    if not email or not password:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Email and password are required.")}

    login_manager = LoginManager()
    try:
        login_manager.authenticate(user=email, pwd=password)
    except frappe.AuthenticationError:
        frappe.local.response["http_status_code"] = 401
        return {"success": False, "message": _("Invalid email or password.")}

    user = login_manager.user
    if not is_alumni_employee(user):
        frappe.local.response["http_status_code"] = 403
        return {
            "success": False,
            "message": _("Only Alumni employees can access this portal."),
        }

    login_manager.post_login()
    frappe.local.response["http_status_code"] = 200
    return {
        "success": True,
        "message": _("Login successful."),
        "user": user,
        "full_name": frappe.db.get_value("User", user, "full_name"),
    }


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_alumni_context() -> dict:
    """Validate/restore an Alumni Portal session. 401 guest, 403 non-alumni."""
    user = frappe.session.user
    if user == "Guest":
        frappe.local.response["http_status_code"] = 401
        return {"success": False, "message": _("Authentication required.")}
    if not is_alumni_employee(user):
        frappe.local.response["http_status_code"] = 403
        return {"success": False, "message": _("Not authorized for the Alumni Portal.")}
    return {
        "success": True,
        "user": user,
        "full_name": frappe.db.get_value("User", user, "full_name"),
    }


@frappe.whitelist(methods=["POST"])
def portal_logout() -> dict:
    """End the current session."""
    lm = LoginManager()
    lm.logout(user=frappe.session.user)
    frappe.local.response["http_status_code"] = 200
    return {"success": True, "message": _("Logged out.")}


# ── Forgot password via email OTP (alumni-scoped) ─────────────────────────────
OTP_TTL_SECONDS = 10 * 60
OTP_MAX_ATTEMPTS = 5
_GENERIC_OTP_MSG = (
    "If an alumni account exists for that email, a reset code has been sent."
)


def _otp_cache_key(email: str) -> str:
    return f"recruitment:alumni_pwd_otp:{(email or '').strip().lower()}"


def _hash_otp(email: str, otp: str) -> str:
    import hashlib

    salt = frappe.local.conf.get("secret_key") or "recruitment_alumni"
    return hashlib.sha256(
        f"{salt}:{(email or '').strip().lower()}:{otp}".encode()
    ).hexdigest()


def _consume_otp(email: str, otp: str) -> tuple[bool, str]:
    """Validate an OTP. Returns (ok, error). Caps attempts; does not burn on success."""
    key = _otp_cache_key(email)
    data = frappe.cache().get_value(key)
    if not data:
        return False, _("This reset code is invalid or has expired.")
    attempts = int(data.get("attempts", 0)) + 1
    if attempts > OTP_MAX_ATTEMPTS:
        frappe.cache().delete_value(key)
        return False, _("Too many incorrect attempts. Please request a new code.")
    if _hash_otp(email, otp) != data.get("hash"):
        data["attempts"] = attempts
        frappe.cache().set_value(key, data, expires_in_sec=OTP_TTL_SECONDS)
        return False, _("The reset code is incorrect.")
    return True, ""


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=5, seconds=60 * 60)
def request_password_otp(email: str) -> dict:
    """Email a 6-digit reset code to an alumni employee (no user enumeration)."""
    generic = {"success": True, "message": _(_GENERIC_OTP_MSG)}
    if not email:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Email is required.")}

    user_name = frappe.db.get_value("User", {"email": email}, "name")
    if not user_name or not is_alumni_employee(user_name):
        return generic

    try:
        import secrets

        otp = f"{secrets.randbelow(10 ** 6):06d}"
        frappe.cache().set_value(
            _otp_cache_key(email),
            {"hash": _hash_otp(email, otp), "attempts": 0},
            expires_in_sec=OTP_TTL_SECONDS,
        )
        full_name = frappe.db.get_value("User", user_name, "full_name") or email
        frappe.sendmail(
            recipients=[email],
            subject=_("Your Alumni Portal password reset code"),
            message=_(
                "<p>Hi {0},</p>"
                "<p>Your Alumni Portal password reset code is:</p>"
                "<p style='font-size:22px;font-weight:bold;letter-spacing:3px'>{1}</p>"
                "<p>This code expires in {2} minutes. If you didn't request it, "
                "you can safely ignore this email.</p>"
            ).format(full_name, otp, OTP_TTL_SECONDS // 60),
            now=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "alumni request_password_otp failed")

    return generic


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=10, seconds=60 * 60)
def verify_password_otp(email: str, otp: str) -> dict:
    """Check an OTP without burning it (for a two-step UI)."""
    if not email or not otp:
        return {"valid": False}
    ok, _msg = _consume_otp(email, otp)
    return {"valid": bool(ok)}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=10, seconds=60 * 60)
def reset_password_with_otp(email: str, otp: str, new_password: str) -> dict:
    """Verify the emailed OTP and set a new password for an alumni employee."""
    if not email or not otp or not new_password:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("Email, reset code and new password are required."),
        }

    user_name = frappe.db.get_value("User", {"email": email}, "name")
    if not user_name or not is_alumni_employee(user_name):
        # Uniform failure — never reveal existence / alumni status.
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("This reset code is invalid or has expired.")}

    ok, err = _consume_otp(email, otp)
    if not ok:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": err}

    # Setting `new_password` enforces the password-strength policy and hashes it.
    user = frappe.get_doc("User", user_name)
    user.new_password = new_password
    try:
        user.save(ignore_permissions=True)
        frappe.db.commit()
    except frappe.exceptions.ValidationError as e:
        frappe.db.rollback()
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": str(e) or _("Password is too weak.")}

    frappe.cache().delete_value(_otp_cache_key(email))  # single-use
    frappe.local.response["http_status_code"] = 200
    return {
        "success": True,
        "message": _("Your password has been reset. You can now sign in."),
    }


# ── Login via email OTP ───────────────────────────────────────────────────────
# A LOGIN code is deliberately kept in its own cache namespace from the
# password-reset code, so a reset code can never be replayed as a login (or
# vice versa) — they authorise different things.

_GENERIC_LOGIN_OTP_MSG = (
    "If an alumni account exists for that email, a login code has been sent."
)


def _login_otp_cache_key(email: str) -> str:
    return f"recruitment:alumni_login_otp:{(email or '').strip().lower()}"


def _consume_login_otp(email: str, otp: str) -> tuple[bool, str]:
    """Same attempt-capped check as the reset code, against the login key."""
    key = _login_otp_cache_key(email)
    data = frappe.cache().get_value(key)
    if not data:
        return False, _("This login code is invalid or has expired.")
    attempts = int(data.get("attempts", 0)) + 1
    if attempts > OTP_MAX_ATTEMPTS:
        frappe.cache().delete_value(key)
        return False, _("Too many incorrect attempts. Please request a new code.")
    if _hash_otp(email, otp) != data.get("hash"):
        data["attempts"] = attempts
        frappe.cache().set_value(key, data, expires_in_sec=OTP_TTL_SECONDS)
        return False, _("The login code is incorrect.")
    return True, ""


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=5, seconds=60 * 60)
def request_login_otp(email: str) -> dict:
    """Email a 6-digit login code to an enabled alumni employee."""
    generic = {"success": True, "message": _(_GENERIC_LOGIN_OTP_MSG)}
    if not email:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Email is required.")}

    user_name = frappe.db.get_value("User", {"email": email}, "name")
    # Silent no-op for unknown / non-alumni / disabled — never reveal which.
    if not user_name or not is_alumni_employee(user_name):
        return generic
    if not frappe.db.get_value("User", user_name, "enabled"):
        return generic

    try:
        import secrets

        otp = f"{secrets.randbelow(10 ** 6):06d}"
        frappe.cache().set_value(
            _login_otp_cache_key(email),
            {"hash": _hash_otp(email, otp), "attempts": 0},
            expires_in_sec=OTP_TTL_SECONDS,
        )
        full_name = frappe.db.get_value("User", user_name, "full_name") or email
        frappe.sendmail(
            recipients=[email],
            subject=_("Your Alumni Portal login code"),
            message=_(
                "<p>Hi {0},</p>"
                "<p>Your Alumni Portal login code is:</p>"
                "<p style='font-size:22px;font-weight:bold;letter-spacing:3px'>{1}</p>"
                "<p>This code expires in {2} minutes. If you didn't request it, "
                "you can safely ignore this email.</p>"
            ).format(full_name, otp, OTP_TTL_SECONDS // 60),
            now=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "alumni request_login_otp failed")

    return generic


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=10, seconds=60 * 60)
def login_with_otp(email: str, otp: str) -> dict:
    """Sign an alumni employee in with an emailed code (no password).

    Mirrors portal_login's response so the frontend handles both identically.
    """
    if not email or not otp:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Email and code are required.")}

    user_name = frappe.db.get_value("User", {"email": email}, "name")
    if not user_name or not is_alumni_employee(user_name):
        frappe.local.response["http_status_code"] = 403
        return {
            "success": False,
            "message": _("You are not authorized to login to the Alumni Portal."),
        }

    # IMPORTANT: login_as() bypasses LoginManager.authenticate, which is what
    # normally rejects disabled accounts — so check it explicitly here. Without
    # this, an OTP would sign in a User that HRMS disabled on exit.
    if not frappe.db.get_value("User", user_name, "enabled"):
        frappe.local.response["http_status_code"] = 403
        return {
            "success": False,
            "message": _("Your account is not active. Please contact HR."),
        }

    ok, err = _consume_login_otp(email, otp)
    if not ok:
        frappe.local.response["http_status_code"] = 401
        return {"success": False, "message": err}

    frappe.cache().delete_value(_login_otp_cache_key(email))  # single-use

    login_manager = LoginManager()
    login_manager.login_as(user_name)

    frappe.local.response["http_status_code"] = 200
    return {
        "success": True,
        "message": _("Login successful."),
        "user": user_name,
        "full_name": frappe.db.get_value("User", user_name, "full_name"),
    }


# ── Profile & notifications (session-scoped, alumni only) ─────────────────────
def _require_alumni_session() -> str:
    """Return the session user, or raise 401 (guest) / 403 (not an alumnus)."""
    user = frappe.session.user
    if user == "Guest":
        frappe.local.response["http_status_code"] = 401
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    if not is_alumni_employee(user):
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized for the Alumni Portal."), frappe.PermissionError)
    return user


def _d(v):
    """Serialize a date/datetime to string (or None)."""
    return str(v) if v else None


# Employee Link fields for which the profile response should also carry a
# human-readable "<field>_title" alongside the raw id.
_ALUMNI_LINK_TITLE_FIELDS = (
    "designation",
    "custom_designation_title",
    "department",
    "branch",
    "employment_type",
)


def _resolve_link_title(doctype: str, fieldname: str, value: str) -> str:
    """Human-readable title for a Link field's `value`, falling back to `value`.

    Resolves the field's target doctype and its title field from meta, then
    fetches the title. Any schema drift / missing record falls back to the id
    so the response shape is always identical.
    """
    if not value:
        return ""
    try:
        df = frappe.get_meta(doctype).get_field(fieldname)
        target = df.options if df else None
        if not target:
            return value
        title_field = frappe.get_meta(target).get_title_field()
        if not title_field or title_field == "name":
            return value
        return frappe.db.get_value(target, value, title_field) or value
    except Exception:
        return value


@frappe.whitelist(methods=["GET"])
def get_alumni_profile() -> dict:
    """Normal profile details of the logged-in alumnus, based on their Employee.

    Resolves the linked Employee via `user_id`. Works even if no Employee is
    linked (returns the User details with `employee = None`).
    """
    user = _require_alumni_session()
    u = frappe.db.get_value(
        "User", user, ["full_name", "email", "user_image", "mobile_no", "phone"], as_dict=True
    ) or {}
    profile = {
        "user": user,
        "full_name": u.get("full_name"),
        "email": u.get("email"),
        "image": u.get("user_image"),
        "mobile": u.get("mobile_no") or u.get("phone"),
        "employee": None,
    }

    emp_name = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if emp_name:
        # (output key, Employee fieldname). "employee_id" is the docname;
        # "preferred_email" maps to core's misspelled `prefered_email`.
        field_map = [
            ("employee_id", "name"),
            ("employee_name", "employee_name"),
            ("image", "image"),
            ("designation", "designation"),
            ("custom_designation_title", "custom_designation_title"),
            ("department", "department"),
            ("company", "company"),
            ("branch", "branch"),
            ("employment_type", "employment_type"),
            ("custom_employee_role", "custom_employee_role"),
            ("status", "status"),
            ("custom__custom_marital_status", "custom__custom_marital_status"),
            ("date_of_joining", "date_of_joining"),
            ("relieving_date", "relieving_date"),
            ("company_email", "company_email"),
            ("personal_email", "personal_email"),
            ("preferred_email", "prefered_email"),
            ("custom_personal_mobile_no", "custom_personal_mobile_no"),
            ("custom_office_mobile_no", "custom_office_mobile_no"),
            ("custom_whatsapp_no", "custom_whatsapp_no"),
            ("gender", "gender"),
            ("date_of_birth", "date_of_birth"),
            ("linkedin_id", "linkedin_id"),
            ("facebook_id", "facebook_id"),
            ("bio", "bio"),
        ]
        date_keys = {"date_of_joining", "relieving_date", "date_of_birth"}

        # Only pull fields whose DB column actually exists (schema-drift safe:
        # some fields are in the doctype meta but have no column on this env).
        # Missing ones come back as "" so the response shape is always identical.
        src_fields = [
            f for _, f in field_map
            if f != "name" and frappe.db.has_column("Employee", f)
        ]
        e = frappe.db.get_value("Employee", emp_name, src_fields, as_dict=True) or {}
        e["name"] = emp_name

        emp = {}
        for out_key, src in field_map:
            val = e.get(src)
            if out_key in date_keys:
                emp[out_key] = _d(val) or ""
            else:
                emp[out_key] = val if val is not None else ""

        # For Link fields, also expose a human-readable title next to the raw id
        # (e.g. designation -> designation_title). The id stays under the
        # original key so existing callers are unaffected.
        for fld in _ALUMNI_LINK_TITLE_FIELDS:
            emp[f"{fld}_title"] = _resolve_link_title("Employee", fld, emp.get(fld) or "")

        profile["employee"] = emp

        if not profile.get("image") and emp.get("image"):
            profile["image"] = emp["image"]

    return {"success": True, "profile": profile}


# Fields an alumnus may edit on their OWN profile. HR-controlled fields
# (employee_id/name, status, company, designation, department, branch,
# employment_type, joining/relieving dates, company_email, office mobile, …) are
# deliberately NOT here and can never be changed from the portal.
_EDITABLE_ALUMNI_PROFILE_FIELDS = (
    "personal_email",
    "custom_personal_mobile_no",
    "custom_whatsapp_no",
    "linkedin_id",
    "facebook_id",
    "bio",
    "custom__custom_marital_status",
    "gender",
    "date_of_birth",
    "image",
)


@frappe.whitelist(methods=["POST"])
def update_alumni_profile(**kwargs) -> dict:
    """Update the alumnus's OWN editable profile fields.

    Accepts either flat fields ({"bio": "...", "linkedin_id": "..."}) or a
    ``values`` JSON blob. Only whitelisted, existing-column fields are applied;
    everything else is ignored. Written with ``frappe.db.set_value`` so NO
    Employee validate/on_update hooks run — existing HRMS behaviour is untouched.
    """
    user = _require_alumni_session()
    emp_name = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not emp_name:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("No employee record is linked to your account.")}

    incoming = kwargs.get("values", kwargs)
    if isinstance(incoming, str):
        try:
            incoming = frappe.parse_json(incoming)
        except Exception:
            incoming = {}
    if not isinstance(incoming, dict):
        incoming = {}

    updates = {}
    for key, val in incoming.items():
        if key not in _EDITABLE_ALUMNI_PROFILE_FIELDS:
            continue
        if not frappe.db.has_column("Employee", key):
            continue
        if key.endswith("email") and val:
            from frappe.utils import validate_email_address

            if not validate_email_address(val):  # "" when invalid
                frappe.local.response["http_status_code"] = 400
                return {
                    "success": False,
                    "message": _("{0} is not a valid email address.").format(val),
                }
        updates[key] = val

    if not updates:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("No editable profile fields were provided."),
        }

    updated_keys = list(updates.keys())  # capture before set_value mutates the dict
    frappe.db.set_value("Employee", emp_name, updates)
    frappe.db.commit()
    return {
        "success": True,
        "updated": updated_keys,
        "message": _("Your profile has been updated."),
    }


@frappe.whitelist(methods=["GET"])
def get_alumni_notifications(limit=20, start=0, only_unread=0) -> dict:
    """The logged-in alumnus's notifications (from Notification Log).

    Returns the notifications, the total, and the unread count. `only_unread=1`
    restricts the list to unread; `limit`/`start` paginate.
    """
    user = _require_alumni_session()

    filters = {"for_user": user}
    if frappe.utils.cint(only_unread):
        filters["read"] = 0

    notifications = frappe.get_all(
        "Notification Log",
        filters=filters,
        fields=[
            "name", "subject", "email_content", "type", "document_type",
            "document_name", "read", "from_user", "creation",
        ],
        order_by="creation desc",
        start=frappe.utils.cint(start),
        page_length=frappe.utils.cint(limit) or 20,
    )
    return {
        "success": True,
        "unread_count": frappe.db.count("Notification Log", {"for_user": user, "read": 0}),
        "total": frappe.db.count("Notification Log", {"for_user": user}),
        "notifications": notifications,
    }


@frappe.whitelist(methods=["POST"])
def mark_alumni_notification_read(name: str = None, mark_all=0) -> dict:
    """Mark one notification (by `name`) or all (`mark_all=1`) read for this alumnus."""
    user = _require_alumni_session()

    if frappe.utils.cint(mark_all):
        frappe.db.sql(
            "UPDATE `tabNotification Log` SET `read` = 1 WHERE for_user = %s AND `read` = 0",
            user,
        )
    elif name:
        # Only allow marking one's own notification.
        if frappe.db.get_value("Notification Log", name, "for_user") == user:
            frappe.db.set_value("Notification Log", name, "read", 1, update_modified=False)
    frappe.db.commit()

    return {
        "success": True,
        "unread_count": frappe.db.count("Notification Log", {"for_user": user, "read": 0}),
    }


# ── Support tickets (HD Ticket, session-scoped, alumni only) ──────────────────
# Tickets are linked to the alumnus by `raised_by` (their email). `ticket_type`
# is the category chip; `agent_group` is the handling team. We never modify HD
# Ticket logic — we read via get_all and create via the standard doctype insert.
_TICKET_OPEN_STATUSES = ("Open", "Replied", "Reopened", "Not Assigned")
_TICKET_RESOLVED_STATUSES = ("Resolved", "Closed")


def _ticket_status_label(status: str) -> str:
    if status in _TICKET_RESOLVED_STATUSES:
        return "Resolved"
    if status in _TICKET_OPEN_STATUSES:
        return "Open"
    return status or ""


def _alumni_email(user: str) -> str:
    return frappe.db.get_value("User", user, "email") or user


def _build_comment_content(content: str, attachment: dict | None) -> str:
    """Render uploaded attachment content as Quill-safe HTML.

    The frontend parser expects file URLs inside the rich-text body (for example
    as ``<a>`` tags), so uploaded files are embedded as clickable links in the
    saved comment content.
    """
    text = (content or "").strip()
    if not attachment or not attachment.get("file_url"):
        return text

    file_name = attachment.get("file_name") or "attachment"
    file_url = attachment.get("file_url")
    escaped_name = html.escape(file_name, quote=False)
    escaped_url = html.escape(file_url, quote=True)
    attachment_html = (
        f'<p><a href="{escaped_url}" target="_blank" rel="noopener noreferrer">'
        f"{escaped_name}</a></p>"
    )
    if text:
        return f"{text}<br>{attachment_html}"
    return attachment_html


@frappe.whitelist(methods=["GET"])
def get_alumni_ticket(name: str | None = None, ticket_id: str | None = None) -> dict:
    """Return a minimal ticket payload for the logged-in alumnus.

    This is a portal-safe variant of the Helpdesk ticket detail API. It only
    exposes the fields needed by the alumni UI:
    - ticket id
    - category
    - status
    - priority
    - assigned_to (first assignee, when present)
    - raised_time (from ``creation``)
    - comments

    Access is strictly limited to tickets raised by the current alumnus so the
    endpoint cannot leak another user's support history.
    """
    user = _require_alumni_session()
    email = _alumni_email(user)
    ticket_name = (name or ticket_id or "").strip()

    if not ticket_name:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Ticket ID is required.")}

    ticket = frappe.db.get_value(
        "HD Ticket",
        {"name": ticket_name, "raised_by": email},
        ["name", "subject", "ticket_type", "status", "priority", "_assign", "creation"],
        as_dict=True,
    )
    if not ticket:
        frappe.local.response["http_status_code"] = 404
        return {"success": False, "message": _("Ticket not found.")}

    comments = frappe.get_all(
        "HD Ticket Comment",
        filters={"reference_ticket": ticket_name},
        fields=["name", "content", "commented_by", "creation"],
        order_by="creation asc",
    )

    assigned_to = []
    if ticket.get("_assign"):
        try:
            parsed_assign = frappe.parse_json(ticket.get("_assign") or "[]")
            if isinstance(parsed_assign, list):
                assignees = parsed_assign
            elif parsed_assign:
                assignees = [parsed_assign]
            else:
                assignees = []

            assigned_to = [
                {
                    "name": assignee,
                    "full_name": frappe.db.get_value("User", assignee, "full_name") or "",
                }
                for assignee in assignees
                if assignee
            ]
        except Exception:
            assigned_to = []

    return {
        "success": True,
        "ticket": {
            "id": ticket.name,
            "subject": ticket.subject,
            "category": ticket.ticket_type,
            "status": ticket.status,
            "priority": ticket.priority,
            "assigned_to": assigned_to,
            "raised_time": _d(ticket.creation),
            "comments": [
                {
                    "id": c.name,
                    "content": c.content,
                    "commented_by": c.commented_by,
                    "created_at": _d(c.creation),
                }
                for c in comments
            ],
        },
    }


@frappe.whitelist(methods=["GET"])
def get_alumni_recent_open_tickets(limit: int = 5) -> dict:
    """Return recent open tickets for the logged-in alumnus with summary stats.

    The response contains the most recently updated open tickets, the total
    open ticket count for the alumnus, and the average first-response time in
    hours for matching tickets.
    """
    user = _require_alumni_session()
    email = _alumni_email(user)

    total_open_count = frappe.db.count(
        "HD Ticket",
        {"raised_by": email, "status": ["in", _TICKET_OPEN_STATUSES]},
    )

    rows = frappe.get_all(
        "HD Ticket",
        filters={"raised_by": email, "status": ["in", _TICKET_OPEN_STATUSES]},
        fields=[
            "name",
            "subject",
            "ticket_type",
            "status",
            "agent_group",
            "creation",
            "modified",
            "opening_date",
            "first_responded_on",
        ],
        order_by="modified desc",
        page_length=min(max(int(limit), 1), 50),
    )

    from frappe.utils import add_days, get_datetime, now_datetime, time_diff_in_seconds

    cutoff = add_days(now_datetime(), -30)
    response_secs = [
        time_diff_in_seconds(t.first_responded_on, t.creation)
        for t in rows
        if t.first_responded_on and get_datetime(t.creation) >= cutoff
    ]
    avg_response_hours = round((sum(response_secs) / len(response_secs)) / 3600) if response_secs else None

    tickets = [
        {
            "id": r.name,
            "subject": r.subject,
            "category": r.ticket_type,
            "status": r.status,
            "team": r.agent_group,
            "raised_on": _d(r.opening_date or r.creation),
            "updated_on": _d(r.modified),
        }
        for r in rows
    ]

    return {
        "success": True,
        "total_open_count": total_open_count,
        "avg_response_hours": avg_response_hours,
        "tickets": tickets,
    }


@frappe.whitelist(methods=["POST"])
def add_alumni_ticket_comment(ticket_id: str | None = None, comment: str | None = None) -> dict:
    """Add a comment to an alumnus-owned HD Ticket and optionally attach one file.

    Accepts a multipart/form-data request with:
    - ``ticket_id`` or ``name`` as form field/argument
    - ``comment`` as the text body
    - ``file`` as the single uploaded attachment

    The comment is stored against the ticket and the uploaded file is attached to
    the created HD Ticket Comment record.
    """
    user = _require_alumni_session()
    email = _alumni_email(user)
    ticket_name = (ticket_id or "").strip() or (frappe.form_dict.get("name") or "").strip()

    if not ticket_name:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Ticket ID is required.")}

    if not frappe.db.exists("HD Ticket", {"name": ticket_name, "raised_by": email}):
        frappe.local.response["http_status_code"] = 404
        return {"success": False, "message": _("Ticket not found.")}

    content = (comment or frappe.form_dict.get("comment") or "").strip()
    uploaded_file = None
    if getattr(frappe, "request", None) and getattr(frappe.request, "files", None):
        uploaded_file = frappe.request.files.get("file") or frappe.request.files.get("attachment")

    if not content and not uploaded_file:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Comment text or an attachment is required.")}

    try:
        comment_doc = frappe.get_doc(
            {
                "doctype": "HD Ticket Comment",
                "reference_ticket": ticket_name,
                "commented_by": user,
                "content": content or "",
                "is_pinned": 0,
            }
        )
        comment_doc.insert(ignore_permissions=True)

        attachment = None
        if uploaded_file:
            from frappe.utils.file_manager import save_file

            file_content = uploaded_file.stream.read()
            saved_file = save_file(
                uploaded_file.filename or "attachment",
                file_content,
                "HD Ticket Comment",
                comment_doc.name,
                is_private=0,
            )
            attachment = {
                "name": saved_file.name,
                "file_name": saved_file.file_name,
                "file_url": saved_file.file_url,
            }
            comment_doc.content = _build_comment_content(comment_doc.content, attachment)
            comment_doc.save(ignore_permissions=True)

        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "alumni add_alumni_ticket_comment failed")
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Unable to add the comment right now.")}

    return {
        "success": True,
        "message": _("Your comment has been added."),
        "comment": {
            "id": comment_doc.name,
            "ticket_id": ticket_name,
            "content": comment_doc.content,
            "commented_by": comment_doc.commented_by,
            "created_at": _d(comment_doc.creation),
        },
        "attachment": attachment,
    }


@frappe.whitelist(methods=["GET"])
def get_alumni_tickets(status=None, category=None, limit=50, start=0) -> dict:
    """The alumnus's support tickets (HD Ticket) with stats + category flags.

    `status`: "open" | "resolved" (tab). `category`: an HD Ticket Type (chip).
    Stats are always computed across ALL of the user's tickets, not the filter.
    """
    user = _require_alumni_session()
    email = _alumni_email(user)

    filters = {"raised_by": email}
    if category:
        filters["ticket_type"] = category
    if status == "open":
        filters["status"] = ["in", _TICKET_OPEN_STATUSES]
    elif status == "resolved":
        filters["status"] = ["in", _TICKET_RESOLVED_STATUSES]

    rows = frappe.get_all(
        "HD Ticket",
        filters=filters,
        fields=[
            "name", "subject", "ticket_type", "status", "agent_group",
            "creation", "modified", "opening_date",
        ],
        order_by="creation desc",
        start=frappe.utils.cint(start),
        page_length=frappe.utils.cint(limit) or 50,
    )
    tickets = [
        {
            "name": r.name,
            "subject": r.subject,
            "category": r.ticket_type,        # the type flag / chip
            "status": r.status,
            "status_label": _ticket_status_label(r.status),
            "team": r.agent_group,
            "raised_on": _d(r.opening_date or r.creation),
            "updated_on": _d(r.modified),
        }
        for r in rows
    ]

    # ── stats over ALL of the user's tickets ──
    all_t = frappe.get_all(
        "HD Ticket",
        filters={"raised_by": email},
        fields=["status", "creation", "first_responded_on", "feedback_rating"],
    )
    open_count = sum(1 for x in all_t if x.status in _TICKET_OPEN_STATUSES)
    resolved_count = sum(1 for x in all_t if x.status in _TICKET_RESOLVED_STATUSES)

    from frappe.utils import add_days, get_datetime, now_datetime, time_diff_in_seconds

    cutoff = add_days(now_datetime(), -30)
    resp_secs = [
        time_diff_in_seconds(x.first_responded_on, x.creation)
        for x in all_t
        if x.first_responded_on and get_datetime(x.creation) >= cutoff
    ]
    avg_response_hours = round((sum(resp_secs) / len(resp_secs)) / 3600) if resp_secs else None

    # feedback_rating is a Rating (0..1) — express satisfaction as a percentage.
    rated = [x.feedback_rating for x in all_t if x.feedback_rating]
    satisfaction_percent = round((sum(rated) / len(rated)) * 100) if rated else None

    return {
        "success": True,
        "stats": {
            "open_tickets": open_count,
            "resolved_tickets": resolved_count,
            "total": len(all_t),
            "avg_response_hours": avg_response_hours,
            "satisfaction_percent": satisfaction_percent,
        },
        "filter_options": {"categories": frappe.get_all("HD Ticket Type", pluck="name")},
        "tickets": tickets,
    }


@frappe.whitelist(methods=["POST"])
def raise_alumni_ticket(subject, description=None, category=None, priority=None) -> dict:
    """Raise a new support ticket (HD Ticket) as the logged-in alumnus.

    Uses the standard HD Ticket insert (no existing helpdesk logic changed).
    `category` maps to HD Ticket Type; both category and priority are optional
    and only set when they resolve to a real record.
    """
    user = _require_alumni_session()
    if not subject:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Subject is required.")}

    doc = frappe.get_doc(
        {
            "doctype": "HD Ticket",
            "subject": subject,
            "description": description or "",
            "raised_by": _alumni_email(user),
        }
    )
    if category and frappe.db.exists("HD Ticket Type", category):
        doc.ticket_type = category
    if priority and frappe.db.exists("HD Ticket Priority", priority):
        doc.priority = priority

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {
        "success": True,
        "name": doc.name,
        "status": doc.status,
        "message": _("Your ticket has been raised."),
    }


# ── Documents (Employee Documents, session-scoped, alumni only) ───────────────
# Source = "Employee Documents" (employee → file). Category comes from the linked
# Document Template's `type_of_letter` (else the doc's own `type`); title from the
# template's `letter_name`; size from the File doctype; Approved → "Ready".
_DOC_HIDDEN_STATUSES = ("Archived", "Rejected")


def _fmt_size(nbytes) -> str:
    if not nbytes:
        return ""
    kb = nbytes / 1024
    return f"{round(kb)} KB" if kb < 1024 else f"{round(kb / 1024, 1)} MB"


def _clean_doc_title(file_name: str | None) -> str:
    if not file_name:
        return ""
    base = file_name.rsplit("/", 1)[-1]
    return base.rsplit(".", 1)[0] if "." in base else base


def _build_alumni_documents(emp, category=None, year=None, search=None, limit=200, start=0) -> dict:
    from collections import Counter

    from frappe.utils import cint, getdate

    rows = frappe.get_all(
        "Employee Documents",
        filters={"employee": emp, "archived": 0},
        fields=["name", "document_template", "type", "status", "file_name", "end_date", "creation"],
        order_by="creation desc",
    )

    # Batch-resolve templates (category + title) and file sizes.
    tmpl_names = list({r.document_template for r in rows if r.document_template})
    tmpl_map = {}
    if tmpl_names:
        for t in frappe.get_all(
            "Document Template",
            filters={"name": ["in", tmpl_names]},
            fields=["name", "type_of_letter", "letter_name"],
        ):
            tmpl_map[t.name] = t
    # File sizes: `file_name` (Attach) sometimes stores the full "/files/…" URL and
    # sometimes only the basename, so match File on file_url OR file_name.
    file_vals = [r.file_name for r in rows if r.file_name]
    basenames = [v.rsplit("/", 1)[-1] for v in file_vals]
    size_by_url, size_by_name = {}, {}
    if file_vals:
        for f in frappe.get_all(
            "File",
            filters={"file_url": ["in", file_vals]},
            fields=["file_url", "file_size"],
        ):
            size_by_url[f.file_url] = f.file_size
        for f in frappe.get_all(
            "File",
            filters={"file_name": ["in", basenames]},
            fields=["file_name", "file_size"],
        ):
            size_by_name[f.file_name] = f.file_size

    docs = []
    for r in rows:
        if (r.status or "") in _DOC_HIDDEN_STATUSES:
            continue
        t = tmpl_map.get(r.document_template)
        cat = (t.get("type_of_letter") if t else None) or (r.type or "Other")
        title = (t.get("letter_name") if t else None) or _clean_doc_title(r.file_name) or r.name
        when = r.end_date or r.creation
        nbytes = size_by_url.get(r.file_name) or size_by_name.get(
            (r.file_name or "").rsplit("/", 1)[-1]
        )
        docs.append(
            {
                "name": r.name,
                "title": title,
                "category": cat,
                "type": r.type,
                "status": r.status,
                "status_label": "Ready" if (r.status or "") == "Approved" else "Pending",
                "date": (str(getdate(when)) if when else ""),
                "year": (getdate(when).year if when else None),
                "size": _fmt_size(nbytes),
                "size_bytes": nbytes or 0,
                "file_url": r.file_name,
            }
        )

    # Stats + filter options computed over the FULL set (unfiltered).
    cat_counts = Counter(x["category"] for x in docs)
    years = sorted({x["year"] for x in docs if x["year"]}, reverse=True)
    stats = {
        "total": len(docs),
        "ready": sum(1 for x in docs if x["status_label"] == "Ready"),
        "pending": sum(1 for x in docs if x["status_label"] != "Ready"),
        "by_category": dict(cat_counts),
    }

    # Apply filters.
    out = docs
    if category and str(category).lower() not in ("all", "all documents", ""):
        out = [x for x in out if x["category"] == category]
    if year and str(year).lower() not in ("all", ""):
        out = [x for x in out if str(x["year"]) == str(year)]
    if search:
        s = str(search).lower()
        out = [x for x in out if s in (x["title"] or "").lower() or s in (x["category"] or "").lower()]

    total_filtered = len(out)
    out = out[cint(start) : cint(start) + (cint(limit) or 200)]

    return {
        "success": True,
        "stats": stats,
        "filter_options": {
            "categories": [
                {"name": k, "count": v}
                for k, v in sorted(cat_counts.items(), key=lambda kv: -kv[1])
            ],
            "years": years,
        },
        "total_count": total_filtered,
        "documents": out,
    }


@frappe.whitelist(methods=["GET"])
def get_alumni_documents(category=None, year=None, search=None, limit=200, start=0) -> dict:
    """The alumnus's documents (Employee Documents) with stats + category/year filters.

    `category` = a document category (Document Template `type_of_letter`, or the
    doc `type`); `year` = a 4-digit year; `search` = free text over title/category.
    Stats + filter_options are always computed across ALL the user's documents.
    """
    user = _require_alumni_session()
    emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not emp:
        return {
            "success": True,
            "stats": {"total": 0, "ready": 0, "pending": 0, "by_category": {}},
            "filter_options": {"categories": [], "years": []},
            "total_count": 0,
            "documents": [],
        }
    return _build_alumni_documents(emp, category, year, search, limit, start)


@frappe.whitelist(methods=["GET"])
def download_alumni_document(name: str) -> None:
    """Stream one of the alumnus's OWN documents.

    Needed because the alumni guard blocks direct ``/files/*`` access — this
    namespace endpoint verifies ownership then streams the file.
    """
    user = _require_alumni_session()
    emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
    doc = frappe.db.get_value(
        "Employee Documents", name, ["employee", "file_name"], as_dict=True
    )
    if not doc or not doc.file_name or doc.employee != emp:
        frappe.local.response["http_status_code"] = 404
        frappe.throw(_("Document not found."), frappe.DoesNotExistError)

    # `file_name` (Attach) may hold the "/files/…" URL or just the basename, so
    # resolve the backing File record by file_url OR file_name and stream it.
    basename = doc.file_name.rsplit("/", 1)[-1]
    file_id = frappe.db.get_value("File", {"file_url": doc.file_name}, "name") or frappe.db.get_value(
        "File", {"file_name": basename}, "name"
    )
    if not file_id:
        frappe.local.response["http_status_code"] = 404
        frappe.throw(_("Document file not found."), frappe.DoesNotExistError)

    file_doc = frappe.get_doc("File", file_id)
    try:
        content = file_doc.get_content()
    except (OSError, FileNotFoundError):
        frappe.local.response["http_status_code"] = 404
        frappe.throw(_("Document file is no longer available."), frappe.DoesNotExistError)
    frappe.local.response.filename = file_doc.file_name or basename
    frappe.local.response.filecontent = content
    frappe.local.response.type = "download"


# ── Keep the alumni flag in sync with Employee lifecycle ──────────────────────
def sync_alumni_flag(doc, method: str | None = None) -> None:
    """Employee `on_update` hook: mark/unmark the linked User as an alumni employee.

    Purely additive — sets only the `custom_is_alumni_employee` checkbox on the
    linked User. It NEVER touches Employee.status or User.enabled, so no existing
    HRMS/exit behaviour changes.
    """
    if not getattr(doc, "user_id", None):
        return
    is_alumni = 1 if doc.status == "Left" else 0
    current = frappe.db.get_value("User", doc.user_id, ALUMNI_FLAG)
    if int(current or 0) != is_alumni:
        frappe.db.set_value(
            "User", doc.user_id, ALUMNI_FLAG, is_alumni, update_modified=False
        )
