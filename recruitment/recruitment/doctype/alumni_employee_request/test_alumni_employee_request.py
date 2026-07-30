# Copyright (c) 2026, Prathamesh Jadhav and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from recruitment.recruitment import alumni_employee_request_service as service

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []


class IntegrationTestAlumniEmployeeRequest(IntegrationTestCase):
    """Integration tests for the Alumni Employee Request feature.

    Covers the guard rails that protect existing functionality: validation
    rejects ineligible employees, and the approve → mark-alumni transition is
    idempotent and reuses the existing `custom_is_alumni_employee` gate.
    """

    def test_validation_rejects_missing_employee(self):
        with self.assertRaises(service.AlumniRequestError):
            service.validate_alumni_request("", "")

    def test_validation_rejects_unknown_employee(self):
        with self.assertRaises(service.AlumniRequestError):
            service.validate_alumni_request("EMP-does-not-exist", "a@b.com")

    def test_mark_employee_as_alumni_is_idempotent_on_missing(self):
        # A non-existent employee is a safe no-op, never an exception.
        result = service.mark_employee_as_alumni("EMP-does-not-exist")
        self.assertFalse(result["success"])

    def test_mark_employee_as_alumni_second_call_is_noop(self):
        """Marking an already-alumni employee reports `already` and does not
        re-write the flag (protects the once-only contract)."""
        emp = frappe.db.get_value("Employee", {"status": "Left"}, "name")
        if not emp:
            self.skipTest("No 'Left' employee available in the test site.")
        first = service.mark_employee_as_alumni(emp)
        self.assertTrue(first["success"])
        second = service.mark_employee_as_alumni(emp)
        self.assertTrue(second["already"])
