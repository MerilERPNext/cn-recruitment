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

# Individual methods that live OUTSIDE the alumni namespaces but which the Alumni
# Portal legitimately calls.
#
# Listed one method at a time rather than by namespace prefix on purpose: adding
# a function to one of these modules must never silently widen what an alumni
# session can reach. Every entry below is session-scoped — it reads or writes
# only the calling user's own data.
_ALUMNI_METHOD_ALLOWLIST = {
    # Alumni access requests. Both are `allow_guest`, and the portal calls them
    # before sign-in, but an already-approved alumnus polls their own request
    # status from inside the portal — which is an alumni session, hence blocked
    # without this.
    "recruitment.api.alumni_request.create_alumni_employee_request",
    "recruitment.api.alumni_request.get_alumni_request_status",
    # Alumni Todo manager. Work for an alumnus is raised against the alumni User
    # through the normal Manager + Workflow flow; assignments that already
    # belonged to the company account are deliberately left there. All three
    # filter on frappe.session.user.
    "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_list",
    "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_categories",
    "cn_todo_manager.chatnext_todo_manager.api.todo_api.show_team_todos",
    # ── Workplace Feed (Work Connect) ────────────────────────────────────────
    # READ-ONLY methods behind the portal's Feed screen. Each one already scopes
    # to frappe.session.user and runs Work Connect's own
    # `require_work_connect_access()` gate, which an alumnus passes — the guard
    # was the only thing refusing them, which is why the UI reported "no access
    # to Work Connect" when the backend was in fact fine.
    #
    # Writes are deliberately absent: create/update/delete post, add/remove
    # reaction, add comment, follow/unfollow, save/unsave, and everything under
    # group.* and user.* (the employee directory). An alumnus reads the feed;
    # they do not post to it or browse internal teams. Add those consciously,
    # one at a time, if the business rule changes.
    "chatnext_work_connect.chatnext_work_connect.api.post.get_feed",
    "chatnext_work_connect.chatnext_work_connect.api.post.get_post",
    "chatnext_work_connect.chatnext_work_connect.api.comment.get_comments",
    "chatnext_work_connect.chatnext_work_connect.api.reaction.get_reactions",
    "chatnext_work_connect.chatnext_work_connect.api.saved_post.get_saved_posts",
    "chatnext_work_connect.chatnext_work_connect.api.saved_post.is_post_saved",
    "chatnext_work_connect.chatnext_work_connect.api.follow.get_follow_suggestions",
    "chatnext_work_connect.chatnext_work_connect.api.follow.get_followers",
    "chatnext_work_connect.chatnext_work_connect.api.follow.get_following",
    "chatnext_work_connect.chatnext_work_connect.api.celebrations.get_upcoming_celebrations",
    "chatnext_work_connect.chatnext_work_connect.api.announcement.get_announcements",
    "chatnext_work_connect.chatnext_work_connect.api.announcement.get_announcement_details",
    "chatnext_work_connect.chatnext_work_connect.api.event.get_upcoming_events",
    "chatnext_work_connect.chatnext_work_connect.api.event.get_event_details",
    "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_top_winners",
    "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_award_winners",
    "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_award_winner_list",
    "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings.get_app_identity",
    "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings.get_content_control_settings",
    "chatnext_work_connect.chatnext_work_connect.api.notification.get_notifications",
    "chatnext_work_connect.chatnext_work_connect.api.notification.get_unread_count",
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

        result = bool(frappe.db.get_value("User", user, "custom_is_alumni_employee")) or (
            frappe.db.get_value("Employee", {"user_id": user}, "status") == "Left"
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
    return command in _ALUMNI_GLOBAL_ALLOWLIST or command in _ALUMNI_METHOD_ALLOWLIST


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

    # Blocked. If the alumnus just authenticated through the ESS login, kill the
    # session that init_request() created so no usable ESS session lingers.
    is_login = kind == "method" and command == "login"
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
