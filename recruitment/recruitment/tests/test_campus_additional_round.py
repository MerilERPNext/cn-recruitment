"""Tests for the campus Additional Round — a second look at ONE candidate.

Covers what HR does with it end to end: the round it hangs off, the panel that takes
it, the fixed interview type (and how a repeat gets its own), the card it appears on,
and what its verdict does to the candidate — cleared hands them to the next round,
rejected rejects them.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_additional_round.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test AR"
STAGES = [
	("Resume Screening", "Screening"),
	("Technical Round 1", "Interview"),
	("Technical Round 2", "Interview"),
	("HR Round", "Interview"),
]
FIRST_ROUND_STAGE = "Technical Round 1"
NEXT_ROUND_STAGE = "Technical Round 2"


class TestCampusAdditionalRound(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive, cls.round_1, cls.round_2 = cls._drive()
		# One employee with a login per panel — an interviewer without one cannot take
		# an Interview, so the roster is built from employees that have one.
		cls.employees = frappe.get_all(
			"Employee", filters={"user_id": ["!=", ""], "status": "Active"},
			pluck="name", limit=2, order_by="name asc")
		cls._panelists()
		cls.candidates = [cls._applicant(f"ar.cand{i}@test.local") for i in range(3)]
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant", filters={"email_id": ("like", "ar.cand%@test.local")},
		                            pluck="name")
		for doctype, field in (("Interview Feedback", "job_applicant"), ("Interview", "job_applicant")):
			for name in frappe.get_all(doctype, filters={field: ("in", applicants or [""])}, pluck="name"):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True,
				                  delete_permanently=True)
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, filters in (
			("Campus Drive", {"drive_name": ("like", f"{PREFIX}%")}),
			("Campus Invite", {"campus_invite_name": ("like", f"{PREFIX}%")}),
			("Job Opening", {"job_title": ("like", f"{PREFIX}%")}),
			("Institute", {"institute_name": ("like", f"{PREFIX}%")}),
		):
			for name in frappe.get_all(doctype, filters=filters, pluck="name"):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
		"""An opening with a real hiring workflow — the stage list is what an additional
		round's verdict walks the candidate along."""
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_hiring_stages": [
				{"stage_name": name, "stage_type": kind, "owner_role": "System",
				 "notify": 0, "auto": 1} for (name, kind) in STAGES
			],
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
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _drive(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"campus_invites": [{"campus_invite": cls.invite}],
			"rounds": [
				{"round_name": FIRST_ROUND_STAGE, "round_type": "Technical",
				 "hiring_stage": FIRST_ROUND_STAGE},
				{"round_name": NEXT_ROUND_STAGE, "round_type": "Technical",
				 "hiring_stage": NEXT_ROUND_STAGE},
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name, doc.rounds[0].round_code, doc.rounds[1].round_code

	@classmethod
	def _panelists(cls, rows=None):
		"""Roster the drive.

		An additional round is staffed SEPARATELY from the round it hangs off, under
		that round's extra code (R1 -> R1-EXTRA), so the panels these tests pick from
		are filed there — the round's own panels judge the round, not the second look.
		"""
		doc = frappe.get_doc("Campus Drive", cls.drive)
		doc.set("round_panelists", [])
		for i, panel in enumerate(rows if rows is not None else ("Panel A", "Panel B")):
			doc.append("round_panelists", {
				"round_code": cd.extra_panel_round_code(cls.round_1), "panel_name": panel,
				"panelist": cls.employees[i % len(cls.employees)]})
		# The round's OWN panel, always present: every test that asserts the extra
		# roster is used needs a differently-staffed round roster to be distinguishable
		# from it.
		doc.append("round_panelists", {
			"round_code": cls.round_1, "panel_name": "Round Panel",
			"panelist": cls.employees[-1]})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _applicant(cls, email):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": email.split("@")[0],
			"email_id": email, "status": "Open", "source": "Campus Hiring",
			"job_title": cls.opening, "custom_campus_invite": cls.invite,
			"custom_institute": cls.institute, "custom_campus_drive": cls.drive,
			"custom_current_stage": FIRST_ROUND_STAGE,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")
		# Interviews and stage moves commit, so reset the pool before each test. The
		# workflow history goes with them: its rows link to the interviews being
		# deleted, and a candidate carrying a link to a deleted record cannot be saved.
		from recruitment.api.hiring_stage import HISTORY_FIELD

		history_dt = frappe.get_meta("Job Applicant").get_field(HISTORY_FIELD).options
		for name in self.candidates:
			for iv in frappe.get_all("Interview", filters={"job_applicant": name}, pluck="name"):
				frappe.delete_doc("Interview", iv, force=True, ignore_permissions=True,
				                  delete_permanently=True)
			frappe.db.delete(history_dt, {"parent": name, "parenttype": "Job Applicant"})
			frappe.db.set_value("Job Applicant", name,
			                    {"status": "Open", "custom_current_stage": FIRST_ROUND_STAGE},
			                    update_modified=False)
		frappe.db.commit()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── helpers ──

	def _cleared(self, candidate, round_code=None):
		"""Give the candidate a CLEARED interview on the round — an additional round is
		only offered to someone who has finished it. Idempotent, so a test that adds two
		additional rounds doesn't try to sit the same interview type twice."""
		from recruitment.api.hiring_stage import _ensure_interview_round

		round_code = round_code or self.round_1
		existing = frappe.db.exists("Interview", {
			"custom_campus_drive": self.drive, "custom_campus_round_code": round_code,
			"job_applicant": candidate, "status": "Cleared"})
		if existing:
			return existing

		iv = frappe.get_doc({
			"doctype": "Interview", "job_applicant": candidate, "job_opening": self.opening,
			"scheduled_on": nowdate(), "from_time": "09:00:00", "to_time": "18:00:00",
			"status": "Pending", "custom_campus_drive": self.drive,
			"custom_campus_round_code": round_code,
			"interview_details": [{"interviewer": frappe.db.get_value(
				"Employee", self.employees[0], "user_id")}],
		})
		cd._set_interview_round(iv, _ensure_interview_round(f"{PREFIX} {round_code}"))
		iv.flags.ignore_mandatory = True
		iv.insert(ignore_permissions=True)
		frappe.db.set_value("Interview", iv.name, "status", "Cleared", update_modified=False)
		return iv.name

	def _add(self, candidate, panel="Panel A", reason="Borderline — second look",
	         cleared=True, **kw):
		if cleared:
			self._cleared(candidate)
		return cd.add_candidate_interview(
			self.drive, candidate, scheduled_on=nowdate(), round_code=self.round_1,
			panel=panel, reason=reason, **kw)

	def _stage(self, candidate):
		return frappe.db.get_value("Job Applicant", candidate, "custom_current_stage")

	def _conclude(self, interview, status):
		frappe.db.set_value("Interview", interview, "status", status, update_modified=False)
		cd.advance_after_extra_round(frappe._dict(interview=interview))

	# ── creating one ──

	def test_it_creates_an_interview_on_the_chosen_panel(self):
		res = self._add(self.candidates[0], panel="Panel B")
		iv = frappe.get_doc("Interview", res["interview"])
		self.assertEqual(iv.custom_campus_drive, self.drive)
		self.assertEqual(iv.custom_campus_round_code, self.round_1)
		self.assertEqual(iv.custom_interview_panel, "Panel B")
		self.assertEqual(iv.status, "Pending")
		# the interviewers are that panel's, not just whoever came first — and the
		# panel is read off the ADDITIONAL round's roster, not the round's own
		panels, _m = cd._panels_for_round(
			frappe.get_doc("Campus Drive", self.drive),
			cd.extra_panel_round_code(self.round_1))
		self.assertEqual([d.interviewer for d in iv.interview_details], panels["Panel B"]["users"])

	def test_the_type_is_fixed_and_the_reason_is_recorded(self):
		res = self._add(self.candidates[0], reason="Weak on SQL, worth a retest")
		self.assertEqual(res["stage"], cd.EXTRA_ROUND_TYPE)
		self.assertEqual(
			frappe.db.get_value("Interview", res["interview"], "custom_extra_interview_reason"),
			"Weak on SQL, worth a retest")

	def test_a_repeat_gets_its_own_type(self):
		"""HRMS forbids sitting the same interview type twice — HR still only ever sees
		"Additional Round"; the variant is allocated for them."""
		candidate = self.candidates[0]
		self.assertEqual(cd._extra_round_type_for(candidate), cd.EXTRA_ROUND_TYPE)
		self._add(candidate)
		self.assertEqual(cd._extra_round_type_for(candidate), f"{cd.EXTRA_ROUND_TYPE} 2")
		second = self._add(candidate)
		self.assertEqual(second["stage"], f"{cd.EXTRA_ROUND_TYPE} 2")
		self.assertEqual(cd._extra_round_type_for(candidate), f"{cd.EXTRA_ROUND_TYPE} 3")

	def test_another_candidate_starts_from_the_base_type(self):
		self._add(self.candidates[0])
		self.assertEqual(cd._extra_round_type_for(self.candidates[1]), cd.EXTRA_ROUND_TYPE)

	def test_a_panel_that_is_not_on_the_round_is_refused(self):
		with self.assertRaises(frappe.ValidationError):
			self._add(self.candidates[0], panel="Panel Z")

	def test_a_reason_is_required(self):
		with self.assertRaises(frappe.ValidationError):
			self._add(self.candidates[0], reason="   ")

	def test_a_round_with_no_roster_says_so(self):
		self._panelists(rows=[])
		try:
			with self.assertRaises(frappe.ValidationError):
				self._add(self.candidates[0])
		finally:
			self._panelists()

	# ── seeing it on the board ──

	def test_it_shows_under_the_round_it_was_added_to(self):
		res = self._add(self.candidates[0], reason="Second look")
		rounds = {r["round_code"]: r for r in cd.get_rounds_overview(self.drive)["rounds"]}
		extras = rounds[self.round_1]["extras"]
		self.assertEqual(len(extras), 1)
		self.assertEqual(extras[0]["interview"], res["interview"])
		self.assertEqual(extras[0]["panel"], "Panel A")
		self.assertEqual(extras[0]["status"], "Pending")
		self.assertEqual(extras[0]["reason"], "Second look")
		self.assertTrue(extras[0]["applicant_name"])
		# ... and nowhere else
		self.assertEqual(rounds[self.round_2]["extras"], [])

	def test_an_ordinary_round_interview_is_not_an_extra(self):
		"""Only additional rounds get the card — a normally scheduled interview must not
		appear on it."""
		cd.schedule_round_interviews(self.drive, self.round_1, scheduled_on=nowdate())
		rounds = {r["round_code"]: r for r in cd.get_rounds_overview(self.drive)["rounds"]}
		self.assertTrue(rounds[self.round_1]["interviews"])
		self.assertEqual(rounds[self.round_1]["extras"], [])

	# ── what its verdict does ──

	def test_clearing_it_hands_the_candidate_to_the_next_round(self):
		candidate = self.candidates[0]
		res = self._add(candidate)
		self._conclude(res["interview"], "Cleared")
		self.assertEqual(self._stage(candidate), NEXT_ROUND_STAGE)

	def test_rejecting_it_rejects_the_candidate(self):
		candidate = self.candidates[0]
		res = self._add(candidate)
		self._conclude(res["interview"], "Rejected")
		self.assertEqual(frappe.db.get_value("Job Applicant", candidate, "status"), "Rejected")
		self.assertEqual(self._stage(candidate), FIRST_ROUND_STAGE)  # not moved on

	def test_a_candidate_is_never_moved_backwards_or_twice(self):
		"""The generic auto-advance may already have moved them; running this after must
		be a no-op rather than a second hop."""
		candidate = self.candidates[0]
		res = self._add(candidate)
		self._conclude(res["interview"], "Cleared")
		self._conclude(res["interview"], "Cleared")
		self.assertEqual(self._stage(candidate), NEXT_ROUND_STAGE)

	def test_a_pending_verdict_moves_nobody(self):
		candidate = self.candidates[0]
		res = self._add(candidate)
		cd.advance_after_extra_round(frappe._dict(interview=res["interview"]))
		self.assertEqual(self._stage(candidate), FIRST_ROUND_STAGE)

	def test_an_ordinary_interview_is_left_to_the_normal_flow(self):
		"""The hook must ignore anything that is not an additional round, or a routine
		round's feedback would advance candidates twice."""
		cd.schedule_round_interviews(self.drive, self.round_1, scheduled_on=nowdate())
		iv = frappe.get_all("Interview", filters={"custom_campus_drive": self.drive},
		                    pluck="name")[0]
		candidate = frappe.db.get_value("Interview", iv, "job_applicant")
		self._conclude(iv, "Cleared")
		self.assertEqual(self._stage(candidate), FIRST_ROUND_STAGE)

	# ── who may be given one, and who may take it ──

	def test_only_candidates_who_cleared_the_round_are_offered(self):
		"""The picker used to list the whole drive — including people who never sat this
		round."""
		cleared, not_cleared = self.candidates[0], self.candidates[1]
		self._cleared(cleared)
		options = cd.get_extra_round_options(self.drive, self.round_1)
		offered = [c["name"] for c in options["candidates"]]
		self.assertIn(cleared, offered)
		self.assertNotIn(not_cleared, offered)
		# and the label carries what HR needs to tell two candidates apart
		row = options["candidates"][0]
		self.assertTrue(row["applicant_name"])
		self.assertEqual(row["institute"], self.institute)

	def test_a_candidate_who_has_not_cleared_it_is_refused(self):
		with self.assertRaises(frappe.ValidationError):
			self._add(self.candidates[1], cleared=False)

	def test_only_the_additional_rounds_own_panels_are_offered(self):
		"""An additional round is judged by the panel rostered FOR it (R1-EXTRA), not by
		the panel that judged R1, and not by some other round's panel. Offering every
		panel on the drive quietly put a candidate in front of interviewers nobody had
		assigned to a second look."""
		extra_code = cd.extra_panel_round_code(self.round_1)
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.append("round_panelists", {"round_code": self.round_2, "panel_name": "Panel R2",
		                               "panelist": self.employees[0]})
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		try:
			options = cd.get_extra_round_options(self.drive, self.round_1)
			offered = options["panels"]
			self.assertEqual(
				{(p["round_code"], p["panel"]) for p in offered},
				{(extra_code, "Panel A"), (extra_code, "Panel B")})
			# neither the round's own panel nor another round's leaks in
			self.assertNotIn("Round Panel", {p["panel"] for p in offered})
			self.assertNotIn("Panel R2", {p["panel"] for p in offered})
			self.assertTrue(all(p["interviewers"] for p in offered))
			# and the dialog is told which code to add when it is empty
			self.assertEqual(options["extra_panel_round_code"], extra_code)
		finally:
			self._panelists()

	def test_the_round_code_for_the_extra_roster_is_derived_and_idempotent(self):
		self.assertEqual(cd.extra_panel_round_code("R3"), "R3" + cd.EXTRA_PANEL_SUFFIX)
		# the dialog sends the resolved code back on submit, so re-resolving must not
		# stack a second suffix
		self.assertEqual(cd.extra_panel_round_code("R3" + cd.EXTRA_PANEL_SUFFIX),
		                 "R3" + cd.EXTRA_PANEL_SUFFIX)
		self.assertIsNone(cd.extra_panel_round_code(""))
		self.assertIsNone(cd.extra_panel_round_code(None))

	def test_a_panel_from_another_round_cannot_take_it(self):
		"""Borrowing another round's roster is refused: `panel_round` is put through the
		same resolver, so it can only ever name an additional-round roster."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.append("round_panelists", {"round_code": self.round_2, "panel_name": "Panel R2",
		                               "panelist": self.employees[-1]})
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		try:
			with self.assertRaises(frappe.ValidationError):
				self._add(self.candidates[0], panel="Panel R2", panel_round=self.round_2)
		finally:
			self._panelists()

	def test_the_rounds_own_panel_cannot_take_it(self):
		"""The panel that judged R1 is rostered on R1, not R1-EXTRA — a second look is
		staffed deliberately."""
		with self.assertRaises(frappe.ValidationError):
			self._add(self.candidates[0], panel="Round Panel")

	def test_a_missing_extra_roster_names_the_code_to_add(self):
		""""Add a panel" is useless on its own: Round Code is free text on Round
		Panelists, so the message has to say what to type."""
		extra_code = cd.extra_panel_round_code(self.round_1)
		self._panelists(rows=[])          # leaves only the round's OWN panel
		try:
			options = cd.get_extra_round_options(self.drive, self.round_1)
			self.assertEqual(options["panels"], [])
			self.assertEqual(options["extra_panel_round_code"], extra_code)
			with self.assertRaises(frappe.ValidationError) as caught:
				self._add(self.candidates[0])
			self.assertIn(extra_code, str(caught.exception))
		finally:
			self._panelists()


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_additional_round.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusAdditionalRound)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
