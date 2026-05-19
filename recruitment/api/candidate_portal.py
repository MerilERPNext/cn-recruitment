import frappe
from frappe import _

from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity, get_current_candidate

_LAYOUT_TYPES = frozenset({
    "Column Break", "Tab Break", "Section Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Attach Image",
    "Signature", "Color", "Barcode", "Geolocation",
})

_SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "amendment_date",
    "custom_field_approval_json", "custom_approval_html",
    "custom_field_level_approvals",
    "custom_candidate_portal_fields_tab",
    "custom_candidate_portal_fields",
    "custom_onboarding_portal_form",
})


def _read_onboarding_meta():
    try:
        meta = frappe.get_meta("Employee Onboarding")
    except Exception:
        return []

    result = []
    current_tab = ""
    current_section = ""
    skip_tab_labels = {"Field Level Approvals"}

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label and tab_label not in skip_tab_labels:
                current_tab = tab_label
                current_section = ""
            continue

        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section = sec_label
            continue

        if df.fieldtype in _LAYOUT_TYPES or df.fieldname in _SKIP_FIELDNAMES or df.get("hidden"):
            continue

        result.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "tab_label": current_tab,
            "section_label": current_section,
            "options": df.options or "",
            "reqd": df.reqd or 0,
        })

    return result


def _read_job_applicant_meta(include_hidden=False, include_skipped=False):
    try:
        meta = frappe.get_meta("Job Applicant")
    except Exception:
        return []

    result = []
    current_tab = ""
    current_section = ""

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label:
                current_tab = tab_label
                current_section = ""
            continue

        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section = sec_label
            continue

        if df.fieldtype in _LAYOUT_TYPES:
            continue
        if not df.fieldname:
            continue
        if not include_skipped and df.fieldname in _SKIP_FIELDNAMES:
            continue
        if not include_hidden and df.get("hidden"):
            continue

        result.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "tab_label": current_tab,
            "section_label": current_section,
            "options": df.options or "",
            "reqd": df.reqd or 0,
        })

    return result


def _get_default_onboarding_portal_form_name():
    return frappe.db.get_value(
        "Onboarding Portal Forms",
        {"default": 1},
        "name",
        order_by="modified desc",
    )


def _get_portal_settings(form_name=None):
    try:
        settings_name = form_name or _get_default_onboarding_portal_form_name()
        if not settings_name:
            return []
        return frappe.get_doc("Onboarding Portal Forms", settings_name).portal_fields or []
    except Exception:
        return []


def _get_onboarding_name_by_job_applicant(job_applicant_id):
    return frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": job_applicant_id, "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )


def _get_onboarding_portal_rows(onboarding_doc=None, pre_release=None):
    """
    Returns (portal_field_rows, form_source) based on priority:
      1. Active Pre Onboarding Release's selected form -> "pre_release_form"
         (HR's latest intent for this candidate wins.)
      2. custom_candidate_portal_fields child table    -> "per_record_fields"
      3. custom_onboarding_portal_form linked form     -> "linked_form"
      4. Global default Onboarding Portal Forms        -> "default_form"
    """
    if pre_release and pre_release.get("onboarding_portal_form"):
        return _get_portal_settings(pre_release["onboarding_portal_form"]), "pre_release_form"

    if onboarding_doc and onboarding_doc.meta.get_field("custom_candidate_portal_fields"):
        rows = onboarding_doc.get("custom_candidate_portal_fields") or []
        if rows:
            return rows, "per_record_fields"

    selected_form = None
    if onboarding_doc and onboarding_doc.meta.get_field("custom_onboarding_portal_form"):
        selected_form = onboarding_doc.get("custom_onboarding_portal_form")

    if selected_form:
        return _get_portal_settings(selected_form), "linked_form"

    return _get_portal_settings(None), "default_form"


def _get_active_pre_release(job_applicant):
    """Returns a dict describing the applicant's released pre-onboarding state when
    no Employee Onboarding has been materialized yet, or None.

    The dict shape mirrors the legacy Pre Onboarding Release row:
      {"name": <job_applicant_id>, "onboarding_portal_form": <form>}
    `name` is the applicant ID since pre-release data now lives on Job Applicant.
    """
    if not job_applicant:
        return None
    row = frappe.db.get_value(
        "Job Applicant",
        job_applicant,
        [
            "custom_onboarding_portal_form",
            "custom_pre_onboarding_status",
            "custom_pre_onboarding_employee_onboarding",
        ],
        as_dict=True,
    )
    if not row:
        return None
    if row.get("custom_pre_onboarding_employee_onboarding"):
        return None
    if (row.get("custom_pre_onboarding_status") or "") not in ("Released", "Draft"):
        return None
    if not row.get("custom_onboarding_portal_form"):
        return None
    return {
        "name": job_applicant,
        "onboarding_portal_form": row["custom_onboarding_portal_form"],
    }


_KEY_CONTACT_ROLES = (
    ("custom_onboarding_buddy", "Onboarding Buddy"),
    ("custom_joining_buddy", "Joining Buddy"),
    ("custom_manager", "Manager"),
)


def _append_key_contact_rows(doc, applicant):
    """Adds Onboarding Buddy / Joining Buddy / Manager rows to Employee Onboarding's
    custom_key_contacts child table. Each role is a User on the applicant; we resolve
    it to the matching Employee via Employee.user_id. Rows with no matching Employee
    are skipped (the row needs an Employee link to satisfy the child schema)."""
    existing = {
        (row.employee, (row.role or "").strip())
        for row in (doc.get("custom_key_contacts") or [])
        if row.employee
    }
    for source_field, role_label in _KEY_CONTACT_ROLES:
        user_id = applicant.get(source_field)
        if not user_id:
            continue
        employee = frappe.db.get_value("Employee", {"user_id": user_id}, "name")
        if not employee:
            continue
        if (employee, role_label) in existing:
            continue
        doc.append("custom_key_contacts", {"employee": employee, "role": role_label})
        existing.add((employee, role_label))


def materialize_onboarding_from_applicant(job_applicant_id, prefill=None):
    """Creates the Employee Onboarding doc from the applicant's pre-onboarding fields,
    stamps the release fields onto it, links back via custom_pre_onboarding_employee_onboarding,
    and clears the action item.

    If a draft EO already exists, refreshes BGV Vendor + custom_key_contacts (Onboarding/
    Joining Buddy + Manager, resolved to Employee via user_id) from the applicant and returns
    its name. Existing key-contact rows are preserved; only missing role/employee combinations
    are appended.

    Buddies/Manager (Users) are stored as rows in custom_key_contacts (resolved to Employee
    via user_id), not as separate Link fields on Employee Onboarding."""
    if not job_applicant_id:
        return None

    applicant = frappe.get_doc("Job Applicant", job_applicant_id)

    existing_eo = applicant.get("custom_pre_onboarding_employee_onboarding")
    if existing_eo:
        try:
            eo_doc = frappe.get_doc("Employee Onboarding", existing_eo)
            if eo_doc.docstatus == 0:
                if applicant.get("custom_bgv_vendor"):
                    eo_doc.custom_bgv_vendor = applicant.get("custom_bgv_vendor")
                _append_key_contact_rows(eo_doc, applicant)
                eo_doc.save(ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "materialize_onboarding_from_applicant: refresh existing EO failed")
        return existing_eo

    if not applicant.get("custom_onboarding_portal_form"):
        frappe.throw(_("No Onboarding Portal Form has been released for this applicant."))

    job_offer = frappe.db.get_value(
        "Job Offer",
        {"job_applicant": job_applicant_id, "status": "Accepted", "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )

    doc = frappe.new_doc("Employee Onboarding")
    doc.job_applicant = job_applicant_id
    if job_offer:
        doc.job_offer = job_offer
    doc.custom_onboarding_portal_form = applicant.custom_onboarding_portal_form
    doc.custom_bgv_vendor = applicant.get("custom_bgv_vendor")

    _append_key_contact_rows(doc, applicant)

    prefill = prefill or {}
    doj = (
        prefill.get("date_of_joining")
        or prefill.get("custom_date_of_joining")
        or applicant.get("custom_expected_doj")
    )
    if doj:
        doc.date_of_joining = doj
    bbo = prefill.get("boarding_begins_on") or doc.date_of_joining
    if bbo:
        doc.boarding_begins_on = bbo

    doc.insert(ignore_permissions=True)

    from frappe.utils import now_datetime
    applicant.db_set("custom_pre_onboarding_employee_onboarding", doc.name, update_modified=False)
    applicant.db_set("custom_pre_onboarding_status", "Onboarding Created", update_modified=False)
    if not applicant.get("custom_pre_onboarding_released_at"):
        applicant.db_set("custom_pre_onboarding_released_at", now_datetime(), update_modified=False)

    # Remove any stale Job-Applicant-tied Action Center Item now that the
    # EO's after_insert hook has created the canonical EO-tied one.
    if applicant.email_id:
        try:
            from recruitment.api.action_center import _delete_minimal_item
            _delete_minimal_item(applicant.email_id, "Job Applicant", job_applicant_id, commit=False)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "materialize_onboarding_from_applicant: delete JA action item failed")

    return doc.name


def _get_job_applicant_portal_settings(job_applicant_id=None, job_opening=None, form_name=None):
    selected_form = form_name or None

    if not selected_form and job_opening:
        try:
            selected_form = frappe.db.get_value("Job Opening", job_opening, "custom_job_applicant_portal_form")
        except Exception:
            pass

    if not selected_form and job_applicant_id:
        try:
            job_title = frappe.db.get_value("Job Applicant", job_applicant_id, "job_title")
            if job_title:
                selected_form = frappe.db.get_value("Job Opening", job_title, "custom_job_applicant_portal_form")
        except Exception:
            pass

    if not selected_form:
        try:
            selected_form = frappe.db.get_value(
                "Job Applicant Portal Forms",
                {"default": 1},
                "name",
                order_by="modified desc",
            )
        except Exception:
            pass

    if selected_form:
        try:
            rows = frappe.get_doc("Job Applicant Portal Forms", selected_form).portal_fields or []
            return rows, selected_form
        except Exception:
            pass

    return [], None



def _get_child_table_fields(child_doctype):
    if not child_doctype:
        return []

    try:
        meta = frappe.get_meta(child_doctype)
    except Exception:
        return []

    fields = []
    for df in meta.fields:
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname or df.get("hidden"):
            continue

        fields.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": df.options or "",
            "reqd": df.reqd or 0,
            "read_only": df.read_only or 0,
        })

    return fields


def _filter_child_fields(all_fields, selected_child_fields_json, mandatory_child_fields_json=None):
    """
    Filters child fields to only those in selected_child_fields_json (empty = all).
    Marks fields listed in mandatory_child_fields_json as portal-mandatory by setting reqd=1.
    Both inputs are JSON arrays of fieldnames; missing/invalid inputs degrade gracefully.
    """
    import json as _json

    selected = None
    if selected_child_fields_json:
        try:
            parsed = set(_json.loads(selected_child_fields_json))
            if parsed:
                selected = parsed
        except Exception:
            selected = None

    mandatory = set()
    if mandatory_child_fields_json:
        try:
            parsed = _json.loads(mandatory_child_fields_json)
            if isinstance(parsed, list):
                mandatory = set(parsed)
        except Exception:
            mandatory = set()

    result = []
    for f in all_fields:
        if selected is not None and f["fieldname"] not in selected:
            continue
        if f["fieldname"] in mandatory:
            f = dict(f)
            f["reqd"] = 1
            f["portal_mandatory"] = 1
        result.append(f)
    return result


def _serialize_doc_field_value(doc, fieldname, fieldtype):
    value = doc.get(fieldname)

    if fieldtype == "Table":
        if not value:
            return []

        rows = []
        for row in value:
            row_dict = row.as_dict() if hasattr(row, "as_dict") else dict(row)
            cleaned_row = {
                key: val
                for key, val in row_dict.items()
                if not key.startswith("_") and key not in {
                    "doctype", "parent", "parenttype", "parentfield",
                    "docstatus", "owner", "creation", "modified", "modified_by",
                }
            }
            rows.append(cleaned_row)

        return rows

    return value


# Approval statuses that mean the candidate cannot edit that field
_CANDIDATE_READONLY_STATUSES = frozenset({"Filled", "Approved"})


def _resolve_field_value(eo_doc, applicant_doc, fieldname, fieldtype):
    """EO value wins; fall back to the same fieldname on Job Applicant when EO is
    empty/missing so pre-offer data the candidate already entered auto-populates."""
    if eo_doc is not None:
        val = _serialize_doc_field_value(eo_doc, fieldname, fieldtype)
        if val not in (None, "", []):
            return val
    if applicant_doc is not None and applicant_doc.meta.get_field(fieldname):
        val = _serialize_doc_field_value(applicant_doc, fieldname, fieldtype)
        if val not in (None, "", []):
            return val
    return None


def _build_tabbed_response(portal_rows, meta_lookup, doc=None, applicant_doc=None):
    tab_order = []
    tab_map = {}

    for row in portal_rows:
        fn = row.fieldname
        tab_lbl = (row.tab_label or "").strip()
        sec_lbl = (row.section_label or "").strip()
        meta = meta_lookup.get(fn, {})

        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        # Effective read_only: base setting OR locked by approval status
        approval_status = (row.get("approval_status") or "Pending").strip()
        base_read_only = int(row.read_only or 0)
        effective_read_only = base_read_only or (1 if approval_status in _CANDIDATE_READONLY_STATUSES else 0)

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "is_mandatory": int(row.is_mandatory or 0),
            "read_only": effective_read_only,
            "hidden": int(row.hidden or 0),
            "options": field_options,
            "value": _resolve_field_value(doc, applicant_doc, fn, fieldtype),
            "approval_status": approval_status,
            "hr_comment": row.get("hr_comment") or "",
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if tab_lbl not in tab_map:
            tab_map[tab_lbl] = {"section_order": [], "section_map": {}}
            tab_order.append(tab_lbl)

        tab_entry = tab_map[tab_lbl]
        if sec_lbl not in tab_entry["section_map"]:
            tab_entry["section_map"][sec_lbl] = []
            tab_entry["section_order"].append(sec_lbl)

        tab_entry["section_map"][sec_lbl].append(field_entry)

    tabs = []
    for tab_lbl in tab_order:
        tab_entry = tab_map[tab_lbl]
        sections = [
            {"section": sec_lbl, "fields": tab_entry["section_map"][sec_lbl]}
            for sec_lbl in tab_entry["section_order"]
        ]

        # Compute per-tab field status counts
        # "filled" = candidate has submitted (Approved + Rejected + Filled)
        # "pending" = candidate hasn't filled yet
        counts = {"total": 0, "filled": 0, "approved": 0, "rejected": 0, "pending": 0}
        for sec in sections:
            for field in sec["fields"]:
                counts["total"] += 1
                status = (field.get("approval_status") or "Pending").strip().lower()
                if status == "approved":
                    counts["approved"] += 1
                    counts["filled"] += 1
                elif status == "rejected":
                    counts["rejected"] += 1
                    counts["filled"] += 1
                elif status == "filled":
                    counts["filled"] += 1
                else:
                    counts["pending"] += 1

        tabs.append({
            "tab": tab_lbl,
            "field_counts": counts,
            "sections": sections,
        })

    return tabs


@frappe.whitelist()
def get_child_doctype_fields(child_doctype):
    """Returns all non-layout fields for a given child DocType.
    Used by the Field Inspector UI to populate child field selection panels."""
    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)
    if not child_doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("child_doctype is required.")}
    fields = _get_child_table_fields(child_doctype)
    return {"status": "success", "child_doctype": child_doctype, "fields": fields}


@frappe.whitelist()
def get_onboarding_form_fields(form_name):

    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)

    if not form_name:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Please select an onboarding portal form.")}

    doc = frappe.get_doc("Onboarding Portal Forms", form_name)
    rows = [
        {
            "fieldname": row.fieldname,
            "label": row.label,
            "fieldtype": row.fieldtype,
            "tab_label": row.tab_label,
            "section_label": row.section_label,
            "is_mandatory": row.is_mandatory,
            "read_only": row.read_only,
            "hidden": row.hidden,
            "options": row.options,
            # Carry the child-field configuration over to the per-record table
            "selected_child_fields":  row.get("selected_child_fields")  or "",
            "mandatory_child_fields": row.get("mandatory_child_fields") or "",
        }
        for row in (doc.get("portal_fields") or [])
    ]

    return {
        "status": "success",
        "form_name": doc.name,
        "total": len(rows),
        "fields": rows,
    }


@frappe.whitelist()
def get_all_onboarding_fields():
    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)
    fields = _read_onboarding_meta()
    return {"status": "success", "total": len(fields), "fields": fields}


@frappe.whitelist()
def get_all_onboarding_fields_for_onboarding():
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    fields = _read_onboarding_meta()
    return {"status": "success", "total": len(fields), "fields": fields}


@candidate_required
def get_all_job_applicant_fields(job_opening=None, form_name=None):
    portal_rows, resolved_form = _get_job_applicant_portal_settings(
        job_opening=job_opening or None,
        form_name=form_name or None,
    )

    if resolved_form is None:
        frappe.local.response["http_status_code"] = 404
        hint = (
            f" No portal form is linked to Job Opening '{job_opening}'."
            if job_opening else ""
        )
        return {
            "status": "error",
            "message": _("No Job Applicant Portal Form found.{0} Please link a form to the Job Opening or set a default form.").format(hint),
        }

    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}

    applicant_doc = None
    applicant_name = None
    session_email = (get_current_candidate() or "").strip().lower()
    if session_email and job_opening:
        applicant_name = frappe.db.get_value(
            "Job Applicant",
            {"email_id": session_email, "job_title": job_opening},
            "name",
            order_by="modified desc",
        )
        if applicant_name:
            applicant_doc = frappe.get_doc("Job Applicant", applicant_name)

    fields = []
    for row in portal_rows:
        fn = row.fieldname
        meta = meta_lookup.get(fn, {})
        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "tab_label": (row.tab_label or meta.get("tab_label", "")).strip(),
            "section_label": (row.section_label or meta.get("section_label", "")).strip(),
            "options": field_options,
            "reqd": int(row.is_mandatory or meta.get("reqd", 0)),
            "read_only": int(row.read_only or 0),
            "hidden": int(row.hidden or 0),
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if applicant_doc is not None and applicant_doc.meta.get_field(fn):
            value = _serialize_doc_field_value(applicant_doc, fn, fieldtype)
            if value not in (None, "", [], {}):
                field_entry["value"] = value

        fields.append(field_entry)

    return {
        "status": "success",
        "form_name": resolved_form,
        "job_applicant": applicant_name,
        "total": len(fields),
        "fields": fields,
    }


@frappe.whitelist()
def get_available_job_applicant_fields():
    frappe.has_permission("Job Applicant Portal Forms", "read", throw=True)
    fields = _read_job_applicant_meta(include_hidden=True, include_skipped=True)
    return {"status": "success", "total": len(fields), "fields": fields}


def _resolve_candidate_applicant(provided, prefer_field=None):
    """Resolves an email or HR-APP-... id to a Job Applicant `name` for the
    authenticated candidate. Emails must match the session; HR-APP-... ids
    are enforced via Candidate Portal User link. When `prefer_field` is given
    and the input is an email, the latest applicant with that field set wins
    the tiebreak (falls back to most-recently-modified)."""
    session_email = get_current_candidate()
    if not session_email:
        frappe.local.response["http_status_code"] = 401
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    provided = (provided or "").strip()
    if not provided:
        return None

    if "@" in provided:
        if provided.lower() != session_email.lower():
            frappe.local.response["http_status_code"] = 403
            frappe.throw(_("Not allowed to access this resource."), frappe.PermissionError)
        name = None
        if prefer_field:
            name = frappe.db.get_value(
                "Job Applicant",
                {"email_id": provided, prefer_field: ["is", "set"]},
                "name",
                order_by="modified desc",
            )
        return name or frappe.db.get_value(
            "Job Applicant",
            {"email_id": provided},
            "name",
            order_by="modified desc",
        )

    enforce_candidate_identity(job_applicant_id=provided)
    return provided


def _get_pre_offer_form_rows(applicant_name):
    """Returns the list of pre-offer form rows from Job Applicant.custom_pre_offer_forms."""
    return frappe.get_all(
        "Job Applicant Pre Offer Form",
        filters={"parent": applicant_name, "parenttype": "Job Applicant", "parentfield": "custom_pre_offer_forms"},
        fields=["name", "portal_form", "status", "sent_at", "filled_at", "action_item"],
        order_by="idx asc",
    )


def _portal_form_rows(form_name):
    """Returns the portal field config rows for a given Job Applicant Portal Forms doc."""
    if not form_name or not frappe.db.exists("Job Applicant Portal Forms", form_name):
        return []
    try:
        return frappe.get_doc("Job Applicant Portal Forms", form_name).portal_fields or []
    except Exception:
        return []


def _resolve_pre_offer_target(applicant_name, requested_form):
    """Picks which pre-offer form row to render/save against.
    If `requested_form` is given, returns that row if present; else None.
    If not given, returns the first row with status='Sent' (the next pending one)."""
    rows = _get_pre_offer_form_rows(applicant_name)
    if not rows:
        return None, []
    if requested_form:
        for r in rows:
            if r["portal_form"] == requested_form:
                return r, rows
        return None, rows
    for r in rows:
        if (r.get("status") or "").strip() == "Sent":
            return r, rows
    return rows[0], rows


@candidate_required
def get_pre_offer_form(job_applicant_id, form_name=None):
    """Returns a pre-offer form for the candidate to fill.

    - If `form_name` is provided, returns that specific form (tabs + values).
    - If not, returns the next pending (status='Sent') form; falls back to the first row.
    - Always includes `forms[]`: the full list of pre-offer forms with their status, so the
      frontend can render a selector when the candidate has multiple pending forms.
    """
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name or not frappe.db.exists("Job Applicant", applicant_name):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    target_row, all_rows = _resolve_pre_offer_target(applicant_name, form_name)

    if target_row is None and form_name:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("Pre Offer Form '{0}' has not been sent to this applicant.").format(form_name),
            "forms": all_rows,
        }

    if target_row is None:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("No Pre Offer Form has been sent for this applicant yet.")}

    portal_rows = _portal_form_rows(target_row["portal_form"])
    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("Pre Offer Form '{0}' has no fields configured.").format(target_row["portal_form"]),
            "forms": all_rows,
        }

    doc = frappe.get_doc("Job Applicant", applicant_name)
    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}
    tab_order = []
    tab_map = {}

    for row in portal_rows:
        fn = row.fieldname
        tab_lbl = (row.tab_label or "").strip()
        sec_lbl = (row.section_label or "").strip()
        meta = meta_lookup.get(fn, {})

        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "is_mandatory": int(row.is_mandatory or 0),
            "read_only": int(row.read_only or 0),
            "hidden": int(row.hidden or 0),
            "options": field_options,
            "value": _serialize_doc_field_value(doc, fn, fieldtype),
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if tab_lbl not in tab_map:
            tab_map[tab_lbl] = {"section_order": [], "section_map": {}}
            tab_order.append(tab_lbl)

        tab_entry = tab_map[tab_lbl]
        if sec_lbl not in tab_entry["section_map"]:
            tab_entry["section_map"][sec_lbl] = []
            tab_entry["section_order"].append(sec_lbl)

        tab_entry["section_map"][sec_lbl].append(field_entry)

    return {
        "status": "success",
        "job_applicant": applicant_name,
        "form_name": target_row["portal_form"],
        "pre_offer_form_status": target_row.get("status") or "Sent",
        "forms": all_rows,
        "tabs": [
            {
                "tab": tab_lbl,
                "sections": [
                    {"section": sec_lbl, "fields": tab_map[tab_lbl]["section_map"][sec_lbl]}
                    for sec_lbl in tab_map[tab_lbl]["section_order"]
                ],
            }
            for tab_lbl in tab_order
        ],
    }


@candidate_required
def save_pre_offer_form_data(job_applicant_id, data, form_name=None):
    """Persist a candidate's pre-offer form submission.

    `form_name` identifies which pre-offer form is being filled. If omitted, the next pending
    form (status='Sent') is auto-selected; ambiguous cases (multiple Sent) require `form_name`.
    Marks the child row + its action item as Filled/Completed.
    """
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name or not frappe.db.exists("Job Applicant", applicant_name):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    all_rows = _get_pre_offer_form_rows(applicant_name)
    if not all_rows:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No Pre Offer Form has been sent to this applicant.")}

    target_row = None
    if form_name:
        for r in all_rows:
            if r["portal_form"] == form_name:
                target_row = r
                break
        if not target_row:
            frappe.local.response["http_status_code"] = 404
            return {"status": "error", "message": _("Pre Offer Form '{0}' has not been sent to this applicant.").format(form_name)}
    else:
        pending = [r for r in all_rows if (r.get("status") or "") == "Sent"]
        if len(pending) == 1:
            target_row = pending[0]
        elif len(pending) > 1:
            frappe.local.response["http_status_code"] = 400
            return {
                "status": "error",
                "message": _("Multiple Pre Offer Forms are pending; please specify which one with `form_name`."),
                "pending_forms": [r["portal_form"] for r in pending],
            }
        elif all_rows:
            target_row = all_rows[0]

    if target_row is None:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No Pre Offer Form is pending for this applicant.")}

    portal_rows = _portal_form_rows(target_row["portal_form"])
    if not portal_rows:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Pre Offer Form '{0}' has no fields configured.").format(target_row["portal_form"])}

    allowed_map = {r.fieldname: r for r in portal_rows if not r.get("hidden") and not r.get("read_only")}

    if not allowed_map:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No editable fields configured in the Pre Offer Form.")}

    missing = [
        row.label or fn for fn, row in allowed_map.items()
        if row.get("is_mandatory") and (fn not in data or data[fn] in (None, "", []))
    ]

    if missing:
        frappe.local.response["http_status_code"] = 422
        return {
            "status": "error",
            "message": _("The following mandatory fields are missing: {0}").format(", ".join(missing)),
            "missing_fields": missing,
        }

    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}

    try:
        doc = frappe.get_doc("Job Applicant", applicant_name)
        updated = []

        for fn, value in data.items():
            if fn not in allowed_map:
                continue
            meta = meta_lookup.get(fn, {})
            fieldtype = allowed_map[fn].get("fieldtype") or meta.get("fieldtype", "Data")

            if fieldtype == "Table" and isinstance(value, list):
                doc.set(fn, [])
                for row_data in value:
                    doc.append(fn, row_data)
            else:
                doc.set(fn, value)

            updated.append(fn)

        from frappe.utils import now_datetime
        for child_row in (doc.get("custom_pre_offer_forms") or []):
            if child_row.portal_form == target_row["portal_form"]:
                child_row.status = "Filled"
                child_row.filled_at = now_datetime()
                break

        pre_offer_rows = doc.get("custom_pre_offer_forms") or []
        if pre_offer_rows and all((r.status or "") == "Filled" for r in pre_offer_rows):
            doc.custom_substatus = "Pre Offer Form Filled"

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        from recruitment.api.action_center import mark_item_completed
        candidate_email = doc.email_id
        if candidate_email:
            if target_row.get("name"):
                mark_item_completed(
                    reference_doctype="Job Applicant Pre Offer Form",
                    reference_docname=target_row["name"],
                    candidate_email=candidate_email,
                    commit=True,
                )
            else:
                mark_item_completed(
                    reference_doctype="Job Applicant",
                    reference_docname=applicant_name,
                    candidate_email=candidate_email,
                    commit=True,
                )

        return {
            "status": "success",
            "message": _("Pre Offer Form submitted successfully."),
            "form_name": target_row["portal_form"],
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Pre Offer Form Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}



@candidate_required
def get_candidate_portal_form(job_applicant_id):
    """
    Returns the structured portal form for a given job applicant.

    Scenario A — Employee Onboarding record exists:
        Form fields and pre-filled values are resolved from the onboarding doc.
        Source priority: per-record child table > linked portal form > global default.

    Scenario B — No Employee Onboarding record found:
        Falls back to the global default Onboarding Portal Form.
        All field values will be null.
    """
    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    onboarding_name = _get_onboarding_name_by_job_applicant(applicant_name)
    doc = frappe.get_doc("Employee Onboarding", onboarding_name) if onboarding_name else None
    pre_release = _get_active_pre_release(applicant_name)
    applicant_doc = frappe.get_doc("Job Applicant", applicant_name)

    portal_rows, form_source = _get_onboarding_portal_rows(doc, pre_release)

    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("No candidate portal fields configured. Please set up an Onboarding Portal Form."),
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}

    return {
        "status": "success",
        "job_applicant": applicant_name,
        "form_source": form_source,
        "onboarding_name": doc.name if doc else None,
        "pre_release_name": pre_release["name"] if pre_release else None,
        "boarding_status": doc.boarding_status if doc else None,
        "tabs": _build_tabbed_response(portal_rows, meta_lookup, doc, applicant_doc),
    }


@candidate_required
def save_candidate_portal_data(job_applicant_id, data):
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    onboarding_name = _get_onboarding_name_by_job_applicant(applicant_name)
    pre_release = _get_active_pre_release(applicant_name)

    if not onboarding_name:
        if not pre_release:
            frappe.local.response["http_status_code"] = 404
            return {"status": "error", "message": _(f"No onboarding form pending for '{job_applicant_id}'.")}
        onboarding_name = materialize_onboarding_from_applicant(applicant_name, prefill=data)
        pre_release = None  # materialized; no longer "active"

    onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)
    portal_rows, _ = _get_onboarding_portal_rows(onboarding_doc, pre_release)

    # Only allow editing fields where approval_status is Pending or Rejected
    _EDITABLE_STATUSES = frozenset({"Pending", "Rejected"})
    allowed_map = {
        r.fieldname: r for r in portal_rows
        if not r.get("hidden")
        and not r.get("read_only")
        and (r.get("approval_status") or "Pending") in _EDITABLE_STATUSES
    }

    if not allowed_map:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No editable fields available. All fields are under review or already approved.")}

    # Validate mandatory fields (only among editable fields)
    missing = [
        row.label or fn for fn, row in allowed_map.items()
        if row.get("is_mandatory") and (fn not in data or data[fn] in (None, "", []))
    ]

    if missing:
        frappe.local.response["http_status_code"] = 422
        return {
            "status": "error",
            "message": _("The following mandatory fields are missing: {0}").format(", ".join(missing)),
            "missing_fields": missing,
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}

    try:
        doc = onboarding_doc
        updated = []

        for fn, value in data.items():
            if fn not in allowed_map:
                continue

            meta = meta_lookup.get(fn, {})
            fieldtype = allowed_map[fn].get("fieldtype") or meta.get("fieldtype", "Data")

            if fieldtype == "Table" and isinstance(value, list):
                doc.set(fn, [])
                for row_data in value:
                    doc.append(fn, row_data)
            else:
                doc.set(fn, value)

            updated.append(fn)

        doc.save(ignore_permissions=True)

        # After saving, mark updated portal field rows as "Filled"
        # and snapshot the submitted value into current_value
        if updated:
            import json as _json
            doc.reload()
            for row in (doc.get("custom_candidate_portal_fields") or []):
                if row.fieldname not in updated:
                    continue
                ft = row.get("fieldtype") or "Data"
                # Snapshot submitted value
                live_val = doc.get(row.fieldname)
                if ft == "Table":
                    rows_data = live_val or []
                    row.current_value = _json.dumps(
                        [{k: str(v or "") for k, v in (r.as_dict() if hasattr(r, "as_dict") else r).items()
                          if not k.startswith("_") and k not in {
                              "doctype", "parent", "parenttype", "parentfield",
                              "docstatus", "owner", "creation", "modified", "modified_by"
                          }} for r in rows_data],
                        ensure_ascii=False, default=str
                    )
                else:
                    row.current_value = str(live_val) if live_val is not None else ""
                # Mark as Filled (awaiting HR review)
                row.approval_status = "Filled"

            # Update overall submission status
            doc.save(ignore_permissions=True)

        # ── Sync Candidate Action Center Item ─────────────────────────────────
        try:
            from recruitment.api.action_center import sync_onboarding_field_rejection_action
            doc.reload()
            sync_onboarding_field_rejection_action(doc)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Action Center Sync Failed (Candidate Refill)")

        # Stamp applicant substatus on first candidate fill
        try:
            current_substatus = frappe.db.get_value("Job Applicant", applicant_name, "custom_substatus")
            if (current_substatus or "") != "Pre Onboarding Filled":
                frappe.db.set_value(
                    "Job Applicant", applicant_name,
                    "custom_substatus", "Pre Onboarding Filled",
                    update_modified=False,
                )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Failed to update applicant substatus on candidate fill")

        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Data saved successfully. Fields are now pending HR review."),
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Candidate Portal Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}


@candidate_required
def get_portal_field_names(job_applicant_id=None):
    enforce_candidate_identity(job_applicant_id=job_applicant_id)
    onboarding_doc = None
    if job_applicant_id:
        onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)
        if onboarding_name:
            onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)

    rows, _ = _get_onboarding_portal_rows(onboarding_doc)
    return {
        "status": "success",
        "fields": [r.fieldname for r in rows],
    }


@candidate_required
def get_job_applicant_portal_form(job_applicant_id):
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    enforce_candidate_identity(job_applicant_id=job_applicant_id)

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    doc = frappe.get_doc("Job Applicant", job_applicant_id)
    portal_rows, _ = _get_job_applicant_portal_settings(job_applicant_id)

    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("No job applicant portal fields configured.")}

    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}
    tab_order = []
    tab_map = {}

    for row in portal_rows:
        fn = row.fieldname
        tab_lbl = (row.tab_label or "").strip()
        sec_lbl = (row.section_label or "").strip()
        meta = meta_lookup.get(fn, {})

        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "is_mandatory": int(row.is_mandatory or 0),
            "read_only": int(row.read_only or 0),
            "hidden": int(row.hidden or 0),
            "options": field_options,
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if tab_lbl not in tab_map:
            tab_map[tab_lbl] = {"section_order": [], "section_map": {}}
            tab_order.append(tab_lbl)

        tab_entry = tab_map[tab_lbl]
        if sec_lbl not in tab_entry["section_map"]:
            tab_entry["section_map"][sec_lbl] = []
            tab_entry["section_order"].append(sec_lbl)

        tab_entry["section_map"][sec_lbl].append(field_entry)

    return {
        "status": "success",
        "job_applicant_name": doc.name,
        "tabs": [
            {
                "tab": tab_lbl,
                "sections": [
                    {"section": sec_lbl, "fields": tab_map[tab_lbl]["section_map"][sec_lbl]}
                    for sec_lbl in tab_map[tab_lbl]["section_order"]
                ],
            }
            for tab_lbl in tab_order
        ],
    }


@candidate_required
def save_job_applicant_portal_data(job_applicant_id, data):
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    enforce_candidate_identity(job_applicant_id=job_applicant_id)

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    portal_rows, _ = _get_job_applicant_portal_settings(job_applicant_id)
    allowed_map = {r.fieldname: r for r in portal_rows if not r.get("hidden") and not r.get("read_only")}

    if not allowed_map:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No editable fields configured.")}

    missing = [
        row.label or fn for fn, row in allowed_map.items()
        if row.get("is_mandatory") and (fn not in data or data[fn] in (None, "", []))
    ]

    if missing:
        frappe.local.response["http_status_code"] = 422
        return {
            "status": "error",
            "message": _("The following mandatory fields are missing: {0}").format(", ".join(missing)),
            "missing_fields": missing,
        }

    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}

    try:
        doc = frappe.get_doc("Job Applicant", job_applicant_id)
        updated = []

        for fn, value in data.items():
            if fn not in allowed_map:
                continue

            meta = meta_lookup.get(fn, {})
            fieldtype = allowed_map[fn].get("fieldtype") or meta.get("fieldtype", "Data")

            if fieldtype == "Table" and isinstance(value, list):
                doc.set(fn, [])
                for row_data in value:
                    doc.append(fn, row_data)
            else:
                doc.set(fn, value)

            updated.append(fn)

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Data saved successfully."),
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Job Applicant Portal Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}


@candidate_required
def get_job_applicant_portal_field_names(job_applicant_id=None):
    enforce_candidate_identity(job_applicant_id=job_applicant_id)
    return {
        "status": "success",
        "fields": [r.fieldname for r in _get_job_applicant_portal_settings(job_applicant_id)[0]],
    }


@frappe.whitelist()
def get_candidate_feature_flags():
    doc = frappe.get_single("Candidate Portal Feature Flag")

    result = {}
    for row in doc.feature_flags:
        if row.page_name:
            result[row.page_name.strip().lower().replace(" ", "_")] = row.is_enabled

    return result


@candidate_required
def get_link_field_options(doctype, search_text=None, query=None, txt=None, limit=20):
    """Returns [{id, label}] for a doctype; label uses title_field when set.
    Accepts `search_text`, `query`, or `txt` as the search term (first non-empty wins)."""
    if not doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Doctype is required.")}

    try:
        title_field = frappe.get_meta(doctype).get("title_field") or None
    except Exception:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Doctype '{0}' not found.").format(doctype)}

    has_title = bool(title_field) and title_field != "name"
    fields = ["name"] + ([title_field] if has_title else [])

    search = (search_text or query or txt or "").strip()
    or_filters = None
    if search:
        like = f"%{search}%"
        or_filters = [["name", "like", like]] + ([[title_field, "like", like]] if has_title else [])

    try:
        records = frappe.get_all(
            doctype, fields=fields, or_filters=or_filters,
            limit=int(limit or 20), order_by=f"{title_field or 'name'} asc",
        )
    except Exception as e:
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

    results = [{"id": r["name"], "label": (r.get(title_field) if has_title else None) or r["name"]} for r in records]
    return {"status": "success", "doctype": doctype, "title_field": title_field, "total": len(results), "results": results}


@frappe.whitelist(allow_guest=True)
def get_website_branding():
    settings = frappe.get_single("Website Settings")
    return {
        "title_prefix": settings.title_prefix,
        "app_logo": settings.app_logo,
    }
