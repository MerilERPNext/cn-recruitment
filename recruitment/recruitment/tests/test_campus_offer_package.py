"""Tests for the Campus Drive's Offer Package (Fixed Pay / Variable Pay).

Covers the two things the fields exist for: they prefill the Job Offer raised for a
candidate who came off that drive (without overwriting a negotiated amount), and they
are permlevel-1 — visible only to the HR roles granted level-1 access, not to everyone
who can open a drive.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_offer_package.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.customizations import job_offer as jo

PREFIX = "_Test Pkg"
PAY_USER = "pkg.hr@test.local"        # holds a role with level-1 access
PLAIN_USER = "pkg.plain@test.local"   # can open the drive, must not see the package
FIXED, VARIABLE = 600000.0, 150000.0


def _user(email, role):
	if not frappe.db.exists("User", email):
		frappe.get_doc({"doctype": "User", "email": email, "first_name": "Pkg",
		                "enabled": 1, "send_welcome_email": 0,
		                "roles": [{"role": role}]}).insert(ignore_permissions=True)
	return email


class TestCampusOfferPackage(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.drive = cls._drive()
		cls.candidate = cls._applicant("pkg.cand@test.local", drive=cls.drive)
		cls.walk_in = cls._applicant("pkg.walkin@test.local")
		cls.pay_user = _user(PAY_USER, "HR User")
		cls.plain_user = _user(PLAIN_USER, "Recruitment User")
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
		frappe.db.commit()

	@classmethod
	def _drive(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"fixed_pay": FIXED, "variable_pay": VARIABLE,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _applicant(cls, email, drive=None):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": email.split("@")[0],
			"email_id": email, "status": "Open",
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

	# ── the drive's package reaches the offer ──

	def test_the_drive_package_resolves_for_its_candidate(self):
		self.assertEqual(
			jo._campus_drive_pay(self.candidate),
			{"custom_total_fixed_pay": FIXED, "custom_variable_incentive": VARIABLE})

	def test_a_candidate_off_no_drive_gets_nothing(self):
		self.assertEqual(jo._campus_drive_pay(self.walk_in), {})
		self.assertEqual(jo._campus_drive_pay(None), {})

	def test_an_empty_field_on_the_drive_is_not_pushed(self):
		"""Half a package must not zero out the other half of the offer."""
		frappe.db.set_value("Campus Drive", self.drive, "variable_pay", 0)
		self.assertEqual(jo._campus_drive_pay(self.candidate),
		                 {"custom_total_fixed_pay": FIXED})

	def test_the_offer_is_prefilled_from_the_drive(self):
		doc = self._offer(self.candidate)
		jo.set_requisition_and_pay(doc)
		self.assertEqual(doc.custom_total_fixed_pay, FIXED)
		self.assertEqual(doc.custom_variable_incentive, VARIABLE)

	def test_a_negotiated_amount_is_never_overwritten(self):
		"""HR agreeing a different number with one candidate is the whole point of the
		field being editable — a later save must not put the drive's figure back."""
		doc = self._offer(self.candidate, custom_total_fixed_pay=725000)
		jo.set_requisition_and_pay(doc)
		self.assertEqual(doc.custom_total_fixed_pay, 725000)
		self.assertEqual(doc.custom_variable_incentive, VARIABLE)

	def test_a_non_campus_offer_is_left_to_the_requisition(self):
		doc = self._offer(self.walk_in)
		jo.set_requisition_and_pay(doc)
		self.assertFalse(doc.get("custom_total_fixed_pay"))

	def test_the_form_prefill_returns_the_drive_package(self):
		pay = jo.get_requisition_defaults(self.candidate)["pay"]
		self.assertEqual(pay.get("custom_total_fixed_pay"), FIXED)
		self.assertEqual(pay.get("custom_variable_incentive"), VARIABLE)

	# ── who can see it ──

	def test_the_pay_fields_sit_behind_permlevel_1(self):
		meta = frappe.get_meta("Campus Drive")
		for fieldname in ("fixed_pay", "variable_pay", "offer_package_section"):
			self.assertEqual(meta.get_field(fieldname).permlevel, 1, fieldname)

	def test_an_hr_role_can_read_the_package(self):
		frappe.set_user(self.pay_user)
		drive = frappe.get_doc("Campus Drive", self.drive)
		self.assertTrue(drive.has_permlevel_access_to("fixed_pay"))
		self.assertTrue(drive.has_permlevel_access_to("variable_pay"))

	def test_another_role_with_drive_access_cannot(self):
		"""Recruitment User can open a Campus Drive — the salary on it is not theirs."""
		frappe.set_user(self.plain_user)
		drive = frappe.get_doc("Campus Drive", self.drive)
		self.assertFalse(drive.has_permlevel_access_to("fixed_pay"))
		self.assertFalse(drive.has_permlevel_access_to("variable_pay"))
		# ... while the ordinary fields on the same drive stay readable
		self.assertTrue(drive.has_permlevel_access_to("drive_name"))

	def test_every_named_hr_role_is_granted(self):
		roles = {p.role for p in frappe.get_meta("Campus Drive").permissions
		         if p.permlevel == 1 and p.read}
		for role in ("System Manager", "HR Manager", "HR User", "Hiring Lead"):
			if frappe.db.exists("Role", role):
				self.assertIn(role, roles)


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
