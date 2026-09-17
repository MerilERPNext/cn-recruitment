# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import escape_html, formatdate

from recruitment.recruitment.campus_helpers import (
	locked_institutes_for_invite,
	validate_unique_job_openings,
)
from recruitment.recruitment.tpo_access import PRIMARY_TPO_ROLE, provision_tpo_user


def tpo_contacts_for_institutes(institutes):
	"""TPO Contacts across `institutes`, Primary TPOs first, deduped by email.

	The same person can be listed under more than one institute — they are carried
	once. Primary rows are ordered first so that when someone is the Primary TPO at
	one institute and, say, an Asst TPO at another, the row we keep is the Primary
	one (that is the row which earns a portal user + invite email).

	Each row carries `institute_name` so HR can tell which college a contact is for;
	a person carried once for several institutes lists all of them.
	"""
	institutes = [i for i in (institutes or []) if i]
	if not institutes:
		return []

	contacts = frappe.get_all(
		"Institute TPO Contact",
		filters={"parenttype": "Institute", "parent": ["in", institutes]},
		fields=["parent as institute", "contact_name", "role", "email", "phone", "invite_status"],
		order_by="parent asc, idx asc",
	)
	# Stable sort: Primary TPOs first, everyone else keeps institute/row order.
	contacts.sort(key=lambda c: 0 if c.role == PRIMARY_TPO_ROLE else 1)

	label = dict(
		frappe.get_all(
			"Institute",
			filters={"name": ["in", institutes]},
			fields=["name", "institute_name"],
			as_list=True,
		)
	)

	seen = {}
	deduped = []
	for contact in contacts:
		institute = contact.pop("institute")
		names = [label.get(institute) or institute]
		key = (contact.email or "").strip().lower()
		if key:
			if key in seen:
				kept_contact, kept_names = seen[key]
				if names[0] not in kept_names:
					kept_names.append(names[0])
					kept_contact.institute_name = ", ".join(kept_names)
				continue
			seen[key] = (contact, names)
		contact.institute_name = names[0]
		deduped.append(contact)
	return deduped


def _bullets(rows):
	"""A `<ul>` of colleges, each optionally naming the drive that locked it.

	`rows` is an iterable of ``(institute, campus_drive_or_None)``. Kept as a
	helper so the two messages below list colleges the same way — the point of
	both is to say plainly WHICH colleges are affected, which a comma-run of ids
	never managed.
	"""
	items = []
	for institute, drive in rows:
		label = escape_html(str(institute))
		if drive:
			label += " — " + _("drive {0} is already live").format(escape_html(str(drive)))
		items.append(f"<li>{label}</li>")
	return "<ul>" + "".join(items) + "</ul>" if items else ""


class CampusInvite(Document):
	def validate(self):
		self._sync_tpo_contacts_from_institutes()
		validate_unique_job_openings(self)

	@property
	def institute_names(self):
		"""Institutes invited on this drive, in row order."""
		return [row.institute for row in (self.institutes or []) if row.institute]

	def _sync_tpo_contacts_from_institutes(self):
		"""Mirror every selected Institute's TPO Contacts into this doc (read-only)."""
		self.set("tpo_contacts", [])
		for contact in tpo_contacts_for_institutes(self.institute_names):
			self.append("tpo_contacts", contact)

	def on_update_after_submit(self):
		# Registration Expiry Date is allow_on_submit: the deadline is the one thing HR
		# needs to move on a sent invite (a college asks for more time, a drive slips).
		self._validate_expiry_change()

	def _validate_expiry_change(self):
		"""Guard an expiry date edited on a submitted invite.

		Only meaningful for the institutes still waiting for a drive — a college whose
		drive has gone live is closed by the drive itself and no date brings it back.
		So the edit is refused outright once every institute on the invite is live, and
		otherwise HR is told exactly which colleges the new date applies to.
		"""
		from frappe.utils import getdate, nowdate

		before = self.get_doc_before_save()
		old = before and before.registration_expiry_date
		new = self.registration_expiry_date
		if str(old or "") == str(new or ""):
			return

		locked = locked_institutes_for_invite(self.name)
		invited = self.institute_names
		still_open = [i for i in invited if i not in locked]

		if invited and not still_open:
			frappe.throw(
				_(
					"Every college on this invite has already started its campus drive, so "
					"there is no registration left for a deadline to apply to:"
				)
				+ _bullets((i, locked[i]) for i in invited)
				+ "<p>"
				+ _(
					"Once a drive goes live it decides who can still register, not this "
					"date. To reopen a college, work on its drive."
				)
				+ "</p>",
				title=_("Every Drive Is Already Live"),
			)

		# A deadline in the past would close the remaining colleges retroactively — the
		# opposite of why this field is editable. Clearing it (no deadline) is fine.
		if new and getdate(new) < getdate(nowdate()):
			frappe.throw(
				_("{0} is in the past. Set the Registration Expiry Date to today or later.").format(
					frappe.bold(formatdate(new))
				),
				title=_("Deadline in the Past"),
			)

		if locked:
			applied = still_open
			skipped = [(i, locked[i]) for i in invited if i in locked]
			headline = (
				_("Registration now closes on {0} for {1} of the {2} colleges on this invite:").format(
					frappe.bold(formatdate(new)), frappe.bold(len(applied)), frappe.bold(len(invited))
				)
				if new
				else _("Registration has no deadline now for {0} of the {1} colleges on this invite:").format(
					frappe.bold(len(applied)), frappe.bold(len(invited))
				)
			)
			frappe.msgprint(
				"<p>" + headline + "</p>"
				+ _bullets((i, None) for i in applied)
				+ "<p>"
				# Deliberately not "the college"/"their drive": one skipped college and
				# several read the same way here, so the sentence never has to agree.
				+ _(
					"It does not apply below, where the drive has already started — a live "
					"drive decides its own registration:"
				)
				+ "</p>"
				+ _bullets(skipped),
				title=_("Deadline Changed for Some Colleges"),
				indicator="orange",
			)

	def on_submit(self):
		self._invite_tpos()

	def _invite_tpos(self):
		# Only the Primary TPO of each institute gets a portal user + login email —
		# the other contacts are carried for reference only.
		recipients = [
			row for row in (self.tpo_contacts or []) if row.email and row.role == PRIMARY_TPO_ROLE
		]
		if not recipients:
			frappe.throw(
				_(
					"No {0} with an email found for Institute {1}. Add a TPO Contact with role "
					"{0} and an email on the Institute before sending this invite."
				).format(
					frappe.bold(PRIMARY_TPO_ROLE),
					frappe.bold(", ".join(self.institute_names)),
				),
				title=_("No Primary TPO"),
			)

		institutes = self.institute_names
		for contact in recipients:
			# Creates/syncs the Desk User (TPO role only, single TPO workspace).
			#
			# No mail from here in the normal case: the Institute welcome email is
			# where a TPO is told about their account, and it already carries the
			# set-password link. Mailing again on submit is what gave the same
			# person two emails about one login.
			#
			# The exception is a TPO with no User yet — an institute recorded before
			# the welcome mail provisioned accounts, or one whose welcome failed.
			# Handing them Desk access in silence would leave them locked out with
			# no idea an account exists, so that case still gets the mail.
			email = (contact.email or "").strip().lower()
			provision_tpo_user(
				email=contact.email,
				full_name=contact.contact_name,
				enabled=True,
				send_email=not frappe.db.exists("User", email),
			)
			# Reflect the invite on every invited Institute row carrying this email.
			frappe.db.set_value(
				"Institute TPO Contact",
				{"parenttype": "Institute", "parent": ["in", institutes], "email": contact.email},
				"invite_status",
				"Invited",
			)

		# The drive invitation itself, to every TPO contact of the invited institutes.
		# This is the only mail a submit normally sends, and it is about the drive,
		# not about anyone's login — it is configurable (Campus Settings).
		from recruitment.recruitment.tpo_mailers import send_campus_invite

		send_campus_invite(self)

		self.db_set("invite_sent", 1)
		# Advance the drive lifecycle so it surfaces to the invited TPOs. HR later
		# marks it 'Completed' (which hides it from TPOs) when the drive is over.
		if self.status in (None, "", "Draft"):
			self.db_set("status", "Invited")


@frappe.whitelist()
def get_tpo_contacts_for_institutes(institutes):
	"""Read-only TPO Contacts preview for the Campus Invite form."""
	if isinstance(institutes, str):
		institutes = frappe.parse_json(institutes)
	return tpo_contacts_for_institutes(institutes)


def get_invite_institutes(campus_invite):
	"""Institutes invited on `campus_invite` (child-table read, no doc load)."""
	if not campus_invite:
		return []
	return frappe.get_all(
		"Campus Invite Institute",
		filters={
			"parenttype": "Campus Invite",
			"parentfield": "institutes",
			"parent": campus_invite,
		},
		pluck="institute",
		order_by="idx asc",
	)
