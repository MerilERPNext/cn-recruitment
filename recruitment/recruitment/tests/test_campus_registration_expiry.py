"""Tests for the Campus Invite's registration deadline.

A TPO may not register candidates against an invite once its Registration Expiry
Date has passed — otherwise registrations trickle in for weeks against a college
list HR has already worked through. HR is not blocked (they are who would extend
the date), but they are told they are past it.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_registration_expiry.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

PREFIX = "_Test Expiry"
TPO = "expiry.tpo@test.local"
COUNTER = {"n": 0}


class TestCampusRegistrationExpiry(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.tpo = cls._tpo_user()
		cls.institute = cls._institute()
		cls.opening = frappe.get_all("Job Opening", pluck="name", limit=1)
		cls.invite = cls._invite()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Candidate Registration",
		                           filters={"registration_name": ("like", f"{PREFIX}%")}, pluck="name"):
			doc = frappe.get_doc("Candidate Registration", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Candidate Registration", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Campus Invite",
		                           filters={"campus_invite_name": ("like", f"{PREFIX}%")}, pluck="name"):
			doc = frappe.get_doc("Campus Invite", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Campus Invite", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Institute", filters={"institute_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Institute", name, force=True, ignore_permissions=True)
		if frappe.db.exists("User", TPO):
			frappe.delete_doc("User", TPO, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _tpo_user(cls):
		"""TPO and nothing else — someone who also holds HR Manager counts as HR."""
		if not frappe.db.exists("User", TPO):
			frappe.get_doc({"doctype": "User", "email": TPO, "first_name": "Expiry TPO",
			                "enabled": 1, "send_welcome_email": 0,
			                "roles": [{"role": "TPO"}]}).insert(ignore_permissions=True)
		return TPO

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({
			"doctype": "Institute", "institute_name": f"{PREFIX} College", "tier": "Tier-1",
			"is_active": 1,
			"tpo_contacts": [{"contact_name": "Expiry TPO", "role": "Primary TPO", "email": TPO}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": cls.institute}],
			"job_openings": [{"job_opening": cls.opening[0]}] if cls.opening else [],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── helpers ──

	def _expiry(self, days=None):
		frappe.db.set_value("Campus Invite", self.invite, "registration_expiry_date",
		                    None if days is None else add_days(nowdate(), days))

	def _second_invite(self):
		"""Another submitted invite on the same institute, to try moving one onto."""
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite 2",
			"institutes": [{"institute": self.institute}],
			"job_openings": [{"job_opening": self.opening[0]}] if self.opening else [],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	def _register(self):
		"""One registration, unique candidate each time (a candidate may not be
		registered twice)."""
		COUNTER["n"] += 1
		n = COUNTER["n"]
		doc = frappe.get_doc({
			"doctype": "Candidate Registration", "campus_invite": self.invite,
			"institute": self.institute, "registration_name": f"{PREFIX} {n}",
			"candidates": [{"first_name": f"Cand{n}", "last_name": "Expiry",
			                "email_id": f"expiry.cand{n}@test.local",
			                "mobile_number": f"9111{n:06d}"}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name

	# ── the deadline ──

	def test_a_tpo_may_register_when_there_is_no_deadline(self):
		self._expiry(None)
		frappe.set_user(self.tpo)
		self.assertTrue(self._register())

	def test_a_tpo_may_register_before_the_deadline(self):
		self._expiry(3)
		frappe.set_user(self.tpo)
		self.assertTrue(self._register())

	def test_the_deadline_day_itself_is_still_open(self):
		"""Expiry is the last day allowed, not the first day blocked."""
		self._expiry(0)
		frappe.set_user(self.tpo)
		self.assertTrue(self._register())

	def test_a_tpo_is_blocked_after_the_deadline(self):
		self._expiry(-1)
		frappe.set_user(self.tpo)
		with self.assertRaises(frappe.ValidationError) as caught:
			self._register()
		self.assertIn("closed", str(caught.exception).lower())

	def test_hr_may_still_register_after_the_deadline(self):
		"""HR extends the date and fixes the college's misses — blocking them would
		leave nobody able to add a candidate the TPO forgot."""
		self._expiry(-1)
		self.assertTrue(self._register())  # as Administrator

	def test_the_block_survives_an_edit_of_an_existing_registration(self):
		"""Validation, not a create-time check: a saved draft cannot be reopened and
		topped up after the deadline either."""
		self._expiry(3)
		frappe.set_user(self.tpo)
		name = self._register()

		frappe.set_user("Administrator")
		self._expiry(-1)
		frappe.set_user(self.tpo)
		doc = frappe.get_doc("Candidate Registration", name)
		doc.append("candidates", {"first_name": "Late", "last_name": "One",
		                          "email_id": "late.one@test.local",
		                          "mobile_number": "9111999999"})
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)

	# ── the invite is read-only to a TPO ──

	def test_a_tpo_cannot_move_a_registration_to_another_invite(self):
		"""The drive is chosen for them. Re-pointing a saved registration would carry a
		college's candidates onto another drive."""
		self._expiry(None)
		frappe.set_user(self.tpo)
		name = self._register()

		frappe.set_user("Administrator")
		other = self._second_invite()
		frappe.set_user(self.tpo)
		doc = frappe.get_doc("Candidate Registration", name)
		doc.campus_invite = other
		doc.flags.ignore_mandatory = True
		with self.assertRaises(frappe.ValidationError) as caught:
			doc.save(ignore_permissions=True)
		self.assertIn("cannot be changed", str(caught.exception))

	def test_a_tpo_may_still_edit_the_candidates_on_it(self):
		"""Only the invite is fixed — the registration itself stays theirs to work on."""
		self._expiry(None)
		frappe.set_user(self.tpo)
		name = self._register()
		doc = frappe.get_doc("Candidate Registration", name)
		doc.candidates[0].first_name = "EditedByTPO"
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertEqual(
			frappe.db.get_value("Candidate Registration Detail", doc.candidates[0].name,
			                    "first_name"), "EditedByTPO")

	def test_hr_may_re_point_a_registration(self):
		self._expiry(None)
		name = self._register()  # as Administrator
		other = self._second_invite()
		doc = frappe.get_doc("Candidate Registration", name)
		doc.campus_invite = other
		doc.institute = frappe.get_all("Campus Invite Institute", filters={"parent": other},
		                               pluck="institute")[0]
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertEqual(doc.campus_invite, other)

	def test_a_tpo_cannot_edit_the_campus_invite_record(self):
		"""Read-only at the doctype level — the invite's own name included."""
		self.assertTrue(frappe.has_permission("Campus Invite", "read", user=self.tpo))
		self.assertFalse(frappe.has_permission("Campus Invite", "write", user=self.tpo))
		self.assertFalse(frappe.has_permission("Campus Invite", "create", user=self.tpo))

	def test_the_invite_name_field_is_read_only_for_everyone(self):
		"""It is fetched from the invite, so nobody types into it."""
		self.assertTrue(frappe.get_meta("Candidate Registration")
		                .get_field("campus_invite_name").read_only)

	# ── what the TPO sees ──

	def test_the_tpo_desk_shows_the_deadline(self):
		self._expiry(2)
		frappe.set_user(self.tpo)
		from recruitment.recruitment.tpo_portal import get_my_campus_drives

		card = next((d for d in get_my_campus_drives() if d["name"] == self.invite), None)
		self.assertIsNotNone(card, "the TPO should see their own invite")
		self.assertEqual(card["registration_expiry_date"], add_days(nowdate(), 2))
		self.assertFalse(card["registration_closed"])

	def test_the_tpo_desk_flags_a_closed_drive(self):
		self._expiry(-1)
		frappe.set_user(self.tpo)
		from recruitment.recruitment.tpo_portal import get_my_campus_drives

		card = next((d for d in get_my_campus_drives() if d["name"] == self.invite), None)
		self.assertTrue(card["registration_closed"])


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_registration_expiry.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusRegistrationExpiry)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
