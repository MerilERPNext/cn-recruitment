# Copyright (c) 2026, Walnut and contributors
# For license information, please see license.txt

import frappe

# `Campus Settings` is a Single whose `tpo_welcome_email_template` and
# `campus_invite_email_template` fields default to these two Email Templates.
# `init_singles()` creates that Single from inside `add_to_installed_apps()`, which runs
# *before* `sync_fixtures()` — so shipping them as fixtures is too late and the install
# dies on `LinkValidationError: Could not find TPO Welcome Email Template`.
# They are created here instead, before anything else in the install runs.
#
# The bodies below are placeholders. Export the production copies with
#   bench --site <prod> export-doc "Email Template" "TPO Welcome"
# and replace them before this app is used for real correspondence.

_PLACEHOLDER = (
	"<p><em>Placeholder created during the v16 upgrade — the production copy of this "
	"template was never committed to the app. Replace this body before use.</em></p>"
)

EMAIL_TEMPLATES = (
	("TPO Welcome", "Welcome to the campus placement programme"),
	("Campus Invite", "Invitation to participate in our campus drive"),
)


def before_install():
	"""Create the Email Templates that Campus Settings' defaults link to."""
	for name, subject in EMAIL_TEMPLATES:
		if frappe.db.exists("Email Template", name):
			continue

		frappe.get_doc(
			{
				"doctype": "Email Template",
				"__newname": name,
				"subject": subject,
				"response": _PLACEHOLDER,
				"use_html": 0,
			}
		).insert(ignore_permissions=True)
