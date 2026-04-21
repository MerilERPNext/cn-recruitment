import frappe
import json
from frappe import _
from recruitment.api.action_center import sync_onboarding_field_rejection_action


# ─── Field type sets ──────────────────────────────────────────────────────────
LAYOUT_FIELDTYPES = frozenset({
    "Column Break", "Tab Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Attach Image",
    "Signature", "Color", "Barcode", "Geolocation",
})

SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "amendment_date",
    "custom_approval_html", "custom_field_level_approvals",
    "custom_candidate_portal_fields_tab", "custom_candidate_portal_fields",
    "custom_onboarding_portal_form",
    "custom_candidate_portal_fields_section_break",
    "custom_fetch_candidate_portal_fields_btn",
    "custom_available_candidate_portal_fields_html",
})

SKIP_CHILD_FIELDNAMES = frozenset({
    "name", "idx", "parent", "parentfield", "parenttype",
    "docstatus", "owner", "creation", "modified", "modified_by", "amended_from",
})

VALID_STATUSES = frozenset({"Pending", "Filled", "Approved", "Rejected"})


# ─── Meta helpers ─────────────────────────────────────────────────────────────

def _get_child_meta_fields(child_doctype):
    """Returns user-facing field defs from a child doctype."""
    try:
        meta = frappe.get_meta(child_doctype)
    except Exception:
        return []
    fields = []
    for df in meta.fields:
        if df.fieldtype in LAYOUT_FIELDTYPES or df.fieldtype == "Section Break":
            continue
        if df.fieldname in SKIP_CHILD_FIELDNAMES or df.get("hidden"):
            continue
        fields.append({
            "fieldname": df.fieldname,
            "label":     (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
        })
    return fields


def _get_doctype_approval_fields(doctype="Employee Onboarding"):
    """Used only by debug endpoint get_section_structure."""
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return []

    result = []
    current_section = "General"
    current_section_fieldname = ""
    SKIP_TAB_LABELS = {"Field Level Approvals", "Candidate Portal Fields"}

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label and tab_label not in SKIP_TAB_LABELS:
                current_section = tab_label
                current_section_fieldname = df.fieldname
            continue
        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section = sec_label
                current_section_fieldname = df.fieldname
            continue
        if df.fieldtype in LAYOUT_FIELDTYPES or df.fieldname in SKIP_FIELDNAMES or df.get("hidden"):
            continue

        entry = {
            "fieldname":         df.fieldname,
            "label":             (df.label or df.fieldname).strip(),
            "fieldtype":         df.fieldtype,
            "section":           current_section,
            "section_fieldname": current_section_fieldname,
        }
        if df.fieldtype == "Table" and df.options:
            entry["child_doctype"] = df.options
            entry["child_fields"]  = _get_child_meta_fields(df.options)
        result.append(entry)
    return result


# ─── Value helpers ────────────────────────────────────────────────────────────

def _get_field_value(doc, fieldname, fieldtype, child_fields=None):
    val = doc.get(fieldname)
    if fieldtype == "Table":
        rows = val or []
        child_fns = [f["fieldname"] for f in (child_fields or [])]
        return [{fn: str(row.get(fn) or "") for fn in child_fns} for row in rows]
    return str(val) if val is not None else ""


def _serialize_value(val, fieldtype):
    if fieldtype == "Table":
        return json.dumps(val, ensure_ascii=False, default=str) if isinstance(val, list) else "[]"
    return str(val) if val is not None else ""


def _deserialize_value(raw, fieldtype):
    if fieldtype == "Table":
        try:
            return json.loads(raw) if raw else []
        except Exception:
            return []
    return raw or ""


# ─── Doc helpers ──────────────────────────────────────────────────────────────

def _get_doc(onboarding_name):
    try:
        return frappe.get_doc("Employee Onboarding", onboarding_name)
    except frappe.DoesNotExistError:
        return None


def _is_new_doc_name(name):
    return name and name.startswith("new-")


# ─── Child table → approval list ──────────────────────────────────────────────

def _load_approval_list(doc):
    """
    Build the FLA panel data from child table rows.
    Returns a list compatible with the JS panel (same shape as the old JSON).
    """
    rows = doc.get("custom_candidate_portal_fields") or []
    result = []
    for row in rows:
        if row.get("hidden"):
            continue
        fn = row.get("fieldname") or ""
        if not fn:
            continue

        fieldtype  = row.get("fieldtype") or "Data"
        section    = (row.get("section_label") or row.get("tab_label") or "General").strip()
        raw_cv     = row.get("current_value") or ""
        current_v  = _deserialize_value(raw_cv, fieldtype)
        status     = row.get("approval_status") or "Pending"

        entry = {
            "fieldname":    fn,
            "label":        (row.get("label") or fn).strip(),
            "fieldtype":    fieldtype,
            "section":      section,
            "status":       status,              # backward compat key
            "approval_status": status,
            "current_value": current_v,
            "hr_comment":   row.get("hr_comment") or "",
            "reviewed_by":  row.get("reviewed_by") or None,
            "reviewed_on":  row.get("reviewed_on") or None,
        }
        if fieldtype == "Table":
            cd = row.get("options") or ""
            entry["child_doctype"] = cd
            entry["child_fields"]  = _get_child_meta_fields(cd) if cd else []

        result.append(entry)
    return result


def _compute_counts(approval_list):
    counts = {"Pending": 0, "Filled": 0, "Approved": 0, "Rejected": 0}
    for e in approval_list:
        st = e.get("status") or e.get("approval_status") or "Pending"
        counts[st] = counts.get(st, 0) + 1
    return counts


def _sync_overall_status(doc):
    """
    Previously set a custom status field, but removed by request because 
    the doctype's row size is full, and 'boarding_status' already tracks overall state.
    """
    pass


def _save_doc(doc):
    doc.save(ignore_permissions=True)
    frappe.db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Initialize / re-sync  (idempotent)
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def initialize_approval_json(onboarding_name):
    """
    Syncs child table rows:
      - Ensures approval_status is set (default "Pending")
      - Refreshes current_value snapshot from the live EO doc values
    Returns the approval list for the FLA panel.
    """
    if _is_new_doc_name(onboarding_name):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Document not saved yet."), "data": []}

    frappe.has_permission("Employee Onboarding", "write", throw=True)
    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error",
                "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
                "data": []}

    changed = False
    for row in (doc.get("custom_candidate_portal_fields") or []):
        if not row.get("approval_status"):
            row.approval_status = "Pending"
            changed = True

        # Refresh current_value snapshot from the live doc field value
        ft  = row.get("fieldtype") or "Data"
        cfs = _get_child_meta_fields(row.get("options") or "") if ft == "Table" else None
        live_val = _get_field_value(doc, row.fieldname, ft, cfs)
        new_cv   = _serialize_value(live_val, ft)
        if row.get("current_value") != new_cv:
            row.current_value = new_cv
            changed = True

    if changed:
        _save_doc(doc)
        doc.reload()

    merged = _load_approval_list(doc)
    return {
        "status":  "success",
        "message": _("Approval data synced with {0} fields").format(len(merged)),
        "data":    merged,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET — for external frontend
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist(allow_guest=False)
def get_onboarding_fields_for_approval(onboarding_name):
    """Returns all fields with values + statuses, grouped by section."""
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error",
                "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
                "data": []}

    enriched = _load_approval_list(doc)
    counts   = _compute_counts(enriched)

    sections = {}
    for e in enriched:
        sec = e.get("section", "General")
        if sec not in sections:
            sections[sec] = {"Pending": 0, "Filled": 0, "Approved": 0, "Rejected": 0, "total": 0}
        st = e.get("status", "Pending")
        sections[sec][st] = sections[sec].get(st, 0) + 1
        sections[sec]["total"] += 1

    return {
        "status":          "success",
        "onboarding_name": doc.name,
        "job_applicant":   doc.job_applicant,
        "total":           len(enriched),
        "counts":          counts,
        "sections":        sections,
        "data":            enriched,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. POST — full approval array save
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def save_full_approval_json(onboarding_name, approval_data):
    """Accepts complete approval array [{fieldname, status, hr_comment},...] and saves."""
    frappe.has_permission("Employee Onboarding", "write", throw=True)

    if isinstance(approval_data, str):
        try:
            approval_data = json.loads(approval_data)
        except (TypeError, ValueError):
            frappe.throw(_("approval_data must be a valid JSON array."))

    if not isinstance(approval_data, list):
        frappe.throw(_("approval_data must be a list/array."))

    for item in approval_data:
        st = item.get("status", "Pending")
        if st not in VALID_STATUSES:
            frappe.throw(_("Invalid status '{0}' for field '{1}'.").format(
                st, item.get("fieldname", "?")))

    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))

    reviewer     = frappe.session.user
    now          = frappe.utils.now()
    incoming_map = {item["fieldname"]: item for item in approval_data if item.get("fieldname")}

    for row in (doc.get("custom_candidate_portal_fields") or []):
        if row.get("hidden"):
            continue
        incoming   = incoming_map.get(row.fieldname, {})
        new_status = incoming.get("status", row.get("approval_status") or "Pending")
        old_status = row.get("approval_status") or "Pending"

        row.approval_status = new_status
        if incoming.get("hr_comment") is not None:
            row.hr_comment = incoming.get("hr_comment") or ""

        if new_status in ("Approved", "Rejected"):
            if new_status != old_status:
                row.reviewed_by = reviewer
                row.reviewed_on = now
            elif not row.get("reviewed_by"):
                row.reviewed_by = reviewer
                row.reviewed_on = now
        elif new_status == "Pending":
            row.hr_comment  = ""
            row.reviewed_by = None
            row.reviewed_on = None

    _save_doc(doc)
    doc.reload()
    _sync_overall_status(doc)
    frappe.db.commit()
    sync_onboarding_field_rejection_action(doc)

    final_list = _load_approval_list(doc)
    counts     = _compute_counts(final_list)
    return {
        "status": "success", "message": _("Saved successfully"),
        "total": len(final_list), "counts": counts, "data": final_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Update single field
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def update_field_approval_status(onboarding_name, fieldname, new_status, comment=None):
    if new_status not in VALID_STATUSES:
        frappe.throw(_("Invalid status '{0}'.").format(new_status))
    frappe.has_permission("Employee Onboarding", "write", throw=True)

    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))

    reviewer = frappe.session.user
    now      = frappe.utils.now()
    updated  = False

    for row in (doc.get("custom_candidate_portal_fields") or []):
        if row.get("fieldname") != fieldname:
            continue

        row.approval_status = new_status

        if new_status == "Rejected":
            row.hr_comment  = comment or ""
            row.reviewed_by = reviewer
            row.reviewed_on = now
        elif new_status == "Approved":
            row.hr_comment  = ""
            row.reviewed_by = reviewer
            row.reviewed_on = now
        elif new_status == "Pending":
            row.hr_comment  = ""
            row.reviewed_by = None
            row.reviewed_on = None
        # "Filled" is set only by candidate save — HR cannot set it directly

        updated = True
        break

    if not updated:
        frappe.throw(_("Field '{0}' not found in candidate portal fields.").format(fieldname))

    _save_doc(doc)
    doc.reload()
    _sync_overall_status(doc)
    frappe.db.commit()
    sync_onboarding_field_rejection_action(doc)

    approval_list = _load_approval_list(doc)
    return {"status": "success", "message": _("Updated"), "data": approval_list}


# ─────────────────────────────────────────────────────────────────────────────
# 5. Update ALL fields in a section
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def update_section_approval_status(onboarding_name, section_name, new_status, comment=None):
    """Sets all fields in section_name to new_status."""
    if new_status not in VALID_STATUSES:
        frappe.throw(_("Invalid status '{0}'.").format(new_status))
    frappe.has_permission("Employee Onboarding", "write", throw=True)

    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))

    reviewer = frappe.session.user
    now      = frappe.utils.now()
    updated  = 0

    for row in (doc.get("custom_candidate_portal_fields") or []):
        if row.get("hidden"):
            continue
        row_section = (row.get("section_label") or row.get("tab_label") or "General").strip()
        if row_section != section_name:
            continue

        # Only approve/reject fields that are pending or filled
        if new_status in ("Approved", "Rejected") and (row.get("approval_status") or "Pending") not in ("Pending", "Filled", "Approved", "Rejected"):
            continue

        row.approval_status = new_status
        if new_status == "Rejected":
            row.hr_comment  = comment or ""
            row.reviewed_by = reviewer
            row.reviewed_on = now
        elif new_status == "Approved":
            row.hr_comment  = ""
            row.reviewed_by = reviewer
            row.reviewed_on = now
        elif new_status == "Pending":
            row.reviewed_by = None
            row.reviewed_on = None
        updated += 1

    if not updated:
        frappe.throw(_("No reviewable fields found for section '{0}'.").format(section_name))

    _save_doc(doc)
    doc.reload()
    _sync_overall_status(doc)
    frappe.db.commit()
    sync_onboarding_field_rejection_action(doc)

    approval_list = _load_approval_list(doc)
    counts        = _compute_counts(approval_list)
    return {
        "status":  "success",
        "message": _("{0} field(s) in '{1}' set to {2}").format(updated, section_name, new_status),
        "counts":  counts,
        "data":    approval_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Bulk update all Filled fields
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def bulk_update_approval_status(onboarding_name, new_status, comment=None):
    if new_status not in {"Approved", "Rejected"}:
        frappe.throw(_("Only 'Approved' or 'Rejected' allowed for bulk update."))
    frappe.has_permission("Employee Onboarding", "write", throw=True)

    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))

    reviewer = frappe.session.user
    now      = frappe.utils.now()

    for row in (doc.get("custom_candidate_portal_fields") or []):
        # Allow bulk-action on fields that are Pending or Filled
        if (row.get("approval_status") or "Pending") not in ("Pending", "Filled"):
            continue
        row.approval_status = new_status
        if new_status == "Approved":
            row.hr_comment  = ""
            row.reviewed_by = reviewer
            row.reviewed_on = now
        else:
            row.hr_comment  = comment or ""
            row.reviewed_by = reviewer
            row.reviewed_on = now

    _save_doc(doc)
    doc.reload()
    _sync_overall_status(doc)
    frappe.db.commit()
    sync_onboarding_field_rejection_action(doc)

    approval_list = _load_approval_list(doc)
    counts        = _compute_counts(approval_list)
    return {"status": "success", "message": _("Done"), "counts": counts, "data": approval_list}


# ─────────────────────────────────────────────────────────────────────────────
# 7. Simple read
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def get_approval_list(onboarding_name):
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    doc = _get_doc(onboarding_name)
    if not doc:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error",
                "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
                "data": []}
    return {"status": "success", "data": _load_approval_list(doc)}


# ─────────────────────────────────────────────────────────────────────────────
# 8. Debug: section structure from meta
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def get_section_structure():
    """Returns section structure from Employee Onboarding meta (debug)."""
    frappe.has_permission("Employee Onboarding", "read", throw=True)

    fields   = _get_doctype_approval_fields("Employee Onboarding")
    sections = {}
    order    = []
    for f in fields:
        sec = f.get("section", "General")
        if sec not in sections:
            sections[sec] = {"name": sec, "field_count": 0, "fields": []}
            order.append(sec)
        sections[sec]["field_count"] += 1
        sections[sec]["fields"].append({
            "fieldname": f["fieldname"], "label": f["label"], "fieldtype": f["fieldtype"]
        })
    return {
        "status": "success",
        "total_fields": len(fields),
        "total_sections": len(order),
        "sections": [sections[s] for s in order],
    }
