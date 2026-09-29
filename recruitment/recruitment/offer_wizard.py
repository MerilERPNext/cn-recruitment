"""Server side of the Job Offer wizard view (public/js/job_offer_wizard.js).

Read-only. The wizard never starts or decides an approval itself: approvals on a
Job Offer are run by the nextai engine (a Flow Config on the offer, e.g. the
duplicity exceptional approval), which writes an Approval Tracker per run. This
only reads those trackers back so the Approval step can show who has signed off.
"""

import frappe
from frappe import _
from frappe.utils import get_fullname

OFFER_DOCTYPE = "Job Offer"
TRACKER = "Approval Tracker"
LOG = "Approval Log Entry"


def _split(value):
	return [v.strip() for v in (value or "").split(",") if v.strip()]


@frappe.whitelist()
def get_offer_approvals(job_offer):
	"""``[{tracker, title, status, mode, created, approvers: [...]}, ...]``, newest first.

	One entry per Approval Tracker on this offer. Each approver row is one
	Approval Log Entry: the stage it belongs to, who it is assigned to (users by
	full name, else the role), its status and when it was decided.
	"""
	frappe.has_permission(OFFER_DOCTYPE, "read", doc=job_offer, throw=True)

	if not frappe.db.table_exists(TRACKER):
		return []

	trackers = frappe.get_all(
		TRACKER,
		filters={"doc_type": OFFER_DOCTYPE, "doc_name": job_offer},
		fields=["name", "status", "approval_mode", "approval_matrix", "creation"],
		order_by="creation desc",
	)
	if not trackers:
		return []

	logs = frappe.get_all(
		LOG,
		filters={"parenttype": TRACKER, "parent": ["in", [t.name for t in trackers]]},
		fields=[
			"parent", "idx", "stage_name", "approver_type", "user", "role",
			"custom_allocated_to_users", "custom_assigned_to_roles", "status", "approval_time",
		],
		order_by="parent asc, idx asc",
	)
	logs_by_tracker = {}
	for log in logs:
		logs_by_tracker.setdefault(log.parent, []).append(log)

	matrices = {t.approval_matrix for t in trackers if t.approval_matrix}
	titles = dict(
		frappe.get_all(
			"Approval Policy Matrix",
			filters={"name": ["in", list(matrices)]},
			fields=["name", "matrix_name"],
			as_list=True,
		)
	) if matrices else {}

	out = []
	for t in trackers:
		approvers = []
		for log in logs_by_tracker.get(t.name, []):
			users = _split(log.custom_allocated_to_users) or _split(log.user)
			roles = _split(log.custom_assigned_to_roles) or _split(log.role)
			approvers.append(
				{
					"stage": log.stage_name,
					"names": [get_fullname(u) for u in users],
					"roles": roles,
					"status": log.status or "Pending",
					"decided_on": log.approval_time,
				}
			)
		out.append(
			{
				"tracker": t.name,
				"title": titles.get(t.approval_matrix) or t.approval_matrix or _("Offer approval"),
				"status": t.status or "Pending",
				"mode": t.approval_mode,
				"created": t.creation,
				"approvers": approvers,
			}
		)
	return out
