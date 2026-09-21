"""Put every source-mandatory applicant field on the existing New Hire Forms.

Forms saved before the sync existed never ran it; from here on it runs on every
Job Applicant Profile Settings and New Hire Form save. Idempotent.
"""

import frappe


def execute():
	if not frappe.db.table_exists("New Hire Form"):
		return
	frappe.clear_cache(doctype="New Hire Form Field")

	from recruitment.recruitment.new_hire_source_fields import sync_all_forms

	sync_all_forms()
