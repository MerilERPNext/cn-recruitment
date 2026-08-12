# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import escape_html

from recruitment.recruitment.tpo_access import PRIMARY_TPO_ROLE

# Roles that pick the Institute themselves; everyone else with TPO gets it forced
# to the institute mapped to their login.
INSTITUTE_CHOOSER_ROLES = {"System Manager", "HR Manager"}

# Mobile numbers are Indian campus numbers — exactly ten digits once the usual
# formatting (spaces, hyphens, brackets, a +91 / 0 prefix) is taken off.
MOBILE_DIGITS = 10
_NON_DIGITS = re.compile(r"\D")


def _safe(value):
	"""Bold, HTML-escaped. frappe.bold() does not escape and msgprint renders HTML,
	so candidate-supplied text would otherwise be injectable."""
	return frappe.bold(escape_html(str(value or "")))


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
		# that link is what later lets them apply to the invite's openings. Read once
		# here and passed on: the window check needs two more of the same row's fields.
		invite = frappe.db.get_value(
			"Campus Invite", self.campus_invite,
			["docstatus", "campus_invite_name", "registration_expiry_date"], as_dict=True,
		) if self.campus_invite else None
		if invite and invite.docstatus != 1:
			frappe.throw(_("The selected Campus Invite must be submitted before registering candidates against it."))

		self._validate_registration_window(invite)
		self._lock_invite_for_tpo()
		self._apply_tpo_institute()
		self._validate_institute_on_invite()
		self._validate_candidates()

	def _validate_registration_window(self, invite):
		"""A TPO may not register candidates once the invite's deadline has passed.

		Registration otherwise trickles in for weeks after a drive, against a college
		list HR has already worked through. The date is the invite's own
		(``registration_expiry_date``); blank means no deadline.

		HR is deliberately not blocked: they are the ones who would extend the date,
		and they need a way to add a candidate the college missed. They get a warning
		instead, so a late entry is never silent.
		"""
		from frappe.utils import formatdate, getdate, nowdate

		expiry = invite and invite.registration_expiry_date
		if not expiry or getdate(nowdate()) <= getdate(expiry):
			return

		if is_tpo_only():
			frappe.throw(
				_("Registration for {0} closed on {1}. Candidates can no longer be added — "
				  "please contact the recruitment team if you need the date extended.").format(
					_safe(invite.campus_invite_name or self.campus_invite),
					_safe(formatdate(expiry)),
				),
				title=_("Registration Closed"),
			)
		frappe.msgprint(
			_("Registration for this invite closed on {0}. You are adding candidates after the "
			  "deadline — TPOs cannot.").format(_safe(formatdate(expiry))),
			title=_("Past the registration deadline"), indicator="orange",
		)

	def _lock_invite_for_tpo(self):
		"""A TPO reads the Campus Invite on a registration; they never change it.

		The drive is chosen for them — the TPO Desk's "Add Candidates" opens the form
		with it already set. Moving a saved registration to a different invite would
		carry a college's candidates onto another drive, so it is refused here as well
		as being read-only on the form. HR may still re-point one.
		"""
		if self.is_new() or not is_tpo_only():
			return
		before = self.get_doc_before_save()
		if not before or before.campus_invite == self.campus_invite:
			return
		frappe.throw(
			_("The Campus Invite on a registration cannot be changed. This one belongs to "
			  "{0} — add your candidates to the right drive from your TPO Desk.").format(
				_safe(before.campus_invite_name or before.campus_invite)),
			title=_("Campus Invite is fixed"),
		)

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

	def _validate_candidates(self):
		"""Ten-digit mobiles, and no email/mobile repeated inside this batch.

		Duplicates matter because on submit each row is emailed its own apply link
		and the campus flow keys a candidate to an invite by email, so the same
		student twice means two mails and two Job Applicants.
		"""
		emails, mobiles = {}, {}

		for row in self.candidates or []:
			who = row.first_name or row.email_id or _("Row {0}").format(row.idx)
			row.email_id = (row.email_id or "").strip().lower()
			row.mobile_number = self._clean_mobile(row.mobile_number, row.idx, who)

			for value, seen, title in (
				(row.email_id, emails, _("Duplicate Email")),
				(row.mobile_number, mobiles, _("Duplicate Mobile Number")),
			):
				if not value:
					continue
				if value in seen:
					frappe.throw(
						_("Row {0}: {1} is already used by row {2}.").format(
							row.idx, _safe(value), seen[value]
						),
						title=title,
					)
				seen[value] = row.idx

		self._validate_not_registered_elsewhere(emails, mobiles)

	def _clean_mobile(self, value, idx, who):
		"""Exactly MOBILE_DIGITS digits, or throw. Blank passes — the field is optional.

		A leading 91/0 is dropped only when that lands on exactly ten digits, so
		"+91 98765-43210" is accepted while a genuinely wrong length still fails.
		"""
		value = (value or "").strip()
		if not value:
			return ""

		digits = _NON_DIGITS.sub("", value)
		for prefix in ("91", "0"):
			if len(digits) == MOBILE_DIGITS + len(prefix) and digits.startswith(prefix):
				digits = digits[len(prefix) :]
				break

		if len(digits) != MOBILE_DIGITS:
			frappe.throw(
				_("Row {0} ({1}): {2} is not a valid mobile number. Enter exactly {3} digits.").format(
					idx, _safe(who), _safe(value), MOBILE_DIGITS
				),
				title=_("Invalid Mobile Number"),
			)
		return digits

	def _validate_not_registered_elsewhere(self, emails, mobiles):
		"""Reject candidates already on another registration for this same invite.

		Same student on a different drive is legitimate, so this is scoped to one
		invite. Drafts count, or two drafts could each pass and then both submit.
		Reads unscoped on purpose: a clash must be caught even when the other
		registration belongs to a different TPO.
		"""
		if not (self.campus_invite and (emails or mobiles)):
			return

		others = frappe.get_all(
			"Candidate Registration",
			filters={
				"campus_invite": self.campus_invite,
				"docstatus": ["<", 2],
				"name": ["!=", self.name or ""],
			},
			fields=["name", "owner"],
		)
		if not others:
			return

		or_filters = [
			f
			for f in (
				["email_id", "in", list(emails)] if emails else None,
				["mobile_number", "in", list(mobiles)] if mobiles else None,
			)
			if f
		]
		clashes = frappe.get_all(
			"Candidate Registration Detail",
			filters={
				"parenttype": "Candidate Registration",
				"parentfield": "candidates",
				"parent": ["in", [o.name for o in others]],
			},
			or_filters=or_filters,
			fields=["parent", "email_id", "mobile_number"],
			limit_page_length=0,
		)

		owners = {o.name: o.owner for o in others}
		for hit in clashes:
			for value, seen, title in (
				((hit.email_id or "").strip().lower(), emails, _("Duplicate Email")),
				((hit.mobile_number or "").strip(), mobiles, _("Duplicate Mobile Number")),
			):
				if value in seen:
					frappe.throw(
						_("Row {0}: {1} is already registered on {2}.").format(
							seen[value], _safe(value), self._clash_source(hit.parent, owners)
						),
						title=title,
					)

	def _clash_source(self, registration, owners):
		"""Name the clashing record only to someone entitled to see it — a TPO must
		not learn what another college submitted."""
		if not is_tpo_only() or owners.get(registration) == frappe.session.user:
			return _("Candidate Registration {0}").format(_safe(registration))
		return _("another registration for this campus drive")

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
