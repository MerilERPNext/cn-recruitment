"""Tests for the Campus Invite's Job Openings table: it is mandatory, and it is
filtered by the invite's Region.

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

Two filters sit on that table's picker. Campus hiring IS fresher hiring — a college
drive cannot fill a lateral role, and `custom_hiring_type` defaults to Lateral, so
without that rule the picker offers roles no campus candidate is eligible for.

The Region filter is the other. An invite is run for one region, so offering
HR every campus opening on the site invites a college for roles that region is not
hiring. Openings with NO region are offered whatever the region — a blank Region
means "not tied to one", the same reading the campus panels already use for a
Round Panelist with no Region — and without that rule the picker would come back
empty for a region that has no opening of its own, which, with the table mandatory,
would leave HR unable to create the invite at all.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_invite_requires_openings.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api import campus_openings as co

PREFIX = "_Test Reqd Openings"


class TestCampusInviteRequiresOpenings(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.institute = cls._institute()
		cls.opening = frappe.get_all("Job Opening", pluck="name", limit=1)

		# Read the site's real campus openings rather than making new ones: an opening
		# only counts as "campus" through its Posting Options window, which is a lot of
		# fixture for a filter that is pure set arithmetic.
		cls.campus_openings = co.campus_openings(None)
		rows = frappe.get_all("Job Opening",
		                      filters={"name": ["in", cls.campus_openings or [""]]},
		                      fields=["name", "custom_region", "custom_hiring_type"])
		cls.regionless = [r.name for r in rows if not r.custom_region]
		cls.by_region = {}
		for r in rows:
			if r.custom_region:
				cls.by_region.setdefault(r.custom_region, []).append(r.name)
		first = sorted(cls.by_region)[0] if cls.by_region else None
		cls.regional = (first, cls.by_region[first][0]) if first else None
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

	def _opening_of_another_region(self):
		"""``(region, an opening belonging to a DIFFERENT region)`` or None."""
		regions = sorted(self.by_region)
		if len(regions) < 2:
			return None
		return regions[0], self.by_region[regions[1]][0]

	def _campus_active_lateral(self):
		"""A Lateral opening that IS posted to the Campus channel, or None."""
		from recruitment.api.channels._common import get_openings_active_on_channel

		active = get_openings_active_on_channel("campus")
		if not active:
			return None
		rows = frappe.get_all("Job Opening", filters={"name": ["in", active]},
		                      fields=["name", "custom_hiring_type"])
		return next((r.name for r in rows if r.custom_hiring_type != co.CAMPUS_HIRING_TYPE),
		            None)

	def _region_without_openings(self):
		"""A Region that has no campus opening of its own, or None."""
		everything = frappe.get_all("Region", pluck="name")
		return next((r for r in everything if r not in self.by_region), None)

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


	# ── the Fresher filter ──
	#
	# Campus hiring IS fresher hiring: a college drive cannot fill a lateral role, and
	# `custom_hiring_type` DEFAULTS to Lateral — so without this rule the picker offers
	# roles no campus candidate is eligible for.

	def test_every_offered_opening_is_a_fresher_role(self):
		offered = frappe.get_all(
			"Job Opening", filters={"name": ["in", self.campus_openings or [""]]},
			fields=["name", "job_title", "custom_hiring_type"])
		wrong = [f"{o.job_title} ({o.custom_hiring_type})" for o in offered
		         if o.custom_hiring_type != co.CAMPUS_HIRING_TYPE]
		self.assertFalse(wrong, f"non-Fresher openings offered: {wrong}")

	def test_a_lateral_opening_is_never_offered(self):
		lateral = self._campus_active_lateral()
		if not lateral:
			self.skipTest("no Lateral opening is posted to the Campus channel")
		self.assertNotIn(lateral, self.campus_openings)

	def test_the_lateral_opening_is_otherwise_a_valid_campus_opening(self):
		"""Proves the previous test is the hiring type doing the work, not the opening
		being off the Campus channel or out of its display window."""
		lateral = self._campus_active_lateral()
		if not lateral:
			self.skipTest("no Lateral opening is posted to the Campus channel")
		from recruitment.api.channels._common import get_openings_active_on_channel

		self.assertIn(lateral, get_openings_active_on_channel("campus"))

	def test_the_fresher_filter_survives_the_region_filter(self):
		"""Both narrowings apply together, not one or the other."""
		if not self.regional:
			self.skipTest("no campus opening carries a region on this site")
		offered = co.campus_openings(self.regional[0])
		types = frappe.get_all("Job Opening", filters={"name": ["in", offered or [""]]},
		                       pluck="custom_hiring_type")
		self.assertTrue(offered)
		self.assertEqual(set(types), {co.CAMPUS_HIRING_TYPE})

	def test_the_link_query_offers_only_fresher_roles(self):
		"""End to end, through the query the picker actually calls."""
		rows = co.campus_job_opening_query("Job Opening", "", "name", 0, 50, {})
		names = [r[0] for r in rows]
		types = frappe.get_all("Job Opening", filters={"name": ["in", names or [""]]},
		                       pluck="custom_hiring_type")
		self.assertTrue(names)
		self.assertEqual(set(types), {co.CAMPUS_HIRING_TYPE})

	# ── the Region filter ──

	def test_no_region_offers_every_campus_opening(self):
		"""An invite with no Region set is not narrowed — that is the Campus Drive
		picker's case too, which passes no region at all."""
		self.assertEqual(co.campus_openings(None), self.campus_openings)

	def test_a_region_offers_its_own_openings(self):
		if not self.regional:
			self.skipTest("no campus opening carries a region on this site")
		region, opening = self.regional
		self.assertIn(opening, co.campus_openings(region))

	def test_a_region_does_not_offer_another_regions_openings(self):
		other = self._opening_of_another_region()
		if not other:
			self.skipTest("need two regions with campus openings")
		region, foreign = other
		self.assertNotIn(foreign, co.campus_openings(region))

	def test_openings_with_no_region_are_offered_everywhere(self):
		"""They are not tied to a region, and dropping them would empty the picker for
		a region with no opening of its own."""
		if not (self.regionless and self.regional):
			self.skipTest("need a region-less opening and a region")
		for opening in self.regionless:
			self.assertIn(opening, co.campus_openings(self.regional[0]))

	def test_a_region_with_no_openings_still_offers_the_regionless_ones(self):
		"""The trap this rule exists to avoid: Job Openings is mandatory, so an empty
		picker would block the invite outright."""
		if not self.regionless:
			self.skipTest("no region-less campus opening on this site")
		empty_region = self._region_without_openings()
		if not empty_region:
			self.skipTest("every region has an opening of its own")
		offered = co.campus_openings(empty_region)
		self.assertTrue(offered, "a region with no openings must still get the region-less ones")
		self.assertEqual(set(offered), set(self.regionless))

	# ── changing the Region cleans up what was already picked ──

	def test_changing_region_drops_the_other_regions_openings(self):
		other = self._opening_of_another_region()
		if not other:
			self.skipTest("need two regions with campus openings")
		region, foreign = other
		self.assertEqual(co.openings_outside_region([foreign], region), [foreign])

	def test_changing_region_keeps_the_regionless_ones(self):
		if not (self.regionless and self.regional):
			self.skipTest("need a region-less opening and a region")
		self.assertEqual(co.openings_outside_region(self.regionless, self.regional[0]), [])

	def test_nothing_is_dropped_when_no_region_is_set(self):
		"""Clearing the Region must not empty the table — there is nothing to filter
		against."""
		if not self.campus_openings:
			self.skipTest("no campus openings on this site")
		self.assertEqual(co.openings_outside_region(self.campus_openings, None), [])

	def test_the_json_list_form_is_accepted(self):
		"""The client hands the picked rows over as a JSON string."""
		import json as _json

		other = self._opening_of_another_region()
		if not other:
			self.skipTest("need two regions with campus openings")
		region, foreign = other
		self.assertEqual(
			co.openings_outside_region(_json.dumps([foreign]), region), [foreign])


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
