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
        "job_opening": doc.job_opening,
        "job_title": doc.job_title,
        "company": doc.company,
        "location": doc.location,
        "experience": doc.experience,
        "employment_type": doc.employment_type,
        "form_data": form_data,
        "creation": doc.creation,
        "modified": doc.modified,
    }


def _coerce_form_data(form_data):
    if form_data is None or form_data == "":
        return "{}"
    if isinstance(form_data, str):
        try:
            json.loads(form_data)
        except (TypeError, ValueError):
            raise ValueError("form_data must be valid JSON.")
        return form_data
    if isinstance(form_data, (dict, list)):
        return json.dumps(form_data, default=str)
    raise ValueError("form_data must be a JSON object/array or JSON string.")


def _fetch_opening_context(opening_name):
    """Read the 5 display fields directly from the Job Opening doc."""
    opening = frappe.db.get_value(
        "Job Opening",
        opening_name,
        ["designation", "company", "custom_location", "custom_experience_range", "custom_employee_type"],
        as_dict=True,
    ) or {}
    return {
        "job_title": opening.get("designation"),
        "company": opening.get("company"),
        "location": opening.get("custom_location"),
        "experience": opening.get("custom_experience_range"),
        "employment_type": opening.get("custom_employee_type"),
    }


def _find_draft(email, opening):
    return frappe.db.get_value(
        DOCTYPENAME,
        {"job_applicant_email": email, "job_opening": opening},
        "name",
    )


@frappe.whitelist(allow_guest=True)
def save_draft(job_applicant_email, job_opening, form_data=None):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()

    if not frappe.db.exists("Job Opening", opening):
        return _err(f"No Job Opening found with name '{opening}'.", 404)

    try:
        snapshot = _coerce_form_data(form_data)
    except ValueError as e:
        return _err(str(e), 400)

    display = _fetch_opening_context(opening)
    existing = _find_draft(email, opening)

    try:
        if existing:
            doc = frappe.get_doc(DOCTYPENAME, existing)
            created = False
        else:
            doc = frappe.new_doc(DOCTYPENAME)
            doc.job_applicant_email = email
            doc.job_opening = opening
            created = True

        doc.form_data = snapshot
        doc.job_title = display["job_title"]
        doc.company = display["company"]
        doc.location = display["location"]
        doc.experience = display["experience"]
        doc.employment_type = display["employment_type"]

        if created:
            doc.insert(ignore_permissions=True)
        else:
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
def get_draft(job_applicant_email, job_opening):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()

    name = _find_draft(email, opening)
    if not name:
        return _err(
            f"No Draft Application exists for '{email}' and Job Opening '{opening}'.", 404
        )

    return _ok("Draft Application fetched.", _serialize(frappe.get_doc(DOCTYPENAME, name)))


@frappe.whitelist(allow_guest=True)
def submit_draft(job_applicant_email, job_opening):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()

    name = _find_draft(email, opening)
    if not name:
        return _err(
            f"No Draft Application exists for '{email}' and Job Opening '{opening}'.", 404
        )

    draft = frappe.get_doc(DOCTYPENAME, name)
    try:
        payload = json.loads(draft.form_data) if draft.form_data else {}
    except (TypeError, ValueError):
        return _err("Stored form_data is not valid JSON.", 500)
    if not isinstance(payload, dict):
        return _err("Stored form_data must be a JSON object.", 400)

    duplicate = frappe.db.get_value(
        "Job Applicant",
        {"email_id": email, "job_title": opening},
        "name",
    )
    if duplicate:
        return _err(
            f"A Job Applicant already exists for '{email}' and Job Opening '{opening}': {duplicate}.",
            409,
        )

    try:
        applicant = frappe.new_doc("Job Applicant")
        for key, value in payload.items():
            applicant.set(key, value)
        applicant.email_id = email
        applicant.job_title = opening
        applicant.flags.ignore_validate = True
        applicant.flags.ignore_mandatory = True
        applicant.flags.ignore_links = True
        applicant.insert(
            ignore_permissions=True,
            ignore_mandatory=True,
            ignore_links=True,
        )
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Draft Application submit_draft failed")
        return _err(f"Unable to submit Draft Application: {type(e).__name__}: {e}", 500)

    return _ok(
        "Job Applicant created from Draft Application.",
        {
            "job_applicant": applicant.name,
            "job_applicant_email": email,
            "job_opening": opening,
            "draft_name": name,
        },
        http=201,
    )


@frappe.whitelist(allow_guest=True)
def delete_draft(job_applicant_email, job_opening):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()

    name = _find_draft(email, opening)
    if not name:
        return _err(
            f"No Draft Application exists for '{email}' and Job Opening '{opening}'.", 404
        )

    try:
        frappe.delete_doc(DOCTYPENAME, name, ignore_permissions=True, force=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Draft Application delete_draft failed")
        return _err(f"Unable to delete Draft Application: {type(e).__name__}: {e}", 500)

    return _ok(
        "Draft Application deleted.",
        {
            "job_applicant_email": email,
            "job_opening": opening,
            "deleted_draft": name,
        },
    )
