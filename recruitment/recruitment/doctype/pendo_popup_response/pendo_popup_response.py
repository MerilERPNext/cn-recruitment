# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

"""Pendo Popup Response — one row per employee interaction (Act / Decline /
Close) with a Pendo Popup. Written only by
recruitment.api.pendo.respond_to_pendo, and read back by
recruitment.api.pendo.get_active_pendo to decide whether the popup is due to
reappear, per the popup's own `frequency` setting.
"""

import frappe
from frappe.model.document import Document


class PendoPopupResponse(Document):
	pass
