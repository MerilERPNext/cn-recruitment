# Copyright (c) 2026, Recruitment and contributors
# See license.txt

"""AOP budget check on Job Requisitions (recruitment.api.requisition_budget).

The Department / Cost Center lookups are patched out: what is under test is how a
requisition's ask is worked out, split across cost centers and compared with the
budget left — not the masters on whichever site the suite runs against.
"""

import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api import requisition_budget as budget

MILLION = 1_000_000


def _requisition(**fields):
    values = {
        "doctype": "Job Requisition",
        "department": "DEPT-A",
        "custom_salary_range_max": str(MILLION),
        "custom_salary_timeframe": "Annual",
        "custom_salary_range_currency": "INR",
        "status": "Approval Pending",
    }
    values.update(fields)
    return frappe.get_doc(values)


def _position(allocations=None):
    return {"cost_center_allocations": json.dumps(allocations) if allocations else ""}


def _masters(masters):
    """A stand-in for ``_budgets`` serving `masters` ({doctype: {name: (budget, utilized)}})."""

    def lookup(doctype, names, cache=None):
        return {
            name: {"label": name, "budget": b, "utilized": u}
            for name, (b, u) in masters.get(doctype, {}).items()
            if name in names
        }

    return patch.object(budget, "_budgets", side_effect=lookup)


def _fallback(cost_center="CC-3"):
    return patch.object(budget, "_fallback_cost_center", return_value=cost_center)


class TestRequirement(FrappeTestCase):
    def test_salary_is_annualised(self):
        self.assertEqual(
            budget.annual_cost_per_position(
                _requisition(
                    custom_salary_range_max="50,000", custom_salary_timeframe="Monthly"
                )
            ),
            600_000,
        )
        self.assertEqual(
            budget.annual_cost_per_position(_requisition(custom_salary_range_max="")), 0
        )

    def test_allocations_split_positions_and_the_rest_fall_back(self):
        doc = _requisition(
            custom_position_details=[
                _position(
                    [
                        {"cost_center": "CC-1", "percentage": 60},
                        {"cost_center": "CC-2", "percentage": 40},
                    ]
                ),
                _position(),
            ]
        )
        with _fallback():
            total, by_cost_center = budget.requirement(doc)

        self.assertEqual(total, 2 * MILLION)
        self.assertEqual(
            by_cost_center, {"CC-1": 600_000, "CC-2": 400_000, "CC-3": MILLION}
        )

    def test_a_split_under_100_percent_charges_the_rest_to_the_fallback(self):
        doc = _requisition(
            custom_position_details=[
                _position([{"cost_center": "CC-1", "percentage": 60}])
            ]
        )
        with _fallback():
            _total, by_cost_center = budget.requirement(doc)
        self.assertAlmostEqual(by_cost_center["CC-1"], 600_000)
        self.assertAlmostEqual(by_cost_center["CC-3"], 400_000)

    def test_rounding_of_an_even_split_is_not_a_remainder(self):
        thirds = [{"cost_center": f"CC-{i}", "percentage": 33.33} for i in range(3)]
        doc = _requisition(custom_position_details=[_position(thirds)])
        with _fallback():
            _total, by_cost_center = budget.requirement(doc)
        self.assertNotIn("CC-3", by_cost_center)

    def test_requisition_without_position_rows_charges_its_cost_center(self):
        doc = _requisition(no_of_positions=4)
        with _fallback():
            self.assertEqual(
                budget.requirement(doc), (4 * MILLION, {"CC-3": 4 * MILLION})
            )


class TestShortfalls(FrappeTestCase):
    def test_only_masters_short_of_the_ask_are_reported(self):
        doc = _requisition(
            custom_position_details=[
                _position(
                    [
                        {"cost_center": "CC-1", "percentage": 60},
                        {"cost_center": "CC-2", "percentage": 40},
                    ]
                ),
            ]
        )
        masters = {
            budget.DEPARTMENT: {
                "DEPT-A": (5 * MILLION, MILLION)
            },  # 4M left for a 1M ask
            budget.COST_CENTER: {
                "CC-1": (MILLION, 500_000)
            },  # 500k left for a 600k ask
            # CC-2 has no budget configured, so it is not checked.
        }
        with _masters(masters):
            rows = budget.shortfalls(doc)

        self.assertEqual(
            [(r["doctype"], r["name"]) for r in rows], [(budget.COST_CENTER, "CC-1")]
        )
        self.assertEqual(rows[0]["available"], 500_000)
        self.assertEqual(rows[0]["required"], 600_000)
        self.assertIn("only", rows[0]["summary"])

    def test_an_exhausted_budget_says_nothing_is_left(self):
        with _masters({budget.DEPARTMENT: {"DEPT-A": (MILLION, 2 * MILLION)}}):
            (row,) = budget.shortfalls(_requisition(no_of_positions=1))
        self.assertIn("no budget is left", row["summary"])


class TestEnforceBudget(FrappeTestCase):
    OVER = {budget.DEPARTMENT: {"DEPT-A": (MILLION, 500_000)}}

    def test_new_requisition_over_budget_is_blocked_with_a_readable_message(self):
        department = "R&D <Ops>"
        with (
            patch.object(budget, "is_enabled", return_value=True),
            _masters({budget.DEPARTMENT: {department: (MILLION, 500_000)}}),
        ):
            with self.assertRaises(frappe.ValidationError) as caught:
                budget.enforce_budget(
                    _requisition(no_of_positions=1, department=department)
                )
        # Department names are escaped: the message is rendered as HTML in Desk and React.
        message = str(caught.exception)
        self.assertIn("&lt;Ops&gt;", message)
        self.assertIn("ask the Accounts team", message)

    def test_nothing_is_checked_while_the_setting_is_off(self):
        with (
            patch.object(budget, "is_enabled", return_value=False),
            _masters(self.OVER),
        ):
            budget.enforce_budget(_requisition(no_of_positions=1))

    def test_closed_or_paused_requisitions_are_not_checked(self):
        with patch.object(budget, "is_enabled", return_value=True), _masters(self.OVER):
            budget.enforce_budget(_requisition(no_of_positions=1, status="On Hold"))

    def test_only_a_changed_ask_is_rechecked_on_an_existing_requisition(self):
        doc = _requisition(no_of_positions=1)
        before = frappe.get_doc(doc.as_dict())
        doc.status = "Approved Draft"

        with (
            patch.object(budget, "is_enabled", return_value=True),
            _masters(self.OVER),
            patch.object(doc, "is_new", return_value=False),
            patch.object(doc, "get_doc_before_save", return_value=before),
        ):
            budget.enforce_budget(doc)  # a status move is never blocked

            doc.custom_salary_range_max = str(2 * MILLION)
            self.assertRaises(frappe.ValidationError, budget.enforce_budget, doc)


class TestFlag(FrappeTestCase):
    OVER = {budget.DEPARTMENT: {"DEPT-A": (MILLION, 500_000)}}

    def test_only_live_requisitions_are_flagged(self):
        with _masters(self.OVER):
            self.assertTrue(
                budget.is_over_budget(_requisition(no_of_positions=1), enabled=True)
            )
            self.assertFalse(
                budget.is_over_budget(
                    _requisition(no_of_positions=1, status="Draft"), enabled=True
                )
            )
            self.assertFalse(
                budget.is_over_budget(_requisition(no_of_positions=1), enabled=False)
            )

    def test_a_stale_flag_on_a_closed_requisition_shows_no_banner(self):
        doc = _requisition(no_of_positions=1, status="Archived", custom_over_budget=1)
        with patch.object(budget, "is_enabled", return_value=True), _masters(self.OVER):
            self.assertFalse(budget.budget_status(doc)["over_budget"])

    def test_setting_is_off_until_its_field_is_migrated(self):
        with patch.object(budget, "SETTING_FIELD", "no_such_field"):
            self.assertFalse(budget.is_enabled())
