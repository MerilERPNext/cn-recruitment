"""Tests for Group Discussion grouping and GD panels on a Campus Drive.

Covers recruitment.recruitment.doctype.campus_drive.campus_drive: the four ways a
drive can split its candidates into GD groups (whole drive / per role / per institute /
per institute + role), the balanced group sizes, and the panels that conduct each
group — dealt automatically, re-dealt on demand, and changeable per group.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_gd_grouping.run

      (`bench run-tests` first runs erpnext's global test bootstrap, which fails on any
      site that already has a Fiscal Year — hence the runner at the bottom of this file.
      Where that bootstrap does work, the usual command is equivalent:
      bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_campus_gd_grouping)
"""

from __future__ import annotations

import re

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd
from recruitment.recruitment.doctype.campus_drive.campus_drive import GD_GROUP_DT, GD_MEMBER_DT

PREFIX = "_Test GD"
EMAIL_LIKE = "gd.cand%@test.local"
PER_BUCKET = 6  # candidates per (institute, role) — 2 x 2 x 6 = 24 in the pool


def _slug(value):
	"""Anything that is not an address character becomes a dot."""
	return re.sub(r"[^a-z0-9._-]+", ".", (value or "").lower()).strip(".")


class TestCampusGdGrouping(FrappeTestCase):
	# ── fixtures ──

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.inst_a = cls._institute("A")
		cls.inst_b = cls._institute("B")
		cls.role_1 = cls._opening("Role One")
		cls.role_2 = cls._opening("Role Two")
		cls.invite = cls._invite()
		cls.drive, cls.gd_code, cls.gd2_code = cls._drive()

		# Panelists are read off existing Employees: an Employee needs a User login to
		# count as an interviewer, and this site's Employee creation runs Server Scripts
		# that are off in a test bench. Nothing on them is written by these tests.
		cls.employees = frappe.get_all(
			"Employee", filters={"user_id": ["!=", ""], "status": "Active"},
			pluck="name", limit=4, order_by="name asc")

		# candidates: both colleges x both roles
		cls.candidates = []
		for institute in (cls.inst_a, cls.inst_b):
			for role in (cls.role_1, cls.role_2):
				for i in range(PER_BUCKET):
					cls.candidates.append(cls._applicant(institute, role, i))
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		"""Drop what a previous run committed — the drive's own generate_gd_groups
		commits, so nothing here survives on the per-test rollback alone."""
		for name in frappe.get_all("Job Applicant", filters={"email_id": ("like", EMAIL_LIKE)},
		                           pluck="name"):
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
	def _institute(cls, tag):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College {tag}",
		                      "tier": "Tier-1", "is_active": 1})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls, title):
		company = frappe.get_all("Company", pluck="name")[0]
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} {title}", "company": company,
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Invite",
			"campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": cls.inst_a}, {"institute": cls.inst_b}],
			"job_openings": [{"job_opening": cls.role_1}, {"job_opening": cls.role_2}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _drive(cls):
		"""A drive with TWO GD rounds — the second one proves that regenerating or
		re-panelling one round never disturbs the other."""
		doc = frappe.get_doc({
			"doctype": "Campus Drive",
			"drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator",
			"drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"campus_invites": [{"campus_invite": cls.invite}],
			"rounds": [
				{"round_name": f"{PREFIX} GD", "round_type": "Group Discussion"},
				{"round_name": f"{PREFIX} GD 2", "round_type": "Group Discussion"},
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name, doc.rounds[0].round_code, doc.rounds[1].round_code

	@classmethod
	def _applicant(cls, institute, role, i):
		doc = frappe.get_doc({
			"doctype": "Job Applicant",
			"applicant_name": f"{PREFIX} Cand {institute[-2:]}{role[-2:]}{i}",
			# The institute and role ids are Frappe names ("_Test GD College A"), so
			# their spaces have to come out before they can sit in an address.
			"email_id": _slug(f"gd.cand.{institute}.{role}.{i}") + "@test.local",
			"status": cd.GD_POOL_STATUS,
			"source": "Campus Hiring",
			"job_title": role,
			"custom_campus_invite": cls.invite,
			"custom_institute": institute,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")
		# Generating groups commits, and so does pushing their results (which advances
		# or rejects the candidates) — both outlive the per-test rollback. So each test
		# starts from a drive with no groups on it and a pool that has not sat a GD:
		# otherwise the first test to run leaves everyone grouped and every test after
		# it is told there is nothing new to group.
		self._reset_groups()
		for name in self.candidates:
			frappe.db.set_value("Job Applicant", name,
			                    {"status": cd.GD_POOL_STATUS, "custom_current_stage": None},
			                    update_modified=False)
		frappe.db.commit()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── helpers ──

	def _reset_groups(self):
		"""Take every group off the drive. Generating them commits, so this is what
		gives each test (and each mode inside a test) an ungrouped hall to start from."""
		for doctype in (GD_GROUP_DT, GD_MEMBER_DT):
			frappe.db.delete(doctype, {"parenttype": "Campus Drive", "parent": self.drive})
		frappe.db.commit()

	def _panelists(self, rows):
		"""Replace the drive's panelist roster with `rows` — (panel, role) tuples."""
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.set("round_panelists", [])
		for i, (panel, role) in enumerate(rows):
			doc.append("round_panelists", {
				"round_code": self.gd_code, "panelist": self.employees[i % len(self.employees)],
				"panel_name": panel, "job_opening": role})
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _generate(self, split_by, size=5, round_code=None):
		return cd.generate_gd_groups(self.drive, round_code or self.gd_code, size, split_by)

	def _groups(self, round_code=None):
		return frappe.get_all(
			"Campus Drive GD Group",
			filters={"parent": self.drive, "parenttype": "Campus Drive",
			         "round_code": round_code or self.gd_code},
			fields=["name", "group_name", "job_opening", "job_title", "institute",
			        "panel_name", "candidate_count"], order_by="idx asc")

	def _members(self, group_name=None, round_code=None):
		filters = {"parent": self.drive, "parenttype": "Campus Drive",
		           "round_code": round_code or self.gd_code}
		if group_name:
			filters["group_name"] = group_name
		return frappe.get_all("Campus Drive GD Group Member", filters=filters,
		                      fields=["name", "group_name", "job_applicant", "institute",
		                              "job_opening", "attendance", "result"], order_by="idx asc")

	def _members_of(self, group_name):
		return self._members(group_name=group_name)

	# ── how the pool is split ──

	def test_drive_split_mixes_roles_and_colleges(self):
		"""The default: one pool for the whole drive, so a group holds several roles —
		a GD panel judges communication, not the role."""
		res = self._generate("drive")
		groups = self._groups()
		self.assertEqual(res["split_by"], "drive")
		self.assertEqual(len(groups), res["groups"])
		# Nothing is scoped, so the board renders one flat grid.
		self.assertTrue(all(not g.job_opening and not g.institute for g in groups))
		# ... and the groups genuinely mix: at least one holds both roles and both colleges.
		mixed_roles = [g for g in groups
		               if len({m.job_opening for m in self._members_of(g.group_name)}) > 1]
		mixed_colleges = [g for g in groups
		                  if len({m.institute for m in self._members_of(g.group_name)}) > 1]
		self.assertTrue(mixed_roles, "no group mixed roles")
		self.assertTrue(mixed_colleges, "no group mixed colleges")

	def test_role_split_keeps_each_opening_apart(self):
		self._generate("role")
		for g in self._groups():
			self.assertTrue(g.job_opening)
			self.assertFalse(g.institute)
			roles = {m.job_opening for m in self._members_of(g.group_name)}
			self.assertEqual(roles, {g.job_opening})

	def test_institute_split_keeps_each_college_apart(self):
		"""Each college sits its own GD — roles still mixed inside it."""
		self._generate("institute")
		groups = self._groups()
		self.assertEqual({g.institute for g in groups}, {self.inst_a, self.inst_b})
		for g in groups:
			self.assertFalse(g.job_opening)
			self.assertEqual({m.institute for m in self._members_of(g.group_name)}, {g.institute})

	def test_institute_and_role_split_is_the_narrowest(self):
		self._generate("institute_role", size=6)
		groups = self._groups()
		self.assertEqual(
			{(g.institute, g.job_opening) for g in groups},
			{(self.inst_a, self.role_1), (self.inst_a, self.role_2),
			 (self.inst_b, self.role_1), (self.inst_b, self.role_2)})
		for g in groups:
			members = self._members_of(g.group_name)
			self.assertEqual({m.institute for m in members}, {g.institute})
			self.assertEqual({m.job_opening for m in members}, {g.job_opening})

	def test_every_candidate_is_grouped_exactly_once_in_every_mode(self):
		pool = set(self.candidates)
		for mode in cd.GD_SPLIT_MODES:
			with self.subTest(split_by=mode):
				# Each mode regroups the same hall from scratch — without this the
				# second mode is told everyone is already in a group.
				self._reset_groups()
				res = self._generate(mode)
				members = self._members()
				self.assertEqual(len(members), len(pool), "pool size changed")
				self.assertEqual({m.job_applicant for m in members}, pool)
				self.assertEqual(res["candidates"], len(pool))
				# the stored header count must match the rows under it
				for g in self._groups():
					self.assertEqual(g.candidate_count, len(self._members_of(g.group_name)))

	def test_an_unknown_split_is_refused(self):
		with self.assertRaises(frappe.ValidationError):
			self._generate("by-hair-colour")

	# ── group sizes ──

	def test_sizes_are_balanced_with_no_leftover_group(self):
		"""52 at 5 is two 6s and eight 5s — never ten 5s and a stranded 2."""
		self.assertEqual(sorted(cd._balanced_group_sizes(52, 5)), [5] * 8 + [6] * 2)
		self.assertEqual(cd._balanced_group_sizes(0, 5), [])
		# Below 2x the size a single group is right: splitting would leave a tiny one.
		self.assertEqual(cd._balanced_group_sizes(7, 5), [7])

	def test_generated_groups_are_within_one_of_the_size(self):
		self._generate("drive", size=5)
		counts = [len(self._members_of(g.group_name)) for g in self._groups()]
		self.assertTrue(all(4 <= n <= 7 for n in counts), counts)

	def test_the_size_used_is_remembered_on_the_round(self):
		self._generate("drive", size=8)
		self.assertEqual(
			frappe.db.get_value("Campus Drive Round",
			                    {"parent": self.drive, "round_code": self.gd_code},
			                    "gd_group_size"), 8)

	def test_regenerating_leaves_the_other_gd_round_alone(self):
		self._generate("role", round_code=self.gd2_code)
		before = [(g.group_name, g.job_opening) for g in self._groups(self.gd2_code)]
		self.assertTrue(before)

		self._generate("institute")  # rebuilds round 1 only
		self.assertEqual([(g.group_name, g.job_opening) for g in self._groups(self.gd2_code)],
		                 before)
		self.assertEqual(len(self._members(round_code=self.gd2_code)), len(self.candidates))

	# ── panels ──

	def test_panels_are_dealt_across_the_groups(self):
		self._panelists([("Panel 1", None), ("Panel 2", None), ("Panel 3", None)])
		res = self._generate("drive")
		groups = self._groups()
		self.assertEqual(res["panels"], 3)
		self.assertTrue(all(g.panel_name for g in groups), "a group has no panel")
		# round-robin, so the load is spread rather than piled on the first panel
		used = {g.panel_name for g in groups}
		self.assertEqual(used, {"Panel 1", "Panel 2", "Panel 3"})

	def test_a_role_tagged_panel_only_takes_its_own_role(self):
		self._panelists([("Role 1 Panel", self.role_1), ("Open Panel", None)])
		self._generate("role")
		for g in self._groups():
			if g.panel_name == "Role 1 Panel":
				self.assertEqual(g.job_opening, self.role_1)

	def test_groups_still_build_when_no_panel_is_set_up_yet(self):
		"""Panels are usually staffed after the groups exist — grouping must not block."""
		self._panelists([])
		res = self._generate("drive")
		self.assertEqual(res["panels"], 0)
		self.assertTrue(self._groups())
		self.assertTrue(all(not g.panel_name for g in self._groups()))

	def test_assign_panels_fills_them_in_afterwards(self):
		self._panelists([])
		self._generate("drive")
		self._panelists([("Panel 1", None), ("Panel 2", None)])

		res = cd.assign_gd_panels(self.drive, self.gd_code)
		self.assertEqual(res["panels"], 2)
		self.assertEqual(res["groups"], len(self._groups()))
		self.assertEqual({g.panel_name for g in self._groups()}, {"Panel 1", "Panel 2"})

	def test_assign_panels_only_touches_its_own_round(self):
		self._panelists([("Panel 1", None)])
		self._generate("drive")
		self._generate("drive", round_code=self.gd2_code)

		cd.assign_gd_panels(self.drive, self.gd_code)
		self.assertTrue(all(g.panel_name for g in self._groups()))
		# round 2 has no panelists of its own, so it stays untouched
		self.assertTrue(all(not g.panel_name for g in self._groups(self.gd2_code)))

	def test_assign_panels_says_so_when_there_is_no_roster(self):
		self._panelists([])
		self._generate("drive")
		with self.assertRaises(frappe.ValidationError):
			cd.assign_gd_panels(self.drive, self.gd_code)

	def test_one_group_can_be_handed_to_another_panel(self):
		self._panelists([("Panel 1", None), ("Panel 2", None)])
		self._generate("drive")
		group = self._groups()[0].group_name

		cd.set_gd_group_panel(self.drive, self.gd_code, group, "Panel 2")
		self.assertEqual(self._groups()[0].panel_name, "Panel 2")
		# and cleared again
		cd.set_gd_group_panel(self.drive, self.gd_code, group, "")
		self.assertIsNone(self._groups()[0].panel_name)

	def test_a_panel_that_is_not_on_the_round_is_refused(self):
		self._panelists([("Panel 1", None)])
		self._generate("drive")
		group = self._groups()[0].group_name
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_group_panel(self.drive, self.gd_code, group, "Panel 9")
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_group_panel(self.drive, self.gd_code, "Group 99", "Panel 1")

	# ── moving candidates between groups ──

	def test_a_candidate_moves_within_the_same_bucket(self):
		self._generate("drive")
		groups = self._groups()
		row = self._members_of(groups[0].group_name)[0]

		res = cd.move_gd_member(self.drive, row.name, groups[1].group_name)
		self.assertTrue(res["moved"])
		self.assertEqual(
			frappe.db.get_value("Campus Drive GD Group Member", row.name, "group_name"),
			groups[1].group_name)
		# both headers are re-counted
		for g in self._groups()[:2]:
			self.assertEqual(g.candidate_count, len(self._members_of(g.group_name)))

	def test_a_move_across_roles_is_blocked(self):
		self._generate("role")
		groups = self._groups()
		other = next(g for g in groups if g.job_opening != groups[0].job_opening)
		row = self._members_of(groups[0].group_name)[0]
		with self.assertRaises(frappe.ValidationError):
			cd.move_gd_member(self.drive, row.name, other.group_name)

	def test_a_move_across_colleges_is_blocked(self):
		"""A per-institute split exists so each college sits together — a stray move
		must not quietly undo it."""
		self._generate("institute")
		groups = self._groups()
		other = next(g for g in groups if g.institute != groups[0].institute)
		row = self._members_of(groups[0].group_name)[0]
		with self.assertRaises(frappe.ValidationError):
			cd.move_gd_member(self.drive, row.name, other.group_name)

	# ── running the GD ──

	def test_attendance_and_result_are_recorded_per_candidate(self):
		self._generate("drive")
		row = self._members()[0]
		cd.set_gd_member_field(self.drive, row.name, "attendance", "Present")
		cd.set_gd_member_field(self.drive, row.name, "result", "Pass")
		saved = frappe.db.get_value("Campus Drive GD Group Member", row.name,
		                            ["attendance", "result"], as_dict=True)
		self.assertEqual((saved.attendance, saved.result), ("Present", "Pass"))
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_member_field(self.drive, row.name, "result", "Maybe")
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_member_field(self.drive, row.name, "institute", "X")

	def test_a_whole_group_can_be_marked_present(self):
		self._generate("drive")
		group = self._groups()[0].group_name
		res = cd.bulk_gd_attendance(self.drive, self.gd_code, group, "Present")
		self.assertEqual(res["updated"], len(self._members_of(group)))
		self.assertTrue(all(m.attendance == "Present" for m in self._members_of(group)))

	def test_a_group_carries_its_own_status(self):
		self._generate("drive")
		group = self._groups()[0].group_name
		cd.set_gd_group_status(self.drive, self.gd_code, group, "Completed")
		self.assertEqual(self._groups()[0].candidate_count, len(self._members_of(group)))
		self.assertEqual(
			frappe.db.get_value("Campus Drive GD Group",
			                    {"parent": self.drive, "round_code": self.gd_code,
			                     "group_name": group}, "group_status"), "Completed")
		with self.assertRaises(frappe.ValidationError):
			cd.set_gd_group_status(self.drive, self.gd_code, group, "Postponed")

	# ── pushing the results ──

	def _mark_all(self, result, leave_unmarked=0):
		"""Give every candidate a verdict, optionally leaving `leave_unmarked` blank."""
		rows = self._members()
		for r in rows[leave_unmarked:]:
			frappe.db.set_value("Campus Drive GD Group Member", r.name, "result", result,
			                    update_modified=False)
		return len(rows) - leave_unmarked

	def test_the_push_is_blocked_while_a_candidate_has_no_result(self):
		"""A GD round is decided in one sitting — half a verdict must not move anyone."""
		self._generate("drive")
		self._mark_all("Pass", leave_unmarked=3)
		with self.assertRaises(frappe.ValidationError):
			cd.apply_gd_results(self.drive, self.gd_code)
		# and nobody was touched by the refused push
		self.assertEqual(
			frappe.db.count("Job Applicant",
			                {"name": ["in", self.candidates], "status": "Rejected"}), 0)

	def test_the_message_names_the_groups_still_to_be_marked(self):
		self._generate("drive")
		self._mark_all("Pass", leave_unmarked=2)
		unmarked = {m.group_name for m in self._members() if m.result not in ("Pass", "Fail")}
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.apply_gd_results(self.drive, self.gd_code)
		for group in unmarked:
			self.assertIn(group, str(caught.exception))

	def test_an_unmarked_candidate_is_never_failed_for_the_panel(self):
		"""The block is the whole point: a verdict nobody gave must not become a Fail —
		the candidate stays Pending and Shortlisted until the panel marks them."""
		self._generate("drive")
		self._mark_all("Pass", leave_unmarked=4)
		blank = [m.name for m in self._members() if m.result not in ("Pass", "Fail")]

		with self.assertRaises(frappe.ValidationError):
			cd.apply_gd_results(self.drive, self.gd_code)

		for name in blank:
			self.assertEqual(
				frappe.db.get_value("Campus Drive GD Group Member", name, "result"), "Pending")
		self.assertEqual(
			frappe.db.count("Job Applicant",
			                {"name": ["in", self.candidates], "status": cd.GD_POOL_STATUS}),
			len(self.candidates))

	def test_a_fully_marked_round_pushes(self):
		"""Only the passers go forward; everyone marked Fail is rejected."""
		self._generate("drive")
		self._mark_all("Fail")
		for m in self._members()[:5]:
			frappe.db.set_value("Campus Drive GD Group Member", m.name, "result", "Pass",
			                    update_modified=False)

		res = cd.apply_gd_results(self.drive, self.gd_code)
		self.assertEqual(res["rejected"], len(self.candidates) - 5)
		self.assertEqual(res["advanced"] + res["skipped"], 5)
		self.assertEqual(
			frappe.db.count("Job Applicant",
			                {"name": ["in", self.candidates], "status": "Rejected"}),
			len(self.candidates) - 5)

	def test_pushing_a_round_with_no_groups_says_so(self):
		with self.assertRaises(frappe.ValidationError):
			cd.apply_gd_results(self.drive, self.gd2_code)

	# ── pushing one finished group ──

	def _mark_group(self, group_name, result="Pass"):
		for r in self._members_of(group_name):
			frappe.db.set_value("Campus Drive GD Group Member", r.name, "result", result,
			                    update_modified=False)
		return len(self._members_of(group_name))

	def test_a_finished_group_goes_on_without_the_rest_of_the_hall(self):
		"""Groups finish at different times — the first one done should not have to wait
		for the last."""
		self._generate("drive")
		first = self._groups()[0].group_name
		n = self._mark_group(first, "Pass")

		res = cd.apply_gd_results(self.drive, self.gd_code, groups=[first])
		self.assertEqual(res["total"], n)
		self.assertEqual(res["groups"], [first])
		self.assertEqual(res["advanced"] + res["skipped"], n)
		# everyone else is untouched — still Shortlisted, still unmarked
		others = [m for m in self._members() if m.group_name != first]
		self.assertTrue(all(m.result == "Pending" for m in others))
		self.assertEqual(
			frappe.db.count("Job Applicant",
			                {"name": ["in", [m.job_applicant for m in others]],
			                 "status": cd.GD_POOL_STATUS}), len(others))

	def test_the_whole_round_is_still_blocked_while_a_group_is_unmarked(self):
		self._generate("drive")
		self._mark_group(self._groups()[0].group_name, "Pass")
		with self.assertRaises(frappe.ValidationError):
			cd.apply_gd_results(self.drive, self.gd_code)

	def test_an_unfinished_group_cannot_be_pushed(self):
		self._generate("drive")
		groups = self._groups()
		self._mark_group(groups[0].group_name, "Pass")
		with self.assertRaises(frappe.ValidationError) as caught:
			cd.apply_gd_results(self.drive, self.gd_code, groups=[groups[1].group_name])
		self.assertIn(groups[1].group_name, str(caught.exception))

	def test_a_group_that_does_not_exist_is_refused(self):
		self._generate("drive")
		with self.assertRaises(frappe.ValidationError):
			cd.apply_gd_results(self.drive, self.gd_code, groups=["Group 999"])

	def test_several_finished_groups_push_together(self):
		"""What the board offers when some groups are done: push exactly those."""
		self._generate("drive")
		groups = [g.group_name for g in self._groups()][:2]
		total = sum(self._mark_group(g, "Fail") for g in groups)

		# a JSON string, as it arrives from the client
		res = cd.apply_gd_results(self.drive, self.gd_code, groups=frappe.as_json(groups))
		self.assertEqual(res["total"], total)
		self.assertEqual(res["rejected"], total)
		self.assertEqual(sorted(res["groups"]), sorted(groups))


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_gd_grouping.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusGdGrouping)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
