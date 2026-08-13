"""Tests for the default campus hiring workflow.

One workflow is named in Campus Settings (a TA Interview Strategy Template) and a
new drive is built from it: its Rounds table, and the hiring stages of any linked
opening that has none. Both only ever FILL — a drive with rounds and an opening
with stages are left as they are.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_workflow.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment import campus_workflow as cw

PREFIX = "_Test WF"
TEMPLATE = f"{PREFIX} Workflow"
ROUNDS = ("Group Discussion", "Technical Round 1", "HR Round")


class TestCampusWorkflow(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.template = cls._template()
		cls.institute = cls._institute()
		cls.opening_blank = cls._opening("Blank")            # no stages of its own
		cls.opening_with_stages = cls._opening("Staffed", stages=["Screening", "Final"])
		cls.invite = cls._invite([cls.opening_blank, cls.opening_with_stages])
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for doctype, field in (("Campus Drive", "drive_name"),
		                       ("Campus Invite", "campus_invite_name"),
		                       ("Job Opening", "job_title"),
		                       ("Institute", "institute_name"),
		                       ("TA Interview Strategy Template", "template_name")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"{PREFIX}%")}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _template(cls):
		doc = frappe.get_doc({
			"doctype": "TA Interview Strategy Template", "template_name": TEMPLATE,
			"interview_rounds": [{"step_type": "Interview", "round_name": r} for r in ROUNDS],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({
			"doctype": "Institute", "institute_name": f"{PREFIX} College",
			"tier": "Tier-1", "is_active": 1,
			# An invite can only be sent to a college that has a Primary TPO with an email.
			"tpo_contacts": [{"contact_name": "WF TPO", "role": "Primary TPO",
			                  "email": "wf.tpo@test.local"}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls, tag, stages=None):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} {tag}",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_hiring_stages": [
				{"stage_name": s, "stage_type": "Interview", "owner_role": "System",
				 "notify": 0, "auto": 1} for s in (stages or [])
			],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls, openings):
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": cls.institute}],
			"job_openings": [{"job_opening": o} for o in openings],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.set_single_value("Campus Settings", "default_hiring_workflow", self.template)
		frappe.db.set_single_value("Campus Settings", "apply_workflow_to_openings", 1)

	def tearDown(self):
		frappe.db.rollback()

	def _drive(self, tag="A", with_invite=True, rounds=None):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive {tag}",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"campus_invites": [{"campus_invite": self.invite}] if with_invite else [],
			"rounds": rounds or [],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True)

	# ── reading the workflow ──

	def test_the_settings_name_the_workflow(self):
		template, stages = cw.get_default_workflow()
		self.assertEqual(template, self.template)
		self.assertEqual([s["stage_name"] for s in stages], list(ROUNDS))

	def test_campus_stages_never_email_the_candidate(self):
		"""Campus candidates are not mailed per stage; a stage created here must not
		turn that back on for the lateral candidates sharing the opening."""
		_template, stages = cw.get_default_workflow()
		self.assertTrue(all(s["notify"] == 0 for s in stages))

	def test_no_workflow_configured_is_a_no_op(self):
		frappe.db.set_single_value("Campus Settings", "default_hiring_workflow", None)
		self.assertEqual(cw.get_default_workflow(), (None, []))
		self.assertEqual(self._drive("None").rounds, [])

	def test_round_types_are_read_off_the_name(self):
		self.assertEqual(cw.round_type_for("Group Discussion"), "Group Discussion")
		self.assertEqual(cw.round_type_for("GD"), "Group Discussion")
		self.assertEqual(cw.round_type_for("Technical Round 2"), "Technical")
		self.assertEqual(cw.round_type_for("HR Round"), "HR")
		self.assertEqual(cw.round_type_for("Aptitude Test"), "Assessment")
		# "hr" inside a word is not an HR round
		self.assertNotEqual(cw.round_type_for("Threshold Screening"), "HR")

	# ── building a drive ──

	def test_a_new_drive_gets_the_rounds(self):
		drive = self._drive("Rounds")
		self.assertEqual([r.round_name for r in drive.rounds], list(ROUNDS) + ["Job Offer"])
		self.assertEqual([r.hiring_stage for r in drive.rounds], list(ROUNDS) + ["Job Offer"])
		self.assertEqual([r.round_code for r in drive.rounds], ["R1", "R2", "R3", "R4"])

	def test_the_gd_round_is_typed_as_one(self):
		"""The type is what makes the round card render GD grouping."""
		drive = self._drive("GD")
		gd = drive.rounds[0]
		self.assertEqual(gd.round_type, "Group Discussion")
		self.assertTrue(gd.requires_gd_grouping)
		self.assertTrue(drive.rounds[1].requires_panel)

	def test_the_last_round_is_the_offer(self):
		drive = self._drive("Offer")
		last = drive.rounds[-1]
		self.assertEqual(last.round_type, "Offer")
		self.assertIn(last.hiring_stage, cw.OFFER_STAGES)

	def test_a_drive_that_already_has_rounds_is_left_alone(self):
		drive = self._drive("Own", rounds=[{"round_name": "My Own Round", "round_type": "Technical"}])
		self.assertEqual([r.round_name for r in drive.rounds], ["My Own Round"])

	def test_saving_again_does_not_add_them_twice(self):
		drive = self._drive("Twice")
		before = [r.round_name for r in drive.rounds]
		drive.save(ignore_permissions=True)
		self.assertEqual([r.round_name for r in drive.rounds], before)

	# ── filling the openings ──

	def test_an_opening_with_no_stages_gets_the_workflow(self):
		self._drive("Fill")
		stages = frappe.get_all("Job Opening Hiring Stage",
		                        filters={"parent": self.opening_blank}, pluck="stage_name",
		                        order_by="idx asc")
		self.assertEqual(stages, list(ROUNDS))

	def test_an_opening_that_has_its_own_is_untouched(self):
		self._drive("Keep")
		stages = frappe.get_all("Job Opening Hiring Stage",
		                        filters={"parent": self.opening_with_stages}, pluck="stage_name",
		                        order_by="idx asc")
		self.assertEqual(stages, ["Screening", "Final"])

	def test_the_openings_switch_can_be_turned_off(self):
		frappe.db.set_single_value("Campus Settings", "apply_workflow_to_openings", 0)
		self._drive("NoFill")
		self.assertEqual(
			frappe.db.count("Job Opening Hiring Stage", {"parent": self.opening_blank}), 0)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_workflow.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusWorkflow)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
