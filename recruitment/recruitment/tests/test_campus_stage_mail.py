"""Tests for the stage-change email a candidate gets as they move through rounds.

A campus drive walks a hall of students through several rounds in a day, so this
mail is off for campus candidates (Campus Settings → Notify Campus Candidates on
Stage Change) and unchanged for everyone else. What is pinned here is exactly that
split, and that the setting genuinely turns it back on.

`frappe.sendmail` is replaced throughout — no test reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_stage_mail.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api import hiring_stage as hs

PREFIX = "_Test StageMail"
SETTING = "notify_campus_candidates_on_stage_change"
SITE_SWITCH = "disable_stage_change_email"
STAGE = {"stage_name": "Technical Round 1", "stage_type": "Interview", "notify": 1, "auto": 1}


class TestCampusStageMail(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.drive = cls._drive()
		cls.campus = cls._applicant("stagemail.campus@test.local", drive=cls.drive)
		cls.lateral = cls._applicant("stagemail.lateral@test.local")
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant",
		                           filters={"email_id": ("like", "stagemail.%@test.local")},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Campus Drive", filters={"drive_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Campus Drive", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _drive(cls):
		from frappe.utils import add_days, nowdate

		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
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

	def setUp(self):
		frappe.set_user("Administrator")
		self.sent = []
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: self.sent.append(kw)
		frappe.db.set_single_value("Campus Settings", SETTING, 0)
		# Pinned off so these tests describe the per-stage behaviour on any site,
		# including one that has the site-wide switch turned on.
		frappe.db.set_single_value("Recruitment Settings", SITE_SWITCH, 0)

	def tearDown(self):
		frappe.sendmail = self._real_sendmail
		frappe.db.rollback()

	def _notify(self, applicant):
		hs._notify_stage_entry(frappe.get_doc("Job Applicant", applicant), STAGE)

	# ── the split ──

	def test_a_campus_candidate_is_not_mailed_between_rounds(self):
		self._notify(self.campus)
		self.assertEqual(self.sent, [])

	def test_a_lateral_candidate_still_is(self):
		"""Only campus hiring changed — the rest of recruitment keeps its stage mail."""
		self._notify(self.lateral)
		self.assertEqual(len(self.sent), 1)
		self.assertIn("stagemail.lateral@test.local", self.sent[0]["recipients"])

	def test_the_setting_turns_it_back_on(self):
		frappe.db.set_single_value("Campus Settings", SETTING, 1)
		self._notify(self.campus)
		self.assertEqual(len(self.sent), 1)

	def test_a_candidate_on_an_invite_but_no_drive_counts_as_campus(self):
		"""They arrive on the invite before a drive picks them up — the mail must be
		off from the start, not from whenever the drive is created."""
		applicant = frappe.get_doc("Job Applicant", self.lateral)
		applicant.db_set("custom_campus_invite",
		                 frappe.get_all("Campus Invite", pluck="name", limit=1)[0]
		                 if frappe.db.count("Campus Invite") else None)
		if not applicant.get("custom_campus_invite"):
			self.skipTest("no Campus Invite on this site")
		self._notify(self.lateral)
		self.assertEqual(self.sent, [])

	# ── the guard itself ──

	def test_the_guard_reads_the_setting_per_candidate(self):
		self.assertTrue(hs._campus_stage_mail_allowed(frappe.get_doc("Job Applicant", self.lateral)))
		self.assertFalse(hs._campus_stage_mail_allowed(frappe.get_doc("Job Applicant", self.campus)))
		frappe.db.set_single_value("Campus Settings", SETTING, 1)
		self.assertTrue(hs._campus_stage_mail_allowed(frappe.get_doc("Job Applicant", self.campus)))

	def test_a_stage_that_does_not_notify_mails_nobody(self):
		"""The opening's own Notify box still rules: this only narrows it further."""
		from recruitment.api.hiring_stage import _enter_stage

		quiet = dict(STAGE, notify=0)
		doc = frappe.get_doc("Job Applicant", self.lateral)
		_enter_stage(doc, quiet, result="test", save=False, ignore_permissions=True)
		self.assertEqual(self.sent, [])

	# ── the site-wide switch (Recruitment Settings) ──

	def test_the_site_wide_switch_stops_the_mail_for_everyone(self):
		frappe.db.set_single_value("Recruitment Settings", SITE_SWITCH, 1)
		frappe.db.set_single_value("Campus Settings", SETTING, 1)
		self._notify(self.lateral)
		self._notify(self.campus)
		self.assertEqual(self.sent, [])

	def test_the_site_wide_switch_overrides_a_stage_that_notifies(self):
		from recruitment.api.hiring_stage import _enter_stage

		frappe.db.set_single_value("Recruitment Settings", SITE_SWITCH, 1)
		doc = frappe.get_doc("Job Applicant", self.lateral)
		_enter_stage(doc, STAGE, result="test", save=False, ignore_permissions=True)
		self.assertEqual(self.sent, [])

	def test_an_untouched_site_keeps_sending(self):
		"""Unset reads as 0, which must mean 'send' — no site loses the mail on upgrade."""
		frappe.db.delete("Singles", {"doctype": "Recruitment Settings", "field": SITE_SWITCH})
		self.assertFalse(hs._stage_mail_disabled_site_wide())
		self._notify(self.lateral)
		self.assertEqual(len(self.sent), 1)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_stage_mail.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusStageMail)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
