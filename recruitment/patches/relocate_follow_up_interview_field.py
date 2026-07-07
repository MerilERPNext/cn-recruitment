import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Add the follow-up-interview control to the Interview + Interview Feedback.

	Flow: the interviewer conducts the round and sets the verdict on the
	**Interview**; the **Interview Feedback** shows the same field, auto-filled
	(read-only) from the linked Interview, so submitting the feedback logs an
	immutable copy of the verdict.

	- ``Interview.custom_follow_up_interview_needed`` (Select blank/``Yes``/``No``)
	  -- editable, always visible; the interviewer's call on whether another
	  round is needed.
	- ``Interview Feedback.custom_follow_up_interview_needed`` -- same Select,
	  **read-only** and **fetched** from ``interview.custom_follow_up_interview_needed``
	  (``fetch_from``), so it auto-fills from the Interview and can't be hand-edited.

	The ``Create > Job Offer`` gate is unchanged -- it reads the latest submitted
	Interview Feedback (``result == "Cleared"`` AND follow-up ``== "No"``); see
	``recruitment.customizations.job_applicant.get_follow_up_state``.

	The old ``Job Applicant.custom_follow_up_interview_needed`` control is removed.
	Idempotent.
	"""
	create_custom_fields(
		{
			"Interview": [
				{
					"fieldname": "custom_follow_up_interview_needed",
					"label": "Follow-up Interview Needed?",
					"fieldtype": "Select",
					"options": "\nYes\nNo",
					"insert_after": "status",
					"module": "Recruitment",
					"description": (
						"Set after conducting this round: 'Yes' = another interview "
						"round is needed; 'No' = final call. Auto-fills onto the "
						"Interview Feedback and drives the Create > Job Offer gate."
					),
				}
			],
			"Interview Feedback": [
				{
					"fieldname": "custom_follow_up_interview_needed",
					"label": "Follow-up Interview Needed?",
					"fieldtype": "Select",
					"options": "\nYes\nNo",
					"insert_after": "result",
					"fetch_from": "interview.custom_follow_up_interview_needed",
					"read_only": 1,
					# clear the earlier result==Cleared reveal condition on update
					"depends_on": "",
					"module": "Recruitment",
					"description": (
						"Auto-filled (read-only) from the linked Interview's follow-up "
						"verdict; logged here immutably when the feedback is submitted."
					),
				}
			],
		},
		update=True,
	)

	# Retire the old Job Applicant control -- the decision now lives on the round.
	old = "Job Applicant-custom_follow_up_interview_needed"
	if frappe.db.exists("Custom Field", old):
		frappe.delete_doc("Custom Field", old, ignore_permissions=True)
