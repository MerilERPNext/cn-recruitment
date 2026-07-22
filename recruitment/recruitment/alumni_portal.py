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
