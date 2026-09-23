"""Unit tests for the centralized Alumni Portal guard (recruitment.alumni_guard).

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_alumni_guard
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

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

    @patch("recruitment.recruitment.alumni_portal._require_alumni_session", return_value="alumni@portal.test")
    @patch("recruitment.recruitment.alumni_portal.frappe.db.commit")
    @patch("recruitment.recruitment.alumni_portal.frappe.get_doc")
    @patch("recruitment.recruitment.alumni_portal.frappe.db.get_value")
    def test_create_alumni_todo_accepts_task_manager_payload(
        self, get_value_mock, get_doc_mock, commit_mock, _session_mock
    ):
        from recruitment.recruitment import alumni_portal

        doc = MagicMock()
        doc.name = "TODO-001"
        doc.flags = MagicMock()
        doc.insert.return_value = doc
        get_doc_mock.return_value = doc
        get_value_mock.return_value = {"name": "TODO-001", "custom_subject": "Follow up"}

        with (
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            patch.object(
                alumni_portal,
                "_get_alumni_todo_delegation_summary",
                return_value={"allowed_delegates": ["assignee@example.com"]},
            ),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=1),
        ):
            result = alumni_portal.create_alumni_todo(
                custom_subject="Follow up",
                description="<p>Need a callback</p>",
                custom_todo_type="Support",
                date="2026-09-01",
                allocated_to="assignee@example.com",
                status="Open",
            )

        self.assertTrue(result["success"])
        payload = get_doc_mock.call_args.args[0]
        self.assertEqual(payload["custom_subject"], "Follow up")
        self.assertEqual(payload["custom_todo_type"], "Support")
        self.assertEqual(payload["allocated_to"], "assignee@example.com")
        self.assertEqual(payload["assigned_by"], "alumni@portal.test")
        self.assertEqual(payload["description"], "<p>Need a callback</p>")
        self.assertEqual(payload["status"], "Open")

    def test_create_alumni_todo_rejects_missing_description(self):
        from recruitment.recruitment import alumni_portal

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=1),
            self.assertRaises(frappe.ValidationError) as exc,
        ):
            alumni_portal.create_alumni_todo(
                custom_subject="Follow up",
                description="<p><br></p>",
                custom_todo_type="Support",
            )

        self.assertEqual(str(exc.exception), "Description is mandatory.")
        self.assertEqual(frappe.local.response.get("http_status_code"), 400)

    def test_create_alumni_todo_rejects_missing_todo_type(self):
        from recruitment.recruitment import alumni_portal

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=1),
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            self.assertRaises(frappe.ValidationError) as exc,
        ):
            alumni_portal.create_alumni_todo(
                custom_subject="Follow up",
                description="<p>Need a callback</p>",
                custom_todo_type="   ",
            )

        self.assertEqual(str(exc.exception), "Todo Type is mandatory.")
        self.assertEqual(frappe.local.response.get("http_status_code"), 400)

    def test_create_alumni_todo_rejects_disabled_creation(self):
        from recruitment.recruitment import alumni_portal

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=0),
            self.assertRaises(frappe.PermissionError),
        ):
            alumni_portal.create_alumni_todo(
                custom_subject="Blocked",
                description="<p>Test</p>",
                custom_todo_type="Support",
            )

    def test_create_alumni_todo_rejects_invisible_type(self):
        from recruitment.recruitment import alumni_portal

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=1),
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            self.assertRaises(frappe.PermissionError),
        ):
            alumni_portal.create_alumni_todo(
                custom_subject="Hidden",
                description="<p>Need a callback</p>",
                custom_todo_type="Private",
            )

    def test_create_alumni_todo_rejects_arbitrary_assignee(self):
        from recruitment.recruitment import alumni_portal

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal.frappe.db, "get_single_value", return_value=1),
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            patch.object(alumni_portal, "_get_alumni_todo_delegation_summary", return_value={"allowed_delegates": []}),
            self.assertRaises(frappe.PermissionError),
        ):
            alumni_portal.create_alumni_todo(
                custom_subject="Unsafe",
                description="<p>Need a callback</p>",
                custom_todo_type="Support",
                allocated_to="stranger@test.local",
            )

    def test_todo_settings_include_creation_and_due_date_flags(self):
        from recruitment.recruitment import alumni_portal

        values = {"allow_to_create_task": "1", "disable_edit_due_date": "0"}
        with (
            patch.object(alumni_portal, "_require_alumni_session"),
            patch.object(alumni_portal.frappe.db, "get_value", return_value=values),
        ):
            settings = alumni_portal.get_alumni_todo_settings()["settings"]
        self.assertEqual(settings["allow_to_create_task"], 1)
        self.assertEqual(settings["disable_edit_due_date"], 0)

    def test_todo_type_filter_is_intersected(self):
        from recruitment.recruitment import alumni_portal
        from cn_todo_manager.chatnext_todo_manager.api import todo_api

        with (
            patch.object(alumni_portal, "_require_alumni_session"),
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            patch.object(todo_api, "get_todo_list", return_value={"message": []}) as list_mock,
        ):
            alumni_portal.get_alumni_todo_list(
                type="My Todo", todo_type_filter='["Support", "Private"]'
            )
        self.assertEqual(frappe.parse_json(list_mock.call_args.kwargs["todo_type_filter"]), ["Support"])

    def test_category_rule_rejects_unauthorized_category_and_delegate(self):
        from recruitment.recruitment import alumni_portal

        base = {"rule_name": "Rule", "categories": ["Private"], "delegated_to": "bad@test.local"}
        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(
                alumni_portal,
                "_get_alumni_todo_delegation_summary",
                return_value={
                    "allow_delegation_of_below_tasks": ["Support"],
                    "allowed_delegates": ["delegate@test.local"],
                },
            ),
            self.assertRaises(frappe.PermissionError),
        ):
            alumni_portal.create_alumni_category_rule(base)

        base["categories"] = ["Support"]
        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(
                alumni_portal,
                "_get_alumni_todo_delegation_summary",
                return_value={
                    "allow_delegation_of_below_tasks": ["Support"],
                    "allowed_delegates": ["delegate@test.local"],
                },
            ),
            self.assertRaises(frappe.PermissionError),
        ):
            alumni_portal.create_alumni_category_rule(base)

    def test_delegation_summary_has_no_user_argument(self):
        import inspect
        from recruitment.recruitment import alumni_portal

        self.assertEqual(
            list(inspect.signature(alumni_portal.get_alumni_todo_delegation_summary).parameters),
            [],
        )

    def test_delegation_history_checks_todo_ownership(self):
        from recruitment.recruitment import alumni_portal
        from cn_todo_manager.chatnext_todo_manager.api import delegation_api

        with (
            patch.object(alumni_portal, "_require_own_todo") as ownership_mock,
            patch.object(
                delegation_api,
                "get_delegation_history",
                return_value=[{"reference": "DEL-1"}],
            ) as history_mock,
        ):
            result = alumni_portal.get_alumni_todo_delegation_history("TODO-001")

        ownership_mock.assert_called_once_with("TODO-001")
        history_mock.assert_called_once_with("TODO-001")
        self.assertEqual(result, [{"reference": "DEL-1"}])

    def test_filter_options_user_query_is_scoped(self):
        from recruitment.recruitment import alumni_portal
        from cn_todo_manager.chatnext_todo_manager.api import todo_api

        builder = MagicMock()
        builder.get_paginated_results.return_value = {
            "message": [
                frappe._dict(
                    allocated_to=ALUMNI,
                    assigned_by="assigner@test.local",
                    owner="assigner@test.local",
                )
            ]
        }

        def get_all(doctype, **kwargs):
            if doctype == "User":
                return [frappe._dict(name=ALUMNI, full_name="Alumni")]
            if doctype == "Employee":
                return []
            return []

        with (
            patch.object(alumni_portal, "_require_alumni_session", return_value=ALUMNI),
            patch.object(alumni_portal, "_alumni_visible_todo_types", return_value=["Support"]),
            patch.object(alumni_portal, "_get_alumni_todo_delegation_summary", return_value={}),
            patch.object(todo_api, "OptimizedTodoQueryBuilder", return_value=builder),
            patch.object(alumni_portal.frappe, "get_all", side_effect=get_all) as get_all_mock,
        ):
            result = alumni_portal.get_alumni_todo_filter_options()

        user_call = next(call for call in get_all_mock.call_args_list if call.args[0] == "User")
        self.assertEqual(
            set(user_call.kwargs["filters"]["name"][1]),
            {ALUMNI, "assigner@test.local"},
        )
        self.assertNotIn("outsider@test.local", [row["value"] for row in result["users"]])

    def test_todo_attachments_use_reference_document(self):
        from recruitment.recruitment import alumni_portal

        todo = frappe._dict(reference_type="Expense Claim", reference_name="EXP-001")
        with (
            patch.object(alumni_portal, "_require_own_todo", return_value=(ALUMNI, todo)),
            patch.object(alumni_portal.frappe, "get_all", return_value=[]) as get_all_mock,
        ):
            result = alumni_portal.get_alumni_todo_attachments("TODO-001")

        self.assertEqual(result["reference_attachments"], [])
        self.assertEqual(
            get_all_mock.call_args.kwargs["filters"],
            {
                "attached_to_doctype": "Expense Claim",
                "attached_to_name": "EXP-001",
            },
        )

    def test_todo_print_preview_uses_configured_reference_format(self):
        from recruitment.recruitment import alumni_portal

        todo = frappe._dict(reference_type="Expense Claim", reference_name="EXP-001")
        settings = frappe._dict(
            format_allocations=[
                frappe._dict(doctype_name="Expense Claim", print_format="Expense Preview")
            ]
        )
        reference_doc = MagicMock()
        reference_doc.meta = MagicMock()
        with (
            patch.object(alumni_portal, "_require_own_todo", return_value=(ALUMNI, todo)),
            patch.object(alumni_portal.frappe, "get_cached_doc", return_value=settings),
            patch.object(alumni_portal.frappe, "get_doc", return_value=reference_doc),
            patch("frappe.www.printview.get_print_format_doc", return_value=MagicMock()),
            patch("frappe.www.printview.set_link_titles"),
            patch("frappe.www.printview.get_rendered_template", return_value="<p>Preview</p>"),
            patch("frappe.www.printview.get_print_style", return_value=".print {}"),
        ):
            result = alumni_portal.get_alumni_todo_print_preview("TODO-001")

        self.assertTrue(result["available"])
        self.assertEqual(result["html"], "<p>Preview</p>")
        self.assertEqual(result["style"], ".print {}")
        self.assertEqual(result["reference_type"], "Expense Claim")
        self.assertEqual(result["reference_name"], "EXP-001")

    def test_guest_never_blocked(self):
        self._run("Guest", "/api/resource/Employee")
