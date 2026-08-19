"""Tests for the per-institute registration lock on a campus invite.

One invite carries several colleges, and HR schedules them into drives sized by
candidate count — a 200-candidate college runs on its own, two 100s get merged. So
the invite's Registration Expiry Date cannot be the whole story: it is one date for
every college, while the colleges are scheduled at different times.

The rule these tests pin down: a college's registration closes when ITS OWN campus
drive goes live. A Draft drive does not close anything (HR is still assembling it),
and the colleges with no drive yet carry on registering against the same invite —
which is also why HR can extend the deadline after the invite is submitted.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_institute_lock.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

PREFIX = "_Test Lock"
TPO_A = "lock.tpo.a@test.local"
TPO_B = "lock.tpo.b@test.local"
COUNTER = {"n": 0}


class TestCampusInstituteLock(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.tpo_a = cls._tpo_user(TPO_A, "Lock TPO A")
		cls.tpo_b = cls._tpo_user(TPO_B, "Lock TPO B")
		cls.institute_a = cls._institute("A", TPO_A, "Lock TPO A")
		cls.institute_b = cls._institute("B", TPO_B, "Lock TPO B")
		cls.opening = frappe.get_all("Job Opening", pluck="name", limit=1)
		cls.invite = cls._invite()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Campus Drive",
		                           filters={"drive_name": ("like", f"{PREFIX}%")}, pluck="name"):
			frappe.delete_doc("Campus Drive", name, force=True, ignore_permissions=True)
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
		for email in (TPO_A, TPO_B):
			if frappe.db.exists("User", email):
				frappe.delete_doc("User", email, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _tpo_user(cls, email, full_name):
		"""TPO and nothing else — someone who also holds HR Manager counts as HR."""
		if not frappe.db.exists("User", email):
			frappe.get_doc({"doctype": "User", "email": email, "first_name": full_name,
			                "enabled": 1, "send_welcome_email": 0,
			                "roles": [{"role": "TPO"}]}).insert(ignore_permissions=True)
		return email

	@classmethod
	def _institute(cls, suffix, tpo_email, tpo_name):
		doc = frappe.get_doc({
			"doctype": "Institute", "institute_name": f"{PREFIX} College {suffix}",
			"tier": "Tier-1", "is_active": 1,
			"tpo_contacts": [{"contact_name": tpo_name, "role": "Primary TPO", "email": tpo_email}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		"""One invite, two colleges — the shape the whole feature exists for."""
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": cls.institute_a}, {"institute": cls.institute_b}],
			"job_openings": [{"job_opening": cls.opening[0]}] if cls.opening else [],
			"registration_expiry_date": add_days(nowdate(), 30),
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

	def _drive(self, institutes, *, live=True, name=None):
		"""A drive on this invite covering `institutes`. Status follows the window, so
		`live=False` gives a Draft by dating it in the future."""
		COUNTER["n"] += 1
		start = add_days(nowdate(), -1 if live else 7)
		doc = frappe.get_doc({
			"doctype": "Campus Drive",
			"drive_name": name or f"{PREFIX} Drive {COUNTER['n']}",
			"drive_owner": "Administrator",
			"drive_start_date": start,
			"drive_end_date": add_days(start, 20),
			"fixed_pay": 500000, "variable_pay": 0,
			"campus_invites": [{"campus_invite": self.invite}],
			"participating_institutes": [{"institute": i} for i in institutes],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc

	def _register(self, institute, user=None):
		"""One registration for `institute`, unique candidate each time."""
		COUNTER["n"] += 1
		n = COUNTER["n"]
		if user:
			frappe.set_user(user)
		doc = frappe.get_doc({
			"doctype": "Candidate Registration", "campus_invite": self.invite,
			"institute": institute, "registration_name": f"{PREFIX} {n}",
			"candidates": [{"first_name": f"Lock{n}", "last_name": "Cand",
			                "email_id": f"lock.cand{n}@test.local",
			                "mobile_number": f"9222{n:06d}"}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc

	def _card(self, user):
		frappe.set_user(user)
		from recruitment.recruitment.tpo_portal import get_my_campus_drives

		return next((d for d in get_my_campus_drives() if d["name"] == self.invite), None)

	# ── the lock closes one college, not the invite ──

	def test_a_live_drive_closes_only_its_own_college(self):
		"""The whole point: A is scheduled and frozen, B has no drive yet and carries on
		against the very same invite."""
		self._drive([self.institute_a])

		frappe.set_user(self.tpo_a)
		with self.assertRaises(frappe.ValidationError) as caught:
			self._register(self.institute_a)
		self.assertIn("already live", str(caught.exception).lower())

		frappe.set_user(self.tpo_b)
		self.assertTrue(self._register(self.institute_b))

	def test_a_draft_drive_closes_nobody(self):
		"""HR routinely builds a draft drive and moves colleges between them while
		sizing the batches — that must not stop anyone registering."""
		drive = self._drive([self.institute_a], live=False)
		self.assertEqual(drive.drive_status, "Draft")

		frappe.set_user(self.tpo_a)
		self.assertTrue(self._register(self.institute_a))

	def test_a_merged_drive_closes_both_of_its_colleges(self):
		"""Two small colleges run as one drive — going live freezes both."""
		self._drive([self.institute_a, self.institute_b])

		for user, institute in ((self.tpo_a, self.institute_a), (self.tpo_b, self.institute_b)):
			frappe.set_user(user)
			with self.assertRaises(frappe.ValidationError):
				self._register(institute)

	def test_hr_may_still_register_for_a_live_college(self):
		"""Same call HR gets on the deadline: they are the ones who add the candidate
		the college missed, so they are warned rather than blocked."""
		self._drive([self.institute_a])
		self.assertTrue(self._register(self.institute_a))  # as Administrator

	def test_the_lock_survives_an_edit_of_an_existing_registration(self):
		"""Validation, not a create-time check: a saved draft cannot be topped up after
		the college's drive has gone live either."""
		frappe.set_user(self.tpo_a)
		doc = self._register(self.institute_a)

		frappe.set_user("Administrator")
		self._drive([self.institute_a])

		frappe.set_user(self.tpo_a)
		doc = frappe.get_doc("Candidate Registration", doc.name)
		doc.append("candidates", {"first_name": "Late", "last_name": "One",
		                          "email_id": "lock.late@test.local",
		                          "mobile_number": "9222999999"})
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)

	def test_a_completed_drive_stays_closed(self):
		"""Completed is past Live, not back before it."""
		drive = self._drive([self.institute_a])
		frappe.db.set_value("Campus Drive", drive.name, "drive_status", "Completed")

		frappe.set_user(self.tpo_a)
		with self.assertRaises(frappe.ValidationError):
			self._register(self.institute_a)

	# ── what the TPO sees ──

	def test_the_tpo_desk_closes_the_scheduled_college_only(self):
		self._drive([self.institute_a])

		card_a = self._card(self.tpo_a)
		self.assertTrue(card_a["registration_closed"])
		self.assertEqual(card_a["closed_reason"], "drive_live")

		card_b = self._card(self.tpo_b)
		self.assertFalse(card_b["registration_closed"])
		self.assertIsNone(card_b["closed_reason"])
		self.assertEqual(card_b["open_institutes"], [self.institute_b])

	def test_the_tpo_desk_names_the_drive_that_closed_it(self):
		drive = self._drive([self.institute_a])
		card = self._card(self.tpo_a)
		self.assertEqual(
			[r["campus_drive"] for r in card["locked_institutes"]], [drive.name])

	def test_a_passed_deadline_is_reported_as_a_deadline_not_a_drive(self):
		"""The two reasons are not interchangeable — HR can extend a deadline."""
		frappe.db.set_value("Campus Invite", self.invite, "registration_expiry_date",
		                    add_days(nowdate(), -1))
		card = self._card(self.tpo_a)
		self.assertTrue(card["registration_closed"])
		self.assertEqual(card["closed_reason"], "deadline")

	# ── the drive picks its colleges ──

	def test_a_drive_no_longer_copies_the_invites_colleges(self):
		"""HR chooses them — a copied-in list is what made a per-college drive
		impossible to build."""
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive Empty",
			"drive_owner": "Administrator",
			"drive_start_date": add_days(nowdate(), 7),
			"drive_end_date": add_days(nowdate(), 20),
			"fixed_pay": 500000, "variable_pay": 0,
			"campus_invites": [{"campus_invite": self.invite}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		self.assertEqual(doc.participating_institutes, [])

	def test_a_college_on_a_live_drive_cannot_be_put_on_another(self):
		self._drive([self.institute_a])
		with self.assertRaises(frappe.ValidationError) as caught:
			self._drive([self.institute_a, self.institute_b])
		self.assertIn("already running on a live drive", str(caught.exception).lower())

	def test_a_college_on_a_draft_drive_may_move_to_another(self):
		"""Sizing the batches means shuffling colleges between drafts."""
		self._drive([self.institute_a], live=False)
		self.assertTrue(self._drive([self.institute_a], live=False))

	def test_two_draft_drives_on_one_college_are_flagged_not_refused(self):
		"""Both drafts go live by the calendar, not by a save, so nothing re-checks them
		then — HR is told while there is still a draft to fix."""
		self._drive([self.institute_a], live=False)
		messages_before = len(frappe.local.message_log or [])
		self.assertTrue(self._drive([self.institute_a], live=False))
		said = " ".join(str(m) for m in (frappe.local.message_log or [])[messages_before:])
		self.assertIn("draft drive", said.lower())

	def test_a_drive_may_be_re_saved_without_blocking_itself(self):
		drive = self._drive([self.institute_a])
		drive.reload()
		drive.drive_end_date = add_days(drive.drive_end_date, 1)
		drive.flags.ignore_mandatory = True
		drive.save(ignore_permissions=True)
		self.assertEqual(drive.drive_status, "Live")

	def test_a_drive_refuses_a_college_its_invites_never_invited(self):
		outsider = self._institute("Outsider", "lock.tpo.c@test.local", "Lock TPO C")
		with self.assertRaises(frappe.ValidationError) as caught:
			self._drive([outsider])
		self.assertIn("not invited", str(caught.exception).lower())

	def test_a_drive_refuses_the_same_college_twice(self):
		with self.assertRaises(frappe.ValidationError) as caught:
			self._drive([self.institute_a, self.institute_a])
		self.assertIn("twice", str(caught.exception).lower())

	def test_the_picker_offers_only_the_colleges_still_free(self):
		self._drive([self.institute_a])
		from recruitment.recruitment.doctype.campus_drive.campus_drive import drive_institute_query

		offered = [row[0] for row in drive_institute_query(
			"Institute", "", "name", 0, 20, {"campus_invites": [self.invite]})]
		self.assertNotIn(self.institute_a, offered)
		self.assertIn(self.institute_b, offered)

	# ── the deadline is editable after submit ──

	def test_hr_may_extend_the_deadline_on_a_submitted_invite(self):
		"""It is the colleges still waiting for a drive that need the extra time, and
		the invite is long since submitted by then."""
		self.assertTrue(frappe.get_meta("Campus Invite")
		                .get_field("registration_expiry_date").allow_on_submit)

		doc = frappe.get_doc("Campus Invite", self.invite)
		doc.registration_expiry_date = add_days(nowdate(), 60)
		doc.save(ignore_permissions=True)
		self.assertEqual(str(doc.registration_expiry_date), add_days(nowdate(), 60))

	def test_the_deadline_cannot_be_moved_into_the_past(self):
		"""That would close the remaining colleges retroactively — the opposite of why
		the field is editable."""
		doc = frappe.get_doc("Campus Invite", self.invite)
		doc.registration_expiry_date = add_days(nowdate(), -1)
		with self.assertRaises(frappe.ValidationError) as caught:
			doc.save(ignore_permissions=True)
		self.assertIn("past", str(caught.exception).lower())

	def test_the_deadline_may_still_be_extended_while_one_college_is_live(self):
		"""A live drive at A says nothing about B, which is the college the new date is
		for."""
		self._drive([self.institute_a])
		doc = frappe.get_doc("Campus Invite", self.invite)
		doc.registration_expiry_date = add_days(nowdate(), 45)
		doc.save(ignore_permissions=True)
		self.assertEqual(str(doc.registration_expiry_date), add_days(nowdate(), 45))

	def test_the_deadline_is_frozen_once_every_college_is_live(self):
		"""Nothing left for a date to apply to."""
		self._drive([self.institute_a, self.institute_b])
		doc = frappe.get_doc("Campus Invite", self.invite)
		doc.registration_expiry_date = add_days(nowdate(), 45)
		with self.assertRaises(frappe.ValidationError) as caught:
			doc.save(ignore_permissions=True)
		self.assertIn("live campus drive", str(caught.exception).lower())


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_institute_lock.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusInstituteLock)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
