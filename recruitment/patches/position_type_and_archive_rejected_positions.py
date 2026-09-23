"""Existing Job Requisition Position rows: fill Position Type, and archive the
ones created from a Position Details row rejected in approval (they were seeded
for every row, rejected or not, and showed up in the offer picker).

Tracking rows were numbered in Position Details order, so position_no N maps to
the Nth Position Details row. A requisition whose counts don't match is skipped
rather than guessed at.
"""

import frappe

from recruitment.api.offer_position import _positions_held_by_other_offers
from recruitment.api.requisition_status import POSITION_REJECTED, position_type_of

OFFERABLE = ("Draft", "Open")


def execute():
	if not frappe.db.has_column("Job Requisition Position", "position_type"):
		return

	requisitions = frappe.get_all(
		"Job Requisition Position",
		filters={"parenttype": "Job Requisition"},
		pluck="parent",
		distinct=True,
	)
	for requisition in requisitions:
		details = frappe.get_all(
			"Position Details",
			filters={"parent": requisition, "parenttype": "Job Requisition"},
			fields=["replacement_for", "approval_status"],
			order_by="idx asc",
		)
		positions = frappe.get_all(
			"Job Requisition Position",
			filters={"parent": requisition, "parenttype": "Job Requisition"},
			fields=["name", "position_no", "status", "candidate"],
			order_by="position_no asc",
		)
		if not details or len(details) != len(positions):
			continue

		held = None
		for detail, pos in zip(details, positions):
			values = {"position_type": position_type_of(detail)}
			if detail.approval_status == POSITION_REJECTED and not pos.candidate and pos.status in OFFERABLE:
				if held is None:
					held = _positions_held_by_other_offers(requisition)
				if pos.name not in held:
					values["status"] = "Archived"
			frappe.db.set_value("Job Requisition Position", pos.name, values, update_modified=False)
