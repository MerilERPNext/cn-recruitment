# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class CandidateRegistration(Document):
	def validate(self):
		# Candidates are always registered against a submitted (sent) Campus Invite —
		# that link is what later lets them apply to the invite's openings.
		if self.campus_invite and frappe.db.get_value("Campus Invite", self.campus_invite, "docstatus") != 1:
			frappe.throw(_("The selected Campus Invite must be submitted before registering candidates against it."))

	def on_submit(self):
		self._email_candidates()


def is_email_registered_for_invite(email, campus_invite):
	"""True when `email` was registered by a TPO (a submitted Candidate Registration)
	against this specific Campus Invite. This is the gate the campus application flow
	checks before creating a Job Applicant."""
	email = (email or "").strip().lower()
	if not email or not campus_invite:
		return False

	registrations = frappe.get_all(
		"Candidate Registration",
		filters={"campus_invite": campus_invite, "docstatus": 1},
		pluck="name",
	)
	if not registrations:
		return False

	# Compare emails case-insensitively in Python (an email local-part may contain
	# "_", which would act as a wildcard in a SQL LIKE and cause false matches).
	registered_emails = frappe.get_all(
		"Candidate Registration Detail",
		filters={
			"parenttype": "Candidate Registration",
			"parentfield": "candidates",
			"parent": ["in", registrations],
		},
		pluck="email_id",
	)
	return any((e or "").strip().lower() == email for e in registered_emails)

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
		from recruitment.recruitment.link_token import campus_registration_link

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
			# The invite these candidates registered against — put in the portal
			# signup link so the frontend can pass it back at signup / application.
			"campus_invite": self.campus_invite,
			# Ready-made signed apply link (invite + email + token baked in) so the
			# template can simply use {{ registration_link }}. The invite is carried
			# in the link — the candidate never chooses it.
			"registration_link": campus_registration_link(candidate.email_id, self.campus_invite),
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
