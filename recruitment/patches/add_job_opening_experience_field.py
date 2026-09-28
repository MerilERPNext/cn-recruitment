"""The "Experience" field on the Job Opening.

A read-only copy of the Job Requisition's experience range (e.g. "1 - 2 years"),
filled by ``recruitment.customizations.job_opening_from_requisition``. Sits
beside the opening's "Work experience" dropdown, whose buckets differ from the
requisition's and so could not hold every range.

Adds the field only — existing openings are left as they are; the field fills
in for openings created from now on. Idempotent — create_custom_fields updates
a field that already exists.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from recruitment.customizations.job_opening_from_requisition import EXPERIENCE_FIELD

MODULE = "Recruitment"

CUSTOM_FIELDS = {
	"Job Opening": [
		{
			"fieldname": EXPERIENCE_FIELD,
			"fieldtype": "Data",
			"label": "Experience",
			"insert_after": "custom_work_experience_range",
			"read_only": 1,
			"no_copy": 1,
			"description": "From the Job Requisition's experience range.",
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, update=True)

