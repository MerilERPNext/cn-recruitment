import frappe
from frappe import _
from frappe.model.document import Document

# Metadata-enumeration fix: the Recruitment Settings admin form only ever asks
# for field metadata of this bounded set of recruitment business doctypes (the
# `source_doctype` / `target_doctype` pickers are hard-filtered to these in
# recruitment_settings.js, plus "Job Opening" for the job-posting column config).
# Any other `doctype_name` is rejected so these whitelisted endpoints cannot be
# abused to enumerate the backend data model.
ALLOWED_META_DOCTYPES = frozenset({
    "Job Requisition",
    "Job Applicant",
    "Job Offer",
    "Employee Onboarding",
    "Employee",
    "Job Opening",
})


def _guard_meta_doctype(doctype_name):
    """Enforce the allowlist BEFORE any get_meta/db lookup so no information about
    the data model leaks for tampered/probed doctype names, and require the caller
    to actually have read permission on the (allowlisted) doctype."""
    if not doctype_name or doctype_name not in ALLOWED_META_DOCTYPES or not frappe.has_permission(
        doctype_name, "read"
    ):
        frappe.throw(
            _("Not permitted to read {0}").format(doctype_name),
            frappe.PermissionError,
        )


class RecruitmentSettings(Document):
    pass

@frappe.whitelist()
def get_doctype_fields(doctype_name):
    """
    Fetch all fields of a given doctype.
    """
    # Metadata-enumeration fix: allowlist + permission gate before any lookup.
    _guard_meta_doctype(doctype_name)
    try:
        meta = frappe.get_meta(doctype_name)
        fields = []

        for df in meta.fields:
            if df.fieldname:  
                fields.append({
                    'fieldname': df.fieldname,
                    'label': df.label if df.label else df.fieldname,
                    'fieldtype': df.fieldtype
                })

        if not fields:
            frappe.throw(f"No fields found for Doctype {doctype_name}.")

        return fields

    except Exception as e:
        frappe.log_error(f"Error in get_doctype_fields: {str(e)}", "Recruitment Settings Error")
        return []


@frappe.whitelist()
def get_fieldtype(doctype_name, fieldname):
    """
    Fetch the fieldtype of a given field in a Doctype.
    """
    # Metadata-enumeration fix: allowlist + permission gate before any lookup.
    _guard_meta_doctype(doctype_name)
    try:
        meta = frappe.get_meta(doctype_name)
        for df in meta.fields:
            if df.fieldname == fieldname:
                return df.fieldtype  # Return only field type

        return None  # Field not found
    except Exception as e:
        frappe.log_error(f"Error in get_fieldtype: {str(e)}", "Recruitment Settings Error")
        return None
    