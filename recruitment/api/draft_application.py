"""Draft Application API.

Endpoints:
    save_draft(job_applicant_email)        -> upsert a Draft Application with a
        JSON snapshot of the matching Job Applicant. Status is auto-derived
        from Job Applicant.docstatus (0 -> Pending, 1 -> Completed). A
        previously set 'Rejected' is preserved across saves.

    get_draft(job_applicant_email)         -> return the stored snapshot so the
        UI can prefill the form on reopen.

    delete_applicant(job_applicant_email)  -> delete the Job Applicant document
        and its associated Draft Application (if any).
"""

import json

import frappe

DOCTYPENAME = "Draft Application"


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": None}


def _serialize(doc):
    try:
        form_data = json.loads(doc.form_data) if doc.form_data else {}
    except (TypeError, ValueError):
        form_data = {}
    return {
        "name": doc.name,
        "job_applicant_email": doc.job_applicant_email,
        "status": doc.status,
        "form_data": form_data,
        "creation": doc.creation,
        "modified": doc.modified,
    }


@frappe.whitelist(allow_guest=True)
def save_draft(job_applicant_email):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    email = job_applicant_email.strip()

    applicant = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
    if not applicant:
        return _err(f"No Job Applicant found for '{email}'.", 404)

    job_applicant = frappe.get_doc("Job Applicant", applicant)
    snapshot = json.dumps(
        job_applicant.as_dict(convert_dates_to_str=True), default=str
    )

    docstatus = int(job_applicant.docstatus or 0)
    derived_status = "Pending" if docstatus == 0 else "Completed" if docstatus == 1 else None

    existing = frappe.db.get_value(DOCTYPENAME, {"job_applicant_email": email}, "name")

    try:
        if existing:
            doc = frappe.get_doc(DOCTYPENAME, existing)
            doc.form_data = snapshot
            if derived_status and doc.status != "Rejected":
                doc.status = derived_status
            doc.save(ignore_permissions=True)
            created = False
        else:
            doc = frappe.get_doc({
                "doctype": DOCTYPENAME,
                "job_applicant_email": email,
                "status": derived_status or "Pending",
                "form_data": snapshot,
            })
            doc.insert(ignore_permissions=True)
            created = True

        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Draft Application save_draft failed")
        return _err("Unable to save Draft Application right now.", 500)

    return _ok(
        "Draft Application created." if created else "Draft Application updated.",
        _serialize(doc),
        http=201 if created else 200,
    )


@frappe.whitelist(allow_guest=True)
def get_draft(job_applicant_email):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    email = job_applicant_email.strip()

    name = frappe.db.get_value(DOCTYPENAME, {"job_applicant_email": email}, "name")
    if not name:
        return _err(f"No Draft Application exists for '{email}'.", 404)

    doc = frappe.get_doc(DOCTYPENAME, name)
    return _ok("Draft Application fetched.", _serialize(doc))
