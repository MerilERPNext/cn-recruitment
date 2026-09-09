"""Attach the JD document itself to a Job Opening.

The opening already carries a written description; this holds the file HR sends
out — the PDF a campus TPO forwards to students. Campus Invite mirrors it onto
each of its job-opening rows and attaches it to the invite email.

Idempotent — create_custom_fields updates a field that already exists.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"

CUSTOM_FIELDS = {
	"Job Opening": [
		{
			"fieldname": "custom_job_description_file",
			"fieldtype": "Attach",
			"label": "Job Description File",
			# Inside the existing "Job description" section.
			"insert_after": "custom_job_description_section",
			"no_copy": 0,
			"module": MODULE,
		},
	]
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	frappe.clear_cache(doctype="Job Opening")
