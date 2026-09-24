"""Preserve existing ESS Todo visibility when `custom_show_in_ess_portal`'s
"neither box checked" default changed from ESS-visible to hidden-everywhere.

ESS Todo Type visibility (enforced in cn_todo_manager's own
`todo_api.ess_hidden_todo_types`) used to treat a Todo Type with both
`custom_show_in_ess_portal` and `custom_show_in_alumni_portal` unchecked as
ESS-visible (Notice's own legacy default, reused as-is). That was changed to
strict opt-in on both sides -- "neither set" now means hidden in both
portals -- per an explicit product decision to match a stricter spec.

Every Todo Type that predates that change and had never touched either
checkbox would otherwise flip from ESS-visible to invisible the moment this
ships -- including everyday categories like "Leave Approval", "Attendance
Request" and "Employee Separation" that never had a reason to explicitly
tick "Show in ESS Portal", because before this feature existed ESS showed
everything by default. This is that one-time exception: whatever was
both-off *right now* gets `custom_show_in_ess_portal = 1`, so nothing that
already worked stops working. A Todo Type created after this patch runs
still defaults to both-off (hidden everywhere) -- only the pre-existing
backlog is backfilled.
"""

import frappe


def execute():
	if not frappe.db.has_column("Todo Type", "custom_show_in_ess_portal"):
		return
	if not frappe.db.has_column("Todo Type", "custom_show_in_alumni_portal"):
		return

	frappe.db.sql(
		"""
		UPDATE `tabTodo Type`
		SET custom_show_in_ess_portal = 1
		WHERE COALESCE(custom_show_in_ess_portal, 0) = 0
		  AND COALESCE(custom_show_in_alumni_portal, 0) = 0
		"""
	)
	frappe.db.commit()
	frappe.clear_cache(doctype="Todo Type")
