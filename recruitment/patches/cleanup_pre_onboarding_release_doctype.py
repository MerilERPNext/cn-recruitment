import frappe


def execute():
    """Removes leftover database references to the deleted `Pre Onboarding Release`
    doctype. The on-disk doctype files have been removed but the DocType row,
    its table, and any Custom DocType Link / Property Setter rows pointing to
    it remain in the DB, which makes form views on related doctypes fail with
    'DocType not found' because Frappe still tries to load the (now-missing)
    controller module via doctype connections."""

    target = "Pre Onboarding Release"

    # Custom DocType Link rows that reference the deleted doctype (sidebar
    # connections, dashboard links, etc.).
    try:
        link_rows = frappe.get_all(
            "Custom DocType Link",
            filters={"link_doctype": target},
            pluck="name",
        )
        for row in link_rows:
            frappe.delete_doc("Custom DocType Link", row, force=1, ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: Custom DocType Link cleanup failed")

    # Property Setters that target the deleted doctype directly.
    try:
        ps_rows = frappe.get_all(
            "Property Setter",
            filters={"doc_type": target},
            pluck="name",
        )
        for row in ps_rows:
            frappe.delete_doc("Property Setter", row, force=1, ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: Property Setter cleanup failed")

    # Custom Fields that target the deleted doctype.
    try:
        cf_rows = frappe.get_all(
            "Custom Field",
            filters={"dt": target},
            pluck="name",
        )
        for row in cf_rows:
            frappe.delete_doc("Custom Field", row, force=1, ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: Custom Field cleanup failed")

    # Custom Fields that point at the deleted doctype via their `options` (Link/Table fields).
    try:
        linking_cfs = frappe.get_all(
            "Custom Field",
            filters={"options": target},
            pluck="name",
        )
        for row in linking_cfs:
            frappe.delete_doc("Custom Field", row, force=1, ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: linking Custom Field cleanup failed")

    # The DocType row itself + its backing table.
    try:
        if frappe.db.exists("DocType", target):
            frappe.delete_doc("DocType", target, force=1, ignore_permissions=True, ignore_missing=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: DocType deletion failed")

    try:
        if frappe.db.table_exists(target):
            frappe.db.sql(f"DROP TABLE IF EXISTS `tab{target}`")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "cleanup_pre_onboarding_release: table drop failed")

    frappe.db.commit()
    frappe.clear_cache()
