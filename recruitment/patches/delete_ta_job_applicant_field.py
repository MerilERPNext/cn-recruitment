"""Remove the obsolete ``TA Job Applicant Field`` mirror doctype.

The eligibility / screener / duplicity / rehire pickers now read Job Applicant
metadata directly (Select showing label, storing fieldname), so the synced mirror
doctype is no longer needed. Its stored values were already the fieldnames (it was
autonamed by ``field_name``), so no data migration is required — the pickers keep
working against the same values.

Runs post_model_sync, i.e. AFTER the picker doctypes have been re-synced from Link
to Select, so nothing links to this doctype by the time it's dropped.
"""

import frappe


def execute():
	if frappe.db.exists("DocType", "TA Job Applicant Field"):
		frappe.delete_doc("DocType", "TA Job Applicant Field", force=True, ignore_permissions=True)
		frappe.db.commit()
