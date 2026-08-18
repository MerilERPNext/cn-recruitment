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
        portal's access-request flow lives in another module and was rejected by
        the hook before reaching its own permission check.

        cn_todo_manager's `get_todo_list` / `get_todo_categories` are pointedly
        NOT here: they ignore the Todo Type portal flag, so the portal reaches
        them through alumni_portal's wrappers instead. See
        test_todo_list_goes_through_the_alumni_wrapper.
        """
        allow = g._is_allowed_for_alumni
        for method in (
            "recruitment.api.alumni_request.create_alumni_employee_request",
            "recruitment.api.alumni_request.get_alumni_request_status",
            "cn_todo_manager.chatnext_todo_manager.api.todo_api.show_team_todos",
        ):
            self.assertTrue(allow("method", method), f"{method} must be reachable")

    def test_chatnext_assistant_runtime_is_reachable(self):
        """The assistant talks to nextai from the browser once opened."""
        allow = g._is_allowed_for_alumni
        for method in (
            "nextai.get_csrf_token.get_csrf_token",
            "nextai.core_handshake.check",
            "nextai.funnel.doctype.funnel_task.assistant_api.get_assistant_messages",
            "nextai.funnel.doctype.funnel_task.triggers.chatnext_assistant_trigger.submit_form",
        ):
            self.assertTrue(allow("method", method), f"{method} must be reachable")

    def test_the_nextai_action_entrypoint_stays_blocked(self):
        """select_event_from_options performs no caller authorisation.

        It calls set_funnel_user() and reads the ToDo with ignore_permissions,
        so exposing it would let any alumnus action any ToDo by name. The portal
        must go through alumni_portal.submit_alumni_todo_action instead.
        """
        allow = g._is_allowed_for_alumni
        self.assertFalse(
            allow(
                "method",
                "nextai.funnel.doctype.funnel_task.awaiting_actions"
                ".chatnext_assistant_multi_actions.select_event_from_options",
            ),
            "the unauthenticated nextai action endpoint must stay blocked",
        )
        self.assertTrue(
            allow("method", "recruitment.recruitment.alumni_portal.submit_alumni_todo_action"),
            "the ownership-checked wrapper must be reachable",
        )

    def test_todo_ownership_matches_what_the_list_shows(self):
        """Anything get_todo_list returns must also open.

        Funnel-created ToDos leave `allocated_to` NULL and assign through the
        Nextai User/Role Select child tables, so a check on allocated_to alone
        rejected rows the list had just shown — a 403 on opening any of them.
        """
        from recruitment.recruitment import alumni_portal as ap

        user = frappe.session.user
        row = {"allocated_to": None, "assigned_by": None, "owner": user}
        self.assertTrue(
            ap._user_owns_todo(user, "irrelevant", row),
            "the Team Todo scope lists by owner, so owner must count",
        )
        for field in ("allocated_to", "assigned_by"):
            self.assertTrue(
                ap._user_owns_todo(user, "irrelevant", {field: user}),
                f"{field} must count as ownership",
            )
        self.assertFalse(
            ap._user_owns_todo(
                user,
                "definitely-not-a-real-todo",
                {"allocated_to": "someone.else@example.com",
                 "assigned_by": "someone.else@example.com",
                 "owner": "someone.else@example.com"},
            ),
            "a todo belonging to someone else must still be refused",
        )

    def test_todo_list_goes_through_the_alumni_wrapper(self):
        """cn_todo_manager's list/categories must not be reachable directly.

        They ignore `Todo Type.custom_show_in_alumni_portal`, so calling them
        directly would bypass the portal's category gate.
        """
        allow = g._is_allowed_for_alumni
        base = "cn_todo_manager.chatnext_todo_manager.api.todo_api."
        for method in ("get_todo_list", "get_todo_categories"):
            self.assertFalse(
                allow("method", base + method),
                f"{method} must not be reachable directly — it skips the gate",
            )
        for method in (
            "recruitment.recruitment.alumni_portal.get_alumni_todo_list",
            "recruitment.recruitment.alumni_portal.get_alumni_todo_categories",
        ):
            self.assertTrue(allow("method", method), f"{method} must be reachable")
        # A boolean answer only — no todo data — so it stays directly callable.
        self.assertTrue(allow("method", base + "show_team_todos"))

    def test_approval_stage_forms_are_scoped_to_the_approver(self):
        """One signed-in user must not see every stage's form.

        ESS returns them all: its `can_view_form` only bites when
        show_to_users/show_to_roles are set, and on this site that is 3 of 887
        rows. The portal narrows it to the stages the caller approves.
        """
        from recruitment.recruitment import alumni_portal as ap

        user = frappe.session.user
        roles = [r for r in frappe.get_roles(user) if r not in ("All", "Guest")]

        self.assertTrue(ap._alumni_stage_is_mine(user, {"user": user}))
        self.assertFalse(ap._alumni_stage_is_mine(user, {"user": "someone@else.com"}))
        self.assertFalse(ap._alumni_stage_is_mine(user, {}))
        if roles:
            self.assertTrue(ap._alumni_stage_is_mine(user, {"role": roles[0]}))
        # An explicit show_to_* list overrides the approver fields entirely.
        self.assertFalse(
            ap._alumni_stage_is_mine(user, {"user": user, "show_to_users": "other@x.com"}),
            "show_to_users must override the approver match",
        )

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
