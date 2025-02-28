import frappe
from frappe.utils.file_manager import save_file
import base64
import json
import re

def save_document_attachment(doc, field_name, document_data):
    if isinstance(document_data, str):
        document_data = json.loads(document_data)
    if isinstance(document_data, list) and len(document_data) > 0:
        document_data = document_data[0]
        file_content = base64.b64decode(document_data["url"].split(",")[1])
        filename = document_data["name"]
        saved_file = save_file(
            filename,
            file_content,
            dt=doc['doctype'],
            dn=doc['name'],
            df=field_name,
            is_private=1
        )
        return saved_file.file_url
    return None


def update_rejected_documents(variables):
    documents = variables.get("documents", {})
    doc_data = variables.get("doc_data", {})

    if not doc_data or not documents:
        return

    # Fetch the Employee Onboarding document
    onboarding_doc = frappe.get_doc(doc_data["doctype"], doc_data["name"])
    onboarding_doc.flags.ignore_validate_update_after_submit = True
    onboarding_doc.flags.ignore_permissions = True

    # Update Child Table (custom_documents_for_verification)
    for document in onboarding_doc.get("custom_documents_for_verification", []):
        fieldname = document.get("fieldname")  # Fetch fieldname from child table
        document_name = document.get("document")

        if not fieldname:
            continue  # Skip if fieldname is missing

        # Ensure the key matches the expected document input key
        if fieldname in documents:
            file_url = save_document_attachment(doc_data, fieldname, documents[fieldname])
            if file_url:
                document.attachments = file_url  # Update child table
                document.status = "Pending"  # Set status to Pending
                onboarding_doc.set(fieldname, file_url)  # Update main doctype field

    # Save the updated document
    onboarding_doc.save(ignore_permissions=True, ignore_version=True)