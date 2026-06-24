import frappe

from recruitment.api.candidate_auth import (
    candidate_required,
    enforce_candidate_identity,
    get_current_candidate,
)

APPLICANT_DOCTYPE = "Job Applicant"
DRAFT_STATUS = "Draft"
SUBMIT_STATUS = "Open"
ALLOWED_STATUSES = {DRAFT_STATUS, SUBMIT_STATUS}


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": None}


def _opening_context(opening_name):
    if not opening_name:
        return {"job_title": None, "company": None, "location": None, "experience": None, "employment_type": None}

    opening = frappe.db.get_value(
        "Job Opening",
        opening_name,
        ["designation", "company", "location", "employment_type", "job_requisition"],
        as_dict=True,
    ) or {}

    experience = None
    req = opening.get("job_requisition")
    if req:
        req_row = frappe.db.get_value(
            "Job Requisition",
            req,
            ["custom_experience_range_from", "custom_experience_range_to", "custom_experience_unit"],
            as_dict=True,
        ) or {}
        lo, hi, unit = req_row.get("custom_experience_range_from"), req_row.get("custom_experience_range_to"), req_row.get("custom_experience_unit")
        if lo and hi:
            experience = f"{lo}-{hi} {unit or ''}".strip()
        elif lo:
            experience = f"{lo}+ {unit or ''}".strip()

    return {
        "job_title": opening.get("designation"),
        "company": opening.get("company"),
        "location": opening.get("location"),
        "experience": experience,
        "employment_type": opening.get("employment_type"),
    }


def _portal_fieldnames(*_args, **_kwargs):
    """Legacy stub — Job Applicant Portal Forms has been removed."""
    return []


def _compute_progress(opening, applicant_doc):
    fieldnames = _portal_fieldnames(opening)
    total = len(fieldnames)
    if not total:
        return {"total": 0, "filled": 0, "percentage": 0}

    filled = 0
    for fn in fieldnames:
        if not applicant_doc.meta.get_field(fn):
            continue
        val = applicant_doc.get(fn)
        if val not in (None, "", [], {}):
            filled += 1
    return {"total": total, "filled": filled, "percentage": round(filled * 100 / total)}


def _serialize_draft(doc):
    opening = doc.job_title
    display = _opening_context(opening)
    return {
        "name": doc.name,
        "job_applicant_email": doc.email_id,
        "job_opening": opening,
        "job_title": display["job_title"],
        "company": display["company"],
        "location": display["location"],
        "experience": display["experience"],
        "employment_type": display["employment_type"],
        "status": doc.status,
        "progress": _compute_progress(opening, doc),
        "creation": doc.creation,
        "modified": doc.modified,
    }


def _coerce_form_data(form_data):
    if form_data is None or form_data == "":
        return {}
    if isinstance(form_data, str):
        try:
            parsed = frappe.parse_json(form_data)
        except Exception:
            raise ValueError("form_data must be valid JSON.")
        if not isinstance(parsed, dict):
            raise ValueError("form_data must be a JSON object.")
        return parsed
    if isinstance(form_data, dict):
        return form_data
    raise ValueError("form_data must be a JSON object or JSON string.")


def _find_draft(email, opening):
    return frappe.db.get_value(
        APPLICANT_DOCTYPE,
        {"email_id": email, "job_title": opening, "status": DRAFT_STATUS},
        "name",
        order_by="modified desc",
    )


def _apply_form_data(doc, payload):
    """Set each form_data key onto Job Applicant; child tables are reset and reappended."""
    for fieldname, value in payload.items():
        df = doc.meta.get_field(fieldname)
        if not df:
            continue
        if df.fieldtype == "Table" and isinstance(value, list):
            doc.set(fieldname, [])
            for row in value:
                if isinstance(row, dict):
                    doc.append(fieldname, row)
        else:
            doc.set(fieldname, value)


@candidate_required
def save_application(job_applicant_email, job_opening, form_data=None, status=DRAFT_STATUS):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()
    target_status = (status or DRAFT_STATUS).strip()
    if target_status not in ALLOWED_STATUSES:
        return _err(
            f"status must be one of {sorted(ALLOWED_STATUSES)}; got '{target_status}'.",
            400,
        )

    enforce_candidate_identity(email=email)

    if not frappe.db.exists("Job Opening", opening):
        return _err(f"No Job Opening found with name '{opening}'.", 404)

    try:
        payload = _coerce_form_data(form_data)
    except ValueError as e:
        return _err(str(e), 400)

    existing_draft = _find_draft(email, opening)

    if target_status == SUBMIT_STATUS:
        existing_submitted = frappe.db.get_value(
            APPLICANT_DOCTYPE,
            {"email_id": email, "job_title": opening, "status": ["!=", DRAFT_STATUS]},
            "name",
            order_by="modified desc",
        )
        if existing_submitted:
            return _err(
                f"An application already exists for '{email}' and Job Opening '{opening}': {existing_submitted}.",
                409,
            )

    try:
        if existing_draft:
            doc = frappe.get_doc(APPLICANT_DOCTYPE, existing_draft)
            created = False
        else:
            doc = frappe.new_doc(APPLICANT_DOCTYPE)
            created = True

        _apply_form_data(doc, payload)

        doc.email_id = email
        doc.job_title = opening
        doc.status = target_status

        if created:
            doc.insert(ignore_permissions=True)
        else:
            doc.save(ignore_permissions=True)

        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Job Application save_application failed")
        if target_status == SUBMIT_STATUS:
            return _err(f"Unable to submit application: {type(e).__name__}: {e}", 500)
        return _err("Unable to save application right now.", 500)

    if target_status == DRAFT_STATUS:
        message = "Application draft created." if created else "Application draft updated."
    else:
        message = "Application submitted." if created else "Application submitted from draft."

    return _ok(
        message,
        _serialize_draft(doc),
        http=201 if created else 200,
    )


@candidate_required
def get_draft(job_applicant_email, job_opening=None):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)

    email = job_applicant_email.strip()
    enforce_candidate_identity(email=email)
    filters = {"email_id": email, "status": DRAFT_STATUS}

    if job_opening:
        filters["job_title"] = job_opening.strip()

    names = frappe.get_all(
        APPLICANT_DOCTYPE,
        filters=filters,
        pluck="name",
        order_by="modified desc",
    )
    drafts = [_serialize_draft(frappe.get_doc(APPLICANT_DOCTYPE, name)) for name in names]

    return _ok(f"Fetched {len(drafts)} Draft Application(s).", drafts)


@candidate_required
def get_job_applicant(job_applicant):
    if not job_applicant:
        return _err("job_applicant is required.", 400)

    applicant_name = job_applicant.strip()

    if not frappe.db.exists(APPLICANT_DOCTYPE, applicant_name):
        return _ok("No Job Applicant found.", {})

    doc = frappe.get_doc(APPLICANT_DOCTYPE, applicant_name)

    session_email = (get_current_candidate() or "").lower()
    if (doc.email_id or "").lower() != session_email:
        frappe.local.response["http_status_code"] = 403
        return _err("Not allowed to access this Job Applicant.", 403)

    return _ok("Job Applicant fetched.", doc.as_dict(convert_dates_to_str=True))


@candidate_required
def delete_draft(job_applicant_email, job_opening):
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)

    email = job_applicant_email.strip()
    opening = job_opening.strip()
    enforce_candidate_identity(email=email)

    name = _find_draft(email, opening)
    if not name:
        return _err(
            f"No Draft Application exists for '{email}' and Job Opening '{opening}'.", 200
        )

    try:
        frappe.delete_doc(APPLICANT_DOCTYPE, name, ignore_permissions=True, force=True)
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
