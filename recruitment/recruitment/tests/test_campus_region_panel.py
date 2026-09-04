"""Tests for interviewing a candidate whose region was changed.

A candidate asks to be interviewed elsewhere; HR sets custom_interview_region on
the Job Applicant. From then on only that region's panel may take them — so if the
round has no panel for it, scheduling refuses and says which region needs one, and
the drive's health banner says it before anyone clicks Schedule.

Three regions can be in play at once, and the drive shows all three:

    applied      the region of the Campus Invite they came in on
    recommended  what an interview panel argued for on their feedback. It is a
                 suggestion: nothing moves until HR accepts it, so it blocks no
                 round — but the drive warns when no panel anywhere could take
                 them if HR did accept
    requested    where HR actually moved them. Only that region's panel may
                 interview them, so a round without one refuses

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
			# Scheduling commits, so a recommendation left by one test outlives its own
			# rollback and turns up as a stray warning in the next one.
			frappe.db.set_value("Job Applicant", name, {
				"custom_suggested_region": None,
				"custom_region_suggestion_status": None,
				"custom_region_suggestion_reason": None,
			}, update_modified=False)
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

	def _clear(self, applicant):
		"""An additional round is a second look at someone who FINISHED the round."""
		for name in frappe.get_all("Interview", filters={
			"custom_campus_drive": self.drive, "job_applicant": applicant}, pluck="name"):
			frappe.db.set_value("Interview", name, "status", "Cleared", update_modified=False)

	def _health(self):
		return [h for h in cd.get_rounds_overview(self.drive)["health"] if h.get("region")]

	def _recommend(self, applicant, region, status="Pending", reason="Family is there"):
		"""What an interview panel writes on its feedback — a suggestion for HR, which
		moves nothing by itself (see record_region_suggestion)."""
		frappe.db.set_value("Job Applicant", applicant, {
			"custom_suggested_region": region,
			"custom_region_suggestion_status": status,
			"custom_region_suggestion_reason": reason,
		}, update_modified=False)

	def _of_kind(self, kind):
		return [h for h in self._health() if h.get("region_kind") == kind]

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

	def test_a_region_is_not_reported_twice(self):
		"""The round-level refusal already names it; the drive-wide check must not
		say the same thing again about the same candidates."""
		self._panels(self.home_region)
		issues = self._health()
		self.assertEqual(len(issues), 1)
		self.assertNotIn("region_kind", issues[0])  # the per-round one

	def test_a_moved_candidate_off_every_round_is_still_flagged(self):
		"""The per-round check only sees who is waiting for a round right now. Someone
		parked at another stage has nowhere on this drive to be interviewed either,
		and would otherwise be stranded silently."""
		self._panels(self.home_region)
		frappe.db.set_value("Job Applicant", self.moved, "custom_current_stage",
		                    "Somewhere Else", update_modified=False)
		issues = self._of_kind("requested")
		self.assertEqual(len(issues), 1)
		self.assertEqual(issues[0]["level"], "error")
		self.assertIn(f"{PREFIX} Away", issues[0]["title"])

	# ── the panel's recommendation, which HR has not accepted ──

	def test_a_pending_recommendation_does_not_block_scheduling(self):
		"""It is a suggestion, not a move: this candidate is still their own region's,
		and their round must not stop because someone argued about them."""
		self._panels(self.home_region)
		self._recommend(self.staying, self.away_region)
		res = self._schedule([self.staying])
		self.assertEqual(res["created"], 1)

	def test_the_drive_warns_that_the_recommended_region_has_no_panel(self):
		self._panels(self.home_region)
		self._recommend(self.staying, self.away_region)
		issues = self._of_kind("recommended")
		self.assertEqual(len(issues), 1)
		# A warning, not an error — accepting it is HR's call and has not happened.
		self.assertEqual(issues[0]["level"], "warning")
		self.assertIn(f"{PREFIX} Away", issues[0]["title"])

	def test_the_recommendation_warning_clears_once_a_panel_exists(self):
		self._panels(self.home_region, self.away_region)
		self._recommend(self.staying, self.away_region)
		self.assertEqual(self._of_kind("recommended"), [])

	def test_a_decided_recommendation_is_not_reported(self):
		"""Accepted, it has already become the interview region; dismissed, it was
		answered. Neither is a region the drive still has to find a panel for."""
		self._panels(self.home_region)
		for status in ("Accepted", "Dismissed"):
			self._recommend(self.staying, self.away_region, status=status)
			self.assertEqual(self._of_kind("recommended"), [], status)

	def test_the_drive_wide_check_asks_only_whether_anyone_covers_it(self):
		"""region_panel_gap is the one question both the banner and the warning HR
		gets on moving a candidate ask — and it counts panels on any round."""
		self._panels(self.home_region)
		self.assertTrue(cd.region_panel_gap(self.drive, self.away_region))
		self._panels(self.home_region, self.away_region)
		self.assertFalse(cd.region_panel_gap(self.drive, self.away_region))

	# ── said on the round that raised it, not in a banner over the board ──

	def _rounds(self):
		return {r["round_code"]: r for r in cd.get_rounds_overview(self.drive)["rounds"]}

	def _extra_panel(self, region, panel="Extra Panel"):
		"""Roster the Additional Round that hangs off this round (R1 -> R1-EXTRA)."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.append("round_panelists", {
			"round_code": cd.extra_panel_round_code(self.round_code), "panel_name": panel,
			"panelist": self.employees[0], "region": region})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def test_the_recommendation_is_reported_on_the_round_that_raised_it(self):
		"""HR acts on it by adding an Additional Round to THAT round, so a banner over
		the whole board says nothing about where to go."""
		self._panels(self.home_region)
		self._schedule([self.staying])          # the round they sat
		self._recommend(self.staying, self.away_region)
		notes = self._rounds()[self.round_code]["region_notes"]
		self.assertEqual(len(notes), 1)
		self.assertIn(f"{PREFIX} Away", notes[0]["title"])
		# and names the roster to add, which is this round's own extra code
		self.assertIn(cd.extra_panel_round_code(self.round_code), notes[0]["detail"])

	def test_the_banner_does_not_repeat_what_the_round_card_says(self):
		self._panels(self.home_region)
		self._schedule([self.staying])
		self._recommend(self.staying, self.away_region)
		self.assertEqual(self._of_kind("recommended"), [])

	def test_the_round_note_clears_once_that_regions_extra_panel_exists(self):
		self._panels(self.home_region)
		self._schedule([self.staying])
		self._recommend(self.staying, self.away_region)
		self._extra_panel(self.away_region)
		self.assertEqual(self._rounds()[self.round_code]["region_notes"], [])

	def test_an_extra_panel_for_the_wrong_region_does_not_clear_it(self):
		"""The whole point is a panel that can take them FOR that region."""
		self._panels(self.home_region)
		self._schedule([self.staying])
		self._recommend(self.staying, self.away_region)
		self._extra_panel(self.home_region)
		self.assertEqual(len(self._rounds()[self.round_code]["region_notes"]), 1)

	# ── the Additional Round panel has to cover the candidate's region ──

	def test_an_additional_round_panel_must_cover_the_candidates_region(self):
		"""HR naming the panel used to skip the region check entirely, so an untagged
		second-look panel could take a candidate who had been moved away."""
		self._panels("", self.away_region)
		self._schedule([self.moved])
		self._clear(self.moved)
		self._extra_panel(self.home_region, panel="Home Extra")
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.add_candidate_interview(self.drive, self.moved, nowdate(),
			                           round_code=self.round_code, panel="Home Extra",
			                           reason="Second look")
		message = frappe.utils.strip_html(str(caught.exception))
		self.assertIn(f"{PREFIX} Away", message)
		self.assertIn(cd.extra_panel_round_code(self.round_code), message)

	def test_the_right_regions_panel_takes_the_additional_round(self):
		self._panels("", self.away_region)
		self._schedule([self.moved])
		self._clear(self.moved)
		self._extra_panel(self.away_region, panel="Away Extra")
		res = cd.add_candidate_interview(self.drive, self.moved, nowdate(),
		                                 round_code=self.round_code, panel="Away Extra",
		                                 reason="Second look")
		self.assertTrue(res["interview"])
		self.assertEqual(frappe.db.get_value("Interview", res["interview"],
		                                     "custom_interview_panel"), "Away Extra")

	def test_the_recommended_regions_panel_may_take_the_second_look(self):
		"""The whole point of the Additional Round the note asks for: the region an
		interviewer argued for gets to look at the candidate BEFORE HR has to decide,
		so that panel must be allowed even though the candidate has not moved."""
		self._panels(self.home_region)
		self._schedule([self.staying])
		self._clear(self.staying)
		self._recommend(self.staying, self.away_region)
		self._extra_panel(self.away_region, panel="Away Extra")
		res = cd.add_candidate_interview(self.drive, self.staying, nowdate(),
		                                 round_code=self.round_code, panel="Away Extra",
		                                 reason="Let Away see them")
		self.assertTrue(res["interview"])
		# ... and the candidate has NOT been moved by it — that is still HR's call.
		self.assertIsNone(frappe.db.get_value("Job Applicant", self.staying,
		                                      "custom_interview_region"))

	def test_a_third_regions_panel_still_cannot_take_it(self):
		"""Their own region or the one recommended — not any panel that happens to
		carry a region."""
		third = self._region("Third")
		self._panels(self.home_region)
		self._schedule([self.staying])
		self._clear(self.staying)
		self._recommend(self.staying, self.away_region)
		self._extra_panel(third, panel="Third Extra")
		with self.assertRaises(frappe.ValidationError):
			cd.add_candidate_interview(self.drive, self.staying, nowdate(),
			                           round_code=self.round_code, panel="Third Extra",
			                           reason="Second look")

	# ── the region a second-look panel takes is not optional ──

	def test_an_additional_round_panelist_needs_a_region(self):
		with self.assertRaises(frappe.ValidationError) as caught:
			doc = frappe.get_doc("Campus Drive", self.drive)
			doc.append("round_panelists", {
				"round_code": cd.extra_panel_round_code(self.round_code),
				"panel_name": "No Region", "panelist": self.employees[0]})
			doc.save(ignore_permissions=True)
		self.assertIn("Region", frappe.utils.strip_html(str(caught.exception)))

	def test_a_round_panel_may_still_leave_its_region_blank(self):
		"""Untagged means "this drive's own region(s)" on an ordinary round, which is
		the sane default for a round the whole drive sits. Only the second look, which
		is always about one particular candidate, has to say it out loud."""
		self._panels("")  # saves the drive with an untagged round panel
		self.assertTrue(self._rounds())

	# ── all three regions, on the row HR is looking at ──

	def test_the_pool_carries_all_three_regions(self):
		self._panels(self.home_region, self.away_region)
		self._recommend(self.staying, self.away_region)
		pool = {c["name"]: c for c in cd.get_round_pool(self.drive, self.round_code)["pool"]}

		stayed = pool[self.staying]
		self.assertEqual(stayed["applied_region_name"], f"{PREFIX} Home")
		self.assertEqual(stayed["recommended_region_name"], f"{PREFIX} Away")
		self.assertIsNone(stayed["requested_region_name"])
		self.assertEqual(stayed["recommendation_reason"], "Family is there")
		# A recommendation changes nothing until HR accepts it: they are still
		# interviewed by their own region.
		self.assertEqual(stayed["region"], self.home_region)
		self.assertFalse(stayed["transferred"])

		moved = pool[self.moved]
		self.assertEqual(moved["applied_region_name"], f"{PREFIX} Home")
		self.assertEqual(moved["requested_region_name"], f"{PREFIX} Away")
		self.assertIsNone(moved["recommended_region_name"])
		self.assertEqual(moved["region"], self.away_region)
		self.assertTrue(moved["transferred"])


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
