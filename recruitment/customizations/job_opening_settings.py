"""Job Opening — Recruitment Settings → Job Posting Settings enforcement.

Registered on the Job Opening `validate` doc_event (see hooks.py) so it runs on
every save path uniformly — Desk UI, APIs, scripted writes and imports. The
settings singleton is read once per save via the cached single doc, so there is
no extra load on save.
"""

import frappe
from frappe import _
from frappe.utils import strip_html


def validate_job_posting_settings(doc, method=None):
    settings = frappe.get_cached_doc("Recruitment Settings")

    # 1) "Make Job Description field mandatory while creating or editing Jobs".
    #    `description` is a Text Editor (HTML) field — strip tags so an "empty"
    #    rich-text value (e.g. "<p></p>") still counts as missing.
    if settings.get("make_job_description_mandatory"):
        if not strip_html(doc.get("description") or "").strip():
            frappe.throw(_("Job Description is mandatory. Please fill it in before saving this Job Opening."))

    # 2) "Restrict Job posting without linked open positions".
    #    A Job Opening is considered *posted* once its status is "Open"; it must
    #    then carry at least one linked position (custom_position_details row).
    if settings.get("restrict_job_posting_without_open_positions") and doc.get("status") == "Open":
        if not (doc.get("custom_position_details") or []):
            frappe.throw(
                _("This Job Opening has no linked positions. Add at least one position "
                  "before posting it (status 'Open').")
            )
