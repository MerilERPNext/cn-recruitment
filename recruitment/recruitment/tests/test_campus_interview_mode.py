"""Tests for the interview MODE and for moving an interview between interviewers.

Two things a drive needs once it is actually running:

  * **Mode.** A campus visit is normally all on-site or all online, so the Campus
    Drive carries a Drive Type and every interview it creates opens in that mode.
    But a single interview still has to be switchable — a panelist joining
    remotely, a candidate who could not travel — so the mode lives on the interview
    too and HR can override it per batch and per interview.
    Note the mode is ``custom_interview_type``, labelled "Mode of Interview". The
    stock ``interview_type`` Link is a different thing entirely (the round and its
    skill set); they used to share a label, which is what made this confusing.

  * **Reassignment.** Panels are dealt evenly but do not finish evenly — one
    panelist takes three quick candidates and is free while another is still on
    their first. HR must be able to hand the next candidate to whoever is free
    instead of cancelling and re-dealing. Not once feedback is in, though: that
    feedback belongs to the person who gave it.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_interview_mode.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test Mode"
STAGE = "Technical Round 1"
EMAIL_LIKE = "mode.cand%@test.local"


class TestCampusInterviewMode(FrappeTestCase):
	# ── fixtures ──

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		# Two panelists with User logins — one to deal to, one to move the candidate to.
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
		cls.candidates = [cls._applicant(i) for i in range(4)]
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant", filters={"email_id": ("like", EMAIL_LIKE)},
		                            pluck="name")
		for name in frappe.get_all("Interview Feedback",
		                           filters={"job_applicant": ("in", applicants or [""])},
		                           pluck="name"):
			doc = frappe.get_doc("Interview Feedback", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Interview Feedback", name, force=True, ignore_permissions=True)
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
		                      "tpo_contacts": [{"contact_name": "M TPO", "role": "Primary TPO",
		                                        "email": "mode.tpo@test.local"}]})
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
			"email_id": f"mode.cand{i}@test.local", "status": "Open", "source": "Campus Hiring",
			"job_title": cls.opening, "custom_campus_invite": cls.invite,
			"custom_campus_drive": cls.drive, "custom_institute": cls.institute,
			"custom_current_stage": STAGE,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")
		# Scheduling commits, so interviews outlive the per-test rollback.
		self._clear_interviews()
		frappe.db.set_value("Campus Drive", self.drive, "drive_type", "On-Site",
		                    update_modified=False)
		for name in self.candidates:
			frappe.db.set_value("Job Applicant", name,
			                    {"custom_current_stage": STAGE, "status": "Open"},
			                    update_modified=False)
		self._panels()
		frappe.db.commit()

	def tearDown(self):
		frappe.set_user("Administrator")
		self._clear_interviews()
		frappe.db.rollback()

	# ── helpers ──

	def _clear_interviews(self):
		for name in frappe.get_all("Interview", filters={"custom_campus_drive": self.drive},
		                           pluck="name"):
			for fb in frappe.get_all("Interview Feedback", filters={"interview": name},
			                         pluck="name"):
				doc = frappe.get_doc("Interview Feedback", fb)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc("Interview Feedback", fb, force=True, ignore_permissions=True)
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		frappe.db.commit()

	def _panels(self):
		"""One panel per panelist, so a candidate can be moved between two rosters."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		for i, employee in enumerate(self.employees):
			doc.append("round_panelists", {"round_code": self.round_code,
			                               "panel_name": f"Panel {i + 1}", "panelist": employee})
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _schedule(self, applicants=None, mode=None):
		return cd.schedule_round_interviews(self.drive, self.round_code, scheduled_on=nowdate(),
		                                    applicants=applicants or self.candidates[:1], mode=mode)

	def _interview(self, applicant=None):
		filters = {"custom_campus_drive": self.drive}
		if applicant:
			filters["job_applicant"] = applicant
		return frappe.get_all("Interview", filters=filters, pluck="name")[0]

	def _mode_of(self, interview):
		return frappe.db.get_value("Interview", interview, cd.INTERVIEW_MODE_FIELD)

	def _holder(self, interview):
		rows = frappe.get_all("Interview Detail", filters={"parent": interview},
		                      pluck="interviewer", order_by="idx asc")
		return rows[0] if rows else None

	def _other_user(self, current):
		return next(u for u in self.users if u != current)

	def _submit_feedback(self, interview):
		"""A submitted Interview Feedback from whoever currently holds `interview`."""
		iv = frappe.get_doc("Interview", interview)
		skill = frappe.get_all("Skill", pluck="name", limit=1)
		doc = frappe.get_doc({
			"doctype": "Interview Feedback",
			"interview": interview,
			"interviewer": self._holder(interview),
			"job_applicant": iv.job_applicant,
			"interview_type": iv.get("interview_type"),
			"result": "Cleared",
			"skill_assessment": [{"skill": skill[0], "rating": 0.8}] if skill else [],
		})
		doc.flags.ignore_mandatory = True
		doc.flags.ignore_permissions = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		frappe.db.commit()
		return doc.name

	# ── the drive carries the mode ──

	def test_a_drive_defaults_to_on_site(self):
		field = frappe.get_meta("Campus Drive").get_field("drive_type")
		self.assertEqual(field.default, "On-Site")
		self.assertEqual(field.options.split("\n"), ["On-Site", "Online"])

	def test_an_interview_takes_the_drives_mode(self):
		self._schedule()
		self.assertEqual(self._mode_of(self._interview()), "On-Site")

	def test_an_online_drive_makes_online_interviews(self):
		frappe.db.set_value("Campus Drive", self.drive, "drive_type", "Online",
		                    update_modified=False)
		self._schedule()
		self.assertEqual(self._mode_of(self._interview()), "Online")

	def test_hr_can_override_the_mode_for_one_batch(self):
		"""An otherwise on-site drive running a round over video."""
		res = self._schedule(mode="Online")
		self.assertEqual(res["mode"], "Online")
		self.assertEqual(self._mode_of(self._interview()), "Online")

	def test_the_drive_is_untouched_by_a_batch_override(self):
		self._schedule(mode="Online")
		self.assertEqual(
			frappe.db.get_value("Campus Drive", self.drive, "drive_type"), "On-Site")

	def test_a_nonsense_mode_is_refused(self):
		with self.assertRaises(frappe.ValidationError) as caught:
			self._schedule(mode="Telepathy")
		self.assertIn("not a valid mode", frappe.utils.strip_html(str(caught.exception)))

	def test_a_hand_assigned_interview_takes_the_mode_too(self):
		res = cd.assign_round_interviewer(
			self.drive, self.round_code, self.users[0], [self.candidates[0]],
			scheduled_on=nowdate(), mode="Online")
		self.assertEqual(res["created"], 1)
		self.assertEqual(self._mode_of(self._interview()), "Online")

	# ── the two type fields are no longer both "Interview Type" ──

	def test_the_mode_field_is_labelled_mode_of_interview(self):
		"""They shared a label, so a panel could not tell the round from the mode."""
		meta = frappe.get_meta("Interview")
		self.assertEqual(meta.get_field(cd.INTERVIEW_MODE_FIELD).label, "Mode of Interview")
		self.assertEqual(meta.get_field("interview_type").label, "Interview Type")

	def test_the_two_fields_are_different_kinds_of_thing(self):
		meta = frappe.get_meta("Interview")
		self.assertEqual(meta.get_field(cd.INTERVIEW_MODE_FIELD).fieldtype, "Select")
		self.assertEqual(meta.get_field("interview_type").fieldtype, "Link")

	# ── moving a candidate to a free interviewer ──

	def test_a_candidate_can_be_moved_to_another_interviewer(self):
		self._schedule()
		interview = self._interview()
		was = self._holder(interview)
		now = self._other_user(was)

		res = cd.reassign_round_interview(self.drive, interview, interviewer=now)
		self.assertTrue(res["changed"])
		self.assertEqual(self._holder(interview), now)

	def test_the_move_leaves_exactly_one_interviewer(self):
		"""One interviewer per interview is what keeps the verdict unambiguous."""
		self._schedule()
		interview = self._interview()
		cd.reassign_round_interview(self.drive, interview,
		                            interviewer=self._other_user(self._holder(interview)))
		self.assertEqual(frappe.db.count("Interview Detail", {"parent": interview}), 1)

	def test_the_move_carries_the_panel_across(self):
		"""The panel stamp is what the panel board groups by — a stale one would show
		the candidate under the panel they just left."""
		self._schedule()
		interview = self._interview()
		now = self._other_user(self._holder(interview))
		cd.reassign_round_interview(self.drive, interview, interviewer=now)
		roster, _missing = cd._round_roster(self.drive, self.round_code)
		self.assertEqual(
			frappe.db.get_value("Interview", interview, "custom_interview_panel"), roster[now])

	def test_the_mode_can_be_switched_on_one_interview(self):
		self._schedule()
		interview = self._interview()
		cd.reassign_round_interview(self.drive, interview, mode="Online")
		self.assertEqual(self._mode_of(interview), "Online")

	def test_re_saying_the_same_thing_changes_nothing(self):
		self._schedule()
		interview = self._interview()
		res = cd.reassign_round_interview(self.drive, interview,
		                                  interviewer=self._holder(interview), mode="On-Site")
		self.assertFalse(res["changed"])

	def test_someone_off_the_roster_cannot_be_given_the_interview(self):
		self._schedule()
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.reassign_round_interview(self.drive, self._interview(),
			                            interviewer="Administrator")
		self.assertIn("not on round", frappe.utils.strip_html(str(caught.exception)))

	def test_an_interview_from_another_drive_is_refused(self):
		self._schedule()
		interview = self._interview()
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.reassign_round_interview("NOT-A-DRIVE", interview, interviewer=self.users[0])
		self.assertIn("does not belong", frappe.utils.strip_html(str(caught.exception)))

	def test_an_interview_with_feedback_in_cannot_be_moved(self):
		"""The feedback belongs to the person who gave it — re-pointing the interview
		would file their assessment under someone else."""
		self._schedule()
		interview = self._interview()
		self._submit_feedback(interview)
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.reassign_round_interview(self.drive, interview,
			                            interviewer=self._other_user(self._holder(interview)))
		message = frappe.utils.strip_html(str(caught.exception))
		self.assertIn("Feedback has already been submitted", message)

	def test_the_board_stops_offering_a_row_once_feedback_is_in(self):
		"""The UI only offers Reassign where the server would allow it."""
		self._schedule()
		interview = self._interview()
		self._submit_feedback(interview)
		data = cd.get_round_interviews(self.drive, self.round_code)
		row = next(c for p in data["panels"] for c in p["candidates"]
		           if c["interview"] == interview)
		self.assertFalse(row["can_reassign"])

	def test_a_concluded_interview_cannot_be_moved(self):
		self._schedule()
		interview = self._interview()
		frappe.db.set_value("Interview", interview, "status", "Cleared", update_modified=False)
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.reassign_round_interview(self.drive, interview,
			                            interviewer=self._other_user(self._holder(interview)))
		self.assertIn("already Cleared", frappe.utils.strip_html(str(caught.exception)))

	# ── what the panel board shows ──

	def test_the_board_names_who_holds_each_interview(self):
		self._schedule()
		data = cd.get_round_interviews(self.drive, self.round_code)
		rows = [c for p in data["panels"] for c in p["candidates"]]
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["interviewer"], self._holder(rows[0]["interview"]))
		self.assertEqual(rows[0]["mode"], "On-Site")
		self.assertTrue(rows[0]["can_reassign"])

	def test_the_board_reports_each_interviewers_load(self):
		"""Whoever has nothing pending is the one HR is looking for."""
		self._schedule(applicants=self.candidates[:1])
		data = cd.get_round_interviews(self.drive, self.round_code)
		by_user = {r["user"]: r for r in data["roster"]}
		self.assertEqual(set(by_user), set(self.users))
		busy = self._holder(self._interview())
		self.assertEqual(by_user[busy]["pending"], 1)
		self.assertEqual(by_user[self._other_user(busy)]["pending"], 0)

	def test_the_board_carries_the_drives_mode_for_the_picker(self):
		data = cd.get_round_interviews(self.drive, self.round_code)
		self.assertEqual(data["drive_mode"], "On-Site")
		self.assertEqual(data["modes"], ["On-Site", "Online"])


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_interview_mode.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusInterviewMode)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
