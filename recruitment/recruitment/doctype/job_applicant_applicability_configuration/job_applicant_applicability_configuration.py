# Copyright (c) 2026, ChatNext and contributors
# For license information, please see license.txt

"""Fields that may NOT carry an Applicable To rule (always shown on every opening).

Opt-out on purpose: a new field is filterable without registering it anywhere.
Listing a field keeps any rule it already has but stops enforcing it, so removing
it from the list restores the previous scope.
"""

import frappe
from frappe import _
from frappe.model.document import Document

APPLICANT_DOCTYPE = "Job Applicant"
CONFIG_DOCTYPE = "Job Applicant Applicability Configuration"

# Cleared on save rather than expired: this is read on every channel form load.
_CACHE_KEY = "job_applicant_applicability:excluded"


class JobApplicantApplicabilityConfiguration(Document):
	def validate(self):
		self._normalise_rows()

	def on_update(self):
		clear_excluded_cache()

	def _normalise_rows(self):
		"""Drop blanks and duplicates and label rows from live meta. A field no longer
		on Job Applicant is kept (it may be mid-rebuild) but labelled as missing."""
		labels = {
			df.fieldname: (df.label or df.fieldname)
			for df in frappe.get_meta(APPLICANT_DOCTYPE).fields
			if df.fieldname
		}

		seen, kept = set(), []
		for row in self.excluded_fields or []:
			ref = (row.reference_name or "").strip()
			if not ref or ref in seen:
				continue
			seen.add(ref)
			row.reference_name = ref
			row.display_name = labels.get(ref) or _("(field no longer on {0})").format(APPLICANT_DOCTYPE)
			kept.append(row)

		if len(kept) != len(self.excluded_fields or []):
			self.set("excluded_fields", kept)
			for i, row in enumerate(self.excluded_fields, start=1):
				row.idx = i


def clear_excluded_cache():
	frappe.cache().delete_value(_CACHE_KEY)


def excluded_field_refs():
	"""``set`` of excluded Job Applicant fieldnames (cached)."""
	cached = frappe.cache().get_value(_CACHE_KEY)
	if cached is not None:
		return set(cached)

	refs = {
		ref
		for ref in frappe.get_all(
			"Job Applicant Applicability Excluded Field",
			filters={"parent": CONFIG_DOCTYPE, "parenttype": CONFIG_DOCTYPE, "parentfield": "excluded_fields"},
			pluck="reference_name",
		)
		if ref
	}
	frappe.cache().set_value(_CACHE_KEY, sorted(refs))
	return refs


@frappe.whitelist()
def get_applicant_field_options():
	"""``[{value, label}]`` for the Field autocomplete — the same fields the settings grid lists."""
	from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
		iter_profile_fields,
	)

	if not frappe.has_permission(CONFIG_DOCTYPE, "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	return [
		{"value": df.fieldname, "label": f"{df.label or df.fieldname} ({df.fieldname})"}
		for df, _section, _tab in iter_profile_fields(frappe.get_meta(APPLICANT_DOCTYPE))
	]
