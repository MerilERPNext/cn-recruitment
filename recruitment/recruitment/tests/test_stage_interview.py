"""Tests for the Interview-stage actions on the hiring workflow.

Covers recruitment.api.stage_interview and its wiring in hiring_stage: cancelling
and rescheduling an interview (and every condition that refuses them), and the
feedback form going to each interviewer's Tasks as one ToDo apiece.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_stage_interview
"""

from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.api import hiring_stage, stage_interview
from recruitment.api.hiring_stage import (_ensure_interview_round,
                                          _find_stage_interview,
                                          get_interview_round_doctype,
                                          get_interview_round_field)

PREFIX = "_Test StageIv"
STAGE = f"{PREFIX} Round"
FORM_A = f"{PREFIX} Form A"
FORM_B = f"{PREFIX} Form B"
OFFER = f"{PREFIX} Job Offer"
PANEL = ("stageiv.one@test.local", "stageiv.two@test.local", "stageiv.three@test.local")


class TestStageInterview(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.round_field = get_interview_round_field()
		cls.interview_round = _ensure_interview_round(STAGE)
		for email in PANEL:
			if not frappe.db.exists("User", email):
				frappe.get_doc({"doctype": "User", "email": email, "first_name": email.split("@")[0],
				                "enabled": 1, "send_welcome_email": 0,
				                "roles": [{"role": "Interviewer"}]}).insert(ignore_permissions=True)
		for label in (FORM_A, FORM_B):
			if not frappe.db.exists("Microapp Form Widget", label):
				w = frappe.new_doc("Microapp Form Widget")
				w.label = label
				w.doc_type = "Interview Feedback"
				w.custom_form_data = '{"components": []}'
				w.form_status = "Active"
				w.insert(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	def setUp(self):
		# The endpoints commit and send mail; keep every test inside its rollback.
		self._patches = [
			patch.object(frappe.db, "commit", lambda *a, **k: None),
			patch.object(hiring_stage, "sendmail_with_log", lambda **k: None),
			patch.object(stage_interview, "sendmail_with_log", lambda **k: None),
			# The opening's stages, one level below get_applicant_stages so a
			# candidate's own added stages are still merged in for real.
			patch.object(hiring_stage, "get_opening_stages",
			             lambda opening: [{"stage_name": STAGE, "stage_type": "Interview"},
			                              {"stage_name": OFFER, "stage_type": "Offer"}]),
			patch.object(hiring_stage, "is_hiring_workflow_enabled", lambda: True),
			patch.object(frappe, "sendmail", lambda *a, **k: None),
		]
		for p in self._patches:
			p.start()

	def tearDown(self):
		for p in self._patches:
			p.stop()
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant", filters={"email_id": ("like", "stageiv.cand%")},
		                            pluck="name")
		# Never ("in", [""]): with nothing to purge it would match every Interview
		# whose candidate is blank.
		interviews = frappe.get_all("Interview", filters={"job_applicant": ("in", applicants)},
		                            pluck="name") if applicants else []
		for name in interviews:
			frappe.db.delete("ToDo", {"reference_type": "Interview", "reference_name": name})
			frappe.db.delete("Interview Feedback", {"interview": name})
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for label in (FORM_A, FORM_B):
			if frappe.db.exists("Microapp Form Widget", label):
				frappe.delete_doc("Microapp Form Widget", label, force=True, ignore_permissions=True)
		for name in frappe.get_all(get_interview_round_doctype(), filters={"name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc(get_interview_round_doctype(), name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def _applicant(self):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": "StageIv Cand",
			"email_id": f"stageiv.cand{frappe.generate_hash(length=6)}@test.local",
			"status": "Open", "source": "Walk In", hiring_stage.STAGE_FIELD: STAGE,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc

	def _interview(self, applicant, panel=PANEL[:2], days=-1, **extra):
		doc = frappe.get_doc({
			"doctype": "Interview", "job_applicant": applicant.name,
			self.round_field: self.interview_round, "status": "Pending",
			"scheduled_on": add_days(nowdate(), days),
			"from_time": "10:00:00", "to_time": "11:00:00",
			"interview_details": [{"interviewer": u} for u in panel],
			**extra,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc

	def _feedback(self, interview, interviewer, submitted=True, result="Cleared"):
		fb = frappe.new_doc("Interview Feedback")
		fb.interview = interview.name
		fb.interviewer = interviewer
		fb.job_applicant = interview.job_applicant
		fb.set(get_interview_round_field("Interview Feedback") or "interview_round", self.interview_round)
		fb.result = result
		fb.flags.ignore_validate = True
		fb.flags.ignore_mandatory = True
		fb.insert(ignore_permissions=True)
		if submitted:
			fb.db_set("docstatus", 1)
		return fb

	def _tasks(self, interview, status="Open"):
		return sorted(frappe.get_all("ToDo", filters={
			"reference_type": "Interview", "reference_name": interview.name, "status": status,
			"description": ("like", f"%{stage_interview.TASK_MARKER}%"),
		}, pluck="allocated_to"))

	def _send(self, applicant, form=None):
		return hiring_stage.send_interview_feedback_form(applicant.name, STAGE, evaluation_form=form)

	def _view_stage(self, applicant):
		# Offers are not what these tests are about.
		with patch("recruitment.api.offer_lifecycle.offers_of", lambda *a, **k: []):
			view = hiring_stage.get_workflow_view(applicant.name)
		return next(s for s in view["stages"] if s["stage_name"] == STAGE)

	# ── cancel ──

	def test_cancel_frees_the_stage_and_keeps_the_record(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		stage_interview.cancel_interview(applicant.name, iv.name, "Candidate unavailable")

		self.assertEqual(frappe.db.get_value("Interview", iv.name, "status"), "Cancelled")
		self.assertIsNone(_find_stage_interview(applicant.name, self.interview_round))
		stage = self._view_stage(applicant)
		self.assertEqual(stage["interviews"], [])
		self.assertEqual([c["name"] for c in stage["cancelled_interviews"]], [iv.name])
		self.assertTrue(frappe.db.exists("Comment", {
			"reference_doctype": "Job Applicant", "reference_name": applicant.name,
			"content": ("like", "%Candidate unavailable%")}))

	def test_cancel_needs_a_reason(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		with self.assertRaises(frappe.ValidationError):
			stage_interview.cancel_interview(applicant.name, iv.name, "  ")

	def test_cancel_refused_once_feedback_is_in(self):
		applicant = self._applicant()
		iv = self._interview(applicant)
		self._feedback(iv, PANEL[0])
		with self.assertRaises(frappe.ValidationError):
			stage_interview.cancel_interview(applicant.name, iv.name, "x")
		self.assertIn("Feedback", self._view_stage(applicant)["interviews"][0]["change_blocked"])

	def test_cancel_refused_while_under_review_campus_or_teams(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		for field, value in (("status", "Under Review"),
		                     ("custom_calendar_event_id", "evt-1")):
			iv.reload()
			frappe.db.set_value("Interview", iv.name, field, value)
			with self.assertRaises(frappe.ValidationError):
				stage_interview.cancel_interview(applicant.name, iv.name, "x")
			frappe.db.set_value("Interview", iv.name, {"status": "Pending", "custom_calendar_event_id": None})
		self.assertTrue(stage_interview.change_blocker(
			{"docstatus": 0, "status": "Pending", "custom_campus_drive": "CD-1"}, 0))

	def test_cancel_refused_for_another_candidates_interview(self):
		iv = self._interview(self._applicant(), days=2)
		with self.assertRaises(frappe.ValidationError):
			stage_interview.cancel_interview(self._applicant().name, iv.name, "x")

	def test_feedback_cannot_be_filed_on_a_cancelled_interview(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		stage_interview.cancel_interview(applicant.name, iv.name, "x")
		with self.assertRaises(frappe.ValidationError):
			stage_interview.block_feedback_on_cancelled(frappe._dict(interview=iv.name))

	# ── reschedule ──

	def test_reschedule_hands_the_interview_to_a_new_panel(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		stage_interview.create_feedback_tasks(iv, list(PANEL[:2]), "Cand")
		new_day = add_days(nowdate(), 5)

		res = stage_interview.reschedule_interview(
			applicant.name, iv.name, new_day, "14:00:00", "15:00:00",
			f'["{PANEL[0]}", "{PANEL[2]}"]', "Panelist on leave")

		iv.reload()
		self.assertEqual(str(iv.scheduled_on), new_day)
		self.assertEqual([r.interviewer for r in iv.interview_details], [PANEL[0], PANEL[2]])
		self.assertEqual(res["removed"], [PANEL[1]])
		self.assertEqual(res["added"], [PANEL[2]])
		# The removed interviewer's task goes; the kept one's stays.
		self.assertEqual(self._tasks(iv), [PANEL[0]])
		self.assertEqual(self._tasks(iv, "Cancelled"), [PANEL[1]])

	def test_reschedule_puts_a_no_show_back_to_pending(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=-1)
		frappe.db.set_value("Interview", iv.name, "status", "Not Appeared")
		stage_interview.reschedule_interview(applicant.name, iv.name, add_days(nowdate(), 3),
		                                     "10:00:00", "11:00:00", list(PANEL[:2]))
		self.assertEqual(frappe.db.get_value("Interview", iv.name, "status"), "Pending")

	def test_reschedule_refusals(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		future = add_days(nowdate(), 4)
		cases = [
			(add_days(nowdate(), -2), "10:00:00", "11:00:00", list(PANEL[:2])),  # past
			(future, "11:00:00", "10:00:00", list(PANEL[:2])),                   # ends first
			(future, "10:00:00", "11:00:00", []),                                # no panel
			(future, "10:00:00", "11:00:00", ["nobody@test.local"]),             # not a user
			(str(iv.scheduled_on), "10:00:00", "11:00:00", list(PANEL[:2])),     # no change
		]
		for args in cases:
			with self.subTest(args=args), self.assertRaises(frappe.ValidationError):
				stage_interview.reschedule_interview(applicant.name, iv.name, *args)

	# ── feedback form → Tasks ──

	def test_feedback_form_goes_to_every_interviewer_once(self):
		applicant = self._applicant()
		iv = self._interview(applicant)
		res = self._send(applicant, FORM_A)

		self.assertEqual(sorted(res["tasks_created"]), sorted(PANEL[:2]))
		self.assertEqual(self._tasks(iv), sorted(PANEL[:2]))
		self.assertEqual(frappe.db.get_value("Interview", iv.name, "custom_evaluation_form"), FORM_A)
		self.assertEqual(frappe.db.get_value("Interview", iv.name, "status"), "Under Review")

		# Sending again reminds, it doesn't duplicate.
		self.assertEqual(self._send(applicant, FORM_A)["tasks_created"], [])
		self.assertEqual(len(self._tasks(iv)), 2)

	def test_only_interviewers_still_owing_feedback_get_a_task(self):
		applicant = self._applicant()
		iv = self._interview(applicant)
		self._feedback(iv, PANEL[0])
		res = self._send(applicant)
		self.assertEqual(res["sent_to"], [PANEL[1]])
		self.assertEqual(self._tasks(iv), [PANEL[1]])

	def test_form_locked_once_feedback_is_started(self):
		applicant = self._applicant()
		iv = self._interview(applicant, custom_evaluation_form=FORM_A)
		self._feedback(iv, PANEL[0], submitted=False)
		with self.assertRaises(frappe.ValidationError):
			self._send(applicant, FORM_B)
		self.assertEqual(frappe.db.get_value("Interview", iv.name, "custom_evaluation_form"), FORM_A)

	def test_archived_form_is_refused(self):
		applicant = self._applicant()
		self._interview(applicant)
		frappe.db.set_value("Microapp Form Widget", FORM_B, "is_archived", 1)
		with self.assertRaises(frappe.ValidationError):
			self._send(applicant, FORM_B)

	def test_not_before_the_interview_is_over(self):
		applicant = self._applicant()
		self._interview(applicant, days=2)
		with self.assertRaises(frappe.ValidationError):
			self._send(applicant, FORM_A)

	def test_tasks_close_on_feedback_and_on_decision_but_not_foreign_todos(self):
		applicant = self._applicant()
		iv = self._interview(applicant)
		self._send(applicant, FORM_A)
		# Someone else's ToDo on the same interview (e.g. a nextai approval task).
		foreign = frappe.get_doc({"doctype": "ToDo", "allocated_to": PANEL[1], "description": "Approve",
		                          "reference_type": "Interview", "reference_name": iv.name}
		                         ).insert(ignore_permissions=True)

		stage_interview.close_task_on_feedback(frappe._dict(interview=iv.name, interviewer=PANEL[0]))
		self.assertEqual(self._tasks(iv), [PANEL[1]])
		self.assertEqual(self._tasks(iv, "Closed"), [PANEL[0]])

		iv.reload()
		iv.status = "Cleared"
		iv.save(ignore_permissions=True)
		self.assertEqual(self._tasks(iv), [])
		self.assertEqual(frappe.db.get_value("ToDo", foreign.name, "status"), "Open")

	def test_cancel_cancels_open_tasks(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		stage_interview.create_feedback_tasks(iv, list(PANEL[:2]), "Cand")
		stage_interview.cancel_interview(applicant.name, iv.name, "x")
		self.assertEqual(self._tasks(iv), [])
		self.assertEqual(self._tasks(iv, "Cancelled"), sorted(PANEL[:2]))

	# ── a different form per interviewer ──

	def test_each_interviewer_gets_their_own_form(self):
		from recruitment.api.interview_feedback_form import form_for_interviewer, get_interview_feedback_form

		applicant = self._applicant()
		iv = self._interview(applicant)
		hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[0]}": "{FORM_A}", "{PANEL[1]}": "{FORM_B}"}}')

		self.assertEqual(form_for_interviewer(iv.name, PANEL[0]), FORM_A)
		self.assertEqual(form_for_interviewer(iv.name, PANEL[1]), FORM_B)
		self.assertEqual(get_interview_feedback_form(iv.name, interviewer=PANEL[1])["widget"], FORM_B)
		# A draft keeps the form it was started on — but only a form of this interview.
		self.assertEqual(get_interview_feedback_form(iv.name, interviewer=PANEL[1], form=FORM_A)["widget"], FORM_A)
		tasks = dict(frappe.get_all("ToDo", filters={"reference_name": iv.name, "status": "Open"},
		                            fields=["allocated_to", "description"], as_list=True))
		self.assertIn(FORM_A, tasks[PANEL[0]])
		self.assertIn(FORM_B, tasks[PANEL[1]])

	def test_feedback_is_stamped_with_the_interviewers_form(self):
		from recruitment.api.interview_feedback_form import validate_form_response

		applicant = self._applicant()
		iv = self._interview(applicant, custom_evaluation_form=FORM_A)
		hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[1]}": "{FORM_B}"}}')
		for user, form in ((PANEL[0], FORM_A), (PANEL[1], FORM_B)):
			fb = frappe._dict(interview=iv.name, interviewer=user, docstatus=0,
			                  custom_evaluation_form=None, custom_form_response="{}")
			validate_form_response(fb)
			self.assertEqual(fb.custom_evaluation_form, form)

	def test_one_interviewers_draft_locks_only_their_form(self):
		applicant = self._applicant()
		iv = self._interview(applicant, custom_evaluation_form=FORM_A)
		self._feedback(iv, PANEL[0], submitted=False)
		with self.assertRaises(frappe.ValidationError):
			hiring_stage.send_interview_feedback_form(
				applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[0]}": "{FORM_B}"}}')
		# The colleague who hasn't started can still be switched.
		hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[1]}": "{FORM_B}"}}')

	def test_changing_a_form_replaces_the_open_task(self):
		applicant = self._applicant()
		iv = self._interview(applicant)
		hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[0]}": "{FORM_A}", "{PANEL[1]}": "{FORM_A}"}}')
		hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[0]}": "{FORM_B}", "{PANEL[1]}": "{FORM_A}"}}')
		self.assertEqual(self._tasks(iv), sorted(PANEL[:2]))
		self.assertEqual(self._tasks(iv, "Cancelled"), [PANEL[0]])
		desc = frappe.db.get_value("ToDo", {"reference_name": iv.name, "allocated_to": PANEL[0],
		                                    "status": "Open"}, "description")
		self.assertIn(FORM_B, desc)

	# ── AND verdict ──

	def _verdict(self, iv, results):
		from recruitment.customizations.interview_feedback.interview_feedback import (
			check_feedback_and_update_result)
		for user, result in results.items():
			self._feedback(iv, user, result=result)
		check_feedback_and_update_result(frappe._dict(interview=iv.name))
		return frappe.db.get_value("Interview", iv.name, "status")

	def test_all_positive_clears(self):
		iv = self._interview(self._applicant(), panel=PANEL)
		self.assertEqual(self._verdict(iv, {u: "Cleared" for u in PANEL}), "Cleared")

	def test_one_negative_rejects_even_when_outvoted(self):
		iv = self._interview(self._applicant(), panel=PANEL)
		# Majority would have said Cleared.
		self.assertEqual(self._verdict(iv, {PANEL[0]: "Cleared", PANEL[1]: "Cleared", PANEL[2]: "Rejected"}),
		                 "Rejected")

	def test_waits_for_every_form(self):
		iv = self._interview(self._applicant(), panel=PANEL)
		self.assertEqual(self._verdict(iv, {PANEL[0]: "Rejected"}), "Pending")
		self.assertEqual(self._verdict(iv, {PANEL[1]: "Cleared"}), "Pending")

	# ── the candidate moves on only when every form is positive ──

	def _submit_each(self, iv, results):
		"""The on_submit chain a real feedback runs, one interviewer at a time:
		the interview's verdict first, then the candidate's stage."""
		from recruitment.customizations.interview_feedback.interview_feedback import (
			auto_advance_stage, on_submit_feedback)
		for user, result in results:
			fb = self._feedback(iv, user, result=result)
			on_submit_feedback(fb, "on_submit")
			auto_advance_stage(fb, "on_submit")

	def _where(self, applicant):
		applicant.reload()
		return applicant.get(hiring_stage.STAGE_FIELD), applicant.status

	def test_candidate_moves_on_only_when_every_form_is_positive(self):
		applicant = self._applicant()
		iv = self._interview(applicant, panel=PANEL[:2])
		self._submit_each(iv, [(PANEL[0], "Cleared")])
		# One positive form of two: still on the interview stage.
		self.assertEqual(self._where(applicant)[0], STAGE)
		self._submit_each(iv, [(PANEL[1], "Cleared")])
		self.assertEqual(self._where(applicant)[0], OFFER)

	def test_one_negative_form_keeps_the_candidate_from_moving_on(self):
		applicant = self._applicant()
		iv = self._interview(applicant, panel=PANEL[:2])
		self._submit_each(iv, [(PANEL[0], "Cleared"), (PANEL[1], "Rejected")])
		self.assertEqual(self._where(applicant), (STAGE, "Rejected"))

	def test_feedback_from_outside_the_panel_is_no_vote(self):
		iv = self._interview(self._applicant(), panel=PANEL[:2])
		self.assertEqual(self._verdict(iv, {PANEL[0]: "Cleared", PANEL[2]: "Cleared"}), "Pending")

	def test_campus_keeps_the_majority_vote(self):
		from recruitment.customizations.interview_feedback.interview_feedback import _all_must_clear

		self.assertFalse(_all_must_clear(frappe._dict(custom_campus_drive="CD-1")))
		self.assertTrue(_all_must_clear(frappe._dict(custom_campus_drive=None)))
		iv = self._interview(self._applicant(), panel=PANEL)
		with patch.object(hiring_stage, "is_hiring_workflow_enabled", lambda: False):
			self.assertEqual(self._verdict(iv, {PANEL[0]: "Cleared", PANEL[1]: "Cleared", PANEL[2]: "Rejected"}),
			                 "Cleared")

	# ── interview stages added for one candidate ──

	def _names(self, applicant):
		applicant.reload()
		return [s["stage_name"] for s in hiring_stage.get_applicant_stages(applicant)]

	def test_added_stage_sits_directly_after_its_anchor(self):
		applicant = self._applicant()
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 1")
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 2", after_stage=STAGE)
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 3", after_stage=f"{PREFIX} Extra 1")
		self.assertEqual(self._names(applicant),
		                 [STAGE, f"{PREFIX} Extra 2", f"{PREFIX} Extra 1", f"{PREFIX} Extra 3", OFFER])
		view_stage = next(s for s in self._view(applicant)["stages"] if s["stage_name"] == f"{PREFIX} Extra 1")
		self.assertEqual(view_stage["is_extra"], 1)
		# Another candidate on the same opening is untouched.
		self.assertEqual(self._names(self._applicant()), [STAGE, OFFER])

	def _view(self, applicant):
		with patch("recruitment.api.offer_lifecycle.offers_of", lambda *a, **k: []):
			return hiring_stage.get_workflow_view(applicant.name)

	def test_candidate_moves_through_the_added_stage(self):
		applicant = self._applicant()
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 1", evaluation_form=FORM_B)
		hiring_stage.move_to_next_stage(applicant.name)
		applicant.reload()
		self.assertEqual(applicant.get(hiring_stage.STAGE_FIELD), f"{PREFIX} Extra 1")
		prep = hiring_stage.prepare_interview(applicant.name)
		self.assertEqual(prep["evaluation_form"], FORM_B)

	def test_add_stage_refusals(self):
		applicant = self._applicant()
		cases = [
			dict(stage_name=STAGE.upper()),                     # duplicate name
			dict(stage_name="  "),                               # blank
			dict(stage_name="X", after_stage=OFFER),             # after the offer
			dict(stage_name="X", after_stage="Nowhere"),         # unknown anchor
		]
		for kwargs in cases:
			with self.subTest(**kwargs), self.assertRaises(frappe.ValidationError):
				stage_interview.add_interview_stage(applicant.name, **kwargs)
		for field, value in (("status", "Rejected"), ("custom_campus_drive", "CD-1"),
		                     (hiring_stage.STAGE_FIELD, None)):
			other = self._applicant()
			frappe.db.set_value("Job Applicant", other.name, field, value)
			with self.subTest(field=field), self.assertRaises(frappe.ValidationError):
				stage_interview.add_interview_stage(other.name, "X")

	def test_added_stage_cannot_go_behind_the_candidate(self):
		applicant = self._applicant()
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 1")
		frappe.db.set_value("Job Applicant", applicant.name, hiring_stage.STAGE_FIELD, f"{PREFIX} Extra 1")
		with self.assertRaises(frappe.ValidationError):
			stage_interview.add_interview_stage(applicant.name, "X", after_stage=STAGE)

	def test_remove_added_stage(self):
		applicant = self._applicant()
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 1")
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 2", after_stage=f"{PREFIX} Extra 1")
		stage_interview.remove_interview_stage(applicant.name, f"{PREFIX} Extra 1")
		# The stage that followed it keeps its place.
		self.assertEqual(self._names(applicant), [STAGE, f"{PREFIX} Extra 2", OFFER])
		# The opening's own stages can't be removed this way.
		with self.assertRaises(frappe.ValidationError):
			stage_interview.remove_interview_stage(applicant.name, STAGE)

	def test_remove_refused_once_reached_or_scheduled(self):
		applicant = self._applicant()
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 1")
		stage_interview.add_interview_stage(applicant.name, f"{PREFIX} Extra 2", after_stage=f"{PREFIX} Extra 1")
		rnd = _ensure_interview_round(f"{PREFIX} Extra 2")
		iv = frappe.get_doc({"doctype": "Interview", "job_applicant": applicant.name,
		                     self.round_field: rnd, "status": "Pending",
		                     "scheduled_on": add_days(nowdate(), 3), "from_time": "10:00:00",
		                     "to_time": "11:00:00", "interview_details": [{"interviewer": PANEL[0]}]})
		iv.flags.ignore_mandatory = True
		iv.insert(ignore_permissions=True)
		with self.assertRaises(frappe.ValidationError):
			stage_interview.remove_interview_stage(applicant.name, f"{PREFIX} Extra 2")
		frappe.db.set_value("Job Applicant", applicant.name, hiring_stage.STAGE_FIELD, f"{PREFIX} Extra 1")
		with self.assertRaises(frappe.ValidationError):
			stage_interview.remove_interview_stage(applicant.name, f"{PREFIX} Extra 1")

	def test_orphaned_added_stage_lands_before_the_offer(self):
		stages = [{"stage_name": "A", "stage_type": "Interview"}, {"stage_name": "O", "stage_type": "Offer"}]
		out = hiring_stage._with_extra_stages(stages, [{"stage_name": "X", "after_stage": "Gone", "idx": 1}])
		self.assertEqual([s["stage_name"] for s in out], ["A", "X", "O"])

	# ── the site's nextai approval tasks (Approval Policy Matrix per panel row) ──

	def _approval(self, iv, form=None):
		"""A pending tracker with one row task per panel member, as the matrix makes
		when the interview is first saved."""
		logs = []
		for row in iv.interview_details:
			todo = frappe.get_doc({"doctype": "ToDo", "allocated_to": row.interviewer,
			                       "description": "Approval required for Interview " + iv.name,
			                       "reference_type": "Interview", "reference_name": iv.name}
			                      ).insert(ignore_permissions=True)
			logs.append({"status": "Pending", "stage_index": 0, "user": row.interviewer,
			             "todo_reference": todo.name, "form_for_approval": form,
			             "is_row_log": 1, "row_parentfield": "interview_details",
			             "row_docnames": row.name, "row_label": row.interviewer})
		tracker = frappe.get_doc({"doctype": "Approval Tracker", "doc_type": "Interview",
		                          "doc_name": iv.name, "status": "Pending", "approval_logs": logs})
		tracker.flags.ignore_links = True
		tracker.flags.ignore_mandatory = True
		return tracker.insert(ignore_permissions=True)

	def _logs(self, tracker):
		return {l.user: frappe._dict(l) for l in frappe.get_all(
			"Approval Log Entry", filters={"parent": tracker.name},
			fields=["user", "status", "form_for_approval", "todo_reference"])}

	def test_approval_tasks_get_each_interviewers_form_and_no_duplicate(self):
		applicant = self._applicant()
		iv = self._interview(applicant, custom_evaluation_form=FORM_A)
		tracker = self._approval(iv, form=FORM_A)
		res = hiring_stage.send_interview_feedback_form(
			applicant.name, STAGE, interviewer_forms=f'{{"{PANEL[1]}": "{FORM_B}"}}')

		self.assertEqual(res["tasks_created"], [])          # their approval task IS the task
		self.assertEqual(res["approval_tasks"], sorted(PANEL[:2]))
		self.assertEqual(self._tasks(iv), [])
		logs = self._logs(tracker)
		self.assertEqual(logs[PANEL[0]].form_for_approval, FORM_A)
		self.assertEqual(logs[PANEL[1]].form_for_approval, FORM_B)

	def test_form_picked_on_the_interview_later_reaches_the_tasks(self):
		applicant = self._applicant()
		iv = self._interview(applicant)          # saved with no form: tasks went out without one
		tracker = self._approval(iv)
		iv.reload()
		iv.custom_evaluation_form = FORM_A
		iv.interview_details[1].custom_evaluation_form = FORM_B
		iv.save(ignore_permissions=True)
		logs = self._logs(tracker)
		self.assertEqual(logs[PANEL[0]].form_for_approval, FORM_A)
		self.assertEqual(logs[PANEL[1]].form_for_approval, FORM_B)

	def test_task_form_shows_the_interviewers_own_form_with_result(self):
		from recruitment.api.interview_feedback_approval import RESULT_KEY, add_result_question

		applicant = self._applicant()
		iv = self._interview(applicant, custom_evaluation_form=FORM_A)
		tracker = self._approval(iv, form=FORM_A)
		# Changed straight on the row, so the stored task form is stale.
		frappe.db.set_value("Interview Detail", iv.interview_details[1].name, "custom_evaluation_form", FORM_B)
		frappe.db.set_value("Microapp Form Widget", FORM_B, "custom_form_data",
		                    '{"components": [{"type": "textfield", "key": "only_in_b", "input": true}]}')
		log = next(l for l in tracker.approval_logs if l.user == PANEL[1])
		schema = add_result_question({"components": []}, log, tracker)
		keys = [c.get("key") for c in schema["components"]]
		self.assertIn("only_in_b", keys)
		self.assertIn(RESULT_KEY, keys)

	def test_cancel_revokes_the_approval(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		tracker = self._approval(iv)
		stage_interview.cancel_interview(applicant.name, iv.name, "Role on hold")
		self.assertEqual(frappe.db.get_value("Approval Tracker", tracker.name, "status"), "Revoked")
		for log in self._logs(tracker).values():
			self.assertEqual(log.status, "Cancelled")
			self.assertEqual(frappe.db.get_value("ToDo", log.todo_reference, "status"), "Cancelled")

	def test_reschedule_moves_the_task_to_the_new_interviewer(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		tracker = self._approval(iv)
		stage_interview.reschedule_interview(applicant.name, iv.name, add_days(nowdate(), 4),
		                                     "10:00:00", "11:00:00", [PANEL[0], PANEL[2]])
		logs = self._logs(tracker)
		self.assertEqual(logs[PANEL[0]].status, "Pending")
		self.assertEqual(logs[PANEL[1]].status, "Cancelled")
		self.assertEqual(frappe.db.get_value("Approval Tracker", tracker.name, "status"), "Pending")
		# The newcomer has no approval task, so gets the plain one.
		self.assertEqual(self._tasks(iv), [PANEL[2]])

	def test_feedback_on_the_form_settles_the_approval_task(self):
		from recruitment.api.interview_feedback_approval import close_approval_task_on_feedback

		applicant = self._applicant()
		iv = self._interview(applicant)
		tracker = self._approval(iv)
		close_approval_task_on_feedback(frappe._dict(interview=iv.name, interviewer=PANEL[0]))
		logs = self._logs(tracker)
		self.assertEqual(logs[PANEL[0]].status, "Cancelled")
		self.assertEqual(logs[PANEL[1]].status, "Pending")

	def test_feedback_filed_from_the_task_leaves_it_for_nextai(self):
		"""nextai files the feedback (on_approval_form_submit) BEFORE it approves the
		task, so the task must still be Pending when the feedback's on_submit runs —
		cancelling it there made nextai drop the approval as a duplicate."""
		from recruitment.api.interview_feedback_approval import close_approval_task_on_feedback

		applicant = self._applicant()
		iv = self._interview(applicant)
		tracker = self._approval(iv)
		feedback = frappe._dict(interview=iv.name, interviewer=PANEL[0],
		                        flags=frappe._dict(from_approval_task=True))
		close_approval_task_on_feedback(feedback)
		self.assertEqual({u: l.status for u, l in self._logs(tracker).items() if u in PANEL[:2]},
		                 {PANEL[0]: "Pending", PANEL[1]: "Pending"})

	def test_tasks_landing_after_the_save_are_reconciled(self):
		"""nextai creates the tracker after the Interview commits: per-interviewer
		forms and feedback that is already in are applied when it lands."""
		applicant = self._applicant()
		iv = self._interview(applicant, panel=PANEL)
		frappe.db.set_value("Interview Detail", iv.interview_details[1].name, "custom_evaluation_form", FORM_B)
		self._feedback(iv, PANEL[2])
		tracker = self._approval(iv)          # insert fires Approval Tracker on_update
		logs = self._logs(tracker)
		self.assertEqual(logs[PANEL[1]].form_for_approval, FORM_B)
		self.assertEqual(logs[PANEL[2]].status, "Cancelled")
		self.assertEqual(logs[PANEL[0]].status, "Pending")

	def test_tasks_landing_on_a_cancelled_interview_are_revoked(self):
		applicant = self._applicant()
		iv = self._interview(applicant, days=2)
		stage_interview.cancel_interview(applicant.name, iv.name, "x")
		tracker = self._approval(iv)
		self.assertEqual(frappe.db.get_value("Approval Tracker", tracker.name, "status"), "Revoked")


def run():
	"""Run this suite directly, without `bench run-tests` (tests are off on this site).

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_stage_interview.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestStageInterview)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
