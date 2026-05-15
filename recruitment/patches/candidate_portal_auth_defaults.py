import frappe


def execute():
    from recruitment.recruitment.doctype.candidate_portal_auth_settings.candidate_portal_auth_settings import (
        get_settings,
    )

    if not frappe.db.exists("DocType", "Candidate Portal Auth Settings"):
        return

    get_settings()
