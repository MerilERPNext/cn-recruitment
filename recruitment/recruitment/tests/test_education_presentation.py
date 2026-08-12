"""Tests for the candidate's education row.

`Employee Education` is shared with erpnext and customised by several installed
apps, so what a candidate's education row shows is decided in one place
(recruitment.recruitment.education_presentation) and re-asserted on every migrate.
These tests pin that decision: the exact field set, the types eligibility depends
on, and the fact that the thirty-odd leftovers stay out of every list built from
the doctype.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_education_presentation.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import education_presentation as ep

TABLE_FIELD = "custom_educational_qualification"  # Job Applicant's education table


class TestEducationPresentation(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		ep.apply_education_presentation()
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()

	def _meta(self):
		return frappe.get_meta(ep.CHILD_DOCTYPE)

	# ── the field set ──

	def test_exactly_the_declared_fields_are_visible(self):
		visible = [df.fieldname for df in self._meta().fields if not df.hidden]
		self.assertEqual(visible, [f["fieldname"] for f in ep.FIELDS if self._meta().get_field(f["fieldname"])])

	def test_the_leftovers_are_hidden(self):
		"""Three year-of-passing fields, two GPA fields, the "(Naukri)" copies — all
		still there holding whatever they hold, none of them on screen."""
		meta = self._meta()
		for fieldname in ("custom_passing_year", "custom_month__year_of_passing",
		                  "custom_max_gpapercentage", "custom_percentage_naukri",
		                  "custom_education_degree_naukri", "level"):
			df = meta.get_field(fieldname)
			if df:  # a site without that app simply doesn't have it
				self.assertTrue(df.hidden, f"{fieldname} should be hidden")

	def test_the_order_is_the_declared_order(self):
		visible = [df.fieldname for df in self._meta().fields if not df.hidden]
		self.assertEqual(visible, [f for f in ep.ORDER if self._meta().get_field(f)])

	def test_nothing_hidden_is_mandatory(self):
		"""A hidden mandatory field would block every save with an error naming a
		field nobody can see."""
		for df in self._meta().fields:
			if df.hidden:
				self.assertFalse(df.reqd, f"{df.fieldname} is hidden but mandatory")

	# ── the types eligibility rules depend on ──

	def test_the_masters_are_links(self):
		meta = self._meta()
		self.assertEqual(meta.get_field("qualification").fieldtype, "Link")
		self.assertEqual(meta.get_field("qualification").options, "Education Stage")
		self.assertEqual(meta.get_field("custom_institute").fieldtype, "Link")
		self.assertEqual(meta.get_field("custom_institute").options, "Institute")

	def test_gpa_is_a_number(self):
		"""So a rule can compare it — "GPA / Percentage ≥ 60" against text never was."""
		self.assertEqual(self._meta().get_field("class_per").fieldtype, "Float")

	def test_a_drifted_type_is_put_back(self):
		"""Another app's customisation sync wipes a patch's fieldtype property setter;
		this is what keeps Education Stage from silently becoming a text box again."""
		ep._set("qualification", "fieldtype", "Data", "Select")
		frappe.clear_cache(doctype=ep.CHILD_DOCTYPE)
		self.assertEqual(self._meta().get_field("qualification").fieldtype, "Data")

		res = ep.apply_education_presentation()
		self.assertTrue(any("qualification" in r for r in res["retyped"]))
		self.assertEqual(self._meta().get_field("qualification").fieldtype, "Link")

	def test_course_types_are_seeded(self):
		for name in ep.COURSE_TYPES:
			self.assertTrue(frappe.db.exists("Course Type", name))

	# ── what the rest of the app sees ──

	def test_the_eligibility_builder_offers_exactly_these(self):
		from recruitment.recruitment.eligibility_engine import get_child_table_fields

		offered = {f["value"] for f in get_child_table_fields(ep.CHILD_DOCTYPE)}
		expected = {f["fieldname"] for f in ep.FIELDS if self._meta().get_field(f["fieldname"])}
		self.assertEqual(offered, expected)

	def test_the_application_field_picker_offers_exactly_these(self):
		"""The older picker (application fields, child-aware rule targets) reads the
		same doctype and must not offer what nobody can see."""
		from recruitment.api.applicant_field_options import get_job_applicant_field_options

		offered = {
			o["value"].split("::", 1)[1]
			for o in get_job_applicant_field_options(include_children=1)
			if o["value"].startswith(f"{TABLE_FIELD}::")
		}
		expected = {f["fieldname"] for f in ep.FIELDS if self._meta().get_field(f["fieldname"])}
		self.assertEqual(offered, expected)

	def test_running_it_again_changes_nothing(self):
		"""It runs on every migrate."""
		before = ep.apply_education_presentation()
		after = ep.apply_education_presentation()
		self.assertEqual(after["created"], [])
		self.assertEqual(after["retyped"], [])
		self.assertEqual(after["visible"], before["visible"])


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_education_presentation.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestEducationPresentation)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
