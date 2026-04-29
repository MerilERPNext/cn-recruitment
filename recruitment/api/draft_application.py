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
        "job_applicant": doc.job_applicant,
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


def _fetch_applicant_context(job_applicant_doc):
    return {
        "job_title": job_applicant_doc.get("designation"),
        "company": job_applicant_doc.get("custom_company_finalized"),
        "location": job_applicant_doc.get("custom_location"),
        "employment_type": job_applicant_doc.get("custom_employment_type"),
        "experience": job_applicant_doc.get("custom_experience_range"),
    }


@frappe.whitelist(allow_guest=True)
def save_draft(job_applicant, job_applicant_email):
    if not job_applicant:
        return _err("job_applicant is required.", 400)
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    applicant_name = job_applicant.strip()
    email = job_applicant_email.strip()

    if not frappe.db.exists("Job Applicant", applicant_name):
        return _err(f"No Job Applicant found with name '{applicant_name}'.", 404)

    job_applicant_doc = frappe.get_doc("Job Applicant", applicant_name)

    if job_applicant_doc.email_id != email:
        return _err(
            f"Email '{email}' does not match Job Applicant '{applicant_name}'.", 400
        )

    snapshot = json.dumps(
        job_applicant_doc.as_dict(convert_dates_to_str=True), default=str
    )

    docstatus = int(job_applicant_doc.docstatus or 0)
    derived_status = "Pending" if docstatus == 0 else "Completed" if docstatus == 1 else None

    applicant_context = _fetch_applicant_context(job_applicant_doc)

    existing = frappe.db.get_value(DOCTYPENAME, {"job_applicant": applicant_name}, "name")

    try:
        if existing:
            doc = frappe.get_doc(DOCTYPENAME, existing)
            created = False
        else:
            doc = frappe.new_doc(DOCTYPENAME)
            doc.job_applicant = applicant_name
            created = True

        doc.job_applicant_email = email
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
def get_draft(job_applicant, job_applicant_email):
    if not job_applicant:
        return _err("job_applicant is required.", 400)
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    applicant_name = job_applicant.strip()
    email = job_applicant_email.strip()

    name = frappe.db.get_value(
        DOCTYPENAME,
        {"job_applicant": applicant_name, "job_applicant_email": email},
        "name",
    )
    if not name:
        return _err(
            f"No Draft Application exists for Job Applicant '{applicant_name}' with email '{email}'.",
            404,
        )

    doc = frappe.get_doc(DOCTYPENAME, name)
    return _ok("Draft Application fetched.", _serialize(doc))


@frappe.whitelist()
def delete_applicant(job_applicant, job_applicant_email):
    if not job_applicant:
        return _err("job_applicant is required.", 400)
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    applicant_name = job_applicant.strip()
    email = job_applicant_email.strip()

    applicant_data = frappe.db.get_value(
        "Job Applicant", applicant_name, ["name", "email_id"], as_dict=True
    )
    if not applicant_data:
        return _err(f"No Job Applicant found with name '{applicant_name}'.", 404)

    if applicant_data.email_id != email:
        return _err(
            f"Email '{email}' does not match Job Applicant '{applicant_name}'.", 400
        )

    try:
        frappe.has_permission("Job Applicant", "delete", doc=applicant_name, throw=True)

        draft = frappe.db.get_value(DOCTYPENAME, {"job_applicant": applicant_name}, "name")
        if draft:
            frappe.delete_doc(DOCTYPENAME, draft, ignore_permissions=True, force=True)

        frappe.delete_doc("Job Applicant", applicant_name, ignore_permissions=True, force=True)
        frappe.db.commit()
    except frappe.PermissionError:
        return _err("You are not permitted to delete this Job Applicant.", 403)
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Draft Application delete_applicant failed")
        return _err(f"Unable to delete Job Applicant: {type(e).__name__}: {e}", 500)

    return _ok(
        "Job Applicant deleted.",
        {
            "job_applicant": applicant_name,
            "job_applicant_email": email,
            "deleted_applicant": applicant_name,
            "deleted_draft": draft,
        },
    )
