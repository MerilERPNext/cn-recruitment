"""Mirror Employee fields onto Job Applicant and Employee Onboarding.

Employee is the master reference for the recruitment/onboarding lifecycle
(Job Applicant -> Employee Onboarding -> Employee). To keep the field
structure aligned across all three stages we mirror every Employee field onto
Job Applicant and Employee Onboarding through the nextai "Custom Doctype
Fields" feature.

Saving a "Custom Doctype Fields" record auto-creates the matching
(system-generated, mostly virtual) Custom Fields on the target doctype.

We don't just dump the data fields at the bottom of the form — that looks
nothing like the Employee layout. Instead we walk the Employee meta in order
and reproduce its **Tab / Section / Column** structure, chaining every
mirrored field after its predecessor via `insert_after`. The result is a
block, appended after the target's own fields, whose tabs/sections/ordering
match Employee. Fields the target owns natively are left exactly where they
are (we can't relocate them), so the Employee block anchors after the last
native field.

The pass is a full mirror (idempotent):
  * missing Employee fields/breaks are created;
  * fields already present are repositioned in place and their label / type /
    options / description are refreshed from Employee;
  * fields whose Employee source has been removed are deleted, along with the
    generated Custom Field and any stored values (nextai's Custom Doctype
    Fields controller handles the create/update/delete on save).

A field's `mandatory` / `read_only` are NOT touched on re-sync, so any manual
constraint tuning on a mirrored field survives.
"""

import frappe

# nextai feature that owns the auto-field-creation logic.
CONFIG_DOCTYPE = "Custom Doctype Fields"
CONFIG_ROW_DOCTYPE = "Custom Doctype Field Item"

MASTER_DOCTYPE = "Employee"
TARGET_DOCTYPES = ("Job Applicant", "Employee Onboarding")

# Layout breaks are reproduced so the form is grouped like Employee.
TAB_BREAK = "Tab Break"
SECTION_BREAK = "Section Break"
COLUMN_BREAK = "Column Break"
LAYOUT_BREAKS = (TAB_BREAK, SECTION_BREAK, COLUMN_BREAK)

# Non-data, presentational fieldtypes that aren't worth mirroring as fields.
SKIP_FIELDTYPES = {"Fold", "Button", "HTML", "Heading", "Image"}


def _allowed_row_fieldtypes():
    """Fieldtypes accepted by the Custom Doctype Field Item `type` Select."""
    meta = frappe.get_meta(CONFIG_ROW_DOCTYPE)
    options = meta.get_field("type").options or ""
    return {opt.strip() for opt in options.split("\n") if opt.strip()}


def _row_payload(df, is_break):
    """Build a Custom Doctype Field Item row mirroring an Employee DocField.

    `mandatory`, `read_only` and `default` are intentionally NOT copied:
    forcing hundreds of fields required/locked would block record creation,
    and a default without its (dropped) options trips Custom Field validation
    (e.g. naming_series). Constraints can be tuned later per the roadmap.
    Breaks carry no options/description.
    """
    payload = {
        "label": df.label or df.fieldname,
        "field": df.fieldname,
        "type": df.fieldtype,
        "options": "" if is_break else (df.options or ""),
        "mandatory": 0,
        "read_only": 0,
    }
    if not is_break and df.description:
        payload["description"] = df.description
    return payload


def _get_or_new_config(target):
    if frappe.db.exists(CONFIG_DOCTYPE, target):
        return frappe.get_doc(CONFIG_DOCTYPE, target)
    doc = frappe.new_doc(CONFIG_DOCTYPE)
    doc.doc_type = target
    return doc


def _last_native_field(target_meta, managed_names):
    """Last target field we do NOT manage — the anchor for the Employee block."""
    last = None
    for f in target_meta.fields:
        if f.fieldname in managed_names:
            continue
        last = f.fieldname
    return last


def _blank_break_labels(target, fieldnames):
    """Clear the *displayed* label on break Custom Fields.

    The child row keeps a non-empty label (it is mandatory and is only the
    backend identifier), but a column break — or an unlabelled section break —
    must not render its fieldname as a heading on the form. Run on every sync
    so the at-rest state is always blank, even though the config controller
    re-stamps the row label onto the field whenever the record is saved.
    """
    blanked = 0
    for fn in fieldnames:
        cf_name = frappe.db.get_value(
            "Custom Field", {"dt": target, "fieldname": fn, "is_system_generated": 1}
        )
        if cf_name and frappe.db.get_value("Custom Field", cf_name, "label"):
            frappe.db.set_value("Custom Field", cf_name, "label", "", update_modified=False)
            blanked += 1
    return blanked


def sync_target(target, allowed=None):
    """Reproduce Employee's field/layout structure on `target`.

    Returns a summary dict.
    """
    allowed = allowed or _allowed_row_fieldtypes()
    employee_fields = frappe.get_meta(MASTER_DOCTYPE).fields

    doc = _get_or_new_config(target)
    existing = {row.field: row for row in doc.fields}
    target_meta = frappe.get_meta(target)

    anchor = _last_native_field(target_meta, set(existing.keys()))
    pending = {TAB_BREAK: None, SECTION_BREAK: None, COLUMN_BREAK: None}
    emitted = set()
    # Breaks we manage whose Employee source has no label -> hide the heading.
    blank_labels = set()
    stats = {"added": 0, "updated": 0, "repositioned": 0, "deleted": 0}

    # Descriptive props refreshed from Employee on re-sync (constraints excluded
    # on purpose — see module docstring).
    MIRRORED_PROPS = ("label", "type", "options", "description")

    def emit(df, is_break):
        nonlocal anchor
        fn = df.fieldname
        if fn in emitted:
            return
        if fn in existing:
            row = existing[fn]
            desired = _row_payload(df, is_break)
            changed = False
            for key in MIRRORED_PROPS:
                new_val = desired.get(key, "")
                if (getattr(row, key, None) or "") != (new_val or ""):
                    setattr(row, key, new_val)
                    changed = True
            if changed:
                stats["updated"] += 1
            if row.insert_after != anchor:
                row.insert_after = anchor
                stats["repositioned"] += 1
            anchor = fn
            emitted.add(fn)
        elif not target_meta.has_field(fn):
            payload = _row_payload(df, is_break)
            payload["insert_after"] = anchor
            doc.append("fields", payload)
            anchor = fn
            emitted.add(fn)
            stats["added"] += 1
        # else: a native field/break with the same name — leave the anchor put.

    for df in employee_fields:
        ft = df.fieldtype
        if ft == TAB_BREAK:
            pending[TAB_BREAK] = df
            pending[SECTION_BREAK] = None
            pending[COLUMN_BREAK] = None
            continue
        if ft == SECTION_BREAK:
            pending[SECTION_BREAK] = df
            pending[COLUMN_BREAK] = None
            continue
        if ft == COLUMN_BREAK:
            pending[COLUMN_BREAK] = df
            continue
        if ft in SKIP_FIELDTYPES or ft not in allowed:
            continue

        # A native target field we don't manage: leave it where it is.
        if df.fieldname not in existing and target_meta.has_field(df.fieldname):
            continue

        # Flush the enclosing breaks lazily, so empty tabs/sections (whose
        # only fields are native) are never created.
        for bt in LAYOUT_BREAKS:
            brk = pending[bt]
            if brk is not None:
                emit(brk, is_break=True)
                if brk.fieldname in emitted and not brk.label:
                    blank_labels.add(brk.fieldname)
        emit(df, is_break=False)

    # Drop config rows whose Employee source no longer exists. nextai's
    # controller deletes the generated Custom Field + stored values on save.
    employee_fieldnames = {df.fieldname for df in employee_fields}
    if any(row.field not in employee_fieldnames for row in doc.fields):
        kept = [row for row in doc.fields if row.field in employee_fieldnames]
        stats["deleted"] = len(doc.fields) - len(kept)
        doc.set("fields", kept)

    if any(stats[k] for k in ("added", "updated", "repositioned", "deleted")):
        doc.save(ignore_permissions=True)

    blanked = _blank_break_labels(target, blank_labels)

    return {
        "target": target,
        "added": stats["added"],
        "updated": stats["updated"],
        "repositioned": stats["repositioned"],
        "deleted": stats["deleted"],
        "blanked_break_labels": blanked,
        "total_rows": len(doc.fields),
    }


@frappe.whitelist()
def sync_employee_fields(targets=None, enqueue=True):
    """Mirror Employee fields + layout onto the recruitment lifecycle doctypes.

    Pass a comma-separated string or list to restrict the targets; defaults to
    Job Applicant and Employee Onboarding.

    Mirroring a full Employee form creates hundreds of system-generated Custom
    Fields. Done inline in a web request, that easily blows the gunicorn/nginx
    timeout (HTTP 504) part-way through. So `enqueue` defaults to True: the sync
    runs on a background worker (no web timeout) and the call returns
    immediately. The pass is idempotent and resumable — re-running only creates
    the fields still missing — so an interrupted run can simply be retried.

    Pass `enqueue=False` for a synchronous run (e.g. from `bench execute` or a
    migrate patch, where there may be no worker and the caller needs the result
    inline). Patches should call `_run_sync(targets)` directly.
    """
    # Creates hundreds of system-generated Custom Fields (schema change).
    # Restrict to System Manager (was callable by any logged-in user).
    frappe.only_for("System Manager")

    if isinstance(targets, str):
        targets = [t.strip() for t in targets.split(",") if t.strip()]
    targets = targets or list(TARGET_DOCTYPES)

    if frappe.utils.sbool(enqueue):
        frappe.enqueue(
            "recruitment.recruitment.employee_field_sync._run_sync",
            queue="long",
            timeout=3600,
            targets=targets,
        )
        return {"enqueued": True, "targets": targets}

    return _run_sync(targets)


def _run_sync(targets):
    """Run the mirror for each target, committing + clearing cache after each so
    progress persists incrementally (and the meta cache stays fresh between
    targets, keeping the per-target idempotency checks accurate)."""
    allowed = _allowed_row_fieldtypes()
    results = []
    for target in targets:
        results.append(sync_target(target, allowed))
        frappe.db.commit()
        frappe.clear_cache()
    return {"results": results}
