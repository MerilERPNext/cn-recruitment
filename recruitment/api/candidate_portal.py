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
})

def _read_onboarding_meta():
    """Returns a flat list of field dicts from Employee Onboarding meta."""
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
    """Returns a flat list of field dicts from Job Applicant meta."""
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

def _get_portal_settings():
    """Returns the portal_fields from Employee Onboarding Portal Settings."""
    try:
        return frappe.get_single("Employee Onboarding Portal Settings").portal_fields or []
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
    Returns per-onboarding candidate portal field rows when configured,
    otherwise falls back to global Employee Onboarding Portal Settings.
    """
    if onboarding_doc and onboarding_doc.meta.get_field("custom_candidate_portal_fields"):
        rows = onboarding_doc.get("custom_candidate_portal_fields") or []
        if rows:
            return rows
    return _get_portal_settings()

def _get_job_applicant_portal_settings():
    """Returns the portal_fields from Job Applicant Portal Settings."""
    try:
        return frappe.get_single("Job Applicant Portal Settings").portal_fields or []
    except Exception:
        return []

def _get_child_table_fields(child_doctype):
    """Returns renderable field metadata for a child table doctype."""
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


def _serialize_doc_field_value(doc, fieldname, fieldtype):
    """Returns a JSON-safe field value from a document."""
    value = doc.get(fieldname)

    if fieldtype == "Table":
        if not value:
            return []

        rows = []
        for row in value:
            row_dict = row.as_dict() if hasattr(row, "as_dict") else dict(row)
            cleaned_row = {}

            for key, row_value in row_dict.items():
                if key.startswith("_"):
                    continue
                if key in {
                    "doctype", "parent", "parenttype", "parentfield",
                    "docstatus", "owner", "creation", "modified", "modified_by",
                }:
                    continue
                cleaned_row[key] = row_value

            rows.append(cleaned_row)

        return rows

    return value

@frappe.whitelist()
def get_all_onboarding_fields():
    """Returns all fields grouped for the desk settings page."""
    frappe.has_permission("Employee Onboarding Portal Settings", "read", throw=True)
    fields = _read_onboarding_meta()
    return {
        "status": "success",
        "total": len(fields),
        "fields": fields,
    }


@frappe.whitelist()
def get_all_onboarding_fields_for_onboarding():
    """Returns all Employee Onboarding fields for per-candidate portal field inspector."""
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    fields = _read_onboarding_meta()
    return {
        "status": "success",
        "total": len(fields),
        "fields": fields,
    }

@frappe.whitelist()
def get_all_job_applicant_fields():
    """Returns Job Applicant fields configured in Job Applicant Portal Settings."""
    frappe.has_permission("Job Applicant Portal Settings", "read", throw=True)
    portal_rows = _get_job_applicant_portal_settings()
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
            field_entry["child_fields"] = _get_child_table_fields(field_options)

        fields.append(field_entry)

    return {
        "status": "success",
        "total": len(fields),
        "fields": fields,
    }


@frappe.whitelist()
def get_available_job_applicant_fields():
    """Returns all available Job Applicant meta fields for settings field picker."""
    frappe.has_permission("Job Applicant Portal Settings", "read", throw=True)
    fields = _read_job_applicant_meta(include_hidden=True, include_skipped=True)
    return {
        "status": "success",
        "total": len(fields),
        "fields": fields,
    }

@frappe.whitelist(allow_guest=True)
def get_candidate_portal_form(job_applicant_id):
    """Returns the structured portal form with current document values for a given applicant."""

    onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)

    if not onboarding_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Employee Onboarding for '{job_applicant_id}' not found.")}

    doc = frappe.get_doc("Employee Onboarding", onboarding_name)
    portal_rows = _get_onboarding_portal_rows(doc)

    if not portal_rows:
        return {
            "status": "error",
            "message": _("No candidate portal fields configured.")
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}
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
            field_entry["child_fields"] = _get_child_table_fields(field_options)

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
        "onboarding_name": doc.name,
        "job_applicant": doc.job_applicant,
        "boarding_status": doc.boarding_status,
        "tabs": [
            {
                "tab": tab_lbl,
                "sections": [
                    {"section": sec_lbl, "fields": tab_map[tab_lbl]["section_map"][sec_lbl]}
                    for sec_lbl in tab_map[tab_lbl]["section_order"]
                ]
            }
            for tab_lbl in tab_order
        ]
    }

@frappe.whitelist(allow_guest=True)
def save_candidate_portal_data(job_applicant_id, data):
    """Saves candidate-filled form data back to the Onboarding document using their Applicant ID."""
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
    portal_rows = _get_onboarding_portal_rows(onboarding_doc)
    allowed_map = {r.fieldname: r for r in portal_rows if not r.get("hidden") and not r.get("read_only")}

    if not allowed_map:
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
        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Data saved successfully."),
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Candidate Portal Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

@frappe.whitelist(allow_guest=True)
def get_portal_field_names(job_applicant_id=None):
    """Returns a list of configured fieldnames."""
    onboarding_doc = None
    if job_applicant_id:
        onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)
        if onboarding_name:
            onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)

    rows = _get_onboarding_portal_rows(onboarding_doc)
    return {
        "status": "success",
        "fields": [r.fieldname for r in rows],
    }

@frappe.whitelist(allow_guest=True)
def get_job_applicant_portal_form(job_applicant_id):
    """Returns the structured portal form with current Job Applicant values."""
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    doc = frappe.get_doc("Job Applicant", job_applicant_id)
    portal_rows = _get_job_applicant_portal_settings()

    if not portal_rows:
        return {
            "status": "error",
            "message": _("No job applicant portal fields configured.")
        }

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
            field_entry["child_fields"] = _get_child_table_fields(field_options)

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
                ]
            }
            for tab_lbl in tab_order
        ]
    }

@frappe.whitelist(allow_guest=True)
def save_job_applicant_portal_data(job_applicant_id, data):
    """Saves candidate-filled form data back to the Job Applicant document."""
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

    portal_rows = _get_job_applicant_portal_settings()
    allowed_map = {r.fieldname: r for r in portal_rows if not r.get("hidden") and not r.get("read_only")}

    if not allowed_map:
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
def get_job_applicant_portal_field_names():
    """Returns a list of configured fieldnames for Job Applicant portal."""
    return {
        "status": "success",
        "fields": [r.fieldname for r in _get_job_applicant_portal_settings()],
    }

@frappe.whitelist(allow_guest=True)
def get_candidate_feature_flags():
    doc = frappe.get_single("Candidate Portal Feature Flag")

    result = {}
    for row in doc.feature_flags:
        if row.page_name:
            result[row.page_name.strip().lower().replace(" ", "_")] = row.is_enabled

    return result
