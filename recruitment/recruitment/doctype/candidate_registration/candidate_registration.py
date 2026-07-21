# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.tpo_access import PRIMARY_TPO_ROLE

# Roles that pick the Institute themselves; everyone else with TPO gets it forced
# to the institute mapped to their login.
INSTITUTE_CHOOSER_ROLES = {"System Manager", "HR Manager"}


def is_tpo_only(user=None):
	"""True when `user` should have their Institute auto-set (a TPO, not HR/admin)."""
	roles = set(frappe.get_roles(user or frappe.session.user))
	return "TPO" in roles and not (roles & INSTITUTE_CHOOSER_ROLES)


def get_tpo_institute(user=None, campus_invite=None):
	"""The Institute mapped to a TPO's login, or None.

	A TPO is provisioned only as the Primary TPO of an institute, so we resolve by
	the Primary TPO contact rows carrying their email. If a Campus Invite is given,
	the result is narrowed to the institute(s) that invite actually invited (a TPO
	could be Primary at more than one college). With no invite, we only auto-pick
	when it is unambiguous.
	"""
	user = user or frappe.session.user
	if not user or user in ("Administrator", "Guest"):
		return None

	from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

	primaries = frappe.get_all(
		"Institute TPO Contact",
		filters={"parenttype": "Institute", "email": user, "role": PRIMARY_TPO_ROLE},
		pluck="parent",
	)
	primaries = list(dict.fromkeys(primaries))  # de-dupe, keep order
	if not primaries:
		return None

	if campus_invite:
		invited = set(get_invite_institutes(campus_invite))
		matching = [i for i in primaries if i in invited]
		return matching[0] if matching else None

	return primaries[0] if len(primaries) == 1 else None


class CandidateRegistration(Document):
	def validate(self):
		# Candidates are always registered against a submitted (sent) Campus Invite —
		# that link is what later lets them apply to the invite's openings.
		if self.campus_invite and frappe.db.get_value("Campus Invite", self.campus_invite, "docstatus") != 1:
			frappe.throw(_("The selected Campus Invite must be submitted before registering candidates against it."))

		self._apply_tpo_institute()
		self._validate_institute_on_invite()

	def _apply_tpo_institute(self):
		"""Force a TPO's Institute to the one mapped to their login.

		TPOs never choose an institute (they must not see other colleges) — it is set
		server-side so it cannot be tampered with via the API either. HR / System
		Managers are left to pick it themselves.
		"""
		if not is_tpo_only():
			return

		institute = get_tpo_institute(frappe.session.user, self.campus_invite)
		if not institute:
			frappe.throw(
				_(
					"No Institute is mapped to your TPO login for this Campus Invite. "
					"Please contact HR."
				),
				title=_("Institute Not Found"),
			)
		self.institute = institute

	def _validate_institute_on_invite(self):
		"""The Institute must be one the Campus Invite actually invited.

		An invite can carry several institutes; this pins these candidates to one of
		them, which is what gives each Job Applicant its institute later.
		"""
		if not (self.campus_invite and self.institute):
			return

		from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

		invited = get_invite_institutes(self.campus_invite)
		if invited and self.institute not in invited:
			frappe.throw(
				_("Institute {0} is not invited on Campus Invite {1}. Choose one of: {2}.").format(
					frappe.bold(self.institute),
					frappe.bold(self.campus_invite),
					", ".join(invited),
				)
			)

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
			# The institute these candidates were registered under (an invite can
			# carry several).
			"institute": self.institute,
			# Ready-made apply link (invite id baked in) so the template can simply
			# use {{ registration_link }}. The invite is carried in the link — the
			# candidate never chooses it.
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


@frappe.whitelist()
def get_my_tpo_institute(campus_invite=None):
	"""Institute mapped to the logged-in TPO (for the form to auto-fill), or None."""
	if not is_tpo_only():
		return None
	return get_tpo_institute(frappe.session.user, campus_invite)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def invite_institute_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link-field query: Institutes invited on the given Campus Invite."""
	from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

	invited = get_invite_institutes((filters or {}).get("campus_invite"))
	if not invited:
		return []

	return frappe.get_all(
		"Institute",
		filters={"name": ["in", invited]},
		or_filters=[["name", "like", f"%{txt}%"], ["institute_name", "like", f"%{txt}%"]] if txt else None,
		fields=["name", "institute_name"],
		order_by="institute_name asc",
		start=start,
		page_length=page_len,
		as_list=True,
	)


def get_registered_institute(email, campus_invite):
	"""The Institute `email` was registered under for this Campus Invite, or None.

	An invite can carry several institutes, so a candidate's own institute cannot be
	read off the invite — it comes from the Candidate Registration the TPO submitted
	them on. This is the source of `Job Applicant.custom_institute` for campus hires.
	"""
	email = (email or "").strip().lower()
	if not (email and campus_invite):
		return None

	registrations = frappe.get_all(
		"Candidate Registration",
		filters={"campus_invite": campus_invite, "docstatus": 1},
		fields=["name", "institute"],
	)
	by_name = {r.name: r.institute for r in registrations if r.institute}
	if not by_name:
		return None

	rows = frappe.get_all(
		"Candidate Registration Detail",
		filters={
			"parenttype": "Candidate Registration",
			"parentfield": "candidates",
			"parent": ["in", list(by_name)],
		},
		fields=["parent", "email_id"],
	)
	# Compare in Python: an email local-part may contain "_", a SQL LIKE wildcard.
	for row in rows:
		if (row.email_id or "").strip().lower() == email:
			return by_name.get(row.parent)
	return None


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
