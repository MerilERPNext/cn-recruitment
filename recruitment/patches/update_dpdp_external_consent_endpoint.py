# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Move DPDP Act Settings onto the revised HPCP partner spec.

The portal dropped the ``:8443`` port from its consent-start endpoint and only
accepts ``EMAIL`` / ``SMS`` as the channel. Only the exact old seeded endpoint is
rewritten — a URL someone configured by hand is left alone.
"""

import frappe

DOCTYPE = "DPDP Act Settings"

OLD_URL = "https://uat-hpcp.homefirstindia.com:8443/hpcp/partner/consent/start"
NEW_URL = "https://uat-hpcp.homefirstindia.com/hpcp/partner/consent/start"


def execute():
    if not frappe.db.exists("DocType", DOCTYPE):
        return

    if frappe.db.get_single_value(DOCTYPE, "consent_start_url") == OLD_URL:
        frappe.db.set_single_value(DOCTYPE, "consent_start_url", NEW_URL)

    if frappe.db.get_single_value(DOCTYPE, "consent_channel") not in ("EMAIL", "SMS"):
        frappe.db.set_single_value(DOCTYPE, "consent_channel", "EMAIL")
