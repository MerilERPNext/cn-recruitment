import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Add the ``Follow-up Interview Needed?`` control to Job Applicant.

	A single reusable Select (blank / ``Yes`` / ``No``) that drives the
	multi-round interview flow:

	- HR sets it to ``Yes`` after an interview round clears to spawn the next
	  blank draft Interview (see
	  ``recruitment.customizations.job_applicant.create_follow_up_interview``).
	- HR sets it to ``No`` (with the latest round Cleared) to unlock the
	  ``Create > Job Offer`` button on the Job Applicant form.

	The field is reset to blank whenever a round reaches a verdict (see
	``recruitment.customizations.interview.interview.reset_follow_up_on_verdict``)
	and is editable only while the latest round is Cleared. Idempotent.
	"""
	create_custom_fields(
		{
			"Job Applicant": [
				{
					"fieldname": "custom_follow_up_interview_needed",
					"label": "Follow-up Interview Needed?",
					"fieldtype": "Select",
					"options": "\nYes\nNo",
					"insert_after": "status",
					"module": "Recruitment",
					"description": (
						"Set to 'Yes' after an interview round is cleared to open a "
						"blank follow-up interview for the next round; set to 'No' to "
						"allow creating a Job Offer. Editable only when the latest "
						"interview round is Cleared."
					),
				}
			]
		},
		update=True,
	)
