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
(``insert(set_name=...)``), which bypasses autoname — so a new hire who never
joins does not burn a real employee code. ``activate_employee`` renames it into
the site's real series (the one ``cn_hrms_core``'s ``before_insert`` already
stamped onto ``naming_series``) and flips the status to Active. Records raised
while intake used the real series keep their name; activation only flips them.

Company email
-------------
Asked at activation, not at intake — the person has no mailbox until they are
actually joining. It is therefore left off the intake form, and Employee's own
``reqd`` on it (a cn_hrms_core Property Setter) is deferred for as long as the
record has never been Active — see :func:`defer_activation_fields`.

Response envelope
-----------------
Every endpoint here answers in the same shape, on success and on failure alike,
so a caller branches on one field::

    {"success": bool, "message": str, "data": ..., "warnings": [str]}

`message` is written to be shown as-is. `data` is the endpoint's payload (None
on failure); the write endpoints all carry at least ``name``, ``status`` and
``stage``. `warnings` is Frappe's own msgprint queue, drained out of
`_server_messages` so it cannot raise popups of its own — usually empty.

The HTTP status carries the category: 400 bad input, 403 not permitted, 404 no
such record, 409 wrong state for the action, 412 nothing configured to act on,
500 unexpected — and only a 500 hides its cause, returning ``data.error_log``
to quote instead.

Lifecycle
---------
HR fills the form and submits; the Employee is created Pending under a ``PEND-``
code. HR then activates it, entering the company email, and it becomes Active
under its real code. ``status`` stays "Pending" until then; the intake's own
progress lives on ``custom_new_hire_stage``, so the approval matrix has
something to drive that is not the person's employment status:

    Draft -> Pending Approval -> Approved -> Completed (activated)
                              -> Rejected            (Cancelled before activation)

Activation is allowed from Pending Approval as well as Approved: an approval
matrix — where one is configured — runs alongside, not in front of it.

Step 2 (Assign & Initiate Onboarding, stage "Onboarding Initiated") is no longer
part of the flow and nothing in the UI calls it. Its endpoints and the
auto-initiate hook are kept intact so it can be switched back on.

A New Hire Form record configures which Employee fields the form shows, in what
order, under which tab and section, and which are mandatory. A field with no
config row follows the Employee meta exactly. Its `initiation_fields` table does
the same for step 2, over Employee Onboarding fields.
"""

import json
from contextlib import contextmanager

import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_field
from frappe.model.naming import make_autoname, set_new_name
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
INITIABLE_STAGES = frozenset({"Pending Approval", "Approved"})
# Everything a submitted intake can be in. "Onboarding Initiated" and "Completed"
# are there for records raised while step 2 was still part of the flow.
ACTIVATABLE_STAGES = frozenset({"Pending Approval", "Approved", "Onboarding Initiated", "Completed"})

# Employee fields HR supplies at activation rather than at intake. They are kept
# off the intake form, and their Employee-level `reqd` is deferred until then.
ACTIVATION_FIELDS = ("company_email",)

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
    "lft", "rgt", "old_parent", STAGE_FIELD, FORM_FIELD, *ACTIVATION_FIELDS,
})

_FRAPPE_MANAGED = frozenset({
    "name", "owner", "creation", "modified", "modified_by", "docstatus", "idx",
    "parent", "parentfield", "parenttype", "doctype", "_assign", "_comments",
    "_user_tags", "_liked_by",
})

_NO_EXPLICIT_ORDER = 10_000

# What a blank form starts with. Employee marks `first_name`, `gender`,
# `date_of_joining` and `company` mandatory (`company_email` too, but that one is
# asked at activation — see ACTIVATION_FIELDS), and this site
# additionally refuses an Employee with no Department or Designation through a
# custom validation that `reqd` does not expose — so a form built without them
# looks fine and then fails at the far end.
_CORE_FORM_FIELDS = (
    "first_name", "middle_name", "last_name", "gender", "date_of_birth",
    "personal_email", "cell_number",
    "company", "department", "designation", "employment_type", "grade",
    "branch", "reports_to", "date_of_joining", "ctc",
)


# ---------------------------------------------------------------------------
# Response envelope
# ---------------------------------------------------------------------------


@contextmanager
def _internal_call():
    """Mark an endpoint call that is servicing someone else's save.

    `auto_initiate_on_approval` calls `initiate_onboarding` from inside
    `Employee.on_update`, so the message queue at that moment belongs to whoever
    is saving the Employee — draining it there would discard their messages into
    a response nobody reads.
    """
    previous = frappe.flags.get("new_hire_internal_call")
    frappe.flags.new_hire_internal_call = True
    try:
        yield
    finally:
        frappe.flags.new_hire_internal_call = previous


def _drain_messages():
    """Empty Frappe's msgprint queue into a plain list of strings.

    Whatever is left in that queue rides out as `_server_messages`, and a
    Frappe-aware client renders every entry as its own popup. Employee's hooks
    msgprint freely ("Removed Employee role as there is no mapped employee"),
    so a clean create raised dialogs nobody asked for; and on the error path the
    `frappe.throw` that got us here carries `raise_exception: 1`, giving a
    second, rawer dialog for the failure this envelope already describes.

    Draining makes the envelope the only thing a caller has to read, and
    returning the text means nothing is lost — it moves from a popup channel
    into `warnings`, where the client can decide.
    """
    if frappe.flags.get("new_hire_internal_call"):
        return []

    # Read and clear `frappe.local.message_log` directly rather than through
    # `get_message_log`/`clear_messages`: those helpers, and the shape of an
    # entry (a dict now, a JSON string in older Frappe), both vary by version,
    # and this module runs on more than one.
    queue = getattr(frappe.local, "message_log", None) or []
    drained = []
    for entry in queue:
        if isinstance(entry, str):
            try:
                entry = json.loads(entry)
            except (TypeError, ValueError):
                pass
        text = entry.get("message") if isinstance(entry, dict) else entry
        if text:
            drained.append(frappe.utils.strip_html(str(text)).strip())
    frappe.local.message_log = []
    return drained


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data,
            "warnings": _drain_messages()}


def _err(message, http=400, data=None):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": data,
            "warnings": _drain_messages()}


def _fail(message, title):
    """The 500 branch: a stable message plus the Error Log id to quote.

    The exception text is deliberately not returned. By the time it reaches
    here it is a raw SQL error or an internal traceback line — it tells the
    person at the screen nothing and tells anyone else too much. The traceback
    goes to the Error Log; `data.error_log` is how support finds it.

    `frappe.throw`/`ValidationError` messages are written FOR the caller, so
    those branches still return their text verbatim.
    """
    log = frappe.log_error(frappe.get_traceback(), title)
    return _err(message, http=500, data={"error_log": getattr(log, "name", None)})


def _name_error_message(exc):
    """A readable message for `frappe.NameError`.

    It is not a ValidationError, so without this it fell through to the 500
    branch — an invalid name or a clash with an existing record (an email
    already in use) is the caller's to fix, not a server fault. A duplicate
    raised by the insert itself carries (doctype, name, db error) rather than
    a message, so that one is put into words here.
    """
    if isinstance(exc, frappe.DuplicateEntryError) and len(exc.args) >= 2:
        return _("{0} {1} already exists.").format(_(exc.args[0]), exc.args[1])
    return frappe.utils.strip_html(str(exc)) or _("Invalid name.")


def _has_native_commit_guard():
    """Whether this Frappe carries its own commit guard on the connection.

    Split out so it can be forced off in a test — v16 has the counter, older
    versions raise `AttributeError: 'MariaDBDatabase' object has no attribute
    '_disable_transaction_control'`, and both paths have to work.
    """
    return hasattr(frappe.db, "_disable_transaction_control")


@contextmanager
def _no_commit():
    """Stop anything inside the block from committing the transaction.

    A COMMIT destroys every open savepoint. The rollback that follows then fails
    with "SAVEPOINT ... does not exist", which leaves the half-written record
    committed AND replaces the real error with an OperationalError — so the
    caller is told "could not be created" while the record sits there.

    Frappe holds a counter for exactly this around every doc-event hook
    (`Document.hook`), which is why a hook cannot commit. Two problems: the
    attribute is not in every Frappe version, and a Server Script and the
    outgoing-mail path run OUTSIDE that cover anyway — and those are precisely
    what an Employee insert triggers. So use the counter where it exists and
    shadow the connection's own methods where it does not, matching its
    semantics either way: full commits and rollbacks are ignored, rollbacks to a
    savepoint still go through.
    """
    if _has_native_commit_guard():
        frappe.db._disable_transaction_control += 1
        try:
            yield
        finally:
            frappe.db._disable_transaction_control -= 1
        return

    # Resolve the connection once. `frappe.db` is a LocalProxy, and shadowing on
    # the proxy but restoring against a re-resolved one would leave the shadow
    # behind if the connection is replaced mid-block.
    connection = getattr(frappe.db, "_get_current_object", lambda: frappe.db)()
    own = connection.__dict__
    previous = {field: own[field] for field in ("commit", "rollback") if field in own}
    real_rollback = connection.rollback

    def blocked_commit(*args, **kwargs):
        return None

    def savepoint_only_rollback(*args, save_point=None, **kwargs):
        if save_point:
            return real_rollback(save_point=save_point, **kwargs)
        return None

    connection.commit = blocked_commit
    connection.rollback = savepoint_only_rollback
    try:
        yield
    finally:
        for field in ("commit", "rollback"):
            if field in previous:
                setattr(connection, field, previous[field])
            else:
                own.pop(field, None)


@contextmanager
def _atomic(name):
    """Undo a half-finished write before it is reported as failed.

    Every endpoint here catches its own exceptions and *returns* the failure
    rather than raising it. Frappe only rolls a request back when the exception
    reaches `frappe.app.application`; a handled one takes the `else` branch,
    which calls `sync_database()` — and that COMMITS on any unsafe HTTP method.
    So a write that fell over halfway (an Employee inserted, then a hook throwing
    on the way out) was answered `success: false` and committed anyway, and the
    caller's retry made a second record with the same data.

    Frappe ships `frappe.database.savepoint`, but it swallows the exception it
    catches; the handlers here have to see it to build the error response.

    Holding `_no_commit` is not optional — see there for why.
    """
    frappe.db.savepoint(name)
    try:
        with _no_commit():
            yield
    except Exception:
        try:
            frappe.db.rollback(save_point=name)
        except Exception:
            # Cleanup must never replace what actually went wrong: the caller
            # needs the original error, not this one.
            frappe.log_error(frappe.get_traceback(),
                             f"new_hire: could not roll back to savepoint {name}")
        raise
    else:
        frappe.db.release_savepoint(name)


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
    except Exception:
        return _fail(_("New Hire support could not be set up."), "setup_new_hire_support failed")


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
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The form configuration could not be built."), "get_new_hire_form_config failed")


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
    except Exception:
        return _fail(_("The field catalogue could not be read."), "get_employee_field_catalog failed")


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
            return _err(_("No New Hire Form is configured. Create one and mark it default."), http=412)
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
            with _atomic("new_hire_seed_fields"):
                form_doc.save(ignore_permissions=True)
        return _ok(_("Added {0} field(s).").format(len(added)), {"form": form_doc.name, "added": added})
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception:
        return _fail(_("The form could not be seeded."), "seed_default_fields failed")


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

        with _atomic("new_hire_create"):
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
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The new hire could not be created."), "create_new_hire failed")


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
        with _atomic("new_hire_update"):
            doc.save()

        return _ok(_("New hire {0} updated.").format(doc.name), {
            "name": doc.name,
            "status": doc.status,
            "stage": doc.get(STAGE_FIELD),
            "form": form_doc.name,
            **applied,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The new hire could not be updated."), "update_new_hire failed")


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
    return row.get(STAGE_FIELD) in INITIABLE_STAGES


def _can_activate(row):
    """Pending and submitted. A blank stage is a Pending Employee raised outside
    intake (the desk, an import) — nothing to wait for, so it may be activated."""
    stage = row.get(STAGE_FIELD)
    return row.get("status") == PENDING_STATUS and (not stage or stage in ACTIVATABLE_STAGES)


@frappe.whitelist()
def get_new_hire(name=None, filters=None, stage=None, search=None,
                 start=0, page_length=20, order_by=None):
    """One pending Employee, or the paginated pending list.

    The list is always scoped to `status = "Pending"`, so it can never show the
    site's real staff. Pass `stage="Approved"` for the ones waiting to be
    onboarded. Every row carries `can_activate` (and the dormant
    `can_initiate_onboarding`), so the button's enabled state is a server
    decision.
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
            data["can_activate"] = _can_activate(data)
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
        # company_email rides along so the activation dialog opens prefilled.
        fields = list({c["fieldname"] for c in columns}
                      | {"name", STAGE_FIELD, "status", "company_email"})

        rows = frappe.get_list(
            DOCTYPE, filters=query_filters, fields=fields,
            start=frappe.utils.cint(start),
            page_length=frappe.utils.cint(page_length) or 20,
            order_by=_sanitize_order_by(order_by),
        )
        for row in rows:
            row["can_initiate_onboarding"] = _can_initiate(row)
            row["can_activate"] = _can_activate(row)

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
    except Exception:
        return _fail(_("The new hires could not be fetched."), "get_new_hire failed")


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
    except Exception:
        return _fail(_("The approval flow could not be fetched."), "get_new_hire_approval_flow failed")


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
# Handoff (step 2 — Assign & Initiate Onboarding) and activation
# ---------------------------------------------------------------------------
#
# The New Hire Form's `initiation_fields` table picks which Employee Onboarding
# fields HR fills before the onboarding is created; the rest of the onboarding is
# the candidate's, on the portal. An empty table means the standard set below.

PORTAL_FORM_FIELD = "custom_onboarding_portal_form"
INITIATION_TAB = "Initiate Onboarding"

_DEFAULT_INITIATION_FIELDS = (
    PORTAL_FORM_FIELD, "boarding_begins_on", "employee_onboarding_template",
    "custom_onboarding_spoc", "custom_manager", "custom_onboarding_buddy",
)

# Onboarding fields this module sets itself. Offering them to HR would let a
# step-2 value point the onboarding at a different person or applicant.
_INITIATION_SERVER_FIELDS = frozenset({
    "job_applicant", "job_offer", "employee", "employee_name", "company",
    "boarding_status", "project", "amended_from", "activities", "naming_series",
    "custom_direct_hire", "custom_candidate_portal_fields",
    "custom_field_approval_json",
})

# Same value on both doctypes under the same name: prefilled from the pending
# Employee so HR is not asked for what intake already captured.
_EMPLOYEE_PREFILL = ("date_of_joining", "department", "designation", "holiday_list")


def initiation_field_problem(fieldname):
    """Why `fieldname` cannot be a step-2 field, or None when it can."""
    df = frappe.get_meta(EMPLOYEE_ONBOARDING).get_field(fieldname)
    if not df:
        return _("Employee Onboarding has no field called {0}.").format(frappe.bold(fieldname))
    if fieldname in _INITIATION_SERVER_FIELDS or fieldname in _FRAPPE_MANAGED:
        return _("{0} is set by the system when onboarding is initiated.").format(frappe.bold(fieldname))
    if df.fieldtype in _LAYOUT_TYPES:
        return _("{0} is a layout element, not a field.").format(frappe.bold(fieldname))
    if df.fieldtype == "Table":
        # Table MultiSelect is fine — it renders as a multi-pick. A full grid is
        # onboarding data, which belongs to the candidate's portal form.
        return _("{0} is a table; only Table MultiSelect fields can be used here.").format(
            frappe.bold(fieldname))
    return None


def _initiation_rows(form_doc):
    """[(fieldname, row-or-None)] in display order. An empty table falls back to
    the standard set; the portal form is always present, because without it the
    candidate has no form to open."""
    meta = frappe.get_meta(EMPLOYEE_ONBOARDING)
    rows = [r for r in (form_doc.get("initiation_fields") or []) if (r.fieldname or "").strip()]
    if rows:
        rows = sorted(rows, key=lambda r: (_row_order(r), r.idx))
        picked = [(r.fieldname.strip(), r) for r in rows]
    else:
        picked = [(f, None) for f in _DEFAULT_INITIATION_FIELDS]

    picked = [(f, r) for f, r in picked if meta.has_field(f) and not initiation_field_problem(f)]
    if meta.has_field(PORTAL_FORM_FIELD) and PORTAL_FORM_FIELD not in {f for f, _row in picked}:
        picked.insert(0, (PORTAL_FORM_FIELD, None))
    return picked


def _multiselect_link(child_doctype):
    """(fieldname, linked doctype) of the Link a Table MultiSelect row holds."""
    for df in frappe.get_meta(child_doctype).fields:
        if df.fieldtype == "Link":
            return df.fieldname, df.options
    return None, None


def _multiselect_ids(value, child_doctype):
    """A Table MultiSelect value as a plain list of linked ids, whether it
    arrives as child rows, dicts, a list of ids or a comma-separated string."""
    if not value:
        return []
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    link_field = _multiselect_link(child_doctype)[0]
    ids = []
    for item in value:
        item = item.get(link_field) if hasattr(item, "get") else item
        if item:
            ids.append(item)
    return ids


def _default_portal_form(form_doc):
    return (form_doc.get("onboarding_portal_form")
            or frappe.db.get_value("Onboarding Portal Forms", {"default": 1}, "name"))


def _initiation_prefill(fieldname, doc, form_doc, onboarding):
    """What the step-2 field opens with: an existing onboarding's value, then the
    pending Employee's, then the built-in default for the handful that have one."""
    if onboarding is not None and onboarding.get(fieldname):
        return onboarding.get(fieldname)
    if fieldname in _EMPLOYEE_PREFILL and doc.get(fieldname):
        return doc.get(fieldname)
    if fieldname == PORTAL_FORM_FIELD:
        return _default_portal_form(form_doc)
    if fieldname == "boarding_begins_on":
        return frappe.utils.today()
    if fieldname == "employee_onboarding_template":
        from recruitment.api.candidate_portal import _default_onboarding_template
        return _default_onboarding_template()
    return None


def _build_initiation_config(form_doc, doc, onboarding=None):
    """Step-2 render config, in the same tabs -> sections -> fields shape as the
    intake form so one renderer draws both. Always a single tab."""
    meta = frappe.get_meta(EMPLOYEE_ONBOARDING)

    section_of, current = {}, ""
    for df in meta.fields:
        if df.fieldtype in ("Section Break", "Tab Break"):
            current = (df.label or "").strip() or current
        elif df.fieldname:
            section_of[df.fieldname] = current

    sections, order = {}, []
    for position, (fieldname, row) in enumerate(_initiation_rows(form_doc), start=1):
        df = meta.get_field(fieldname)
        is_portal_form = fieldname == PORTAL_FORM_FIELD
        entry = {
            "fieldname": fieldname,
            "label": (row.get("label_override") if row else "") or (df.label or fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": df.options or "",
            "is_mandatory": 1 if is_portal_form else _three_state(
                row.get("mandatory_override") if row else None, df.reqd, "Required", "Optional"),
            "read_only": 0 if is_portal_form else _three_state(
                row.get("read_only_override") if row else None, df.read_only, "Read Only", "Editable"),
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
            "default": "",
            "length": df.get("length") or 0,
            "description": df.get("description") or "",
            "order": position,
        }
        value = _initiation_prefill(fieldname, doc, form_doc, onboarding)
        if value in (None, "", []) and row and row.get("default_value"):
            value = row.default_value
        if df.fieldtype == "Table MultiSelect":
            # The renderer draws a multi-pick over the doctype the rows link to.
            entry["child_doctype"] = df.options
            entry["options"] = _multiselect_link(df.options)[1] or ""
            value = _multiselect_ids(value, df.options)
        entry["value"] = value

        section = (row.get("section_override") if row else "") or section_of.get(fieldname, "")
        if section not in sections:
            sections[section] = []
            order.append(section)
        sections[section].append(entry)

    return {
        "doctype": EMPLOYEE_ONBOARDING,
        "form": form_doc.name,
        "employee": doc.name,
        "employee_name": doc.employee_name,
        "email": doc.get("personal_email") or doc.get("company_email"),
        "send_portal_invite": 1 if form_doc.get("send_portal_invite") else 0,
        "tabs": [{"tab": INITIATION_TAB,
                  "sections": [{"section": s, "fields": sections[s]} for s in order]}],
    }


def _config_fields(config):
    """Every field of a built config, in display order."""
    for tab in config["tabs"]:
        for section in tab["sections"]:
            yield from section["fields"]


def _existing_ids(doctype, ids):
    """The subset of `ids` that exist as `doctype` records — one query, however
    long the list a client sends."""
    if not ids:
        return set()
    return set(frappe.get_all(doctype, filters={"name": ("in", list(ids))}, pluck="name"))


def _apply_initiation_payload(onboarding, payload, config):
    """Write the step-2 values HR may set onto the new onboarding.

    Mirrors `_apply_payload`: only fields the config shows and leaves editable are
    written, anything else is ignored, and a Link that no longer resolves is
    dropped rather than failing the whole initiation.
    """
    fields = {f["fieldname"]: f for f in _config_fields(config)}
    ignored, dropped = [], []

    for fieldname, value in (payload or {}).items():
        field = fields.get(fieldname)
        if not field or field["read_only"]:
            ignored.append(fieldname)
            continue
        df = onboarding.meta.get_field(fieldname)

        if df.fieldtype == "Table MultiSelect":
            link_field, linked = _multiselect_link(df.options)
            ids = list(dict.fromkeys(_multiselect_ids(value, df.options)))
            valid = _existing_ids(linked, ids) if linked else set(ids)
            if len(valid) < len(ids):
                dropped.append(fieldname)
            onboarding.set(fieldname, [{link_field: item} for item in ids if item in valid])
            continue

        if df.fieldtype == "Link" and value and not frappe.db.exists(df.options, value):
            dropped.append(fieldname)
            frappe.logger().info(
                "New Hire: dropping invalid onboarding link {0}={1!r} (no such {2})".format(
                    fieldname, str(value)[:80], df.options))
            continue
        onboarding.set(fieldname, value)

    return {"ignored_fields": ignored, "dropped_links": dropped}


def _apply_initiation_defaults(onboarding, config):
    """Fill every step-2 field still blank with what the screen would have
    opened with — the auto-initiate path has no screen, and HR may post a
    partial payload."""
    for field in _config_fields(config):
        if onboarding.get(field["fieldname"]) or field["value"] in (None, "", []):
            continue
        if field["fieldtype"] == "Table MultiSelect":
            link_field = _multiselect_link(field["child_doctype"])[0]
            for item in field["value"]:
                onboarding.append(field["fieldname"], {link_field: item})
        else:
            onboarding.set(field["fieldname"], field["value"])


def _validate_initiation_mandatory(onboarding, config):
    missing = [
        f["label"]
        for f in _config_fields(config)
        if f["is_mandatory"] and not f["read_only"]
        and onboarding.get(f["fieldname"]) in (None, "", [])
    ]
    if missing:
        frappe.throw(_("Required: {0}").format(", ".join(missing)),
                     title=_("Missing mandatory fields"))


# Step-2 configuration — the API over New Hire Form's `initiation_fields`,
# for a settings screen that is not the desk form.

_INITIATION_ROW_FIELDS = (
    "fieldname", "label_override", "mandatory_override", "read_only_override",
    "section_override", "order", "default_value",
)
_INITIATION_SETTINGS = ("send_portal_invite", "portal_invite_template", "onboarding_portal_form")


def _initiation_settings(form_doc):
    """What a settings screen shows for one form's step 2: the saved rows, the
    form-level switches, and what HR actually gets (`effective_fields` — the
    standard set when no rows are saved, the portal form always included)."""
    return {
        "form": form_doc.name,
        "uses_default_fields": not any(
            (r.fieldname or "").strip() for r in form_doc.get("initiation_fields") or []),
        "initiation_fields": [
            {k: r.get(k) for k in _INITIATION_ROW_FIELDS}
            for r in sorted(form_doc.get("initiation_fields") or [],
                            key=lambda r: (_row_order(r), r.idx))
        ],
        "effective_fields": [f for f, _row in _initiation_rows(form_doc)],
        **{k: form_doc.get(k) for k in _INITIATION_SETTINGS},
    }


@frappe.whitelist()
def get_onboarding_field_catalog(form=None, search=None):
    """Every Employee Onboarding field step 2 can use, grouped the way Employee
    Onboarding groups them, each marked `on_form` when the form already has it.

    Fields the server sets itself, layout elements and full tables are left
    out — the same rule `save_initiation_fields` enforces.
    """
    try:
        frappe.has_permission(FORM_DOCTYPE, "read", throw=True)
        form_doc = resolve_form(form=form)
        placed = set(f for f, _row in _initiation_rows(form_doc)) if form_doc else set()
        needle = (search or "").strip().lower()

        groups, index, total = [], {}, 0
        current_tab, current_section = "", ""
        for df in frappe.get_meta(EMPLOYEE_ONBOARDING).fields:
            if df.fieldtype == "Tab Break":
                current_tab, current_section = (df.label or "").strip(), ""
                continue
            if df.fieldtype == "Section Break":
                current_section = (df.label or "").strip()
                continue
            if not df.fieldname or initiation_field_problem(df.fieldname):
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
                "on_form": df.fieldname in placed,
                "locked": df.fieldname == PORTAL_FORM_FIELD,
            })
            total += 1

        return _ok(_("Onboarding field catalogue fetched."), {
            "doctype": EMPLOYEE_ONBOARDING,
            "form": form_doc.name if form_doc else None,
            "groups": groups,
            "total": total,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The onboarding field catalogue could not be read."),
                     "get_onboarding_field_catalog failed")


@frappe.whitelist()
def get_initiation_fields(form=None):
    """The saved step-2 configuration of one New Hire Form (the default when
    `form` is not given)."""
    try:
        frappe.has_permission(FORM_DOCTYPE, "read", throw=True)
        form_doc = resolve_form(form=form)
        if not form_doc:
            return _err(_("No New Hire Form is configured. Create one and mark it default."), http=412)
        return _ok(_("Initiation fields fetched."), _initiation_settings(form_doc))
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The initiation fields could not be read."), "get_initiation_fields failed")


@frappe.whitelist()
def save_initiation_fields(form=None, fields=None, settings=None):
    """Replace a New Hire Form's step-2 configuration.

    `fields` is the complete list, in display order — rows not in it are
    removed, and `order` is taken from list position when a row does not give
    one. Each entry is a fieldname or an object with any of: fieldname,
    label_override, mandatory_override (Default/Required/Optional),
    read_only_override (Default/Read Only/Editable), section_override,
    order, default_value. Pass `fields: []` to fall back to the standard set.
    Omit `fields` to change only `settings`.

    `settings` optionally sets send_portal_invite, portal_invite_template and
    onboarding_portal_form. Validation is the form's own, so a bad fieldname
    comes back as a 400 naming the row.
    """
    try:
        frappe.has_permission(FORM_DOCTYPE, "write", throw=True)
        form_doc = resolve_form(form=form)
        if not form_doc:
            return _err(_("No New Hire Form is configured. Create one and mark it default."), http=412)
        form_doc = frappe.get_doc(FORM_DOCTYPE, form_doc.name)
        form_doc.check_permission("write")

        if isinstance(fields, str):
            try:
                fields = json.loads(fields) if fields.strip() else None
            except (TypeError, ValueError):
                return _err(_("`fields` must be valid JSON."))
        if fields is not None and not isinstance(fields, list):
            return _err(_("`fields` must be a list."))

        settings = _coerce_payload(settings) if settings not in (None, "") else {}
        unknown = set(settings) - set(_INITIATION_SETTINGS)
        if unknown:
            return _err(_("Unknown setting(s): {0}").format(", ".join(sorted(unknown))))

        if fields is not None:
            form_doc.set("initiation_fields", [])
            for position, entry in enumerate(fields, start=1):
                row = {"fieldname": entry} if isinstance(entry, str) else entry
                if not isinstance(row, dict) or not (row.get("fieldname") or "").strip():
                    return _err(_("Entry {0} has no fieldname.").format(position))
                row = {k: row.get(k) for k in _INITIATION_ROW_FIELDS if row.get(k) is not None}
                row["fieldname"] = row["fieldname"].strip()
                row.setdefault("order", position)
                form_doc.append("initiation_fields", row)

        for key, value in settings.items():
            form_doc.set(key, value)

        with _atomic("new_hire_save_initiation"):
            form_doc.save()

        return _ok(_("Initiation fields saved."), _initiation_settings(form_doc))
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(frappe.utils.strip_html(str(exc)), http=400)
    except Exception:
        return _fail(_("The initiation fields could not be saved."), "save_initiation_fields failed")


def _existing_onboarding(name, for_update=False):
    return frappe.db.get_value(
        EMPLOYEE_ONBOARDING, {"employee": name, "docstatus": ("<", 2)},
        ["name", "job_applicant"], as_dict=True, for_update=for_update)


@frappe.whitelist()
def get_onboarding_initiation_config(name=None):
    """Render config for step 2 — the fields HR fills before onboarding starts.

    Every field carries its prefilled `value`. `can_initiate` says whether the
    Assign & Initiate button should be live; when onboarding already exists,
    `employee_onboarding` names it and the values are read back from it.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("read")

        form_doc = resolve_form(form=doc.get(FORM_FIELD))
        if not form_doc:
            return _err(_("The form this new hire was raised on no longer exists."), http=412)

        existing = _existing_onboarding(name)
        # Its values are only echoed back to someone who may read it; anyone
        # else still learns that it exists, and sees the prefill instead.
        onboarding = None
        if existing and frappe.has_permission(EMPLOYEE_ONBOARDING, "read", doc=existing.name):
            onboarding = frappe.get_doc(EMPLOYEE_ONBOARDING, existing.name)

        data = _build_initiation_config(form_doc, doc, onboarding)
        data.update({
            "stage": doc.get(STAGE_FIELD),
            "can_initiate": not existing and _can_initiate(doc),
            "employee_onboarding": existing.name if existing else None,
        })
        return _ok(_("Initiation configuration fetched."), data)
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("The initiation form could not be built."),
                     "get_onboarding_initiation_config failed")


def _create_job_applicant(doc, portal_form):
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
    if portal_form and applicant.meta.has_field(PORTAL_FORM_FIELD):
        applicant.set(PORTAL_FORM_FIELD, portal_form)

    applicant.insert(ignore_permissions=True)
    return applicant


def _cancelled_onboarding(name):
    """The newest cancelled onboarding of this Employee, or None."""
    return frappe.db.get_value(
        EMPLOYEE_ONBOARDING, {"employee": name, "docstatus": 2},
        ["name", "job_applicant"], as_dict=True, order_by="creation desc")


def _reuse_job_applicant(job_applicant, portal_form):
    """The Job Applicant a cancelled onboarding hung off, so initiating again
    does not give the candidate a second one — their portal login is tied to it
    (`Candidate Portal User.job_applicant`). None when it no longer exists."""
    if not frappe.db.exists(JOB_APPLICANT, job_applicant):
        return None
    applicant = frappe.get_doc(JOB_APPLICANT, job_applicant)
    if portal_form and applicant.meta.has_field(PORTAL_FORM_FIELD):
        applicant.set(PORTAL_FORM_FIELD, portal_form)
        applicant.save(ignore_permissions=True)
    return applicant


def _link_applicant_to_onboarding(applicant, onboarding):
    """The same back-links the recruitment path leaves, so screens that start
    from the applicant (pre-onboarding status, the portal) find this one too."""
    for fieldname, value in (
        ("custom_pre_onboarding_employee_onboarding", onboarding.name),
        ("custom_pre_onboarding_status", "Onboarding Created"),
        ("custom_pre_onboarding_released_at", frappe.utils.now_datetime()),
    ):
        if applicant.meta.has_field(fieldname):
            applicant.db_set(fieldname, value, update_modified=False)


def _portal_url(applicant, onboarding):
    """Where the invite points: the candidate frontend's onboarding page — the
    same redirect the Action Center item carries."""
    from recruitment.api.action_center import build_onboarding_redirect

    try:
        base = frappe.db.get_single_value("Campus Settings", "candidate_portal_url")
    except Exception:
        base = None
    base = (base or frappe.utils.get_url()).rstrip("/")
    return base + build_onboarding_redirect(applicant.name, onboarding.name)


_FALLBACK_INVITE_SUBJECT = "Complete your onboarding at {company}"
_FALLBACK_INVITE_MESSAGE = """<p>Hi {{ applicant_name }},</p>
<p>Welcome aboard! Your onboarding has been initiated. Please sign in to the
candidate portal with this email address and complete your onboarding form.</p>
<p><a href="{{ portal_url }}">{{ portal_url }}</a></p>
<p>If this is your first time, choose <b>Activate account</b> and verify the
one-time code we email you to set your password.</p>
<p>Regards,<br>{{ company }}</p>"""


def _send_portal_invite(applicant, onboarding, doc, form_doc):
    """Give the candidate a way in: provision their portal login and email them.

    Returns a warning for the response, or None. Never raises — the onboarding
    exists and the Action Center item is there whatever happens to one email,
    so a mail problem must not roll the initiation back.
    """
    email = (applicant.email_id or "").strip()
    if not email:
        return _("No email on the new hire, so no portal invite was sent.")
    try:
        from recruitment.api.candidate_auth import ensure_candidate_for_invite
        from recruitment.recruitment.communication_log import sendmail_with_log

        ensure_candidate_for_invite(
            email, full_name=doc.employee_name, mobile_no=doc.get("cell_number"),
            job_applicant=applicant.name, candidate_source="New Hire",
        )

        # Rendered into HTML, and the name is whatever intake typed — escape
        # it so a name cannot carry markup into the email.
        escape = frappe.utils.escape_html
        context = {
            "applicant_name": escape(doc.employee_name or ""),
            "employee": escape(doc.name),
            "employee_onboarding": escape(onboarding.name),
            "portal_url": escape(_portal_url(applicant, onboarding)),
            "company": escape(doc.company or ""),
        }
        template = form_doc.get("portal_invite_template")
        if template and frappe.db.exists("Email Template", template):
            from frappe.email.doctype.email_template.email_template import get_email_template
            rendered = get_email_template(template, context)
            subject, message = rendered.get("subject"), rendered.get("message")
        else:
            subject = _FALLBACK_INVITE_SUBJECT.format(company=doc.company or "")
            message = frappe.render_template(_FALLBACK_INVITE_MESSAGE, context)

        sendmail_with_log(
            recipients=[email], subject=subject, message=message,
            reference_doctype=EMPLOYEE_ONBOARDING, reference_name=onboarding.name,
        )
        return None
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"new_hire: portal invite failed for {doc.name}")
        return _("Onboarding was initiated, but the portal invite could not be sent. "
                 "The candidate can still sign in with {0}.").format(email)


@frappe.whitelist()
def initiate_onboarding(name=None, payload=None):
    """Step 2: hand a pending Employee to onboarding with HR's step-2 values.

    Creates the Job Applicant, then the Employee Onboarding linked to BOTH the
    applicant and the pending Employee — so onboarding fills in the same record
    that will later be activated, and `make_employee` is never needed. The
    candidate gets an Action Center item pointing at the onboarding and, when
    the form asks for it, a portal login and an invite email.

    `payload` holds the step-2 fields (see `get_onboarding_initiation_config`).
    Blank fields take their prefilled value, so calling with no payload — the
    auto-initiate path — still produces a complete onboarding.

    Idempotent: an onboarding already linked to this Employee is returned as is.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        if not frappe.db.exists(DOCTYPE, name):
            return _err(_("Employee not found: {0}").format(name), http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")
        # The records below are inserted with ignore_permissions, so check the
        # caller may create an onboarding at all rather than lend them ours.
        # Not on the auto-initiate path: that is the system acting on an
        # approval, and the approver need not hold onboarding rights.
        if not frappe.flags.get("new_hire_internal_call"):
            frappe.has_permission(EMPLOYEE_ONBOARDING, "create", throw=True)

        # A double click sends two of these. Lock the Employee row so the second
        # waits for the first to commit, then look for the onboarding with a
        # locking read — a plain read would use this transaction's snapshot,
        # taken before the wait, and miss it.
        frappe.db.get_value(DOCTYPE, name, "name", for_update=True)
        existing = _existing_onboarding(name, for_update=True)
        if existing:
            return _ok(_("Onboarding for {0} was already initiated.").format(name), {
                "name": name,
                "status": doc.status,
                "stage": doc.get(STAGE_FIELD),
                "job_applicant": existing.job_applicant,
                "employee_onboarding": existing.name,
                "already_initiated": True,
            })

        # Onboarding that was initiated and then cancelled may be initiated again
        # (Retrigger Onboarding); the stage still reads "Onboarding Initiated".
        cancelled = (
            _cancelled_onboarding(name)
            if doc.get(STAGE_FIELD) == "Onboarding Initiated" else None
        )
        if not _can_initiate(doc) and not cancelled:
            return _err(
                _("{0} is {1}. Onboarding can only be initiated once the new hire is submitted.").format(
                    name, doc.get(STAGE_FIELD) or doc.status),
                http=409)

        form_doc = resolve_form(form=doc.get(FORM_FIELD))
        if not form_doc:
            return _err(_("The form this new hire was raised on no longer exists."), http=412)

        payload = _coerce_payload(payload) if payload not in (None, "") else {}
        config = _build_initiation_config(form_doc, doc)

        # Built and checked before anything is written: nothing below needs the
        # database until the applicant insert.
        onboarding = frappe.new_doc(EMPLOYEE_ONBOARDING)
        applied = _apply_initiation_payload(onboarding, payload, config)
        _apply_initiation_defaults(onboarding, config)
        _validate_initiation_mandatory(onboarding, config)

        portal_form = onboarding.get(PORTAL_FORM_FIELD)
        if not portal_form:
            return _err(_("No Onboarding Portal Form is set on {0} and none is marked default.").format(
                form_doc.name), http=412)

        with _atomic("new_hire_handoff"):
            applicant = (
                _reuse_job_applicant(cancelled.job_applicant, portal_form)
                if cancelled and cancelled.job_applicant
                else None
            ) or _create_job_applicant(doc, portal_form)

            onboarding.job_applicant = applicant.name
            onboarding.employee = doc.name
            onboarding.employee_name = doc.employee_name
            onboarding.company = doc.company
            if not onboarding.get("date_of_joining"):
                onboarding.date_of_joining = doc.date_of_joining
            if not onboarding.get("boarding_begins_on"):
                onboarding.boarding_begins_on = frappe.utils.today()
            for fieldname in ("department", "designation"):
                if (onboarding.meta.has_field(fieldname) and doc.get(fieldname)
                        and not onboarding.get(fieldname)):
                    onboarding.set(fieldname, doc.get(fieldname))
            if onboarding.meta.has_field(DIRECT_HIRE_FLAG):
                onboarding.set(DIRECT_HIRE_FLAG, 1)

            # The two things a hand-built onboarding would otherwise be missing.
            # `materialize_onboarding_from_applicant` is not reusable here — it is
            # written around an applicant-first flow and re-derives the Employee — but
            # these are the parts that matter, and skipping them is not survivable:
            # an onboarding with no template carries NO activities, so the candidate
            # and HR get a task list that is silently empty. Both only fill what is
            # still blank, so HR's step-2 values win.
            from recruitment.api.candidate_portal import (
                _apply_default_onboarding_template, _apply_onboarding_automation_fields,
            )
            _apply_onboarding_automation_fields(onboarding, applicant, None)
            _apply_default_onboarding_template(onboarding)

            onboarding.insert(ignore_permissions=True)
            _link_applicant_to_onboarding(applicant, onboarding)

            # The candidate's entry point on the portal. Nothing raises it on
            # insert — no doc event is registered for it — so do it here, as
            # the Job Offer path does on acceptance.
            from recruitment.api.action_center import sync_onboarding_action_item
            sync_onboarding_action_item(onboarding)

            doc.db_set(STAGE_FIELD, "Onboarding Initiated", update_modified=False)

        invite_warning = None
        if form_doc.get("send_portal_invite"):
            invite_warning = _send_portal_invite(applicant, onboarding, doc, form_doc)

        response = _ok(_("Onboarding {0} initiated.").format(onboarding.name), {
            "name": doc.name,
            "status": doc.status,
            "stage": "Onboarding Initiated",
            "job_applicant": applicant.name,
            "employee_onboarding": onboarding.name,
            "already_initiated": False,
            "portal_invite_sent": bool(form_doc.get("send_portal_invite") and not invite_warning),
            **applied,
        }, http=201)
        if invite_warning:
            response["warnings"].append(invite_warning)
        return response
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception:
        return _fail(_("Onboarding could not be initiated."), "initiate_onboarding failed")


def _company_email_problem(email, name):
    """Why `email` cannot be this new hire's company email, or None."""
    # `validate_email_address` splits on commas and returns only the valid parts,
    # so "a@x.com, junk" would pass as "a@x.com" — insist on exactly one address.
    if "," in email or frappe.utils.validate_email_address(email) != email:
        return _("{0} is not a valid email address.").format(email), 400
    # Another current employee on the same address would share its login. Only
    # people who have left (or a withdrawn intake, which is Inactive) free it up.
    clash = frappe.db.get_value(
        DOCTYPE,
        {"company_email": email, "name": ("!=", name),
         "status": ("not in", ("Left", "Inactive"))},
        "name")
    if clash:
        return _("{0} is already the company email of {1}.").format(email, clash), 409
    return None


def _real_employee_code(doc):
    """The code Employee would have given `doc` had it not been named `PEND-`.

    Runs Frappe's own naming pipeline on a throwaway copy, so a Document Naming
    Rule (which on this site turns "PW-" into PW30037), the controller's
    autoname and the naming series are applied in the same order as for any
    other insert — rebuilding the name from `naming_series` alone skips the rule
    and issues codes in a different format from every other employee. Consumes
    the next number, so call it inside the activation transaction.
    """
    probe = frappe.get_doc(doc.as_dict())
    set_new_name(probe)
    return probe.name


@frappe.whitelist()
def activate_employee(name=None, company_email=None):
    """Turn a pending Employee into a real one.

    HR supplies the company email here — it is not asked at intake. Without one
    (passed now, or already on the record) the employee is not activated.

    Two steps, in this order:

      1. rename out of `PEND-` into the site's real series — named exactly as
         a fresh Employee would be (see :func:`_real_employee_code`), so the
         code matches every other employee. Frappe's rename updates every
         inbound link, and Employee's `after_rename` re-stamps its own
         `employee` field. A record raised while intake used the real series
         has nothing to rename.
      2. `status = "Active"` with the company email, saved through the document —
         that transition releases the hierarchy role grants in `cn_hrms_core`
         and lets payroll and attendance see the person.

    Renaming first means the role grants and every downstream hook fire against
    the final name, so nothing is left pointing at a `PEND-` id.
    """
    try:
        if not name:
            return _err(_("Employee is required."))
        # A double click sends two of these. Lock the row so the second waits for
        # the first to commit; the locking read also sees that commit (a plain
        # read would use this transaction's older snapshot), and after a rename
        # the PEND- row is simply gone.
        if not frappe.db.get_value(DOCTYPE, name, "name", for_update=True):
            return _err(_("Employee not found: {0}. It may have just been activated.").format(name),
                        http=404)

        doc = frappe.get_doc(DOCTYPE, name)
        doc.check_permission("write")

        if doc.status == ACTIVE_STATUS:
            return _ok(_("Employee {0} is already active.").format(doc.name), {
                "name": doc.name,
                "previous_name": None,
                "status": doc.status,
                "stage": doc.get(STAGE_FIELD),
                "company_email": doc.get("company_email"),
                "renamed": False,
            })
        if doc.status != PENDING_STATUS:
            return _err(
                _("{0} is {1}, not Pending, so it cannot be activated.").format(name, doc.status),
                http=409)
        if not _can_activate(doc):
            return _err(
                _("{0} is {1}. Only a submitted new hire can be activated.").format(
                    name, doc.get(STAGE_FIELD)),
                http=409)

        company_email = (company_email or doc.get("company_email") or "").strip()
        if not company_email:
            return _err(_("Company email is required to activate {0}.").format(name))
        problem = _company_email_problem(company_email, name)
        if problem:
            return _err(problem[0], http=problem[1])

        final = doc.name
        renamed = False

        # Rename and activation are one unit: a rename that lands and an
        # activation that then fails would leave a renamed record still Pending.
        with _atomic("new_hire_activate"):
            if doc.name.startswith(PENDING_PREFIX):
                final = rename_doc(DOCTYPE, doc.name, _real_employee_code(doc),
                                   force=True, ignore_permissions=True, show_alert=False)
                renamed = True

            # Saved through the document, not `db.set_value`: the hierarchy role
            # grants in `cn_hrms_core` hang off `Employee.on_update`, and set_value
            # writes straight to SQL without firing a single document event — so
            # activating that way granted the new employee nothing.
            active = frappe.get_doc(DOCTYPE, final)
            active.company_email = company_email
            active.status = ACTIVE_STATUS
            active.set(STAGE_FIELD, "Completed")
            active.save(ignore_permissions=True)

        return _ok(_("Employee {0} is now active.").format(final), {
            "name": final,
            "previous_name": name if renamed else None,
            "status": ACTIVE_STATUS,
            "stage": "Completed",
            "company_email": company_email,
            "renamed": renamed,
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.NameError as exc:
        return _err(_name_error_message(exc), http=400)
    except frappe.ValidationError as exc:
        return _err(frappe.utils.strip_html(str(exc)), http=400)
    except Exception:
        return _fail(_("The employee could not be activated."), "activate_employee failed")


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
            return _err(
                _("{0} is {1}, not Pending, so it cannot be cancelled.").format(name, doc.status),
                http=409)

        # Through the document for the same reason as activation: Inactive is what
        # `cn_hrms_core`'s `disable_user_on_employee_inactive` hangs off, and a
        # set_value would leave a withdrawn hire's login enabled.
        with _atomic("new_hire_cancel"):
            doc.set(STAGE_FIELD, "Cancelled")
            doc.status = "Inactive"
            doc.save(ignore_permissions=True)
            if reason:
                doc.add_comment("Comment", _("Cancelled: {0}").format(reason))

        return _ok(_("New hire {0} cancelled.").format(name), {
            "name": name,
            "status": doc.status,
            "stage": "Cancelled",
        })
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception:
        return _fail(_("The new hire could not be cancelled."), "cancel_new_hire failed")


# ---------------------------------------------------------------------------
# Hook handlers
# ---------------------------------------------------------------------------


def _never_active(doc):
    """Whether this Employee has only ever been Pending — a new hire not yet
    activated (or one withdrawn before activation). Read off the saved copy, so
    an activation in progress (Pending -> Active) does NOT count."""
    before = doc.get_doc_before_save()
    if before is None:
        return doc.status == PENDING_STATUS
    return before.status == PENDING_STATUS and doc.status in (PENDING_STATUS, "Inactive")


def defer_activation_fields(doc, method=None):
    """`Employee.before_validate`: let a not-yet-activated new hire save without
    the fields HR only supplies at activation (the company email).

    Frappe can only switch its mandatory check off wholesale, so switch it off
    here and let :func:`check_deferred_mandatory` redo it minus those fields —
    every other required field is still enforced. This covers every save path a
    pending hire goes through (intake, the approval matrix, cancel, the desk),
    not just this module's endpoints.
    """
    # The flags live on the document object, so clear what a previous save of
    # this same object left behind before deciding again. Left set, a record
    # saved again after activation would skip the mandatory check entirely.
    if doc.flags.pop("new_hire_deferred_mandatory", None):
        doc.flags.ignore_mandatory = False
    if doc.flags.ignore_mandatory or doc.flags.ignore_validate:
        return
    if not _never_active(doc):
        return
    if all(doc.get(f) for f in ACTIVATION_FIELDS):
        return
    doc.flags.ignore_mandatory = True
    doc.flags.new_hire_deferred_mandatory = True


def check_deferred_mandatory(doc, method=None):
    """`Employee.before_save`: the mandatory check `defer_activation_fields`
    switched off, minus the activation fields. Runs after every validate hook,
    so a field a hook fills in (naming_series, say) is not reported missing."""
    if not doc.flags.get("new_hire_deferred_mandatory"):
        return
    missing = [m for m in doc._get_missing_mandatory_fields() if m[0] not in ACTIVATION_FIELDS]
    for child in doc.get_all_children():
        missing.extend(child._get_missing_mandatory_fields())
    if not missing:
        return
    for _fieldname, message in missing:
        frappe.msgprint(message)
    raise frappe.MandatoryError(
        "[{0}, {1}]: {2}".format(doc.doctype, doc.name, ", ".join(m[0] for m in missing)))


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
        with _internal_call():
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
    except Exception:
        return _fail(_("Direct-hire support could not be set up."), "setup_direct_hire_support failed")
