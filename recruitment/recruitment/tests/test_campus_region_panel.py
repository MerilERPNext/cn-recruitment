"""Tests for interviewing a candidate whose region was changed.

A candidate asks to be interviewed elsewhere; HR sets custom_interview_region on
the Job Applicant. From then on only that region's panel may take them — so if the
round has no panel for it, scheduling refuses and says which region needs one, and
the drive's health banner says it before anyone clicks Schedule.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_region_panel.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test Region"
STAGE = "Technical Round 1"


class TestCampusRegionPanel(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.home_region = cls._region("Home")
		cls.away_region = cls._region("Away")
		cls.employees = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
		                               pluck="name", limit=2, order_by="name asc")
		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive = cls._drive()
		cls.round_code = frappe.get_all("Campus Drive Round",
		                                filters={"parent": cls.drive, "hiring_stage": STAGE},
		                                pluck="round_code")[0]
		cls.staying = cls._applicant("region.stay@test.local")
		cls.moved = cls._applicant("region.moved@test.local", interview_region=cls.away_region)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant", filters={"email_id": ("like", "region.%@test.local")},
		                            pluck="name")
		for name in frappe.get_all("Interview", filters={"job_applicant": ("in", applicants or [""])},
		                           pluck="name"):
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, field in (("Campus Drive", "drive_name"), ("Campus Invite", "campus_invite_name"),
		                       ("Job Opening", "job_title"), ("Institute", "institute_name"),
		                       ("Region", "location_region")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"{PREFIX}%")}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _region(cls, tag):
		doc = frappe.get_doc({"doctype": "Region", "location_region": f"{PREFIX} {tag}"})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "R TPO", "role": "Primary TPO",
		                                        "email": "region.tpo@test.local"}]})
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
			"region": cls.home_region,
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
			"rounds": [{"round_name": STAGE, "round_type": "Technical", "hiring_stage": STAGE}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _applicant(cls, email, interview_region=None):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": email.split("@")[0],
			"email_id": email, "status": "Open", "source": "Campus Hiring",
			"job_title": cls.opening, "custom_campus_invite": cls.invite,
			"custom_campus_drive": cls.drive, "custom_institute": cls.institute,
			"custom_current_stage": STAGE,
		})
		doc.flags.ignore_mandatory = True
		name = doc.insert(ignore_permissions=True).name
		if interview_region:
			# What HR sets when they approve a candidate's region-change request.
			frappe.db.set_value("Job Applicant", name, "custom_interview_region",
			                    interview_region, update_modified=False)
		return name

	def setUp(self):
		frappe.set_user("Administrator")
		for name in frappe.get_all("Interview", filters={"custom_campus_drive": self.drive},
		                           pluck="name"):
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		for name in (self.staying, self.moved):
			frappe.db.set_value("Job Applicant", name, "custom_current_stage", STAGE,
			                    update_modified=False)
		# Rebuilding the roster commits, so a test that changes the invite's region
		# outlives its own rollback — put it back before each one.
		frappe.db.set_value("Campus Invite", self.invite, "region", self.home_region,
		                    update_modified=False)
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()

	# ── helpers ──

	def _panels(self, *regions):
		"""Give the round one panel per region ("" = a panel with no region)."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		for i, region in enumerate(regions):
			doc.append("round_panelists", {
				"round_code": self.round_code, "panel_name": f"Panel {i + 1}",
				"panelist": self.employees[i % len(self.employees)], "region": region or None})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _schedule(self, applicants=None):
		return cd.schedule_round_interviews(self.drive, self.round_code, scheduled_on=nowdate(),
		                                    applicants=applicants)

	def _health(self):
		return [h for h in cd.get_rounds_overview(self.drive)["health"] if h.get("region")]

	# ── the transferred candidate ──

	def test_scheduling_is_refused_when_no_panel_covers_their_region(self):
		self._panels(self.home_region)  # only the region they came from
		with self.assertRaises(frappe.ValidationError) as caught:
			self._schedule([self.moved])
		message = frappe.utils.strip_html(str(caught.exception))
		self.assertIn(f"{PREFIX} Away", message)
		self.assertIn("Region", message)

	def test_nothing_is_created_by_the_refused_run(self):
		"""It refuses before creating anything — no half-scheduled round."""
		self._panels(self.home_region)
		with self.assertRaises(frappe.ValidationError):
			self._schedule()
		self.assertEqual(frappe.db.count("Interview", {"custom_campus_drive": self.drive}), 0)

	def test_adding_a_panel_for_that_region_lets_it_through(self):
		self._panels(self.home_region, self.away_region)
		res = self._schedule([self.moved])
		self.assertEqual(res["created"], 1)
		iv = frappe.get_all("Interview", filters={"job_applicant": self.moved},
		                    fields=["custom_interview_panel"])[0]
		self.assertEqual(iv.custom_interview_panel, "Panel 2")  # the away-region panel

	def test_an_untagged_panel_is_the_drives_own_region_only(self):
		"""A Karnataka drive's panel is Karnataka's. It takes the candidates who did
		not ask to go anywhere, and must NOT quietly take the one who asked for
		Maharashtra — that request is the whole point."""
		self._panels("")  # one panel, no region: the drive's own
		with self.assertRaises(frappe.ValidationError) as caught:
			self._schedule()
		self.assertIn(f"{PREFIX} Away", frappe.utils.strip_html(str(caught.exception)))

		# ... while the candidate who stayed is taken by it
		res = self._schedule([self.staying])
		self.assertEqual(res["created"], 1)

	def test_the_untagged_panel_plus_the_asked_for_region_covers_both(self):
		"""The shape a real drive ends up in: the drive's own panel, plus one for the
		region a candidate asked for."""
		self._panels("", self.away_region)
		res = self._schedule()
		self.assertEqual(res["created"], 2)
		moved = frappe.get_all("Interview", filters={"job_applicant": self.moved},
		                       fields=["custom_interview_panel"])[0]
		stayed = frappe.get_all("Interview", filters={"job_applicant": self.staying},
		                        fields=["custom_interview_panel"])[0]
		self.assertEqual(moved.custom_interview_panel, "Panel 2")   # the Away panel
		self.assertEqual(stayed.custom_interview_panel, "Panel 1")  # the drive's own

	def test_a_drive_whose_invites_name_no_region_is_unaffected(self):
		"""Drives that never use regions keep working exactly as before: an untagged
		panel covers everyone, because there is no "own region" to mean instead."""
		frappe.db.set_value("Campus Invite", self.invite, "region", None)
		self._panels("")
		res = self._schedule()
		self.assertEqual(res["created"], 2)

	def test_the_candidate_who_did_not_move_uses_their_invite_region(self):
		self._panels(self.home_region)
		res = self._schedule([self.staying])
		self.assertEqual(res["created"], 1)

	# ── seen before anyone clicks Schedule ──

	def test_the_drive_flags_the_uncovered_region(self):
		self._panels(self.home_region)
		issues = self._health()
		self.assertTrue(issues, "the board should flag the uncovered region")
		self.assertIn(f"{PREFIX} Away", issues[0]["title"])
		self.assertIn("Round Panelist", issues[0]["detail"])

	def test_the_flag_clears_once_the_panel_exists(self):
		self._panels(self.home_region, self.away_region)
		self.assertEqual(self._health(), [])

	def test_a_round_with_no_panels_at_all_is_not_flagged_for_regions(self):
		"""That round already carries its own "no panel set up" warning — saying it
		twice, once per region, buries it."""
		self._panels()
		self.assertEqual(self._health(), [])


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_region_panel.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusRegionPanel)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
