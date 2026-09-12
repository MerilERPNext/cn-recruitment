# Copyright (c) 2026, hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from recruitment.api.employee_search import (
	DEFAULT_MIN_QUERY_LENGTH,
	NO_LIMIT,
	DEFAULT_SEARCH_FIELDS,
	InvalidSearchField,
	clear_cache,
	resolve_field,
)


class EmployeeSearchSettings(Document):
	def validate(self):
		self.validate_limits()
		self.validate_search_fields()

	def validate_limits(self):
		if cint(self.min_query_length) < 1:
			self.min_query_length = DEFAULT_MIN_QUERY_LENGTH

		# 0 is meaningful here - it means no limit - so only nonsense is corrected.
		if cint(self.result_limit) < 0:
			self.result_limit = NO_LIMIT

	def validate_search_fields(self):
		if not self.search_fields:
			return

		seen = set()
		for row in self.search_fields:
			if row.field_name in seen:
				frappe.throw(
					_("Row #{0}: {1} is already in the list").format(row.idx, row.field_name),
					title=_("Duplicate Search Field"),
				)
			seen.add(row.field_name)

			try:
				# The search API resolves rows the same way, so anything it would
				# silently skip is rejected here instead - while someone is looking.
				resolved = resolve_field(row.as_dict())
			except InvalidSearchField as e:
				frappe.throw(
					_("Row #{0}: {1}").format(row.idx, str(e)), title=_("Invalid Search Field")
				)

			row.field_label = resolved["field_label"]
			row.field_type = resolved["field_type"]
			row.link_doctype = resolved["link_doctype"]
			row.link_field = resolved["link_field"]

		if not any(cint(row.searchable) for row in self.search_fields):
			frappe.throw(
				_("At least one field must be marked Searchable, otherwise employee search returns nothing."),
				title=_("No Searchable Field"),
			)

	def on_update(self):
		clear_cache()


@frappe.whitelist()
def get_default_search_fields():
	"""Rows equivalent to the built-in defaults, for the Load Default Fields button."""
	if not frappe.has_permission("Employee Search Settings", "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	rows = []
	for row in DEFAULT_SEARCH_FIELDS:
		try:
			rows.append(resolve_field(dict(row, searchable=1, show_in_result=0)))
		except InvalidSearchField:
			# e.g. a site without the Branch doctype - just leave that default out
			continue

	return rows
