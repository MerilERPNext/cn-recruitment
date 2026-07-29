"""Seed the eligibility sub-statuses.

Eligibility evaluation sets:
  - Knock-out fail → status ``Rejected`` + sub-status "Eligibility Not Met"
  - Flag fail      → status ``Hold``     + sub-status "Eligibility Flagged"

The Job Applicant sub-status dropdown is driven by the Sub Status master (one
record per parent status, newline-separated list), so these values must exist
there. Idempotent.
"""

import frappe

SUBSTATUSES = [
	("Rejected", "Eligibility Not Met"),
	("Hold", "Eligibility Flagged"),
]


def execute():
	for parent, sub in SUBSTATUSES:
		name = frappe.db.get_value("Sub Status", {"parent_status": parent}, "name")
		if name:
			existing = frappe.db.get_value("Sub Status", name, "sub_status") or ""
			parts = [p.strip() for p in existing.split("\n") if p.strip()]
			if sub not in parts:
				parts.append(sub)
				frappe.db.set_value("Sub Status", name, "sub_status", "\n".join(parts))
		else:
			frappe.get_doc({
				"doctype": "Sub Status",
				"parent_status": parent,
				"sub_status": sub,
			}).insert(ignore_permissions=True)
	frappe.db.commit()
