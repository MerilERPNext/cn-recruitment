"""Create the shared interview type used for a one-candidate additional round.

Without it, giving one candidate another round meant inventing a type name on the
spot ("Technical Round 3"), which grows the interview-type master by one record per
candidate and leaves names nobody can define a year later. This one is generic and
reused by everyone; what makes each case specific is the reason, recorded on the
interview and on the candidate's workflow history.

A candidate needing a SECOND additional round gets the next free variant of the name
("Additional Round 2"), created on demand — HRMS refuses to let anyone sit the same
interview type twice. See
``recruitment.recruitment.doctype.campus_drive.campus_drive.EXTRA_ROUND_TYPE``.
Idempotent.
"""

import frappe

from recruitment.recruitment.doctype.campus_drive.campus_drive import EXTRA_ROUND_TYPE


def execute():
	from recruitment.api.hiring_stage import _ensure_interview_round

	created = _ensure_interview_round(EXTRA_ROUND_TYPE)
	frappe.db.commit()
	print(f"Additional round type ready: {created or EXTRA_ROUND_TYPE}")
