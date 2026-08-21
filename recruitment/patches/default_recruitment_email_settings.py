"""Turn on the settings the recruitment mailers read, where a site has no answer.

Two settings gate mail that is meant to be on out of the box:

  Recruitment Settings -> Send External Recruiter Assignment Email
  Campus Settings      -> Candidate Registration Email Template

Neither can simply be left to its field default. ``get_single_value`` casts a
Single's field through its fieldtype, so a Check whose row was never written comes
back as 0 — indistinguishable from someone deliberately unticking it (which is why
the mailers read through ``recruitment.recruitment.settings_helpers``). And
submitting a Candidate Registration *throws* when the template field is blank, so
a site that never set it cannot register candidates at all.

Only fills a blank. Anything already answered — including switched deliberately
off — is left exactly as it is.

The templates themselves are HomeFirst's wording and are installed separately, by
``homefirst_customs.patches.seed_recruitment_email_templates``.
"""

import frappe

from recruitment.recruitment.external_recruiter_mailers import (
	ASSIGNMENT_TEMPLATE,
	ENABLED_FIELD,
)

CANDIDATE_TEMPLATE = "Candidate Registration Email"
CANDIDATE_SETTINGS_FIELD = "candidate_registration_email_template"


def _has_stored_value(doctype, fieldname):
	"""Whether the Single carries a row for this field at all — the only honest
	signal of "no answer", since get_single_value casts an absent row to a value."""
	return bool(frappe.db.sql(
		"select `value` from `tabSingles` where `doctype` = %s and `field` = %s limit 1",
		(doctype, fieldname),
	))


def execute():
	if not _has_stored_value("Recruitment Settings", ENABLED_FIELD):
		frappe.db.set_single_value("Recruitment Settings", ENABLED_FIELD, 1)

	if not frappe.db.get_single_value("Campus Settings", CANDIDATE_SETTINGS_FIELD):
		frappe.db.set_single_value(
			"Campus Settings", CANDIDATE_SETTINGS_FIELD, CANDIDATE_TEMPLATE
		)

	# Named only so the link field has something valid to point at; the template is
	# created by the homefirst_customs patch.
	_ = ASSIGNMENT_TEMPLATE

	frappe.db.commit()
