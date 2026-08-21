"""Tests for who counts as "waiting" for a round.

A candidate on Hold was knocked out on eligibility; a Rejected or Accepted one is
decided. None of them is waiting to be interviewed, so none belongs in a round's
waiting count, in the schedule picker, or in the offer round's list — they were
being shown to HR as if they still had to be dealt with.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_waiting_pool.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test Waiting"
GD_STAGE = "Group Discussion"
OFFER_STAGE = "Job Offer"
# 4 in play, 4 parked — the mix the drive card was counting as 8.
IN_PLAY = ("Shortlisted", "Shortlisted", "Shortlisted", "Interview")
PARKED = ("Hold", "Hold", "Rejected", "Accepted")


class TestCampusWaitingPool(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive, cls.gd_code, cls.offer_code = cls._drive()
		cls.candidates = {}
		for i, status in enumerate(IN_PLAY + PARKED):
			cls.candidates[cls._applicant(i, status)] = status
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant",
		                           filters={"email_id": ("like", "waiting.cand%@test.local")},
		                           pluck="name"):
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
		                      "tpo_contacts": [{"contact_name": "W TPO", "role": "Primary TPO",
		                                        "email": "waiting.tpo@test.local"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_hiring_stages": [{"stage_name": GD_STAGE, "stage_type": "Interview",
			                          "owner_role": "System", "notify": 0, "auto": 1}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
		                      "institutes": [{"institute": cls.institute}],
		                      "job_openings": [{"job_opening": cls.opening}]})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	@classmethod
	def _drive(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7), "fixed_pay": 400000, "variable_pay": 40000,
			"campus_invites": [{"campus_invite": cls.invite}],
			"rounds": [
				{"round_name": GD_STAGE, "round_type": "Group Discussion", "hiring_stage": GD_STAGE},
				{"round_name": OFFER_STAGE, "round_type": "Offer", "hiring_stage": OFFER_STAGE},
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name, doc.rounds[0].round_code, doc.rounds[1].round_code

	@classmethod
	def _applicant(cls, i, status):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": f"Waiting {i}",
			"email_id": f"waiting.cand{i}@test.local", "status": "Open",
			"source": "Campus Hiring", "job_title": cls.opening,
			"custom_campus_invite": cls.invite, "custom_campus_drive": cls.drive,
			"custom_institute": cls.institute,
		})
		doc.flags.ignore_mandatory = True
		name = doc.insert(ignore_permissions=True).name
		frappe.db.set_value("Job Applicant", name,
		                    {"custom_current_stage": GD_STAGE, "status": status},
		                    update_modified=False)
		return name

	def setUp(self):
		frappe.set_user("Administrator")
		for name, status in self.candidates.items():
			frappe.db.set_value("Job Applicant", name,
			                    {"custom_current_stage": GD_STAGE, "status": status},
			                    update_modified=False)
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()

	def _card(self, round_code):
		rounds = {r["round_code"]: r for r in cd.get_rounds_overview(self.drive)["rounds"]}
		return rounds[round_code]

	# ── the count on the round card ──

	def test_waiting_counts_only_the_candidates_in_play(self):
		"""8 sit at the stage; 4 of them are parked."""
		self.assertEqual(
			frappe.db.count("Job Applicant",
			                {"custom_campus_drive": self.drive, "custom_current_stage": GD_STAGE}),
			len(IN_PLAY) + len(PARKED))
		self.assertEqual(self._card(self.gd_code)["waiting"], len(IN_PLAY))

	def test_putting_someone_on_hold_takes_them_out_of_the_count(self):
		before = self._card(self.gd_code)["waiting"]
		in_play = next(n for n, s in self.candidates.items() if s == "Shortlisted")
		frappe.db.set_value("Job Applicant", in_play, "status", "Hold", update_modified=False)
		self.assertEqual(self._card(self.gd_code)["waiting"], before - 1)

	def test_taking_them_off_hold_puts_them_back(self):
		held = next(n for n, s in self.candidates.items() if s == "Hold")
		frappe.db.set_value("Job Applicant", held, "status", "Shortlisted", update_modified=False)
		self.assertEqual(self._card(self.gd_code)["waiting"], len(IN_PLAY) + 1)

	# ── the schedule picker ──

	def test_the_schedule_picker_offers_only_those_candidates(self):
		pool = cd.get_round_pool(self.drive, self.gd_code)["pool"]
		self.assertEqual(len(pool), len(IN_PLAY))
		statuses = {frappe.db.get_value("Job Applicant", p["name"], "status") for p in pool}
		self.assertFalse(statuses & set(cd.PARKED_STATUSES))

	def test_a_held_candidate_cannot_be_scheduled_by_name(self):
		"""Even asked for explicitly: the pool is the gate, so a stale screen cannot
		put an eligibility knock-out in front of a panel."""
		held = next(n for n, s in self.candidates.items() if s == "Hold")
		with self.assertRaises(frappe.ValidationError):
			cd.schedule_round_interviews(self.drive, self.gd_code, scheduled_on=nowdate(),
			                             applicants=[held])

	# ── the offer round ──

	def test_the_offer_round_skips_the_parked_too(self):
		for name in self.candidates:
			frappe.db.set_value("Job Applicant", name, "custom_current_stage", OFFER_STAGE,
			                    update_modified=False)
		listed = cd.get_offer_candidates(self.drive, self.offer_code)["candidates"]
		self.assertEqual(len(listed), len(IN_PLAY))

	def test_parked_is_one_definition(self):
		"""Hold / Rejected / Accepted, in one place — the health check and both pools
		read the same list."""
		self.assertEqual(set(cd.PARKED_STATUSES), {"Hold", "Rejected", "Accepted"})


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_waiting_pool.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusWaitingPool)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
