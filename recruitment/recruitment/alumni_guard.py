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
  A blocked **API/RPC call** (``/api/method/*``, ``/api/resource/*``) gets a
  **403** with a clear message. A blocked **plain page load** (Desk, the ESS
  shell, or anything else that isn't an API call) instead logs the session out
  and falls through as Guest, so the page's own existing guest-redirect
  (``frappe.www.app`` / ``recruitment.www.webapp``) sends it to ``/login``
  instead of rendering a dead-end 403 page — this is what actually happens
  right after an admin impersonates an alumni user and the page reloads.
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
    # Separation/Confirmation history (read-only) + the self-contained staged
    # Alumni Request engine. Deliberately NOT `alumni_request_admin` -- those
    # are staff-only stage actions and must stay unreachable from an alumni
    # session; see that module's docstring.
    "recruitment.recruitment.alumni_separation.",
    # Pending-ToDo detection for the Separation "Act" button. Acting on the
    # ToDo itself goes through alumni_portal's own existing ToDo endpoints
    # (already in the namespace above) -- this module only detects whether
    # one exists.
    "recruitment.recruitment.alumni_todo.",
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
    # user.* (the employee directory) stays out.
    #
    # group.* USED to be excluded here on the same grounds. It is now permitted
    # -- see the group block further down, which spells out what that exposes.
    "chatnext_work_connect.chatnext_work_connect.api.post.get_feed",
    "chatnext_work_connect.chatnext_work_connect.api.post.get_post",
    "chatnext_work_connect.chatnext_work_connect.api.comment.get_comments",
    "chatnext_work_connect.chatnext_work_connect.api.reaction.get_reactions",
    "chatnext_work_connect.chatnext_work_connect.api.saved_post.get_saved_posts",
    "chatnext_work_connect.chatnext_work_connect.api.saved_post.is_post_saved",
    "chatnext_work_connect.chatnext_work_connect.api.follow.get_followers",
    "chatnext_work_connect.chatnext_work_connect.api.follow.get_following",
    # celebrations.get_upcoming_celebrations is NOT here: it covers the whole
    # workforce. The portal uses alumni_portal.get_alumni_celebrations, which
    # filters the result to fellow alumni.
    "chatnext_work_connect.chatnext_work_connect.api.announcement.get_announcements",
    "chatnext_work_connect.chatnext_work_connect.api.announcement.get_announcement_details",
    "chatnext_work_connect.chatnext_work_connect.api.event.get_upcoming_events",
    "chatnext_work_connect.chatnext_work_connect.api.event.get_event_details",
    "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings.get_app_identity",
    "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings.get_content_control_settings",
    "chatnext_work_connect.chatnext_work_connect.api.notification.get_notifications",
    "chatnext_work_connect.chatnext_work_connect.api.notification.get_unread_count",
    # ── Feed interactions (writes) ───────────────────────────────────────────
    # Comment, reaction and saved-post writes are NOT listed here any more.
    # They are switchable per site via "Alumni Portal Settings", and that switch
    # cannot be enforced inside chatnext_work_connect without editing an app ESS
    # shares. So the portal calls wrappers instead --
    #   alumni_portal.add_alumni_comment / update_alumni_comment /
    #   delete_alumni_comment / add_alumni_reaction / remove_alumni_reaction /
    #   save_alumni_post / unsave_alumni_post
    # -- which consult alumni_action_allowed() and then delegate to these very
    # functions. Re-adding the direct methods here would make that gate
    # bypassable in one call, exactly as it would for create_post.
    #
    # follow.get_follow_suggestions is likewise absent: it suggests by
    # department with no alumni filter, so the portal uses
    # alumni_portal.get_alumni_follow_suggestions, which restricts the result to
    # other alumni. follow_user / unfollow_user stay direct -- they name a
    # target the caller already chose, and carry no site-level switch.
    #
    # post.create_post is deliberately NOT here either. It accepts a
    # caller-supplied `visibility` and trusts `attachments[].file` without
    # checking who owns the file, so reaching it directly would let an alumnus
    # target an internal audience by id and attach any file_url on the site.
    # Alumni may not publish to the feed at all -- alumni_portal's own
    # create_alumni_post refuses them too, so neither route works.
    #
    # What remains below is safe for the same reason the reads are: each calls
    # require_work_connect_access() and derives the actor from
    # frappe.session.user, never from a parameter.
    #
    # Poll voting. Same bar as the reaction and comment writes:
    #   * voter comes from frappe.session.user, never a parameter;
    #   * check_post_visibility() gates it, so an alumnus can only vote on a
    #     poll they can already read — including the group-membership rule;
    #   * the option is verified to belong to THIS post (`poll_option.parent !=
    #     post_id` throws), so a valid option id from another poll is refused;
    #   * one vote per user — an existing vote is moved, never stacked.
    # It returns the refreshed counts and the caller's vote, which is what lets
    # the card reconcile against the server instead of guessing.
    "chatnext_work_connect.chatnext_work_connect.api.post.vote_poll",
    "chatnext_work_connect.chatnext_work_connect.api.follow.follow_user",
    "chatnext_work_connect.chatnext_work_connect.api.follow.unfollow_user",
    # ── Groups ───────────────────────────────────────────────────────────────
    # Deliberately enabled, and a widening of what an alumnus can see. Recorded
    # here in full because the earlier policy was the opposite -- "an alumnus
    # does not browse internal teams" -- and this reverses it by choice, not by
    # oversight:
    #
    #   * get_groups      lists Public groups plus any the caller created or
    #                     belongs to. Private groups the caller is not in are
    #                     filtered out server-side. Each row carries the group's
    #                     name, description, DEPARTMENT and project labels, and
    #                     its creator's name and picture -- i.e. an ex-employee
    #                     can see the company's public team structure.
    #   * get_group       additionally returns the MEMBER ROSTER, with each
    #                     member's job title and department read off Employee.
    #                     This is the same employee-directory data that keeping
    #                     user.* excluded is meant to withhold. It is the single
    #                     biggest disclosure in this block.
    #   * get_group_attachments
    #                     lists files posted into the group. Same guard as
    #                     get_group_posts -- Public groups are readable by
    #                     non-members, anything else needs membership. This is
    #                     the "Documents" entry on the group header.
    #   * get_group_posts returns the group's internal posts. Note the asymmetry
    #                     this creates with _ALUMNI_POST_VISIBILITY, which still
    #                     refuses to let an alumnus PUBLISH to a Team or Group
    #                     audience: they may now read one, but not target one.
    #   * join_group      self-service, no approval step. Refuses Private
    #                     groups ("you need an invitation"), so the reachable
    #                     set is exactly the Public ones.
    #   * leave_group     removes only the caller's own membership row.
    #   * create_group    creator comes from the session and no member list is
    #                     accepted, so it cannot add employees to anything. It
    #                     honours the `can_create_content("groups")` switch, so
    #                     an admin turning group creation off stops alumni too.
    #
    # To reverse this, delete these six lines: the portal degrades to an empty
    # Groups section rather than breaking, because each call surfaces a 403 as
    # "unavailable" rather than an error.
    "chatnext_work_connect.chatnext_work_connect.api.group.get_groups",
    "chatnext_work_connect.chatnext_work_connect.api.group.get_group",
    "chatnext_work_connect.chatnext_work_connect.api.group.get_group_posts",
    "chatnext_work_connect.chatnext_work_connect.api.group.get_group_attachments",
    "chatnext_work_connect.chatnext_work_connect.api.group.join_group",
    "chatnext_work_connect.chatnext_work_connect.api.group.leave_group",
    "chatnext_work_connect.chatnext_work_connect.api.group.create_group",
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

    if kind == "other":
        # A blocked plain page load -- Desk `/app/*`, the ESS `/webapp` shell,
        # or any other full navigation -- most commonly hit right after an
        # admin impersonates an alumni user and the page reloads under the
        # new identity. Throwing the framework's generic 403 website page
        # here traps the browser: `/`, `/login` and `/app` are ALL "other"
        # too, so they are blocked exactly the same way -- "Home" and any
        # further navigation just re-triggers this same block, and Desk's own
        # `session_last_route` replay can turn it into a permanent loop with
        # no way back short of clearing cookies.
        #
        # Log the alumni session out right now instead -- the same real
        # logout Frappe itself uses (ends the session, clears the sid cookie,
        # flips frappe.session.user to Guest for the rest of THIS request)
        # -- and let the request fall through rather than throwing. The
        # page's own controller then takes over exactly as it does for any
        # expired session: frappe.www.app.get_context and
        # recruitment.www.webapp.get_context both already redirect a Guest
        # straight to `/login`, so this reuses that existing, correct path
        # instead of re-implementing a redirect here.
        frappe.local.login_manager.logout()
        return

    # Blocked API/RPC call. If the alumnus just authenticated through the ESS
    # login, kill the session that init_request() created so no usable ESS
    # session lingers.
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
