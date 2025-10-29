import frappe

def update_verification_documents(doc, method):
    fields = frappe.get_meta("Employee Onboarding").fields

    # Fetch all attachment fields from the Employee Onboarding doctype
    attachment_fields = [
        field for field in fields if field.fieldtype in ["Attach", "Attach Image"] and not field.hidden
    ]
    existing_docs = {row.fieldname: row for row in doc.get("custom_documents_for_verification", [])}

    for field in attachment_fields:
        fieldname = field.fieldname
        attachment_value = doc.get(fieldname)  

        if fieldname in existing_docs:
            child_row = existing_docs[fieldname]
            if child_row.attachments != attachment_value:
                child_row.attachments = attachment_value or ""  
                child_row.status = "Pending" if attachment_value else ""
        else:
            # If it's a new attachment, add it to the child table
            doc.append("custom_documents_for_verification", {
                "document": field.label,
                "fieldname": fieldname,
                "attachments": attachment_value or "",
                "status": "Pending" if attachment_value else "",
            })
    
    # Instead of removing rows, just clear the attachment field when it's empty
    for row in doc.get("custom_documents_for_verification", []):
        if not doc.get(row.fieldname):  
            row.attachments = ""  
            row.status = "Pending" if row.attachments else ""


