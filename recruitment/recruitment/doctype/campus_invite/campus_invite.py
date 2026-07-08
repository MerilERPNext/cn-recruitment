# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.tpo_access import provision_tpo_user


class CampusInvite(Document):
	def validate(self):
		self._sync_tpo_contacts_from_institute()

	def _sync_tpo_contacts_from_institute(self):
		"""Mirror the selected Institute's TPO Contacts into this doc (read-only)."""
		self.set("tpo_contacts", [])
		if not self.institute:
			return

		contacts = frappe.get_all(
			"Institute TPO Contact",
			filters={"parenttype": "Institute", "parent": self.institute},
			fields=["contact_name", "role", "email", "phone", "invite_status"],
			order_by="idx asc",
		)
		for contact in contacts:
			self.append("tpo_contacts", contact)

	def on_submit(self):
		self._invite_tpos()

	def _invite_tpos(self):
		recipients = [row for row in (self.tpo_contacts or []) if row.email]
		if not recipients:
			frappe.throw(
				_("No TPO with an email found for Institute {0}. Add a TPO Contact with an email first.").format(
					frappe.bold(self.institute)
				)
			)

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
			# Reflect the invite on the source Institute's contact row.
			frappe.db.set_value(
				"Institute TPO Contact",
				{"parenttype": "Institute", "parent": self.institute, "email": contact.email},
				"invite_status",
				"Invited",
			)

		self.db_set("invite_sent", 1)
