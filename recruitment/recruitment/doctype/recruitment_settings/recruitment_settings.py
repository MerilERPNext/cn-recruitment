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
            if df.fieldname:  # Ensure fieldname exists
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



@frappe.whitelist()
def map_fields_after_insert(doc, method):
    """
    After insert, dynamically map fields from source_doctype to target_doctype based on recruitment_tool child table.
    """
    try:
        recruitment_settings = frappe.get_single("Recruitment Settings")

        for row in recruitment_settings.recruitment_tool:
            source_field_name = row.source_field.split('(')[-1].split(')')[0]  # Extract fieldname only
            target_field_name = row.target_field.split('(')[-1].split(')')[0]  # Extract fieldname only
            
            link_field = None

            if row.target_doctype == doc.doctype:
                
                if row.source_doctype == "Employee Onboarding" and doc.doctype == "Employee":
                    link_field = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")

                elif row.source_doctype == "Job Requisition" and doc.doctype == "Job Applicant":
                    link_field = doc.custom_job_requisition

                elif row.source_doctype == "Job Applicant" and doc.doctype == "Job Offer":
                    link_field = doc.job_applicant
                elif row.source_doctype == "Job Offer" and doc.doctype == "Employee Onboarding":
                    link_field = doc.job_offer
                elif row.source_doctype == "Job Offer" and doc.doctype == "Employee":
                    emp_on = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")
                    link_field = frappe.get_value("Employee Onboarding", {"name": emp_on}, "job_offer")
                elif row.source_doctype == "Job Applicant" and doc.doctype == "Employee":
                    emp_on = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")
                    link_field = frappe.get_value("Employee Onboarding", {"name": emp_on}, "job_applicant")

                if link_field:
                    try:
                        source_doc = frappe.get_doc(row.source_doctype, link_field)
                    except Exception:
                        continue  # Skip if source document is not found

                    if source_doc:
                        source_value = source_doc.get(source_field_name)

                        if source_value:
                            doc.set(target_field_name, source_value)
                            frappe.msgprint(f"✅ {source_field_name} copied from `{row.source_doctype}` to `{target_field_name}` in `{row.target_doctype}`")
    except Exception as e:
        frappe.log_error(f"Error in field mapping: {str(e)}", "Recruitment Mapping Error")


@frappe.whitelist()
def map_fields_before_save(doc, method):
    """
    Before save, dynamically map fields from source_doctype to target_doctype.
    """
    try:
        recruitment_settings = frappe.get_single("Recruitment Settings")

        for row in recruitment_settings.recruitment_tool:
            source_field_name = row.source_field.split('(')[-1].split(')')[0]
            target_field_name = row.target_field.split('(')[-1].split(')')[0]
            
            link_field = None

            if row.target_doctype == doc.doctype:
                
                if row.source_doctype == "Employee Onboarding" and doc.doctype == "Employee":
                    link_field = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")

                elif row.source_doctype == "Job Requisition" and doc.doctype == "Job Applicant":
                    link_field = doc.custom_job_requisition

                elif row.source_doctype == "Job Applicant" and doc.doctype == "Job Offer":
                    link_field = doc.job_applicant
                elif row.source_doctype == "Job Offer" and doc.doctype == "Employee Onboarding":
                    link_field = doc.job_offer
                elif row.source_doctype == "Job Offer" and doc.doctype == "Employee":
                    emp_on = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")
                    link_field = frappe.get_value("Employee Onboarding", {"name": emp_on}, "job_offer")
                elif row.source_doctype == "Job Applicant" and doc.doctype == "Employee":
                    emp_on = frappe.get_value("Employee Onboarding", {"employee": doc.name}, "name")
                    link_field = frappe.get_value("Employee Onboarding", {"name": emp_on}, "job_applicant")

                if link_field:
                    try:
                        source_doc = frappe.get_doc(row.source_doctype, link_field)
                    except Exception:
                        continue  # Skip if source document is not found

                    if source_doc:
                        source_value = source_doc.get(source_field_name)

                        if source_value:
                            doc.set(target_field_name, source_value)
                            frappe.msgprint(f"✅ {source_field_name} copied from `{row.source_doctype}` to `{target_field_name}` in `{row.target_doctype}`")
    except Exception as e:
        frappe.log_error(f"Error in before_save mapping: {str(e)}", "Recruitment Mapping Error")




