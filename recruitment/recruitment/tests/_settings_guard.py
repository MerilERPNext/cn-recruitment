"""Put Recruitment Settings back exactly as a test class found it.

Tests change site-wide switches (feature on, Document Template offers off, ...)
and rely on the per-test rollback to undo them. Anything in the code under test
that commits mid-test would make those changes permanent on the site — which is
how a real site once ended up with ``send_offer_via_document_template`` off. So
the classes snapshot what they touch in ``setUpClass`` and restore it, with a
commit, in ``tearDownClass``, whatever happened in between.
"""

import frappe

SETTINGS = "Recruitment Settings"
FIELDS = (
	"enable_direct_applicant_onboarding",
	"da_form_link_expiry_days",
	"da_proposal_link_expiry_days",
	"da_max_negotiation_rounds",
	"send_offer_via_document_template",
	"enable_hr_ops_offer_verification",
)
TABLES = ("da_standard_fields", "da_creation_fields")


def snapshot():
	values = {
		row[0]: row[1]
		for row in frappe.db.sql(
			"select field, value from tabSingles where doctype=%s and field in %s", (SETTINGS, FIELDS)
		)
	}
	tables = {
		table: frappe.db.sql(
			"select * from `tab{0}` where parent=%s and parentfield=%s".format(_child(table)),
			(SETTINGS, table),
			as_dict=True,
		)
		for table in TABLES
		if _child(table)
	}
	return values, tables


def restore(state):
	values, tables = state
	frappe.db.rollback()
	for field in FIELDS:
		frappe.db.sql("delete from tabSingles where doctype=%s and field=%s", (SETTINGS, field))
		if field in values:
			frappe.db.sql(
				"insert into tabSingles (doctype, field, value) values (%s, %s, %s)", (SETTINGS, field, values[field])
			)
	for table, rows in tables.items():
		child = _child(table)
		frappe.db.sql("delete from `tab{0}` where parent=%s and parentfield=%s".format(child), (SETTINGS, table))
		for row in rows:
			columns = ", ".join(f"`{c}`" for c in row)
			frappe.db.sql(
				"insert into `tab{0}` ({1}) values ({2})".format(child, columns, ", ".join(["%s"] * len(row))),
				tuple(row.values()),
			)
	frappe.db.commit()
	frappe.clear_document_cache(SETTINGS, SETTINGS)
	frappe.db.value_cache.pop(SETTINGS, None)


def _child(table):
	df = frappe.get_meta(SETTINGS).get_field(table)
	return df.options if df else None
