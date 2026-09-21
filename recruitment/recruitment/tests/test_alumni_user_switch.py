"""Unit tests for Employee user switching (recruitment.alumni_user_switch).

Covers the Active -> Left -> Active account lifecycle, idempotency, and the
authorization guarantees for the provisioned alumni account.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_alumni_user_switch
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import alumni_guard as guard
from recruitment.recruitment import alumni_user_switch as sw
from recruitment.recruitment.alumni_portal import (
    ALUMNI_FLAG,
    alumni_employee_name,
    is_alumni_employee,
)

COMPANY_EMAIL = "switch.work@test.local"
PERSONAL_EMAIL = "switch.personal@test.local"


def _drop_user(email: str) -> None:
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, force=True, ignore_permissions=True)


def _make_user(email: str) -> str:
    _drop_user(email)
    frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "Switch",
            "enabled": 1,
            "send_welcome_email": 0,
        }
    ).insert(ignore_permissions=True)
    return email


def _make_employee(company_email: str, personal_email: str | None) -> str:
    """Minimal Active Employee wired to a company-email User."""
    existing = frappe.db.get_value("Employee", {"user_id": company_email}, "name")
    if existing:
        frappe.delete_doc("Employee", existing, force=True, ignore_permissions=True)

    company = frappe.db.get_value("Company", {}, "name")
    # cn_hrms_core marks these mandatory on Employee.
    department = frappe.db.get_value("Department", {"company": company}, "name") or \
        frappe.db.get_value("Department", {}, "name")
    designation = frappe.db.get_value("Designation", {}, "name")
    doc = frappe.get_doc(
        {
            "doctype": "Employee",
            "first_name": "Switch",
            "last_name": "Tester",
            "gender": frappe.db.get_value("Gender", {}, "name") or "Male",
            "date_of_birth": "1990-01-01",
            "date_of_joining": "2020-01-01",
            "company": company,
            "department": department,
            "designation": designation,
            "status": "Active",
            "user_id": company_email,
        }
    )
    if personal_email:
        doc.personal_email = personal_email
    doc.flags.ignore_permissions = True
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    # nextai recomputes Dynamic User Assignments on every Employee write; commit
    # between writes so those child-table updates cannot deadlock the test txn.
    frappe.db.commit()
    return doc.name


def _set_status(employee: str, status: str) -> None:
    doc = frappe.get_doc("Employee", employee)
    if doc.status == status:
        return
    doc.status = status
    # HRMS requires a relieving date before an Employee may be marked Left.
    if status in sw.EXITED_STATUSES and not doc.relieving_date:
        doc.relieving_date = "2026-01-31"
    doc.flags.ignore_permissions = True
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)
    frappe.db.commit()


def _enabled(email: str) -> int:
    return frappe.utils.cint(frappe.db.get_value("User", email, "enabled"))


def _flag(email: str) -> int:
    return frappe.utils.cint(frappe.db.get_value("User", email, ALUMNI_FLAG))


class TestAlumniUserSwitch(FrappeTestCase):
    _extra_employees: list[str] = []

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._extra_employees = []
        _make_user(COMPANY_EMAIL)
        _drop_user(PERSONAL_EMAIL)
        cls.employee = _make_employee(COMPANY_EMAIL, PERSONAL_EMAIL)
        frappe.db.commit()

    # ── 1. Active employee ────────────────────────────────────────────────────
    def test_active_employee_keeps_company_user_and_creates_no_personal_user(self):
        self.assertEqual(_enabled(COMPANY_EMAIL), 1)
        self.assertFalse(
            frappe.db.exists("User", PERSONAL_EMAIL),
            "personal User must not be created while the employee is Active",
        )

    # ── 2. Active -> Left ─────────────────────────────────────────────────────
    def test_leaving_disables_company_user_and_provisions_alumni_user(self):
        _set_status(self.employee, "Left")

        # Disabled by ERPNext's Employee.validate_for_enabled_user_id, not by us.
        self.assertEqual(_enabled(COMPANY_EMAIL), 0, "company User must end up disabled")
        self.assertTrue(frappe.db.exists("User", COMPANY_EMAIL), "never delete the company User")

        self.assertTrue(frappe.db.exists("User", PERSONAL_EMAIL), "alumni User must be created")
        self.assertEqual(_enabled(PERSONAL_EMAIL), 1)
        self.assertEqual(_flag(PERSONAL_EMAIL), 1, "alumni User must carry the alumni flag")
        self.assertEqual(
            frappe.db.get_value("User", PERSONAL_EMAIL, "user_type"),
            sw.ALUMNI_USER_TYPE,
            "alumni User must be a Website User so Frappe denies Desk access",
        )

        # The Employee -> alumni User link is recorded.
        if frappe.get_meta("Employee").get_field("custom_alumni_user"):
            self.assertEqual(
                frappe.db.get_value("Employee", self.employee, "custom_alumni_user"),
                PERSONAL_EMAIL,
            )

    def test_alumni_user_passes_the_portal_gate(self):
        _set_status(self.employee, "Left")
        self.assertTrue(is_alumni_employee(PERSONAL_EMAIL))
        self.assertTrue(guard.is_alumni_user(PERSONAL_EMAIL))

    def test_alumni_user_resolves_back_to_the_employee(self):
        """Employee.user_id stays the company email, so resolution must not use it."""
        _set_status(self.employee, "Left")
        self.assertEqual(alumni_employee_name(PERSONAL_EMAIL), self.employee)

    def test_alumni_user_is_confined_to_the_alumni_namespace(self):
        """Backend authorization, not frontend routing."""
        allow = guard._is_allowed_for_alumni
        self.assertTrue(allow("method", "recruitment.recruitment.alumni_portal.get_alumni_profile"))
        self.assertTrue(allow("method", "recruitment.recruitment.alumni_helpdesk.get_alumni_hd_categories"))
        # ESS / Desk / resource APIs stay blocked.
        self.assertFalse(allow("method", "hrms.api.get_leave_applications"))
        self.assertFalse(allow("method", "frappe.client.get_list"))
        self.assertFalse(allow("resource", "Employee"))
        self.assertFalse(allow("other", "/app"))

    # ── 3. Idempotency / no duplicates ────────────────────────────────────────
    def test_repeated_saves_do_not_duplicate_users(self):
        _set_status(self.employee, "Left")
        for _ in range(3):
            doc = frappe.get_doc("Employee", self.employee)
            doc.flags.ignore_permissions = True
            doc.flags.ignore_mandatory = True
            doc.save(ignore_permissions=True)
            frappe.db.commit()

        matches = frappe.get_all("User", filters={"email": PERSONAL_EMAIL}, pluck="name")
        self.assertEqual(len(matches), 1, "repeated saves must not create duplicate Users")

    def test_existing_personal_user_is_reused_not_recreated(self):
        _set_status(self.employee, "Active")
        _drop_user(PERSONAL_EMAIL)
        pre_existing = _make_user(PERSONAL_EMAIL)
        frappe.db.commit()

        _set_status(self.employee, "Left")

        self.assertEqual(
            frappe.get_all("User", filters={"email": PERSONAL_EMAIL}, pluck="name"),
            [pre_existing],
            "an existing User must be reused, not duplicated",
        )
        self.assertEqual(_flag(PERSONAL_EMAIL), 1)
        self.assertEqual(_enabled(PERSONAL_EMAIL), 1)

    # ── 4. Left -> Active (rejoin) ────────────────────────────────────────────
    def test_rejoining_restores_company_user_and_retires_alumni_user(self):
        _set_status(self.employee, "Left")
        self.assertEqual(_enabled(COMPANY_EMAIL), 0)

        _set_status(self.employee, "Active")

        # Re-enabled by ERPNext's own status rule.
        self.assertEqual(_enabled(COMPANY_EMAIL), 1, "company User must end up re-enabled")
        self.assertEqual(_enabled(PERSONAL_EMAIL), 0, "alumni User must be disabled")
        self.assertEqual(_flag(PERSONAL_EMAIL), 0, "alumni access must be revoked")
        self.assertTrue(frappe.db.exists("User", PERSONAL_EMAIL), "never delete the personal User")
        self.assertFalse(is_alumni_employee(PERSONAL_EMAIL))

    # ── 5. Missing personal email ─────────────────────────────────────────────
    def test_employee_without_personal_email_provisions_no_alumni_user(self):
        """No personal email -> no alumni account, and the save still succeeds.

        ERPNext still disables the company account (its own status rule), so the
        employee is left with no usable login until HR adds a personal email —
        the switch logs that rather than inventing an account.

        Driven through `apply_account_state` on the existing Employee instead of
        creating a second Employee/User: nextai links every new Employee's User
        into Dynamic User Assignment rows, and tearing those down cleanly is
        more trouble than the coverage is worth.
        """
        _set_status(self.employee, "Left")
        frappe.db.set_value(
            "Employee", self.employee,
            {"personal_email": "", "custom_alumni_user": ""},
            update_modified=False,
        )
        frappe.db.commit()

        sw.apply_account_state(self.employee)

        self.assertFalse(
            frappe.db.get_value("Employee", self.employee, "custom_alumni_user"),
            "no alumni User may be linked when there is no personal email",
        )

        # Restore for the remaining tests.
        frappe.db.set_value(
            "Employee", self.employee, "personal_email", PERSONAL_EMAIL,
            update_modified=False,
        )
        frappe.db.commit()

    # ── 5b. Interactive conversion without personal email is hard-blocked ──────
    def test_conversion_without_personal_email_is_blocked_on_save(self):
        """A `validate` hook aborts the Active -> Left transition when there is no
        personal email, BEFORE the company User is disabled — so the employee is
        never left with a disabled company account and no alumni login.

        This is the interactive (`doc.save`) path; the backfill path
        (`apply_account_state`) keeps its softer log-and-skip behaviour, covered
        by ``test_employee_without_personal_email_provisions_no_alumni_user``.
        """
        _set_status(self.employee, "Active")
        self.assertEqual(_enabled(COMPANY_EMAIL), 1)

        doc = frappe.get_doc("Employee", self.employee)
        doc.personal_email = ""
        doc.status = "Left"
        if not doc.relieving_date:
            doc.relieving_date = "2026-01-31"

        with self.assertRaises(frappe.ValidationError):
            doc.save(ignore_permissions=True)
        frappe.db.rollback()

        # The whole transition was aborted: company User still enabled, status Active.
        self.assertEqual(
            _enabled(COMPANY_EMAIL), 1,
            "company User must NOT be disabled when the conversion is blocked",
        )
        self.assertEqual(
            frappe.db.get_value("Employee", self.employee, "status"), "Active",
            "status change must not persist when validation fails",
        )

        # Restore personal email for the remaining tests.
        frappe.db.set_value(
            "Employee", self.employee, "personal_email", PERSONAL_EMAIL,
            update_modified=False,
        )
        frappe.db.commit()

    # ── 6. Existing ToDos are left alone ──────────────────────────────────────
    def _todos_for(self, user: str, status: str = "Open") -> list[str]:
        return frappe.get_all(
            "ToDo",
            filters={"allocated_to": user, "status": status, "reference_type": "Employee"},
            pluck="name",
        )

    def _make_todo(self, user: str, status: str = "Open") -> str:
        todo = frappe.get_doc(
            {
                "doctype": "ToDo",
                "allocated_to": user,
                "reference_type": "Employee",
                "reference_name": self.employee,
                "description": f"existing work ({status})",
                "status": status,
            }
        )
        todo.flags.ignore_permissions = True
        todo.insert(ignore_permissions=True)
        frappe.db.commit()
        return todo.name

    def test_becoming_alumni_leaves_existing_todos_untouched(self):
        """Existing assignments stay with the company User.

        The switch provisions the alumni account only. Work already assigned to
        the company account is deliberately left exactly where it was — new work
        for an alumnus is raised through the normal Manager + Workflow flow
        against the alumni User instead.
        """
        _set_status(self.employee, "Active")
        open_todo = self._make_todo(COMPANY_EMAIL, "Open")
        closed_todo = self._make_todo(COMPANY_EMAIL, "Closed")

        _set_status(self.employee, "Left")

        # Still on the company account, still Open.
        self.assertEqual(
            frappe.db.get_value("ToDo", open_todo, "allocated_to"),
            COMPANY_EMAIL,
            "an existing ToDo must NOT be reassigned to the alumni User",
        )
        self.assertEqual(
            frappe.db.get_value("ToDo", open_todo, "status"),
            "Open",
            "an existing ToDo must NOT be cancelled by the switch",
        )
        self.assertEqual(
            frappe.db.get_value("ToDo", closed_todo, "allocated_to"), COMPANY_EMAIL
        )
        self.assertEqual(frappe.db.get_value("ToDo", closed_todo, "status"), "Closed")

        # And nothing was created on the alumni side as a side effect.
        self.assertEqual(
            self._todos_for(PERSONAL_EMAIL),
            [],
            "the switch must not create assignments on the alumni User",
        )

    # ── 7. Non-status saves are ignored ───────────────────────────────────────
    def test_non_status_change_does_not_switch_accounts(self):
        _set_status(self.employee, "Active")
        frappe.db.set_value("User", PERSONAL_EMAIL, "enabled", 0, update_modified=False)

        doc = frappe.get_doc("Employee", self.employee)
        doc.bio = "unrelated edit"
        doc.flags.ignore_permissions = True
        doc.flags.ignore_mandatory = True
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        self.assertEqual(
            _enabled(PERSONAL_EMAIL), 0, "a non-status save must not touch accounts"
        )

    @classmethod
    def tearDownClass(cls):
        # nextai links these Users into Dynamic User Assignment child rows.
        # Deleting the Users first would leave those rows dangling and break the
        # NEXT run with a LinkValidationError, so clear them up front.
        emails = (COMPANY_EMAIL, PERSONAL_EMAIL)
        try:
            frappe.db.sql(
                "DELETE FROM `tabAssigned Users` WHERE user_id IN %(u)s", {"u": emails}
            )
            frappe.db.sql(
                "DELETE FROM `tabToDo` WHERE allocated_to IN %(u)s", {"u": emails}
            )
            frappe.db.commit()
        except Exception:
            pass

        for emp in [cls.employee, *cls._extra_employees]:
            try:
                frappe.delete_doc("Employee", emp, force=True, ignore_permissions=True)
            except Exception:
                pass
        for email in (COMPANY_EMAIL, PERSONAL_EMAIL):
            try:
                _drop_user(email)
            except Exception:
                pass
        frappe.db.commit()
        super().tearDownClass()
