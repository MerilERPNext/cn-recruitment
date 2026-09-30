# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Move DPDP Act Settings onto the revised HPCP partner spec.

The portal only accepts ``EMAIL`` / ``SMS`` as the channel, so a legacy ``BOTH`` is
reset. (This patch once also dropped ``:8443`` from the endpoint, as the spec PDF
showed — that was wrong; ``restore_dpdp_external_consent_port`` puts it back.)
"""

import frappe

DOCTYPE = "DPDP Act Settings"


def execute():
    if not frappe.db.exists("DocType", DOCTYPE):
        return

    if frappe.db.get_single_value(DOCTYPE, "consent_channel") not in ("EMAIL", "SMS"):
        frappe.db.set_single_value(DOCTYPE, "consent_channel", "EMAIL")
