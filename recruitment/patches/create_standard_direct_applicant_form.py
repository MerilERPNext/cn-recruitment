"""Direct Applicant Onboarding: create the "Standard Direct Applicant Form" and
make it the Default Form — the one offered when no other form applies to an
applicant's company and category, so HR can always send a form.

Each field is added only if this site's Job Applicant Profile Settings offers
it (see direct_applicant_fields.catalog); a table's columns likewise. HR can
change the form freely afterwards in its builder.

Skipped when a default form already exists or the form name is taken, so a
site's own set-up is never overwritten. Idempotent.

Dry run:
    bench --site <site> execute \
        recruitment.patches.create_standard_direct_applicant_form.execute --kwargs "{'dry_run': 1}"
"""

import frappe

FORM = "Direct Applicant Form"
NAME = "Standard Direct Applicant Form"
INSTRUCTIONS = (
	"Please fill in your details and upload the documents asked for. "
	"Fields marked * are mandatory. Keep your PAN and Aadhaar card handy."
)

# (section, fieldname, mandatory, [table columns], [mandatory table columns])
LAYOUT = [
	("Personal Details", "custom_gender", 1, None, None),
	("Personal Details", "custom_marital_status", 0, None, None),
	("Personal Details", "custom_linkedin_url", 0, None, None),
	("Identity Documents", "custom_pan_number", 1, None, None),
	("Identity Documents", "custom_da_aadhaar_masked", 1, None, None),
	("Identity Documents", "custom_da_aadhaar_card", 1, None, None),
	("Address", "custom_current_address", 1, None, None),
	("Address", "custom_permanent_address", 1, None, None),
	("Professional Details", "custom_current_company_name", 0, None, None),
	("Professional Details", "custom_current_designation", 0, None, None),
	("Professional Details", "custom_total_experience", 1, None, None),
	("Professional Details", "custom_current_ctc", 1, None, None),
	("Professional Details", "custom_expected_ctc", 1, None, None),
	("Professional Details", "custom_previous_work_experience", 0,
	 ["company_name", "designation", "custom_from_datee", "custom_to_datee", "salary", "custom_experience_letter"],
	 ["company_name", "designation"]),
	("Education", "custom_educational_qualification", 1,
	 ["qualification", "school_univ", "custom_course_name", "year_of_passing", "class_per"],
	 ["qualification", "school_univ"]),
	("Documents", "resume_attachment", 1, None, None),
]


def execute(dry_run=False):
	if not frappe.db.table_exists(FORM) or not frappe.get_meta(FORM).has_field("is_default"):
		return
	if frappe.db.exists(FORM, {"is_default": 1}) or frappe.db.exists(FORM, NAME):
		print("A default Direct Applicant Form already exists — nothing to create.")
		return

	# Patches run before the app's custom/*.json is synced on a fresh or
	# un-migrated site: sync it now, or the custom_da_* fields (Aadhaar) are not
	# in the catalog yet and the form would be created without them for good.
	from frappe.modules.utils import sync_customizations

	sync_customizations("recruitment")
	frappe.clear_cache(doctype="Job Applicant")

	from recruitment.api.direct_applicant_fields import _child_columns, catalog

	available = catalog()
	rows = []
	for section, fieldname, mandatory, columns, required in LAYOUT:
		if fieldname not in available:
			continue
		row = {"fieldname": fieldname, "section": section, "mandatory": mandatory}
		if columns:
			usable = {c["fieldname"] for c in _child_columns(fieldname)}
			row["child_fields"] = ", ".join(c for c in columns if c in usable)
			row["mandatory_child_fields"] = ", ".join(c for c in required if c in usable)
		rows.append(row)

	if dry_run:
		print(f"Would create {NAME} with: {[r['fieldname'] for r in rows]}")
		return
	if not rows:
		print("None of the standard fields are offered on this site — nothing to create.")
		return
	doc = frappe.get_doc({
		"doctype": FORM,
		"form_name": NAME,
		"is_default": 1,
		"instructions": INSTRUCTIONS,
		"fields": rows,
	}).insert(ignore_permissions=True)
	# Frappe fills a Company link with the session's default company on insert;
	# the standard form is for every company.
	if doc.company:
		doc.db_set("company", None)
