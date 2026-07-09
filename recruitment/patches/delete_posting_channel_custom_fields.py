"""Remove legacy per-channel section fields from Job Opening.

These sections (Careers Page, Refer, IJP, External Recruiter) were replaced by
per-row config fields in the unified `custom_posting_options` child table.
Running this on an instance that never had the old fields is safe — missing
Custom Field names are skipped.
"""
import frappe


_OLD_CUSTOM_FIELDS = [
    # Careers Page section
    "Job Opening-custom_careers_page_section",
    "Job Opening-custom_careers_reapplication_days",
    # Refer section
    "Job Opening-custom_refer_section",
    "Job Opening-custom_refer_assignment_framework",
    "Job Opening-custom_share_job_recipients",
    # IJP section
    "Job Opening-custom_ijp_section",
    "Job Opening-custom_ijp_assignment_applicability",
    "Job Opening-custom_ijp_reapplication_days",
    "Job Opening-custom_ijp_min_tenure",
    "Job Opening-custom_ijp_min_tenure_unit",
    "Job Opening-custom_notify_current_manager_ijp",
    "Job Opening-custom_allow_employee_in_notice_period",
    "Job Opening-custom_allow_employee_in_probation",
    "Job Opening-custom_allow_employee_not_accepted_offer",
    "Job Opening-custom_ijp_additional_info",
    # External Recruiter section (old child table field)
    "Job Opening-custom_external_recruiter_section",
    "Job Opening-custom_external_recruiters",
]

_OLD_PROPERTY_SETTERS = [
    "Job Opening-custom_careers_page_section-collapsible",
    "Job Opening-custom_refer_section-collapsible",
    "Job Opening-custom_ijp_section-collapsible",
    "Job Opening-custom_external_recruiter_section-collapsible",
    "Job Opening-custom_share_job_recipients-hidden",
]


def execute():
    removed_fields = []
    for cf_name in _OLD_CUSTOM_FIELDS:
        if frappe.db.exists("Custom Field", cf_name):
            frappe.delete_doc("Custom Field", cf_name, force=1, ignore_permissions=True)
            removed_fields.append(cf_name)

    removed_setters = []
    for ps_name in _OLD_PROPERTY_SETTERS:
        if frappe.db.exists("Property Setter", ps_name):
            frappe.delete_doc("Property Setter", ps_name, force=1, ignore_permissions=True)
            removed_setters.append(ps_name)

    if removed_fields or removed_setters:
        frappe.db.commit()
        frappe.clear_cache(doctype="Job Opening")

    frappe.logger("recruitment").info(
        "delete_posting_channel_custom_fields: removed %d field(s), %d setter(s): %s %s",
        len(removed_fields), len(removed_setters),
        removed_fields, removed_setters,
    )
