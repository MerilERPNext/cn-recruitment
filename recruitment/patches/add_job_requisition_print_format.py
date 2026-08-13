"""Install the "Job Requisition Summary" print format.

The format ships as a standard doc under `recruitment/print_format/`, so a clean
migrate picks it up on its own. This patch exists for the sites that already have
the app: it force-reloads the file so the format lands (and later edits to it land)
without waiting for the doctype sync to decide the module folder changed.

Idempotent — reload_doc overwrites the standard doc from the file every run.
"""

import frappe

MODULE = "recruitment"
PRINT_FORMAT = "Job Requisition Summary"


def execute():
	if not frappe.db.table_exists("Job Requisition"):
		return

	frappe.reload_doc(MODULE, "print_format", "job_requisition_summary", force=True)

	if not frappe.db.exists("Print Format", PRINT_FORMAT):
		frappe.logger().warning(
			"add_job_requisition_print_format: reload did not create the format"
		)
