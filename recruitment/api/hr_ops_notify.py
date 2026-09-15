"""'Notify HR Ops' — the recruiter handing a saved Job Offer over for verification.

Backs both the Job Offer form button and the list-view bulk action, so one offer
and fifty take exactly the same path. Only runs when Recruitment Settings ->
"Require HR Ops Verification Before Sending Offer" is on; see
recruitment.recruitment.hr_ops_offer_review for the rest of the flow.
"""

import json

import frappe
from frappe import _
from frappe.utils import now

from recruitment.recruitment.communication_log import sendmail_with_log
from recruitment.recruitment.hr_ops_offer_review import (
	HR_OPS_ROLE,
	hr_ops_recipients,
	is_notified,
	render_email,
	verification_enabled,
)


@frappe.whitelist()
def notify_hr_ops(job_offers):
	"""Email the HR Ops role about one or more offers awaiting verification.

	Returns `{notified, already_notified, skipped, failed}` — the counts the list
	view reports. Already-notified offers are counted, not re-mailed: the button
	is a handover, not a reminder.
	"""
	frappe.has_permission("Job Offer", "write", throw=True)

	if isinstance(job_offers, str):
		job_offers = json.loads(job_offers)
	if isinstance(job_offers, str):
		job_offers = [job_offers]

	if not verification_enabled():
		frappe.throw(
			_("HR Ops verification is turned off in Recruitment Settings, so there is nothing to notify.")
		)

	recipients = hr_ops_recipients()
	if not recipients:
		frappe.throw(
			_("No enabled user holds the {0} role, so there is no one to notify.").format(HR_OPS_ROLE)
		)

	notified = 0
	already_notified = 0
	skipped = 0
	failed = 0

	for name in job_offers:
		try:
			doc = frappe.get_doc("Job Offer", name)

			# A cancelled offer is not going anywhere.
			if doc.docstatus == 2:
				skipped += 1
				continue

			if is_notified(doc):
				already_notified += 1
				continue

			subject, message = render_email(doc)

			sendmail_with_log(
				recipients=recipients,
				subject=subject,
				message=message,
				reference_doctype="Job Offer",
				reference_name=doc.name,
				now=True,
			)

			# Stamped only after the send returned, so a failed mail leaves the
			# offer un-notified and the gate closed.
			doc.db_set({
				"custom_hr_ops_notified": 1,
				"custom_hr_ops_notified_on": now(),
				"custom_hr_ops_notified_by": frappe.session.user,
			}, update_modified=False)

			notified += 1

		except Exception:
			failed += 1
			frappe.log_error(frappe.get_traceback(), "Notify HR Ops failed")

	return {
		"notified": notified,
		"already_notified": already_notified,
		"skipped": skipped,
		"failed": failed,
		"recipients": len(recipients),
	}
