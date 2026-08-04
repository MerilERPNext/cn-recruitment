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
        # Alumni Helpdesk namespace is also allowed.
        self.assertTrue(allow("method", "recruitment.recruitment.alumni_helpdesk.get_alumni_hd_categories"))

    # ── login-attempt detection (pure) — all ESS login entry points ──
    def test_login_attempt_detection(self):
        login = g._is_login_attempt
        self.assertTrue(login("method", "login", ""))
        self.assertTrue(login("method", "frappe.core.doctype.user.user.login", ""))
        self.assertTrue(login("other", "/login", "/login"))
        self.assertTrue(login("other", "/login", "/login/"))
        self.assertFalse(login("method", "frappe.client.get_list", ""))
        self.assertFalse(login("other", "/app", "/app"))

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

    def test_alumni_blocked_on_website_login(self):
        # Website login-form POST (outside /api/method/) is also blocked.
        with self.assertRaises(frappe.PermissionError):
            self._run(ALUMNI, "/login")

    def test_alumni_blocked_on_hrms_and_resource_variants(self):
        for path in (
            "/api/method/hrms.api.get_leave_applications",
            "/api/method/frappe.client.get_count",
            "/api/resource/Leave Application",
            "/api/resource/Attendance",
            "/app/employee",
        ):
            with self.assertRaises(frappe.PermissionError):
                self._run(ALUMNI, path)

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
