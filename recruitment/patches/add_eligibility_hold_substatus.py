"""Seed the "Eligibility Not Met" sub-status under the Hold status.

Campus eligibility evaluation puts a candidate who fails a knock-out rule on
``status = Hold`` with ``custom_substatus = "Eligibility Not Met"``. The Job
Applicant sub-status dropdown is driven by the Sub Status master (one record per
parent status, newline-separated sub-status list), so this value must exist there.
Idempotent.
"""

import frappe

PARENT_STATUS = "Hold"
SUBSTATUS = "Eligibility Not Met"


def execute():
	name = frappe.db.get_value("Sub Status", {"parent_status": PARENT_STATUS}, "name")
	if name:
		existing = frappe.db.get_value("Sub Status", name, "sub_status") or ""
		parts = [p.strip() for p in existing.split("\n") if p.strip()]
		if SUBSTATUS not in parts:
			parts.append(SUBSTATUS)
			frappe.db.set_value("Sub Status", name, "sub_status", "\n".join(parts))
	else:
		frappe.get_doc({
			"doctype": "Sub Status",
			"parent_status": PARENT_STATUS,
			"sub_status": SUBSTATUS,
		}).insert(ignore_permissions=True)
	frappe.db.commit()
