"""Tests for: a Fresher requisition is one document that raises its own openings.

Three things have to hold together, and each one is a place the old per-region
split used to leak:

  * a Fresher submission produces ONE requisition holding every region, not one
    requisition per region;
  * it cannot be approved until each region names its recruiter and its pay,
    because that is what its Job Opening is built out of;
  * reaching "Approved Active" raises exactly one opening per region — with that
    region's headcount, recruiter, pay, a Campus posting and the campus hiring
    workflow — and raises them once, however many times the requisition is saved
    afterwards.

Lateral is checked too, in the only way that matters here: it must still split by
location, and must not raise anything by itself.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_fresher_region_openings.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api import job_requisition as jr_api
from recruitment.customizations import fresher_openings

PREFIX = "_Test Fresher Regions"
APPROVAL_PENDING = "Approval Pending"
APPROVED_DRAFT = "Approved Draft"
APPROVED_ACTIVE = "Approved Active"


class TestFresherRegionOpenings(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.company = frappe.get_all("Company", pluck="name")[0]
		cls.designation = frappe.get_all("Designation", pluck="name")[0]
		cls.department = frappe.get_all(
			"Department", filters={"company": cls.company}, pluck="name"
		) or frappe.get_all("Department", pluck="name")
		cls.department = cls.department[0] if cls.department else None
		cls.regions = frappe.get_all("Region", limit=3, pluck="name")
		cls.employee = frappe.get_all(
			"Employee", filters={"status": "Active"}, limit=1, pluck="name"
		)
		cls.employee = cls.employee[0] if cls.employee else None
		cls.currency = frappe.db.get_value("Company", cls.company, "default_currency")
		cls._purge()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		"""Openings first — a requisition cannot be deleted while one links to it."""
		for name in frappe.get_all(
			"Job Opening", filters={"job_title": ("like", f"%{PREFIX}%")}, pluck="name"
		):
			frappe.delete_doc("Job Opening", name, force=True, ignore_permissions=True)
		for name in frappe.get_all(
			"Job Requisition", filters={"description": ("like", f"%{PREFIX}%")}, pluck="name"
		):
			for opening in frappe.get_all(
				"Job Opening", filters={"job_requisition": name}, pluck="name"
			):
				frappe.delete_doc("Job Opening", opening, force=True, ignore_permissions=True)
			frappe.delete_doc("Job Requisition", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def setUp(self):
		frappe.set_user("Administrator")
		if len(self.regions) < 2:
			self.skipTest("needs at least two Region records to split anything")
		if not self.employee:
			self.skipTest("needs an Active Employee to raise a requisition as")

	def tearDown(self):
		frappe.db.rollback()

	# ── helpers ──────────────────────────────────────────────────────────────

	def _base_fields(self, tag):
		"""Every field the requisition API insists on, so a fixture can be saved
		back through `update_job_requisition` rather than only inserted with
		`ignore_mandatory`."""
		return {
			"doctype": "Job Requisition",
			"company": self.company,
			"designation": self.designation,
			"department": self.department,
			"requested_by": self.employee,
			"custom_hiring_lead": self.employee,
			"custom_salary_range_currency": self.currency,
			"custom_salary_range_min": "100000",
			"custom_salary_range_max": "200000",
			"description": f"{PREFIX} {tag}",
			"reason_for_requesting": f"{PREFIX} {tag}",
		}

	def _requisition(self, tag, region_rows, status=APPROVAL_PENDING):
		doc = frappe.get_doc(dict(
			self._base_fields(tag),
			custom_hiring_type="Fresher",
			status=status,
			custom_regions=region_rows,
		))
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True)

	def _staffed_rows(self, count=2):
		return [
			{
				"region": region,
				"no_of_openings": index + 2,
				"fixed_pay": 500000 + index,
				"variable_pay": 50000 + index,
				"recruiter": "Administrator",
			}
			for index, region in enumerate(self.regions[:count])
		]

	@staticmethod
	def _approve(doc, status):
		"""Move a requisition the way the approval engine does — set, then save."""
		doc.status = status
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		return doc

	# ── one requisition, every region ────────────────────────────────────────

	def test_a_fresher_submission_creates_a_single_requisition(self):
		payload = dict(self._base_fields("single doc"), **{
			"custom_hiring_type": "Fresher",
			"custom_regions": [
				{"region": self.regions[0], "no_of_openings": 3},
				{"region": self.regions[1], "no_of_openings": 2},
			],
		})
		payload.pop("doctype")
		result = jr_api.create_job_requisition(payload)
		self.assertTrue(result.get("success"), msg=result.get("message"))

		requisitions = result["data"]["requisitions"]
		self.assertEqual(len(requisitions), 1, "a Fresher submission is ONE requisition")
		self.assertEqual(requisitions[0]["positions_count"], 5)

		doc = frappe.get_doc("Job Requisition", requisitions[0]["name"])
		self.assertEqual(len(doc.custom_regions), 2)
		self.assertEqual(doc.no_of_positions, 5)
		self.assertEqual(
			[row.no_of_openings for row in doc.custom_regions], [3, 2]
		)

	def test_repeated_rows_for_one_region_are_summed_into_it(self):
		groups = jr_api._group_openings_by_region([
			{"region": self.regions[0], "no_of_openings": 2},
			{"region": self.regions[1], "no_of_openings": 1},
			{"region": self.regions[0], "no_of_openings": 3},
		])
		self.assertEqual(groups, [(self.regions[0], 5), (self.regions[1], 1)])

	def test_lateral_still_splits_by_location(self):
		"""The path this change must not have touched."""
		self.assertEqual(
			jr_api._group_positions_by_location([
				{"location": "Pune"}, {"location": "Mumbai"}, {"location": "Pune"},
			]),
			[("Pune", [{"location": "Pune"}, {"location": "Pune"}]),
			 ("Mumbai", [{"location": "Mumbai"}])],
		)

	# ── the approval gate ────────────────────────────────────────────────────

	def test_approval_is_refused_while_a_region_is_incomplete(self):
		doc = self._requisition("incomplete", [
			{"region": self.regions[0], "no_of_openings": 2, "fixed_pay": 100,
			 "variable_pay": 10, "recruiter": "Administrator"},
			{"region": self.regions[1], "no_of_openings": 1},
		])
		with self.assertRaises(frappe.ValidationError) as caught:
			self._approve(doc, APPROVED_DRAFT)
		message = frappe.utils.strip_html(str(caught.exception))
		self.assertIn(self.regions[1], message)

	def test_approval_goes_through_once_every_region_is_filled_in(self):
		doc = self._requisition("complete", self._staffed_rows())
		self._approve(doc, APPROVED_DRAFT)
		self.assertEqual(doc.status, APPROVED_DRAFT)

	def test_a_lateral_requisition_is_never_gated_on_regions(self):
		doc = frappe.get_doc(dict(
			self._base_fields("lateral gate"),
			custom_hiring_type="Lateral", no_of_positions=1, status=APPROVAL_PENDING,
		))
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		self._approve(doc, APPROVED_DRAFT)
		self.assertEqual(doc.status, APPROVED_DRAFT)

	# ── the openings ─────────────────────────────────────────────────────────

	def test_approved_active_raises_one_opening_per_region(self):
		rows = self._staffed_rows()
		doc = self._requisition("openings", rows)
		self._approve(doc, APPROVED_DRAFT)
		self._approve(doc, APPROVED_ACTIVE)

		doc.reload()
		openings = [row.job_opening for row in doc.custom_regions]
		self.assertEqual(len(openings), len(rows))
		self.assertTrue(all(openings), f"every region should carry its opening: {openings}")
		self.assertEqual(len(set(openings)), len(openings), "each region gets its OWN opening")

		for row, expected in zip(doc.custom_regions, rows):
			opening = frappe.get_doc("Job Opening", row.job_opening)
			self.assertEqual(opening.job_requisition, doc.name)
			self.assertEqual(opening.custom_hiring_type, "Fresher")
			# This region's headcount, not the requisition's total.
			self.assertEqual(opening.vacancies, expected["no_of_openings"])
			self.assertEqual(opening.custom_recruiter, expected["recruiter"])
			self.assertEqual(opening.fixed_pay, expected["fixed_pay"])
			self.assertEqual(opening.variable_pay, expected["variable_pay"])
			self.assertEqual(
				[r.region for r in opening.custom_regions], [expected["region"]],
				"the opening speaks for one region only",
			)
			self.assertEqual(opening.custom_region, expected["region"])
			self.assertIn(
				(fresher_openings.CAMPUS_POSTING_CHANNEL, fresher_openings.POSTING_STATUS_ACTIVE),
				[(p.post_to, p.status) for p in opening.custom_posting_options],
			)
			self.assertIn(
				expected["recruiter"],
				[member.user for member in opening.custom_hiring_team],
				"the region's recruiter is on its opening's hiring team",
			)

	def test_an_opening_is_never_saved_without_its_hiring_workflow(self):
		"""The Job Opening form prefills an empty workflow tab and marks the
		document dirty, so an opening saved without stages opens as "Not Saved"
		carrying a workflow nobody chose. When Campus Settings names no default,
		the attribute-matched template — the very thing the form would have
		applied — is taken at build time instead."""
		doc = self._requisition("workflow fallback", self._staffed_rows(count=1))
		opening = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} fallback",
			"company": self.company, "designation": self.designation,
			"department": self.department, "status": "Open",
			"custom_hiring_type": "Fresher",
		})

		# No campus default configured -> must still resolve a workflow.
		fresher_openings._apply_hiring_stages(opening, [])
		expected = fresher_openings._attribute_matched_stages(opening)
		if not expected:
			self.skipTest("no hiring workflow template matches on this site")
		self.assertEqual(
			[s.stage_name for s in opening.custom_hiring_stages],
			[s["stage_name"] for s in expected],
		)

		# Stages already present are never overwritten.
		before = [s.stage_name for s in opening.custom_hiring_stages]
		fresher_openings._apply_hiring_stages(opening, self._other_stages(before))
		self.assertEqual([s.stage_name for s in opening.custom_hiring_stages], before)
		self.assertTrue(doc.name)

	@staticmethod
	def _other_stages(existing):
		return [{"stage_name": f"Not {name}", "stage_type": "Screening"} for name in existing]

	def test_the_openings_are_raised_once_however_often_it_is_saved(self):
		doc = self._requisition("idempotent", self._staffed_rows())
		self._approve(doc, APPROVED_DRAFT)
		self._approve(doc, APPROVED_ACTIVE)
		doc.reload()
		first = sorted(row.job_opening for row in doc.custom_regions)

		# Save again, and re-run the creator directly — neither may add anything.
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		self.assertEqual(fresher_openings.create_missing_openings(doc), [])

		doc.reload()
		self.assertEqual(sorted(row.job_opening for row in doc.custom_regions), first)
		self.assertEqual(
			frappe.db.count("Job Opening", {"job_requisition": doc.name}), len(first)
		)

	def test_the_campus_hiring_workflow_is_applied_when_one_is_configured(self):
		stages = fresher_openings._campus_hiring_stages()
		if not stages:
			self.skipTest("no default campus hiring workflow configured on this site")

		doc = self._requisition("workflow", self._staffed_rows(count=1))
		self._approve(doc, APPROVED_DRAFT)
		self._approve(doc, APPROVED_ACTIVE)
		doc.reload()

		opening = frappe.get_doc("Job Opening", doc.custom_regions[0].job_opening)
		self.assertEqual(
			[s.stage_name for s in opening.custom_hiring_stages],
			[s["stage_name"] for s in stages],
		)

	def test_a_lateral_requisition_raises_nothing_by_itself(self):
		doc = frappe.get_doc(dict(
			self._base_fields("lateral openings"),
			custom_hiring_type="Lateral", no_of_positions=1, status=APPROVED_DRAFT,
			custom_assign_to_recruiter="Administrator",
		))
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		self._approve(doc, APPROVED_ACTIVE)
		self.assertEqual(frappe.db.count("Job Opening", {"job_requisition": doc.name}), 0)

	# ── the Hiring Lead's edit ───────────────────────────────────────────────

	def test_updating_regions_keeps_pay_the_payload_does_not_mention(self):
		"""The ToDo sets pay; a later edit of the headcount must not undo it."""
		doc = self._requisition("preserve", self._staffed_rows(count=1))
		region = doc.custom_regions[0].region

		result = jr_api.update_job_requisition(
			doc.name,
			{"custom_regions": [{"region": region, "no_of_openings": 9}]},
		)
		self.assertTrue(result.get("success"), msg=result.get("message"))

		doc.reload()
		row = doc.custom_regions[0]
		self.assertEqual(row.no_of_openings, 9)
		self.assertEqual(row.recruiter, "Administrator")
		self.assertEqual(row.fixed_pay, 500000)

	def test_the_hiring_lead_can_set_pay_and_recruiter_through_the_api(self):
		doc = self._requisition("assign", [
			{"region": self.regions[0], "no_of_openings": 2},
		])
		result = jr_api.update_job_requisition(doc.name, {"custom_regions": [{
			"region": self.regions[0], "no_of_openings": 2,
			"fixed_pay": 750000, "variable_pay": 25000, "recruiter": "Administrator",
		}]})
		self.assertTrue(result.get("success"), msg=result.get("message"))

		doc.reload()
		row = doc.custom_regions[0]
		self.assertEqual(row.fixed_pay, 750000)
		self.assertEqual(row.variable_pay, 25000)
		self.assertEqual(row.recruiter, "Administrator")


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_fresher_region_openings.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestFresherRegionOpenings)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
