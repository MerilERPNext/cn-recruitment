"""Tests for the offer package (Fixed Pay / Variable Pay) on the Job Opening.

The package used to be named once per Campus Drive. It now lives on the Job Opening,
so a drive running several openings can pay differently for each, and a non-campus
hire gets the same treatment. This covers what the fields exist for: they prefill the
Job Offer raised for a candidate who applied to that opening (without overwriting a
negotiated amount), the same figures reach the form's prefill API, and the drive's
own opening rows mirror them.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_offer_package.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.customizations import job_offer as jo

PREFIX = "_Test Pkg"
FIXED, VARIABLE = 600000.0, 150000.0


class TestCampusOfferPackage(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.opening = cls._opening(FIXED, VARIABLE)
		cls.unpaid_opening = cls._opening(None, None, suffix=" Unpaid")
		cls.drive = cls._drive(cls.opening)
		cls.candidate = cls._applicant("pkg.cand@test.local", opening=cls.opening,
		                               drive=cls.drive)
		cls.walk_in = cls._applicant("pkg.walkin@test.local", opening=cls.unpaid_opening)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant", filters={"email_id": ("like", "pkg.%@test.local")},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Campus Drive", filters={"drive_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Campus Drive", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Job Opening", filters={"job_title": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Job Opening", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _opening(cls, fixed, variable, suffix=""):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening{suffix}",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0],
			"status": "Open", "fixed_pay": fixed, "variable_pay": variable,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _drive(cls, opening):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"linked_job_openings": [{"job_opening": opening}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _applicant(cls, email, opening=None, drive=None):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": email.split("@")[0],
			"email_id": email, "status": "Open", "job_title": opening,
			"source": "Campus Hiring" if drive else "Walk In",
			"custom_campus_drive": drive,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def _offer(self, applicant, **kwargs):
		"""An unsaved Job Offer — the hook is what's under test, not HRMS's insert path."""
		doc = frappe.get_doc({"doctype": "Job Offer", "job_applicant": applicant,
		                      "status": "Awaiting Response", "offer_date": nowdate(), **kwargs})
		doc.flags.ignore_mandatory = True
		return doc

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── the opening's package reaches the offer ──

	def test_the_opening_package_resolves_for_its_candidate(self):
		self.assertEqual(
			jo._job_opening_pay(self.candidate),
			{"custom_total_fixed_pay": FIXED, "custom_variable_incentive": VARIABLE})

	def test_a_candidate_off_an_unpaid_opening_gets_nothing(self):
		self.assertEqual(jo._job_opening_pay(self.walk_in), {})
		self.assertEqual(jo._job_opening_pay(None), {})

	def test_an_empty_field_on_the_opening_is_not_pushed(self):
		"""Half a package must not zero out the other half of the offer."""
		frappe.db.set_value("Job Opening", self.opening, "variable_pay", 0)
		self.assertEqual(jo._job_opening_pay(self.candidate),
		                 {"custom_total_fixed_pay": FIXED})

	def test_the_offer_is_prefilled_from_the_opening(self):
		doc = self._offer(self.candidate)
		jo.set_requisition_and_pay(doc)
		self.assertEqual(doc.custom_total_fixed_pay, FIXED)
		self.assertEqual(doc.custom_variable_incentive, VARIABLE)

	def test_a_negotiated_amount_is_never_overwritten(self):
		"""HR agreeing a different number with one candidate is the whole point of the
		field being editable — a later save must not put the opening's figure back."""
		doc = self._offer(self.candidate, custom_total_fixed_pay=725000)
		jo.set_requisition_and_pay(doc)
		self.assertEqual(doc.custom_total_fixed_pay, 725000)
		self.assertEqual(doc.custom_variable_incentive, VARIABLE)

	def test_an_offer_off_an_unpaid_opening_is_left_to_the_requisition(self):
		doc = self._offer(self.walk_in)
		jo.set_requisition_and_pay(doc)
		self.assertFalse(doc.get("custom_total_fixed_pay"))

	def test_the_form_prefill_returns_the_opening_package(self):
		pay = jo.get_requisition_defaults(self.candidate)["pay"]
		self.assertEqual(pay.get("custom_total_fixed_pay"), FIXED)
		self.assertEqual(pay.get("custom_variable_incentive"), VARIABLE)

	# ── the drive shows what its openings pay ──

	def test_the_drive_row_mirrors_the_opening_package(self):
		"""`Campus Drive Job Opening` fetches the pay from the opening, so a drive
		reads as the sum of what its openings offer rather than a figure of its own."""
		row = frappe.get_doc("Campus Drive", self.drive).linked_job_openings[0]
		self.assertEqual(row.fixed_pay, FIXED)
		self.assertEqual(row.variable_pay, VARIABLE)

	def test_the_drive_no_longer_carries_a_package_of_its_own(self):
		meta = frappe.get_meta("Campus Drive")
		for fieldname in ("fixed_pay", "variable_pay", "offer_package_section"):
			self.assertIsNone(meta.get_field(fieldname), fieldname)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_offer_package.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusOfferPackage)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
