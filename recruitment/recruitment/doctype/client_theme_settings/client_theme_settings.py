# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

"""Client Theme Settings — the backend source of truth for the app's design
tokens (see recruitment.api.theme.get_client_theme).

HOW TO ADD A NEW CLIENT
    Create one or two records (one per Mode: Light / Dark) with the same
    `client` value. Leave any color blank to inherit the platform default for
    that token. Tick "Is Default" on each so the client's theme is actually
    served (a client with records but none marked default falls through to
    the platform default, same as having no records at all).

HOW TO ACTIVATE A CLIENT SITE-WIDE
    Set Recruitment Settings -> "Active Client" to that client's exact
    `client` value. Leave it blank to serve the platform default to everyone.

HOW TO ADD A NEW THEME FOR AN EXISTING CLIENT (e.g. a seasonal palette)
    Create another record with the same `client` and `mode` but a new
    `theme_key`/`theme_name`. It stays inactive (available, not served) until
    an admin ticks "Is Default" on it -- which automatically un-ticks the
    previous default for that same Client + Mode (see `validate()` below).
"""

import frappe
from frappe import _
from frappe.model.document import Document


class ClientThemeSettings(Document):
	def validate(self):
		self.validate_unique_theme_key()
		self.apply_exclusive_default()

	def validate_unique_theme_key(self):
		"""One `theme_key` per `client` -- the API resolves a theme by
		(client, theme_key), so a duplicate would be ambiguous."""
		duplicate = frappe.db.exists(
			"Client Theme Settings",
			{
				"client": self.client or "",
				"theme_key": self.theme_key,
				"name": ["!=", self.name],
			},
		)
		if duplicate:
			frappe.throw(
				_("A theme with key {0} already exists for client {1}.").format(
					frappe.bold(self.theme_key), frappe.bold(self.client or _("(platform default)"))
				)
			)

	def apply_exclusive_default(self):
		"""Only one theme may be the active default for a given (client, mode)
		pair -- mirrors the standard "single default per group" pattern (e.g. a
		default address). Un-sets the flag on every sibling sharing the same
		client + mode, rather than requiring the admin to do it by hand."""
		if not self.is_default:
			return

		frappe.db.set_value(
			"Client Theme Settings",
			{
				"client": self.client or "",
				"mode": self.mode,
				"is_default": 1,
				"name": ["!=", self.name],
			},
			"is_default",
			0,
		)
