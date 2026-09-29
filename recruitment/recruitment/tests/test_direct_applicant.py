"""Tests for Direct Applicant Onboarding — Phase 1 (adding a candidate directly).

What these pin down:

  * with the feature OFF nothing can be created, and a normal applicant is
    untouched by any of it;
  * a direct applicant is created with no Job Opening, keeps the position
    details HR entered, and is marked direct + Lateral;
  * a Referral needs "Referred By"; other categories drop it;
  * the Duplicity Check skips missing match keys for a direct applicant only,
    and enforces them again once the full check is asked for;
  * Aadhaar is only ever stored masked, and a bad number is rejected.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_direct_applicant.run
"""

from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment.tests import _settings_guard

from recruitment.api import direct_applicant as da
from recruitment.customizations.ta_duplicity_check import (
	match_fields,
	validate_match_keys_present,
)

EMAIL_DOMAIN = "@example.com"
PREFIX = "datest"


def _valid_aadhaar(stem="23456789012"):
	"""A 12-digit number passing the Verhoeff check (the 12th digit is found)."""
	for digit in "0123456789":
		if da.is_valid_aadhaar(stem + digit):
			return stem + digit
	raise AssertionError("no Verhoeff digit found")


class TestDirectApplicant(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._settings_state = _settings_guard.snapshot()
		# A consistent Company -> Department -> Designation chain from site data.
		desig = frappe.db.sql(
			"""select d.name, d.custom_department, dep.company from `tabDesignation` d
			join `tabDepartment` dep on dep.name = d.custom_department and dep.company = d.custom_company
			where d.custom_status = 'Active' and dep.disabled = 0 limit 1""",
			as_dict=True,
		)[0]
		cls.company, cls.department, cls.designation = desig.company, desig.custom_department, desig.name
		cls.other_designation = frappe.db.get_value(
			"Designation",
			{"custom_department": ["not in", [cls.department]], "custom_status": "Active"},
			"name",
		)
		cls.other_company = frappe.db.get_value("Company", {"name": ["!=", cls.company]}, "name")
		cls.division = frappe.db.get_value(
			"Department", {"company": cls.company, "is_group": 1, "disabled": 0}, "name"
		)
		cls.employment_type = frappe.db.get_value("Employment Type", {}, "name")
		cls.employee = frappe.db.get_value("Employee", {"status": "Active"}, "name")
		cls.duplicity_settings = frappe.get_doc(
			"TA Duplicity Check Settings", frappe.get_all("TA Duplicity Check Settings", pluck="name")[0]
		)
		cls._seq = 0

	@classmethod
	def tearDownClass(cls):
		_settings_guard.restore(cls._settings_state)
		super().tearDownClass()

	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 1)

	def tearDown(self):
		frappe.db.rollback()

	def _payload(self, **overrides):
		type(self)._seq += 1
		data = {
			"first_name": "Direct",
			"last_name": f"Tester{self._seq}",
			"email_id": f"{PREFIX}{self._seq}{frappe.generate_hash(length=6)}{EMAIL_DOMAIN}",
			"phone_number": f"98765{self._seq:05d}",
			"company": self.company,
			"designation": self.designation,
			"department": self.department,
			"employment_type": self.employment_type,
			"category": "Experienced",
		}
		data.update(overrides)
		return data

	# ------------------------------------------------------------ feature gate --
	def test_disabled_blocks_creation(self):
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 0)
		self.assertFalse(da.get_config()["enabled"])
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload())

	# ---------------------------------------------------------------- creation --
	def test_creates_applicant_without_opening(self):
		name = da.create_direct_applicant(self._payload())["name"]
		doc = frappe.get_doc("Job Applicant", name)
		self.assertFalse(doc.job_title)
		self.assertEqual(doc.custom_da_is_direct, 1)
		self.assertEqual(doc.custom_da_category, "Experienced")
		self.assertEqual(doc.custom_applicant_type, "Lateral")
		# What an opening would have fetched stays as HR entered it.
		self.assertEqual(doc.designation, self.designation)
		self.assertEqual(doc.custom_department, self.department)
		self.assertEqual(doc.custom_employment_type, self.employment_type)
		self.assertEqual(doc.custom_company_finalized, self.company)
		self.assertEqual(doc.custom_full_name, f"Direct Tester{self._seq}")

	def test_missing_required_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(designation=""))

	def test_unknown_category_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(category="Campus"))

	def test_referral_needs_referred_by(self):
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(category="Referral"))
		if self.employee:
			name = da.create_direct_applicant(
				self._payload(category="Referral", referred_by=self.employee)
			)["name"]
			self.assertEqual(frappe.db.get_value("Job Applicant", name, "custom_referred_by"), self.employee)

	def test_referred_by_dropped_for_other_categories(self):
		if not self.employee:
			self.skipTest("no active Employee")
		name = da.create_direct_applicant(self._payload(referred_by=self.employee))["name"]
		self.assertFalse(frappe.db.get_value("Job Applicant", name, "custom_referred_by"))

	# ---------------------------------------------------------- standard fields --
	def _set_standard(self, **rules):
		"""rules: key=(show, mandatory)."""
		settings = frappe.get_doc("Recruitment Settings")
		for row in settings.get(da.STANDARD_FIELDS_TABLE):
			if row.field_key in rules:
				row.show, row.mandatory = rules[row.field_key]
		settings.save()

	def test_standard_fields_seeded_with_current_behaviour(self):
		config = da.get_standard_field_config()
		self.assertEqual(set(config), set(da.CONFIGURABLE_FIELDS))
		for key, (_label, show, reqd) in da.CONFIGURABLE_FIELDS.items():
			self.assertEqual((config[key]["show"], config[key]["reqd"]), (show, reqd), key)

	def test_settings_keep_one_row_per_field_and_no_hidden_mandatory(self):
		settings = frappe.get_doc("Recruitment Settings")
		settings.set(da.STANDARD_FIELDS_TABLE, [])
		settings.append(da.STANDARD_FIELDS_TABLE, {"field_key": "phone_number", "show": 0, "mandatory": 1})
		settings.append(da.STANDARD_FIELDS_TABLE, {"field_key": "email_id", "show": 0})  # locked: dropped
		settings.save()
		rows = {r.field_key: r for r in frappe.get_doc("Recruitment Settings").get(da.STANDARD_FIELDS_TABLE)}
		self.assertEqual(set(rows), set(da.CONFIGURABLE_FIELDS))
		self.assertEqual((rows["phone_number"].show, rows["phone_number"].mandatory), (0, 0))

	def test_hidden_fields_are_not_required_and_ignored(self):
		self._set_standard(phone_number=(0, 0), category=(0, 0), employment_type=(0, 0), last_name=(0, 0))
		self.assertEqual(da.get_config()["standard_fields"]["phone_number"], {"show": 0, "reqd": 0})
		name = da.create_direct_applicant(self._payload(
			phone_number="", category="", employment_type="", last_name="", referred_by=self.employee or "",
		))["name"]
		doc = frappe.get_doc("Job Applicant", name)
		self.assertFalse(doc.phone_number)
		self.assertFalse(doc.custom_da_category)
		self.assertFalse(doc.custom_referred_by)
		# A value sent for a hidden field is dropped, not saved.
		name = da.create_direct_applicant(self._payload(phone_number="9999999999", category="Referral"))["name"]
		self.assertFalse(frappe.db.get_value("Job Applicant", name, "phone_number"))
		self.assertFalse(frappe.db.get_value("Job Applicant", name, "custom_da_category"))

	def test_optional_field_can_be_made_mandatory(self):
		self._set_standard(middle_name=(1, 1))
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload())
		da.create_direct_applicant(self._payload(middle_name="K"))

	def test_locked_fields_stay_mandatory(self):
		self._set_standard(**{k: (0, 0) for k in da.CONFIGURABLE_FIELDS})
		for key in da.LOCKED_FIELDS:
			with self.assertRaises(frappe.ValidationError):
				da.create_direct_applicant(self._payload(**{key: ""}))

	def test_without_department_designation_must_match_company(self):
		self._set_standard(department=(0, 0))
		config = da.get_standard_field_config()
		self.assertEqual(config["division"]["show"], 0)  # division follows department
		name = da.create_direct_applicant(self._payload(department="", division=""))["name"]
		self.assertFalse(frappe.db.get_value("Job Applicant", name, "custom_department"))
		other = frappe.db.get_value(
			"Designation", {"custom_company": ["not in", [self.company]], "custom_status": "Active"}, "name"
		)
		if other:
			with self.assertRaises(frappe.ValidationError):
				da.create_direct_applicant(self._payload(department="", designation=other))

	# --------------------------------------------------------------- hierarchy --
	def test_department_must_belong_to_company(self):
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(company=self.other_company))

	def test_designation_must_belong_to_department(self):
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(designation=self.other_designation))

	def test_division_must_be_a_group_of_the_company(self):
		# The department itself is not a group, so it cannot act as a division.
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(division=self.department))

	def test_department_must_sit_under_division(self):
		outside = frappe.get_all(
			"Department",
			filters={"company": self.company, "is_group": 1, "disabled": 0,
			         "name": ["not in", frappe.get_all("Department", filters={"name": ["ancestors of", self.department]}, pluck="name")]},
			pluck="name", limit=1,
		)
		if not outside:
			self.skipTest("no division outside the department's own branch")
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload(division=outside[0]))

	def test_division_picker_offers_only_divisions_with_active_departments(self):
		offered = [r[0] for r in da.division_query("Department", "", "name", 0, 500, {"company": self.company})]
		for name in offered:
			self.assertEqual(frappe.db.get_value("Department", name, "company"), self.company)
			self.assertTrue(frappe.get_all(
				"Department", filters={"name": ["descendants of", name], "disabled": 0}, limit=1,
			))

	def test_division_above_department_is_accepted(self):
		ancestors = frappe.get_all(
			"Department",
			filters={"name": ["ancestors of", self.department], "company": self.company, "is_group": 1},
			pluck="name",
		)
		if not ancestors:
			self.skipTest("department has no division of its company above it")
		name = da.create_direct_applicant(self._payload(division=ancestors[0]))["name"]
		self.assertEqual(frappe.db.get_value("Job Applicant", name, "custom_division_finalized"), ancestors[0])

	# ------------------------------------------------------ onboarding prefill --
	def test_onboarding_gets_the_applicants_phone_and_email(self):
		from recruitment.api.candidate_portal import _auto_map_offer_applicant_fields

		payload = self._payload()
		applicant = frappe.get_doc("Job Applicant", da.create_direct_applicant(payload)["name"])
		onboarding = frappe.new_doc("Employee Onboarding")
		_auto_map_offer_applicant_fields(onboarding, applicant)
		meta = frappe.get_meta("Employee Onboarding")
		for fieldname, expected in (
			("custom_primary_contact_number", payload["phone_number"]),
			("custom_email", payload["email_id"]),
		):
			if meta.has_field(fieldname):
				self.assertEqual(onboarding.get(fieldname), expected, fieldname)

	# ---------------------------------------------------------- duplicity check --
	def _applicant(self, direct):
		doc = frappe.new_doc("Job Applicant")
		doc.update({"applicant_name": "Dup", "email_id": f"{PREFIX}dup{EMAIL_DOMAIN}", "custom_da_is_direct": direct})
		return doc

	def test_normal_applicant_still_needs_every_match_key(self):
		if not match_fields(self.duplicity_settings):
			self.skipTest("duplicity settings carry no match keys")
		with self.assertRaises(frappe.ValidationError):
			validate_match_keys_present(self._applicant(direct=0), self.duplicity_settings)

	def test_direct_applicant_defers_missing_keys(self):
		validate_match_keys_present(self._applicant(direct=1), self.duplicity_settings)

	def test_full_check_enforces_keys_on_direct_applicant(self):
		if not match_fields(self.duplicity_settings):
			self.skipTest("duplicity settings carry no match keys")
		doc = self._applicant(direct=1)
		doc.flags[da.FULL_DUPLICITY_FLAG] = True
		with self.assertRaises(frappe.ValidationError):
			validate_match_keys_present(doc, self.duplicity_settings)

	# ------------------------------------------------------------- extra fields --
	def _set_extra_fields(self, rows):
		settings = frappe.get_doc("Recruitment Settings")
		settings.set(da.EXTRA_FIELDS_TABLE, [])
		for fieldname, mandatory in rows:
			settings.append(da.EXTRA_FIELDS_TABLE, {"fieldname": fieldname, "mandatory": mandatory})
		settings.save()

	def test_resume_seeded_as_optional_extra_field(self):
		fields = {f["fieldname"]: f for f in da.get_extra_fields()}
		self.assertIn("resume_attachment", fields)
		self.assertEqual(fields["resume_attachment"]["reqd"], 0)
		self.assertIn("resume_attachment", [f["fieldname"] for f in da.get_config()["extra_fields"]])

	def test_picker_offers_only_usable_fields(self):
		offered = {o["value"] for o in da.get_creation_field_options()}
		self.assertIn("resume_attachment", offered)
		# Already in the dialog / set by the system / not askable in a dialog.
		for fieldname in ("email_id", "job_title", "status", da.DIRECT_FLAG, "custom_stage_history"):
			self.assertNotIn(fieldname, offered)

	def test_settings_reject_unusable_extra_field(self):
		for fieldname in ("email_id", "status", "no_such_field", "custom_stage_history"):
			with self.assertRaises(frappe.ValidationError):
				self._set_extra_fields([(fieldname, 0)])
		with self.assertRaises(frappe.ValidationError):
			self._set_extra_fields([("resume_attachment", 0), ("resume_attachment", 1)])

	def test_mandatory_extra_field_is_enforced(self):
		self._set_extra_fields([("resume_link", 1), ("custom_current_ctc", 0)])
		with self.assertRaises(frappe.ValidationError):
			da.create_direct_applicant(self._payload())
		name = da.create_direct_applicant(
			self._payload(resume_link="https://example.com/cv.pdf", custom_current_ctc="12 LPA")
		)["name"]
		self.assertEqual(frappe.db.get_value("Job Applicant", name, "resume_link"), "https://example.com/cv.pdf")
		self.assertEqual(frappe.db.get_value("Job Applicant", name, "custom_current_ctc"), "12 LPA")

	def test_unconfigured_field_in_payload_is_ignored(self):
		self._set_extra_fields([])
		name = da.create_direct_applicant(self._payload(custom_current_ctc="99 LPA", status="Rejected"))["name"]
		self.assertFalse(frappe.db.get_value("Job Applicant", name, "custom_current_ctc"))
		self.assertNotEqual(frappe.db.get_value("Job Applicant", name, "status"), "Rejected")

	def test_resume_upload_is_attached_to_applicant(self):
		self._set_extra_fields([("resume_attachment", 1)])
		file = frappe.get_doc({
			"doctype": "File", "file_name": f"{PREFIX}_cv.txt", "content": b"resume", "is_private": 1,
		}).insert()
		name = da.create_direct_applicant(self._payload(resume_attachment=file.file_url))["name"]
		self.assertEqual(frappe.db.get_value("Job Applicant", name, "resume_attachment"), file.file_url)
		file.reload()
		self.assertEqual((file.attached_to_doctype, file.attached_to_name), ("Job Applicant", name))

	# ------------------------------------------------------------------ aadhaar --
	def test_aadhaar_is_masked(self):
		number = _valid_aadhaar()
		doc = frappe._dict({da.AADHAAR_FIELD: f"{number[:4]} {number[4:8]} {number[8:]}"})
		doc.set = doc.__setitem__
		da.normalize_aadhaar(doc)
		self.assertEqual(doc[da.AADHAAR_FIELD], f"XXXX-XXXX-{number[-4:]}")

	def test_masked_aadhaar_is_kept(self):
		doc = frappe._dict({da.AADHAAR_FIELD: "xxxx-xxxx-1234"})
		doc.set = doc.__setitem__
		da.normalize_aadhaar(doc)
		self.assertEqual(doc[da.AADHAAR_FIELD], "XXXX-XXXX-1234")

	def test_masked_aadhaar_with_spaces_is_kept(self):
		doc = frappe._dict({da.AADHAAR_FIELD: "xxxx xxxx 1234"})
		doc.set = doc.__setitem__
		da.normalize_aadhaar(doc)
		self.assertEqual(doc[da.AADHAAR_FIELD], "XXXX-XXXX-1234")

	def test_division_without_department_is_allowed(self):
		if not self.division:
			self.skipTest("no division")
		self._set_standard(department=(1, 0))
		name = da.create_direct_applicant(self._payload(department="", division=self.division))["name"]
		self.assertEqual(frappe.db.get_value("Job Applicant", name, "custom_division_finalized"), self.division)

	def test_unusable_saved_extra_field_is_dropped_not_blocking(self):
		self._set_extra_fields([("resume_link", 0)])
		# The field later becomes unusable (here: made read-only on the doctype).
		with patch("recruitment.api.direct_applicant.extra_field_problem", side_effect=lambda df: "is read-only"):
			settings = frappe.get_doc("Recruitment Settings")
			settings.save()  # must not throw
		self.assertFalse(frappe.get_doc("Recruitment Settings").get(da.EXTRA_FIELDS_TABLE))

	def test_bad_aadhaar_is_rejected(self):
		number = _valid_aadhaar()
		bad = number[:-1] + str((int(number[-1]) + 1) % 10)
		for value in (bad, "12345", "012345678901"):
			doc = frappe._dict({da.AADHAAR_FIELD: value})
			doc.set = doc.__setitem__
			with self.assertRaises(frappe.ValidationError):
				da.normalize_aadhaar(doc)

	def test_aadhaar_masked_on_save(self):
		number = _valid_aadhaar()
		name = da.create_direct_applicant(self._payload())["name"]
		doc = frappe.get_doc("Job Applicant", name)
		doc.set(da.AADHAAR_FIELD, number)
		doc.save()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", name, da.AADHAAR_FIELD), f"XXXX-XXXX-{number[-4:]}"
		)


def run():
	import unittest

	unittest.main(module=__name__, argv=["run"], exit=False, verbosity=2)
