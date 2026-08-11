"""Tests for the work location an interview panel sets on a campus candidate.

Covers recruitment.api.interview_work_location: where the region comes from, which
locations that region offers, who may ask, and what reaches the candidate when the
feedback is submitted.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_interview_work_location
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.api import interview_work_location as iwl

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

		# Two regions. Region A is mapped to locations both ways — one branch via
		# Branch.custom_region, one via Region.locations — because either master may
		# be the maintained one on a live site. Region B is mapped to nothing.
		cls.region_a = frappe.get_doc({
			"doctype": "Region", "location_region": f"{PREFIX} Region A"}
		).insert(ignore_permissions=True).name
		cls.region_b = frappe.get_doc({
			"doctype": "Region", "location_region": f"{PREFIX} Region B"}
		).insert(ignore_permissions=True).name

		cls.branch_via_field = _branch(f"{PREFIX} Loc A1", region=cls.region_a)
		cls.branch_via_table = _branch(f"{PREFIX} Loc A2")
		cls.branch_disabled = _branch(f"{PREFIX} Loc A3", region=cls.region_a, disabled=1)
		cls.branch_other_region = _branch(f"{PREFIX} Loc B1", region=cls.region_b)

		region_a = frappe.get_doc("Region", cls.region_a)
		region_a.append("locations", {"location": cls.branch_via_table})
		region_a.save(ignore_permissions=True)

		cls.institute = cls._institute()
		cls.invite = cls._invite(cls.region_a)
		cls.interview_type = cls._interview_type()

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
	def _interview_type(cls):
		name = f"{PREFIX} Type"
		if not frappe.db.exists("Interview Type", name):
			frappe.get_doc({
				"doctype": "Interview Type",
				"interview_type_name": name,
				"expected_skill_set": [{"skill": cls._skill_name()}],
			}).insert(ignore_permissions=True)
		return name

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
			"interview_type": cls.interview_type,
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

	def test_locations_union_both_masters_and_skip_disabled(self):
		self.assertEqual(iwl.get_region_branches(self.region_a),
		                 sorted([self.branch_via_field, self.branch_via_table]))

	def test_region_with_no_locations_mapped(self):
		self.assertEqual(iwl.get_region_branches(self.region_b),
		                 [self.branch_other_region])
		frappe.db.set_value("Branch", self.branch_other_region, "custom_region", None)
		self.assertEqual(iwl.get_region_branches(self.region_b), [])

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

	# ── who may ask ──

	def test_panel_member_may_ask_without_job_applicant_permission(self):
		"""The Interviewer role carries no Job Applicant permission, yet the panel is
		exactly who fills this field in."""
		frappe.set_user(PANELIST)
		self.assertFalse(frappe.has_permission("Job Applicant", "read",
		                                       doc=self.campus_applicant))
		ctx = iwl.get_work_location_context(self.campus_applicant)
		self.assertTrue(ctx["is_campus"])
		self.assertEqual(ctx["region"], self.region_a)

	def test_someone_off_the_panel_is_refused(self):
		frappe.set_user(OUTSIDER)
		with self.assertRaises(frappe.PermissionError):
			iwl.get_work_location_context(self.campus_applicant)

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
		frappe.db.set_value("Branch", self.branch_via_field, "custom_region", None)
		region_a = frappe.get_doc("Region", self.region_a)
		region_a.locations = []
		region_a.save(ignore_permissions=True)

		doc = self._feedback(self.campus_interview, self.campus_applicant,
		                     self.branch_other_region)
		doc.insert()
		self.assertEqual(doc.custom_work_location, self.branch_other_region)

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

	def test_a_later_feedback_overrides_and_says_what_it_replaced(self):
		first = self._feedback(self.campus_interview, self.campus_applicant,
		                       self.branch_via_field)
		first.insert()
		first.submit()

		second_interview = self._interview(self.campus_applicant)
		second = self._feedback(second_interview, self.campus_applicant,
		                        self.branch_via_table)
		second.insert()
		second.submit()

		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.campus_applicant, "custom_location"),
			self.branch_via_table)
		note = frappe.get_all("Comment", filters={
			"reference_doctype": "Job Applicant", "reference_name": self.campus_applicant,
			"comment_type": "Info"}, fields=["content"], order_by="creation desc", limit=1)
		self.assertIn(self.branch_via_field, note[0].content)  # "Replaces: ..."

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

	def test_lateral_candidate_is_never_touched(self):
		before = frappe.db.get_value("Job Applicant", self.lateral_applicant, "custom_location")
		doc = self._feedback(self.lateral_interview, self.lateral_applicant,
		                     self.branch_via_field)
		doc.insert()
		doc.submit()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", self.lateral_applicant, "custom_location"),
			before)
