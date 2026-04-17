import frappe
import json
from frappe import _
from recruitment.api.action_center import sync_onboarding_field_rejection_action


# ─── Field type sets ──────────────────────────────────────────────────────────
# NOTE: "Section Break" is intentionally NOT in LAYOUT_FIELDTYPES.
# We handle it explicitly in _get_doctype_approval_fields() to track sections.
LAYOUT_FIELDTYPES = frozenset({
    "Column Break", "Tab Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Attach Image",
    "Signature", "Color", "Barcode", "Geolocation",
})

SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "amendment_date",
    "custom_field_approval_json",
    "custom_approval_html",
    "custom_field_level_approvals",
    "custom_candidate_portal_fields_tab",
    "custom_candidate_portal_fields",
})

SKIP_CHILD_FIELDNAMES = frozenset({
    "name", "idx", "parent", "parentfield", "parenttype",
    "docstatus", "owner", "creation", "modified", "modified_by",
    "amended_from",
})

VALID_STATUSES = frozenset({"Pending", "Approved", "Rejected"})


# ─────────────────────────────────────────────────────────────────────────────
# Meta helpers
# ─────────────────────────────────────────────────────────────────────────────

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
        if df.fieldname in SKIP_CHILD_FIELDNAMES:
            continue
        if df.get("hidden"):
            continue
        fields.append({
            "fieldname": df.fieldname,
            "label":     (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
        })
    return fields


def _get_doctype_approval_fields(doctype="Employee Onboarding"):
    """
    Reads ALL user-facing fields from the doctype meta (standard + custom).

    Section tracking rules:
      - Tab Break WITH label    → resets current_section to that tab label,
                                  becomes the active "parent" context.
      - Tab Break without label → ignored (skipped).
      - Section Break WITH label → creates a new named section.
      - Section Break without label → layout-only; current section unchanged.
      - All other LAYOUT_FIELDTYPES → skipped silently.

    This ensures that unlabeled section/column breaks don't collapse
    every field into "General".
    """
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        frappe.log_error(f"Could not read meta for {doctype}")
        return []

    result                    = []
    current_section           = "General"
    current_section_fieldname = ""

    # Tabs to skip entirely (our own approval tab)
    SKIP_TAB_LABELS = {"Field Level Approvals"}

    for df in meta.fields:

        # ── Tab Breaks: use label as new section context ───────────────────────
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label and tab_label not in SKIP_TAB_LABELS:
                # Tab label becomes the section for unlabeled fields within it
                current_section           = tab_label
                current_section_fieldname = df.fieldname
            continue  # never include Tab Break itself in the field list

        # ── Section Breaks: only LABELED ones create a new section ────────────
        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section           = sec_label
                current_section_fieldname = df.fieldname
            # Unlabeled section break = layout only → leave current_section unchanged
            continue

        # ── Skip pure layout / system fields ─────────────────────────────────
        if df.fieldtype in LAYOUT_FIELDTYPES:
            continue
        if df.fieldname in SKIP_FIELDNAMES:
            continue
        if df.get("hidden"):
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


# ─────────────────────────────────────────────────────────────────────────────
# Value extraction
# ─────────────────────────────────────────────────────────────────────────────

def _get_field_value(doc, fieldname, fieldtype, child_fields=None):
    val = doc.get(fieldname)
    if fieldtype == "Table":
        rows      = val or []
        child_fns = [f["fieldname"] for f in (child_fields or [])]
        return [
            {fn: str(row.get(fn) or "") for fn in child_fns}
            for row in rows
        ]
    return str(val) if val is not None else ""


# ─────────────────────────────────────────────────────────────────────────────
# Doc helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_doc(onboarding_name):
    try:
        return frappe.get_doc("Employee Onboarding", onboarding_name)
    except frappe.DoesNotExistError:
        return None


def _get_configured_candidate_field_rows(doc):
    """
    Returns configured candidate-editable field rows for this onboarding.
    Fallback: global Employee Onboarding Portal Settings.
    """
    rows = []

    if doc and doc.meta.get_field("custom_candidate_portal_fields"):
        rows = doc.get("custom_candidate_portal_fields") or []

    if not rows:
        try:
            rows = frappe.get_single("Employee Onboarding Portal Settings").portal_fields or []
        except Exception:
            rows = []

    return [
        r for r in rows
        if r.get("fieldname") and not r.get("hidden") and not r.get("read_only")
    ]


def _get_configured_approval_fields(doc, doctype="Employee Onboarding"):
    """
    Builds approval field definitions from configured candidate fields only.
    Falls back to global portal settings when onboarding-specific rows are absent.
    """
    configured_rows = _get_configured_candidate_field_rows(doc)
    meta_fields = _get_doctype_approval_fields(doctype)
    meta_map = {f["fieldname"]: f for f in meta_fields}
    configured = []
    seen = set()

    for row in configured_rows:
        fieldname = row.get("fieldname")
        if not fieldname or fieldname in seen:
            continue

        meta = meta_map.get(fieldname)
        if not meta:
            continue

        fieldtype = row.get("fieldtype") or meta.get("fieldtype", "Data")
        field_options = row.get("options") or meta.get("child_doctype", "")
        section_label = (row.get("section_label") or "").strip()
        tab_label = (row.get("tab_label") or "").strip()

        entry = {
            "fieldname": fieldname,
            "label": (row.get("label") or meta.get("label") or fieldname).strip(),
            "fieldtype": fieldtype,
            "section": section_label or tab_label or meta.get("section", "General"),
            "section_fieldname": meta.get("section_fieldname", ""),
        }

        if fieldtype == "Table":
            child_doctype = field_options
            entry["child_doctype"] = child_doctype
            entry["child_fields"] = _get_child_meta_fields(child_doctype) if child_doctype else []

        configured.append(entry)
        seen.add(fieldname)

    return configured


def _is_new_doc_name(name):
    """Returns True if the name looks like a temporary unsaved Frappe doc name."""
    return name and name.startswith("new-")


def _load_approval_list(doc):
    try:
        raw = doc.custom_field_approval_json
        if not raw:
            return []
        return json.loads(raw) if isinstance(raw, str) else (raw or [])
    except (TypeError, ValueError):
        return []


def _build_approval_list(doc, existing_map=None):
    """
    Builds the full approval list from doctype meta, merging saved statuses.
    Every entry now carries section / section_fieldname.
    """
    if existing_map is None:
        existing_map = {}

    meta_fields = _get_configured_approval_fields(doc, "Employee Onboarding")
    merged      = []

    for fd in meta_fields:
        fn           = fd["fieldname"]
        field_type   = fd["fieldtype"]
        child_fields = fd.get("child_fields", [])
        old          = existing_map.get(fn, {})

        entry = {
            "fieldname":         fn,
            "label":             fd["label"],
            "fieldtype":         field_type,
            "section":           fd.get("section", "General"),
            "section_fieldname": fd.get("section_fieldname", ""),
            "status":            old.get("status", "Pending"),
            "current_value":     _get_field_value(doc, fn, field_type, child_fields),
            "reviewed_by":       old.get("reviewed_by"),
            "reviewed_on":       old.get("reviewed_on"),
        }

        if field_type == "Table":
            entry["child_doctype"] = fd.get("child_doctype", "")
            entry["child_fields"]  = child_fields

        merged.append(entry)

    return merged


def _save_list(doc, approval_list):
    doc.custom_field_approval_json = json.dumps(
        approval_list, indent=2, ensure_ascii=False, default=str
    )
    doc.save(ignore_permissions=True)
    frappe.db.commit()


def _compute_counts(approval_list):
    counts = {"Pending": 0, "Approved": 0, "Rejected": 0}
    for e in approval_list:
        st = e.get("status", "Pending")
        counts[st] = counts.get(st, 0) + 1
    return counts


# ─────────────────────────────────────────────────────────────────────────────
# 1. Initialize / re-seed  (idempotent)
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def initialize_approval_json(onboarding_name):
    """
    Reads all fields from meta (including section info) and seeds
    custom_field_approval_json.  Existing per-field statuses preserved.
    """
    # Guard against temp names for new unsaved documents
    if _is_new_doc_name(onboarding_name):
        return {
            "status":  "error",
            "message": _("Document has not been saved yet. Please save first."),
            "data":    [],
        }

    frappe.has_permission("Employee Onboarding", "write", throw=True)
    doc = _get_doc(onboarding_name)
    if not doc:
        return {
            "status":  "error",
            "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
            "data":    [],
        }

    existing_map = {e["fieldname"]: e for e in _load_approval_list(doc) if "fieldname" in e}
    merged       = _build_approval_list(doc, existing_map)
    _save_list(doc, merged)
    return {
        "status":  "success",
        "message": _("Approval JSON initialized with {0} fields").format(len(merged)),
        "data":    merged,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET — for external frontend
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist(allow_guest=False)
def get_onboarding_fields_for_approval(onboarding_name):
    """Returns all fields enriched with values + statuses, grouped by section."""
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    doc          = _get_doc(onboarding_name)
    if not doc:
        return {
            "status": "error",
            "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
            "data": [],
        }
    existing_map = {e["fieldname"]: e for e in _load_approval_list(doc) if "fieldname" in e}
    enriched     = _build_approval_list(doc, existing_map)
    counts       = _compute_counts(enriched)

    # Build section summary
    sections = {}
    for e in enriched:
        sec = e.get("section", "General")
        if sec not in sections:
            sections[sec] = {"Pending": 0, "Approved": 0, "Rejected": 0, "total": 0}
        sections[sec][e.get("status", "Pending")] = sections[sec].get(e.get("status", "Pending"), 0) + 1
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
# 3. POST — frontend sends full updated JSON
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def save_full_approval_json(onboarding_name, approval_data):
    """Accepts the complete approval array [{fieldname, status},...] and saves."""
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
            frappe.throw(_("Invalid status '{0}' for field '{1}'.").format(st, item.get("fieldname", "?")))

    doc          = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))
    existing_map = {e["fieldname"]: e for e in _load_approval_list(doc) if "fieldname" in e}
    incoming_map = {item["fieldname"]: item for item in approval_data if item.get("fieldname")}
    meta_fields  = _get_configured_approval_fields(doc, "Employee Onboarding")
    reviewer     = frappe.session.user
    now          = frappe.utils.now()
    final_list   = []

    for fd in meta_fields:
        fn           = fd["fieldname"]
        field_type   = fd["fieldtype"]
        child_fields = fd.get("child_fields", [])
        incoming     = incoming_map.get(fn, {})
        old          = existing_map.get(fn, {})
        new_status   = incoming.get("status", old.get("status", "Pending"))

        entry = {
            "fieldname":         fn,
            "label":             fd["label"],
            "fieldtype":         field_type,
            "section":           fd.get("section", "General"),
            "section_fieldname": fd.get("section_fieldname", ""),
            "status":            new_status,
            "current_value":     _get_field_value(doc, fn, field_type, child_fields),
        }

        if new_status != "Pending":
            if new_status != old.get("status"):
                entry["reviewed_by"] = reviewer
                entry["reviewed_on"] = now
            else:
                entry["reviewed_by"] = old.get("reviewed_by") or reviewer
                entry["reviewed_on"] = old.get("reviewed_on") or now
        else:
            entry["reviewed_by"] = None
            entry["reviewed_on"] = None

        if field_type == "Table":
            entry["child_doctype"] = fd.get("child_doctype", "")
            entry["child_fields"]  = child_fields

        final_list.append(entry)

    _save_list(doc, final_list)
    sync_onboarding_field_rejection_action(doc, final_list)
    counts = _compute_counts(final_list)
    return {
        "status": "success", "message": _("Saved successfully"),
        "total": len(final_list), "counts": counts, "data": final_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Update single field (Frappe Desk per-row button)
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def update_field_approval_status(onboarding_name, fieldname, new_status):
    if new_status not in VALID_STATUSES:
        frappe.throw(_("Invalid status '{0}'.").format(new_status))
    frappe.has_permission("Employee Onboarding", "write", throw=True)
    doc           = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))
    approval_list = _load_approval_list(doc) or _build_approval_list(doc)
    updated = False
    for entry in approval_list:
        if entry.get("fieldname") == fieldname:
            entry["status"] = new_status
            if new_status != "Pending":
                entry["reviewed_by"] = frappe.session.user
                entry["reviewed_on"] = frappe.utils.now()
            else:
                entry["reviewed_by"] = None
                entry["reviewed_on"] = None
            updated = True
            break
    if not updated:
        frappe.throw(_("Field '{0}' not found.").format(fieldname))
    _save_list(doc, approval_list)
    sync_onboarding_field_rejection_action(doc, approval_list)
    return {"status": "success", "message": _("Updated"), "data": approval_list}


# ─────────────────────────────────────────────────────────────────────────────
# 5. Update ALL fields in a section  ← NEW
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def update_section_approval_status(onboarding_name, section_name, new_status):
    """
    Sets all fields belonging to section_name to new_status.
    Only fields currently in 'Pending' state are updated (unless new_status is Pending).
    """
    if new_status not in VALID_STATUSES:
        frappe.throw(_("Invalid status '{0}'.").format(new_status))
    frappe.has_permission("Employee Onboarding", "write", throw=True)

    doc           = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))
    approval_list = _load_approval_list(doc) or _build_approval_list(doc)

    reviewer = frappe.session.user
    now      = frappe.utils.now()
    updated  = 0

    for entry in approval_list:
        if entry.get("section") != section_name:
            continue
        entry["status"] = new_status
        if new_status != "Pending":
            entry["reviewed_by"] = reviewer
            entry["reviewed_on"] = now
        else:
            entry["reviewed_by"] = None
            entry["reviewed_on"] = None
        updated += 1

    if not updated:
        frappe.throw(_("No fields found for section '{0}'.").format(section_name))

    _save_list(doc, approval_list)
    sync_onboarding_field_rejection_action(doc, approval_list)
    counts = _compute_counts(approval_list)
    return {
        "status":  "success",
        "message": _("{0} field(s) in '{1}' set to {2}").format(updated, section_name, new_status),
        "counts":  counts,
        "data":    approval_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Bulk update all Pending fields
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def bulk_update_approval_status(onboarding_name, new_status):
    if new_status not in {"Approved", "Rejected"}:
        frappe.throw(_("Only 'Approved' or 'Rejected' allowed."))
    frappe.has_permission("Employee Onboarding", "write", throw=True)
    doc           = _get_doc(onboarding_name)
    if not doc:
        frappe.throw(_("Employee Onboarding not found: {0}").format(onboarding_name))
    approval_list = _load_approval_list(doc) or _build_approval_list(doc)
    reviewer = frappe.session.user
    now      = frappe.utils.now()
    for entry in approval_list:
        if entry.get("status") == "Pending":
            entry["status"]      = new_status
            entry["reviewed_by"] = reviewer
            entry["reviewed_on"] = now
    _save_list(doc, approval_list)
    sync_onboarding_field_rejection_action(doc, approval_list)
    counts = _compute_counts(approval_list)
    return {"status": "success", "message": _("Done"), "counts": counts, "data": approval_list}


# ─────────────────────────────────────────────────────────────────────────────
# 7. Simple read
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def get_approval_list(onboarding_name):
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    doc  = _get_doc(onboarding_name)
    if not doc:
        return {
            "status": "error",
            "message": _("Employee Onboarding not found: {0}").format(onboarding_name),
            "data": [],
        }
    data = _load_approval_list(doc)
    return {"status": "success", "data": data}


# ─────────────────────────────────────────────────────────────────────────────
# 8. Debug: inspect what sections the meta produces (no doc needed)
# ─────────────────────────────────────────────────────────────────────────────
@frappe.whitelist()
def get_section_structure():
    """
    Returns the section structure detected from Employee Onboarding meta.
    Use this to verify sections are being read correctly without
    initialising the full approval JSON.
    """
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
        sections[sec]["fields"].append({"fieldname": f["fieldname"], "label": f["label"], "fieldtype": f["fieldtype"]})

    return {
        "status":        "success",
        "total_fields":  len(fields),
        "total_sections": len(order),
        "sections":      [sections[s] for s in order],
    }
