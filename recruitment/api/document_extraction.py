import frappe

from chatnext_expense_trips.document_extraction.api import (
    extract_document_fields,
    extract_document_fields_from_base64,
)


@frappe.whitelist()
def extract_recruitment_document_fields(file_url=None, text=None, profile="recruitment_device"):
    return extract_document_fields(file_url=file_url, text=text, profile=profile)


@frappe.whitelist()
def extract_recruitment_document_fields_from_base64(
    file_name=None,
    content=None,
    profile="recruitment_device",
):
    return extract_document_fields_from_base64(
        file_name=file_name,
        content=content,
        profile=profile,
    )
