# Copyright (c) 2026, Prathamesh Jadhav and Contributors
# See license.txt

"""Regression tests for the metadata-enumeration hardening on
``get_doctype_with_custom_fields`` (VAPT: Unauthorized Metadata Enumeration).

The endpoint must only ever expose field metadata for the allowlisted HR
request forms. Any other ``doctype_name`` -- whether it exists or not -- must
raise ``PermissionError`` and disclose nothing about the data model.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api.doctype_meta_api import (
	ALLOWED_META_DOCTYPES,
	get_doctype_with_custom_fields,
)


class TestDoctypeMetaAPI(FrappeTestCase):
	def test_allowlisted_doctype_returns_fields(self):
		"""A legitimate, allowlisted doctype returns its field metadata."""
		result = get_doctype_with_custom_fields("Leave Application")
		self.assertEqual(result["doctype"], "Leave Application")
		self.assertIsInstance(result["fields"], list)
		self.assertTrue(result["fields"], "expected non-empty field metadata")

	def test_non_allowlisted_existing_doctype_is_blocked(self):
		"""An existing but out-of-scope doctype (e.g. User) must be rejected."""
		self.assertNotIn("User", ALLOWED_META_DOCTYPES)
		with self.assertRaises(frappe.PermissionError):
			get_doctype_with_custom_fields("User")

	def test_sensitive_doctypes_are_blocked(self):
		"""Probing high-value internal doctypes must not leak metadata."""
		for dt in ("DocType", "Custom Field", "System Settings", "Salary Slip"):
			with self.assertRaises(frappe.PermissionError):
				get_doctype_with_custom_fields(dt)

	def test_nonexistent_doctype_is_indistinguishable(self):
		"""A bogus doctype must raise the SAME error as a blocked real one --
		no oracle for whether a doctype exists."""
		with self.assertRaises(frappe.PermissionError):
			get_doctype_with_custom_fields("Totally Made Up Doctype 12345")

	def test_empty_doctype_name_raises(self):
		with self.assertRaises(frappe.ValidationError):
			get_doctype_with_custom_fields("")
