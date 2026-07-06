"""Delete the legacy 'Posting channels' tab and its orphaned fields.

custom_requirement (Tab Break 'Posting channels') was created outside the
fixture system. Its four child fields (custom_employee_type, custom_location,
custom_column_break_vrkvr, custom_work_experience) are not in the field_order
and duplicate data already captured elsewhere. All content that should appear
in Job posting (job boards, social networks, custom sources) is already
positioned there via the field_order property setter.
"""
import frappe

_DELETE_FIELDS = [
    "Job Opening-custom_requirement",
    "Job Opening-custom_employee_type",
    "Job Opening-custom_location",
    "Job Opening-custom_column_break_vrkvr",
    "Job Opening-custom_work_experience",
]

_DELETE_SETTERS = [
    "Job Opening-custom_requirement-hidden",
]


def execute():
    removed = []
    for cf_name in _DELETE_FIELDS:
        if frappe.db.exists("Custom Field", cf_name):
            frappe.delete_doc("Custom Field", cf_name, force=1, ignore_permissions=True)
            removed.append(cf_name)

    for ps_name in _DELETE_SETTERS:
        if frappe.db.exists("Property Setter", ps_name):
            frappe.delete_doc("Property Setter", ps_name, force=1, ignore_permissions=True)
            removed.append(ps_name)

    if removed:
        frappe.db.commit()
        frappe.clear_cache(doctype="Job Opening")
        frappe.logger("recruitment").info("delete_posting_channels_tab: removed %s", removed)
