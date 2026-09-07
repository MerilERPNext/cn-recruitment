"""Alumni Portal authentication (part of the Recruitment app).

Alumni Portal access is controlled by the `custom_is_alumni_employee` checkbox on
the User — that single flag is the gate (no separate app, no Portal Configuration
doctype). It is edited from the Employee form: the editable
`Employee.custom_is_alumni_employee` checkbox is written through to the linked
User by `sync_alumni_flag`, giving HR full manual grant/revoke control. New exits
(Employee.status == "Left") default to granted, but a later manual untick is never
overridden. The flag is created/back-filled in recruitment.install.

The login flow is intentionally identical to a normal Frappe login
(`LoginManager.authenticate` -> check gate -> `post_login`); the only difference
is the extra "is this user an alumni employee?" check before the session is
created. Nothing here changes any existing HRMS behaviour (it never touches
Employee.status or User.enabled).

Endpoints (call as `recruitment.recruitment.alumni_portal.<fn>`):
    portal_login, get_alumni_context, portal_logout,
    request_password_otp, verify_password_otp, reset_password_with_otp,
    get_alumni_tickets
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


def employee_is_alumni(employee: str | None) -> int:
    """Alumni flag (``0``/``1``) for an *Employee*.

    Reads the flag off the linked User — the gate that actually controls Alumni
    Portal access — rather than the Employee's own checkbox, so it reflects the
    effective access even if the two ever drift (e.g. the User flag was edited
    directly). Use it in reports, server scripts, and backend business logic when
    you hold an Employee id. Returns ``0`` when the Employee has no linked User,
    the User is missing, or the flag is unchecked. ``cache=True`` keeps the User
    lookup request-cheap.
    """
    if not employee:
        return 0
    user_id = frappe.db.get_value("Employee", employee, "user_id", cache=True)
    if not user_id:
        return 0
    return 1 if frappe.db.get_value("User", user_id, ALUMNI_FLAG, cache=True) else 0


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


# ── Public landing stats (no login) ───────────────────────────────────────────
# Powers the counters on the alumni sign-in screen (alumni network / avg ticket
# SLA / active openings). Guest-accessible and cached, so it stays cheap even
# under unauthenticated traffic and never exposes anything but aggregate counts.
_PUBLIC_STATS_CACHE_KEY = "recruitment:alumni_public_stats"
_PUBLIC_STATS_TTL = 5 * 60          # seconds — short cache for a public endpoint
_SLA_WINDOW_DAYS = 90               # look-back window for the avg response time


def _compact_plus(n: int | None) -> str:
    """Marketing-style rounded-DOWN count with a '+', e.g. 12345 -> '12k+',
    432 -> '400+', 47 -> '47'. Never over-states the real number."""
    n = int(n or 0)
    if n >= 1000:
        return f"{n // 1000}k+"
    if n >= 100:
        return f"{(n // 100) * 100}+"
    return str(n)


def _compute_alumni_public_stats() -> dict:
    """Aggregate, non-sensitive counts for the alumni landing page."""
    from frappe.utils import add_days, now_datetime

    # 1) Alumni network — everyone who has left (the alumni population).
    alumni_network = frappe.db.count("Employee", {"status": "Left"})

    # 2) Active openings — Open (and, where the column exists, published) jobs.
    opening_filters = {"status": "Open"}
    if frappe.db.has_column("Job Opening", "publish"):
        opening_filters["publish"] = 1
    active_openings = frappe.db.count("Job Opening", opening_filters)

    # 3) Avg ticket SLA — mean first-response time (hours) over recently responded
    #    HD Tickets, averaged in SQL. Helpdesk may be absent on a site, so guard
    #    the table and degrade to None (rendered as "—") instead of erroring.
    avg_sla_hours = None
    if frappe.db.table_exists("HD Ticket"):
        try:
            cutoff = add_days(now_datetime(), -_SLA_WINDOW_DAYS)
            row = frappe.db.sql(
                """
                SELECT AVG(TIMESTAMPDIFF(SECOND, creation, first_responded_on))
                FROM `tabHD Ticket`
                WHERE first_responded_on IS NOT NULL
                  AND first_responded_on >= %(cutoff)s
                  AND first_responded_on >= creation
                """,
                {"cutoff": cutoff},
            )
            avg_secs = row[0][0] if row and row[0] else None
            if avg_secs:
                avg_sla_hours = round(float(avg_secs) / 3600)
        except Exception:
            avg_sla_hours = None

    return {
        "alumni_network": alumni_network,
        "alumni_network_display": _compact_plus(alumni_network),
        "active_openings": active_openings,
        "active_openings_display": _compact_plus(active_openings),
        "avg_ticket_sla_hours": avg_sla_hours,
        "avg_ticket_sla_display": (f"{avg_sla_hours}h" if avg_sla_hours else "—"),
    }


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_alumni_public_stats(refresh: int = 0) -> dict:
    """Public (no-login) landing-page counters: alumni network size, average
    ticket SLA, and active openings.

    Exposes ONLY aggregate counts — nothing user-identifiable. Cached for a few
    minutes because it's an unauthenticated, potentially high-traffic endpoint;
    pass ``refresh=1`` to recompute and repopulate the cache.
    """
    cache = frappe.cache()
    if not int(refresh or 0):
        cached = cache.get_value(_PUBLIC_STATS_CACHE_KEY)
        if cached:
            return {"success": True, "stats": cached, "cached": True}

    stats = _compute_alumni_public_stats()
    cache.set_value(_PUBLIC_STATS_CACHE_KEY, stats, expires_in_sec=_PUBLIC_STATS_TTL)
    return {"success": True, "stats": stats, "cached": False}


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
    """Validate/restore an Alumni Portal session.

    A guest is a normal, expected answer to "is anyone signed in?", not an
    error, so it returns HTTP 200 with ``success: False`` — the client already
    branches on that flag. Only a signed-in NON-alumnus is a real authorization
    failure and still returns 403.
    """
    user = frappe.session.user
    if user == "Guest":
        return {
            "success": False,
            "authenticated": False,
            "message": _("Authentication required."),
        }
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


def alumni_employee_name(user: str | None = None) -> str | None:
    """Employee record for an alumni session, as a docname.

    Once an employee leaves, `alumni_user_switch` disables the company-email User
    and the alumnus signs in with their personal email — which is NOT the
    Employee's `user_id`. Resolution order:

        1. `Employee.custom_alumni_user`  — the link written at switch time
        2. `Employee.user_id`             — still-active employees, and any
                                            alumnus who never had the switch run
        3. `Employee.personal_email`      — fallback for records provisioned
                                            before the link field existed

    Returns None when no Employee matches.
    """
    user = user or frappe.session.user
    if not user or user == "Guest":
        return None

    if frappe.get_meta("Employee").get_field("custom_alumni_user"):
        emp = frappe.db.get_value("Employee", {"custom_alumni_user": user}, "name")
        if emp:
            return emp

    emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if emp:
        return emp

    return frappe.db.get_value("Employee", {"personal_email": user}, "name")


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

    emp_name = alumni_employee_name(user)
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
    emp_name = alumni_employee_name(user)
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


# Notification Log is shared with ESS/HR, so an alumnus' inbox otherwise fills
# with Expense Claim, Loan Application, Leave, ToDo and HR-approval alerts they
# can neither see nor act on. Only doctypes the Alumni Portal itself surfaces
# are returned — the same allowlist idea the alumni_guard applies to endpoints.
_ALUMNI_NOTIFICATION_DOCTYPES = ("Notice", "HD Ticket", "HD Ticket Comment")


def _alumni_notification_filter(user: str) -> tuple[str, dict]:
    """SQL predicate limiting Notification Log to alumni-relevant rows.

    Notice rows carry the extra condition that the Notice is flagged for the
    Alumni Portal, mirroring `get_alumni_notices` — without it, ESS-only notices
    leak in through the notification list.
    """
    where = [
        "nl.for_user = %(user)s",
        "nl.document_type IN %(doctypes)s",
    ]
    params = {"user": user, "doctypes": _ALUMNI_NOTIFICATION_DOCTYPES}

    # Schema-drift safe: only constrain on the flag where the column exists.
    if frappe.db.has_column("Notice", "show_in_alumni_portal"):
        where.append(
            """(
                nl.document_type != 'Notice'
                OR EXISTS (
                    SELECT 1 FROM `tabNotice` n
                    WHERE n.name = nl.document_name
                      AND n.show_in_alumni_portal = 1
                )
            )"""
        )

    return " AND ".join(where), params


def _alumni_notification_count(user: str, unread_only: bool = False) -> int:
    where, params = _alumni_notification_filter(user)
    if unread_only:
        where += " AND nl.`read` = 0"
    row = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabNotification Log` nl WHERE {where}", params
    )
    return int(row[0][0]) if row else 0


@frappe.whitelist(methods=["GET"])
def get_alumni_notifications(limit=20, start=0, only_unread=0) -> dict:
    """The logged-in alumnus's notifications (from Notification Log).

    Restricted to notifications the Alumni Portal actually surfaces (see
    `_ALUMNI_NOTIFICATION_DOCTYPES`); ESS/HR notifications are never returned.
    `only_unread=1` restricts the list to unread; `limit`/`start` paginate.
    """
    user = _require_alumni_session()

    where, params = _alumni_notification_filter(user)
    if frappe.utils.cint(only_unread):
        where += " AND nl.`read` = 0"

    params["limit"] = frappe.utils.cint(limit) or 20
    params["start"] = frappe.utils.cint(start)

    notifications = frappe.db.sql(
        f"""
        SELECT nl.name, nl.subject, nl.email_content, nl.type, nl.document_type,
               nl.document_name, nl.`read`, nl.from_user, nl.creation
        FROM `tabNotification Log` nl
        WHERE {where}
        ORDER BY nl.creation DESC
        LIMIT %(limit)s OFFSET %(start)s
        """,
        params,
        as_dict=True,
    )
    return {
        "success": True,
        "unread_count": _alumni_notification_count(user, unread_only=True),
        "total": _alumni_notification_count(user),
        "notifications": notifications,
    }


@frappe.whitelist(methods=["POST"])
def mark_alumni_notification_read(name: str = None, mark_all=0) -> dict:
    """Mark one notification (by `name`) or all (`mark_all=1`) read for this alumnus."""
    user = _require_alumni_session()

    # Scope both paths to the same rows the list returns, so "mark all" never
    # silently touches ESS notifications and the badge always matches the list.
    where, params = _alumni_notification_filter(user)

    if frappe.utils.cint(mark_all):
        frappe.db.sql(
            f"""
            UPDATE `tabNotification Log` nl
            SET nl.`read` = 1
            WHERE {where} AND nl.`read` = 0
            """,
            params,
        )
    elif name:
        # Only one's own notification, and only one the portal actually shows.
        params["name"] = name
        row = frappe.db.sql(
            f"SELECT nl.name FROM `tabNotification Log` nl WHERE {where} AND nl.name = %(name)s",
            params,
        )
        if row:
            frappe.db.set_value("Notification Log", name, "read", 1, update_modified=False)
    frappe.db.commit()

    return {
        "success": True,
        "unread_count": _alumni_notification_count(user, unread_only=True),
    }


# ── Notices (Notice doctype, alumni-only) ─────────────────────────────────────
@frappe.whitelist(methods=["GET"])
def get_alumni_notices(limit=50):
    """Notices for the logged-in alumnus, restricted to the Alumni Portal.

    Reuses the existing alumni auth gate and the existing nextai user-notice
    fetch (so all targeting / publish / expiry rules are honoured), then returns
    ONLY notices flagged ``show_in_alumni_portal = 1``. Notices meant only for the
    ESS Portal are never exposed. Same raw shape as the ESS notice API.
    """
    user = _require_alumni_session()
    try:
        from nextai.nextai.doctype.notice.notice import (
            get_user_notices as nextai_get_user_notices,
        )
        from recruitment.recruitment.notice_visibility import filter_notices_by_portal

        notices = nextai_get_user_notices(user=user, limit=frappe.utils.cint(limit) or 50) or []
        return filter_notices_by_portal(notices, "alumni")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "alumni get_alumni_notices failed")
        return []


# ── Support tickets (HD Ticket, session-scoped, alumni only) ──────────────────
# Tickets are linked to the alumnus by `raised_by` (their email). `ticket_type`
# is the category chip; `agent_group` is the handling team. We never modify HD
# Ticket logic — we read via get_all and create via the standard doctype insert.
_TICKET_OPEN_STATUSES = ("Open", "Replied", "Reopened", "Not Assigned")
_TICKET_RESOLVED_STATUSES = ("Resolved", "Closed")

# HD Category checkbox that gates whether a ticket category (and its tickets) is
# exposed in the Alumni Portal. Added to HD Category by
# recruitment.recruitment.install.ensure_alumni_hd_category_field.
ALUMNI_CATEGORY_FLAG = "custom_show_in_alumni_portal"


def alumni_portal_category_names() -> list[str]:
    """HD Category names flagged 'Show in Alumni Portal'.

    Returns an empty list when HD Category or the flag column is missing (feature
    not installed / not migrated yet) — callers treat that as "don't restrict".
    """
    if not frappe.db.exists("DocType", "HD Category"):
        return []
    if not frappe.db.has_column("HD Category", ALUMNI_CATEGORY_FLAG):
        return []
    return frappe.get_all("HD Category", filters={ALUMNI_CATEGORY_FLAG: 1}, pluck="name")


def _apply_alumni_category_filter(filters: dict) -> None:
    """Restrict an HD Ticket query to Alumni-Portal categories (mutates ``filters``).

    Applies only when both the ticket's ``custom_category`` column and the HD
    Category flag column exist. When the flag exists but no category is flagged,
    the query is forced to match nothing (the portal exposes no category). Before
    migration (flag column absent) it is a no-op, preserving existing behaviour.
    """
    if not frappe.db.has_column("HD Ticket", "custom_category"):
        return
    if not frappe.db.has_column("HD Category", ALUMNI_CATEGORY_FLAG):
        return
    allowed = alumni_portal_category_names()
    # `["in", []]` is unsafe in some backends — force an impossible match instead.
    filters["custom_category"] = ["in", allowed or ["__no_alumni_category__"]]


def _ticket_status_label(status: str) -> str:
    if status in _TICKET_RESOLVED_STATUSES:
        return "Resolved"
    if status in _TICKET_OPEN_STATUSES:
        return "Open"
    return status or ""


def _alumni_email(user: str) -> str:
    return frappe.db.get_value("User", user, "email") or user


def _attach_category_names(tickets: list[dict]) -> None:
    cat_ids = list(set(t.get("category") for t in tickets if t.get("category")))
    if not cat_ids:
        return
    cats = frappe.get_all("HD Category", filters={"name": ["in", cat_ids]}, fields=["name", "category_name"])
    cat_map = {c.name: c.category_name for c in cats}
    for t in tickets:
        if t.get("category"):
            t["category_name"] = cat_map.get(t["category"]) or t["category"]


def _attach_assigned_to(tickets: list[dict]) -> None:
    assignee_ids = set()
    for t in tickets:
        assign_raw = t.get("_assign")
        if assign_raw:
            try:
                parsed = frappe.parse_json(assign_raw)
                if isinstance(parsed, str):
                    parsed = frappe.parse_json(parsed)
                assignees = parsed if isinstance(parsed, list) else [parsed]
                for a in assignees:
                    if a:
                        assignee_ids.add(a)
            except Exception:
                pass

    user_map = {}
    if assignee_ids:
        users = frappe.get_all("User", filters={"name": ["in", list(assignee_ids)]}, fields=["name", "full_name"])
        user_map = {u.name: (u.full_name or u.name) for u in users}

    for t in tickets:
        assigned_to = []
        assign_raw = t.get("_assign")
        if assign_raw:
            try:
                parsed = frappe.parse_json(assign_raw)
                if isinstance(parsed, str):
                    parsed = frappe.parse_json(parsed)
                assignees = parsed if isinstance(parsed, list) else [parsed]
                for a in assignees:
                    if a:
                        assigned_to.append({
                            "name": a,
                            "full_name": user_map.get(a) or a
                        })
            except Exception:
                pass
        
        t.pop("_assign", None)
        t["assigned_to"] = assigned_to


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

    fields = ["name", "subject", "ticket_type", "status", "priority", "_assign", "creation"]
    if frappe.db.has_column("HD Ticket", "custom_category"):
        fields.append("custom_category")

    ticket = frappe.db.get_value(
        "HD Ticket",
        {"name": ticket_name, "raised_by": email},
        fields,
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

    ticket_payload = {
        "id": ticket.name,
        "subject": ticket.subject,
        "category": ticket.get("custom_category") or ticket.ticket_type,
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
    }
    _attach_category_names([ticket_payload])

    return {
        "success": True,
        "ticket": ticket_payload,
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

    # Only the alumnus's OPEN tickets that belong to Alumni-Portal categories.
    open_filters = {"raised_by": email, "status": ["in", _TICKET_OPEN_STATUSES]}
    _apply_alumni_category_filter(open_filters)

    total_open_count = frappe.db.count("HD Ticket", open_filters)

    fields = [
        "name",
        "subject",
        "ticket_type",
        "status",
        "agent_group",
        "creation",
        "modified",
        "opening_date",
        "first_responded_on",
        "_assign",
    ]
    if frappe.db.has_column("HD Ticket", "custom_category"):
        fields.append("custom_category")

    rows = frappe.get_all(
        "HD Ticket",
        filters=open_filters,
        fields=fields,
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
            "category": r.get("custom_category") or r.ticket_type,
            "status": r.status,
            "team": r.agent_group,
            "raised_on": _d(r.opening_date or r.creation),
            "updated_on": _d(r.modified),
            "_assign": r.get("_assign"),
        }
        for r in rows
    ]
    
    _attach_category_names(tickets)
    _attach_assigned_to(tickets)

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
        # A specific category chip was picked (chips only list alumni-portal
        # categories, so this is always within the allowed set).
        if frappe.db.has_column("HD Ticket", "custom_category"):
            filters["custom_category"] = category
        else:
            filters["ticket_type"] = category
    else:
        # No specific chip → restrict to all Alumni-Portal categories only.
        _apply_alumni_category_filter(filters)
    if status == "open":
        filters["status"] = ["in", _TICKET_OPEN_STATUSES]
    elif status == "resolved":
        filters["status"] = ["in", _TICKET_RESOLVED_STATUSES]

    fields = [
        "name", "subject", "ticket_type", "status", "agent_group",
        "creation", "modified", "opening_date", "_assign"
    ]
    if frappe.db.has_column("HD Ticket", "custom_category"):
        fields.append("custom_category")

    rows = frappe.get_all(
        "HD Ticket",
        filters=filters,
        fields=fields,
        order_by="creation desc",
        start=frappe.utils.cint(start),
        page_length=frappe.utils.cint(limit) or 50,
    )
    tickets = [
        {
            "name": r.name,
            "subject": r.subject,
            "category": r.get("custom_category") or r.ticket_type,        # the type flag / chip
            "status": r.status,
            "status_label": _ticket_status_label(r.status),
            "team": r.agent_group,
            "raised_on": _d(r.opening_date or r.creation),
            "updated_on": _d(r.modified),
            "_assign": r.get("_assign"),
        }
        for r in rows
    ]

    _attach_category_names(tickets)
    _attach_assigned_to(tickets)

    total_filtered_count = frappe.db.count("HD Ticket", filters=filters)

    # ── stats over the user's Alumni-Portal tickets (same scope as the list) ──
    stats_filters = {"raised_by": email}
    _apply_alumni_category_filter(stats_filters)
    all_t = frappe.get_all(
        "HD Ticket",
        filters=stats_filters,
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

    from recruitment.recruitment.alumni_helpdesk import get_alumni_hd_categories
    hd_categories_res = get_alumni_hd_categories()

    return {
        "success": True,
        "total_filtered_count": total_filtered_count,
        "stats": {
            "open_tickets": open_count,
            "resolved_tickets": resolved_count,
            "total": len(all_t),
            "avg_response_hours": avg_response_hours,
            "satisfaction_percent": satisfaction_percent,
        },
        "filter_options": {"categories": hd_categories_res.get("categories", [])},
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
    emp = alumni_employee_name(user)
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
    emp = alumni_employee_name(user)
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


# ---------------------------------------------------------------------------
# Refer a friend
# ---------------------------------------------------------------------------
# The alumnus picks an open job, fills in the candidate's details, and we create
# a Job Applicant (source = "Employee Referral") linked to that opening and
# attributed to the referring alumnus. "Your referrals" reads those back.

# Job Applicant status -> (alumnus-facing label, stat group used on the card).
_REFERRAL_STATUS_MAP = {
    "Open": ("Submitted", "submitted"),
    "Replied": ("Screening", "screening"),
    "Hold": ("On hold", "screening"),
    "Accepted": ("Hired", "hired"),
    "Rejected": ("Not selected", "rejected"),
}
_REFERRAL_SOURCE = "Employee Referral"


def _alumni_referrer_employee(user: str) -> "frappe._dict":
    """Employee (name, employee_name) linked to the alumnus, or raise 400."""
    emp = frappe.db.get_value(
        "Employee", alumni_employee_name(user) or "", ["name", "employee_name"], as_dict=True
    )
    if not emp:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("No employee record is linked to your account."))
    return emp


def _ensure_referral_source() -> None:
    """Idempotently create the 'Employee Referral' Job Applicant Source master."""
    if not frappe.db.exists("Job Applicant Source", _REFERRAL_SOURCE):
        frappe.get_doc(
            {"doctype": "Job Applicant Source", "source_name": _REFERRAL_SOURCE}
        ).insert(ignore_permissions=True, ignore_if_duplicate=True)


# ── Refer & Earn banner stats ─────────────────────────────────────────────────
_DEFAULT_REFERRAL_BONUS = 25000.0


def _referral_bonus_per_hire() -> float:
    """Best-effort referral bonus per hire.

    Sums the payout amounts of the first Referral Reward Schedule when that config
    exists, otherwise falls back to a sensible default. Never raises.
    """
    from frappe.utils import flt

    try:
        if frappe.db.exists("DocType", "Referral Reward Schedule"):
            cols = [
                c for c in (
                    "payout_schedule_1_amount",
                    "payout_schedule_2_amount",
                    "payout_schedule_3_amount",
                )
                if frappe.db.has_column("Referral Reward Schedule", c)
            ]
            if cols:
                rows = frappe.get_all(
                    "Referral Reward Schedule", fields=cols,
                    order_by="creation desc", limit=1,
                )
                if rows:
                    total = sum(flt(rows[0].get(c)) for c in cols)
                    if total:
                        return float(total)
    except Exception:
        pass
    return _DEFAULT_REFERRAL_BONUS


def _inr_compact(amount) -> str:
    """₹25000 -> '₹25k', ₹250000 -> '₹2.5L' (marketing-style short form)."""
    a = int(amount or 0)
    if a >= 100000:
        lakhs = a / 100000
        return f"₹{lakhs:.1f}L".replace(".0L", "L")
    if a >= 1000:
        return f"₹{a // 1000}k"
    return f"₹{a}"


def _inr_full(amount) -> str:
    """₹25000 -> '₹25,000'."""
    return "₹{:,.0f}".format(float(amount or 0))


def _current_quarter_start(now):
    """First moment of the current calendar quarter for ``now`` (a datetime)."""
    q_start_month = ((now.month - 1) // 3) * 3 + 1
    return now.replace(
        month=q_start_month, day=1, hour=0, minute=0, second=0, microsecond=0
    )


@frappe.whitelist(methods=["GET"])
def get_alumni_referral_stats() -> dict:
    """Aggregate stats for the Alumni 'Refer & Earn' banner.

    Returns, across the whole alumni referral program:
    - ``referred_this_quarter`` — referrals submitted by alumni this quarter,
    - ``hired_so_far`` — alumni referrals that were Accepted (all-time),
    - ``bonus_per_hire`` (+ display strings) — the referral bonus per hire,
    - ``open_roles`` — currently Open Job Openings.

    An alumnus is any Employee with status 'Left' or the alumni flag set.
    """
    _require_alumni_session()
    from frappe.utils import now_datetime

    now = now_datetime()
    q_start = _current_quarter_start(now)

    referred_this_quarter = 0
    hired_so_far = 0
    if frappe.db.has_column("Job Applicant", "custom_referred_by"):
        # "referrer is an alumnus" clause (guard the Employee flag column).
        if frappe.db.has_column("Employee", ALUMNI_FLAG):
            alumni_clause = f"(e.status = 'Left' OR COALESCE(e.`{ALUMNI_FLAG}`, 0) = 1)"
        else:
            alumni_clause = "e.status = 'Left'"

        referred_this_quarter = (
            frappe.db.sql(
                f"""
                SELECT COUNT(*) FROM `tabJob Applicant` ja
                JOIN `tabEmployee` e ON e.name = ja.custom_referred_by
                WHERE ja.source = %(src)s AND ja.creation >= %(qs)s AND {alumni_clause}
                """,
                {"src": _REFERRAL_SOURCE, "qs": q_start},
            )[0][0]
            or 0
        )
        hired_so_far = (
            frappe.db.sql(
                f"""
                SELECT COUNT(*) FROM `tabJob Applicant` ja
                JOIN `tabEmployee` e ON e.name = ja.custom_referred_by
                WHERE ja.source = %(src)s AND ja.status = 'Accepted' AND {alumni_clause}
                """,
                {"src": _REFERRAL_SOURCE},
            )[0][0]
            or 0
        )

    open_roles = frappe.db.count("Job Opening", {"status": "Open"})
    bonus = _referral_bonus_per_hire()

    return {
        "success": True,
        "referred_this_quarter": int(referred_this_quarter),
        "hired_so_far": int(hired_so_far),
        "bonus_per_hire": bonus,
        "bonus_per_hire_display": _inr_compact(bonus),
        "bonus_per_hire_full": _inr_full(bonus),
        "open_roles": int(open_roles),
    }


def _attach_referral_resume(resume_file, applicant_name: str) -> str | None:
    """Attach an optional {"filename", "content"} resume to the Job Applicant.

    Mirrors the existing employee-referral upload contract (base64 ``content``).
    Any failure is logged and swallowed so it never blocks the referral itself.
    """
    if not resume_file:
        return None
    if isinstance(resume_file, str):
        try:
            resume_file = frappe.parse_json(resume_file)
        except Exception:
            return None
    if not isinstance(resume_file, dict):
        return None
    filename = resume_file.get("filename")
    content = resume_file.get("content")
    if not filename or not content:
        return None
    try:
        file_doc = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": filename,
                "attached_to_doctype": "Job Applicant",
                "attached_to_name": applicant_name,
                "is_private": 1,
                "content": content,
            }
        )
        file_doc.insert(ignore_permissions=True)
        return file_doc.file_url
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Alumni referral resume upload failed")
        return None


# Supported resume/document types + max size for the pre-upload endpoint.
_REFERRAL_ALLOWED_EXTS = {"pdf", "jpg", "jpeg", "png", "doc", "docx"}
_REFERRAL_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@frappe.whitelist(methods=["POST"])
def upload_alumni_referral_document() -> dict:
    """Upload a referral resume/document (multipart/form-data, field ``file``).

    Validates the type (PDF, JPG, JPEG, PNG, DOC, DOCX) and size (≤ 5 MB), stores
    it **privately** via Frappe's File doctype, and returns a ``file_url`` that is
    directly usable as the ``resume`` param of :func:`submit_alumni_referral`.

    Response: ``{success, file_url, file_name, file_size, is_private, message}``.
    """
    _require_alumni_session()

    uploaded = None
    if getattr(frappe, "request", None) and getattr(frappe.request, "files", None):
        uploaded = frappe.request.files.get("file") or frappe.request.files.get("attachment")
    if not uploaded:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("A file is required.")}

    filename = uploaded.filename or "document"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _REFERRAL_ALLOWED_EXTS:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("Unsupported file type. Allowed: PDF, JPG, JPEG, PNG, DOC, DOCX."),
        }

    content = uploaded.stream.read()
    size = len(content or b"")
    if not size:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("The uploaded file is empty.")}
    if size > _REFERRAL_MAX_BYTES:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("File is too large. Maximum size is {0} MB.").format(
                _REFERRAL_MAX_BYTES // (1024 * 1024)
            ),
        }

    try:
        from frappe.utils.file_manager import save_file

        # Not attached to a doc yet — submit_alumni_referral links it to the
        # Job Applicant it creates. Private, so it isn't publicly enumerable.
        saved = save_file(filename, content, dt=None, dn=None, is_private=1)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "alumni upload_alumni_referral_document failed")
        frappe.local.response["http_status_code"] = 500
        return {"success": False, "message": _("Unable to upload the file right now.")}

    return {
        "success": True,
        "file_url": saved.file_url,
        "file_name": saved.file_name,
        "file_size": size,
        "is_private": int(getattr(saved, "is_private", 1) or 0),
        "message": _("File uploaded successfully."),
    }


def _link_referral_resume_url(file_url: str, applicant_name: str) -> str | None:
    """Link a previously-uploaded File (by ``file_url``) to the Job Applicant.

    Only links a File owned by the current alumnus (so a URL can't be used to
    attach someone else's private file). Returns the ``file_url`` on success, else
    ``None``. Never raises.
    """
    file_url = (file_url or "").strip()
    if not file_url:
        return None
    try:
        f = frappe.db.get_value(
            "File", {"file_url": file_url},
            ["name", "owner", "attached_to_name"], as_dict=True,
        )
        if not f:
            return None
        if f.owner != frappe.session.user:
            return None  # not this alumnus's upload — refuse to attach
        # Link via db.set_value (no File hooks) — avoids triggering resume parsing
        # and never blocks the referral. Only attach an as-yet-unattached file.
        if not f.attached_to_name:
            frappe.db.set_value(
                "File", f.name,
                {"attached_to_doctype": "Job Applicant", "attached_to_name": applicant_name},
                update_modified=False,
            )
        return file_url
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Alumni referral resume link failed")
        return None


@frappe.whitelist(methods=["GET"])
def get_alumni_referral_jobs(search: str = None, limit=200, start=0) -> dict:
    """Open jobs an alumnus can refer a friend to (the 'Department / role area'
    picker). Every opening with status == 'Open' is returned — the `publish` flag
    (public careers-site visibility) is intentionally NOT required here, so alumni
    can refer into internal/unpublished roles too. Each job carries link ids plus
    resolved `*_title` labels.
    """
    from frappe.utils import cint

    user = _require_alumni_session()
    _alumni_referrer_employee(user)

    filters = {"status": "Open"}

    or_filters = None
    if search:
        needle = f"%{search.strip()}%"
        or_filters = [["job_title", "like", needle], ["name", "like", needle]]

    candidate_fields = [
        "name", "job_title", "designation", "department",
        "location", "employment_type", "company", "description",
    ]
    fields = [
        f for f in candidate_fields
        if f == "name" or frappe.db.has_column("Job Opening", f)
    ]

    rows = frappe.get_all(
        "Job Opening",
        filters=filters,
        or_filters=or_filters,
        fields=fields,
        order_by="creation desc",
        limit_page_length=cint(limit) or 200,
        limit_start=cint(start) or 0,
    ) or []

    jobs = []
    for r in rows:
        jobs.append({
            "id": r.get("name"),
            "job_title": r.get("job_title") or r.get("name"),
            "designation": r.get("designation") or "",
            "designation_title": _resolve_link_title(
                "Job Opening", "designation", r.get("designation") or ""),
            "department": r.get("department") or "",
            "department_title": _resolve_link_title(
                "Job Opening", "department", r.get("department") or ""),
            "location": r.get("location") or "",
            "location_title": _resolve_link_title(
                "Job Opening", "location", r.get("location") or ""),
            "employment_type": r.get("employment_type") or "",
            "employment_type_title": _resolve_link_title(
                "Job Opening", "employment_type", r.get("employment_type") or ""),
            "company": r.get("company") or "",
            "description": r.get("description") or "",
        })

    return {"success": True, "jobs": jobs, "count": len(jobs)}


@frappe.whitelist(methods=["POST"])
def submit_alumni_referral(
    job_opening: str,
    full_name: str,
    email: str,
    phone: str = None,
    linkedin: str = None,
    note: str = None,
    resume_file=None,
    resume: str = None,
) -> dict:
    """Refer a friend against a specific open job.

    Creates a Job Applicant (source = "Employee Referral") linked to
    ``job_opening`` and attributed to the logged-in alumnus. Returns the created
    applicant's name.

    Resume (optional) — two supported ways:
    * ``resume`` — a ``file_url`` from :func:`upload_alumni_referral_document`
      (the recommended pre-upload flow), or
    * ``resume_file`` — a legacy ``{"filename", "content"}`` base64 blob.
    """
    user = _require_alumni_session()
    referrer = _alumni_referrer_employee(user)

    full_name = (full_name or "").strip()
    email = (email or "").strip()
    if not full_name:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Candidate name is required.")}
    if not email:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Candidate email is required.")}

    from frappe.utils import validate_email_address

    if not validate_email_address(email):  # "" when invalid
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("{0} is not a valid email address.").format(email),
        }

    opening = frappe.db.get_value(
        "Job Opening", job_opening,
        ["name", "status", "designation", "department", "job_title"],
        as_dict=True,
    )
    if not opening:
        frappe.local.response["http_status_code"] = 404
        return {"success": False, "message": _("The selected job opening was not found.")}
    if (opening.get("status") or "").lower() != "open":
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("This opening is no longer accepting referrals.")}

    # Don't let the same candidate be referred to the same opening twice.
    existing = frappe.db.exists(
        "Job Applicant", {"email_id": email, "job_title": opening.name}
    )
    if existing:
        frappe.local.response["http_status_code"] = 409
        return {
            "success": False,
            "name": existing,
            "message": _("You have already referred this candidate for this role."),
        }

    _ensure_referral_source()

    has = {df.fieldname for df in frappe.get_meta("Job Applicant").fields}

    applicant = frappe.new_doc("Job Applicant")
    applicant.applicant_name = full_name
    applicant.email_id = email
    applicant.job_title = opening.name
    applicant.source = _REFERRAL_SOURCE
    if opening.get("designation") and "designation" in has:
        applicant.designation = opening.get("designation")
    if phone and "phone_number" in has:
        applicant.phone_number = phone
    if linkedin and "custom_linkedin_url" in has:
        applicant.custom_linkedin_url = linkedin
    if note and "cover_letter" in has:
        applicant.cover_letter = note
    if "custom_referred_by" in has:
        applicant.custom_referred_by = referrer.name
    if "custom_referred_employee_name" in has:
        applicant.custom_referred_employee_name = referrer.employee_name

    try:
        applicant.insert(ignore_permissions=True)
    except frappe.DuplicateEntryError:
        frappe.db.rollback()
        frappe.local.response["http_status_code"] = 409
        return {"success": False, "message": _("This candidate has already been submitted.")}

    # Prefer a pre-uploaded file (`resume` = file_url); fall back to a legacy
    # base64 blob (`resume_file`).
    resume_url = _link_referral_resume_url(resume, applicant.name)
    if not resume_url:
        resume_url = _attach_referral_resume(resume_file, applicant.name)
    if resume_url and "resume_attachment" in has:
        applicant.db_set("resume_attachment", resume_url, update_modified=False)

    frappe.db.commit()

    return {
        "success": True,
        "name": applicant.name,
        "job_opening": opening.name,
        "job_title": opening.get("job_title") or opening.name,
        "resume_url": resume_url or "",
        "message": _("Referral submitted. Recruiting will reach out within 5 days."),
    }


@frappe.whitelist(methods=["GET"])
def get_alumni_referrals(status: str = None, search: str = None, limit=50, start=0) -> dict:
    """The alumnus's referrals ('Your referrals'), with stat groups.

    Each referral carries the linked opening, a friendly pipeline label/group,
    and an 'Interviewing' override when a live Interview exists. Stats are always
    computed over the FULL set; `limit`/`start` paginate the returned list.
    """
    from frappe.utils import cint

    user = _require_alumni_session()
    referrer = _alumni_referrer_employee(user)

    rows = frappe.get_all(
        "Job Applicant",
        filters={"custom_referred_by": referrer.name},
        fields=[
            "name", "applicant_name", "email_id", "phone_number",
            "designation", "job_title", "status", "creation",
        ],
        order_by="creation desc",
        limit_page_length=0,
    ) or []

    opening_cache = {}

    def _opening(name):
        if not name:
            return frappe._dict()
        if name not in opening_cache:
            opening_cache[name] = frappe.db.get_value(
                "Job Opening", name,
                ["job_title", "designation", "location", "status"],
                as_dict=True,
            ) or frappe._dict()
        return opening_cache[name]

    # Applicants with a live (non-terminal) interview surface as "Interviewing".
    interviewing = set()
    names = [r.name for r in rows]
    if names:
        for iv in frappe.get_all(
            "Interview",
            filters={"job_applicant": ["in", names]},
            fields=["job_applicant", "status"],
        ) or []:
            if (iv.get("status") or "") not in ("Cleared", "Rejected"):
                interviewing.add(iv.get("job_applicant"))

    stats = {
        "total": len(rows), "submitted": 0, "screening": 0,
        "interviewing": 0, "hired": 0, "rejected": 0,
    }
    referrals = []
    for r in rows:
        label, group = _REFERRAL_STATUS_MAP.get(r.status, ("Submitted", "submitted"))
        if r.name in interviewing and group not in ("hired", "rejected"):
            label, group = "Interviewing", "interviewing"
        stats[group] = stats.get(group, 0) + 1
        op = _opening(r.job_title)
        desig = r.designation or op.get("designation") or ""
        referrals.append({
            "name": r.name,
            "candidate_name": r.applicant_name,
            "email": r.email_id,
            "phone": r.phone_number,
            "opening": r.job_title,
            "job_title": op.get("job_title") or r.job_title,
            "designation": desig,
            "designation_title": _resolve_link_title("Job Applicant", "designation", desig),
            "location": op.get("location") or "",
            "location_title": _resolve_link_title("Job Opening", "location", op.get("location") or ""),
            "date_of_referral": _d(r.creation),
            "raw_status": r.status,
            "status": label,
            "status_group": group,
            "job_status": op.get("status"),
        })

    if status and status != "all":
        referrals = [x for x in referrals if x["status_group"] == status]
    if search:
        needle = search.strip().lower()
        referrals = [
            x for x in referrals
            if needle in (x["candidate_name"] or "").lower()
            or needle in (x["email"] or "").lower()
            or needle in (x["job_title"] or "").lower()
        ]

    total_matched = len(referrals)
    start_i = cint(start) or 0
    lim = cint(limit) or 50
    referrals = referrals[start_i:start_i + lim] if lim else referrals

    return {"success": True, "stats": stats, "referrals": referrals, "count": total_matched}


# ── Keep the alumni flag in sync with Employee lifecycle ──────────────────────
def sync_alumni_flag(doc, method: str | None = None) -> None:
    """Employee `on_update` hook: write the editable `custom_is_alumni_employee`
    checkbox through to the linked User.

    The Employee checkbox is the single authority for Alumni Portal access — HR
    grants or revokes access by ticking/unticking it — and its value is mirrored
    onto `User.custom_is_alumni_employee`, the flag that actually gates login.

    Full manual control: ticking grants, unticking revokes (even for a 'Left'
    employee). New exits still default to granted — when status transitions into
    'Left' the checkbox is turned on — but a later manual untick is never
    overridden. Never touches Employee.status or User.enabled.
    """
    if not getattr(doc, "user_id", None):
        return
    from frappe.utils import cint

    # Default-grant on the transition into 'Left'; manual edits win afterwards.
    if (
        doc.status == "Left"
        and doc.has_value_changed("status")
        and not cint(doc.get(ALUMNI_FLAG))
    ):
        doc.db_set(ALUMNI_FLAG, 1, update_modified=False)

    desired = cint(doc.get(ALUMNI_FLAG))
    current = cint(frappe.db.get_value("User", doc.user_id, ALUMNI_FLAG))
    if current != desired:
        frappe.db.set_value(
            "User", doc.user_id, ALUMNI_FLAG, desired, update_modified=False
        )


# ── Company branding / details ────────────────────────────────────────────────
# Name, logo and profile of the company an alumnus belonged to, for the Alumni
# Portal header, footer and "About" section.

# Company fields surfaced to the portal (all read-only, none sensitive).
_ALUMNI_COMPANY_FIELDS = (
    "name",
    "company_name",
    "abbr",
    "company_logo",
    "company_description",
    "website",
    "email",
    "phone_no",
    "domain",
    "country",
    "date_of_establishment",
)


def _resolve_alumni_company() -> str | None:
    """Company for the current caller.

    An alumni session resolves to the company on their own Employee record; a
    guest (login / landing page) falls back to the site's default company so the
    portal can still render branding before sign-in.

    The company is never taken from a request parameter — that would let anyone
    enumerate company records through a guest endpoint.
    """
    user = frappe.session.user
    if user and user != "Guest":
        emp_for_company = alumni_employee_name(user)
        company = (
            frappe.db.get_value("Employee", emp_for_company, "company")
            if emp_for_company
            else None
        )
        if company:
            return company

    return frappe.db.get_single_value("Global Defaults", "default_company") or (
        frappe.db.get_value("Company", {}, "name")
    )


def _company_address(company: str) -> dict | None:
    """Primary address linked to the company, if one is set."""
    name = frappe.db.sql(
        """
        SELECT dl.parent
        FROM `tabDynamic Link` dl
        JOIN `tabAddress` a ON a.name = dl.parent
        WHERE dl.link_doctype = 'Company' AND dl.link_name = %(company)s
              AND dl.parenttype = 'Address'
        ORDER BY a.is_primary_address DESC, a.modified DESC
        LIMIT 1
        """,
        {"company": company},
    )
    if not name:
        return None

    addr = frappe.db.get_value(
        "Address",
        name[0][0],
        ["address_line1", "address_line2", "city", "state", "country", "pincode"],
        as_dict=True,
    )
    if not addr:
        return None

    addr["display"] = ", ".join(
        str(v).strip()
        for v in (
            addr.get("address_line1"),
            addr.get("address_line2"),
            addr.get("city"),
            addr.get("state"),
            addr.get("pincode"),
            addr.get("country"),
        )
        if v and str(v).strip()
    )
    return addr


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_alumni_company() -> dict:
    """Company name, logo and details for the Alumni Portal.

    Resolves the company from the signed-in alumnus's Employee record, falling
    back to the site's default company for guests so the login and landing pages
    can render the same branding.

    ``description`` is the raw HTML from the Company's "About Company" field;
    ``description_text`` is the same content stripped to plain text.
    """
    company = _resolve_alumni_company()
    if not company:
        return {"success": True, "company": None}

    doc = frappe.db.get_value(
        "Company", company, list(_ALUMNI_COMPANY_FIELDS), as_dict=True
    )
    if not doc:
        return {"success": True, "company": None}

    # Fall back to the site logo when the company has none of its own, so the
    # portal header is never blank.
    logo = doc.get("company_logo") or frappe.db.get_single_value(
        "Website Settings", "app_logo"
    )

    description = doc.get("company_description") or ""
    established = doc.get("date_of_establishment")

    return {
        "success": True,
        "company": {
            "name": doc["name"],
            "company_name": doc.get("company_name") or doc["name"],
            "abbr": doc.get("abbr") or "",
            "logo": logo or "",
            # Absolute URL, for clients that cannot resolve a site-relative path.
            "logo_url": frappe.utils.get_url(logo) if logo else "",
            "description": description,
            "description_text": frappe.utils.strip_html_tags(description).strip(),
            "website": doc.get("website") or "",
            "email": doc.get("email") or "",
            "phone": doc.get("phone_no") or "",
            "domain": doc.get("domain") or "",
            "country": doc.get("country") or "",
            "established_on": _d(established),
            "established_year": established.year if established else None,
            "address": _company_address(company),
        },
    }


# ── Alumni Todo manager ───────────────────────────────────────────────────────
# The portal's Todo page reads its list through cn_todo_manager's own whitelisted
# APIs (those are session-scoped and allowlisted in alumni_guard), but writing a
# ToDo and reading ToDo Settings would need `/api/resource/*`, which the guard
# blocks outright for alumni sessions.
#
# Going through the alumni namespace instead — the same pattern as
# `download_alumni_document` — keeps that blanket block intact and makes the
# ownership rule explicit here rather than relying on a framework hook.

# Fields an alumnus may change on their own ToDo. Delegated assignment and
# category changes are allowed only to values permitted for this alumnus.
_ALUMNI_TODO_WRITABLE_FIELDS = (
    "status",
    "priority",
    "date",
    "custom_todo_type",
    "allocated_to",
)

# Only the flags the portal UI actually reads. ToDo Settings grants write access
# to role "All" with no controller check, so it is never exposed for writing.
_ALUMNI_TODO_SETTINGS_FIELDS = (
    "allow_to_create_task",
    "disable_edit_due_date",
    "enable_pagination",
    "default_page_size",
    "max_page_size",
    "allow_attachments_in_todos",
    "show_external_action_buttons",
    "allow_redirection_to_reference_doctypes",
    "hide_priority_flag",
    "hide_assignee_in_my_todo",
    "show_team_todos",
    "show_delegate_task",
    "show_go_to_doctype",
)


def _loadable_todo_notifications() -> list[dict] | None:
    """The enabled ToDo Notifications Frappe can actually import.

    A Notification with ``is_standard`` is backed by a Python module whose path
    is derived from the record's NAME (``modules.utils.get_doc_module`` ->
    ``<app>.<module>.notification.<scrub(name)>``). This site has a record whose
    email SUBJECT was saved as its name — "URGENT: Task Escalated to High
    Priority - {{ doc.name }}" — which scrubs to an invalid module path, so
    loading it raises ModuleNotFoundError on **every** ToDo save, site-wide.

    That record is an orphan duplicate: a correctly named twin, "Task Escalated
    to High Priority", already exists, is enabled, and has a real module folder.

    Disabling the bad record would be a site-wide change that also alters ESS, so
    instead this returns the list in the shape ``Document.run_notifications``
    builds for ``flags.notifications``, with the unloadable entries dropped.
    Seeding that flag skips only the broken records, only for that one save —
    every healthy notification still fires as normal.

    Detection is by shape rather than by hardcoded name, so any other malformed
    record is covered and cleaning up the data later makes this a silent no-op.
    """
    try:
        rows = frappe.get_all(
            "Notification",
            filters={"enabled": 1, "document_type": "ToDo"},
            fields=["name", "event", "method"],
        )
    except Exception:
        # Never let this guard break the update it exists to protect. Returning
        # None leaves Frappe to build the list itself, i.e. current behaviour.
        return None

    # scrub() only lowercases and swaps " "/"-" for "_", so a name that is not an
    # identifier afterwards cannot be a module path segment.
    keep = [r for r in rows if frappe.scrub(r["name"]).isidentifier()]

    dropped = [r["name"] for r in rows if r not in keep]
    if dropped:
        frappe.logger("alumni_portal").warning(
            f"Skipping ToDo Notification(s) with an unloadable module path: {dropped}"
        )

    return keep


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_settings() -> dict:
    """The ToDo Settings flags the portal UI needs, read-only."""
    _require_alumni_session()

    values = (
        frappe.db.get_value(
            "ToDo Settings", "ToDo Settings", _ALUMNI_TODO_SETTINGS_FIELDS, as_dict=True
        )
        or {}
    )
    # cint every value. ToDo Settings is a Single, so its values live in
    # `tabSingles` as TEXT and come back as strings — and "0" is TRUTHY in
    # JavaScript, which silently turns every one of these flags ON in the UI.
    # All eleven fields are Check or Int, so the cast is total.
    return {
        "success": True,
        "settings": {
            k: frappe.utils.cint(values.get(k)) for k in _ALUMNI_TODO_SETTINGS_FIELDS
        },
    }


@frappe.whitelist(methods=["POST"])
def update_alumni_todo(
    name: str,
    status=None,
    priority=None,
    date=None,
    custom_todo_type=None,
    allocated_to=None,
) -> dict:
    """Update one of the caller's own ToDos.

    Backs the inline status / priority / due-date controls. Only a ToDo the
    alumnus is the assignee of, or raised themselves, can be touched — the same
    rule Frappe's own `ToDo.has_permission` applies, asserted here so the check
    does not depend on the request arriving through the resource API.
    """
    _require_own_todo(name)
    current_user = _require_alumni_session()

    incoming = {
        "status": status,
        "priority": priority,
        "date": date,
        "custom_todo_type": custom_todo_type,
        "allocated_to": allocated_to,
    }
    patch = {f: incoming[f] for f in _ALUMNI_TODO_WRITABLE_FIELDS if incoming[f] is not None}
    if not patch:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("Nothing to update."))

    if "custom_todo_type" in patch:
        todo_type = str(patch.get("custom_todo_type") or "").strip()
        if not todo_type:
            frappe.local.response["http_status_code"] = 400
            frappe.throw(_("Todo Type is mandatory."))
        if not frappe.db.exists("Todo Type", todo_type):
            frappe.local.response["http_status_code"] = 400
            frappe.throw(_("That todo type does not exist."))
        allowed_types = set(_alumni_visible_todo_types())
        if todo_type not in allowed_types:
            frappe.local.response["http_status_code"] = 403
            frappe.throw(_("That todo type is not available."), frappe.PermissionError)

    if "allocated_to" in patch:
        allocated_user = str(patch.get("allocated_to") or "").strip()
        if allocated_user:
            summary = _get_alumni_todo_delegation_summary(current_user)
            if allocated_user not in set(summary.get("allowed_delegates") or []):
                frappe.local.response["http_status_code"] = 403
                frappe.throw(_("That assignee is not available."), frappe.PermissionError)

    # Through the document API, not frappe.db.set_value: ToDo.on_update keeps the
    # referenced document's `_assign` in step, which a direct DB write skips.
    doc = frappe.get_doc("ToDo", name)
    for field, value in patch.items():
        if field == "custom_todo_type":
            doc.set("custom_todo_type", value)
        else:
            doc.set(field, value)

    # Frappe only builds this list when the flag is unset, and _save() does not
    # clear it — so seeding it with the loadable alerts keeps this single save
    # alive without changing the notification setup for anyone else.
    doc.flags.notifications = _loadable_todo_notifications()

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "todo": {"name": doc.name, **{f: doc.get(f) for f in _ALUMNI_TODO_WRITABLE_FIELDS}},
    }


# ── Alumni Todo: detail, comments, attachments, activity ──────────────────────
# The reference Task Manager reads all of this through generic endpoints —
# /api/resource/Comment, /api/resource/File, frappe.desk.form.load.getdoc,
# frappe.client.get_list, upload_file, frappe.desk.form.utils.add_comment.
# alumni_guard blocks every one of those for an alumni session, so each is
# mirrored here, scoped to a ToDo the caller actually owns.

# Everything the detail drawer and the list row need from a ToDo.
_ALUMNI_TODO_FIELDS = (
    "name", "custom_subject", "description", "status", "priority",
    "date", "custom_due_datetime", "allocated_to", "assigned_by", "owner",
    "creation", "modified", "custom_todo_type", "custom_dynamic_route",
    "reference_type", "reference_name", "custom_approval_type",
    "custom_doctype_actions", "custom_funnel_task",
    "custom_open_chatnext_assistant_on_action", "custom_redirect_only",
    "custom_allow_revoke", "custom_reminders", "custom_remainders",
)


def _existing_todo_fields() -> list[str]:
    """`_ALUMNI_TODO_FIELDS` narrowed to columns this site actually has.

    The cn_todo_manager custom fields vary between installs — this site has
    `custom_remainders` but not `custom_reminders`, and selecting a missing
    column raises OperationalError 1054.

    Checked against the DB rather than the meta on purpose: a field can exist in
    the doctype definition while its column has never been synced (true for
    `custom_reminders` here), and meta would happily hand back a name that then
    fails in SQL.
    """
    return [
        f for f in _ALUMNI_TODO_FIELDS if f == "name" or frappe.db.has_column("ToDo", f)
    ]


def _require_own_todo(name: str) -> tuple[str, dict]:
    """Assert the session owns ``name`` and return ``(user, todo_row)``.

    Ownership is ``allocated_to`` or ``assigned_by`` — the same rule Frappe's
    own ``ToDo.has_permission`` applies. A missing ToDo and someone else's ToDo
    give the identical 403 so the endpoint cannot be used to probe for names.
    """
    user = _require_alumni_session()

    if not name:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("A todo is required."))

    row = frappe.db.get_value(
        "ToDo",
        name,
        [
            "name",
            "allocated_to",
            "assigned_by",
            "owner",
            "reference_type",
            "reference_name",
        ],
        as_dict=True,
    )
    if not row or not _user_owns_todo(user, name, row):
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized for this todo."), frappe.PermissionError)

    # Same gate as the list: a todo the portal would not show must not open
    # either, or the category filter is bypassable by guessing a name.
    if not _todo_type_visible_to_alumni(name):
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized for this todo."), frappe.PermissionError)

    return user, row


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo(name: str) -> dict:
    """One ToDo in full, for the detail drawer.

    Replaces ``frappe.desk.form.load.getdoc``. Returns only the fields the UI
    reads rather than the whole document, so nothing incidental leaks.
    """
    _require_own_todo(name)

    todo = frappe.db.get_value("ToDo", name, _existing_todo_fields(), as_dict=True) or {}
    for field in ("creation", "modified", "date", "custom_due_datetime"):
        todo[field] = _d(todo.get(field))

    return {"success": True, "todo": todo}


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_comments(name: str) -> dict:
    """Comments on a ToDo, oldest first. Replaces a Comment list query."""
    _require_own_todo(name)

    rows = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "ToDo",
            "reference_name": name,
            "comment_type": "Comment",
        },
        fields=["name", "content", "comment_email", "comment_by", "creation"],
        order_by="creation asc",
    )
    for row in rows:
        row["creation"] = _d(row.get("creation"))

    return {"success": True, "comments": rows}


@frappe.whitelist(methods=["POST"])
def add_alumni_todo_comment(name: str, content: str) -> dict:
    """Add a comment to one's own ToDo. Replaces frappe.desk.form.utils.add_comment."""
    user, _row = _require_own_todo(name)

    content = (content or "").strip()
    if not content:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("A comment cannot be empty."))

    full_name = frappe.db.get_value("User", user, "full_name") or user
    comment = frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Comment",
            "reference_doctype": "ToDo",
            "reference_name": name,
            "content": content,
            "comment_email": user,
            "comment_by": full_name,
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "comment": {
            "name": comment.name,
            "content": comment.content,
            "comment_email": comment.comment_email,
            "comment_by": comment.comment_by,
            "creation": _d(comment.creation),
        },
    }


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_attachments(name: str) -> dict:
    """Files attached to the permission-checked ToDo's reference document."""
    _user, todo = _require_own_todo(name)
    reference_type = todo.get("reference_type")
    reference_name = todo.get("reference_name")

    rows = []
    if reference_type and reference_name:
        rows = frappe.get_all(
            "File",
            filters={
                "attached_to_doctype": reference_type,
                "attached_to_name": reference_name,
            },
            fields=[
                "name",
                "file_name",
                "file_url",
                "file_type",
                "file_size",
                "is_private",
                "creation",
            ],
            order_by="creation desc",
        )
    for row in rows:
        row["creation"] = _d(row.get("creation"))

    return {
        "success": True,
        "reference_attachments": rows,
        "reference_type": reference_type,
        "reference_name": reference_name,
    }


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_print_preview(name: str) -> dict:
    """Render the configured print view for an accessible ToDo's reference."""
    _user, todo = _require_own_todo(name)
    reference_type = todo.get("reference_type")
    reference_name = todo.get("reference_name")
    unavailable = {
        "available": False,
        "html": None,
        "style": None,
        "reference_type": reference_type,
        "reference_name": reference_name,
    }
    if not reference_type or not reference_name:
        return unavailable

    settings = frappe.get_cached_doc("ToDo Settings", "ToDo Settings")
    allocation = next(
        (
            row
            for row in (settings.get("format_allocations") or [])
            if row.get("doctype_name") == reference_type and row.get("print_format")
        ),
        None,
    )
    if not allocation:
        return unavailable

    # The Todo ownership/category check above is the authorization boundary.
    # Render internally so a Website User does not need generic read/resource
    # permission for the referenced document.
    from frappe.www.printview import (
        get_print_format_doc,
        get_print_style,
        get_rendered_template,
        set_link_titles,
    )

    reference_doc = frappe.get_doc(reference_type, reference_name)
    print_format = get_print_format_doc(allocation.get("print_format"), meta=reference_doc.meta)
    set_link_titles(reference_doc)
    print_result = {
        "html": get_rendered_template(
            doc=reference_doc,
            print_format=print_format,
            meta=reference_doc.meta,
            no_letterhead=1,
            letterhead=None,
            trigger_print=False,
            settings={},
        ),
        "style": get_print_style(print_format=print_format),
    }
    return {
        "available": True,
        "html": print_result["html"],
        "style": print_result["style"],
        "reference_type": reference_type,
        "reference_name": reference_name,
    }


@frappe.whitelist(methods=["POST"])
def upload_alumni_todo_attachment(todo: str) -> dict:
    """Attach an uploaded file to one's own ToDo.

    Accepts ``multipart/form-data`` with the file in ``file``, mirroring
    `upload_alumni_ticket_attachment`. Honours the `allow_attachments_in_todos`
    setting, so the portal cannot bypass a switched-off feature.
    """
    _require_own_todo(todo)

    if not frappe.db.get_single_value("ToDo Settings", "allow_attachments_in_todos"):
        frappe.local.response["http_status_code"] = 403
        return {"success": False, "message": _("Attachments are disabled.")}

    uploaded = None
    if getattr(frappe, "request", None) and getattr(frappe.request, "files", None):
        uploaded = frappe.request.files.get("file") or frappe.request.files.get("attachment")

    if not uploaded:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("No file was provided.")}

    from frappe.utils.file_manager import save_file

    saved = save_file(
        uploaded.filename or "attachment",
        uploaded.stream.read(),
        "ToDo",
        todo,
        is_private=1,
    )
    frappe.db.commit()

    return {
        "success": True,
        "attachment": {
            "name": saved.name,
            "file_name": saved.file_name,
            "file_url": saved.file_url,
            "file_size": saved.file_size,
            "is_private": saved.is_private,
        },
    }


@frappe.whitelist(methods=["POST"])
def delete_alumni_todo_attachment(todo: str, file_name: str) -> dict:
    """Remove an attachment from one's own ToDo.

    ``file_name`` is the File docname. It must already be attached to ``todo``,
    so a File belonging to any other document can never be deleted here.
    """
    _require_own_todo(todo)

    owned = frappe.db.exists(
        "File",
        {"name": file_name, "attached_to_doctype": "ToDo", "attached_to_name": todo},
    )
    if not owned:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized for this file."), frappe.PermissionError)

    frappe.delete_doc("File", file_name, ignore_permissions=True, delete_permanently=False)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_activity(name: str) -> dict:
    """Change history for a ToDo, newest first. Replaces a Version list query."""
    _require_own_todo(name)

    rows = frappe.get_all(
        "Version",
        filters={"ref_doctype": "ToDo", "docname": name},
        fields=["name", "owner", "creation", "data"],
        order_by="creation desc",
        limit=50,
    )

    activity = []
    for row in rows:
        try:
            changed = frappe.parse_json(row.get("data") or "{}").get("changed") or []
        except Exception:
            changed = []
        activity.append(
            {
                "name": row["name"],
                "owner": row["owner"],
                "creation": _d(row.get("creation")),
                # [fieldname, old, new] triples, as Frappe stores them.
                "changed": [
                    {"field": c[0], "from": c[1], "to": c[2]}
                    for c in changed
                    if isinstance(c, (list, tuple)) and len(c) >= 3
                ],
            }
        )

    return {"success": True, "activity": activity}


@frappe.whitelist(methods=["POST"])
def create_alumni_todo(
    custom_subject: str = "",
    description=None,
    custom_todo_type=None,
    date=None,
    allocated_to=None,
    status="Open",
) -> dict:
    """Create a personal todo for the caller using the task-manager payload."""
    user = _require_alumni_session()

    if not frappe.utils.cint(
        frappe.db.get_single_value("ToDo Settings", "allow_to_create_task")
    ):
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Task creation is disabled."), frappe.PermissionError)

    custom_subject = (custom_subject or "").strip()
    description_value = (description or "").strip()
    if not description_value:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("Description is mandatory."))
    # Rich-text editors can send blank placeholders such as <p><br></p>.
    normalized_description = html.unescape(
        __import__("re").sub(r"<[^>]+>", "", description_value)
    ).strip()
    if not normalized_description:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("Description is mandatory."))

    custom_todo_type = (custom_todo_type or "").strip()
    if not custom_todo_type:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("Todo Type is mandatory."))

    allowed = set(_alumni_visible_todo_types())
    if custom_todo_type not in allowed:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("That todo type is not available."), frappe.PermissionError)

    allocated_user = (allocated_to or user).strip() if allocated_to else user
    if allocated_user != user:
        summary = _get_alumni_todo_delegation_summary(user)
        if allocated_user not in set(summary.get("allowed_delegates") or []):
            frappe.local.response["http_status_code"] = 403
            frappe.throw(_("That assignee is not available."), frappe.PermissionError)

    doc = frappe.get_doc(
        {
            "doctype": "ToDo",
            "custom_subject": custom_subject,
            "description": description_value,
            "custom_todo_type": custom_todo_type,
            "allocated_to": allocated_user,
            "assigned_by": user,
            "status": "Open",
            "date": date or None,
        }
    )
    doc.flags.notifications = _loadable_todo_notifications()
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "todo": frappe.db.get_value("ToDo", doc.name, _existing_todo_fields(), as_dict=True),
    }


# ── Alumni Todo list / types / actions ───────────────────────────────────────
# Ported from 84a537d4: dev-microapps never received this work, so the portal
# was calling endpoints that did not exist on this branch.


# ── Alumni Todo: Todo Type visibility gate ───────────────────────────────────
# `Todo Type.custom_show_in_alumni_portal` decides which categories the Alumni
# Portal may see. Enforcement lives here, not in the frontend: the portal used
# to call cn_todo_manager's `get_todo_list` directly, and anything the client
# passes it can equally be left out.
#
# Opt-in: a type is invisible until ticked, so a Todo Type added by another team
# cannot leak into the portal by default. Todos with no type ("Uncategorized")
# have no flag to tick and are therefore not shown.

ALUMNI_TODO_TYPE_FLAG = "custom_show_in_alumni_portal"


def _alumni_visible_todo_types() -> list[str]:
    """Todo Type names the Alumni Portal is allowed to show."""
    if not frappe.db.has_column("Todo Type", ALUMNI_TODO_TYPE_FLAG):
        return []
    return frappe.get_all("Todo Type", filters={ALUMNI_TODO_TYPE_FLAG: 1}, pluck="name")


def _get_alumni_todo_delegation_summary(user: str) -> dict:
    """Task-manager policy summary, narrowed to Alumni Portal categories/users."""
    from cn_todo_manager.chatnext_todo_manager.doctype.delegation_policy.delegation_policy import (
        get_user_delegation_summary,
    )

    result = get_user_delegation_summary(user=user) or {}
    visible = set(_alumni_visible_todo_types())
    result["applicable_policies"] = list(result.get("applicable_policies") or [])
    result["allow_delegation_of_below_tasks"] = sorted(
        visible.intersection(result.get("allow_delegation_of_below_tasks") or [])
    )
    result["allowed_delegates"] = sorted(
        {value.strip() for value in (result.get("allowed_delegates") or [])
         if isinstance(value, str) and value.strip() and value.strip() != user}
    )
    return result


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_delegation_summary() -> dict:
    """Return only the current alumnus's delegation policy summary."""
    return _get_alumni_todo_delegation_summary(_require_alumni_session())


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_delegation_history(todo_reference: str) -> list[dict]:
    """Return delegation history only for a ToDo accessible to the alumnus."""
    _require_own_todo(todo_reference)

    from cn_todo_manager.chatnext_todo_manager.api.delegation_api import (
        get_delegation_history,
    )

    return get_delegation_history(todo_reference)


def _parse_alumni_list(value, fieldname: str) -> list:
    if value in (None, ""):
        return []
    if isinstance(value, str):
        try:
            value = frappe.parse_json(value)
        except Exception:
            frappe.throw(_("{0} must be a JSON array.").format(fieldname))
    if not isinstance(value, list):
        frappe.throw(_("{0} must be an array.").format(fieldname))
    return value


@frappe.whitelist(methods=["POST"])
def create_alumni_category_rule(rule_data) -> dict:
    """Create a policy-authorized category delegation rule for this alumnus."""
    user = _require_alumni_session()
    if isinstance(rule_data, str):
        try:
            rule_data = frappe.parse_json(rule_data)
        except Exception:
            frappe.throw(_("rule_data must be valid JSON."))
    if not isinstance(rule_data, dict):
        frappe.throw(_("rule_data must be an object."))

    rule_name = str(rule_data.get("rule_name") or "").strip()
    categories = _parse_alumni_list(rule_data.get("categories"), "categories")
    categories = list(dict.fromkeys(str(v).strip() for v in categories if str(v).strip()))
    delegated_to = str(rule_data.get("delegated_to") or "").strip()
    if not rule_name or not categories or not delegated_to:
        frappe.throw(_("Rule name, categories, and delegated user are required."))

    summary = _get_alumni_todo_delegation_summary(user)
    permitted_categories = set(summary.get("allow_delegation_of_below_tasks") or [])
    permitted_delegates = set(summary.get("allowed_delegates") or [])
    if any(category not in permitted_categories for category in categories):
        frappe.throw(_("One or more categories cannot be delegated."), frappe.PermissionError)
    if delegated_to == user or delegated_to not in permitted_delegates:
        frappe.throw(_("That delegate is not permitted."), frappe.PermissionError)

    alternative = str(rule_data.get("alternative_delegate") or "").strip()
    if alternative and (alternative == user or alternative not in permitted_delegates):
        frappe.throw(_("That alternative delegate is not permitted."), frappe.PermissionError)
    priority_filter = str(rule_data.get("priority_filter") or "").strip()
    if priority_filter not in ("", "Low", "Medium", "High"):
        frappe.throw(_("Priority filter must be Low, Medium, High, or empty."))
    try:
        priority = int(rule_data.get("priority", 1))
    except (TypeError, ValueError):
        frappe.throw(_("Priority must be a whole number."))

    permissions = _parse_alumni_list(
        rule_data.get("delegation_permissions", ["view", "edit", "complete"]),
        "delegation_permissions",
    )
    if any(p not in {"view", "edit", "complete"} for p in permissions):
        frappe.throw(_("Delegation permissions contain an unsupported value."))

    effective_from = rule_data.get("effective_from") or None
    effective_to = rule_data.get("effective_to") or None
    if effective_from and effective_to:
        from frappe.utils import getdate
        if getdate(effective_from) > getdate(effective_to):
            frappe.throw(_("Effective To cannot be before Effective From."))

    doc_data = {
        "doctype": "Category Delegation Rule", "rule_name": rule_name,
        "delegated_to": delegated_to, "is_active": frappe.utils.cint(rule_data.get("is_active", 1)),
        "priority": priority, "delegation_type": rule_data.get("delegation_type") or "Direct Assignment",
        "notes": rule_data.get("notes") or "", "created_by": user,
        "delegation_permissions": frappe.as_json(permissions),
    }
    for field, value in (("effective_from", effective_from), ("effective_to", effective_to),
                         ("priority_filter", priority_filter), ("alternative_delegate", alternative)):
        if value:
            doc_data[field] = value
    rule = frappe.get_doc(doc_data)
    for category in categories:
        rule.append("categories", {"todo_type": category})
    rule.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "rule_name": rule.name, "message": _("Delegation rule created successfully.")}


def _todo_type_visible_to_alumni(todo: str) -> bool:
    """Whether this ToDo's category is exposed to the portal."""
    todo_type = frappe.db.get_value("ToDo", todo, "custom_todo_type")
    if not todo_type:
        return False
    return bool(
        frappe.db.get_value("Todo Type", todo_type, ALUMNI_TODO_TYPE_FLAG)
    )


def _user_owns_todo(user: str, name: str, row: dict) -> bool:
    """Whether ``user`` may act on ToDo ``name``.

    A ToDo can reach a user through four mechanisms, not one. Funnel-created
    ToDos in particular leave `allocated_to` NULL and assign through child
    tables — nextai's own code notes this ("users assigned via child tables
    won't pass standard checks"). Checking only `allocated_to`/`assigned_by`
    therefore rejected todos the list had just shown, giving a 403 the moment a
    user opened one.

    Membership is resolved by cn_todo_manager's OWN resolver so the detail
    endpoints and `get_todo_list` can never disagree: a user may open exactly
    what the list showed them, by construction. Nothing in cn_todo_manager is
    modified — this only calls it.

    Note this is membership, not a role grant: for a genuine alumnus (a
    role-less Website User) the role-based arms of that query match nothing, so
    it reduces to direct assignment.
    """
    # Cheap direct checks first — the common case, and no query needed.
    # `owner` is included because the Team Todo scope lists by owner
    # (`owner = user AND allocated_to != user`), i.e. work the user raised for
    # someone else. Without it, opening a row from that tab 403s.
    if user in (row.get("allocated_to"), row.get("assigned_by"), row.get("owner")):
        return True

    try:
        from cn_todo_manager.chatnext_todo_manager.api.todo_api import (
            OptimizedTodoQueryBuilder,
        )

        builder = OptimizedTodoQueryBuilder.__new__(OptimizedTodoQueryBuilder)
        builder.user = user
        return name in (builder.get_todo_names_for_users([user]) or [])
    except Exception:
        # If that resolver is unavailable or changes shape, fall back to the
        # two child-table mechanisms rather than silently granting access.
        frappe.logger("alumni_portal").warning(
            "todo ownership: cn_todo_manager resolver unavailable, using fallback"
        )

    if frappe.db.exists(
        "Nextai User Select", {"parent": name, "parenttype": "ToDo", "user": user}
    ):
        return True

    roles = [r for r in (frappe.get_roles(user) or []) if r]
    if not roles:
        return False
    if frappe.db.get_value("ToDo", name, "role") in roles:
        return True
    return bool(
        frappe.db.exists(
            "Nextai Role Select",
            {"parent": name, "parenttype": "ToDo", "role": ["in", roles]},
        )
    )


def _todo_declared_actions(todo: str) -> list[str]:
    """The action labels a ToDo itself declares, from `custom_doctype_actions`.

    Entries are plain strings or ``{label, value}`` objects, the same two shapes
    the ESS SmartActions parser accepts.
    """
    raw = frappe.db.get_value("ToDo", todo, "custom_doctype_actions")
    if not raw:
        return []
    try:
        parsed = frappe.parse_json(raw)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []

    actions = []
    for item in parsed:
        if isinstance(item, str):
            actions.append(item)
        elif isinstance(item, dict):
            value = item.get("value") or item.get("label")
            if value:
                actions.append(value)
    return actions


def _assert_todo_actionable(name: str) -> None:
    """Fail early, and specifically, when a todo cannot be actioned.

    Without this the nextai handler raises deep inside — "Funnel Task None not
    found", "Approval Log Entry not found" — and the caller only sees the
    generic wrapper message. These are configuration problems, so they deserve
    a message that says which piece is missing.
    """
    todo = frappe.db.get_value(
        "ToDo", name, ["custom_approval_type", "custom_funnel_task"], as_dict=True
    ) or {}

    if todo.get("custom_approval_type") == "Approval Matrix":
        log = frappe.db.get_value(
            "Approval Log Entry", {"todo_reference": name},
            ["name", "form_for_approval"], as_dict=True,
        )
        if not log:
            frappe.local.response["http_status_code"] = 409
            frappe.throw(
                _("This todo has no approval record, so it cannot be actioned yet.")
            )
        # The handler only needs the Funnel Task when a form has to be shown.
        if log.get("form_for_approval") and not todo.get("custom_funnel_task"):
            frappe.local.response["http_status_code"] = 409
            frappe.throw(
                _("This todo has an approval form but no linked task, so the form cannot be opened.")
            )

    if todo.get("custom_funnel_task") and not frappe.db.exists(
        "Funnel Task", todo["custom_funnel_task"]
    ):
        frappe.local.response["http_status_code"] = 409
        frappe.throw(_("The task behind this todo no longer exists."))


def _alumni_visible_stage_names(user: str, todo_id: str) -> set | None:
    """Approval stage names ``user`` may see the form for, or None if unknown.

    Stage rows and log rows are positional siblings on the Approval Tracker, so
    they are zipped by index — the same way the ESS reader indexes them.
    Returning None means "could not resolve", and the caller then leaves the
    ESS result untouched rather than hiding everything.
    """
    parent = frappe.db.get_value("Approval Log Entry", {"todo_reference": todo_id}, "parent")
    if not parent:
        return None
    try:
        tracker = frappe.get_doc("Approval Tracker", parent)
    except Exception:
        return None

    stages = tracker.get("approval_stages") or []
    logs = tracker.get("approval_logs") or []
    if not stages:
        return None

    visible = set()
    for idx, stage in enumerate(stages):
        name = stage.get("approval_name")
        if not name or idx >= len(logs):
            continue
        if _alumni_stage_is_mine(user, logs[idx].as_dict()):
            visible.add(name)
    return visible


def _alumni_stage_is_mine(user: str, log_row: dict) -> bool:
    """Whether ``user`` is an approver for this Approval Log Entry.

    Explicit `show_to_users` / `show_to_roles` win when set — they are the
    author's deliberate override. Otherwise the approver fields decide.
    """
    roles = set(frappe.get_roles(user) or [])

    def _split(value):
        return {v.strip() for v in (value or "").split(",") if v.strip()}

    show_users = _split(log_row.get("show_to_users"))
    show_roles = _split(log_row.get("show_to_roles"))
    if show_users or show_roles:
        return user in show_users or bool(roles & show_roles)

    if user in _split(log_row.get("user")) or user in _split(
        log_row.get("custom_allocated_to_users")
    ):
        return True
    return bool(
        roles & (_split(log_row.get("role")) | _split(log_row.get("custom_assigned_to_roles")))
    )


@frappe.whitelist(methods=["POST"])
def get_alumni_todo_list(**kwargs) -> dict:
    """Paginated todo list, restricted to portal-visible Todo Types.

    Delegates to cn_todo_manager's `get_todo_list` so paging, search, sorting,
    `list_view_fields` and `reference_data` all behave identically — only the
    category scope is narrowed. `todo_type_filter` is overwritten rather than
    merged, so a caller cannot widen it.
    """
    _require_alumni_session()

    allowed = _alumni_visible_todo_types()
    if not allowed:
        # Nothing is opted in yet — return an empty page rather than everything.
        return {
            "message": [],
            "total_count": 0,
            "total_pages": 0,
            "current_page": frappe.utils.cint(kwargs.get("page") or 1),
            "list_view_fields": [],
        }

    from cn_todo_manager.chatnext_todo_manager.api import todo_api

    params = {k: v for k, v in kwargs.items() if k != "cmd"}

    sort_by = str(params.get("sort_by") or "modified").strip()
    sort_order = str(params.get("sort_order") or "desc").strip().lower()
    allowed_sort_fields = {
        "modified",
        "creation",
        "date",
        "priority",
        "allocated_to",
        "assigned_by",
        "custom_subject",
        "status",
    }
    if sort_by.lower() in allowed_sort_fields:
        params["sort_by"] = sort_by.lower()
    else:
        params["sort_by"] = "modified"
    if sort_order not in {"asc", "desc"}:
        params["sort_order"] = "desc"
    else:
        params["sort_order"] = sort_order

    # A supplied category selection may narrow the server scope, never widen it.
    if params.get("todo_type_filter") not in (None, ""):
        requested = _parse_alumni_list(params["todo_type_filter"], "todo_type_filter")
        selected = [name for name in requested if name in set(allowed)]
        if not selected:
            return {"message": [], "total_count": 0, "total_pages": 0,
                    "current_page": frappe.utils.cint(params.get("page") or 1), "list_view_fields": []}
        params["todo_type_filter"] = frappe.as_json(selected)
    else:
        params["todo_type_filter"] = frappe.as_json(allowed)
    if params.get("category_filter") and params["category_filter"] not in allowed:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("That category is not available."), frappe.PermissionError)

    return todo_api.get_todo_list(**params)


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_filter_options(type: str = "My Todo") -> dict:
    """Return task filters derived only from people in the caller's task scope."""
    user = _require_alumni_session()
    if type not in ("My Todo", "Team Todo"):
        frappe.throw(_("Type must be My Todo or Team Todo."))
    visible_types = _alumni_visible_todo_types()
    rows = []
    try:
        from cn_todo_manager.chatnext_todo_manager.api.todo_api import OptimizedTodoQueryBuilder

        if visible_types:
            builder = OptimizedTodoQueryBuilder(user, type)
            builder.apply_filters(todo_type_filter=frappe.as_json(visible_types))
            rows = (builder.get_paginated_results(1, 100000, "modified", "desc") or {}).get(
                "message", []
            )
    except Exception:
        names = frappe.get_all(
            "ToDo",
            filters={"allocated_to": user, "custom_todo_type": ["in", visible_types]},
            pluck="name",
        ) if visible_types else []
        rows = (
            frappe.get_all(
                "ToDo",
                filters={"name": ["in", names]},
                fields=["allocated_to", "assigned_by", "owner"],
            )
            if names
            else []
        )
    involved = {user}
    for row in rows:
        involved.update(v for v in (row.get("allocated_to"), row.get("assigned_by"), row.get("owner")) if v)
    involved.update(_get_alumni_todo_delegation_summary(user).get("allowed_delegates") or [])
    user_rows = frappe.get_all("User", filters={"name": ["in", sorted(involved)], "enabled": 1},
                               fields=["name", "full_name"])
    users = [{"value": row.name, "label": row.full_name or row.name} for row in user_rows if row.name in involved]

    employees = frappe.get_all(
        "Employee",
        filters={"user_id": ["in", sorted(involved)]},
        fields=["name", "user_id", "company", "branch", "employment_type", "employee_name"],
    )

    company_names = sorted({row.company for row in employees if row.company})
    company_rows = (
        frappe.get_all("Company", filters={"name": ["in", company_names]}, fields=["name", "company_name"])
        if company_names
        else []
    )
    company_lookup = {row.name: row.company_name or row.name for row in company_rows}

    branch_names = sorted({row.branch for row in employees if row.branch})
    branch_rows = (
        frappe.get_all("Branch", filters={"name": ["in", branch_names]}, fields=["name", "branch"])
        if branch_names
        else []
    )
    branch_lookup = {row.name: row.branch or row.name for row in branch_rows}

    employment_type_names = sorted({row.employment_type for row in employees if row.employment_type})
    employment_type_rows = (
        frappe.get_all(
            "Employment Type",
            filters={"name": ["in", employment_type_names]},
            fields=["name", "employee_type_name"],
        )
        if employment_type_names
        else []
    )
    employment_type_lookup = {
        row.name: row.employee_type_name or row.name for row in employment_type_rows
    }

    employee_options = []
    for row in employees:
        label = row.employee_name and f"{row.employee_name.strip()} ({row.name})" or row.name
        option = {"value": row.name, "label": label}
        if row.user_id:
            option["secondary"] = row.user_id
        employee_options.append(option)

    return {
        "users": users,
        "companies": [
            {"value": company_name, "label": company_lookup.get(company_name, company_name)}
            for company_name in company_names
        ],
        "locations": [
            {"value": branch_name, "label": branch_lookup.get(branch_name, branch_name)}
            for branch_name in branch_names
        ],
        "employee_types": [
            {
                "value": employment_type_name,
                "label": employment_type_lookup.get(employment_type_name, employment_type_name),
            }
            for employment_type_name in employment_type_names
        ],
        "employees": employee_options,
        "current_employee": next((row.name for row in employees if row.user_id == user), None),
    }


@frappe.whitelist(methods=["POST"])
def get_alumni_todo_categories(type: str = "My Todo") -> dict:
    """Sidebar categories, narrowed to the portal-visible Todo Types."""
    _require_alumni_session()

    allowed = set(_alumni_visible_todo_types())
    if not allowed:
        return {"message": []}

    from cn_todo_manager.chatnext_todo_manager.api import todo_api

    result = todo_api.get_todo_categories(type=type) or {}
    rows = result.get("message") or []
    return {"message": [r for r in rows if r.get("name") in allowed]}


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_types() -> dict:
    """The Todo Types visible in the portal, for the UI to reason about."""
    _require_alumni_session()
    return {"success": True, "todo_types": _alumni_visible_todo_types()}


@frappe.whitelist(methods=["GET", "POST"])
def get_alumni_todo_form(name: str) -> dict:
    """The form configured for this todo's category, as a form.io schema.

    Read from `Todo Type.custom_alumni_form`. The ChatNext form is resolved from
    the Funnel node instead, which the portal cannot reach — this is the portal's
    own, directly renderable equivalent.

    Returns `form: None` when the category has no form configured, which the UI
    treats as "no form", not as an error.
    """
    _require_own_todo(name)

    todo_type = frappe.db.get_value("ToDo", name, "custom_todo_type")
    widget = (
        frappe.db.get_value("Todo Type", todo_type, "custom_alumni_form")
        if todo_type
        else None
    )
    if not widget:
        return {"success": True, "form": None}

    row = frappe.db.get_value(
        "Microapp Form Widget", widget, ["name", "label", "custom_form_data"], as_dict=True
    ) or {}

    schema = None
    raw = row.get("custom_form_data")
    if raw:
        try:
            schema = frappe.parse_json(raw) if isinstance(raw, str) else raw
        except Exception:
            frappe.logger("alumni_portal").warning(
                f"Todo form {widget!r} has unparseable custom_form_data"
            )

    return {
        "success": True,
        "form": {
            "widget": row.get("name"),
            "label": row.get("label") or row.get("name"),
            "schema": schema,
        },
    }


@frappe.whitelist(methods=["POST"])
def get_alumni_todo_activity_forms(todo_id: str) -> dict:
    """Initiator / workflow / approval forms recorded against one of the
    caller's own todos.

    ESS reference: `cn_hrms_core…funnel_activity.get_forms_by_todo`.

    That function is NOT exposed to alumni directly, for two reasons:

      * it performs no ownership check — any todo_id returns its forms;
      * it accepts a `session_user` argument and filters on
        ``session_user or frappe.session.user``, so a caller can ask for the
        view of a different user.

    This wrapper checks ownership first (which also applies the Todo Type
    portal gate) and calls through WITHOUT `session_user`, so the result is
    always resolved against the real session. Nothing in cn_hrms_core changes.
    """
    _require_own_todo(todo_id)

    try:
        from cn_hrms_core.cn_hrms_core.apis.funnel_activity import get_forms_by_todo

        # session_user deliberately omitted — never let the caller pick an identity.
        result = get_forms_by_todo(todo_id=todo_id)
    except Exception:
        frappe.logger("alumni_portal").warning(
            f"todo activity forms failed for {todo_id}"
        )
        frappe.log_error(
            frappe.get_traceback(), f"Alumni todo activity forms failed: {todo_id}"
        )
        frappe.local.response["http_status_code"] = 500
        frappe.throw(_("Could not load the forms for this todo."))

    data = (result or {}).get("data") or {}
    approval_stages = data.get("approval_stages") or []

    # ESS returns every stage's form to everyone: its `can_view_form` check only
    # bites when show_to_users/show_to_roles are set, and in practice they almost
    # never are (3 of 887 rows on this site). In the portal one signed-in user
    # would therefore see the HRBP form AND the final-approver form. Narrow it to
    # the stages this user is actually an approver for.
    caller = frappe.session.user
    visible = _alumni_visible_stage_names(caller, todo_id)
    if visible is not None:
        approval_stages = [
            s for s in approval_stages if s.get("stage_name") in visible
        ]

    return {
        "success": True,
        "initiator_forms": data.get("initiator_forms") or [],
        "workflow_stages": data.get("workflow_stages") or [],
        "approval_stages": approval_stages,
    }


@frappe.whitelist(methods=["POST"])
def submit_alumni_todo_action(name: str, action: str) -> dict:
    """Run a workflow action on one of the caller's own ToDos.

    Returns the ChatNext ``session`` when the ToDo is configured to open the
    assistant, so the portal can hand it to `trigger_chatnext_assistant` exactly
    as ESS does. ``session`` is None when no assistant step is configured — the
    action still runs.
    """
    _require_own_todo(name)

    action = (action or "").strip()
    if not action:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("An action is required."))

    # The ToDo's own declared actions are the allowlist — an alumnus cannot
    # invent an option the workflow never offered them.
    allowed = _todo_declared_actions(name)
    if not allowed:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("This todo has no actions."))
    if action not in allowed:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("That action is not available on this todo."), frappe.PermissionError)

    if frappe.db.get_value("ToDo", name, "status") == "Closed":
        frappe.local.response["http_status_code"] = 409
        frappe.throw(_("This todo is already closed."))

    _assert_todo_actionable(name)

    # `select_event_from_options` reassigns frappe.session.user via
    # set_funnel_user(). Capture and restore it so the rest of the request — and
    # anything the portal does next — still runs as the alumnus.
    original_user = frappe.session.user
    try:
        from nextai.funnel.doctype.funnel_task.awaiting_actions import (
            chatnext_assistant_multi_actions as multi_actions,
        )

        result = multi_actions.select_event_from_options(
            selected_option=action,
            data=frappe.as_json({"name": name}),
        )
    except Exception as exc:
        frappe.set_user(original_user)
        frappe.logger("alumni_portal").warning(
            f"Alumni todo action failed: todo={name} action={action}"
        )
        frappe.log_error(
            frappe.get_traceback(), f"Alumni todo action failed: {name} / {action}"
        )
        frappe.local.response["http_status_code"] = 500
        # Carry the underlying reason through. Flattening every failure to one
        # string hid "Funnel Task None not found" behind "Could not complete
        # that action", which is unactionable for whoever has to fix it.
        reason = str(exc).strip()
        frappe.throw(
            _("Could not complete that action: {0}").format(reason)
            if reason
            else _("Could not complete that action.")
        )
    finally:
        frappe.set_user(original_user)

    session = (result or {}).get("session") if isinstance(result, dict) else None

    return {
        "success": True,
        "action": action,
        # Mirrors the ESS trigger condition so the portal can decide whether to
        # open the assistant without re-reading the ToDo.
        "session": session,
        "open_assistant": bool(
            session
            and frappe.db.get_value("ToDo", name, "custom_open_chatnext_assistant_on_action")
        ),
        "todo": frappe.db.get_value(
            "ToDo", name, ["name", "status", "custom_approval_type"], as_dict=True
        ),
    }


# ── Alumni Workplace Feed ────────────────────────────────────────────────────
# Work Connect's `post.get_feed` returns no per-viewer state: neither `is_saved`
# nor `user_reaction` (its `get_post` returns `user_reaction`, but not
# `is_saved` either). The portal therefore painted every bookmark empty and
# every like un-liked until the user interacted, and a Save on an
# already-saved post came back as "Post already saved" — an error for something
# the user had already achieved.
#
# Fixed here rather than in `post.get_feed`, which ESS shares: this wrapper
# delegates to it unchanged and enriches the rows on the way out. Two batched
# queries, not one per post.

_FEED_ENRICH_BATCH = 200


def _feed_viewer_state(user: str, post_ids: list[str]) -> tuple[set, dict]:
    """(saved post ids, {post id: reaction type}) for one viewer."""
    if not post_ids:
        return set(), {}

    saved = set(
        frappe.get_all(
            "Saved Post",
            filters={"user": user, "post": ["in", post_ids]},
            pluck="post",
        )
        or []
    )
    reactions = {
        r["post"]: r["reaction_type"]
        for r in frappe.get_all(
            "Post Reaction",
            filters={"user": user, "post": ["in", post_ids]},
            fields=["post", "reaction_type"],
        )
        or []
    }
    return saved, reactions


@frappe.whitelist(methods=["POST"])
def get_alumni_feed(**kwargs) -> dict:
    """The workplace feed, with this viewer's saved/reaction state attached.

    Same arguments and same envelope as
    `chatnext_work_connect…post.get_feed` — only `is_saved` and
    `user_reaction` are added to each post, so the portal can paint bookmarks
    and like icons correctly on first render.
    """
    user = _require_alumni_session()

    from chatnext_work_connect.chatnext_work_connect.api import post as post_api

    params = {k: v for k, v in kwargs.items() if k not in ("cmd", "sid")}
    result = post_api.get_feed(**params) or {}

    data = result.get("data") or {}
    posts = data.get("posts") or []

    ids = [p.get("id") or p.get("name") for p in posts]
    ids = [i for i in ids if i][:_FEED_ENRICH_BATCH]
    saved, reactions = _feed_viewer_state(user, ids)

    for p in posts:
        pid = p.get("id") or p.get("name")
        p["is_saved"] = pid in saved
        p["user_reaction"] = reactions.get(pid)

    return result


# ── Post creation ─────────────────────────────────────────────────────────────
#
# The ESS composer uploads to /api/method/upload_file, then POSTs the resulting
# file_url to `post.create_post`. Neither half of that works unmodified here:
#
#   1. `upload_file` is not in the alumni allowlist, so step 1 returns 403.
#   2. `create_post` accepts a caller-supplied `visibility` and takes
#      `attachments[].file` verbatim, with no check that the caller owns the
#      file. For an ESS user that is fine -- they can enumerate groups, users
#      and departments anyway. For an alumnus it is not: it would let them
#      target internal audiences by id, and attach ANY file_url on the site --
#      including private HR documents -- to a Public post.
#
# So the portal gets its own pair of endpoints. They delegate the actual write
# to `post.create_post` (no fork of the doc-building logic), but normalise the
# payload first. `chatnext_work_connect` is not modified.

# Posts render to other viewers, so their attachments are public, unlike the
# private todo/referral uploads above.
_POST_UPLOAD_EXTS = {
    "jpg": "Image",
    "jpeg": "Image",
    "png": "Image",
    "gif": "Image",
    "webp": "Image",
    "mp4": "Video",
    "webm": "Video",
    "pdf": "Document",
}
_POST_UPLOAD_MAX_BYTES = 10 * 1024 * 1024  # 10 MB

# Visibilities an alumnus may publish to. The four that are excluded --
# Team, Group, Custom, User Assignment -- all target an internal audience
# (a department, a Work Connect group, named employees). The guard already
# blocks group.* and user.*, so the portal cannot even enumerate those; not
# accepting them here is what stops an alumnus reaching one by guessing an id.
_ALUMNI_POST_VISIBILITY = {"Public", "Private"}
_ALUMNI_POST_TYPES = {"Text", "Image", "Video", "Poll"}

_POLL_MIN_OPTIONS = 2
_POLL_MAX_OPTIONS = 10
_POLL_OPTION_MAX_LEN = 140
_POST_CONTENT_MAX_LEN = 5000


@frappe.whitelist(methods=["POST"])
def upload_alumni_post_attachment() -> dict:
    """Upload one image/video/PDF for a post (multipart/form-data, field ``file``).

    Stored **public** -- unlike the todo and referral uploads, a post attachment
    has to be readable by everyone the post reaches.

    Returns ``{success, file_url, file_type, file_size, file_name}``; drop
    ``file_url``/``file_type``/``file_size`` straight into the ``attachments``
    list of :func:`create_alumni_post`.
    """
    _require_alumni_session()

    uploaded = None
    if getattr(frappe, "request", None) and getattr(frappe.request, "files", None):
        uploaded = frappe.request.files.get("file") or frappe.request.files.get("attachment")
    if not uploaded:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("A file is required.")}

    filename = uploaded.filename or "attachment"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    file_type = _POST_UPLOAD_EXTS.get(ext)
    if not file_type:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("Unsupported file type. Allowed: JPG, PNG, GIF, WEBP, MP4, WEBM, PDF."),
        }

    content = uploaded.stream.read()
    size = len(content or b"")
    if not size:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("The uploaded file is empty.")}
    if size > _POST_UPLOAD_MAX_BYTES:
        frappe.local.response["http_status_code"] = 400
        return {
            "success": False,
            "message": _("File is too large. Maximum size is {0} MB.").format(
                _POST_UPLOAD_MAX_BYTES // (1024 * 1024)
            ),
        }

    from frappe.utils.file_manager import save_file

    # Unattached (dt/dn None): the Post does not exist yet -- create_alumni_post
    # runs after this and references the file by url. Naming the doctype without
    # a name fails File.validate_attachment_references. This mirrors what the
    # ESS composer gets from /api/method/upload_file, which also uploads first.
    saved = save_file(filename, content, None, None, is_private=0)
    frappe.db.commit()

    return {
        "success": True,
        "file_url": saved.file_url,
        "file_name": saved.file_name,
        "file_size": saved.file_size,
        "file_type": file_type,
    }


def _alumni_owned_file(file_url: str, user: str) -> bool:
    """True if `file_url` is a public File this user uploaded.

    Guards the hole in `create_post`, which trusts `attachments[].file`
    blindly. Without this an alumnus could publish someone else's private
    document by quoting its url.
    """
    from frappe.utils import cint

    if not file_url:
        return False
    row = frappe.db.get_value(
        "File", {"file_url": file_url}, ["owner", "is_private"], as_dict=True
    )
    if not row:
        return False
    return row.owner == user and not cint(row.is_private)


def _clean_poll_options(raw) -> list[str]:
    """Validated, de-duplicated poll option texts."""
    from frappe.utils import strip_html

    options, seen = [], set()
    for option in raw or []:
        text = strip_html(str(option or "")).strip()[:_POLL_OPTION_MAX_LEN]
        if not text or text.lower() in seen:
            continue
        seen.add(text.lower())
        options.append(text)

    if len(options) < _POLL_MIN_OPTIONS:
        frappe.throw(
            _("A poll needs at least {0} distinct options.").format(_POLL_MIN_OPTIONS)
        )
    return options[:_POLL_MAX_OPTIONS]


@frappe.whitelist(methods=["POST"])
def create_alumni_post(data=None, **kwargs) -> dict:
    """Publish a post as the signed-in alumnus.

    Accepts the ESS ``CreatePostData`` shape (dict or JSON string) so the
    portal composer can reuse it, but only the fields an alumnus may set are
    forwarded. Everything else is dropped rather than rejected, so a composer
    that sends the full ESS payload still works:

    ==========================  =========================================
    ``post_type``               Text | Image | Video | Poll
    ``content``                 sanitised, {max} chars
    ``visibility``              Public (default) or Private
    ``attachments``             only files this user uploaded, public ones
    ``poll_options``            2-10 distinct plain-text options
    ==========================  =========================================

    Dropped: ``visibility_groups``/``users``/``assignments`` and
    ``target_department`` (internal audiences), ``tags``, ``scheduled_at``
    (alumni posts publish immediately), and every ``celebration_*`` field --
    ``banner_html`` in particular is stored and re-served as raw HTML, which
    would be stored XSS if it came from a portal user.

    Returns `post.create_post`'s envelope, with ``is_saved``/``user_reaction``
    added so the new row matches what :func:`get_alumni_feed` returns.
    """
    import json

    from frappe.utils import strip_html
    from frappe.utils.html_utils import sanitize_html

    user = _require_alumni_session()

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (TypeError, ValueError):
            frappe.throw(_("Malformed post data."))
    if not isinstance(data, dict):
        # Portals that post the fields flat rather than under `data`.
        data = {k: v for k, v in kwargs.items() if k not in ("cmd", "sid")}

    post_type = (data.get("post_type") or "Text").strip()
    if post_type not in _ALUMNI_POST_TYPES:
        frappe.throw(
            _("Posts of type {0} cannot be created from the Alumni Portal.").format(post_type)
        )

    visibility = (data.get("visibility") or "Public").strip()
    if visibility not in _ALUMNI_POST_VISIBILITY:
        frappe.throw(
            _("Alumni posts can only be Public or Private."), frappe.PermissionError
        )

    content = sanitize_html(str(data.get("content") or "").strip())[:_POST_CONTENT_MAX_LEN]

    attachments = []
    for attachment in data.get("attachments") or []:
        if not isinstance(attachment, dict):
            continue
        file_url = (attachment.get("file") or "").strip()
        if not _alumni_owned_file(file_url, user):
            frappe.throw(
                _("You can only attach files you uploaded yourself."),
                frappe.PermissionError,
            )
        attachments.append(
            {
                "file": file_url,
                "file_type": attachment.get("file_type") or "Other",
                "file_size": attachment.get("file_size"),
                "description": strip_html(str(attachment.get("description") or ""))[:200]
                or None,
            }
        )

    poll_options = _clean_poll_options(data.get("poll_options")) if post_type == "Poll" else []

    if not content and not attachments and not poll_options:
        frappe.throw(_("A post needs some content."))

    payload = {
        "post_type": post_type,
        "content": content,
        "visibility": visibility,
        "attachments": attachments,
        "allow_comments": 1 if data.get("allow_comments", True) else 0,
        "allow_reactions": 1 if data.get("allow_reactions", True) else 0,
    }
    if poll_options:
        payload["poll_options"] = poll_options

    from chatnext_work_connect.chatnext_work_connect.api import post as post_api
    from chatnext_work_connect.chatnext_work_connect.api.work_connect_settings import (
        can_create_content,
    )

    # Pre-flight the same gate create_post applies, purely to control how a
    # refusal surfaces. create_post raises PermissionError -> HTTP 403, and the
    # portal turns *any* 403 from this namespace into "Work Connect is not
    # available for this account" -- which is wrong and unactionable when the
    # real cause is an admin content-control setting (e.g. polls_allowed_for =
    # "Only Group Admins", which no alumnus can satisfy: alumni belong to no
    # groups). Raising a plain ValidationError instead keeps the specific
    # message intact for the composer.
    #
    # This does not weaken anything -- create_post still runs the same check
    # itself immediately after.
    allowed, reason = can_create_content(
        "polls" if post_type == "Poll" else "posts", surface="feed", user=user
    )
    if not allowed:
        frappe.throw(_(reason) if reason else _("You are not allowed to post."))

    # create_post runs require_work_connect_access() and can_create_content()
    # itself, so the admin-configured "who may post" rules still apply here.
    result = post_api.create_post(payload) or {}

    created = (result.get("data") or {}).get("post") or {}
    pid = created.get("id") or created.get("name")
    if pid:
        saved, reactions = _feed_viewer_state(user, [pid])
        created["is_saved"] = pid in saved
        created["user_reaction"] = reactions.get(pid)

    return result


# ── Editing and deleting ──────────────────────────────────────────────────────
#
# `post.update_post` and `post.delete_post` are not on the alumni allowlist, for
# the same reason `create_post` is not: update_post takes a caller-supplied
# `visibility` together with `visibility_groups` / `visibility_users` /
# `visibility_assignments`, so reaching it directly would let an alumnus publish
# a Public post and then retarget it at an internal group by id -- the exact
# hole `create_alumni_post` exists to close. Both go through a wrapper instead.
#
# Only posts that are Public or Private *right now* may be touched. An alumnus
# is an ex-employee, so they may well be the author of Team/Group/Custom posts
# written back when they had ESS. Editing one of those from the portal would
# mean reaching an internal audience, and would drag in the group-membership
# bookkeeping `update_post` does; refusing costs nothing, because it is not a
# post the portal could have created.
#
# Poll options are deliberately NOT editable. Votes are cast against option
# rows, so rewriting them would silently reattribute tallies.


def _alumni_editable_post(post_id: str, user: str):
    """The caller's own Public/Private Post, or a throw explaining why not."""
    if not post_id:
        frappe.throw(_("A post id is required."))

    if not frappe.db.exists("Post", post_id):
        frappe.throw(_("That post no longer exists."))

    post = frappe.get_doc("Post", post_id)

    if post.author != user:
        frappe.throw(_("You can only change your own posts."), frappe.PermissionError)

    visibility = post.visibility
    if isinstance(visibility, list):
        visibility = visibility[0] if visibility else None
    if visibility not in _ALUMNI_POST_VISIBILITY:
        frappe.throw(
            _("This post is shared with an internal audience and cannot be changed from the Alumni Portal."),
            frappe.PermissionError,
        )

    return post


@frappe.whitelist(methods=["POST"])
def update_alumni_post(post_id=None, data=None, **kwargs) -> dict:
    """Edit one of the signed-in alumnus's own posts.

    Only the keys actually present in ``data`` are applied, so a caller can
    change the text without resending the attachments:

    ==========================  =========================================
    ``content``                 sanitised, {max} chars
    ``visibility``              Public or Private
    ``attachments``             replaces the list; only files this user
                                uploaded, and only public ones
    ``allow_comments``          on/off
    ``allow_reactions``         on/off
    ==========================  =========================================

    Everything else -- ``post_type``, ``poll_options``, the internal-audience
    tables, ``celebration_*`` -- is ignored.

    Returns the same envelope as :func:`create_alumni_post`, so the caller can
    swap the updated row straight into a feed it already holds.
    """
    import json

    from frappe.utils import strip_html
    from frappe.utils.html_utils import sanitize_html

    from chatnext_work_connect.chatnext_work_connect.api.permissions import (
        require_work_connect_access,
    )

    user = _require_alumni_session()

    # create_alumni_post gets this gate for free by delegating to
    # `post.create_post`; the save below is direct, so it is applied here.
    require_work_connect_access()

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (TypeError, ValueError):
            frappe.throw(_("Malformed post data."))
    if not isinstance(data, dict):
        # Portals that post the fields flat rather than under `data`.
        data = {k: v for k, v in kwargs.items() if k not in ("cmd", "sid", "post_id")}

    post_id = post_id or data.get("post_id") or data.get("name")
    post = _alumni_editable_post(post_id, user)

    if "content" in data:
        post.content = sanitize_html(str(data.get("content") or "").strip())[
            :_POST_CONTENT_MAX_LEN
        ]

    if "visibility" in data:
        visibility = (data.get("visibility") or "Public").strip()
        if visibility not in _ALUMNI_POST_VISIBILITY:
            frappe.throw(
                _("Alumni posts can only be Public or Private."), frappe.PermissionError
            )
        post.visibility = visibility

    if "attachments" in data:
        # A full replacement, not a merge -- the caller sends the list it wants
        # to end up with. Re-validated even for rows that are already on the
        # post, because the request could name any file at all.
        rows = []
        for attachment in data.get("attachments") or []:
            if not isinstance(attachment, dict):
                continue
            file_url = (attachment.get("file") or "").strip()
            if not _alumni_owned_file(file_url, user):
                frappe.throw(
                    _("You can only attach files you uploaded yourself."),
                    frappe.PermissionError,
                )
            rows.append(
                {
                    "file": file_url,
                    "file_type": attachment.get("file_type") or "Other",
                    "file_size": attachment.get("file_size"),
                    "description": strip_html(str(attachment.get("description") or ""))[:200]
                    or None,
                }
            )
        post.set("attachments", [])
        for row in rows:
            post.append("attachments", row)

        # Keep post_type describing what the post now carries, so the feed's
        # "Post Type" filter does not go on listing a picture-less Image post.
        # Polls keep their type -- their options are what defines them.
        if post.post_type in ("Text", "Image", "Video"):
            if not rows:
                post.post_type = "Text"
            else:
                post.post_type = "Video" if rows[0]["file_type"] == "Video" else "Image"

    if "allow_comments" in data:
        post.allow_comments = 1 if data.get("allow_comments") else 0

    if "allow_reactions" in data:
        post.allow_reactions = 1 if data.get("allow_reactions") else 0

    # A post stripped of everything it had would render as a blank card.
    if not post.content and not post.get("attachments") and not post.get("poll_options"):
        frappe.throw(_("A post needs some content."))

    post.save()
    frappe.db.commit()

    from chatnext_work_connect.chatnext_work_connect.api import post as post_api

    updated = post_api.serialize_post(post.name, user)
    saved, reactions = _feed_viewer_state(user, [post.name])
    updated["is_saved"] = post.name in saved
    updated["user_reaction"] = reactions.get(post.name)

    return {"data": {"post": updated, "message": _("Post updated successfully")}}


@frappe.whitelist(methods=["POST"])
def delete_alumni_post(post_id=None, **kwargs) -> dict:
    """Delete one of the signed-in alumnus's own posts.

    Authorship is checked here and again by `post.delete_post`, which is what
    actually removes the row -- so the group-membership counts it maintains stay
    correct even though the portal cannot create a Group post itself.
    """
    user = _require_alumni_session()

    post_id = post_id or kwargs.get("name")
    post = _alumni_editable_post(post_id, user)

    from chatnext_work_connect.chatnext_work_connect.api import post as post_api

    result = post_api.delete_post(post.name) or {}
    frappe.db.commit()
    return result


@frappe.whitelist(methods=["POST"])
def get_alumni_follow_suggestions(limit: int = 10) -> dict:
    """Follow suggestions restricted to other alumni.

    Work Connect suggests by department with no alumni filter, which would put
    serving employees in front of an alumnus. This delegates to it and then
    keeps only alumni who are still enabled, preserving the
    ``{data: {suggestions: [...]}}`` shape.

    Over-fetches because the filter runs after the delegate has already applied
    its own limit; asking for `limit` alone would usually return far fewer.
    """
    from frappe.utils import cint

    from chatnext_work_connect.chatnext_work_connect.api import follow as follow_api
    from recruitment.recruitment.alumni_guard import is_alumni_user

    user = _require_alumni_session()
    want = max(cint(limit) or 10, 1)

    result = follow_api.get_follow_suggestions(limit=want * _FOLLOW_OVERFETCH) or {}
    data = result.get("data") or {}
    suggestions = data.get("suggestions") or []

    kept, seen = [], set()
    for person in suggestions:
        # Each suggestion is {"user": {...}, "reason": ...} -- the id lives on
        # the nested user object, NOT at the top level.
        who = person.get("user") or person
        user_id = who.get("id") or who.get("user_id") or who.get("email")
        if not user_id or user_id in seen or not is_alumni_user(user_id):
            continue
        seen.add(user_id)
        kept.append(person)
        if len(kept) >= want:
            break

    # Top up directly from the alumni population when the delegate cannot fill
    # the list. It suggests by shared department and mutual follows, neither of
    # which describes alumni: an alumnus is usually the last person left in
    # their department, so that strategy returns nothing to filter. Without this
    # the panel is empty for almost everyone.
    if len(kept) < want:
        kept.extend(_alumni_suggestion_fallback(user, want - len(kept), seen))

    data["suggestions"] = kept
    result["data"] = data
    return result


def _alumni_suggestion_fallback(user: str, need: int, seen: set) -> list[dict]:
    """Other alumni to follow, in the delegate's payload shape.

    Excludes the viewer, anyone already suggested, and anyone they already
    follow. Emits the same ``{"user": {...}, "reason": ...}`` structure the
    delegate produces so the portal renders both sources identically.
    """
    if need <= 0:
        return []

    already = set(
        frappe.get_all("User Follow", filters={"follower": user}, pluck="following") or []
    )
    exclude = seen | already | {user}

    candidates = frappe.get_all(
        "User",
        filters={"custom_is_alumni_employee": 1, "enabled": 1, "name": ["not in", list(exclude)]},
        fields=["name", "full_name", "user_image"],
        order_by="full_name asc",
        limit_page_length=need,
    ) or []

    out = []
    for row in candidates:
        employee = frappe.db.get_value(
            "Employee", {"user_id": row.name}, ["designation", "department"], as_dict=True
        ) or frappe._dict()
        out.append(
            {
                "user": {
                    "id": row.name,
                    "name": row.full_name or row.name,
                    "full_name": row.full_name or row.name,
                    "image": row.user_image,
                    "email": row.name,
                    "job_title": _resolve_link_title("Employee", "designation", employee.designation or ""),
                    "designation": _resolve_link_title("Employee", "designation", employee.designation or ""),
                    "department": _resolve_link_title("Employee", "department", employee.department or ""),
                },
                "reason": _("Alumni"),
            }
        )
    return out


#: Follow suggestions are filtered after the delegate applies its own limit, so
#: ask it for more than we need. 5x keeps one round-trip enough in practice.
_FOLLOW_OVERFETCH = 5


@frappe.whitelist(methods=["POST"])
def get_alumni_celebrations(days: int = 30, days_in_advance: int = None) -> dict:
    """Birthdays and work anniversaries, restricted to fellow alumni.

    Work Connect's `celebrations.get_upcoming_celebrations` covers the whole
    workforce; an alumnus should see other alumni, not serving staff. This
    delegates to it and keeps only rows whose user is an alumnus, preserving the
    ``{data: {celebrations, birthdays, work_anniversaries, total}}`` envelope and
    the ascending `days_until` order the delegate already applied.

    Both arguments are passed through unchanged, including the legacy
    ``days_in_advance`` alias, which wins over ``days`` in the delegate.
    """
    from chatnext_work_connect.chatnext_work_connect.api import celebrations as celebrations_api
    from recruitment.recruitment.alumni_guard import is_alumni_user

    _require_alumni_session()

    result = celebrations_api.get_upcoming_celebrations(
        days=days, days_in_advance=days_in_advance
    ) or {}
    data = result.get("data") or {}

    def _mine(rows):
        kept = []
        for row in rows or []:
            user_id = row.get("user_id")
            if user_id and is_alumni_user(user_id):
                kept.append(row)
        return kept

    # The delegate caps `celebrations` at 30 but leaves the split arrays
    # uncapped, so filter each independently rather than deriving one from
    # another -- a merged row dropped by that cap would otherwise vanish twice.
    data["celebrations"] = _mine(data.get("celebrations"))
    data["birthdays"] = _mine(data.get("birthdays"))
    data["work_anniversaries"] = _mine(data.get("work_anniversaries"))
    data["total"] = len(data["celebrations"])

    result["data"] = data
    return result
