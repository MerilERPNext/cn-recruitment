"""Tests for four rules the campus flow leaned on and did not have.

  * Fixed / Variable Pay are mandatory on a Campus Drive.
  * An offer puts the candidate at the OFFER stage, not back at "Open".
  * Changing a candidate's region empties their work location, and unsettles the
    one an earlier panel had committed to.
  * A panel name reused in two regions is two panels — not one carrying both
    regions' interviewers.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_offer_and_region.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.api import bulk_job_offer as bjo
from recruitment.api import interview_work_location as iwl
from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test OR"


class TestCampusOfferAndRegion(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.home = cls._region("Home")
		cls.away = cls._region("Away")
		cls.home_branch = cls._branch("Home Branch", cls.home)
		cls.away_branch = cls._branch("Away Branch", cls.away)
		cls.employees = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
		                               pluck="name", limit=2, order_by="name asc")
		cls.institute = cls._institute()
		cls.invite = cls._invite()
		cls.drive = cls._drive()
		cls.candidate = cls._applicant()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant", filters={"email_id": ("like", "or.cand%@test.local")},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, field in (("Campus Drive", "drive_name"), ("Campus Invite", "campus_invite_name"),
		                       ("Institute", "institute_name"), ("Branch", "branch"),
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
	def _branch(cls, tag, region):
		doc = frappe.get_doc({"doctype": "Branch", "branch": f"{PREFIX} {tag}",
		                      "custom_location_code": f"{PREFIX}-{tag}".replace(" ", "-").upper(),
		                      "custom_region": region})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "OR TPO", "role": "Primary TPO",
		                                        "email": "or.tpo@test.local"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
		                      "region": cls.home,
		                      "institutes": [{"institute": cls.institute}]})
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
			"rounds": [{"round_name": "Technical Round 1", "round_type": "Technical",
			            "hiring_stage": "Technical Round 1"}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _applicant(cls):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": "OR Cand", "email_id": "or.cand@test.local",
			"status": "Interview", "source": "Campus Hiring",
			"custom_campus_invite": cls.invite, "custom_campus_drive": cls.drive,
			"custom_institute": cls.institute,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.set_value("Job Applicant", self.candidate, {
			"status": "Interview", "custom_substatus": None, "custom_location": None,
			"custom_interview_region": None}, update_modified=False)
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()

	# ── 1. the offer stage ──
	#
	# The drive's own Fixed / Variable Pay used to be checked here. The package moved
	# to the Job Opening (see test_campus_offer_package), so a drive no longer states
	# one and there is nothing mandatory about it left to assert.

	def test_hired_is_a_real_status(self):
		"""The offer stage the app writes has to exist on the Select, or the field
		renders empty on every offered candidate."""
		options = frappe.get_meta("Job Applicant").get_field("status").options.split("\n")
		self.assertIn(bjo.OFFER_STATUS, options)
		self.assertEqual(bjo.OFFER_STATUS, "Hired")

	def test_an_offer_puts_them_at_the_offer_stage(self):
		"""Not back at "Open", which is what an untouched application looks like."""
		bjo._mark_offer_stage(self.candidate, bjo.SUB_STATUS_TO_SEND)
		row = frappe.db.get_value("Job Applicant", self.candidate,
		                          ["status", "custom_substatus"], as_dict=True)
		self.assertEqual(row.status, bjo.OFFER_STATUS)
		self.assertEqual(row.custom_substatus, "Offer To Be Sent")

	def test_sending_it_moves_the_sub_status_on(self):
		bjo._mark_offer_stage(self.candidate, bjo.SUB_STATUS_TO_SEND)
		bjo._mark_offer_stage(self.candidate, bjo.SUB_STATUS_SENT)
		row = frappe.db.get_value("Job Applicant", self.candidate,
		                          ["status", "custom_substatus"], as_dict=True)
		self.assertEqual(row.status, bjo.OFFER_STATUS)
		self.assertEqual(row.custom_substatus, "Offer Sent")

	def test_a_decided_candidate_is_never_reopened(self):
		"""An offer mail going out again must not pull an accepted candidate back."""
		for decided in ("Accepted", "Rejected"):
			frappe.db.set_value("Job Applicant", self.candidate, "status", decided,
			                    update_modified=False)
			bjo._mark_offer_stage(self.candidate, bjo.SUB_STATUS_SENT)
			self.assertEqual(frappe.db.get_value("Job Applicant", self.candidate, "status"), decided)

	def test_the_sub_status_is_a_real_option(self):
		"""It is written onto a Select, so it has to exist in the master or the field
		renders empty."""
		bjo._mark_offer_stage(self.candidate, bjo.SUB_STATUS_TO_SEND)
		self.assertTrue(frappe.db.exists("Sub Status", {"parent_status": bjo.OFFER_STATUS}))

	# ── 3. a region change unsettles the location ──

	def test_changing_the_region_empties_the_work_location(self):
		frappe.db.set_value("Job Applicant", self.candidate,
		                    {"custom_location": self.home_branch,
		                     "custom_interview_region": self.home}, update_modified=False)
		doc = frappe.get_doc("Job Applicant", self.candidate)
		doc.custom_interview_region = self.away
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertFalse(doc.custom_location)

	def test_an_unchanged_region_keeps_the_location(self):
		frappe.db.set_value("Job Applicant", self.candidate,
		                    {"custom_location": self.home_branch,
		                     "custom_interview_region": self.home}, update_modified=False)
		doc = frappe.get_doc("Job Applicant", self.candidate)
		doc.applicant_name = "OR Cand Edited"
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertEqual(doc.custom_location, self.home_branch)

	def test_an_earlier_panels_choice_stops_binding_across_a_region_change(self):
		"""The next interviewer has to be able to pick a location in the new region —
		the settled one belongs to the region the candidate left."""
		frappe.db.set_value("Job Applicant", self.candidate, "custom_interview_region", self.home,
		                    update_modified=False)
		feedback = frappe.get_doc({
			"doctype": "Interview Feedback", "job_applicant": self.candidate,
			"interviewer": frappe.session.user, "result": "Cleared", "feedback": "ok",
			"custom_work_location": self.home_branch,
			"custom_work_location_region": self.home,
		})
		feedback.flags.ignore_mandatory = True
		feedback.flags.ignore_validate = True
		feedback.insert(ignore_permissions=True)
		# Submitted at the database level: submitting it properly runs the feedback's
		# own hooks, which want a real Interview behind it. What is under test is only
		# whether a submitted row binds the location.
		frappe.db.set_value("Interview Feedback", feedback.name, "docstatus", 1,
		                    update_modified=False)

		self.assertIsNotNone(iwl.locked_location(self.candidate))  # binds in the same region
		frappe.db.set_value("Job Applicant", self.candidate, "custom_interview_region", self.away,
		                    update_modified=False)
		self.assertIsNone(iwl.locked_location(self.candidate))     # not across the move

	# ── 4. one panel name, two regions ──

	def _panelists(self, rows):
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		code = doc.rounds[0].round_code
		for i, (panel, region) in enumerate(rows):
			doc.append("round_panelists", {"round_code": code, "panel_name": panel,
			                               "panelist": self.employees[i % len(self.employees)],
			                               "region": region})
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return cd._panels_for_round(frappe.get_doc("Campus Drive", self.drive), code)[0]

	def test_one_name_in_two_regions_is_two_panels(self):
		"""Merging them put the region they were moved TO and the one they were moved
		AWAY from on the same interview."""
		panels = self._panelists([("Panel 1", self.home), ("Panel 1", self.away)])
		self.assertEqual(len(panels), 2)
		self.assertEqual({v["region"] for v in panels.values()}, {self.home, self.away})
		for label, panel in panels.items():
			self.assertEqual(len(panel["users"]), 1, f"{label} should carry only its own")

	def test_the_labels_say_which_region(self):
		panels = self._panelists([("Panel 1", self.home), ("Panel 1", self.away)])
		self.assertTrue(any(self.away in label for label in panels))

	def test_one_name_in_one_region_keeps_its_plain_name(self):
		"""Nothing is qualified that doesn't need to be — the label is stored on every
		interview."""
		panels = self._panelists([("Panel 1", self.home), ("Panel 2", self.away)])
		self.assertEqual(set(panels), {"Panel 1", "Panel 2"})

	def test_two_rows_of_one_untagged_panel_still_share_it(self):
		"""A panel really is a group of interviewers — same name, same tags, one panel."""
		panels = self._panelists([("Panel 1", None), ("Panel 1", None)])
		self.assertEqual(len(panels), 1)
		self.assertEqual(len(list(panels.values())[0]["users"]), 2)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_offer_and_region.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusOfferAndRegion)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
