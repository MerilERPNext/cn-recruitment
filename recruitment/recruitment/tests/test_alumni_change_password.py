"""Unit tests for ``recruitment.recruitment.alumni_portal.change_alumni_password``.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_alumni_change_password
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils.password import check_password, update_password

from recruitment.recruitment import alumni_portal as ap

ALUMNI = "chpwd.alumni@test.local"
ESS = "chpwd.ess@test.local"
OLD_PWD = "Old-Passw0rd!xyz"
NEW_PWD = "New-Passw0rd!abc"


def _make_user(email: str, is_alumni: bool) -> str:
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, force=True, ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "ChangePwd",
            "enabled": 1,
            "send_welcome_email": 0,
            "custom_is_alumni_employee": 1 if is_alumni else 0,
        }
    ).insert(ignore_permissions=True)
    update_password(email, OLD_PWD)
    return email


class TestChangeAlumniPassword(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        _make_user(ALUMNI, True)
        _make_user(ESS, False)
        frappe.db.commit()

    def setUp(self):
        frappe.local.response = frappe._dict()
        update_password(ALUMNI, OLD_PWD)
        frappe.set_user(ALUMNI)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.local._alumni_user_cache = {}

    def _call(self, current=OLD_PWD, new=NEW_PWD, confirm=NEW_PWD):
        return ap.change_alumni_password(
            current_password=current, new_password=new, confirm_password=confirm
        )

    # ── auth boundary ──
    def test_guest_is_rejected(self):
        frappe.set_user("Guest")
        with self.assertRaises(frappe.AuthenticationError):
            self._call()

    def test_non_alumni_is_rejected(self):
        frappe.set_user(ESS)
        with self.assertRaises(frappe.PermissionError):
            self._call()

    # ── field validation ──
    def test_missing_fields(self):
        for kwargs in (
            dict(current=""),
            dict(new=""),
            dict(confirm=""),
        ):
            res = self._call(**kwargs)
            self.assertFalse(res["success"], kwargs)
            self.assertEqual(frappe.local.response.get("http_status_code"), 400)

    def test_confirm_mismatch(self):
        res = self._call(confirm=NEW_PWD + "x")
        self.assertFalse(res["success"])
        self.assertIn("do not match", res["message"])
        check_password(ALUMNI, OLD_PWD)  # unchanged

    def test_same_as_current(self):
        res = self._call(new=OLD_PWD, confirm=OLD_PWD)
        self.assertFalse(res["success"])
        self.assertIn("different", res["message"])

    def test_wrong_current_password(self):
        res = self._call(current="definitely-not-it")
        self.assertFalse(res["success"])
        self.assertEqual(frappe.local.response.get("http_status_code"), 401)
        check_password(ALUMNI, OLD_PWD)  # unchanged

    # ── happy path ──
    def test_success_changes_password(self):
        res = self._call()
        self.assertTrue(res["success"], res)
        self.assertEqual(frappe.local.response.get("http_status_code"), 200)
        check_password(ALUMNI, NEW_PWD)
        with self.assertRaises(frappe.AuthenticationError):
            check_password(ALUMNI, OLD_PWD)
        self.assertTrue(frappe.db.get_value("User", ALUMNI, "last_password_reset_date"))
