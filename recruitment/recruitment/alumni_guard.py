"""Centralized Alumni Portal authorization — runs as a Frappe ``auth_hook``.

Why an ``auth_hook``
--------------------
Frappe's request lifecycle is:

    init_request()      # resolves the session user from the sid cookie, and for
                        # /api/method/login also LOGS THE USER IN here
    validate_auth()     # resolves API-key / OAuth users, then runs auth_hooks
    api.handle()        # is_whitelisted() -> runs the actual method

``auth_hooks`` therefore run **after** the user is known (cookie, API key, or
OAuth) and **before** any method executes — the one place that sees every RPC
call, every ``/api/resource/*`` call, curl/Postman/replay requests, and even the
ESS ``/api/method/login`` (already authenticated by then). So authorization is
enforced **once, centrally** — no individual API has to protect itself.

Policy
------
* An **alumni** session (``Employee.status == "Left"`` OR
  ``User.custom_is_alumni_employee``) may ONLY hit the Alumni Portal namespace
  ``recruitment.recruitment.alumni_portal.*`` (plus a tiny framework allowlist).
  Everything else — ESS RPC, ``/api/resource/*``, the desk, the standard ESS
  login — is rejected with **403**.
* **Everyone else** (current employees, admins, guests) is untouched: the hook
  returns immediately, so **ESS behaves exactly as before**.

Safety
------
* Determining "is this user an alumnus" is wrapped so any error **fails OPEN**
  (treated as NOT alumni) — a transient DB hiccup can never lock out ESS users.
* The result is memoized per request (one indexed lookup at most).
"""

from __future__ import annotations

import frappe
from frappe import _

# The namespaces an alumni session may call.
ALUMNI_NAMESPACES = (
    "recruitment.recruitment.alumni_portal.",
    "recruitment.recruitment.alumni_helpdesk.",
)

# Framework commands an alumni session may still hit (kept intentionally tiny).
_ALUMNI_GLOBAL_ALLOWLIST = {
    "logout",
    "frappe.ping",
}

_MSG_API_BLOCKED = "This API is not available for Alumni users."
_MSG_LOGIN_BLOCKED = "Alumni users can only access the Alumni Portal."


# ── Identity ──────────────────────────────────────────────────────────────────
def is_alumni_user(user: str | None = None) -> bool:
    """True if ``user`` is an alumnus: Employee.status == 'Left' OR the flag.

    Memoized per request. Fails OPEN (returns False) on any lookup error so ESS
    can never be broken by this check.
    """
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False

    # Everything is inside try/except so ANY failure fails OPEN (returns False) —
    # a transient error can never lock out ESS users.
    try:
        cache = getattr(frappe.local, "_alumni_user_cache", None)
        if cache is None:
            cache = {}
            frappe.local._alumni_user_cache = cache
        if user in cache:
            return cache[user]

        # Authoritative gate is the User flag; also honour the Employee side
        # (status == 'Left' OR the editable Employee alumni flag) in case the two
        # ever drift before sync_alumni_flag mirrors them.
        result = bool(frappe.db.get_value("User", user, "custom_is_alumni_employee"))
        if not result:
            emp_fields = ["status"]
            if frappe.db.has_column("Employee", "custom_is_alumni_employee"):
                emp_fields.append("custom_is_alumni_employee")
            emp = frappe.db.get_value(
                "Employee", {"user_id": user}, emp_fields, as_dict=True
            )
            if emp:
                result = emp.get("status") == "Left" or bool(
                    emp.get("custom_is_alumni_employee")
                )
        cache[user] = result
        return result
    except Exception:
        return False


# ── Request classification ────────────────────────────────────────────────────
def _requested_command() -> tuple[str, str]:
    """Return (kind, command) for the current request.

    kind ∈ {"method", "resource", "other"}; command is the dotted method name,
    the resource doctype, or the raw path.
    """
    req = getattr(frappe.local, "request", None)
    path = (req.path if req else "") or ""

    if path.startswith("/api/method/"):
        method = path[len("/api/method/") :].strip("/")
        return "method", method or (frappe.form_dict.get("cmd") or "")
    if path.startswith("/api/resource/"):
        return "resource", path[len("/api/resource/") :].strip("/")

    cmd = frappe.form_dict.get("cmd") if getattr(frappe, "form_dict", None) else ""
    if cmd:
        return "method", cmd
    return "other", path


def _is_allowed_for_alumni(kind: str, command: str) -> bool:
    if kind != "method":
        # /api/resource/* and any non-method request -> blocked for alumni.
        return False
    if any(command.startswith(ns) for ns in ALUMNI_NAMESPACES):
        return True
    return command in _ALUMNI_GLOBAL_ALLOWLIST


# Login/auth entry points that establish an ESS session. When an alumnus hits any
# of these, we block AND destroy the freshly-created session so no usable ESS
# session can linger (defeats cookie/session reuse across a login attempt).
_LOGIN_COMMANDS = {"login"}


def _is_login_attempt(kind: str, command: str, path: str) -> bool:
    if kind == "method" and (command in _LOGIN_COMMANDS or command.endswith(".login")):
        return True
    # Website login form POST (served outside /api/method/).
    if (path or "").rstrip("/") == "/login":
        return True
    return False


# ── The hook ──────────────────────────────────────────────────────────────────
def enforce_alumni_isolation() -> None:
    """auth_hook: confine alumni sessions to the Alumni Portal namespace."""
    # Guests and non-alumni are never touched -> ESS is completely unaffected.
    if not is_alumni_user():
        return
    # Only meaningful inside an HTTP request.
    if not getattr(frappe.local, "request", None):
        return

    kind, command = _requested_command()
    if _is_allowed_for_alumni(kind, command):
        return

    # Blocked. If the alumnus just authenticated through ANY ESS login entry point,
    # kill the session that init_request() created so no usable ESS session lingers.
    req = getattr(frappe.local, "request", None)
    path = (getattr(req, "path", "") if req else "") or ""
    is_login = _is_login_attempt(kind, command, path)
    if is_login:
        _kill_current_session()

    frappe.local.response["http_status_code"] = 403
    frappe.throw(
        _(_MSG_LOGIN_BLOCKED if is_login else _MSG_API_BLOCKED),
        frappe.PermissionError,
    )


def _kill_current_session() -> None:
    try:
        sid = getattr(frappe.session, "sid", None)
        if sid and sid not in ("", "Guest"):
            from frappe.sessions import delete_session

            delete_session(sid, user=frappe.session.user, reason="Alumni blocked from ESS login")
    except Exception:
        pass
