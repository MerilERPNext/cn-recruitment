import frappe
from frappe.model.document import Document
from frappe.utils import today


SOURCE_DOCTYPE = "Job Applicant"
LOOKUP_DOCTYPE = "TA Job Applicant Field"

SKIP_FIELDTYPES = {
	"Section Break",
	"Column Break",
	"Tab Break",
	"HTML",
	"Heading",
	"Fold",
	"Button",
}


class TARehireCheckSettings(Document):
	def onload(self):
		sync_job_applicant_fields()

	def before_insert(self):
		if not self.created_on:
			self.created_on = today()
		sync_job_applicant_fields()


def sync_job_applicant_fields():
	"""Ensure a TA Job Applicant Field record exists for every (non-layout) field
	on the Job Applicant doctype, so the rehire picker stays in sync with the
	live Job Applicant schema (native + custom fields). Safe to call any time."""
	try:
		if not frappe.db.exists("DocType", LOOKUP_DOCTYPE):
			return
		if not frappe.db.exists("DocType", SOURCE_DOCTYPE):
			return

		meta = frappe.get_meta(SOURCE_DOCTYPE)
		existing = set(frappe.get_all(LOOKUP_DOCTYPE, pluck="name"))

		created = False
		for df in meta.fields:
			if not df.fieldname or df.fieldtype in SKIP_FIELDTYPES:
				continue
			if df.fieldname in existing:
				continue
			frappe.get_doc(
				{
					"doctype": LOOKUP_DOCTYPE,
					"field_name": df.fieldname,
					"field_label": df.label or df.fieldname,
					"field_type": df.fieldtype,
				}
			).insert(ignore_permissions=True)
			created = True

		if created:
			frappe.db.commit()
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"TA Rehire Check Settings: Job Applicant field sync failed",
		)
