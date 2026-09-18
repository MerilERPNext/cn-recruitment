# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

"""Pendo Popup — a mandatory, admin-configured announcement shown to every
employee after login (see recruitment.api.pendo.get_active_pendo for the
resolution logic: validity window + frequency + Pendo Popup Response log).

Dismissable, not blocking: Act, Decline, and the close (X) all just record a
Pendo Popup Response and close the popup — nothing else in ESS is gated on
it. What brings it back is the `frequency` field, evaluated against the
employee's own last response, not whether they've "completed" anything.
"""

import frappe
from frappe.model.document import Document


class PendoPopup(Document):
	pass
