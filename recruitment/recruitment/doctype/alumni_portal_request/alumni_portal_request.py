# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

"""Controller for the `Alumni Portal Request` doctype.

A self-contained, lightweight equivalent of the ESS `Employee Separation` /
`Employee Confirmation` staged-approval pattern, built for the Alumni Portal.

It deliberately does NOT ride on the `nextai` Funnel/Approval-Matrix engine that
Separation and Confirmation use -- that engine is built around Employee identity
(ToDos, Frappe roles, Employee link-field approver resolution), and Alumni
sessions are intentionally firewalled away from it (see `alumni_guard.py`). This
doctype instead tracks its own stage sequence in the `stages` child table and its
own `status` field, mirroring the same *shape* of business logic
(sequential stages, role-based approvers, terminal states, revoke) without any
dependency on engine infrastructure alumni sessions cannot reach.

All mutation happens through `recruitment.recruitment.alumni_separation`
(alumni-facing: create/list/get/revoke, ownership-checked) and
`recruitment.recruitment.alumni_request_admin` (staff-facing: act on a stage) --
never directly through the Desk for alumni, since alumni have no doctype
permission on this doctype at all (see the `permissions` block: System Manager /
HR Manager / HR User only). The controller here only keeps things internally
consistent; the real business rules live in those two API modules.
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document


class AlumniPortalRequest(Document):
	def validate(self) -> None:
		self._block_duplicate_open_request()

	def _block_duplicate_open_request(self) -> None:
		"""One open (non-terminal) request per employee per category at a time.

		Mirrors `Employee Confirmation.validate()`'s "already a pending request"
		guard -- an alumnus should not be able to pile up multiple simultaneous
		requests of the same category while one is still being reviewed.
		"""
		if not (self.alumni_employee and self.request_category):
			return

		open_statuses = ("Draft", "Submitted", "In Review")
		if self.status not in open_statuses:
			return

		duplicate = frappe.db.exists(
			"Alumni Portal Request",
			{
				"alumni_employee": self.alumni_employee,
				"request_category": self.request_category,
				"status": ["in", open_statuses],
				"name": ["!=", self.name or ""],
			},
		)
		if duplicate:
			frappe.throw(
				frappe._(
					"There is already a pending {0} request for this alumnus ({1})."
				).format(self.request_category, duplicate)
			)

	def current_stage(self):
		"""The first row in `stages` still `Pending`, or None if all resolved."""
		for row in self.stages:
			if row.status == "Pending":
				return row
		return None
