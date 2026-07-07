# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class CandidateRegistration(Document):
	def on_submit(self):
		self._email_candidates()

	def _email_candidates(self):
		"""Email the Campus Settings template to every candidate's Email ID."""
		template_name = frappe.db.get_single_value(
			"Campus Settings", "candidate_registration_email_template"
		)
		if not template_name:
			frappe.throw(
				_("Set the Candidate Registration Email Template in Campus Settings before submitting.")
			)

		recipients = [row for row in (self.candidates or []) if row.email_id]
		if not recipients:
			frappe.throw(_("Add at least one candidate with an Email ID."))

		for candidate in recipients:
			self._send_to_candidate(template_name, candidate)

	def _send_to_candidate(self, template_name, candidate):
		"""Best effort: a bad address / SMTP issue for one candidate is logged and
		must not block the rest or roll back the submit."""
		from frappe.email.doctype.email_template.email_template import get_email_template

		full_name = " ".join(
			part for part in (candidate.first_name, candidate.middle_name, candidate.last_name) if part
		)
		context = {
			"doc": self,
			"candidate": candidate,
			"first_name": candidate.first_name,
			"middle_name": candidate.middle_name,
			"last_name": candidate.last_name,
			"full_name": full_name,
			"email_id": candidate.email_id,
			"mobile_number": candidate.mobile_number,
			"gender": candidate.gender,
		}
		try:
			rendered = get_email_template(template_name, context)
			frappe.sendmail(
				recipients=[candidate.email_id],
				subject=rendered.get("subject") or _("Candidate Registration"),
				message=rendered.get("message"),
				reference_doctype=self.doctype,
				reference_name=self.name,
			)
		except Exception:
			frappe.log_error(
				frappe.get_traceback(),
				f"Candidate Registration: email failed for {candidate.email_id}",
			)
