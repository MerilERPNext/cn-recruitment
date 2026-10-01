# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class MicrosoftTeamsAppSettings(Document):
	pass


@frappe.whitelist()
def is_teams_enabled():
    return frappe.db.get_single_value("Microsoft Teams App Settings", "enable")
