# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

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
	"""
	institutes = [i for i in (institutes or []) if i]
	if not institutes:
		return []

	contacts = frappe.get_all(
		"Institute TPO Contact",
		filters={"parenttype": "Institute", "parent": ["in", institutes]},
		fields=["contact_name", "role", "email", "phone", "invite_status"],
		order_by="parent asc, idx asc",
	)
	# Stable sort: Primary TPOs first, everyone else keeps institute/row order.
	contacts.sort(key=lambda c: 0 if c.role == PRIMARY_TPO_ROLE else 1)

	seen = set()
	deduped = []
	for contact in contacts:
		key = (contact.email or "").strip().lower()
		if key:
			if key in seen:
				continue
			seen.add(key)
		deduped.append(contact)
	return deduped


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
		from frappe.utils import formatdate, getdate, nowdate

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
					"Every institute on this invite is already running a live campus drive "
					"({0}). Their registration is closed by the drive, so the deadline can no "
					"longer be changed."
				).format(frappe.bold(", ".join(f"{i} → {locked[i]}" for i in invited))),
				title=_("Drives Already Live"),
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
			frappe.msgprint(
				_("Deadline updated for {0}. {1} already have a live drive — their "
				  "registration stays closed.").format(
					frappe.bold(", ".join(still_open)),
					frappe.bold(", ".join(i for i in invited if i in locked)),
				),
				title=_("Applies to the institutes still open"), indicator="orange",
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
			# Creates/syncs the Desk User (TPO role only, single TPO workspace) and
			# emails a "set your password" link, using the template configured in
			# Campus Settings -> TPO Set Password Email Template.
			provision_tpo_user(
				email=contact.email,
				full_name=contact.contact_name,
				enabled=True,
				send_email=True,
			)
			# Reflect the invite on every invited Institute row carrying this email.
			frappe.db.set_value(
				"Institute TPO Contact",
				{"parenttype": "Institute", "parent": ["in", institutes], "email": contact.email},
				"invite_status",
				"Invited",
			)

		# The drive invitation itself, to every TPO contact of the invited institutes.
		# Separate from the set-password mail above: that one is about their login,
		# this one is about the drive — and it is configurable (Campus Settings).
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
