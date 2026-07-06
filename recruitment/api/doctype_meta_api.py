import frappe
from frappe import _

# Allowlist of doctypes this endpoint is permitted to expose field metadata for.
# The recruitment mobile app only ever requests these HR request forms; any
# other ``doctype_name`` is rejected so the endpoint cannot be used to enumerate
# the backend data model by tampering with the parameter.
ALLOWED_META_DOCTYPES = frozenset({
    "Attendance Request",
    "Employee Advance",
    "Employee Benefit Claim",
    "Leave Application",
    "Loan Application",
    "Shift Request",
    "Overtime Child table",
    "Planned Overtime Request",
})


@frappe.whitelist()
def get_doctype_with_custom_fields(doctype_name):
    if not doctype_name:
        frappe.throw(_("Doctype name is required"))

    # Enforce the allowlist BEFORE any lookup so the response is identical for
    # "not allowed" and "does not exist" -- no information about the data model
    # leaks for tampered/probed doctype names.
    if doctype_name not in ALLOWED_META_DOCTYPES:
        frappe.throw(
            _("Not permitted to read {0}").format(doctype_name),
            frappe.PermissionError,
        )

    # Defense in depth: still honour the caller's actual read permission on the
    # (allowlisted) doctype.
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






