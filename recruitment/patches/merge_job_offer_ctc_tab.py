"""Fold the Job Offer "Offer CTC" tab into the single Offer Details tab.

The Job Offer form now keeps every field on one tab, grouped into collapsible
sections, with a second tab reserved for the offer letter itself. The old
`custom_offer_ctc` Tab Break split the compensation fields onto a tab of their
own; the compensation block now opens with the "Pay Details" section instead.

Fixtures create and update custom fields but never delete them, so the Tab Break
has to be removed here. Everything that used to sit after it keeps its position
from the doctype's `field_order` property setter.
"""

import frappe

DOCTYPE = "Job Offer"
TAB_FIELD = "custom_offer_ctc"


def execute():
	name = frappe.db.get_value("Custom Field", {"dt": DOCTYPE, "fieldname": TAB_FIELD})
	if not name:
		return

	frappe.delete_doc("Custom Field", name, ignore_permissions=True, force=True)
	frappe.clear_cache(doctype=DOCTYPE)
	print(f"Removed the '{TAB_FIELD}' tab from {DOCTYPE} — compensation now lives under Pay Details.")
