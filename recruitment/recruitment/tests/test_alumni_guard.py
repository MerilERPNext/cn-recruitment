"""Unit tests for the centralized Alumni Portal guard (recruitment.alumni_guard).

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_alumni_guard
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import alumni_guard as g

ALUMNI = "guard.alumni@test.local"
ESS = "guard.ess@test.local"


def _make_user(email: str, is_alumni: bool) -> str:
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, force=True, ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "Guard",
            "enabled": 1,
            "send_welcome_email": 0,
            "custom_is_alumni_employee": 1 if is_alumni else 0,
        }
    ).insert(ignore_permissions=True)
    return email


class TestAlumniGuard(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        _make_user(ALUMNI, True)
        _make_user(ESS, False)
        frappe.db.commit()

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.local._alumni_user_cache = {}

    # ── identity ──
    def test_is_alumni_user(self):
        self.assertTrue(g.is_alumni_user(ALUMNI))
        self.assertFalse(g.is_alumni_user(ESS))
        self.assertFalse(g.is_alumni_user("Guest"))
        self.assertFalse(g.is_alumni_user(None))

    # ── allowlist logic (pure) ──
    def test_allowlist(self):
        allow = g._is_allowed_for_alumni
        self.assertTrue(allow("method", "recruitment.recruitment.alumni_portal.get_profile"))
        self.assertTrue(allow("method", "recruitment.recruitment.alumni_portal.portal_login"))
        self.assertTrue(allow("method", "logout"))
        self.assertFalse(allow("method", "frappe.client.get_list"))
        self.assertFalse(allow("method", "hrms.api.get_salary_slip"))
        self.assertFalse(allow("method", "login"))            # ESS login is blocked
        self.assertFalse(allow("resource", "Employee"))       # /api/resource/* blocked
        self.assertFalse(allow("resource", "Salary Slip"))
        self.assertFalse(allow("other", "/app"))

    def test_portal_endpoints_outside_the_namespaces_are_allowed(self):
        """The Alumni Portal calls a few methods that are not in its namespaces.

        Regression guard for "This API is not available for Alumni users." — the
        portal's access-request flow and Todo manager live in other modules and
        were rejected by the hook before reaching their own permission checks.
        """
        allow = g._is_allowed_for_alumni
        for method in (
            "recruitment.api.alumni_request.create_alumni_employee_request",
            "recruitment.api.alumni_request.get_alumni_request_status",
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_list",
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_categories",
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.show_team_todos",
        ):
            self.assertTrue(allow("method", method), f"{method} must be reachable")

    def test_the_extra_grant_is_per_method_not_per_namespace(self):
        """Siblings of the allowed methods stay blocked.

        The allowlist is deliberately method-by-method, so a new function added
        to those modules cannot silently become alumni-reachable.
        """
        allow = g._is_allowed_for_alumni
        for method in (
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_team_members",
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_type_approval_config",
            "cn_todo_manager.chatnext_todo_manager.api.delegation_api.get_pending_delegations",
            "recruitment.api.employee.get_employee",
        ):
            self.assertFalse(allow("method", method), f"{method} must stay blocked")

    def test_feed_interaction_writes_are_allowed(self):
        """The Feed's own controls must reach their endpoints.

        Every one of these is safe for the same reason the reads are: it calls
        require_work_connect_access() and takes the actor from
        frappe.session.user, never from a parameter.
        """
        allow = g._is_allowed_for_alumni
        wc = "chatnext_work_connect.chatnext_work_connect.api."
        # Comment, reaction and saved-post writes deliberately moved OFF this
        # list — they are switchable per site and now go through
        # alumni_portal wrappers (see test_alumni_feed_permissions). What stays
        # direct is what carries no site-level switch.
        for method in (
            "follow.follow_user",
            "follow.unfollow_user",
            "post.vote_poll",
        ):
            self.assertTrue(allow("method", wc + method), f"{wc + method} must be reachable")

    def test_work_connect_grant_stays_method_scoped(self):
        """Opening the writes must not open the modules they live in.

        Comment writes have no composer in the portal; group.*/user.* are the
        internal teams and employee directory, which alumni never see.

        `post.create_post` in particular must stay blocked: it trusts
        caller-supplied visibility and attachment file urls, so reaching it
        directly would bypass alumni_portal.create_alumni_post.
        """
        allow = g._is_allowed_for_alumni
        wc = "chatnext_work_connect.chatnext_work_connect.api."
        for method in (
            "post.create_post",
            "comment.add_comment",
            "comment.update_comment",
            "comment.delete_comment",
            "post.update_post",
            "post.delete_post",
            # group.* is intentionally NOT here any more — Teams & Groups was
            # opened to the portal deliberately. user.* (the employee
            # directory) remains closed.
            "user.get_users",
        ):
            self.assertFalse(allow("method", wc + method), f"{wc + method} must stay blocked")

    # ── the hook ──
    def _run(self, user: str, path: str):
        frappe.set_user(user)
        frappe.local._alumni_user_cache = {}
        frappe.local.request = type("Req", (), {"path": path})()
        frappe.local.form_dict = frappe._dict()
        g.enforce_alumni_isolation()

    def test_alumni_blocked_on_ess_rpc(self):
        with self.assertRaises(frappe.PermissionError):
            self._run(ALUMNI, "/api/method/frappe.client.get_list")

    def test_alumni_blocked_on_resource_api(self):
        with self.assertRaises(frappe.PermissionError):
            self._run(ALUMNI, "/api/resource/Salary Slip")

    def test_alumni_blocked_on_ess_login(self):
        with self.assertRaises(frappe.PermissionError):
            self._run(ALUMNI, "/api/method/login")

    def test_alumni_allowed_on_namespace(self):
        # Must NOT raise.
        self._run(ALUMNI, "/api/method/recruitment.recruitment.alumni_portal.get_alumni_context")

    def test_ess_user_never_blocked(self):
        # A current employee / ESS user is untouched even on ESS paths.
        self._run(ESS, "/api/method/frappe.client.get_list")
        self._run(ESS, "/api/resource/Employee")
        self._run(ESS, "/api/method/login")

    def test_guest_never_blocked(self):
        self._run("Guest", "/api/resource/Employee")
