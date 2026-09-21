"""Tests for the Group Discussion doctype — the panel's own copy of one GD group.

What these pin down:

  * a group with a panel gets a Group Discussion; a group WITHOUT one gets nothing,
    and assigning the panel later is what creates it (the manual route);
  * the Campus Drive is the record of truth — a mark made on the Group Discussion
    lands on the drive's own row, and a mark made on the drive shows up here;
  * finishing a GD from the panel's side advances the passers, rejects the fails and
    freezes the group on BOTH sides;
  * a panel member sees their own GD and nobody else's.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_group_discussion.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.permissions.doc_type_permissions import (
	group_discussion_has_permission,
	group_discussion_query,
)
from recruitment.recruitment.campus_gd_sync import reconcile
from recruitment.recruitment.doctype.campus_drive import campus_drive as cd
from recruitment.recruitment.doctype.group_discussion import group_discussion as gd

PREFIX = "_Test GDDT"
GD_STAGE = "Group Discussion"
NEXT_STAGE = "Technical Round 1"
STAGES = [(GD_STAGE, "Interview"), (NEXT_STAGE, "Interview"), ("HR Round", "Interview")]
EMAIL = "gddt.%@test.local"


class TestGroupDiscussion(FrappeTestCase):
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
		cls.users = [frappe.db.get_value("Employee", e, "user_id") for e in cls.employees]
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant", filters={"email_id": ("like", EMAIL)},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for emp in frappe.get_all("Employee", filters={"user_id": "gddt.panel@test.local"},
		                          pluck="name"):
			frappe.delete_doc("Employee", emp, force=True, ignore_permissions=True)
		if frappe.db.exists("User", "gddt.panel@test.local"):
			frappe.delete_doc("User", "gddt.panel@test.local", force=True,
			                  ignore_permissions=True)
		for name in frappe.get_all("Group Discussion",
		                           filters={"drive_name": ("like", f"{PREFIX}%")}, pluck="name"):
			frappe.delete_doc("Group Discussion", name, force=True, ignore_permissions=True,
			                  ignore_on_trash=True)
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
		# A region on the invite is the drive's own region, and the last link in the
		# chain a Group Discussion resolves its region from — without one the region
		# test has nothing to assert against.
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"region": (frappe.get_all("Region", pluck="name", limit=1) or [None])[0],
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
				{"round_name": GD_STAGE, "round_type": "Group Discussion", "hiring_stage": GD_STAGE},
				{"round_name": NEXT_STAGE, "round_type": "Technical", "hiring_stage": NEXT_STAGE},
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name, doc.rounds[0].round_code

	# ── per-test state ──

	def setUp(self):
		frappe.set_user("Administrator")
		self._clear_groups()
		self._candidates(4)

	def tearDown(self):
		frappe.set_user("Administrator")
		self._clear_groups()
		for name in frappe.get_all("Job Applicant", filters={"email_id": ("like", EMAIL)},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def _clear_groups(self):
		for name in frappe.get_all("Group Discussion", filters={"campus_drive": self.drive},
		                           pluck="name"):
			frappe.delete_doc("Group Discussion", name, force=True, ignore_permissions=True,
			                  ignore_on_trash=True)
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("gd_groups", [])
		doc.set("gd_group_members", [])
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _plain_interviewer(cls):
		"""A user with NO recruitment role, and the Employee behind them.

		The point of the whole doctype is that this person needs nothing but a seat on
		the panel — so the access test has to be run as somebody who could not read a
		Campus Drive if they tried.
		"""
		email = "gddt.panel@test.local"
		if not frappe.db.exists("User", email):
			user = frappe.get_doc({"doctype": "User", "email": email,
			                       "first_name": f"{PREFIX} Panel", "send_welcome_email": 0,
			                       "roles": [{"role": "Employee"}]})
			user.flags.ignore_permissions = True
			user.insert(ignore_permissions=True)
		emp = frappe.db.get_value("Employee", {"user_id": email}, "name")
		if not emp:
			doc = frappe.get_doc({
				"doctype": "Employee", "first_name": f"{PREFIX} Panel",
				"user_id": email, "status": "Active",
				"company": frappe.get_all("Company", pluck="name")[0],
				"department": frappe.get_all("Department", pluck="name")[0],
				"designation": frappe.get_all("Designation", pluck="name")[0],
				"date_of_joining": add_days(nowdate(), -365),
				"date_of_birth": add_days(nowdate(), -9000), "gender": "Other",
			})
			doc.flags.ignore_mandatory = True
			emp = doc.insert(ignore_permissions=True).name
		return email, emp

	def _panelists(self, count):
		"""Put `count` one-person panels on the GD round (none at all when 0)."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		for i, emp in enumerate(self.employees[:count], start=1):
			doc.append("round_panelists", {"round_code": self.gd_round,
			                               "panel_name": f"GD Panel {i}", "panelist": emp})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _candidates(self, count):
		for i in range(count):
			# custom_current_stage is not decoration: without it the stage engine
			# derives the status from the workflow and the applicant lands on
			# "Interview", out of the Shortlisted pool `generate_gd_groups` reads.
			doc = frappe.get_doc({
				"doctype": "Job Applicant", "applicant_name": f"{PREFIX} Cand {i}",
				"email_id": f"gddt.{i}@test.local", "status": "Shortlisted",
				"source": "Campus Hiring", "job_title": self.opening,
				"custom_institute": self.institute, "custom_campus_invite": self.invite,
				"custom_campus_drive": self.drive, "custom_current_stage": GD_STAGE,
			})
			doc.flags.ignore_mandatory = True
			doc.insert(ignore_permissions=True)
		frappe.db.commit()

	def _gds(self):
		return frappe.get_all("Group Discussion", filters={"campus_drive": self.drive},
		                      fields=["name", "group_name", "panel_name", "status",
		                              "results_pushed", "candidate_count"],
		                      order_by="group_name asc")

	# ── tests ──

	def test_groups_with_a_panel_get_their_own_document(self):
		self._panelists(2)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)

		gds = self._gds()
		groups = frappe.get_all("Campus Drive GD Group",
		                        filters={"parent": self.drive, "parenttype": "Campus Drive"},
		                        fields=["group_name", "panel_name"])
		self.assertEqual(len(gds), len(groups))
		self.assertTrue(all(g.panel_name for g in gds))

		# each carries its own group's candidates and its own panel's interviewer
		for row in gds:
			doc = frappe.get_doc("Group Discussion", row.name)
			self.assertEqual(len(doc.candidates), row.candidate_count)
			self.assertTrue(doc.candidates)
			self.assertEqual(len(doc.interviewers), 1)
			self.assertIn(doc.interviewers[0].interviewer, self.users)
			self.assertTrue(all(c.drive_member for c in doc.candidates))

	def test_no_panel_no_document_until_one_is_assigned(self):
		self._panelists(1)
		# built deliberately without panels — the manual route
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2, assign_panels=0)
		self.assertEqual(self._gds(), [])

		group = frappe.get_all(
			"Campus Drive GD Group",
			filters={"parent": self.drive, "parenttype": "Campus Drive"},
			pluck="group_name", order_by="idx asc")[0]

		cd.set_gd_group_panel(self.drive, self.gd_round, group, "GD Panel 1")
		gds = self._gds()
		self.assertEqual(len(gds), 1)
		self.assertEqual(gds[0].group_name, group)

		# ...and taking the panel away takes the document with it
		cd.set_gd_group_panel(self.drive, self.gd_round, group, None)
		self.assertEqual(self._gds(), [])

	def test_marking_travels_both_ways(self):
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)
		row = doc.candidates[0]

		# panel -> drive
		gd.set_candidate_field(doc.name, row.name, "result", "Pass")
		self.assertEqual(
			frappe.db.get_value("Campus Drive GD Group Member", row.drive_member, "result"),
			"Pass")
		# first mark starts the GD, on both sides
		self.assertEqual(frappe.db.get_value("Group Discussion", doc.name, "status"), "In Progress")
		self.assertEqual(
			frappe.db.get_value("Campus Drive GD Group",
			                    {"parent": self.drive, "parenttype": "Campus Drive",
			                     "group_name": doc.group_name}, "group_status"),
			"In Progress")

		# drive -> panel
		cd.set_gd_member_field(self.drive, row.drive_member, "attendance", "Present")
		self.assertEqual(
			frappe.db.get_value("Group Discussion Candidate", row.name, "attendance"), "Present")

	def test_panel_finishes_its_own_group(self):
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)
		for i, row in enumerate(doc.candidates):
			gd.set_candidate_field(doc.name, row.name, "result", "Pass" if i % 2 == 0 else "Fail")

		result = gd.push_results(doc.name)
		self.assertEqual(result["advanced"] + result["rejected"], len(doc.candidates))

		doc.reload()
		self.assertEqual(doc.status, "Completed")
		self.assertTrue(doc.results_pushed)
		# frozen on the drive too — that is what stops the group being regrouped
		self.assertEqual(
			frappe.db.get_value("Campus Drive GD Group",
			                    {"parent": self.drive, "parenttype": "Campus Drive",
			                     "group_name": doc.group_name}, "group_status"),
			"Completed")
		# and it cannot be pushed a second time
		with self.assertRaises(frappe.ValidationError):
			gd.push_results(doc.name)

	def test_an_unmarked_group_cannot_be_finished(self):
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)
		with self.assertRaises(frappe.ValidationError):
			gd.push_results(doc.name)

	def test_completed_is_reached_by_pushing_not_by_picking(self):
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)
		with self.assertRaises(frappe.ValidationError):
			gd.set_status(doc.name, "Completed")
		gd.set_status(doc.name, "Scheduled")
		self.assertEqual(frappe.db.get_value("Group Discussion", doc.name, "status"), "Scheduled")

	def test_a_panel_member_sees_only_their_own(self):
		if len(self.users) < 2:
			self.skipTest("needs two Employees with logins")
		self._panelists(2)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		gds = self._gds()
		self.assertGreaterEqual(len(gds), 2)

		user = self.users[0]
		mine = [g.name for g in gds
		        if frappe.db.exists("Group Discussion Interviewer",
		                            {"parent": g.name, "interviewer": user})]
		theirs = [g.name for g in gds if g.name not in mine]
		self.assertTrue(mine and theirs, "the two panels should hold different groups")

		# the list query hands them their own...
		visible = frappe.get_all(
			"Group Discussion", filters={"campus_drive": self.drive},
			or_filters=None, pluck="name",
			# the hook's condition, applied by hand so the test does not depend on
			# whatever roles this site's demo Employees happen to carry
		)
		condition = group_discussion_query(user)
		self.assertNotEqual(condition.strip(), "1=1",
		                    "a plain panel member must not get the unscoped condition")
		scoped = frappe.db.sql(
			f"SELECT name FROM `tabGroup Discussion` WHERE campus_drive = %s AND ({condition})",
			self.drive, pluck=True)
		self.assertEqual(sorted(scoped), sorted(mine))
		self.assertTrue(set(visible) >= set(scoped))

		# ...and a single document they are not on is refused outright
		self.assertIs(
			group_discussion_has_permission(frappe.get_doc("Group Discussion", theirs[0]),
			                                "read", user),
			False)
		self.assertIsNone(
			group_discussion_has_permission(frappe.get_doc("Group Discussion", mine[0]),
			                                "read", user))

	def test_a_plain_interviewer_marks_their_group_and_sees_no_other(self):
		"""The whole feature, end to end, as the person it exists for: no recruitment
		role, no permission on the Campus Drive, one GD they can work in."""
		if len(self.employees) < 1:
			self.skipTest("needs an Employee with a login")
		email, emp = self._plain_interviewer()

		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [
			{"round_code": self.gd_round, "panel_name": "GD Panel 1", "panelist": emp},
			{"round_code": self.gd_round, "panel_name": "GD Panel 2",
			 "panelist": self.employees[0]},
		])
		doc.save(ignore_permissions=True)
		frappe.db.commit()

		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		gds = self._gds()
		mine = [g.name for g in gds if g.panel_name == "GD Panel 1"]
		theirs = [g.name for g in gds if g.panel_name == "GD Panel 2"]
		self.assertTrue(mine and theirs, "both panels should have drawn a group")

		frappe.set_user(email)
		try:
			# they cannot touch the drive at all...
			self.assertFalse(frappe.has_permission("Campus Drive", "write"))
			# ...but the list hands them exactly their own GDs
			visible = frappe.get_list("Group Discussion", limit=0, pluck="name")
			self.assertEqual(sorted(visible), sorted(mine))
			self.assertFalse(frappe.has_permission("Group Discussion", "read", doc=theirs[0]))
			self.assertTrue(frappe.has_permission("Group Discussion", "write", doc=mine[0]))

			# and they can mark their own group
			gd_doc = frappe.get_doc("Group Discussion", mine[0])
			row = gd_doc.candidates[0]
			gd.set_candidate_field(gd_doc.name, row.name, "result", "Pass")
			self.assertEqual(
				frappe.db.get_value("Campus Drive GD Group Member", row.drive_member, "result"),
				"Pass")

			# but not somebody else's
			other = frappe.get_doc("Group Discussion", theirs[0])
			with self.assertRaises(frappe.PermissionError):
				gd.set_candidate_field(other.name, other.candidates[0].name, "result", "Pass")
		finally:
			frappe.set_user("Administrator")

	def test_a_group_name_carries_its_drive(self):
		"""A panel member's list spans every drive they sit on, so three rows all
		called "Group 1" would tell them nothing."""
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		drive_name = frappe.db.get_value("Campus Drive", self.drive, "drive_name")
		names = frappe.get_all("Campus Drive GD Group",
		                       filters={"parent": self.drive, "parenttype": "Campus Drive"},
		                       pluck="group_name", order_by="idx asc")
		self.assertEqual(names, [f"Group {n} - {drive_name}" for n in (1, 2)])
		# and the Group Discussion is titled by the same name
		self.assertEqual(sorted(g.group_name for g in self._gds()), sorted(names))

	def test_numbering_survives_the_longer_name(self):
		"""Reading the TRAILING digits of "Group 3 - Drive 2026" would give 2026 and
		send the next group to Group 2027."""
		self.assertEqual(cd._highest_group_no(["Group 3 - Amity 2026"]), 3)
		# names from before the drive was part of them still read correctly
		self.assertEqual(cd._highest_group_no(["Group 1", "Group 10"]), 10)
		self.assertEqual(cd._highest_group_no([]), 0)

		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		self._candidates(2)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		numbers = sorted(
			int(n.split()[1]) for n in frappe.get_all(
				"Campus Drive GD Group",
				filters={"parent": self.drive, "parenttype": "Campus Drive"},
				pluck="group_name"))
		self.assertEqual(numbers, [1, 2, 3], "the late group must continue the numbering")

	def test_the_gd_carries_the_region_that_runs_it(self):
		"""Panel tag first, then the college's, then the drive's own."""
		region = frappe.db.get_value("Campus Invite", self.invite, "region")
		if not region:
			self.skipTest("this site's invites carry no region")
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		gd_name = self._gds()[0].name
		# no panel tag and no per-institute split -> the drive's own region
		self.assertEqual(frappe.db.get_value("Group Discussion", gd_name, "region"), region)

		# a panel that names its own region overrides it
		other = next((r for r in frappe.get_all("Region", pluck="name") if r != region), None)
		if not other:
			return
		doc = frappe.get_doc("Campus Drive", self.drive)
		for row in doc.round_panelists:
			row.region = other
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		self.assertEqual(frappe.db.get_value("Group Discussion", gd_name, "region"), other)

	def test_a_verdict_cannot_be_typed_straight_onto_the_gd(self):
		"""`read_only` is a client-side rule and the panel holds write permission, so
		the API would otherwise let a mark be changed here without the drive moving —
		and the drive is what apply_gd_results reads."""
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)

		doc.candidates[0].result = "Pass"
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)

		doc.reload()
		doc.results_pushed = 0
		doc.status = "Planned"
		doc.group_name = "Group 99"
		with self.assertRaises(frappe.ValidationError):
			doc.save(ignore_permissions=True)

		# the panel's own note is theirs, and stays editable
		doc.reload()
		doc.candidates[0].remarks = "spoke well, led the group"
		doc.save(ignore_permissions=True)
		self.assertEqual(
			frappe.db.get_value("Group Discussion Candidate", doc.candidates[0].name, "remarks"),
			"spoke well, led the group")
		# ...and it survives the next resync
		reconcile(self.drive)
		doc.reload()
		self.assertEqual(doc.candidates[0].remarks, "spoke well, led the group")

	def test_write_on_another_drive_is_not_authority_over_this_gd(self):
		"""may_conduct names THIS drive, not the Campus Drive doctype."""
		if len(self.employees) < 1:
			self.skipTest("needs an Employee with a login")
		email, emp = self._plain_interviewer()
		self._panelists(1)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=4)
		doc = frappe.get_doc("Group Discussion", self._gds()[0].name)

		frappe.set_user(email)
		try:
			# not on the panel, and no permission on this drive
			self.assertFalse(doc.may_conduct(email))
			with self.assertRaises(frappe.PermissionError):
				gd.set_candidate_field(doc.name, doc.candidates[0].name, "result", "Pass")
		finally:
			frappe.set_user("Administrator")

	def test_reconcile_is_idempotent(self):
		self._panelists(2)
		cd.generate_gd_groups(self.drive, self.gd_round, group_size=2)
		before = {g.name: frappe.db.get_value("Group Discussion", g.name, "modified")
		          for g in self._gds()}
		self.assertTrue(before)
		result = reconcile(self.drive)
		self.assertEqual(result["created"], 0)
		self.assertEqual(result["updated"], 0)
		after = {g.name: frappe.db.get_value("Group Discussion", g.name, "modified")
		         for g in self._gds()}
		self.assertEqual(before, after)


def run():
	import unittest

	unittest.main(module=__name__, argv=["run"], exit=False, verbosity=2)
