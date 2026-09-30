"""Direct Applicant Onboarding: start the "Add Direct Applicant — Extra Fields"
table with Resume Attachment (optional), so HR can attach the resume while adding
a candidate. HR can tick it Mandatory, remove it, or add other fields.

Only seeds an EMPTY table — a site that has configured its own rows is left alone.
The row is inserted directly rather than saving Recruitment Settings, whose
on_update re-runs the AOP budget refresh. Idempotent.

Dry run (changes nothing, prints what would change):
    bench --site <site> execute \
        recruitment.patches.seed_direct_applicant_resume_field.execute --kwargs "{'dry_run': 1}"
"""

import frappe

SETTINGS = "Recruitment Settings"
TABLE = "da_creation_fields"
CHILD = "Direct Applicant Creation Field"
RESUME = "resume_attachment"


def execute(dry_run=False):
	if not frappe.db.table_exists(CHILD):
		return
	if frappe.db.exists(CHILD, {"parent": SETTINGS, "parentfield": TABLE}):
		print("Extra fields already configured — nothing to seed.")
		return
	df = frappe.get_meta("Job Applicant").get_field(RESUME)
	if not df:
		print(f"Job Applicant has no {RESUME} field — nothing to seed.")
		return
	if dry_run:
		print(f"Would add {RESUME} ({df.label}) as an optional extra field.")
		return
	frappe.get_doc({
		"doctype": CHILD,
		"parent": SETTINGS,
		"parenttype": SETTINGS,
		"parentfield": TABLE,
		"idx": 1,
		"fieldname": RESUME,
		"label": df.label,
		"fieldtype": df.fieldtype,
		"mandatory": 0,
	}).db_insert()
	frappe.clear_document_cache(SETTINGS, SETTINGS)
