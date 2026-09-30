# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Seed the non-secret defaults of the external DPDP consent integration.

A Single that already exists in the database does not pick up the ``default`` on a
newly added field — it simply has no value for it. Without this, every site would
open DPDP Act Settings to a blank External Portal section and have to retype the
endpoint, org id and configuration code by hand.

Only the non-secret, environment-shaped values are seeded, and only where the field
is still empty, so a site that has already configured itself is never overwritten.
Credentials (Partner Username / Password) and the Callback Secret are deliberately
NOT seeded — they are per-environment secrets and belong in Settings, entered by the
integration owner, never in the repository.

The consent mode itself is left alone: sites keep running the internal form until
someone explicitly switches them over.
"""

import frappe

DOCTYPE = "DPDP Act Settings"

DEFAULTS = {
    "consent_mode": "Internal Form",
    "consent_start_url": "https://uat-hpcp.homefirstindia.com:8443/hpcp/partner/consent/start",
    "org_id": "HRMS",
    "configuration_code": "EMPLOYEE_ONBOARDING",
    "consent_channel": "EMAIL",
    "request_timeout": 30,
    "callback_header_name": "X-Consent-Token",
    "return_url_template": "/action-center",
    "session_validity_minutes": 30,
}


def execute():
    if not frappe.db.exists("DocType", DOCTYPE):
        return

    meta = frappe.get_meta(DOCTYPE)
    for field, value in DEFAULTS.items():
        if not meta.get_field(field):
            continue
        if frappe.db.get_single_value(DOCTYPE, field) in (None, ""):
            frappe.db.set_single_value(DOCTYPE, field, value)
