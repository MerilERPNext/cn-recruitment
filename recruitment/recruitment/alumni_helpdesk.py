"""Alumni Helpdesk APIs — category-aware ticket creation for the Alumni Portal.

Separated from ``alumni_portal.py`` to keep that module focused on auth, profile,
notifications, and basic ticket list/detail.  This module exposes the richer
HD Category / Subcategory driven creation flow (mirroring the HRMS HelpDesk
RequestIssueModal) without the "Raised For" / "Employee Select" fields.

All endpoints are session-scoped and alumni-only — they reuse the
``_require_alumni_session`` / ``_alumni_email`` helpers from ``alumni_portal``.

Endpoints (call as ``recruitment.recruitment.alumni_helpdesk.<fn>``):
    get_alumni_hd_categories, get_alumni_hd_subcategories,
    create_alumni_hd_ticket, upload_alumni_ticket_attachment
"""

from __future__ import annotations

import html as html_mod

import frappe
from frappe import _

# Re-use the auth gate from the core alumni module.
from recruitment.recruitment.alumni_portal import (
    _alumni_email,
    _require_alumni_session,
)


# ── HD Categories & Subcategories ────────────────────────────────────────────

@frappe.whitelist(methods=["GET"])
def get_alumni_hd_categories() -> dict:
    """Return all top-level HD Category records for the ticket-creation form.

    Only categories that have ``is_group = 1`` (top-level parents) are returned.
    If the doctype lacks an ``is_group`` column (older Helpdesk versions), every
    record is returned instead.
    """
    _require_alumni_session()

    fields = [
        "name",
        "category_name",
    ]

    # Optional fields that may not exist on every site.
    optional = [
        "make_attachment_mandatory",
        "hide_attachment_field",
        "same_attachment_setting_as_category",
    ]
    for f in optional:
        if frappe.db.has_column("HD Category", f):
            fields.append(f)

    filters: dict = {}
    if frappe.db.has_column("HD Category", "is_group"):
        filters["is_group"] = 1

    categories = frappe.get_all(
        "HD Category",
        filters=filters,
        fields=fields,
        order_by="category_name asc",
    )

    return {"success": True, "categories": categories}


@frappe.whitelist(methods=["GET"])
def get_alumni_hd_subcategories(parent_category: str | None = None) -> dict:
    """Return subcategories (``is_group = 0``) under *parent_category*.

    ``parent_category`` is the ``name`` of an HD Category where ``is_group = 1``.
    If ``is_group`` / ``parent_category`` columns don't exist, an empty list is
    returned gracefully.
    """
    _require_alumni_session()

    if not parent_category:
        return {"success": True, "subcategories": []}

    if not frappe.db.has_column("HD Category", "parent_category"):
        return {"success": True, "subcategories": []}

    fields = [
        "name",
        "category_name",
    ]
    optional = [
        "make_attachment_mandatory",
        "hide_attachment_field",
        "same_attachment_setting_as_category",
    ]
    for f in optional:
        if frappe.db.has_column("HD Category", f):
            fields.append(f)

    filters: dict = {"parent_category": parent_category}
    if frappe.db.has_column("HD Category", "is_group"):
        filters["is_group"] = 0

    subcategories = frappe.get_all(
        "HD Category",
        filters=filters,
        fields=fields,
        order_by="category_name asc",
    )

    return {"success": True, "subcategories": subcategories}


# ── Ticket creation ──────────────────────────────────────────────────────────

def _escape(text: str) -> str:
    """HTML-escape user input to prevent XSS in stored ticket descriptions."""
    return html_mod.escape(text or "", quote=True)


def _build_ticket_description(
    title: str,
    description: str,
    attachments: list[dict] | None = None,
) -> str:
    """Build a structured HTML description matching the HelpDesk format.

    The rendered HTML separates Title, Description, and Attachments into
    labelled sections so agents see a clean layout in the Helpdesk desk view.
    """
    parts: list[str] = []

    parts.append(f"<div><strong>Title:</strong></div><div>{_escape(title)}</div>")
    parts.append(
        f"<br/><div><strong>Description:</strong></div><div>{_escape(description)}</div>"
    )

    if attachments:
        items: list[str] = []
        for att in attachments:
            fname = _escape(att.get("file_name", "attachment"))
            furl = _escape(att.get("file_url", ""))
            is_image = any(
                furl.lower().endswith(ext)
                for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg")
            )
            if is_image:
                items.append(
                    f'<li><a href="{furl}" target="_blank">'
                    f'<img src="{furl}" alt="{fname}" style="max-width:300px;max-height:200px;" />'
                    f"<br/>{fname}</a></li>"
                )
            else:
                items.append(
                    f'<li><a href="{furl}" target="_blank">{fname}</a></li>'
                )
        parts.append(
            '<br/><div class="attachments"><strong>Attachments:</strong><ul>'
            + "".join(items)
            + "</ul></div>"
        )

    return "".join(parts)


@frappe.whitelist(methods=["GET"])
def get_alumni_creation_form_json(category: str, sub_category: str | None = None) -> dict:
    """Return the FormIO JSON schema for the given category/subcategory.
    Proxies to the internal HelpDesk API.
    """
    _require_alumni_session()
    
    # We call the existing helpdesk API to ensure consistency
    form_json = frappe.call(
        "pw_helpdesk.customizations.api.ticket.get_creation_form_json",
        category=category,
        sub_category=sub_category,
    )
    return form_json


@frappe.whitelist(methods=["POST"])
def create_alumni_hd_ticket(
    subject: str | None = None,
    description: str | None = None,
    category: str | None = None,
    sub_category: str | None = None,
    attachments: str | None = None,
    creation_form_data: str | None = None,
) -> dict:
    """Create an HD Ticket for the logged-in alumnus.

    Mirrors the HelpDesk ``RequestIssueModal`` payload shape but without the
    "Raised For" / employee fields — the ticket is always raised by (and for)
    the current alumnus.

    Parameters:
        subject: Ticket subject (required).
        description: Free-text description.
        category: HD Category ``name`` (custom_category).
        sub_category: HD Category ``name`` (custom_sub_category).
        attachments: JSON-encoded list of ``{file_url, file_name}`` dicts
                     (files already uploaded via ``upload_alumni_ticket_attachment``).
        creation_form_data: JSON-encoded string from FormIO dynamic fields.
    """
    user = _require_alumni_session()
    email = _alumni_email(user)

    if not subject or not (subject or "").strip():
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("Subject is required.")}

    subject = (subject or "").strip()
    desc_text = (description or "").strip()

    # Parse attachments JSON.
    att_list: list[dict] = []
    if attachments:
        try:
            att_list = frappe.parse_json(attachments)
            if not isinstance(att_list, list):
                att_list = []
        except Exception:
            att_list = []

    # Build structured description.
    structured_desc = _build_ticket_description(subject, desc_text, att_list)

    doc_dict: dict = {
        "doctype": "HD Ticket",
        "subject": subject,
        "description": structured_desc,
        "raised_by": email,
    }

    # Map to custom category / sub_category if the fields exist.
    if category and frappe.db.has_column("HD Ticket", "custom_category"):
        if frappe.db.exists("HD Category", category):
            doc_dict["custom_category"] = category
    if sub_category and frappe.db.has_column("HD Ticket", "custom_sub_category"):
        if frappe.db.exists("HD Category", sub_category):
            doc_dict["custom_sub_category"] = sub_category

    # Also set legacy ticket_type if the category resolves to an HD Ticket Type.
    if category and frappe.db.exists("HD Ticket Type", category):
        doc_dict["ticket_type"] = category

    if creation_form_data and frappe.db.has_column("HD Ticket", "creation_form_data"):
        doc_dict["creation_form_data"] = creation_form_data

    try:
        doc = frappe.get_doc(doc_dict)
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "alumni create_alumni_hd_ticket failed")
        frappe.local.response["http_status_code"] = 500
        return {"success": False, "message": _("Unable to create the ticket right now.")}

    return {
        "success": True,
        "name": doc.name,
        "status": doc.status,
        "message": _("Your ticket has been raised."),
    }


# ── File upload ──────────────────────────────────────────────────────────────

@frappe.whitelist(methods=["POST"])
def upload_alumni_ticket_attachment() -> dict:
    """Upload a single file for use in an alumni ticket.

    Accepts ``multipart/form-data`` with the file in the ``file`` field.
    Returns the saved ``file_url`` and ``file_name`` so the frontend can embed
    them in the ticket-creation payload.
    """
    _require_alumni_session()

    uploaded = None
    if getattr(frappe, "request", None) and getattr(frappe.request, "files", None):
        uploaded = (
            frappe.request.files.get("file")
            or frappe.request.files.get("attachment")
        )

    if not uploaded:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("No file was provided.")}

    try:
        from frappe.utils.file_manager import save_file

        content = uploaded.stream.read()
        saved = save_file(
            uploaded.filename or "attachment",
            content,
            # Attach to no specific doc — just store publicly.
            dt=None,
            dn=None,
            is_private=0,
        )
        return {
            "success": True,
            "file_url": saved.file_url,
            "file_name": saved.file_name,
        }
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "alumni upload_alumni_ticket_attachment failed"
        )
        frappe.local.response["http_status_code"] = 500
        return {"success": False, "message": _("Unable to upload the file.")}

@frappe.whitelist(methods=["POST"])
def delete_alumni_ticket_attachment(file_url: str) -> dict:
    """Delete an uploaded attachment using its file_url.
    """
    _require_alumni_session()

    if not file_url:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("file_url is required.")}

    try:
        from frappe.utils.file_manager import remove_file
        
        # Find the File document for this url
        file_doc = frappe.get_all("File", filters={"file_url": file_url}, limit=1)
        if not file_doc:
            return {"success": True, "message": _("File not found or already deleted.")}
            
        # We use remove_file to ensure both DB and filesystem are cleaned
        remove_file(fid=file_doc[0].name)
        return {"success": True, "message": _("File deleted successfully.")}
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "alumni delete_alumni_ticket_attachment failed"
        )
        frappe.local.response["http_status_code"] = 500
        return {"success": False, "message": _("Unable to delete the file.")}

@frappe.whitelist(methods=["GET", "POST"])
def download_alumni_ticket_attachment(file_url: str):
    """Download an uploaded attachment using its file_url.
    """
    _require_alumni_session()
    
    if not file_url:
        frappe.local.response["http_status_code"] = 400
        return {"success": False, "message": _("file_url is required.")}
        
    # Standard Frappe routing usually handles /files/... downloads.
    # This endpoint is provided if the frontend explicitly needs an API wrapper.
    frappe.local.response.filename = file_url.split("/")[-1]
    frappe.local.response.filecontent = frappe.get_file_content(file_url)
    frappe.local.response.type = "download"
