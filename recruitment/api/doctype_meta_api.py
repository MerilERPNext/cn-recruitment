import frappe
from frappe import _

@frappe.whitelist()
def get_doctype_with_custom_fields(doctype_name):
    if not doctype_name:
        frappe.throw(_("Doctype name is required"))

    if not frappe.has_permission(doctype_name, "read"):
        frappe.throw(
            _("Not permitted to read {0}").format(doctype_name),
            frappe.PermissionError,
        )

    meta = frappe.get_meta(doctype_name)
    standard_fields = [{
        "fieldname": f.fieldname,
        "label": f.label,
        "fieldtype": f.fieldtype,
        "reqd": f.reqd,
        "hidden": f.hidden,
        "options": f.options,
    } for f in meta.fields]

    custom_fields = frappe.get_all("Custom Field", filters={"dt": doctype_name}, 
                                  fields=["fieldname", "label", "fieldtype", "reqd", "hidden", "options"])

    combined = standard_fields + custom_fields

    unique_fields = {}
    for field in combined:
        if field["fieldname"] not in unique_fields:
            unique_fields[field["fieldname"]] = field

    return {
        "doctype": doctype_name,
        "fields": list(unique_fields.values())
    }






