"""Tests for GD grouping: what regenerating does, and what a pushed group freezes.

The bug these pin down: generating groups used to WIPE every group on the round and
re-pool every Shortlisted candidate. Creating groups for three late arrivals therefore
rebuilt the whole hall and ran candidates who had already sat their GD — and been
advanced or rejected on it — back through the flow.

Now a pushed group is Completed and frozen: never regrouped, never re-numbered, its
candidates never pooled again, and its marks no longer editable.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_gd_freeze.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test GDF"
GD_STAGE = "Group Discussion"
NEXT_STAGE = "Technical Round 1"
STAGES = [(GD_STAGE, "Interview"), (NEXT_STAGE, "Interview"), ("HR Round", "Interview")]


class TestCampusGdFreeze(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive, cls.gd_round = cls._drive()
		cls.employees = frappe.get_all(
			"Employee", filters={"user_id": ["!=", ""], "status": "Active"},
			pluck="name", limit=2, order_by="name asc")
		cls._panelists()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all(
			"Job Applicant", filters={"email_id": ("like", "gdf.%@test.local")}, pluck="name")
		for name in applicants:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, filters in (
			("Campus Drive", {"drive_name": ("like", f"{PREFIX}%")}),
			("Campus Invite", {"campus_invite_name": ("like", f"{PREFIX}%")}),
			("Job Opening", {"job_title": ("like", f"{PREFIX}%")}),
			("Institute", {"institute_name": ("like", f"{PREFIX}%")}),
		):
			for name in frappe.get_all(doctype, filters=filters, pluck="name"):
				frappe.db.set_value(doctype, name, "docstatus", 0, update_modified=False)
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "is_active": 1})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
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
				{"round_name": GD_STAGE, "round_type": "Group Discussion",
				 "hiring_stage": GD_STAGE},
				{"round_name": NEXT_STAGE, "round_type": "Technical",
				 "hiring_stage": NEXT_STAGE},
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name, doc.rounds[0].round_code

	@classmethod
	def _panelists(cls):
		doc = frappe.get_doc("Campus Drive", cls.drive)
		doc.set("round_panelists", [])
		for i, emp in enumerate(cls.employees, start=1):
			doc.append("round_panelists", {"round_code": cls.gd_round,
			                               "panel_name": f"GD Panel {i}", "panelist": emp})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _candidates(self, count, start=0):
		made = []
		for i in range(start, start + count):
			doc = frappe.get_doc({
				"doctype": "Job Applicant", "applicant_name": f"GDF {i}",
				"email_id": f"gdf.{i}@test.local", "status": "Shortlisted",
				"source": "Campus Hiring", "job_title": self.opening,
				"custom_campus_invite": self.invite, "custom_institute": self.institute,
				"custom_campus_drive": self.drive, "custom_current_stage": GD_STAGE,
			})
			doc.flags.ignore_mandatory = True
			made.append(doc.insert(ignore_permissions=True).name)
		frappe.db.commit()
		return made

	def setUp(self):
		frappe.set_user("Administrator")
		# Each test starts from no candidates, no interviews and no groups.
		#
		# The interviews have to go FIRST and explicitly: a Job Applicant is named after
		# its email, so recreating gdf.400@test.local reuses the same docname and would
		# inherit the previous test's interview — which get_round_pool then treats as
		# "already scheduled" and quietly drops the candidate from the pool.
		stale = frappe.get_all("Job Applicant",
		                       filters={"email_id": ("like", "gdf.%@test.local")}, pluck="name")
		for doctype, field in (("Interview Feedback", "job_applicant"),
		                       ("Interview", "job_applicant")):
			for name in frappe.get_all(doctype, filters={field: ("in", stale or [""])},
			                           pluck="name"):
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True,
				                  delete_permanently=True)
		for name in stale:
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("gd_groups", [])
		doc.set("gd_group_members", [])
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	# ── helpers ──

	def _groups(self):
		return frappe.get_all(
			"Campus Drive GD Group",
			filters={"parent": self.drive, "round_code": self.gd_round},
			fields=["group_name", "group_status", "panel_name", "candidate_count"],
			order_by="idx asc")

	def _members(self, group=None):
		filters = {"parent": self.drive, "round_code": self.gd_round}
		if group:
			filters["group_name"] = group
		return frappe.get_all("Campus Drive GD Group Member", filters=filters,
		                      fields=["name", "group_name", "job_applicant", "result"])

	def _mark_and_push(self, group, result="Pass"):
		for row in self._members(group):
			frappe.db.set_value("Campus Drive GD Group Member", row.name, "result", result,
			                    update_modified=False)
		frappe.db.commit()
		return cd.apply_gd_results(self.drive, self.gd_round, groups=[group])

	# ── generating ──

	def test_generate_groups_everyone_once(self):
		self._candidates(6)
		res = cd.generate_gd_groups(self.drive, self.gd_round, group_size=3)
		self.assertEqual(res["groups"], 2)
		self.assertEqual(res["candidates"], 6)
		self.assertEqual(len(self._groups()), 2)

	def test_generating_again_with_nobody_new_is_refused(self):
		"""The old behaviour silently rebuilt the hall. Now it says nothing is new."""
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		before = self._groups()
		with self.assertRaises(frappe.ValidationError):
			cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		self.assertEqual(self._groups(), before)

	def test_late_arrivals_get_their_own_group_and_the_rest_are_untouched(self):
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		first = self._groups()
		first_members = {(m.group_name, m.job_applicant) for m in self._members()}

		self._candidates(2, start=100)          # two late arrivals
		res = cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)

		self.assertEqual(res["groups"], 1)      # only the new pair grouped
		self.assertEqual(res["candidates"], 2)
		self.assertEqual(res["already_grouped"], 4)
		after = self._groups()
		self.assertEqual(len(after), len(first) + 1)
		# the original groups are the same objects with the same people
		self.assertEqual([g.group_name for g in after][: len(first)],
		                 [g.group_name for g in first])
		self.assertTrue(first_members.issubset(
			{(m.group_name, m.job_applicant) for m in self._members()}))

	def test_new_groups_continue_the_numbering(self):
		""""Group 1" must not come to mean a different set of people tomorrow."""
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		self._candidates(2, start=200)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		names = [g.group_name for g in self._groups()]
		self.assertEqual(names, ["Group 1", "Group 2", "Group 3"])

	# ── pushing freezes ──

	def test_pushing_a_group_freezes_it(self):
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		target = self._groups()[0].group_name

		out = self._mark_and_push(target)
		self.assertIn(target, out["frozen"])
		statuses = {g.group_name: g.group_status for g in self._groups()}
		self.assertEqual(statuses[target], cd.GD_FROZEN_STATUS)
		# the group that was not pushed is untouched
		other = next(n for n in statuses if n != target)
		self.assertNotEqual(statuses[other], cd.GD_FROZEN_STATUS)

	def test_a_frozen_groups_candidates_are_never_pooled_again(self):
		"""The heart of it: a candidate who has sat their GD is not put in another."""
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		target = self._groups()[0].group_name
		done = {m.job_applicant for m in self._members(target)}
		self._mark_and_push(target)

		# Whatever the push leaves their status as, the freeze is what keeps them out
		# of the next pool — the exclusion must not depend on a status that other hooks
		# are free to change.
		for ja in done:
			frappe.db.set_value("Job Applicant", ja, "status", cd.GD_POOL_STATUS,
			                    update_modified=False)
		frappe.db.commit()

		self._candidates(2, start=300)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		regrouped = {m.job_applicant for m in self._members()
		             if m.group_name not in {g.group_name for g in self._groups()
		                                     if g.group_status == cd.GD_FROZEN_STATUS}}
		self.assertFalse(done & regrouped, "a finished candidate was grouped again")

	def test_rebuild_redoes_the_open_groups_but_never_a_frozen_one(self):
		self._candidates(6)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		frozen = self._groups()[0].group_name
		frozen_members = {m.job_applicant for m in self._members(frozen)}
		self._mark_and_push(frozen)

		res = cd.generate_gd_groups(self.drive, self.gd_round, group_size=4, rebuild=1)
		groups = {g.group_name: g.group_status for g in self._groups()}
		self.assertEqual(groups.get(frozen), cd.GD_FROZEN_STATUS)
		self.assertEqual(frozen_members, {m.job_applicant for m in self._members(frozen)})
		self.assertEqual(res["frozen_groups"], 1)
		# the four who had not run were regrouped at the new size
		self.assertEqual(res["candidates"], 4)

	def test_a_frozen_group_cannot_be_marked_or_moved(self):
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		groups = self._groups()
		frozen, other = groups[0].group_name, groups[1].group_name
		self._mark_and_push(frozen)

		with self.assertRaises(frappe.ValidationError):
			cd.bulk_gd_attendance(self.drive, self.gd_round, frozen, "Absent")
		row = self._members(frozen)[0]
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_member_field(self.drive, row.name, "result", "Fail")
		with self.assertRaises(frappe.ValidationError):
			cd.move_gd_member(self.drive, row.name, other)
		# and nobody may be moved INTO it either
		open_row = self._members(other)[0]
		with self.assertRaises(frappe.ValidationError):
			cd.move_gd_member(self.drive, open_row.name, frozen)

	# ── panels ──

	def test_one_interviewer_per_group(self):
		"""Two panels, two groups: each group gets its own, so an interviewer is never
		sitting in on a GD while the next group waits for them."""
		self._candidates(4)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		panels = [g.panel_name for g in self._groups()]
		self.assertEqual(len(panels), 2)
		self.assertEqual(len(set(panels)), 2, f"both groups got the same panel: {panels}")

	def test_panels_can_be_left_for_hr_to_assign(self):
		self._candidates(4)
		res = cd.generate_gd_groups(self.drive, self.gd_round, group_size=2, assign_panels=0)
		self.assertFalse(res["panels_assigned"])
		self.assertTrue(all(not g.panel_name for g in self._groups()))
		# ...and HR can then set one by hand
		target = self._groups()[0].group_name
		cd.set_gd_group_panel(self.drive, self.gd_round, target, "GD Panel 1")
		self.assertEqual(
			{g.group_name: g.panel_name for g in self._groups()}[target], "GD Panel 1")


	# ── manual assignment: HR places a candidate, an interviewer takes one ──

	def _roster_interview_round(self):
		"""Put two interviewers on the Technical round (R2) and return their users."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		rounds = {r.round_name: r.round_code for r in doc.rounds}
		code = rounds[NEXT_STAGE]
		doc.set("round_panelists",
		        [p for p in doc.round_panelists if p.round_code != code])
		for i, emp in enumerate(self.employees, start=1):
			doc.append("round_panelists", {"round_code": code,
			                               "panel_name": f"Tech Panel {i}", "panelist": emp})
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		users = [frappe.db.get_value("Employee", e, "user_id") for e in self.employees]
		return code, users

	def _waiting_at_next_stage(self, count):
		made = self._candidates(count, start=400)
		for ja in made:
			frappe.db.set_value("Job Applicant", ja, "custom_current_stage", NEXT_STAGE,
			                    update_modified=False)
		frappe.db.commit()
		return made

	def test_hr_can_see_who_is_waiting_and_who_could_take_them(self):
		code, users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(2)
		opts = cd.get_round_assignment_options(self.drive, code)
		self.assertEqual(opts["stage"], NEXT_STAGE)
		self.assertEqual({c["name"] for c in opts["candidates"]}, set(waiting))
		self.assertEqual({i["user"] for i in opts["interviewers"]}, set(users))

	def test_hr_assigns_a_candidate_to_one_named_interviewer(self):
		code, users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(2)

		res = cd.assign_round_interviewer(self.drive, code, users[1], [waiting[0]],
		                                  scheduled_on=nowdate())
		self.assertEqual(res["created"], 1)
		iv = frappe.get_all("Interview",
		                    filters={"job_applicant": waiting[0], "custom_campus_drive": self.drive},
		                    pluck="name")
		self.assertEqual(len(iv), 1)
		details = frappe.get_doc("Interview", iv[0]).interview_details
		# exactly ONE interviewer, and the one HR named — not a round-robin pick
		self.assertEqual([d.interviewer for d in details], [users[1]])

	def test_an_interviewer_not_on_the_round_is_refused(self):
		code, users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(1)
		with self.assertRaises(frappe.ValidationError):
			cd.assign_round_interviewer(self.drive, code, "Administrator", waiting,
			                            scheduled_on=nowdate())

	def test_an_interviewer_takes_candidates_onto_their_own_panel(self):
		code, users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(2)
		try:
			frappe.set_user(users[0])
			res = cd.claim_round_candidates(self.drive, code, [waiting[0]],
			                                scheduled_on=nowdate())
		finally:
			frappe.set_user("Administrator")
		self.assertEqual(res["created"], 1)
		iv = frappe.get_all("Interview",
		                    filters={"job_applicant": waiting[0], "custom_campus_drive": self.drive},
		                    pluck="name")
		details = frappe.get_doc("Interview", iv[0]).interview_details
		# it books THEM — the interviewer is the session user, never a parameter
		self.assertEqual([d.interviewer for d in details], [users[0]])

	def test_somebody_off_the_roster_cannot_claim(self):
		code, _users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(1)
		try:
			frappe.set_user("Administrator")   # not on this round's roster
			with self.assertRaises(frappe.PermissionError):
				cd.claim_round_candidates(self.drive, code, waiting, scheduled_on=nowdate())
		finally:
			frappe.set_user("Administrator")

	def test_the_automatic_deal_gives_one_interviewer_per_candidate(self):
		"""Two candidates, two interviewers: one each, not both on both."""
		code, users = self._roster_interview_round()
		waiting = self._waiting_at_next_stage(2)
		res = cd.schedule_round_interviews(self.drive, code, scheduled_on=nowdate())
		self.assertEqual(res["created"], 2)
		got = {}
		for ja in waiting:
			iv = frappe.get_all("Interview",
			                    filters={"job_applicant": ja, "custom_campus_drive": self.drive},
			                    pluck="name")[0]
			details = frappe.get_doc("Interview", iv).interview_details
			self.assertEqual(len(details), 1, "an interview carried more than one interviewer")
			got[ja] = details[0].interviewer
		self.assertEqual(len(set(got.values())), 2, f"both candidates went to the same person: {got}")


def run():
	"""Run this suite directly, without `bench run-tests`."""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusGdFreeze)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
