"""New Hire — a dynamic intake form that writes straight to Employee.

The record a New Hire form creates IS the Employee, held at ``status = "Pending"``
until onboarding completes. There is no intake doctype in between, and nothing is
mirrored or mapped: the form renders from the Employee DocType's own meta, so
every one of its several hundred fields is available to place, in Employee's own
tabs and sections, and a value captured at intake is already on the person's
record.

Naming
------
A pending Employee is inserted with an explicit ``PEND-#####`` name
(``insert(set_name=...)``), which bypasses autoname — so a candidate who never
joins does not burn a real employee code. ``activate_employee`` renames it into
the site's real series (the one ``cn_hrms_core``'s ``before_insert`` already
stamped onto ``naming_series``) and flips the status to Active. Employee is
``allow_rename: 1`` with an ``after_rename`` handler, and Frappe's rename updates
every inbound link.

Lifecycle
---------
``status`` stays "Pending" for the whole intake; the intake's own progress lives
on ``custom_new_hire_stage``, so the approval matrix has something to drive that
is not the person's employment status:

    Draft -> Pending Approval -> Approved -> Onboarding Initiated -> Completed
                              -> Rejected            (Cancelled before onboarding)

A New Hire Form record configures which Employee fields the form shows, in what
order, under which tab and section, and which are mandatory. A field with no
config row follows the Employee meta exactly.
"""

import json

import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_field
from frappe.model.naming import make_autoname
from frappe.model.rename_doc import rename_doc

DOCTYPE = "Employee"
FORM_DOCTYPE = "New Hire Form"
JOB_APPLICANT = "Job Applicant"
EMPLOYEE_ONBOARDING = "Employee Onboarding"

# "Pending" is not a stock Employee status — a Property Setter on this site
# widens the options to "Pending\nActive\nInactive".
PENDING_STATUS = "Pending"
ACTIVE_STATUS = "Active"

PENDING_SERIES = "PEND-.#####"
PENDING_PREFIX = "PEND-"

STAGE_FIELD = "custom_new_hire_stage"
FORM_FIELD = "custom_new_hire_form"
STAGES = (
    "Draft", "Pending Approval", "Approved",
    "Onboarding Initiated", "Completed", "Rejected", "Cancelled",
)
EDITABLE_STAGES = frozenset({"Draft", "Rejected"})

_LAYOUT_TYPES = frozenset({
    "Column Break", "Tab Break", "Section Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Signature", "Color",
    "Barcode", "Geolocation",
})

# Employee bookkeeping the form must never ask for. `status` and the stage fields
# are lifecycle; `employee`/`employee_name` are derived; lft/rgt/old_parent belong
# to the reporting-hierarchy nested set.
_SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "employee", "employee_name", "status",
    "lft", "rgt", "old_parent", STAGE_FIELD, FORM_FIELD,
})

_FRAPPE_MANAGED = frozenset({
    "name", "owner", "creation", "modified", "modified_by", "docstatus", "idx",
    "parent", "parentfield", "parenttype", "doctype", "_assign", "_comments",
    "_user_tags", "_liked_by",
})

_NO_EXPLICIT_ORDER = 10_000

# What a blank form starts with. Employee marks `first_name`, `gender`,
# `date_of_joining`, `company` and `company_email` mandatory, and this site
# additionally refuses an Employee with no Department or Designation through a
# custom validation that `reqd` does not expose — so a form built without them
# looks fine and then fails at the far end.
_CORE_FORM_FIELDS = (
    "first_name", "middle_name", "last_name", "gender", "date_of_birth",
    "personal_email", "cell_number", "company_email",
    "company", "department", "designation", "employment_type", "grade",
    "branch", "reports_to", "date_of_joining", "ctc",
)


# ---------------------------------------------------------------------------
# Response envelope
# ---------------------------------------------------------------------------


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400, data=None):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": data}


def _coerce_payload(payload):
    if payload is None:
        frappe.throw(_("Request body is required."))
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except (TypeError, ValueError):
            frappe.throw(_("Request body must be valid JSON."))
    if not isinstance(payload, dict):
        frappe.throw(_("Request body must be an object."))
    return payload


def _json_list(raw):
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return value if isinstance(value, list) else []


# ---------------------------------------------------------------------------
# One-time setup
# ---------------------------------------------------------------------------


@frappe.whitelist()
def setup_new_hire_support():
    """Add the two intake fields to Employee. Run once per site; idempotent.

    Neither is asked of HR — `custom_new_hire_stage` is driven by the approval
    matrix and this module, and `custom_new_hire_form` records which profile the
    person was raised on so the edit screen renders the same field set.
    """
    try:
        frappe.only_for("System Manager")
        meta = frappe.get_meta(DOCTYPE)
        created = []

        if not meta.has_field(STAGE_FIELD):
            create_custom_field(DOCTYPE, {
                "fieldname": STAGE_FIELD,
                "label": "New Hire Stage",
                "fieldtype": "Select",
                "options": "\n".join(("",) + STAGES),
                "read_only": 1,
                "in_standard_filter": 1,
                "insert_after": "status",
                "module": "Recruitment",
                "description": _("Intake progress for a pending new hire. Blank for everyone else."),
            })
            created.append(STAGE_FIELD)

        if not meta.has_field(FORM_FIELD):
            create_custom_field(DOCTYPE, {
                "fieldname": FORM_FIELD,
                "label": "New Hire Form",
                "fieldtype": "Link",
                "options": FORM_DOCTYPE,
                "read_only": 1,
                "insert_after": STAGE_FIELD,
                "module": "Recruitment",
            })
            created.append(FORM_FIELD)

        frappe.clear_cache(doctype=DOCTYPE)
        return _ok(_("New Hire support is in place."), {"created_fields": created})
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "setup_new_hire_support failed")
        return _err(_("Setup failed: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# Form resolution + overrides
# ---------------------------------------------------------------------------


def resolve_form(form=None, company=None, employment_type=None):
    """The New Hire Form that applies, or None. An explicit `form` wins;
    otherwise the most specific enabled profile, falling back to the default."""
    if form:
        # get_cached_doc raises DoesNotExistError on its own, so an `exists`
        # probe first would only be a second query for the same answer.
        try:
            return frappe.get_cached_doc(FORM_DOCTYPE, form)
        except frappe.DoesNotExistError:
            frappe.throw(_("New Hire Form not found: {0}").format(form))

    rows = frappe.get_all(
        FORM_DOCTYPE, filters={"disabled": 0},
        fields=["name", "company", "employment_type", "is_default"], order_by="name asc",
    )
    if not rows:
        return None

    def specificity(row):
        score = 0
        if row.company and row.company == company:
            score += 2
        elif row.company:
            return -1
        if row.employment_type and row.employment_type == employment_type:
            score += 1
        elif row.employment_type:
            return -1
        return score

    scored = [(specificity(r), r) for r in rows]
    best = max((s for s in scored if s[0] >= 0), key=lambda s: s[0], default=None)
    if best and best[0] > 0:
        return frappe.get_cached_doc(FORM_DOCTYPE, best[1].name)

    default = next((r for r in rows if r.is_default), None)
    if default:
        return frappe.get_cached_doc(FORM_DOCTYPE, default.name)
    return frappe.get_cached_doc(FORM_DOCTYPE, rows[0].name) if len(rows) == 1 else None


def _load_form_overrides(form_doc):
    if not form_doc:
        return {}
    overrides = {}
    for row in form_doc.get("field_overrides") or []:
        fieldname = (row.get("fieldname") or "").strip()
        if fieldname:
            overrides[fieldname] = row.as_dict() if hasattr(row, "as_dict") else dict(row)
    return overrides


def _three_state(override, meta_value, on_word, off_word):
    if override == on_word:
        return 1
    if override == off_word:
        return 0
    return 1 if meta_value else 0


def _row_order(row):
    try:
        value = int(row.get("order") or 0)
    except (TypeError, ValueError):
        value = 0
    return value or _NO_EXPLICIT_ORDER


def _sequence_key(fields, fallback_seq):
    orders = [f["order"] for f in fields if f.get("order")]
    return (min(orders), fallback_seq) if orders else (_NO_EXPLICIT_ORDER, fallback_seq)


def _matches_employment_type(row, selected):
    if selected is None:
        return True
    configured = (row.get("employment_type") or "All").strip()
    return configured in ("", "All", selected)


def _child_columns(child_doctype, override=None):
    try:
        meta = frappe.get_meta(child_doctype)
    except Exception:
        return []
    selected = set(_json_list(override.get("selected_child_fields"))) if override else set()
    mandatory = set(_json_list(override.get("mandatory_child_fields"))) if override else set()

    columns = []
    for df in meta.fields:
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname:
            continue
        if selected and df.fieldname not in selected:
            continue
        if not selected and df.get("hidden"):
            continue
        columns.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": df.options or "",
            "is_mandatory": 1 if (df.fieldname in mandatory or df.reqd) else 0,
            "read_only": 1 if df.read_only else 0,
        })
    return columns


# ---------------------------------------------------------------------------
# Form config — the render surface
# ---------------------------------------------------------------------------


def _build_form_config(form_doc, doc=None, employment_type=None):
    """Meta-first tabs -> sections -> fields tree, built from the Employee
    DocType with the form's overrides applied.

    With `Show Only Configured Fields` on (the default) a field renders only when
    it has a config row — the strict allowlist that keeps a several-hundred-field
    doctype from becoming a several-hundred-field form. A field Employee itself
    marks `reqd` always renders regardless, because the record cannot be saved
    without it.
    """
    overrides = _load_form_overrides(form_doc)
    restrict = bool(form_doc and form_doc.get("restrict_to_configured"))
    basis_type = bool(form_doc and form_doc.get("basis_employment_type"))
    selected = employment_type if (basis_type and employment_type) else None
    meta = frappe.get_meta(DOCTYPE)

    tab_order, tab_map = [], {}
    current_tab, current_section = "", ""

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            current_tab = (df.label or "").strip()
            current_section = ""
            continue
        if df.fieldtype == "Section Break":
            current_section = (df.label or "").strip()
            continue
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname:
            continue
        if df.fieldname in _SKIP_FIELDNAMES:
            continue

        override = overrides.get(df.fieldname)
        always_render = bool(df.reqd)

        if restrict and override is None and not always_render:
            continue
        if override is not None and not always_render and not _matches_employment_type(override, selected):
            continue

        expose = (override.get("expose") if override else None) or "Default"
        if expose == "Hide" and not always_render:
            continue
        if not restrict and expose != "Show" and df.get("hidden"):
            continue

        tab_label = (override.get("tab_override") if override else "") or current_tab
        section_label = (override.get("section_override") if override else "") or current_section

        entry = {
            "fieldname": df.fieldname,
            "label": (override.get("label_override") if override else "") or (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": (override.get("options_override") if override else "") or df.options or "",
            "is_mandatory": _three_state(
                override.get("mandatory_override") if override else None,
                df.reqd, "Required", "Optional"),
            "read_only": _three_state(
                override.get("read_only_override") if override else None,
                df.read_only, "Read Only", "Editable"),
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
            "default": df.get("default") or "",
            "length": df.get("length") or 0,
            "description": df.get("description") or "",
            "order": _row_order(override) if override else 0,
        }
        if entry["order"] == _NO_EXPLICIT_ORDER:
            entry["order"] = 0
        if doc is not None:
            entry["value"] = doc.get(df.fieldname)
        if df.fieldtype in ("Table", "Table MultiSelect") and df.options:
            entry["child_doctype"] = df.options
            entry["child_fields"] = _child_columns(df.options, override)

        tab = tab_map.setdefault(tab_label, {"order": [], "map": {}, "seq": len(tab_map)})
        if tab_label not in tab_order:
            tab_order.append(tab_label)
        if section_label not in tab["map"]:
            tab["map"][section_label] = []
            tab["order"].append(section_label)
        tab["map"][section_label].append(entry)

    tabs = []
    for tab_label in tab_order:
        tab = tab_map[tab_label]
        sections = []
        for section_seq, section_label in enumerate(tab["order"]):
            fields = tab["map"][section_label]
            fields.sort(key=lambda f: (f["order"] == 0, f["order"]))
            sections.append(({"section": section_label, "fields": fields},
                             _sequence_key(fields, section_seq)))
        sections.sort(key=lambda pair: pair[1])
        sections = [s for s, _ in sections]
        tab_fields = [f for s in sections for f in s["fields"]]
        tabs.append(({"tab": tab_label, "sections": sections}, _sequence_key(tab_fields, tab["seq"])))
    tabs.sort(key=lambda pair: pair[1])
    tabs = [t for t, _ in tabs]

    if selected is not None:
        for tab in tabs:
            tab["sections"] = [s for s in tab["sections"] if s["fields"]]
        tabs = [t for t in tabs if t["sections"]]

    return {
        "doctype": DOCTYPE,
        "form": form_doc.name if form_doc else None,
        "restrict_to_configured": 1 if restrict else 0,
        "basis_employment_type": 1 if basis_type else 0,
        "employment_type": employment_type,
        "tabs": tabs,
    }


@frappe.whitelist()
def get_new_hire_form_config(form=None, name=None, company=None, employment_type=None):
    """Render config for the New Hire form.

    `name` is a pending Employee; pass it and every field carries its current
    `value`, so one call powers both the create and the edit screen.
    """
    try:
        frappe.has_permission(DOCTYPE, "read", throw=True)

        doc = None
        if name:
            if not frappe.db.exists(DOCTYPE, name):
                return _err(_("Employee not found: {0}").format(name), http=404)
            doc = frappe.get_doc(DOCTYPE, name)
            doc.check_permission("read")
            form = form or doc.get(FORM_FIELD)
            company = company or doc.company
            employment_type = employment_type or doc.employment_type

        form_doc = resolve_form(form=form, company=company, employment_type=employment_type)
        if not form_doc:
            return _err(_("No New Hire Form is configured. Create one and mark it default."), http=412)

        return _ok(_("Form configuration fetched."),
                   _build_form_config(form_doc, doc=doc, employment_type=employment_type))
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_new_hire_form_config failed")
        return _err(_("Failed to build form configuration: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# Field catalogue — what the builder's palette offers
# ---------------------------------------------------------------------------


@frappe.whitelist()
def get_employee_field_catalog(form=None, search=None, include_tables=0):
    """Every Employee field the builder can place, grouped the way Employee
    groups them.

    Returns `groups: [{tab, section, fields: [...]}]` in DocType order — so the
    palette reads like the Employee form itself rather than a flat alphabet — and
    marks each field `on_form` so the builder can show what is already placed.

    Table fields are excluded by default: a grid inside an intake form is a
    different piece of UI, and most of Employee's tables (dependents, documents,
    salary history) belong to onboarding rather than intake. Pass
    `include_tables=1` to see them.
    """
    try:
        frappe.has_permission(FORM_DOCTYPE, "read", throw=True)

        form_doc = resolve_form(form=form)
        placed = set(_load_form_overrides(form_doc).keys())
        include_tables = frappe.utils.sbool(include_tables)
        needle = (search or "").strip().lower()

        meta = frappe.get_meta(DOCTYPE)
        groups, index = [], {}
        current_tab, current_section = "", ""
        total = 0

        for df in meta.fields:
            if df.fieldtype == "Tab Break":
                current_tab = (df.label or "").strip()
                current_section = ""
                continue
            if df.fieldtype == "Section Break":
                current_section = (df.label or "").strip()
                continue
            if df.fieldtype in _LAYOUT_TYPES or not df.fieldname:
                continue
            if df.fieldname in _SKIP_FIELDNAMES or df.fieldname in _FRAPPE_MANAGED:
                continue
            if df.fieldtype in ("Table", "Table MultiSelect") and not include_tables:
                continue
            if needle and needle not in df.fieldname.lower() and needle not in (df.label or "").lower():
                continue

            key = (current_tab, current_section)
            if key not in index:
                index[key] = len(groups)
                groups.append({"tab": current_tab, "section": current_section, "fields": []})
            groups[index[key]]["fields"].append({
                "fieldname": df.fieldname,
                "label": (df.label or df.fieldname).strip(),
                "fieldtype": df.fieldtype,
                "options": df.options or "",
                "reqd": df.reqd or 0,
                "read_only": 1 if df.read_only else 0,
                "hidden": int(df.get("hidden") or 0),
                "is_custom_field": int(df.get("is_custom_field") or 0),
                "on_form": df.fieldname in placed,
            })
            total += 1

        return _ok(_("Field catalogue fetched."), {
            "doctype": DOCTYPE,
            "form": form_doc.name if form_doc else None,
            "groups": groups,
            "total": total,
            "placed": len(placed),
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_employee_field_catalog failed")
        return _err(_("Failed to read the field catalogue: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def seed_default_fields(form=None):
    """Put the fields an Employee cannot be created without onto a blank form.

    Mandatory is left at "Default" so the Employee meta still decides what is
    required — this only puts them ON the form. Idempotent: a field already
    configured is left exactly as it is.
    """
    try:
        frappe.has_permission(FORM_DOCTYPE, "write", throw=True)
        form_doc = resolve_form(form=form)
        if not form_doc:
            return _err(_("No New Hire Form is configured."), http=412)
        form_doc = frappe.get_doc(FORM_DOCTYPE, form_doc.name)

        meta = frappe.get_meta(DOCTYPE)
        placed = set(_load_form_overrides(form_doc).keys())
        added = []
        order = len(form_doc.get("field_overrides") or [])

        for fieldname in _CORE_FORM_FIELDS:
            if fieldname in placed or not meta.has_field(fieldname):
                continue
            order += 1
            form_doc.append("field_overrides", {
                "fieldname": fieldname,
                "applies_to": "Parent",
                "expose": "Show",
                "mandatory_override": "Default",
                "read_only_override": "Default",
                "order": order,
            })
            added.append(fieldname)

        if added:
            form_doc.save(ignore_permissions=True)
        return _ok(_("Added {0} field(s).").format(len(added)), {"form": form_doc.name, "added": added})
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "seed_default_fields failed")
        return _err(_("Could not seed the form: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# Intake — create / update a pending Employee
# ---------------------------------------------------------------------------


def _writable_fields(form_doc):
    """Fields a payload may write, derived from the same config the form renders
    from — so a hidden or read-only field cannot be written by a client that
    posts it anyway. Employee-mandatory fields bypass both rules, matching the
    render side."""
    meta = frappe.get_meta(DOCTYPE)
    overrides = _load_form_overrides(form_doc)
    restrict = bool(form_doc and form_doc.get("restrict_to_configured"))

    writable = set()
    for df in meta.fields:
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname:
            continue
        if df.fieldname in _SKIP_FIELDNAMES or df.fieldname in _FRAPPE_MANAGED:
            continue

        if df.reqd:
            writable.add(df.fieldname)
            continue
        override = overrides.get(df.fieldname)
        if restrict and override is None:
            continue
        if override:
            if override.get("expose") == "Hide":
                continue
            if override.get("read_only_override") == "Read Only":
                continue
            if df.read_only and override.get("read_only_override") != "Editable":
                continue
        elif df.read_only:
            continue
        writable.add(df.fieldname)
    return writable


def _apply_payload(doc, payload, form_doc):
    """Write the allowed subset of `payload` onto `doc`.

    Fields outside the allowlist are ignored silently — a stale client that keeps
    posting a since-hidden field must not start failing. An invalid Link is
    dropped with a log rather than throwing: one bad reference should not lose
    the whole intake.
    """
    allowed = _writable_fields(form_doc)
    meta = frappe.get_meta(DOCTYPE)
    ignored, dropped = [], []

    for fieldname, value in payload.items():
        if fieldname not in allowed:
            ignored.append(fieldname)
            continue
        df = meta.get_field(fieldname)
        if df and df.fieldtype == "Link" and value and not frappe.db.exists(df.options, value):
            dropped.append(fieldname)
            frappe.logger().info(
                "New Hire: dropping invalid link {0}={1!r} (no such {2})".format(
                    fieldname, str(value)[:80], df.options)
            )
            continue
        doc.set(fieldname, value)

    return {"ignored_fields": ignored, "dropped_links": dropped}


def _validate_mandatory(doc, form_doc, employment_type=None, config=None):
    """Enforce the config's mandatory rules server-side. The form config is the
    contract, so a field the config forces Required is validated here too —
    Employee's own `reqd` only covers a handful.

    `config` lets the caller pass a tree it has already built. This walks every
    Employee field, and there are several hundred; building it twice in one
    request is pure waste.
    """
    if config is None:
        config = _build_form_config(form_doc, doc=None, employment_type=employment_type)
    missing = []
    for tab in config["tabs"]:
        for section in tab["sections"]:
            for field in section["fields"]:
                if not field["is_mandatory"] or field["read_only"]:
                    continue
                if doc.get(field["fieldname"]) in (None, "", []):
                    missing.append(field["label"])
    if missing:
        frappe.throw(_("Required: {0}").format(", ".join(missing)),
                     title=_("Missing mandatory fields"))


@frappe.whitelist()
def create_new_hire(payload=None, form=None, submit=1):
    """Create the new hire as a pending Employee.

    Named out of the `PEND-` series via `insert(set_name=...)`, which bypasses
    autoname — so no real employee code is consumed until activation. `status` is
    Pending, which keeps the record out of payroll and attendance (both filter
    `status == "Active"`) and out of the role grants in `cn_hrms_core`, which
    fire on the transition TO Active.

    `submit=1` (default) sets the stage to Pending Approval, which is what the
    approval matrix's Flow Config fires on. Nothing here starts it.
    """
    try:
        frappe.has_permission(DOCTYPE, "create", throw=True)
        payload = _coerce_payload(payload)

        form_doc = resolve_form(
            form=form,
            company=payload.get("company"),
            employment_type=payload.get("employment_type"),
        )
        if not form_doc:
            return _err(_("No New Hire Form is configured. Create one and mark it default."), http=412)

        doc = frappe.new_doc(DOCTYPE)
        applied = _apply_payload(doc, payload, form_doc)
        doc.status = PENDING_STATUS
        doc.set(FORM_FIELD, form_doc.name)
        doc.set(STAGE_FIELD, "Pending Approval" if frappe.utils.sbool(submit) else "Draft")

        if doc.get(STAGE_FIELD) == "Pending Approval":
            _validate_mandatory(
                doc, form_doc,
                config=_build_form_config(
                    form_doc, employment_type=doc.get("employment_type")),
            )

        doc.insert(set_name=make_autoname(PENDING_SERIES))

        return _ok(_("New hire {0} created.").format(doc.name), {
            "name": doc.name,
            "status": doc.status,
            "stage": doc.get(STAGE_FIELD),
            "form": form_doc.name,
            **applied,
        }, http=201)
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "create_new_hire failed")
        return _err(_("Failed to create the new hire: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def update_new_hire(name=None, payload=None, submit=0):
    """Update a pending Employee that has not gone for approval yet.

    Permitted only while the stage is Draft or Rejected. Once the matrix is
    running, edits belong to its own send-back — otherwise an approver could be
    looking at values that have since changed.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")

        # A blank stage is an intake that never got one — raised before the field
        # existed, or saved through a path that dropped it. That is the
        # not-yet-submitted case, so read it as Draft: left blank it fell through
        # to `doc.status` ("Pending") and the record became permanently
        # uneditable, because no endpoint can set the stage back.
        stage = doc.get(STAGE_FIELD) or "Draft"
        if stage not in EDITABLE_STAGES:
            return _err(
                _("{0} is {1} and can no longer be edited here.").format(name, stage),
                http=409,
            )

        payload = _coerce_payload(payload)
        form_doc = resolve_form(form=doc.get(FORM_FIELD))
        if not form_doc:
            return _err(_("The form this new hire was raised on no longer exists."), http=412)

        applied = _apply_payload(doc, payload, form_doc)
        doc.set(STAGE_FIELD, stage)
        if frappe.utils.sbool(submit):
            _validate_mandatory(
                doc, form_doc,
                config=_build_form_config(
                    form_doc, employment_type=doc.get("employment_type")),
            )
            doc.set(STAGE_FIELD, "Pending Approval")
        doc.save()

        return _ok(_("New hire {0} updated.").format(doc.name), {
            "name": doc.name, "status": doc.status, "stage": doc.get(STAGE_FIELD), **applied,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "update_new_hire failed")
        return _err(_("Failed to update the new hire: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# Read surfaces
# ---------------------------------------------------------------------------

_DEFAULT_LIST_COLUMNS = (
    "name", "employee_name", "designation", "department", "company",
    "employment_type", "date_of_joining", STAGE_FIELD,
)
_LIST_COLUMN_LABEL_OVERRIDES = {"name": "Pending ID"}
_SORTABLE = frozenset({
    "creation", "modified", "name", "employee_name", "date_of_joining",
    "company", "designation", "department", STAGE_FIELD,
})


def _list_columns():
    meta = frappe.get_meta(DOCTYPE)
    columns = []
    for fieldname in _DEFAULT_LIST_COLUMNS:
        if fieldname != "name" and not meta.has_field(fieldname):
            continue
        label = _LIST_COLUMN_LABEL_OVERRIDES.get(fieldname)
        if not label:
            df = meta.get_field(fieldname)
            label = (df.label if df and df.label else fieldname.replace("_", " ").title())
        columns.append({"fieldname": fieldname, "label": label, "value_key": fieldname})
    return columns


def _sanitize_order_by(order_by):
    if not order_by:
        return "creation desc"
    parts = str(order_by).strip().split()
    field = parts[0]
    direction = (parts[1].lower() if len(parts) > 1 else "desc")
    if field not in _SORTABLE or direction not in ("asc", "desc"):
        return "creation desc"
    return f"{field} {direction}"


def _can_initiate(row):
    return bool(row.get(STAGE_FIELD) == "Approved")


@frappe.whitelist()
def get_new_hire(name=None, filters=None, stage=None, search=None,
                 start=0, page_length=20, order_by=None):
    """One pending Employee, or the paginated pending list.

    The list is always scoped to `status = "Pending"`, so it can never show the
    site's real staff. Pass `stage="Approved"` for the ones waiting to be
    onboarded. Every row carries `can_initiate_onboarding`, so the button's
    enabled state is a server decision.
    """
    try:
        frappe.has_permission(DOCTYPE, "read", throw=True)

        if name:
            if not frappe.db.exists(DOCTYPE, name):
                return _err(_("Employee not found: {0}").format(name), http=404)
            doc = frappe.get_doc(DOCTYPE, name)
            doc.check_permission("read")
            # Employee carries several hundred fields, a few permlevel-guarded.
            # `as_dict` does not honour field-level read permissions on its own,
            # so without this the whole record goes out to anyone who can read it.
            doc.apply_fieldlevel_read_permissions()
            data = doc.as_dict()
            data["can_initiate_onboarding"] = _can_initiate(data)
            return _ok(_("New hire fetched."), data)

        query_filters = {}
        if isinstance(filters, str):
            try:
                query_filters.update(json.loads(filters) or {})
            except (TypeError, ValueError):
                return _err(_("`filters` must be valid JSON."))
        elif isinstance(filters, dict):
            query_filters.update(filters)
        if stage:
            query_filters[STAGE_FIELD] = stage
        if search:
            # Neutralise LIKE wildcards so a caller cannot pass "%" and match
            # every row regardless of what they typed.
            escaped = (str(search).replace("\\", "\\\\")
                       .replace("%", "\\%").replace("_", "\\_"))
            query_filters["employee_name"] = ("like", f"%{escaped}%")

        # LAST, and deliberately so: this endpoint is the pending-new-hire
        # surface, and `filters` comes from the client. Merging the scope first
        # would let a caller pass {"status": "Active"} and turn it into a general
        # employee lister — permission-bounded, but showing real staff on a
        # screen that promises pending ones.
        query_filters["status"] = PENDING_STATUS

        columns = _list_columns()
        fields = list({c["fieldname"] for c in columns} | {"name", STAGE_FIELD, "status"})

        rows = frappe.get_list(
            DOCTYPE, filters=query_filters, fields=fields,
            start=frappe.utils.cint(start),
            page_length=frappe.utils.cint(page_length) or 20,
            order_by=_sanitize_order_by(order_by),
        )
        for row in rows:
            row["can_initiate_onboarding"] = _can_initiate(row)

        # Counted through get_list so the total honours the same permissions and
        # filters as the page above — a total larger than the rows the caller can
        # actually see is a bug they will report.
        #
        # Deliberately NOT a SQL COUNT: Frappe v16 rejects `count(name) as total`
        # written as a string, and the `[{"COUNT": "name"}]` dict form only works
        # on one of the two query engines — it returns a count under
        # `frappe.get_list` in a script and raises "'dict' object has no
        # attribute 'lower'" through the HTTP path, which is how this shipped
        # broken once. Plucking names is engine-independent, and this list is
        # hard-scoped to pending hires, so it is a short list by construction.
        total = len(frappe.get_list(
            DOCTYPE, filters=query_filters, pluck="name", limit_page_length=0))

        return _ok(_("New hires fetched."), {
            "columns": columns,
            "rows": rows,
            "total": total,
            "start": frappe.utils.cint(start),
            "page_length": frappe.utils.cint(page_length) or 20,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_new_hire failed")
        return _err(_("Failed to fetch new hires: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def get_new_hire_approval_flow(name=None):
    """The approval ladder for one pending Employee, shaped for the UI tab.

    Reads the nextai Approval Tracker the matrix creates. Before a tracker exists
    it still returns the full ladder from the active matrix with every stage
    Upcoming, so the tab is never blank while the flow is starting.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        frappe.has_permission(DOCTYPE, "read", doc=name, throw=True)

        # Generic over doctype and already covered by the requisition tests —
        # duplicating them here would be two copies to keep in step.
        from recruitment.api.job_requisition import (
            _aggregate_stage_logs, _approval_display_names, _split_users,
        )

        stage_now = frappe.db.get_value(DOCTYPE, name, STAGE_FIELD)
        empty = {"employee": name, "has_approval": False, "tracker": None,
                 "stage": stage_now, "stages": []}

        tracker = frappe.db.get_value(
            "Approval Tracker", {"doc_type": DOCTYPE, "doc_name": name},
            ["name", "status", "approval_mode", "current_approval_step", "creation"],
            as_dict=True, order_by="creation desc",
        )
        if not tracker:
            empty["stages"] = _matrix_ladder()
            return _ok(_("Approval flow fetched."), empty)

        stages = frappe.get_all(
            "Approval Stages",
            filters={"parent": tracker.name, "parenttype": "Approval Tracker"},
            fields=["idx", "approval_name", "approval_label", "rejection_label"],
            order_by="idx asc",
        )
        logs = frappe.get_all(
            "Approval Log Entry",
            filters={"parent": tracker.name, "parenttype": "Approval Tracker"},
            fields=["name", "stage_index", "stage_name", "status", "user",
                    "custom_allocated_to_users", "custom_assigned_to_roles", "role",
                    "approval_time", "creation", "approval_label", "rejection_label"],
            order_by="stage_index asc, idx asc",
        )

        everyone = []
        for log in logs:
            everyone.extend(_split_users(log.get("user"), log.get("custom_allocated_to_users")))
        names = _approval_display_names(everyone)

        logs_by_stage = {}
        for log in logs:
            logs_by_stage.setdefault(log.get("stage_index") or 0, []).append(log)

        out_stages = []
        for stage in stages:
            index = stage.idx - 1
            stage_logs = logs_by_stage.get(index, [])
            aggregate = _aggregate_stage_logs(stage_logs) if stage_logs else {
                "status": "Not started", "actioned": 0, "total": 0}

            approvers, acted_by, completed = [], [], []
            for log in stage_logs:
                for uid in _split_users(log.get("custom_allocated_to_users"), log.get("user")):
                    if names.get(uid) not in approvers:
                        approvers.append(names.get(uid, uid))
                if log.get("status") in ("Approved", "Rejected") and log.get("user"):
                    for uid in _split_users(log.get("user")):
                        if names.get(uid) not in acted_by:
                            acted_by.append(names.get(uid, uid))
                if log.get("approval_time"):
                    completed.append(log["approval_time"])

            roles = []
            for log in stage_logs:
                raw = str(log.get("custom_assigned_to_roles") or log.get("role") or "")
                for role in raw.split(","):
                    role = role.strip()
                    if role and role not in roles:
                        roles.append(role)

            sample = stage_logs[0] if stage_logs else {}
            if aggregate["status"] == "Approved":
                action = sample.get("approval_label") or "Approve"
            elif aggregate["status"] == "Rejected":
                action = sample.get("rejection_label") or "Reject"
            else:
                action = aggregate["status"] if stage_logs else "—"

            out_stages.append({
                "stage_index": index,
                "stage_name": (stage.approval_name
                               or (sample.get("stage_name") if stage_logs else None)
                               or _("Stage {0}").format(stage.idx)),
                "approvers": approvers,
                "roles": roles,
                "action_taken_by": acted_by,
                "action": action,
                "status": aggregate["status"],
                "trigger_date": sample.get("creation") if stage_logs else None,
                "completed_date": (max(completed)
                                   if completed and aggregate["status"] != "Pending" else None),
            })

        return _ok(_("Approval flow fetched."), {
            "employee": name,
            "has_approval": True,
            "tracker": tracker.name,
            "status": tracker.status,
            "stage": stage_now,
            "approval_mode": tracker.approval_mode,
            "current_step": tracker.current_approval_step,
            "total_stages": len(out_stages),
            "stages": out_stages,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_new_hire_approval_flow failed")
        return _err(_("Failed to fetch the approval flow: {0}").format(str(exc)), http=500)


def _matrix_ladder():
    """The full stage ladder from the active matrix, every stage Upcoming."""
    matrices = frappe.get_all(
        "Approval Policy Matrix",
        filters={"target_doctype": DOCTYPE, "is_active": 1},
        fields=["name"], order_by="priority_level asc", limit=1,
    )
    if not matrices:
        return []
    stages = frappe.get_doc("Approval Policy Matrix", matrices[0].name).get("approval_stages") or []
    return [{
        "stage_index": idx,
        "stage_name": stage.get("approval_name") or _("Stage {0}").format(idx + 1),
        "approvers": [], "roles": [r.strip() for r in str(stage.get("role") or "").split(",") if r.strip()],
        "action_taken_by": [], "action": "—", "status": "Upcoming",
        "trigger_date": None, "completed_date": None,
    } for idx, stage in enumerate(stages)]


# ---------------------------------------------------------------------------
# Handoff and activation
# ---------------------------------------------------------------------------

_HANDOFF_SAVEPOINT = "new_hire_handoff"


def _rollback_handoff():
    try:
        frappe.db.rollback(save_point=_HANDOFF_SAVEPOINT)
    except Exception:
        pass


def _create_job_applicant(doc, form_doc):
    """The Job Applicant the onboarding hangs off.

    Not paperwork: the candidate portal locates the onboarding by
    `Job Applicant.email_id` (`employee_onboarding.update_onboarding_details`)
    and authenticates through `Candidate Portal User.job_applicant`, so without
    one the candidate can never open the form they are meant to fill in.
    """
    applicant = frappe.new_doc(JOB_APPLICANT)
    applicant.applicant_name = doc.employee_name
    applicant.email_id = doc.get("personal_email") or doc.get("company_email")
    applicant.designation = doc.designation
    applicant.status = "Accepted"
    if applicant.meta.has_field("phone_number") and doc.get("cell_number"):
        applicant.phone_number = doc.cell_number

    portal_form = (form_doc.get("onboarding_portal_form")
                   or frappe.db.get_value("Onboarding Portal Forms", {"default": 1}, "name"))
    if portal_form and applicant.meta.has_field("custom_onboarding_portal_form"):
        applicant.custom_onboarding_portal_form = portal_form

    applicant.insert(ignore_permissions=True)
    return applicant


@frappe.whitelist()
def initiate_onboarding(name=None):
    """Hand an approved pending Employee to the existing onboarding process.

    Creates the Job Applicant, then the Employee Onboarding linked to BOTH the
    applicant and the pending Employee — so onboarding fills in the same record
    that will later be activated, and `make_employee` is never needed.

    Idempotent: an onboarding already linked to this Employee is returned as is.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")

        existing = frappe.db.get_value(
            EMPLOYEE_ONBOARDING, {"employee": name, "docstatus": ("<", 2)}, "name")
        if existing:
            return _ok(_("Onboarding already initiated."), {
                "name": name, "stage": doc.get(STAGE_FIELD),
                "employee_onboarding": existing, "already_initiated": True,
            })

        if doc.get(STAGE_FIELD) != "Approved":
            return _err(
                _("{0} is {1}. Onboarding can only be initiated once the request is Approved.").format(
                    name, doc.get(STAGE_FIELD) or doc.status),
                http=409)

        form_doc = resolve_form(form=doc.get(FORM_FIELD))
        if not form_doc:
            return _err(_("The form this new hire was raised on no longer exists."), http=412)

        frappe.db.savepoint(_HANDOFF_SAVEPOINT)
        applicant = _create_job_applicant(doc, form_doc)

        onboarding = frappe.new_doc(EMPLOYEE_ONBOARDING)
        onboarding.job_applicant = applicant.name
        onboarding.employee = doc.name
        onboarding.employee_name = doc.employee_name
        onboarding.company = doc.company
        onboarding.date_of_joining = doc.date_of_joining
        onboarding.boarding_begins_on = frappe.utils.today()
        for fieldname in ("department", "designation"):
            if onboarding.meta.has_field(fieldname) and doc.get(fieldname):
                onboarding.set(fieldname, doc.get(fieldname))
        if onboarding.meta.has_field("custom_direct_hire"):
            onboarding.custom_direct_hire = 1
        if onboarding.meta.has_field("custom_onboarding_portal_form"):
            onboarding.custom_onboarding_portal_form = (
                applicant.get("custom_onboarding_portal_form"))

        # The two things a hand-built onboarding would otherwise be missing.
        # `materialize_onboarding_from_applicant` is not reusable here — it is
        # written around an applicant-first flow and re-derives the Employee — but
        # these are the parts that matter, and skipping them is not survivable:
        # an onboarding with no template carries NO activities, so the candidate
        # and HR get a task list that is silently empty.
        from recruitment.api.candidate_portal import (
            _apply_default_onboarding_template, _apply_onboarding_automation_fields,
        )
        _apply_onboarding_automation_fields(onboarding, applicant, None)
        _apply_default_onboarding_template(onboarding)

        onboarding.insert(ignore_permissions=True)

        doc.db_set(STAGE_FIELD, "Onboarding Initiated", update_modified=False)

        return _ok(_("Onboarding {0} initiated.").format(onboarding.name), {
            "name": doc.name,
            "stage": "Onboarding Initiated",
            "job_applicant": applicant.name,
            "employee_onboarding": onboarding.name,
            "already_initiated": False,
        }, http=201)
    except frappe.PermissionError as exc:
        _rollback_handoff()
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        _rollback_handoff()
        return _err(str(exc), http=400)
    except Exception as exc:
        _rollback_handoff()
        frappe.log_error(frappe.get_traceback(), "initiate_onboarding failed")
        return _err(_("Failed to initiate onboarding: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def activate_employee(name=None):
    """Turn a completed pending Employee into a real one.

    Two steps, in this order:

      1. rename out of `PEND-` into the site's real series — the one
         `cn_hrms_core`'s `before_insert` already stamped onto `naming_series`,
         so the code matches every other employee. Frappe's rename updates every
         inbound link, and Employee's `after_rename` re-stamps its own
         `employee` field.
      2. `status = "Active"`, which is what releases the hierarchy role grants in
         `cn_hrms_core` (they are gated on the transition TO Active) and lets
         payroll and attendance see the person.

    Renaming first means the role grants and every downstream hook fire against
    the final name, so nothing is left pointing at a `PEND-` id.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")

        if doc.status == ACTIVE_STATUS:
            return _ok(_("Already active."), {"name": doc.name, "status": doc.status,
                                              "renamed": False})
        if doc.status != PENDING_STATUS:
            return _err(_("{0} is {1}, not Pending.").format(name, doc.status), http=409)

        final = doc.name
        renamed = False
        if doc.name.startswith(PENDING_PREFIX):
            series = (doc.get("naming_series") or "").strip()
            if not series:
                return _err(
                    _("{0} has no naming series, so a real employee code cannot be issued.").format(name),
                    http=409)
            # The series is stored as a prefix ("HomeFirst-"); make_autoname wants
            # the hash placeholders that decide the number width.
            pattern = series if "#" in series else series + ".#####"
            final = rename_doc(DOCTYPE, doc.name, make_autoname(pattern),
                               force=True, ignore_permissions=True, show_alert=False)
            renamed = True

        # Saved through the document, not `db.set_value`: the hierarchy role
        # grants in `cn_hrms_core` hang off `Employee.on_update`, and set_value
        # writes straight to SQL without firing a single document event — so
        # activating that way granted the new employee nothing.
        active = frappe.get_doc(DOCTYPE, final)
        active.status = ACTIVE_STATUS
        active.set(STAGE_FIELD, "Completed")
        active.save(ignore_permissions=True)

        return _ok(_("{0} is now active.").format(final), {
            "name": final, "previous_name": name if renamed else None,
            "status": ACTIVE_STATUS, "renamed": renamed,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "activate_employee failed")
        return _err(_("Failed to activate: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def cancel_new_hire(name=None, reason=None):
    """Withdraw a pending Employee that has not been handed to onboarding."""
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")

        onboarding = frappe.db.get_value(
            EMPLOYEE_ONBOARDING, {"employee": name, "docstatus": ("<", 2)}, "name")
        if onboarding:
            return _err(
                _("Onboarding {0} has already been initiated. Cancel it there instead.").format(onboarding),
                http=409)
        if doc.status != PENDING_STATUS:
            return _err(_("{0} is {1}, not Pending.").format(name, doc.status), http=409)

        # Through the document for the same reason as activation: Inactive is what
        # `cn_hrms_core`'s `disable_user_on_employee_inactive` hangs off, and a
        # set_value would leave a withdrawn hire's login enabled.
        doc.set(STAGE_FIELD, "Cancelled")
        doc.status = "Inactive"
        doc.save(ignore_permissions=True)
        if reason:
            doc.add_comment("Comment", _("Cancelled: {0}").format(reason))

        return _ok(_("{0} cancelled.").format(name), {"name": name, "stage": "Cancelled"})
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "cancel_new_hire failed")
        return _err(_("Failed to cancel: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# Hook handlers
# ---------------------------------------------------------------------------


def auto_initiate_on_approval(doc, method=None):
    """`Employee.on_update`: hand an approved new hire straight to onboarding.

    Only for a pending Employee whose form asks for it. Never raises — a failure
    here must not roll back the approval the matrix just recorded; HR can still
    press the button, and the error is in the log.
    """
    if doc.status != PENDING_STATUS or doc.get(STAGE_FIELD) != "Approved":
        return
    if not frappe.db.get_value(FORM_DOCTYPE, doc.get(FORM_FIELD), "auto_initiate_onboarding"):
        return
    if frappe.db.exists(EMPLOYEE_ONBOARDING, {"employee": doc.name, "docstatus": ("<", 2)}):
        return
    try:
        initiate_onboarding(doc.name)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"auto_initiate_on_approval failed for {doc.name}")


def stage_from_onboarding(doc, method=None):
    """`Employee Onboarding.on_update`: move the new hire's stage to Completed
    once field-level approval has cleared every portal field.

    Activation stays a deliberate act — `activate_employee` is what renames the
    record and releases the role grants. This only marks it ready.
    """
    employee = doc.get("employee")
    if not employee or doc.get("boarding_status") != "Completed":
        return
    current = frappe.db.get_value(DOCTYPE, employee,
                                  ["status", STAGE_FIELD], as_dict=True)
    if not current or current.status != PENDING_STATUS:
        return
    if current.get(STAGE_FIELD) != "Onboarding Initiated":
        return
    frappe.db.set_value(DOCTYPE, employee, STAGE_FIELD, "Completed", update_modified=False)


# Employee Onboarding declares `job_offer` mandatory, but a direct hire has no
# offer to record — nothing was negotiated and no letter was sent.
# `setup_direct_hire_support` clears `reqd` on that field and marks a direct
# hire's onboarding with this flag; the check below is what keeps the requirement
# for everyone who DID come through recruitment.
DIRECT_HIRE_FLAG = "custom_direct_hire"


def require_job_offer_unless_direct_hire(doc, method=None):
    """`Employee Onboarding.validate`: keep the Job Offer requirement for every
    onboarding that came through recruitment.

    Frappe applies `mandatory_depends_on` only in the desk form, never on the
    server, so clearing `reqd` alone would drop the requirement for anything
    created through the API. This is the server-side half.
    """
    if not doc.meta.has_field(DIRECT_HIRE_FLAG):
        return
    if doc.get(DIRECT_HIRE_FLAG) or doc.get("job_offer"):
        return
    frappe.throw(
        _("Job Offer is required before this onboarding can be saved."),
        frappe.MandatoryError, title=_("Missing Job Offer"),
    )


@frappe.whitelist()
def setup_direct_hire_support():
    """Let Employee Onboarding hold a direct hire. Run once per site; idempotent.

    Adds `custom_direct_hire` and moves `job_offer` from `reqd` to
    `mandatory_depends_on`. The second half only changes the desk form — the real
    enforcement is :func:`require_job_offer_unless_direct_hire`.
    """
    try:
        frappe.only_for("System Manager")
        created = []
        if not frappe.get_meta(EMPLOYEE_ONBOARDING).has_field(DIRECT_HIRE_FLAG):
            create_custom_field(EMPLOYEE_ONBOARDING, {
                "fieldname": DIRECT_HIRE_FLAG,
                "label": "Direct Hire",
                "fieldtype": "Check",
                "default": "0",
                "read_only": 1,
                "insert_after": "job_offer",
                "module": "Recruitment",
                "description": _(
                    "Raised from a New Hire form rather than through recruitment. "
                    "A direct hire has no Job Offer behind it."),
            })
            created.append(DIRECT_HIRE_FLAG)

        frappe.make_property_setter({
            "doctype": EMPLOYEE_ONBOARDING, "fieldname": "job_offer",
            "property": "reqd", "value": "0", "property_type": "Check",
        }, is_system_generated=True)
        frappe.make_property_setter({
            "doctype": EMPLOYEE_ONBOARDING, "fieldname": "job_offer",
            "property": "mandatory_depends_on",
            "value": f"eval:!doc.{DIRECT_HIRE_FLAG}", "property_type": "Data",
        }, is_system_generated=True)

        frappe.clear_cache(doctype=EMPLOYEE_ONBOARDING)
        offer_field = frappe.get_meta(EMPLOYEE_ONBOARDING).get_field("job_offer")
        return _ok(_("Direct-hire support is in place."), {
            "created_fields": created,
            "job_offer_reqd": offer_field.reqd or 0,
            "job_offer_mandatory_depends_on": offer_field.mandatory_depends_on or "",
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "setup_direct_hire_support failed")
        return _err(_("Setup failed: {0}").format(str(exc)), http=500)
