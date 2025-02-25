import frappe

def populate_verification_documents(doc, method):
    fields = frappe.get_meta("Employee Onboarding").fields

    attachment_fields = [
        field for field in fields if field.fieldtype in ["Attach", "Attach Image"] and not field.hidden
    ]

    # Populate the child table with document details and their actual attachments
    for field in attachment_fields:
        attachment_value = doc.get(field.fieldname) 
        doc.append("custom_documents_for_verification", {
            "document": field.label,  # Use the field label as the document name
            "fieldname": field.fieldname,  # Store the actual fieldname of the attachment field
            "attachments": attachment_value or "",  # Add the attachment file path or leave empty if none
            "status": "Pending"  # Default status
        })

    doc.save()
