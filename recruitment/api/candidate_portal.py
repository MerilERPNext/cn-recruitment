import frappe
from frappe import _

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


def _get_onboarding_portal_rows(onboarding_doc=None):
    """
    Returns (portal_field_rows, form_source) based on priority:
      1. custom_candidate_portal_fields child table  -> "per_record_fields"
      2. custom_onboarding_portal_form linked form   -> "linked_form"
      3. Global default Onboarding Portal Forms      -> "default_form"
    """
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


def _build_tabbed_response(portal_rows, meta_lookup, doc=None):
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
            "value": _serialize_doc_field_value(doc, fn, fieldtype) if doc else None,
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


@frappe.whitelist(allow_guest=True)
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

        fields.append(field_entry)

    return {
        "status": "success",
        "form_name": resolved_form,
        "total": len(fields),
        "fields": fields,
    }


@frappe.whitelist()
def get_available_job_applicant_fields():
    frappe.has_permission("Job Applicant Portal Forms", "read", throw=True)
    fields = _read_job_applicant_meta(include_hidden=True, include_skipped=True)
    return {"status": "success", "total": len(fields), "fields": fields}


def _get_pre_offer_portal_settings(job_applicant_id):
    form_name = frappe.db.get_value("Job Applicant", job_applicant_id, "custom_pre_offer_portal_form")
    if not form_name:
        return [], None
    try:
        rows = frappe.get_doc("Job Applicant Portal Forms", form_name).portal_fields or []
        return rows, form_name
    except Exception:
        return [], None


@frappe.whitelist(allow_guest=True)
def get_pre_offer_form(job_applicant_id):
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    portal_rows, resolved_form = _get_pre_offer_portal_settings(job_applicant_id)

    if resolved_form is None:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("No Pre Offer Form has been sent for this applicant yet.")}

    doc = frappe.get_doc("Job Applicant", job_applicant_id)
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
        "job_applicant": job_applicant_id,
        "form_name": resolved_form,
        "pre_offer_form_status": doc.get("custom_pre_offer_form_status") or "Sent",
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


@frappe.whitelist(allow_guest=True)
def save_pre_offer_form_data(job_applicant_id, data):
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

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    portal_rows, resolved_form = _get_pre_offer_portal_settings(job_applicant_id)

    if resolved_form is None:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No Pre Offer Form configured for this applicant.")}

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

        doc.custom_pre_offer_form_status = "Filled"
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        from recruitment.api.action_center import mark_item_completed
        candidate_email = doc.email_id
        if candidate_email:
            mark_item_completed(
                reference_doctype="Job Applicant",
                reference_docname=job_applicant_id,
                candidate_email=candidate_email,
                commit=True,
            )

        return {
            "status": "success",
            "message": _("Pre Offer Form submitted successfully."),
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Pre Offer Form Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}



@frappe.whitelist(allow_guest=True)
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
    onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)
    doc = frappe.get_doc("Employee Onboarding", onboarding_name) if onboarding_name else None

    portal_rows, form_source = _get_onboarding_portal_rows(doc)

    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("No candidate portal fields configured. Please set up an Onboarding Portal Form."),
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}

    return {
        "status": "success",
        "job_applicant": job_applicant_id,
        "form_source": form_source,
        "onboarding_name": doc.name if doc else None,
        "boarding_status": doc.boarding_status if doc else None,
        "tabs": _build_tabbed_response(portal_rows, meta_lookup, doc),
    }


@frappe.whitelist(allow_guest=True)
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

    onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)

    if not onboarding_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Employee Onboarding for '{job_applicant_id}' not found.")}

    onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)
    portal_rows, _ = _get_onboarding_portal_rows(onboarding_doc)

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


@frappe.whitelist(allow_guest=True)
def get_portal_field_names(job_applicant_id=None):
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


@frappe.whitelist(allow_guest=True)
def get_job_applicant_portal_form(job_applicant_id):
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

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


@frappe.whitelist(allow_guest=True)
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


@frappe.whitelist(allow_guest=True)
def get_job_applicant_portal_field_names(job_applicant_id=None):
    return {
        "status": "success",
        "fields": [r.fieldname for r in _get_job_applicant_portal_settings(job_applicant_id)[0]],
    }


@frappe.whitelist(allow_guest=True)
def get_candidate_feature_flags():
    doc = frappe.get_single("Candidate Portal Feature Flag")

    result = {}
    for row in doc.feature_flags:
        if row.page_name:
            result[row.page_name.strip().lower().replace(" ", "_")] = row.is_enabled

    return result


@frappe.whitelist(allow_guest=True)
def get_website_branding():
    settings = frappe.get_single("Website Settings")
    return {
        "title_prefix": settings.title_prefix,
        "app_logo": settings.app_logo,
    }
