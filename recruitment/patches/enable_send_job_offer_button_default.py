"""Turn on the new 'Send Job Offer' form button on sites that already exist.

A Check field's ``default`` only applies when a document is created. Recruitment
Settings is a Single whose record predates this field, so every existing site
reads the flag as unset and the button would stay hidden despite shipping as
default-on.

Only fills a genuinely absent value. A Single keeps its values as rows in
``tabSingles``, so "no row" means nobody has chosen yet — a site that has already
switched the button off keeps that choice on the next migrate.
"""

import frappe

DOCTYPE = "Recruitment Settings"
FIELD = "enable_send_job_offer_button"


def execute():
	# meta, not has_column: a Single has no table of its own, so has_column blows up.
	if not frappe.get_meta(DOCTYPE).get_field(FIELD):
		return

	chosen = frappe.db.sql(
		"select value from tabSingles where doctype = %s and field = %s", (DOCTYPE, FIELD)
	)
	if chosen:
		return

	frappe.db.set_single_value(DOCTYPE, FIELD, 1)
	frappe.clear_document_cache(DOCTYPE, DOCTYPE)
	print(f"{DOCTYPE}.{FIELD} defaulted to 1")
