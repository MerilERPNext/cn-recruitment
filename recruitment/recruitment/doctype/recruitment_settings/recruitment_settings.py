import frappe
from frappe.model.document import Document

class RecruitmentSettings(Document):
    def validate(self):
        self.validate_duplicate_fields()

    def validate_duplicate_fields(self):
        if not self.basic_info_funnel:
            return

        field_map = {}
        for row in self.basic_info_funnel:
            if row.fieldname:
                if row.fieldname in field_map:
                    field_map[row.fieldname]["count"] += 1
                else:
                    field_map[row.fieldname] = {
                        "count": 1,
                        "label": row.field_label or row.fieldname
                    }

        duplicates = [
            v["label"]
            for k, v in field_map.items()
            if v["count"] > 1
        ]

        if duplicates:
            frappe.throw(
                f"The following fields are repeated multiple times in Basic Info Funnel: <br><b>{', '.join(duplicates)}</b><br>Please remove duplicates."
            )



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
    