"""Tests for: a Campus Invite needs at least one Job Opening.

The invite is what a TPO's candidates are registered against and what they later
apply through, so an invite with no opening on it is a dead end in three places at
once: the TPO Desk card lists no roles, a registered candidate has nothing to apply
to, and the Campus Drive assembled from the invite inherits no roles — which in turn
leaves its rounds mapped to no hiring stage and every panel showing "0 waiting".

None of that fails loudly at the time. It is discovered days later, once a college
has already been invited and has registered its students, and the only fix by then
is to amend a submitted invite. Hence the rule at the point of entry.

The Institutes table has always been mandatory. This puts Job Openings on the same
footing — an invite is a set of colleges AND a set of roles, and neither half is
optional.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_invite_requires_openings.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

PREFIX = "_Test Reqd Openings"


class TestCampusInviteRequiresOpenings(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.institute = cls._institute()
		cls.opening = frappe.get_all("Job Opening", pluck="name", limit=1)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Campus Invite",
		                           filters={"campus_invite_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			doc = frappe.get_doc("Campus Invite", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Campus Invite", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Institute",
		                           filters={"institute_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Institute", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "R TPO", "role": "Primary TPO",
		                                        "email": "reqd.tpo@test.local"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── helpers ──

	def _invite(self, openings, name="One"):
		"""An invite with a full set of institutes and whatever `openings` is given.

		Deliberately WITHOUT ignore_mandatory: this suite is about the mandatory check
		itself, and that flag is exactly what turns it off.
		"""
		doc = frappe.get_doc({
			"doctype": "Campus Invite",
			"campus_invite_name": f"{PREFIX} {name}",
			"institutes": [{"institute": self.institute}],
			"job_openings": openings,
		})
		doc.insert(ignore_permissions=True)
		return doc

	# ── the rule ──

	def test_the_job_openings_table_is_mandatory(self):
		field = frappe.get_meta("Campus Invite").get_field("job_openings")
		self.assertTrue(field.reqd, "Job Openings must be marked mandatory")
		self.assertEqual(field.fieldtype, "Table")

	def test_an_invite_with_no_openings_is_refused(self):
		with self.assertRaises(frappe.MandatoryError) as caught:
			self._invite([], name="Empty")
		self.assertIn("job_openings", str(caught.exception))

	def test_an_invite_with_openings_saves(self):
		if not self.opening:
			self.skipTest("no Job Opening on this site")
		doc = self._invite([{"job_opening": self.opening[0]}], name="Good")
		self.assertTrue(doc.name)
		self.assertEqual(len(doc.job_openings), 1)

	def test_a_blank_row_does_not_satisfy_the_rule(self):
		"""A row added and left empty is the obvious way past a mandatory table — the
		child's own Job Opening link is what closes it."""
		with self.assertRaises(frappe.MandatoryError) as caught:
			self._invite([{"job_opening": None}], name="Blank")
		self.assertIn("job_opening", str(caught.exception))

	def test_the_openings_cannot_be_emptied_on_a_saved_draft(self):
		"""Mandatory on every save, not just on create — otherwise the rows could be
		added to get past insert and stripped straight afterwards."""
		if not self.opening:
			self.skipTest("no Job Opening on this site")
		doc = self._invite([{"job_opening": self.opening[0]}], name="Stripped")
		doc.set("job_openings", [])
		with self.assertRaises(frappe.MandatoryError):
			doc.save(ignore_permissions=True)

	def test_institutes_stay_mandatory_too(self):
		"""The other half of the pair — an invite is colleges AND roles."""
		self.assertTrue(frappe.get_meta("Campus Invite").get_field("institutes").reqd)

	def test_a_submitted_invite_that_predates_the_rule_still_opens(self):
		"""Existing invites with no openings are not retroactively broken: a submitted
		doc does not re-run validate, so HR can still read one and extend its deadline.
		"""
		existing = frappe.get_all(
			"Campus Invite", filters={"docstatus": 1}, pluck="name", limit=1)
		if not existing:
			self.skipTest("no submitted invite on this site")
		doc = frappe.get_doc("Campus Invite", existing[0])
		self.assertEqual(doc.docstatus, 1)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_invite_requires_openings.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestCampusInviteRequiresOpenings)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
