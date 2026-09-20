"""Tests for the campus interview-panel assignment email.

The point of the feature is the grouping: a drive deals one panelist five
candidates in a single click, and they must get ONE mail listing all five, not
five mails. So that is what is pinned here — end to end through
`schedule_round_interviews`, not against the mailer in isolation.

Also pinned: with Campus Settings -> Send Interview Panel Email off (the default)
nothing is sent at all, nobody is ever mailed twice about the same interview, and
a reassignment writes to the new panelist only.

`frappe.sendmail` is replaced throughout — no test ever reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_panel_mailers.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment import campus_panel_mailers as pm
from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test Panel Mail"
STAGE = "Technical Round 1"
EMAIL_LIKE = "panelmail.cand%@test.local"
CANDIDATES = 5


class TestCampusPanelMailers(FrappeTestCase):
	# ── fixtures ──

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		pm.ensure_default_email_template()
		# Two panelists with User logins: one to deal everybody to, one to move a
		# candidate to.
		cls.employees = frappe.get_all(
			"Employee", filters={"user_id": ["!=", ""], "status": "Active"},
			pluck="name", limit=2, order_by="name asc")
		cls.users = [frappe.db.get_value("Employee", e, "user_id") for e in cls.employees]
		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive = cls._drive()
		cls.round_code = frappe.get_all(
			"Campus Drive Round", filters={"parent": cls.drive, "hiring_stage": STAGE},
			pluck="round_code")[0]
		cls.candidates = [cls._applicant(i) for i in range(CANDIDATES)]
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		# The mailer commits, so the toggle has to be put back explicitly — a
		# rollback cannot undo it.
		frappe.db.set_single_value("Campus Settings", pm.ENABLED_FIELD, 0)
		frappe.db.commit()
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant", filters={"email_id": ("like", EMAIL_LIKE)},
		                            pluck="name")
		for name in frappe.get_all("Interview",
		                           filters={"job_applicant": ("in", applicants or [""])},
		                           pluck="name"):
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, field in (("Campus Drive", "drive_name"), ("Campus Invite", "campus_invite_name"),
		                       ("Job Opening", "job_title"), ("Institute", "institute_name")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"{PREFIX}%")}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "P TPO", "role": "Primary TPO",
		                                        "email": "panelmail.tpo@test.local"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_hiring_stages": [{"stage_name": STAGE, "stage_type": "Interview",
			                          "owner_role": "System", "notify": 0, "auto": 1}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": cls.institute}],
			"job_openings": [{"job_opening": cls.opening}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	@classmethod
	def _drive(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"campus_invites": [{"campus_invite": cls.invite}],
			"participating_institutes": [{"institute": cls.institute}],
			"rounds": [{"round_name": STAGE, "round_type": "Technical", "hiring_stage": STAGE}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name

	@classmethod
	def _applicant(cls, i):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": f"{PREFIX} Cand {i}",
			"email_id": f"panelmail.cand{i}@test.local", "status": "Open",
			"source": "Campus Hiring", "job_title": cls.opening,
			"custom_campus_invite": cls.invite, "custom_campus_drive": cls.drive,
			"custom_institute": cls.institute, "custom_current_stage": STAGE,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")
		self.sent = []
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: self.sent.append(kw)

		# Scheduling commits, so interviews outlive the per-test rollback.
		self._clear_interviews()
		for name in self.candidates:
			frappe.db.set_value("Job Applicant", name,
			                    {"custom_current_stage": STAGE, "status": "Open"},
			                    update_modified=False)
		self._enable(True)
		frappe.db.commit()

	def tearDown(self):
		frappe.sendmail = self._real_sendmail
		frappe.set_user("Administrator")
		self._clear_interviews()
		self._enable(False)
		frappe.db.commit()
		frappe.db.rollback()

	# ── helpers ──

	def _enable(self, on):
		frappe.db.set_single_value("Campus Settings", pm.ENABLED_FIELD, 1 if on else 0)

	def _clear_interviews(self):
		for name in frappe.get_all("Interview", filters={"custom_campus_drive": self.drive},
		                           pluck="name"):
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		frappe.db.commit()

	def _panels(self, count):
		"""`count` panels, one panelist each — the drive deals round-robin across them."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		for i, employee in enumerate(self.employees[:count]):
			doc.append("round_panelists", {"round_code": self.round_code,
			                               "panel_name": f"Panel {i + 1}", "panelist": employee})
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _schedule(self, applicants=None):
		return cd.schedule_round_interviews(self.drive, self.round_code, scheduled_on=nowdate(),
		                                    applicants=applicants or self.candidates)

	def _mail_to(self, user):
		email = frappe.db.get_value("User", user, "email") or user
		return [m for m in self.sent if email in (m.get("recipients") or [])]

	def _notified_rows(self):
		ivs = frappe.get_all("Interview", filters={"custom_campus_drive": self.drive}, pluck="name")
		return frappe.get_all("Interview Detail",
		                      filters={"parent": ["in", ivs or [""]], pm.NOTIFIED_FIELD: 1},
		                      fields=["parent", "interviewer"])

	# ── one panelist, many candidates: ONE mail ──

	def test_one_mail_lists_every_candidate(self):
		self._panels(1)
		result = self._schedule()
		self.assertEqual(result["created"], CANDIDATES)

		self.assertEqual(len(self.sent), 1, "one panelist must get exactly one mail")
		message = self.sent[0]["message"]
		for name in self.candidates:
			applicant_name = frappe.db.get_value("Job Applicant", name, "applicant_name")
			self.assertIn(applicant_name, message)

	def test_every_assignment_row_is_stamped(self):
		self._panels(1)
		self._schedule()
		self.assertEqual(len(self._notified_rows()), CANDIDATES)

	def test_mail_reports_the_count(self):
		self._panels(1)
		result = self._schedule()
		self.assertEqual(result["notified"]["mailed"], CANDIDATES)
		self.assertEqual(result["notified"]["interviewers"], 1)

	# ── two panelists: one mail each, with their own candidates ──

	def test_each_panelist_gets_only_their_own(self):
		self._panels(2)
		self._schedule()

		self.assertEqual(len(self.sent), 2)
		for user in self.users:
			mails = self._mail_to(user)
			self.assertEqual(len(mails), 1, f"{user} should get exactly one mail")

		# Every candidate appears in exactly one of the two mails.
		for name in self.candidates:
			applicant_name = frappe.db.get_value("Job Applicant", name, "applicant_name")
			hits = [m for m in self.sent if applicant_name in m["message"]]
			self.assertEqual(len(hits), 1, f"{applicant_name} must be listed once")

	# ── never twice ──

	def test_second_run_mails_nobody(self):
		self._panels(1)
		self._schedule()
		self.sent.clear()

		self.assertEqual(pm.notify_panel(
			frappe.get_all("Interview", filters={"custom_campus_drive": self.drive}, pluck="name")
		)["mailed"], 0)
		self.assertEqual(self.sent, [])

	# ── the toggle ──

	def test_nothing_is_sent_when_the_setting_is_off(self):
		self._enable(False)
		frappe.db.commit()
		self._panels(1)
		self._schedule()

		self.assertEqual(self.sent, [])
		self.assertEqual(self._notified_rows(), [])

	# ── reassignment ──

	def test_reassignment_mails_the_new_panelist_only(self):
		self._panels(2)
		self._schedule(applicants=self.candidates[:1])
		interview = frappe.get_all("Interview", filters={"custom_campus_drive": self.drive},
		                           pluck="name")[0]
		held_by = frappe.get_all("Interview Detail", filters={"parent": interview},
		                         pluck="interviewer")[0]
		moved_to = next(u for u in self.users if u != held_by)
		self.sent.clear()

		cd.reassign_round_interview(self.drive, interview, interviewer=moved_to)

		self.assertEqual(len(self._mail_to(moved_to)), 1)
		self.assertEqual(self._mail_to(held_by), [])

	# ── failures never cost the schedule ──

	def test_a_mail_failure_leaves_the_interviews_scheduled(self):
		self._panels(1)

		def boom(**kwargs):
			raise Exception("smtp down")

		frappe.sendmail = boom
		result = self._schedule()

		self.assertEqual(result["created"], CANDIDATES)
		self.assertEqual(
			len(frappe.get_all("Interview", filters={"custom_campus_drive": self.drive})),
			CANDIDATES,
		)
		# Un-stamped, so a later run still reaches them.
		self.assertEqual(self._notified_rows(), [])

	def test_template_deleted_still_sends(self):
		self._panels(1)
		frappe.db.set_single_value("Campus Settings", pm.TEMPLATE_FIELD, "_Test Missing Template")
		frappe.db.commit()
		try:
			self._schedule()
			self.assertEqual(len(self.sent), 1)
			self.assertIn("submit your feedback", self.sent[0]["message"])
		finally:
			frappe.db.set_single_value("Campus Settings", pm.TEMPLATE_FIELD, pm.TEMPLATE)
			frappe.db.commit()


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_panel_mailers.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusPanelMailers)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
