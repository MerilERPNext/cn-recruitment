# Copyright (c) 2026, Recruitment and contributors
# See license.txt

"""Job Offer ⇄ Document Template selection by Assignment Attributes.

The offer letter used to be chosen in Recruitment Settings; it is now chosen by
the Document Template's own assignment. These exercise the resolver
(:mod:`recruitment.recruitment.offer_document_template`) against real Document
Templates carrying real Dynamic User Assignments.

Templates are created rather than mocked because the resolver reads every
Document Template whose ``doctype_name`` is Job Offer — a site's existing
templates are in scope by construction, so each test asserts on *its own*
templates by name rather than on the whole result list.

``TestNoTemplateAvailable`` is the case the feature exists for: nothing admits
the offer, so there is no preview and the submit is refused. It is checked
through the public surfaces (availability endpoint, the ``before_submit`` hook)
rather than the internals, because "HR sees the message" is the requirement.
"""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	PURPOSE_ATTRIBUTES,
	clear_attribute_cache,
)
import recruitment.recruitment.offer_document_template as offer_templates
from recruitment.recruitment.offer_document_template import (
	OFFER_DOCTYPE,
	get_offer_document_template,
	get_offer_template_availability,
	is_document_template_offer_enabled,
	no_template_message,
	offer_document_template_query,
	resolve_offer_document_templates,
	validate_offer_document_template,
)

NO_MATCH = "__no_such_value__"


class OfferTemplateTestBase(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.employment_types = frappe.get_all(
			"Employment Type", pluck="name", limit=2, order_by="name"
		)
		cls.companies = frappe.get_all("Company", pluck="name", limit=2, order_by="name")

	def setUp(self):
		clear_attribute_cache()
		self._duas = []
		self._templates = []

	def tearDown(self):
		self._restore_toggle()
		for name in self._templates:
			frappe.delete_doc("Document Template", name, force=True, ignore_permissions=True)
		for name in self._duas:
			frappe.delete_doc(
				"Dynamic User Assignment", name, force=True, ignore_permissions=True
			)
		clear_attribute_cache()

	# --- fixtures ------------------------------------------------------------

	def _dua(self, rows, purpose=PURPOSE_ATTRIBUTES):
		"""A Dynamic User Assignment carrying ``[(scope_field, value), ...]``."""
		doc = frappe.new_doc("Dynamic User Assignment")
		doc.assignment_name = f"Test Offer {frappe.generate_hash(length=8)}"
		doc.assignment_code = doc.assignment_name
		doc.target_type = "Employee"
		doc.assignment_purpose = purpose
		doc.validate_attribute_hierarchy = 0
		for scope_field, value in rows:
			doc.append(
				"assignment_attributes",
				{
					"scope_doctype": OFFER_DOCTYPE,
					"scope_field": scope_field,
					"attribute_value": value,
				},
			)
		doc.insert(ignore_permissions=True)
		self._duas.append(doc.name)
		return doc

	def _template(self, assignment_type=None, company=None, assignments=None):
		doc = frappe.new_doc("Document Template")
		doc.letter_name = f"Test Offer Letter {frappe.generate_hash(length=8)}"
		doc.letter_description = "Created by test_offer_document_template."
		doc.doctype_name = OFFER_DOCTYPE
		doc.type_of_letter = "Offer Letters"
		doc.template_type = "Html"
		doc.assignment_type = assignment_type or ""
		doc.company = company
		for assignment in assignments or []:
			doc.append("user_assignment", {"dynamic_user_assignment": assignment})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		self._templates.append(doc.name)
		return doc

	def _offer(self, **values):
		"""A plain dict standing in for a Job Offer, as the resolver accepts."""
		values.setdefault("doctype", OFFER_DOCTYPE)
		return values

	def _mine(self, matches):
		"""Only the templates this test created, in resolver order."""
		return [m["name"] for m in matches if m["name"] in self._templates]

	def _set_toggle(self, value):
		"""Set ``send_offer_via_document_template`` and make the change visible.

		Restored in ``tearDown`` via ``_toggle_restore``. Written straight to
		``tabSingles`` rather than through ``set_single_value`` because that path
		commits, and a test must not leave a site-wide switch flipped if it fails
		half way.
		"""
		if not hasattr(self, "_toggle_restore"):
			self._toggle_restore = frappe.db.sql(
				"SELECT value FROM tabSingles WHERE doctype = %s AND field = %s",
				("Recruitment Settings", "send_offer_via_document_template"),
			)
			self._toggle_restore = (
				self._toggle_restore[0][0] if self._toggle_restore else "0"
			)
		frappe.db.sql(
			"UPDATE tabSingles SET value = %s WHERE doctype = %s AND field = %s",
			(str(int(value)), "Recruitment Settings", "send_offer_via_document_template"),
		)
		self._forget_cached_toggle()

	@staticmethod
	def _forget_cached_toggle():
		"""Make the next read see the write.

		``frappe.db.get_single_value`` memoises into ``frappe.db.value_cache``,
		which ``frappe.clear_cache`` does not touch — so a test that flips the
		toggle twice would keep reading the first value. Request-scoped caching is
		right in production (a request is short, and saving the Single clears it);
		it just has to be defeated here.
		"""
		frappe.clear_cache(doctype="Recruitment Settings")
		frappe.db.value_cache.pop("Recruitment Settings", None)

	def _restore_toggle(self):
		if not hasattr(self, "_toggle_restore"):
			return
		frappe.db.sql(
			"UPDATE tabSingles SET value = %s WHERE doctype = %s AND field = %s",
			(
				self._toggle_restore,
				"Recruitment Settings",
				"send_offer_via_document_template",
			),
		)
		self._forget_cached_toggle()
		del self._toggle_restore

	def _only_mine(self):
		"""Hide the site's own templates for the duration of a ``with`` block.

		Most tests assert on their own templates by name and can ignore whatever
		else the site has. The ones that assert *nothing* matches cannot: a site
		with a catch-all letter admits every offer, and the test would be reduced
		to a skip on exactly the behaviour it exists to prove. Narrowing the
		candidate set is the smallest way to make that case reachable without
		editing records the test does not own.
		"""
		names = set(self._templates)
		real = offer_templates._candidate_templates

		def only_mine():
			return [t for t in real() if t["name"] in names]

		return patch.object(offer_templates, "_candidate_templates", only_mine)


class TestAttributeFiltering(OfferTemplateTestBase):
	def test_matching_attribute_admits_template(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		template = self._template("User Assignment", assignments=[dua.name])

		offer = self._offer(custom_employment_type=self.employment_types[0])
		self.assertIn(template.name, self._mine(resolve_offer_document_templates(offer)))

	def test_other_value_rejects_template(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		template = self._template("User Assignment", assignments=[dua.name])

		offer = self._offer(custom_employment_type=self.employment_types[1])
		self.assertNotIn(template.name, self._mine(resolve_offer_document_templates(offer)))

	def test_values_within_one_field_or(self):
		dua = self._dua(
			[
				("custom_employment_type", self.employment_types[0]),
				("custom_employment_type", self.employment_types[1]),
			]
		)
		template = self._template("User Assignment", assignments=[dua.name])

		for employment_type in self.employment_types:
			offer = self._offer(custom_employment_type=employment_type)
			self.assertIn(
				template.name,
				self._mine(resolve_offer_document_templates(offer)),
				msg=f"{employment_type} should be admitted",
			)

	def test_fields_and(self):
		"""Two fields on one assignment must BOTH match — the narrow letter."""
		dua = self._dua(
			[
				("custom_employment_type", self.employment_types[0]),
				("company", self.companies[0]),
			]
		)
		template = self._template("User Assignment", assignments=[dua.name])

		both = self._offer(
			custom_employment_type=self.employment_types[0], company=self.companies[0]
		)
		self.assertIn(template.name, self._mine(resolve_offer_document_templates(both)))

		if len(self.companies) > 1:
			one = self._offer(
				custom_employment_type=self.employment_types[0], company=self.companies[1]
			)
			self.assertNotIn(template.name, self._mine(resolve_offer_document_templates(one)))

	def test_several_assignments_or(self):
		first = self._dua([("custom_employment_type", self.employment_types[0])])
		second = self._dua([("custom_employment_type", self.employment_types[1])])
		template = self._template("User Assignment", assignments=[first.name, second.name])

		for employment_type in self.employment_types:
			offer = self._offer(custom_employment_type=employment_type)
			self.assertIn(
				template.name,
				self._mine(resolve_offer_document_templates(offer)),
				msg=f"{employment_type} should be admitted by one of the two",
			)

	def test_people_assignment_does_not_cancel_attributes(self):
		"""A People assignment says *who*, never *what* — it must not widen the letter.

		``user_assignment`` held People assignments long before attributes existed.
		Since assignments OR, treating one as an unrestricted match would silently
		admit every offer and cancel the attribute rule sitting beside it.
		"""
		people = self._dua([], purpose="People")
		attributes = self._dua([("custom_employment_type", self.employment_types[0])])
		template = self._template(
			"User Assignment", assignments=[people.name, attributes.name]
		)

		offer = self._offer(custom_employment_type=self.employment_types[1])
		self.assertNotIn(template.name, self._mine(resolve_offer_document_templates(offer)))

	def test_unrestricted_template_admits_everything(self):
		template = self._template()
		offer = self._offer(custom_employment_type=self.employment_types[0])
		self.assertIn(template.name, self._mine(resolve_offer_document_templates(offer)))


class TestCompanyAssignment(OfferTemplateTestBase):
	def test_company_template_matches_its_company(self):
		template = self._template("Company", company=self.companies[0])
		offer = self._offer(company=self.companies[0])
		self.assertIn(template.name, self._mine(resolve_offer_document_templates(offer)))

	def test_company_template_rejects_another_company(self):
		if len(self.companies) < 2:
			self.skipTest("needs two companies")
		template = self._template("Company", company=self.companies[0])
		offer = self._offer(company=self.companies[1])
		self.assertNotIn(template.name, self._mine(resolve_offer_document_templates(offer)))


class TestSpecificityOrdering(OfferTemplateTestBase):
	def test_narrower_template_wins(self):
		"""An offer admitted by both letters is rendered with the narrower one."""
		narrow_dua = self._dua(
			[
				("custom_employment_type", self.employment_types[0]),
				("company", self.companies[0]),
			]
		)
		narrow = self._template("User Assignment", assignments=[narrow_dua.name])
		broad_dua = self._dua([("custom_employment_type", self.employment_types[0])])
		broad = self._template("User Assignment", assignments=[broad_dua.name])
		catch_all = self._template()

		offer = self._offer(
			custom_employment_type=self.employment_types[0], company=self.companies[0]
		)
		order = self._mine(resolve_offer_document_templates(offer))
		self.assertEqual(order, [narrow.name, broad.name, catch_all.name])


class TestDeferral(OfferTemplateTestBase):
	def test_empty_field_defers_rather_than_rejecting(self):
		"""A half-filled offer still shows the letters it could qualify for.

		Strict resolution refuses to guess — it decides what is actually rendered —
		but the picker is permissive, or HR would face an empty list until the last
		field was typed.
		"""
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		template = self._template("User Assignment", assignments=[dua.name])

		blank = self._offer(custom_employment_type=None)
		self.assertNotIn(template.name, self._mine(resolve_offer_document_templates(blank)))
		self.assertIn(
			template.name,
			self._mine(resolve_offer_document_templates(blank, permissive=True)),
		)

	def test_deferred_match_ranks_below_a_definite_one(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		deferred = self._template("User Assignment", assignments=[dua.name])
		definite = self._template()

		blank = self._offer(custom_employment_type=None)
		order = self._mine(resolve_offer_document_templates(blank, permissive=True))
		self.assertEqual(order, [definite.name, deferred.name])


class TestNoTemplateAvailable(OfferTemplateTestBase):
	"""Nothing admits the offer — the case the whole feature turns on."""

	def setUp(self):
		super().setUp()
		self._set_toggle(1)

	def test_a_restricted_template_is_not_offered_to_a_non_matching_offer(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		offer = self._offer(custom_employment_type=self.employment_types[1])
		self.assertEqual(self._mine(resolve_offer_document_templates(offer)), [])

	def test_validate_refuses_to_submit(self):
		"""The send is blocked, not just the preview — with the same wording."""
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		doc = frappe._dict(
			doctype=OFFER_DOCTYPE,
			custom_offer_letter_template=None,
			custom_employment_type=self.employment_types[1],
		)

		with self._only_mine():
			self.assertEqual(resolve_offer_document_templates(doc), [])
			with self.assertRaises(frappe.ValidationError) as caught:
				validate_offer_document_template(doc)

		self.assertIn("contact the HR department", str(caught.exception))

	def test_validate_passes_once_a_template_admits_the_offer(self):
		"""The counterpart: the same offer submits fine when a letter covers it."""
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		doc = frappe._dict(
			doctype=OFFER_DOCTYPE,
			custom_offer_letter_template=None,
			custom_employment_type=self.employment_types[0],
		)
		with self._only_mine():
			validate_offer_document_template(doc)  # must not throw

	def test_hand_picked_template_is_not_second_guessed(self):
		"""HR overriding the rules on purpose is taken at its word."""
		template = self._template()
		doc = frappe._dict(
			doctype=OFFER_DOCTYPE,
			custom_offer_letter_template=template.name,
			custom_employment_type=NO_MATCH,
		)
		validate_offer_document_template(doc)  # must not throw


class TestEndpoints(OfferTemplateTestBase):
	def test_availability_reports_the_shared_message(self):
		self._set_toggle(1)
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])
		with self._only_mine():
			result = get_offer_template_availability(
				overlay={"custom_employment_type": self.employment_types[1]}
			)

		self.assertTrue(result["enabled"])
		self.assertFalse(result["available"])
		self.assertEqual(result["templates"], [])
		self.assertEqual(result["message"], no_template_message())

	def test_link_query_returns_only_admitted_templates(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		template = self._template("User Assignment", assignments=[dua.name])

		rows = offer_document_template_query(
			"Document Template",
			"",
			"name",
			0,
			100,
			{"custom_employment_type": self.employment_types[1]},
		)
		self.assertNotIn(template.name, [r[0] for r in rows])

		rows = offer_document_template_query(
			"Document Template",
			"",
			"name",
			0,
			100,
			{"custom_employment_type": self.employment_types[0]},
		)
		self.assertIn(template.name, [r[0] for r in rows])

	def test_link_query_ignores_a_job_offer_key_meant_for_the_offer_itself(self):
		"""``job_offer`` in the picker's filters names the offer, not its applicant.

		Job Offer has a field of that name holding the Job Applicant, so letting the
		key through as a form value would match every offer against the wrong link.
		"""
		template = self._template()
		rows = offer_document_template_query(
			"Document Template", "", "name", 0, 100, {"job_offer": ""}
		)
		self.assertIn(template.name, [r[0] for r in rows])

	def test_the_narrower_of_two_matches_is_the_one_resolved(self):
		"""Asserted on this test's own templates: the site's may rank above both."""
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		narrow = self._template("User Assignment", assignments=[dua.name])
		catch_all = self._template()

		offer = self._offer(custom_employment_type=self.employment_types[0])
		self.assertEqual(
			self._mine(resolve_offer_document_templates(offer)), [narrow.name, catch_all.name]
		)
		self.assertIsNotNone(get_offer_document_template(offer))


class TestToggleGatesEverything(OfferTemplateTestBase):
	"""``send_offer_via_document_template`` off ⇒ the Print Format path, untouched.

	The toggle is the only switch that decides which of the two paths a site is on.
	With it off nothing in this feature may fire: no attribute matching, no
	"contact HR" notice, no refused submit, and no filtered picker — because a
	site that has always sent Print Format offers must keep doing exactly that.

	The hand-picked ``custom_offer_letter_template`` is checked here on purpose. It
	used to be read *before* the toggle, so a value on one Job Offer form put that
	offer on the Document Template path while the site-wide switch said Print
	Format. These lock the order the toggle actually reads as.
	"""

	def test_nothing_resolves_when_the_toggle_is_off(self):
		from recruitment.job_offer_utils import get_job_offer_document_template

		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		self._set_toggle(0)
		self.assertFalse(is_document_template_offer_enabled())
		self.assertIsNone(
			get_job_offer_document_template(
				frappe._dict(
					doctype=OFFER_DOCTYPE,
					custom_employment_type=self.employment_types[0],
					custom_offer_letter_template=None,
				)
			)
		)

	def test_a_hand_picked_template_does_not_override_the_toggle(self):
		from recruitment.job_offer_utils import get_job_offer_document_template

		template = self._template()
		offer = frappe._dict(
			doctype=OFFER_DOCTYPE, custom_offer_letter_template=template.name
		)

		self._set_toggle(0)
		self.assertIsNone(
			get_job_offer_document_template(offer),
			msg="a form field must not switch one offer onto the template path",
		)

		self._set_toggle(1)
		self.assertEqual(get_job_offer_document_template(offer), template.name)

	def test_submit_is_not_blocked_when_the_toggle_is_off(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		doc = frappe._dict(
			doctype=OFFER_DOCTYPE,
			custom_offer_letter_template=None,
			custom_employment_type=self.employment_types[1],
		)
		self._set_toggle(0)
		with self._only_mine():
			validate_offer_document_template(doc)  # must not throw

	def test_availability_reports_disabled_and_never_warns(self):
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		self._template("User Assignment", assignments=[dua.name])

		self._set_toggle(0)
		with self._only_mine():
			result = get_offer_template_availability(
				overlay={"custom_employment_type": self.employment_types[1]}
			)
		self.assertFalse(result["enabled"])
		self.assertTrue(result["available"], msg="an off feature has nothing to warn about")
		self.assertIsNone(result["message"])

	def test_picker_is_unfiltered_when_the_toggle_is_off(self):
		"""An inert field must not look broken — it lists every Job Offer template."""
		dua = self._dua([("custom_employment_type", self.employment_types[0])])
		restricted = self._template("User Assignment", assignments=[dua.name])

		self._set_toggle(0)
		with self._only_mine():
			rows = offer_document_template_query(
				"Document Template",
				"",
				"name",
				0,
				100,
				{"custom_employment_type": self.employment_types[1]},
			)
		self.assertIn(restricted.name, [r[0] for r in rows])

	def test_template_tab_names_the_print_format_path(self):
		from recruitment.job_offer_utils import get_offer_template_raw_html

		self._set_toggle(0)
		result = get_offer_template_raw_html(job_offer=None)
		self.assertIs(result.get("enabled"), False)
		self.assertIn("Print Format", result["html"])
