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
        "job_title": doc.job_title,
        "company": doc.company,
        "location": doc.location,
        "experience": doc.experience,
        "employment_type": doc.employment_type,
        "form_data": form_data,
        "creation": doc.creation,
        "modified": doc.modified,
    }


def _fetch_applicant_context(job_applicant):
    """Read the 5 display fields directly from the Job Applicant doc."""
    return {
        "job_title": job_applicant.get("designation"),
        "company": job_applicant.get("custom_company_finalized"),
        "location": job_applicant.get("custom_location"),
        "employment_type": job_applicant.get("custom_employment_type"),
        "experience": job_applicant.get("custom_experience_range"),
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

    applicant_context = _fetch_applicant_context(job_applicant)

    existing = frappe.db.get_value(DOCTYPENAME, {"job_applicant_email": email}, "name")

    try:
        if existing:
            doc = frappe.get_doc(DOCTYPENAME, existing)
            created = False
        else:
            doc = frappe.new_doc(DOCTYPENAME)
            doc.job_applicant_email = email
            created = True

        doc.form_data = snapshot
        doc.job_title = applicant_context["job_title"]
        doc.company = applicant_context["company"]
        doc.location = applicant_context["location"]
        doc.experience = applicant_context["experience"]
        doc.employment_type = applicant_context["employment_type"]

        if created:
            doc.status = derived_status or "Pending"
            doc.insert(ignore_permissions=True)
        else:
            if derived_status and doc.status != "Rejected":
                doc.status = derived_status
            doc.save(ignore_permissions=True)

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


@frappe.whitelist()
def delete_applicant(job_applicant_email):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    email = job_applicant_email.strip()

    applicant = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
    if not applicant:
        return _err(f"No Job Applicant found for '{email}'.", 404)

    try:
        frappe.has_permission("Job Applicant", "delete", doc=applicant, throw=True)

        draft = frappe.db.get_value(DOCTYPENAME, {"job_applicant_email": email}, "name")
        if draft:
            frappe.delete_doc(DOCTYPENAME, draft, ignore_permissions=True)

        frappe.delete_doc("Job Applicant", applicant, ignore_permissions=True)
        frappe.db.commit()
    except frappe.LinkExistsError as e:
        frappe.db.rollback()
        return _err(f"Cannot delete Job Applicant: {e}", 409)
    except frappe.PermissionError:
        return _err("You are not permitted to delete this Job Applicant.", 403)
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Draft Application delete_applicant failed")
        return _err("Unable to delete Job Applicant right now.", 500)

    return _ok(
        "Job Applicant deleted.",
        {
            "job_applicant_email": email,
            "deleted_applicant": applicant,
            "deleted_draft": draft,
        },
    )
