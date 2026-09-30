# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Put ``:8443`` back on the HPCP UAT consent-start endpoint.

The partner spec PDF printed the endpoint without a port, and an earlier patch
followed it. HPCP has since confirmed the UAT API is served on 8443 — port 443 is
their static frontend and answers 403/405. Only the exact portless UAT URL is
rewritten; anything configured by hand (e.g. a production endpoint) is left alone.
"""

import frappe

DOCTYPE = "DPDP Act Settings"

PORTLESS_URL = "https://uat-hpcp.homefirstindia.com/hpcp/partner/consent/start"
UAT_URL = "https://uat-hpcp.homefirstindia.com:8443/hpcp/partner/consent/start"


def execute():
    if not frappe.db.exists("DocType", DOCTYPE):
        return

    current = (frappe.db.get_single_value(DOCTYPE, "consent_start_url") or "").strip().rstrip("/")
    if current == PORTLESS_URL:
        frappe.db.set_single_value(DOCTYPE, "consent_start_url", UAT_URL)
