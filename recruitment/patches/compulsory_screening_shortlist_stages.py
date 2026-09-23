"""Turn on the Recruitment Settings rule that makes Screening and Shortlist
compulsory stages in every hiring flow. A new Check on a Single doesn't pick up
its default on migrate, so it is set here."""

import frappe


def execute():
	for field in ("mandatory_screening_stage", "mandatory_shortlist_stage"):
		# Only when never saved, so a value set by hand is kept.
		if not frappe.db.sql(
			"select 1 from `tabSingles` where doctype = 'Recruitment Settings' and field = %s", field
		):
			frappe.db.set_single_value("Recruitment Settings", field, 1)
