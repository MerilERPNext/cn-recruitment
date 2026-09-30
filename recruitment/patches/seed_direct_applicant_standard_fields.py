"""Direct Applicant Onboarding: list the configurable "Add Direct Applicant"
fields in Recruitment Settings -> "Add Direct Applicant — Standard Fields", each
with its current behaviour (shown, and mandatory where it was), so HR can see and
change them. Only seeds an EMPTY table. Rows are inserted directly rather than
saving Recruitment Settings, whose on_update re-runs the AOP budget refresh.
Idempotent.

Dry run:
    bench --site <site> execute \
        recruitment.patches.seed_direct_applicant_standard_fields.execute --kwargs "{'dry_run': 1}"
"""

import frappe

from recruitment.api.direct_applicant import CONFIGURABLE_FIELDS, SETTINGS, STANDARD_FIELDS_TABLE

CHILD = "Direct Applicant Standard Field"


def execute(dry_run=False):
	if not frappe.db.table_exists(CHILD):
		return
	if frappe.db.exists(CHILD, {"parent": SETTINGS, "parentfield": STANDARD_FIELDS_TABLE}):
		print("Standard fields already listed — nothing to seed.")
		return
	for idx, (key, (label, show, reqd)) in enumerate(CONFIGURABLE_FIELDS.items(), 1):
		if dry_run:
			print(f"Would add {label}: show={show} mandatory={reqd}")
			continue
		frappe.get_doc({
			"doctype": CHILD, "parent": SETTINGS, "parenttype": SETTINGS,
			"parentfield": STANDARD_FIELDS_TABLE, "idx": idx,
			"field_key": key, "label": label, "show": show, "mandatory": reqd,
		}).db_insert()
	if not dry_run:
		frappe.clear_document_cache(SETTINGS, SETTINGS)
