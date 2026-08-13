"""Tests for: a requisition's job opening needs a recruiter.

The recruiter owns the opening once it is live — they seed its hiring team and
every candidate that arrives is theirs to work. An opening created from a
requisition with nobody assigned belongs to nobody, which is only noticed once
applications pile up unattended.

The rule sits on Job Opening itself, not only on the "Create Job Opening" mapper:
the Desk button goes through the mapper, but the web app builds the opening
straight through the Resource API and would otherwise walk past it.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_opening_requires_recruiter.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.customizations import job_requisition as jr

PREFIX = "_Test Recruiter"


class TestOpeningRequiresRecruiter(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.company = frappe.get_all("Company", pluck="name")[0]
		cls.designation = frappe.get_all("Designation", pluck="name")[0]
		cls.with_recruiter = cls._requisition("Staffed", recruiter="Administrator")
		cls.without_recruiter = cls._requisition("Unstaffed")
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for doctype, field in (("Job Opening", "job_title"), ("Job Requisition", "description")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"%{PREFIX}%")}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _requisition(cls, tag, recruiter=None):
		doc = frappe.get_doc({
			"doctype": "Job Requisition", "designation": cls.designation, "company": cls.company,
			"no_of_positions": 1, "status": "Approved Draft",
			"description": f"{PREFIX} {tag}",
			jr.RECRUITER_FIELD: recruiter,
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.db.rollback()

	def _opening(self, requisition, tag="A"):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening {tag}",
			"company": self.company, "designation": self.designation, "status": "Open",
			"job_requisition": requisition,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc.name

	# ── the Desk button's path ──

	def test_the_mapper_refuses_before_it_maps_anything(self):
		"""So the button says it straight away, not after the form is filled in."""
		with self.assertRaises(frappe.ValidationError) as caught:
			jr.make_job_opening(self.without_recruiter)
		message = frappe.utils.strip_html(str(caught.exception))
		self.assertIn("recruiter", message.lower())
		self.assertIn(self.without_recruiter, message)

	def test_the_mapper_works_once_someone_is_assigned(self):
		mapped = jr.make_job_opening(self.with_recruiter)
		self.assertEqual(mapped.job_requisition, self.with_recruiter)

	# ── every other path ──

	def test_creating_it_through_the_api_is_refused_too(self):
		"""What the web app does — it never touches the mapper."""
		with self.assertRaises(frappe.ValidationError):
			self._opening(self.without_recruiter)

	def test_it_is_created_when_the_requisition_has_a_recruiter(self):
		self.assertTrue(self._opening(self.with_recruiter))

	def test_an_opening_with_no_requisition_is_unaffected(self):
		"""Openings raised on their own are not part of this rule."""
		self.assertTrue(self._opening(None, tag="Standalone"))

	# ── it only guards creation ──

	def test_an_existing_opening_can_still_be_edited(self):
		"""A requisition losing its recruiter later must not freeze an opening that is
		already running."""
		name = self._opening(self.with_recruiter, tag="Edited")
		frappe.db.set_value("Job Requisition", self.with_recruiter, jr.RECRUITER_FIELD, None,
		                    update_modified=False)
		doc = frappe.get_doc("Job Opening", name)
		doc.job_title = f"{PREFIX} Opening Edited"
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertEqual(doc.job_title, f"{PREFIX} Opening Edited")

	def test_the_check_reads_the_requisitions_field(self):
		self.assertEqual(jr.RECRUITER_FIELD, "custom_assign_to_recruiter")
		self.assertIsNone(jr.assert_recruiter_assigned(self.with_recruiter))
		self.assertIsNone(jr.assert_recruiter_assigned(None))


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_opening_requires_recruiter.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestOpeningRequiresRecruiter)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
