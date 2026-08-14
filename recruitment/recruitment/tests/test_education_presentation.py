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
		                  "custom_education_degree_naukri", "level",
		                  # erpnext's own GPA field: replaced by ours, kept for its data
		                  "class_per"):
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

	def test_every_declared_type_is_applied(self):
		"""Whatever FIELDS says a field must be, the doctype says too — that is the
		whole point of re-asserting types here."""
		meta = self._meta()
		for spec in ep.FIELDS:
			df = meta.get_field(spec["fieldname"])
			if df and spec.get("fieldtype"):
				self.assertEqual(df.fieldtype, spec["fieldtype"], spec["fieldname"])

	def test_gpa_is_our_own_number_field(self):
		"""Ours, created as a Float — retyping erpnext's `class_per` rewrote its column
		on every migrate, and that ALTER fails as soon as one row holds "First Class"."""
		self.assertEqual(self._meta().get_field(ep.GPA_FIELD).fieldtype, "Float")

	def test_no_standard_field_carries_a_fieldtype_of_ours(self):
		"""A fieldtype property setter on an erpnext field is what makes migrate try to
		rewrite its column. There must be none."""
		for fieldname in ep.NEVER_RETYPE:
			self.assertFalse(frappe.db.exists("Property Setter", {
				"doc_type": ep.CHILD_DOCTYPE, "field_name": fieldname, "property": "fieldtype"}),
				f"{fieldname} still carries a fieldtype override")

	def test_the_schema_matches_the_meta(self):
		"""What migrate checks: nothing here should want to alter a column."""
		frappe.db.updatedb(ep.CHILD_DOCTYPE)  # raises if it cannot align the table

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

	# ── auto-shortlist keeps working on the field that is actually filled ──

	def test_no_rule_still_points_at_a_retired_gpa_field(self):
		"""A rule naming a hidden field reads an empty value and quietly stops firing —
		"GPA < 60 -> Knock out" would pass everyone. The patch re-points them."""
		from recruitment.patches.repoint_gpa_eligibility_rules import RETIRED, TABLE

		stale = [
			r.name for r in frappe.get_all("Job Opening Eligibility Rule",
			                               fields=["name", "field_name", "match_field"],
			                               limit_page_length=0)
			if any((r.field_name or "") in (old, f"{TABLE}::{old}")
			       or (r.match_field or "") in (old, f"{TABLE}::{old}") for old in RETIRED)
		]
		self.assertEqual(stale, [], "these rules read a field nothing writes to any more")

	def test_the_engine_reads_the_new_field(self):
		"""End to end: a rule on GPA holds back the candidate who misses it and lets
		the one who clears it through."""
		from recruitment.recruitment.eligibility_engine import evaluate_eligibility

		opening = frappe.get_doc({
			"doctype": "Job Opening", "job_title": "_Test EP GPA Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_eligibility_rules": [{
				"field_name": f"{TABLE_FIELD}::{ep.GPA_FIELD}",
				"operator": "<", "value": "60", "action": "Knock out"}],
		})
		opening.flags.ignore_mandatory = True
		opening.insert(ignore_permissions=True)

		outcomes = {}
		for gpa in (82, 45):
			applicant = frappe.get_doc({
				"doctype": "Job Applicant", "applicant_name": f"EP GPA {gpa}",
				"email_id": f"ep.gpa{gpa}@test.local", "status": "Open",
				"job_title": opening.name,
				TABLE_FIELD: [{"qualification": "Graduation", ep.GPA_FIELD: gpa}]})
			applicant.flags.ignore_mandatory = True
			applicant.insert(ignore_permissions=True)
			evaluate_eligibility(applicant)
			outcomes[gpa] = frappe.db.get_value("Job Applicant", applicant.name, "status")

		self.assertEqual(outcomes[82], "Shortlisted")
		self.assertEqual(outcomes[45], "Rejected")

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
