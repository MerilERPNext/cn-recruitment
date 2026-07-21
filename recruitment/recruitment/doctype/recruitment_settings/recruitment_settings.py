import frappe
from frappe.model.document import Document

class RecruitmentSettings(Document):
    pass

@frappe.whitelist()
def get_doctype_fields(doctype_name):
    """
    Fetch all fields of a given doctype.
    """
    try:
        if not frappe.db.exists("DocType", doctype_name):
            frappe.throw(f"Doctype {doctype_name} does not exist.")

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
    try:
        meta = frappe.get_meta(doctype_name)
        for df in meta.fields:
            if df.fieldname == fieldname:
                return df.fieldtype  # Return only field type

        return None  # Field not found
    except Exception as e:
        frappe.log_error(f"Error in get_fieldtype: {str(e)}", "Recruitment Settings Error")
        return None
    