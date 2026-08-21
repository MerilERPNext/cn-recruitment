"""Tests for the work location an interview panel sets on a campus candidate.

Covers recruitment.api.interview_work_location: where the region comes from, which
locations that region offers, who may ask, and what reaches the candidate when the
feedback is submitted.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_interview_work_location
"""

from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.api import interview_work_location as iwl
from recruitment.api.hiring_stage import (_ensure_interview_round,
                                          get_interview_round_doctype,
                                          get_interview_round_field)

PREFIX = "_Test WL"
PANELIST = "wl.panelist@test.local"
OUTSIDER = "wl.outsider@test.local"


def _branch(name, region=None, disabled=0):
	code = name.replace(" ", "-").upper()
	if frappe.db.exists("Branch", code):
		frappe.delete_doc("Branch", code, force=True, ignore_permissions=True)
	doc = frappe.get_doc({
		"doctype": "Branch", "branch": name,
		# Branch is named off the location code here, not the branch name.
		"custom_location_code": code,
		"custom_region": region,
	})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	if disabled:
		# Set straight on the row: a global before_save hook
		# (cn_hrms_core.apis.fetch_data.sync_status_fields) derives custom_disabled
		# from the branch status and would reset it during a save.
		frappe.db.set_value("Branch", doc.name, "custom_disabled", 1)
	return doc.name


def _user(email):
	if not frappe.db.exists("User", email):
		frappe.get_doc({
			"doctype": "User", "email": email, "first_name": "WL",
			"enabled": 1, "send_welcome_email": 0,
			"roles": [{"role": "Interviewer"}],
		}).insert(ignore_permissions=True)
	return email


class TestInterviewWorkLocation(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		# Two regions. The mapping is maintained on the WORK LOCATION
		# (Branch.custom_region) — that field alone decides which region a location
		# belongs to. A branch is also listed under Region.locations, to prove the
		# retired master is no longer consulted. Region B has one location.
		cls.region_a = frappe.get_doc({
			"doctype": "Region", "location_region": f"{PREFIX} Region A"}
		).insert(ignore_permissions=True).name
		cls.region_b = frappe.get_doc({
			"doctype": "Region", "location_region": f"{PREFIX} Region B"}
		).insert(ignore_permissions=True).name

		cls.branch_via_field = _branch(f"{PREFIX} Loc A1", region=cls.region_a)
		cls.branch_via_table = _branch(f"{PREFIX} Loc A2", region=cls.region_a)
		cls.branch_disabled = _branch(f"{PREFIX} Loc A3", region=cls.region_a, disabled=1)
		cls.branch_other_region = _branch(f"{PREFIX} Loc B1", region=cls.region_b)
		# Listed under Region A's `locations` table but carrying NO custom_region of
		# its own. It must never be offered: the region master no longer decides this.
		cls.branch_table_only = _branch(f"{PREFIX} Loc A4")

		region_a = frappe.get_doc("Region", cls.region_a)
		region_a.append("locations", {"location": cls.branch_table_only})
		region_a.save(ignore_permissions=True)

		cls.institute = cls._institute()
		cls.invite = cls._invite(cls.region_a)
		cls.round_field = get_interview_round_field()
		cls.interview_round = cls._interview_round()

		cls.panelist = _user(PANELIST)
		cls.outsider = _user(OUTSIDER)

		cls.campus_applicant = cls._applicant("wl.campus@test.local", invite=cls.invite)
		cls.lateral_applicant = cls._applicant("wl.lateral@test.local")

		cls.campus_interview = cls._interview(cls.campus_applicant)
		cls.lateral_interview = cls._interview(cls.lateral_applicant)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		# These fixtures are committed, so they outlive the per-test rollback. Clear
		# them rather than leave regions and branches behind on a shared site.
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		"""Drop anything a previous run committed, so the suite is re-runnable.

		setUpClass has to commit (each test rolls back afterwards, which would
		otherwise take the fixtures with it), so leftovers are real rows.
		Deleted child-first: feedback, then interviews, then the candidates.
		"""
		applicants = frappe.get_all("Job Applicant",
		                            filters={"email_id": ("like", "wl.%@test.local")},
		                            pluck="name")
		for doctype, field in (("Interview Feedback", "job_applicant"),
		                       ("Interview", "job_applicant")):
			for name in frappe.get_all(doctype, filters={field: ("in", applicants or [""])},
			                           pluck="name"):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True,
				                  delete_permanently=True)
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)

		for doctype, filters in (
			("Campus Invite", {"campus_invite_name": ("like", f"{PREFIX}%")}),
			("Branch", {"branch": ("like", f"{PREFIX}%")}),
			("Region", {"location_region": ("like", f"{PREFIX}%")}),
			# Masters too: a round left behind shows up in real pickers, such as the
			# Campus Drive's extra-interview dialog.
			(get_interview_round_doctype(), {"name": ("like", f"{PREFIX}%")}),
			("Skill", {"name": ("like", f"{PREFIX}%")}),
		):
			for name in frappe.get_all(doctype, filters=filters, pluck="name"):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _institute(cls):
		label = f"{PREFIX} Institute"
		existing = frappe.db.get_value("Institute", {"institute_name": label})
		if existing:
			return existing
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": label})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls, region):
		doc = frappe.get_doc({
			"doctype": "Campus Invite",
			"campus_invite_name": f"{PREFIX} Invite",
			"region": region,
			"institutes": [{"institute": cls.institute}],
		}).insert(ignore_permissions=True)
		return doc.name

	@classmethod
	def _interview_round(cls):
		"""The round master under whatever name this HRMS version uses.

		v15 calls it "Interview Round" and keys it on Interview.interview_round; v16
		calls it "Interview Type" on Interview.interview_type. _ensure_interview_round
		resolves and creates whichever applies, so this suite runs on both.
		"""
		cls._skill_name()
		return _ensure_interview_round(f"{PREFIX} Type")

	@classmethod
	def _skill_name(cls):
		name = f"{PREFIX} Skill"
		if not frappe.db.exists("Skill", name):
			frappe.get_doc({"doctype": "Skill", "skill_name": name}
			               ).insert(ignore_permissions=True)
		return name

	@classmethod
	def _applicant(cls, email, invite=None):
		if frappe.db.exists("Job Applicant", email):
			frappe.delete_doc("Job Applicant", email, force=True, ignore_permissions=True)
		doc = frappe.get_doc({
			"doctype": "Job Applicant",
			"applicant_name": email.split("@")[0],
			"email_id": email,
			"status": "Open",
			"source": "Campus Hiring" if invite else "Walk In",
			"custom_campus_invite": invite,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name

	@classmethod
	def _interview(cls, applicant):
		doc = frappe.get_doc({
			"doctype": "Interview",
			"job_applicant": applicant,
			# Set by resolved fieldname, not a literal — see _interview_round.
			cls.round_field: cls.interview_round,
			"status": "Pending",
			# Yesterday: feedback cannot be submitted before the interview date.
			"scheduled_on": add_days(nowdate(), -1),
			"from_time": "10:00:00",
			"to_time": "11:00:00",
			"interview_details": [{"interviewer": PANELIST}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name

	def _feedback(self, interview, applicant, location=None, **kwargs):
		doc = frappe.get_doc({
			"doctype": "Interview Feedback",
			"interview": interview,
			"job_applicant": applicant,
			"interviewer": PANELIST,
			"result": "Cleared",
			"feedback": "test",
			"skill_assessment": [{"skill": self._skill(), "rating": 0.8}],
			"custom_work_location": location,
			**kwargs,
		})
		doc.flags.ignore_permissions = True
		return doc

	def _skill(self):
		return self._skill_name()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── region resolution ──

	def test_region_comes_from_the_campus_invite(self):
		"""A campus candidate needs no region typed in — the drive's invite carries it."""
		applicant = iwl._applicant(self.campus_applicant)
		self.assertEqual(iwl.resolve_region(applicant), self.region_a)

	def test_hr_routing_beats_the_applied_region(self):
		frappe.db.set_value("Job Applicant", self.campus_applicant,
		                    "custom_interview_region", self.region_b)
		applicant = iwl._applicant(self.campus_applicant)
		self.assertEqual(iwl.resolve_region(applicant), self.region_b)

	def test_a_recommendation_on_the_feedback_wins(self):
		"""Recommending another region re-points the location list at that region —
		picking a location of the region they are leaving would contradict itself."""
		applicant = iwl._applicant(self.campus_applicant)
		self.assertEqual(iwl.resolve_region(applicant, self.region_b), self.region_b)

	def test_no_region_for_a_lateral_candidate(self):
		applicant = iwl._applicant(self.lateral_applicant)
		self.assertIsNone(iwl.resolve_region(applicant))

	# ── which locations a region offers ──

	def test_locations_come_from_the_work_location_field_and_skip_disabled(self):
		"""The Work Location's own Region field is the mapping. A branch listed under
		Region.locations but carrying no custom_region is NOT offered — that master is
		retired, and honouring it is how the two sides used to drift apart."""
		offered = iwl.get_region_branches(self.region_a)
		self.assertEqual(offered, sorted([self.branch_via_field, self.branch_via_table]))
		# listed under Region.locations, but it carries no region of its own
		self.assertNotIn(self.branch_table_only, offered)
		# disabled locations stay out
		self.assertNotIn(self.branch_disabled, offered)

	def test_a_location_moves_region_by_changing_its_own_field(self):
		"""Re-pointing the Work Location is the whole operation — nothing has to be
		added to or removed from a region's list."""
		self.assertEqual(iwl.get_region_branches(self.region_b), [self.branch_other_region])
		frappe.db.set_value("Branch", self.branch_other_region, "custom_region", self.region_a)
		try:
			self.assertEqual(iwl.get_region_branches(self.region_b), [])
			self.assertIn(self.branch_other_region, iwl.get_region_branches(self.region_a))
		finally:
			frappe.db.set_value("Branch", self.branch_other_region, "custom_region", self.region_b)

	def test_region_with_no_locations_mapped(self):
		frappe.db.set_value("Branch", self.branch_other_region, "custom_region", None)
		try:
			self.assertEqual(iwl.get_region_branches(self.region_b), [])
		finally:
			frappe.db.set_value("Branch", self.branch_other_region, "custom_region", self.region_b)

	# ── the form's context ──

	def test_context_for_a_campus_candidate(self):
		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])
		self.assertEqual(ctx["region"], self.region_a)
		self.assertEqual(ctx["region_label"], f"{PREFIX} Region A")
		self.assertEqual(ctx["branches"], sorted([self.branch_via_field, self.branch_via_table]))
		self.assertTrue(ctx["restricted"])

	def test_context_is_blank_for_a_lateral_candidate(self):
		"""The field is ignored outside campus hiring — the form hides the section."""
		ctx = iwl.get_work_location_context(self.lateral_applicant)
		self.assertFalse(ctx["is_campus"])
		self.assertEqual(ctx["branches"], [])

	def test_context_unrestricted_when_the_region_maps_to_nothing(self):
		"""An unmaintained location master must not leave the panel with an empty
		dropdown they cannot get past."""
		frappe.db.set_value("Branch", self.branch_other_region, "custom_region", None)
		frappe.db.set_value("Job Applicant", self.campus_applicant,
		                    "custom_interview_region", self.region_b)
		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])
		self.assertEqual(ctx["region"], self.region_b)
		self.assertFalse(ctx["restricted"])
		self.assertEqual(ctx["branches"], [])

	def test_context_for_an_unknown_applicant(self):
		self.assertFalse(iwl.get_work_location_context("nobody@test.local")["is_campus"])
		self.assertFalse(iwl.get_work_location_context(None)["is_campus"])

	# ── why it came back empty ──
	#
	# Both sections vanishing with no explanation is indistinguishable from the feature
	# being missing, which is exactly how it was read on a drive. `reason` is what lets
	# the form say which of the three it is.

	def test_a_campus_candidate_has_no_reason_to_report(self):
		self.assertIsNone(iwl.get_work_location_context(self.campus_applicant)["reason"])

	def test_a_lateral_candidate_is_reported_as_not_campus(self):
		"""Hidden is CORRECT here — there is no region routing behind them."""
		ctx = iwl.get_work_location_context(self.lateral_applicant)
		self.assertEqual(ctx["reason"], "not_campus")

	def test_a_deleted_candidate_is_reported_as_missing(self):
		"""A dangling link, not a lateral hire: the panel is writing feedback against a
		candidate who is no longer there, and the form has to say so rather than just
		dropping the sections."""
		ctx = iwl.get_work_location_context("nobody@test.local")
		self.assertEqual(ctx["reason"], "applicant_missing")

	def test_an_empty_link_is_reported_as_such(self):
		self.assertEqual(iwl.get_work_location_context(None)["reason"], "no_applicant")

	def test_a_panel_member_gets_the_sections_for_a_campus_candidate(self):
		"""The report was that interviewers never see Region Recommendation / Work
		Location. They do — this is the call the form gates both sections on."""
		frappe.set_user(PANELIST)
		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])
		self.assertIsNone(ctx["reason"])
		self.assertTrue(ctx["branches"])

	# ── who may ask ──
	#
	# `_may_see` grants access two ways: sitting on the candidate's panel, OR holding
	# read permission on the Job Applicant. These tests pin the PANEL half, so they
	# stub the permission half out rather than reading whatever Job Applicant
	# permissions this site happens to grant the Interviewer role. Asserting on the
	# ambient config made the suite pass or fail on a setting neither test is about.

	def test_panel_member_may_ask_without_job_applicant_permission(self):
		"""Sitting on the panel is enough on its own — the panel is exactly who fills
		this field in, and they are not guaranteed any Job Applicant permission."""
		frappe.set_user(PANELIST)
		with patch.object(frappe, "has_permission", return_value=False):
			ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])
		self.assertEqual(ctx["region"], self.region_a)

	def test_someone_off_the_panel_is_refused(self):
		"""An interviewer who is not on THIS candidate's panel has no business asking
		where they can be posted."""
		frappe.set_user(OUTSIDER)
		with patch.object(frappe, "has_permission", return_value=False):
			with self.assertRaises(frappe.PermissionError):
				iwl.get_work_location_context(self.campus_applicant)

	def test_job_applicant_read_permission_is_the_other_way_in(self):
		"""The second half of the gate: HR holds no panel seat and still gets an
		answer, because they can read the candidate."""
		frappe.set_user(OUTSIDER)
		with patch.object(frappe, "has_permission", return_value=True):
			ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])

	# ── validation on the feedback ──

	def test_region_is_stamped_on_save(self):
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		self.assertEqual(doc.custom_work_location_region, self.region_a)

	def test_location_outside_the_region_is_rejected(self):
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_other_region)
		with self.assertRaises(frappe.ValidationError):
			doc.insert()

	def test_disabled_location_is_rejected(self):
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_disabled)
		with self.assertRaises(frappe.ValidationError):
			doc.insert()

	def test_any_location_allowed_when_the_region_maps_to_nothing(self):
		"""An unmaintained location master must not block feedback: with nothing
		mapped to the region, whatever the panel picked is accepted.

		Every Work Location of the region is un-mapped, since the mapping now lives
		only on the Branch — clearing the region's own list is not enough (and is done
		here purely to prove the retired master is not consulted either)."""
		mapped = (self.branch_via_field, self.branch_via_table, self.branch_disabled)
		for branch in mapped:
			frappe.db.set_value("Branch", branch, "custom_region", None)
		region_a = frappe.get_doc("Region", self.region_a)
		region_a.locations = []
		region_a.save(ignore_permissions=True)

		try:
			self.assertEqual(iwl.get_region_branches(self.region_a), [])
			doc = self._feedback(self.campus_interview, self.campus_applicant,
			                     self.branch_other_region)
			doc.insert()
			self.assertEqual(doc.custom_work_location, self.branch_other_region)
		finally:
			for branch in mapped:
				frappe.db.set_value("Branch", branch, "custom_region", self.region_a)

	def test_lateral_feedback_has_the_field_cleared(self):
		doc = self._feedback(self.lateral_interview, self.lateral_applicant,
		                     self.branch_via_field)
		doc.insert()
		self.assertIsNone(doc.custom_work_location)
		self.assertIsNone(doc.custom_work_location_region)

	# ── what reaches the candidate ──

	def test_submit_sets_the_candidates_location(self):
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.campus_applicant, "custom_location"),
			self.branch_via_field)

	def test_submit_records_the_choice_on_the_timeline(self):
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()
		note = frappe.get_all("Comment", filters={
			"reference_doctype": "Job Applicant", "reference_name": self.campus_applicant,
			"comment_type": "Info"}, fields=["content"], order_by="creation desc", limit=1)
		self.assertTrue(note)
		self.assertIn(self.branch_via_field, note[0].content)
		self.assertIn(PANELIST, note[0].content)

	def test_nothing_is_written_when_no_location_was_picked(self):
		"""The field is optional — an early round should not have to name a branch."""
		frappe.db.set_value("Job Applicant", self.campus_applicant, "custom_location", None)
		doc = self._feedback(self.campus_interview, self.campus_applicant, None)
		doc.insert()
		doc.submit()
		self.assertIsNone(
			frappe.db.get_value("Job Applicant", self.campus_applicant, "custom_location"))

	def test_the_deciding_round_says_what_it_replaced(self):
		"""A candidate usually arrives with a location pre-filled from the job opening.
		The panel's choice supersedes it, and the timeline records what it displaced so
		the change is not silent."""
		frappe.db.set_value("Job Applicant", self.campus_applicant, "custom_location",
		                    self.branch_via_table)

		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()

		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.campus_applicant, "custom_location"),
			self.branch_via_field)
		note = frappe.get_all("Comment", filters={
			"reference_doctype": "Job Applicant", "reference_name": self.campus_applicant,
			"comment_type": "Info"}, fields=["content"], order_by="creation desc", limit=1)
		self.assertIn(self.branch_via_table, note[0].content)  # "Replaces: ..."

	def test_the_offer_shows_where_the_panel_placed_them(self):
		"""Job Offer mirrors the candidate's location read-only, so whoever raises the
		offer sees the placement. It does not decide it — the panel does."""
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()

		offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": self.campus_applicant,
			"status": "Awaiting Response",
			"offer_date": nowdate(),
		})
		offer.flags.ignore_mandatory = True
		offer.flags.ignore_validate = True
		offer.insert(ignore_permissions=True)
		self.assertEqual(offer.custom_work_location, self.branch_via_field)

	# ── the first round settles it ──

	def test_a_later_round_inherits_the_location_and_cannot_change_it(self):
		"""Round 1 decides where the candidate goes; round 2 records the same posting.

		Otherwise the candidate's location is whatever the last interviewer to submit
		happened to pick.
		"""
		first = self._feedback(self.campus_interview, self.campus_applicant,
		                       self.branch_via_field)
		first.insert()
		first.submit()

		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertEqual(ctx["locked_to"], self.branch_via_field)
		self.assertEqual(ctx["locked_by"], PANELIST)

		# A second panel tries a different location — it is taken back to the settled one.
		second = self._feedback(self._interview(self.campus_applicant),
		                        self.campus_applicant, self.branch_via_table)
		second.insert()
		self.assertEqual(second.custom_work_location, self.branch_via_field)

	def test_a_later_round_does_not_rewrite_the_candidate(self):
		"""HR may have adjusted the location after round 1; a later panel submitting
		feedback must not silently put it back."""
		first = self._feedback(self.campus_interview, self.campus_applicant,
		                       self.branch_via_field)
		first.insert()
		first.submit()

		# HR moves them afterwards, straight on the candidate.
		frappe.db.set_value("Job Applicant", self.campus_applicant, "custom_location",
		                    self.branch_via_table)

		second = self._feedback(self._interview(self.campus_applicant),
		                        self.campus_applicant, self.branch_via_field)
		second.insert()
		second.submit()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.campus_applicant, "custom_location"),
			self.branch_via_table)

	def test_the_first_round_is_not_locked(self):
		"""Nothing has settled yet, so the first panel chooses freely — including for a
		candidate whose location was pre-filled from the job opening."""
		frappe.db.set_value("Job Applicant", self.campus_applicant, "custom_location",
		                    self.branch_via_table)
		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertIsNone(ctx["locked_to"])

		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		self.assertEqual(doc.custom_work_location, self.branch_via_field)

	def test_an_unsubmitted_feedback_does_not_lock(self):
		"""A draft is not a decision — the panel may still be filling it in."""
		draft = self._feedback(self.campus_interview, self.campus_applicant,
		                       self.branch_via_field)
		draft.insert()
		self.assertIsNone(iwl.locked_location(self.campus_applicant))

	def test_a_feedback_does_not_lock_against_itself(self):
		"""Re-saving the feedback that set the location must not treat it as settled by
		someone else, or amending it could never correct a mistake."""
		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()
		self.assertIsNone(iwl.locked_location(self.campus_applicant, exclude=doc.name))

	def test_lateral_candidate_is_never_touched(self):
		before = frappe.db.get_value("Job Applicant", self.lateral_applicant, "custom_location")
		doc = self._feedback(self.lateral_interview, self.lateral_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.lateral_applicant, "custom_location"),
			before)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_interview_work_location.run

	`bench run-tests` bootstraps ERPNext test records first, which on a site that
	already has a Fiscal Year fails before any of these tests get to run.
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestInterviewWorkLocation)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
