# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Field Flow — turns one dialog submission on *Job Applicant Profile Settings*
into the nextai data-flow records that actually do the work.

The "Add Custom Field" dialog posts a single field's config to
``save_field_flow``. For that field we keep one ``Data Element`` + one
``Data Flow Attachment``; saving the attachment fires nextai's engine, which
creates the custom fields and wires the ``fetch_from`` chain so a value entered
on Job Applicant flows down to Employee Onboarding and Employee. Nothing here
creates or wires fields itself — it only provisions the records the engine reads.

The chain is::

    Job Applicant  --job_applicant-->  Employee Onboarding
    Employee Onboarding  <--custom_employee_onboarding--  Employee

Employee has no native link back up the chain, so we add and manage one
(``CONNECTOR_FIELD``) and populate it when the Employee is created.
"""

import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field
from frappe.utils import cint

# The default Document Data Flow we provision and keep repaired. Advanced users
# may point the Settings doc at a different flow, in which case we use theirs
# as-is and never fabricate it.
DEFAULT_FLOW_NAME = "Recruitment Profile Flow"

# Standard HRMS Link field: Employee Onboarding -> Job Applicant.
ONBOARDING_TO_APPLICANT = "job_applicant"

# Managed Link field we add to Employee -> Employee Onboarding so the engine has
# a connector to build Employee's fetch_from from.
CONNECTOR_FIELD = "custom_employee_onboarding"

SOURCE_DOCTYPE = "Job Applicant"
ONBOARDING_DOCTYPE = "Employee Onboarding"
EMPLOYEE_DOCTYPE = "Employee"

MAP_EXISTING = "Map Existing Fields"


# ---------------------------------------------------------------------------
# Structural prerequisites (connector field + the flow)
# ---------------------------------------------------------------------------

def ensure_employee_connector():
    """Ensure Employee has the managed Link field back to Employee Onboarding.

    Idempotent: returns the fieldname, creating the Custom Field only the first
    time. Read-only because it is plumbing the user should not edit by hand.
    """
    if frappe.get_meta(EMPLOYEE_DOCTYPE).get_field(CONNECTOR_FIELD):
        return CONNECTOR_FIELD

    create_custom_field(
        EMPLOYEE_DOCTYPE,
        {
            "fieldname": CONNECTOR_FIELD,
            "label": "Employee Onboarding",
            "fieldtype": "Link",
            "options": ONBOARDING_DOCTYPE,
            "read_only": 1,
            "no_copy": 1,
            "module": "Recruitment",
        },
        ignore_validate=True,
    )
    frappe.clear_cache(doctype=EMPLOYEE_DOCTYPE)
    return CONNECTOR_FIELD


# ---------------------------------------------------------------------------
# Per-row reconciliation
# ---------------------------------------------------------------------------

def _upsert_data_element(row):
    """Create the Data Element for this row, or refresh what is safe to refresh.

    Most Data Element fields are ``set_only_once`` (type/label/options/flags),
    so an existing element is left structurally intact — we only keep
    ``editable_after_fetch`` in sync, since that is the one property the engine
    re-applies to live fields. Changing a field's type means deleting the row
    and adding it again.
    """
    name = row.fieldname
    editable = 1 if row.editable_after_fetch else 0

    if frappe.db.exists("Data Element", name):
        de = frappe.get_doc("Data Element", name)
        if int(de.editable_after_fetch or 0) != editable:
            de.editable_after_fetch = editable
            de.save(ignore_permissions=True)
        return de.name

    payload = {
        "doctype": "Data Element",
        "source_mode": row.source_mode,
        "field_label": row.field_label,
        "fieldname": row.fieldname,
        "editable_after_fetch": editable,
    }
    if row.source_mode != MAP_EXISTING:
        payload.update({
            "field_type": row.field_type,
            "field_options": row.field_options if row.field_type == "Link" else None,
            "select_options": row.select_options if row.field_type == "Select" else None,
            "is_virtual": 0,
            "hidden": 1 if row.hidden else 0,
            "reqd": 1 if row.reqd else 0,
        })
    return frappe.get_doc(payload).insert(ignore_permissions=True).name


def _upsert_attachment(flow_name, data_element_name, target_rows):
    """Create or update the Data Flow Attachment; saving it runs the engine.

    ``target_rows`` is ``[{"target_doctype": dt, "fieldname": existing_or_blank}]``
    — built by the caller from the flow doctypes (blank fieldname in Create New
    mode so the engine reuses the Data Element's own fieldname uniformly).
    """
    # Reuse the attachment already wiring this element into this flow (so editing
    # a field re-runs the engine in place instead of creating duplicates).
    existing = frappe.db.get_value(
        "Data Flow Attachment",
        {"data_element": data_element_name, "document_data_flow": flow_name},
    )
    if existing and frappe.db.exists("Data Flow Attachment", existing):
        att = frappe.get_doc("Data Flow Attachment", existing)
        att.data_element = data_element_name
        att.document_data_flow = flow_name
        att.set("target_doctypes", target_rows)
        att.save(ignore_permissions=True)
        return att.name

    att = frappe.get_doc({
        "doctype": "Data Flow Attachment",
        "data_element": data_element_name,
        "document_data_flow": flow_name,
        "target_doctypes": target_rows,
    }).insert(ignore_permissions=True)
    return att.name


def _teardown(attachment_name):
    """Remove an attachment (engine tears down its fields/wiring on_trash) and
    the Data Element behind it when nothing else references it."""
    if not attachment_name or not frappe.db.exists("Data Flow Attachment", attachment_name):
        return
    data_element = frappe.db.get_value("Data Flow Attachment", attachment_name, "data_element")
    frappe.delete_doc("Data Flow Attachment", attachment_name, ignore_permissions=True, force=True)

    if data_element and not frappe.db.exists("Data Flow Attachment", {"data_element": data_element}):
        if frappe.db.exists("Data Element", data_element):
            frappe.delete_doc("Data Element", data_element, ignore_permissions=True, force=True)


# ---------------------------------------------------------------------------
# Flow definition (lets the dialog view + extend the chain)
# ---------------------------------------------------------------------------

# Layout/presentational field types that hold no mappable value.
_NON_MAPPABLE_FIELDTYPES = {
    "Section Break", "Column Break", "Tab Break", "HTML", "Button",
    "Heading", "Fold", "Image",
}


def _default_flow_items():
    return [
        {"target_doctype": SOURCE_DOCTYPE, "docfield": ""},
        {"target_doctype": ONBOARDING_DOCTYPE, "docfield": ONBOARDING_TO_APPLICANT},
        {"target_doctype": EMPLOYEE_DOCTYPE, "docfield": CONNECTOR_FIELD},
    ]


def _mappable_fields(doctype):
    meta = frappe.get_meta(doctype)
    return [
        {"value": df.fieldname, "label": f"{df.label or df.fieldname} ({df.fieldname})"}
        for df in meta.fields
        if df.fieldname and df.fieldtype not in _NON_MAPPABLE_FIELDTYPES
    ]


def _field_label(doctype, fieldname):
    df = frappe.get_meta(doctype).get_field(fieldname)
    return (df.label if (df and df.label) else fieldname)


def _meta_section_anchor(section_label, exclude=()):
    """Last Job Applicant field of ``section_label`` in the *live doctype layout*.

    This anchors the desk-form placement, so a new field lands physically inside
    that section on the Job Applicant form (right after the section's current last
    field, before the next section break). Grouping comes from
    ``iter_profile_fields`` — the same logic the settings UI uses — so labels line
    up. Returns ``None`` when the section doesn't exist in the current layout
    (e.g. a curated, drifted settings-only section), in which case the desk form
    is left untouched. ``exclude`` skips fields we're about to (re)place.
    """
    from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
        iter_profile_fields,
    )

    section_label = (section_label or "").strip()
    if not section_label:
        return None

    meta = frappe.get_meta(SOURCE_DOCTYPE)
    anchor = None
    for f, section, _tab in iter_profile_fields(meta):
        if section == section_label and f.fieldname not in exclude:
            anchor = f.fieldname
    return anchor


def _place_fields_in_section(fieldnames, section_label):
    """Put newly created Job Applicant fields into ``section_label``.

    Two placements, matching the two views of the field:
      * settings / candidate config — assign the settings-table section directly
        (``ensure_fields_in_section``); authoritative and independent of meta
        drift, this is what makes them show under the chosen sidebar section.
      * Job Applicant desk form — chain each field's ``insert_after`` after that
        section's last field *in the live layout*, so they land physically inside
        that section on the form. Skipped when the section isn't part of the
        current layout (a drifted settings-only section has no place to point at).
    """
    from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
        ensure_fields_in_section,
    )

    fieldnames = [fn for fn in fieldnames if fn]
    if not fieldnames:
        return

    # Desk-form placement (before we touch the settings table).
    anchor = _meta_section_anchor(section_label, exclude=set(fieldnames))
    if anchor:
        # Resolve every new field's Custom Field name in one query, not per field.
        cf_by_field = {
            r.fieldname: r.name
            for r in frappe.get_all(
                "Custom Field",
                filters={
                    "dt": SOURCE_DOCTYPE,
                    "fieldname": ["in", fieldnames],
                    "is_system_generated": 1,
                },
                fields=["name", "fieldname"],
            )
        }
        prev = anchor
        moved = False
        for fn in fieldnames:
            cf_name = cf_by_field.get(fn)
            if not cf_name or fn == prev:
                continue
            frappe.db.set_value("Custom Field", cf_name, "insert_after", prev)
            prev = fn
            moved = True
        if moved:
            frappe.clear_cache(doctype=SOURCE_DOCTYPE)

    # Authoritative: the settings/candidate grouping.
    ensure_fields_in_section(fieldnames, section_label)


def ensure_flow_definition(flow_name, items):
    """Create or reconcile the Document Data Flow to match ``items`` (ordered
    ``[{target_doctype, docfield}]``; row 1 is the source with no docfield)."""
    if any(it.get("target_doctype") == EMPLOYEE_DOCTYPE for it in items):
        ensure_employee_connector()

    norm = []
    for idx, it in enumerate(items):
        dt = it.get("target_doctype")
        if not dt:
            continue
        norm.append({
            "target_doctype": dt,
            "docfield": "" if idx == 0 else (it.get("docfield") or ""),
        })

    if frappe.db.exists("Document Data Flow", flow_name):
        doc = frappe.get_doc("Document Data Flow", flow_name)
        doc.set("document_data_flow_items", norm)
        doc.save(ignore_permissions=True)
    else:
        frappe.get_doc({
            "doctype": "Document Data Flow",
            "data_flow_name": flow_name,
            "document_data_flow_items": norm,
        }).insert(ignore_permissions=True)
    return flow_name


# ---------------------------------------------------------------------------
# Whitelisted dialog API — called from the "Add Custom Field" dialog
# ---------------------------------------------------------------------------

def _require_manage_access():
    """These endpoints create/inspect Custom Fields (schema changes). Restrict to
    users who can configure the Job Applicant Profile Settings (System Manager /
    HR Manager) — the form the dialog lives on — instead of any logged-in user."""
    if not frappe.has_permission("Job Applicant Profile Settings", "write"):
        frappe.throw(
            frappe._("Not permitted to manage field flows."), frappe.PermissionError
        )


@frappe.whitelist()
def get_field_flow_picker(flow_name=None):
    _require_manage_access()
    """Everything the dialog needs to render: the flow's ordered doctypes (with
    their connecting link field) and each doctype's mappable fields. Provisions
    the default flow + Employee connector on first open so it always works."""
    flow_name = (flow_name or DEFAULT_FLOW_NAME).strip() or DEFAULT_FLOW_NAME

    if not frappe.db.exists("Document Data Flow", flow_name) and flow_name == DEFAULT_FLOW_NAME:
        ensure_flow_definition(flow_name, _default_flow_items())

    if frappe.db.exists("Document Data Flow", flow_name):
        items = [
            {"target_doctype": it.target_doctype, "docfield": it.fieldname or ""}
            for it in frappe.get_all(
                "Document Data Flow Item",
                filters={"parent": flow_name},
                fields=["target_doctype", "fieldname"],
                order_by="idx asc",
            )
            if it.target_doctype
        ]
    else:
        items = _default_flow_items()

    return {
        "flow_name": flow_name,
        "doctypes": [
            {"doctype": it["target_doctype"], "docfield": it.get("docfield") or "",
             "fields": _mappable_fields(it["target_doctype"])}
            for it in items
        ],
    }


@frappe.whitelist()
def get_doctype_mappable_fields(doctype):
    """Field list for a doctype the user just added to the flow."""
    _require_manage_access()
    return _mappable_fields(doctype)


@frappe.whitelist()
def resolve_flow_link(target_doctype, existing_doctypes):
    _require_manage_access()
    """Link field(s) on ``target_doctype`` that point at a doctype already in the
    flow. Exactly one → auto-connect; zero → can't add; many → user picks."""
    existing = json.loads(existing_doctypes) if isinstance(existing_doctypes, str) else (existing_doctypes or [])
    existing_set = set(existing)
    return [
        {"docfield": df.fieldname,
         "label": f"{df.label or df.fieldname} ({df.fieldname})",
         "links_to": df.options}
        for df in frappe.get_meta(target_doctype).fields
        if df.fieldtype == "Link" and df.options in existing_set
    ]


@frappe.whitelist()
def save_field_flows_bulk(payload):
    """Create/update one Data Element + Data Flow Attachment per row, processed
    one by one so a bad row is isolated (savepoint rollback) and the rest still
    apply. Returns per-row results + errors for the dialog to show."""
    _require_manage_access()
    data = json.loads(payload) if isinstance(payload, str) else (payload or {})
    flow_name = (data.get("flow_name") or DEFAULT_FLOW_NAME).strip() or DEFAULT_FLOW_NAME
    items = data.get("flow") or _default_flow_items()
    mode = data.get("source_mode") or "Create New Field"
    editable = 0 if data.get("editable_after_fetch") in (0, "0", False) else 1
    rows = data.get("rows") or []
    # Section the fields should land in on the source doctype (from the dialog's
    # Section picker, defaulting to the section the admin was viewing).
    section = (data.get("section") or "").strip()

    ensure_flow_definition(flow_name, items)
    flow_doctypes = [it.get("target_doctype") for it in items if it.get("target_doctype")]
    source_doctype = flow_doctypes[0]

    created, errors = [], []
    placed_fieldnames = []  # created Job Applicant fields to drop into `section`
    for i, row in enumerate(rows):
        savepoint = f"ff_row_{i}"
        frappe.db.savepoint(savepoint)
        try:
            cfg = frappe._dict({"source_mode": mode, "editable_after_fetch": editable})

            if mode == MAP_EXISTING:
                cells = row.get("fields") or {}
                src_field = (cells.get(source_doctype) or "").strip()
                if not src_field:
                    raise frappe.ValidationError(
                        f"Row {i + 1}: select the {source_doctype} field to map."
                    )
                cfg.fieldname = src_field
                cfg.field_label = _field_label(source_doctype, src_field)
                target_rows = [
                    {"target_doctype": dt, "fieldname": (cells.get(dt) or "").strip()}
                    for dt in flow_doctypes
                    if (cells.get(dt) or "").strip()
                ]
            else:
                label = (row.get("field_label") or "").strip()
                if not label:
                    raise frappe.ValidationError(f"Row {i + 1}: Field Label is required.")
                cfg.field_label = label
                cfg.fieldname = frappe.scrub(label)
                cfg.field_type = row.get("field_type") or "Data"
                cfg.field_options = row.get("field_options")
                cfg.select_options = row.get("select_options")
                cfg.hidden = 1 if cint(row.get("hidden")) else 0
                cfg.reqd = 1 if cint(row.get("reqd")) else 0
                target_rows = [{"target_doctype": dt, "fieldname": ""} for dt in flow_doctypes]

            data_element_name = _upsert_data_element(cfg)
            attachment_name = _upsert_attachment(flow_name, data_element_name, target_rows)

            # A newly created field defaults to the end of Job Applicant (its
            # internal "Feedback" tab, which the profile settings hide). Remember
            # it so we can drop it into the chosen section below. Map-existing
            # fields keep their own placement.
            if section and mode != MAP_EXISTING and source_doctype == SOURCE_DOCTYPE:
                placed_fieldnames.append(cfg.fieldname)

            created.append({
                "fieldname": cfg.fieldname,
                "field_label": cfg.field_label,
                "data_element": data_element_name,
                "data_flow_attachment": attachment_name,
            })
        except Exception as exc:
            frappe.db.rollback(save_point=savepoint)
            errors.append({"row": i + 1, "error": str(exc)})

    # Place all newly created fields into the chosen section in one settings save.
    if placed_fieldnames:
        _place_fields_in_section(placed_fieldnames, section)

    return {"created": created, "errors": errors}


@frappe.whitelist()
def delete_field_flow(data_flow_attachment):
    """Remove a configured field flow (engine tears down its fields/wiring)."""
    _require_manage_access()
    _teardown(data_flow_attachment)
    return {"deleted": data_flow_attachment}


@frappe.whitelist()
def list_field_flows(flow_name=None):
    """The field flows already configured on a flow, for listing/edit/delete."""
    _require_manage_access()
    flow_name = (flow_name or DEFAULT_FLOW_NAME).strip() or DEFAULT_FLOW_NAME
    if not frappe.db.exists("Document Data Flow", flow_name):
        return []

    rows = []
    for att in frappe.get_all(
        "Data Flow Attachment",
        filters={"document_data_flow": flow_name},
        fields=["name", "data_element"],
    ):
        de = frappe.db.get_value(
            "Data Element", att.data_element,
            ["field_label", "fieldname", "field_type", "source_mode", "editable_after_fetch"],
            as_dict=True,
        ) or {}
        targets = frappe.get_all(
            "Data Flow Attachment Target",
            filters={"parent": att.name, "parenttype": "Data Flow Attachment"},
            fields=["target_doctype", "fieldname"],
            order_by="idx asc",
        )
        rows.append({
            "data_flow_attachment": att.name,
            "data_element": att.data_element,
            "targets": [{"target_doctype": t.target_doctype, "fieldname": t.fieldname} for t in targets],
            **de,
        })
    return rows


def populate_employee_connector(employee_doc, onboarding_name):
    """Set the managed connector on an Employee so the engine's fetch_from fires.
    Safe to call when the field does not exist yet (no-op)."""
    if not onboarding_name:
        return
    if not frappe.get_meta(EMPLOYEE_DOCTYPE).get_field(CONNECTOR_FIELD):
        return
    employee_doc.set(CONNECTOR_FIELD, onboarding_name)
