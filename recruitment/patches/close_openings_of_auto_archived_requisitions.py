"""Close the Job Openings still Open under an Auto Archived requisition.

Auto-archiving (every position Filled) used to leave the requisition's opening
Open. offer_position._rollup_requisition now closes it; this catches up the
requisitions archived before that.
"""

import frappe

from recruitment.api.offer_position import JOB_OPENING_CLOSED, set_job_openings_status
from recruitment.api.requisition_status import AUTO_ARCHIVED_STATUS


def execute():
	archived = frappe.get_all(
		"Job Requisition", filters={"status": AUTO_ARCHIVED_STATUS}, pluck="name"
	)
	if not archived:
		return
	requisitions = frappe.get_all(
		"Job Opening",
		filters={"status": "Open", "job_requisition": ["in", archived]},
		pluck="job_requisition",
		distinct=True,
	)
	for requisition in requisitions:
		set_job_openings_status(requisition, JOB_OPENING_CLOSED)
