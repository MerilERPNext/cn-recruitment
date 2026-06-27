"""
Job Requisition API
===================

create_job_requisition(payload)
    Submit endpoint for the React "Raise a Requisition" form.
    Accepts a FLAT payload using DocType field names directly.
    Positions arrive in `custom_position_details` and are grouped by
    `location` on the backend: one fresh Job Requisition per unique location
    in the submission, each carrying only that location's positions.

get_job_requisition(name=..., filters=..., limit=..., start=..., order_by=...)
    - With `name`        →  one Job Requisition (flat shape)
    - Without `name`     →  paginated list, each item in the same shape

update_job_requisition(name, payload)
    Update an existing Job Requisition by name. Full child-table replace.

preview_job_description(designation, department)
    Look up the best-matching Job Description for the given pair and
    return a flat payload the frontend can render directly as a JD
    preview card (description HTML + skills + title).

Response envelope (project convention):
    {"success": bool, "message": str, "data": <payload> | None}
HTTP status code is set on frappe.local.response.

Required payload keys:
    requested_by, company, department, designation, custom_position_details
Each row in custom_position_details requires:
    location, reporting_manager
"""

import json

import frappe
from frappe import _

JOB_REQUISITION = "Job Requisition"

REQUIRED_PARENT_KEYS = ("requested_by", "company", "department", "designation")

# Writable parent fields — UI may send any subset; unknown keys are ignored.
# NOTE: "status" and "workflow_state" are intentionally excluded — Frappe /
#       the workflow engine owns those fields. Sending them from the client
#       triggers "'NoneType' object has no attribute 'options'" when the
#       DocType meta can't resolve the Select options for a field that is
#       workflow-controlled or does not exist on the form.
PARENT_WRITABLE_FIELDS = (
    # Basic
    "requested_by",
    "requested_by_name",
    "requested_by_dept",
    "requested_by_designation",
    "company",
    "department",
    "designation",
    "custom_division",
    "custom_functional_area",
    "no_of_positions",
    "expected_compensation",
    # Job details
    "custom_experience_range_from",
    "custom_experience_range_to",
    "custom_experience_unit",
    "custom_salary_range_currency",
    "custom_salary_range_min",
    "custom_salary_range_max",
    "custom_salary_timeframe",
    "posting_date",
    "expected_by",
    "completed_on",
    "custom_hiring_lead",
    "custom_additional_roles__responsibilities",
    # Requirement tab
    "custom_employment_type_link",
    "custom_location",
    "custom_work_experience",
    "custom_work_experience_range",
    "custom_preferred_notice_period",
    "custom_preferred_company",
    "custom_other_preferred_companies",
    # Salary
    "custom_salary",
    # Job description
    "custom_job_description_template",
    "description",
    "reason_for_requesting",
    # Other details
    "custom_comments__instructions",
    "custom_cost_centre",
    "custom_designation_change",
    # Recruiter assignment
    "custom_assign_to_recruiter",
    "custom_additional_skills",
)

# Read-only / computed parent fields — surfaced in GET, never accepted on write.
PARENT_READONLY_FIELDS = (
    "custom_requested_by_user_id",
    "custom_salary_range_display",
    "time_to_fill",
)

# Fields that Frappe / workflow engine controls — never written by this API.
# Keeping this explicit set makes the exclusion auditable.
FRAPPE_MANAGED_FIELDS = {"status", "workflow_state"}

# Child-table fieldtypes. These are NEVER written through the generic parent
# path (_apply_parent_fields) — each child table has its own dedicated handler
# (_apply_qualifications / _apply_skills / _apply_pre_screened, and the position
# rows appended in _build_requisition_doc). A Form Settings override may legitimately
# *expose* a table field for rendering, but exposing it must not make it writable as
# a scalar parent field — otherwise the table gets populated here AND again by its
# dedicated handler, duplicating every row.
CHILD_TABLE_FIELDTYPES = frozenset({"Table", "Table MultiSelect"})


# Link-field title resolution.
# ----------------------------
# These linked DocTypes don't have `title_field` configured, so HR supplied the
# field that holds each one's human-readable title. Keyed by TARGET doctype, so
# every Link field that points at one of these — on the parent JR *and* on its
# child tables — gets a title automatically. For each such Link field `X`, GET
# adds a sibling key `X_title` right after the id; the original `X` (the id) is
# left untouched.
LINK_TITLE_BY_DOCTYPE = {
    "Designation": "custom_designation_title",
    "Division": "division_name",
    "Company": "company_name",
    "Department": "department_name",
    "Functional Area": "functional_area_name",
    "Employee": "employee_name",
    "Job Description": "job_description_title",
    "Employment Type": "employee_type_name",
    "Branch": "branch",
}


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400, data=None):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": data}


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------


def _coerce_payload(payload):
    if payload is None:
        frappe.throw(_("Request body is required."))
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            frappe.throw(_("Invalid JSON in request body: {0}").format(str(exc)))
    if not isinstance(payload, dict):
        frappe.throw(_("Payload must be an object."))
    return payload


def _list_field(payload, key):
    value = payload.get(key) or []
    if not isinstance(value, list):
        frappe.throw(_("`{0}` must be a list.").format(key))
    return value


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate(payload):
    missing = [k for k in REQUIRED_PARENT_KEYS if not payload.get(k)]
    if missing:
        frappe.throw(_("Missing required fields: {0}").format(", ".join(missing)))

    # Enforce any parent fields the default form config marks Required.
    _enforce_config_mandatory(frappe.new_doc(JOB_REQUISITION), payload)

    positions = _list_field(payload, "custom_position_details")
    if not positions:
        frappe.throw(_("At least one position is required in `custom_position_details`."))

    parent_vacancy = payload.get("custom_type_of_position")

    for idx, p in enumerate(positions, start=1):
        if not isinstance(p, dict):
            frappe.throw(_("custom_position_details[{0}] must be an object.").format(idx))
        if not p.get("location"):
            frappe.throw(_("custom_position_details[{0}].location is required (grouping key).").format(idx))
        if not p.get("reporting_manager"):
            frappe.throw(_("custom_position_details[{0}].reporting_manager is required.").format(idx))
        vacancy = (p.get("vacancy_type") or parent_vacancy or "New").strip()
        if vacancy not in ("New", "Replacement"):
            frappe.throw(_("custom_position_details[{0}].vacancy_type must be 'New' or 'Replacement'.").format(idx))
        if vacancy == "Replacement" and not p.get("replacement_for"):
            frappe.throw(
                _("custom_position_details[{0}].replacement_for is required for Replacement positions.").format(idx)
            )


# ---------------------------------------------------------------------------
# Grouping + upsert lookup
# ---------------------------------------------------------------------------


def _group_positions_by_location(positions):
    """Stable group preserving first-seen location order."""
    groups, order = {}, []
    for p in positions:
        loc = p["location"]
        if loc not in groups:
            groups[loc] = []
            order.append(loc)
        groups[loc].append(p)
    return [(loc, groups[loc]) for loc in order]


def _bypass_hrms_duplicate_check(doc):
    """HRMS rejects more than one open JR per (designation, department,
    requested_by). Our flow uses `location` too, so shadow that method."""
    doc.validate_duplicates = lambda: None


# ---------------------------------------------------------------------------
# Payload → doc mapping
# ---------------------------------------------------------------------------


def _deserialise_cost_center_allocations(value):
    """Payload value (list of {cost_center, percentage}) → JSON string for DB.

    Accepts the canonical list-of-dicts shape. Tolerant of:
      - missing / None / "" / non-list           → stored as ""
      - either spelling (`cost_center` / `cost_centre`)
      - already-encoded JSON string              → trusted as-is
      - non-numeric `percentage`                 → entry dropped

    The field is plain Long Text on the child doctype, so we serialise
    to a JSON string. No native autocomplete on the link is needed —
    UI dev fetches Cost Center options via the standard Resource API.

    `cost_center` is preserved as-sent (int OR str) — Frappe's Cost Center
    names are usually strings, but the UI's Cost Center master may use
    integer IDs; either round-trips correctly through JSON.
    """
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value  # caller has already encoded — trust it
    if not isinstance(value, list):
        return ""

    cleaned = []
    for row in value:
        if not isinstance(row, dict):
            continue
        cc = row.get("cost_center") if row.get("cost_center") is not None else row.get("cost_centre")
        pct = row.get("percentage")
        if cc is None or pct is None:
            continue
        try:
            pct = float(pct)
        except (TypeError, ValueError):
            continue
        cleaned.append({"cost_center": cc, "percentage": pct})
    return json.dumps(cleaned) if cleaned else ""


def _serialise_cost_center_allocations(value):
    """Stored JSON string → clean list of {cost_center, percentage}.
    Returns [] for any malformed / empty value — never raises."""
    if not value:
        return []
    if isinstance(value, list):
        return value  # already structured (defensive)
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _row_vacancy_type(row):
    """Single source of truth for a position's New / Replacement type.

    A position is a *Replacement* exactly when it names someone to replace
    (`replacement_for` is set); otherwise it is *New*. `replacement_for` is the
    reliable signal — validation requires it for Replacement, and the UI doesn't
    always send `vacancy_type`, which used to leave replacement rows mislabelled
    as "New". Deriving the type from `replacement_for` keeps the flag in
    lock-step with the data on both write and read. `row` may be a payload dict
    or a Frappe child row (both support `.get`).
    """
    return "Replacement" if row.get("replacement_for") else "New"


def _position_row(p, position_no, parent_vacancy_default, parent_functional_area,
                  parent_employee_type=None):
    """Build a single child row dict for `custom_position_details`.

    `vacancy_type` is derived from `replacement_for` (see _row_vacancy_type), so
    a position that names a replacement is always stored as "Replacement" even
    when the UI omits `vacancy_type`. `parent_vacancy_default` is retained for
    signature compatibility but no longer needed for typing.
    """
    return {
        "position_no": position_no,
        "vacancy_type": _row_vacancy_type(p),
        "replacement_for": p.get("replacement_for"),
        "reporting_manager": p.get("reporting_manager"),
        "location": p.get("location"),
        "functional_area": p.get("functional_area") or parent_functional_area,
        # `employee_type` is mandatory on the child row. The UI collects the
        # employment type once at parent level, so inherit it per-position.
        "employee_type": p.get("employee_type") or parent_employee_type,
        # `cost_center_allocations` is a JSON-encoded list of
        # {cost_center, percentage} entries on the Position Details row —
        # a single position can be allocated across multiple cost centers
        # (e.g. 50/30/20). Serialised here so the DB stores a plain Long
        # Text payload.
        "cost_center_allocations": _deserialise_cost_center_allocations(
            p.get("cost_center_allocations")
        ),
    }


def _drop_invalid_link_values(doc, payload):
    """Remove payload values for Link parent fields that don't point to an
    existing record, so a stray value never fails the whole save with a
    LinkValidationError.

    This guards two common frontend mistakes:
      - `custom_job_description_template` (Link → Job Description) receiving the
        rendered JD *HTML* instead of a JD name.
      - `custom_preferred_company` (Link → Preferred Target Company) receiving a
        free-text company name that isn't in that master yet.
    The offending field is simply not written (and logged); everything else on
    the requisition still saves.
    """
    meta = doc.meta
    for field in _get_writable_parent_fields(doc):
        value = payload.get(field)
        if value in (None, ""):
            continue
        df = meta.get_field(field)
        if df and df.fieldtype == "Link" and df.options and not frappe.db.exists(df.options, value):
            frappe.logger().info(
                "create/update Job Requisition: dropping invalid link {0}={1!r} (no such {2})".format(
                    field, str(value)[:80], df.options
                )
            )
            payload.pop(field, None)


def _get_writable_parent_fields(doc):
    """Effective parent write allowlist = the curated PARENT_WRITABLE_FIELDS
    baseline, adjusted by the settings doc's config overrides:

      - `expose = Hide` or `read_only_override = Read Only`  → drop the field.
      - `expose = Show` (and not read-only)                  → add the field,
        provided it is a real, non-managed, non-readonly data field on the meta.

    The curated tuple stays the safe default — config can only *narrow* it or
    *deliberately* widen it to a vetted field. Falls back to the plain tuple
    when no form is configured or meta lookups fail (zero-risk migration)."""
    overrides = _load_form_overrides()
    if not overrides:
        return list(PARENT_WRITABLE_FIELDS)

    writable = list(PARENT_WRITABLE_FIELDS)
    writable_set = set(writable)

    # Narrow: hide / force-read-only removes from the allowlist.
    for (applies_to, fieldname), row in overrides.items():
        if applies_to != "Parent" or fieldname not in writable_set:
            continue
        if (row.get("expose") == "Hide") or (row.get("read_only_override") == "Read Only"):
            writable.remove(fieldname)
            writable_set.discard(fieldname)

    # Widen: an explicitly-shown, editable, real data field becomes writable.
    meta = doc.meta
    for (applies_to, fieldname), row in overrides.items():
        if applies_to != "Parent" or fieldname in writable_set:
            continue
        if row.get("expose") != "Show" or row.get("read_only_override") == "Read Only":
            continue
        if fieldname in FRAPPE_MANAGED_FIELDS or fieldname in PARENT_READONLY_FIELDS:
            continue
        df = meta.get_field(fieldname)
        if (
            df
            and df.fieldtype not in _LAYOUT_TYPES
            and df.fieldtype not in CHILD_TABLE_FIELDTYPES
            and not df.get("read_only")
        ):
            writable.append(fieldname)
            writable_set.add(fieldname)

    return writable


def _enforce_config_mandatory(doc, payload):
    """Server-side check of fields the settings doc marks `mandatory_override =
    Required` (parent group). Meta-mandatory fields are NOT enforced here —
    several are auto-filled on save (e.g. `description`) — so only the config's
    explicit Required set is checked, keeping the rule predictable and in one
    place that the frontend reads too."""
    overrides = _load_form_overrides()
    if not overrides:
        return
    missing = []
    for (applies_to, fieldname), row in overrides.items():
        if applies_to != "Parent" or row.get("mandatory_override") != "Required":
            continue
        if payload.get(fieldname) in (None, "", []):
            df = doc.meta.get_field(fieldname)
            missing.append(df.label if df and df.label else fieldname)
    if missing:
        frappe.throw(_("Missing required fields: {0}").format(", ".join(missing)))


def _apply_parent_fields(doc, payload):
    """Copy parent-level fields from payload onto the doc.

    - Skips None and "" so optional empty inputs don't blank existing values
      on upsert.
    - Skips workflow-managed fields (status, workflow_state) entirely —
      sending those is what causes the
      "'NoneType' object has no attribute 'options'" error in Frappe when the
      field meta cannot be resolved for a Select that the workflow engine owns.
    - Drops Link-field values that don't resolve to a real record (see
      _drop_invalid_link_values) so a stray value doesn't fail the whole save.
    - Wraps each set() in a try/except so a bad value produces a clear error
      message ('field X = value Y') instead of a cryptic NoneType traceback.
    """
    # Map the legacy `custom_work_experience` alias onto the real field so a
    # value sent under either name persists to `custom_work_experience_range`.
    if payload.get("custom_work_experience") and not payload.get("custom_work_experience_range"):
        payload["custom_work_experience_range"] = payload["custom_work_experience"]

    _drop_invalid_link_values(doc, payload)

    for field in _get_writable_parent_fields(doc):
        if field in FRAPPE_MANAGED_FIELDS:
            continue  # safety guard — should never be in PARENT_WRITABLE_FIELDS
        # Child tables are populated by their dedicated _apply_* handlers (and the
        # position-append loop). Never set them here, or each row would be added
        # twice. A table field can still be config-exposed for rendering.
        df = doc.meta.get_field(field)
        if df and df.fieldtype in CHILD_TABLE_FIELDTYPES:
            continue
        value = payload.get(field)
        if value in (None, ""):
            continue
        try:
            doc.set(field, value)
        except Exception as exc:
            frappe.throw(
                _("Invalid value for field '{0}' = {1}: {2}").format(
                    field, repr(value), str(exc)
                )
            )


def _has_table_field(doc, fieldname):
    """True only when `fieldname` is a real Table field on the doc's doctype.

    `custom_qualifications`, `custom_skills` and `custom_pre_screened_candidates`
    exist on Job Opening but were never added to Job Requisition. Appending to a
    missing table field blows up inside Frappe with
    "'NoneType' object has no attribute 'options'", so callers skip the field
    entirely when it is absent. (If the table field is later added to the
    doctype, persistence resumes automatically — no code change needed.)
    """
    df = doc.meta.get_field(fieldname)
    return bool(df) and df.fieldtype in ("Table", "Table MultiSelect")


def _apply_qualifications(doc, payload):
    if not _has_table_field(doc, "custom_qualifications"):
        return
    doc.set("custom_qualifications", [])
    for q in _list_field(payload, "custom_qualifications"):
        if not isinstance(q, dict) or not q.get("qualification"):
            continue
        doc.append(
            "custom_qualifications",
            {"qualification": q["qualification"], "mandatory": q.get("mandatory") or "Required"},
        )


def _apply_skills(doc, payload):
    if not _has_table_field(doc, "custom_skills"):
        return
    doc.set("custom_skills", [])
    for skill in _list_field(payload, "custom_skills"):
        if not skill:
            continue
        # Accept either a plain string or {"skill": "..."}
        skill_name = skill["skill"] if isinstance(skill, dict) else skill
        if skill_name:
            doc.append("custom_skills", {"skill": skill_name})


def _sanitize_cv(value):
    """Normalize the candidate `cv` payload to a file URL or empty string.

    Frontend clients have historically sent the `cv` field in three shapes:
      1. A plain URL string  e.g. "/private/files/dummy.pdf"   (current UI)
      2. The form.io file-widget array shape
           [{"url": "...", "storage": "customfiles", ...}]
      3. The bucket name only  e.g. "customfiles"
         (this happened when an older `buildPayload` fell back to
          `candidate.cv?.[0]?.storage` because the upload had no URL)

    We only persist (1). Anything else is coerced to "" so the
    `Attach` field never gets garbage like "customfiles" written to it.
    """
    if not value:
        return ""

    if isinstance(value, list):
        first = value[0] if value and isinstance(value[0], dict) else {}
        value = first.get("url") or first.get("file_url") or ""

    if isinstance(value, dict):
        value = value.get("url") or value.get("file_url") or ""

    if not isinstance(value, str):
        return ""

    value = value.strip()
    if value.startswith(("/files/", "/private/files/", "http://", "https://")):
        return value
    return ""


def _apply_pre_screened(doc, payload):
    if not _has_table_field(doc, "custom_pre_screened_candidates"):
        return
    doc.set("custom_pre_screened_candidates", [])
    for cand in _list_field(payload, "custom_pre_screened_candidates"):
        if not isinstance(cand, dict):
            continue
        name = cand.get("candidate_name") or cand.get("name")
        if not name:
            continue
        doc.append(
            "custom_pre_screened_candidates",
            {
                "candidate_name": name,
                "email": cand.get("email"),
                "phone": cand.get("phone"),
                "cv": _sanitize_cv(cand.get("cv")),
                "offer_directly": 1 if cand.get("offer_directly") else 0,
            },
        )


def sync_no_of_positions(doc, method=None):
    """`validate` hook — keep parent fields in lock-step with the
    custom_position_details rows on every save (our API, Desk UI, scripted).

    1. `no_of_positions`         = number of position rows.
    2. `custom_type_of_position` = "New" / "Replacement" / "Mixed", derived from
       the rows (a row is a Replacement when it has a `replacement_for` — see
       _row_vacancy_type). Stored so PRINT and any field reader show the correct
       type, including "Mixed" when the requisition holds both. The value is
       assigned only when it is a valid Select option, so a save can never fail
       (e.g. before the "Mixed" option has been migrated into the field).

    Only acts when the table has rows — leaves fields untouched for legacy /
    HRMS-standard flows where `custom_position_details` is empty (those use the
    standard `vacancies` table, which we don't want to override).
    """
    position_rows = doc.get("custom_position_details") or []
    if not position_rows:
        return

    doc.no_of_positions = len(position_rows)

    new = sum(1 for r in position_rows if _row_vacancy_type(r) == "New")
    replacement = len(position_rows) - new
    if new and replacement:
        vtype = "Mixed"
    elif replacement:
        vtype = "Replacement"
    else:
        vtype = "New"

    df = doc.meta.get_field("custom_type_of_position")
    allowed = (df.options or "").split("\n") if df else []
    if vtype in allowed:
        doc.custom_type_of_position = vtype


def _resolve_jd_html(designation, department):
    """Rendered Job Description HTML for (designation, department), or "".

    Mirrors `preview_job_description`'s resolution (exact designation+department
    match, else the default JD) so a saved requisition gets the same description
    the React "Preview JD" card shows. The UI has no description field, yet the
    parent field is mandatory — so this fills it from the linked JD on save.
    """
    if not designation or not department:
        return ""
    designation = _coerce_to_record_name("Designation", designation)
    department = _coerce_to_record_name("Department", department)
    try:
        rows = frappe.db.sql(
            """
            SELECT jd.name
            FROM `tabJob Description` jd
            JOIN `tabJD Designations` jdg
              ON jdg.parent = jd.name
             AND jdg.parenttype = 'Job Description'
             AND jdg.parentfield = 'designation'
            JOIN `tabJD Department` jdp
              ON jdp.parent = jd.name
             AND jdp.parenttype = 'Job Description'
             AND jdp.parentfield = 'department'
            WHERE jdg.designation = %s
              AND jdp.department = %s
            ORDER BY jd.modified DESC
            LIMIT 1
            """,
            (designation, department),
        )
        jd_name = rows[0][0] if rows else None
        if not jd_name and frappe.get_meta(JOB_DESCRIPTION).get_field("is_default"):
            jd_name = frappe.db.get_value(JOB_DESCRIPTION, {"is_default": 1}, "name")
        if not jd_name:
            return ""
        return _build_preview_payload(jd_name, "match").get("description_html") or ""
    except Exception:
        return ""


def _ensure_description(doc, payload):
    """Populate the mandatory parent `description` when the payload omits it.

    Falls back from the linked Job Description → reason_for_requesting →
    a minimal designation line, so submit never fails the mandatory check
    while still preferring the real JD content shown in the UI preview.
    """
    if doc.get("description"):
        return
    html = _resolve_jd_html(payload.get("designation"), payload.get("department"))
    if not html:
        reason = payload.get("reason_for_requesting")
        designation = payload.get("designation")
        html = reason or (f"<p>{frappe.utils.escape_html(designation)}</p>" if designation else "")
    if html:
        doc.description = html


def _build_requisition_doc(payload, positions_for_location):
    """Construct an unsaved Job Requisition for one location group."""
    doc = frappe.new_doc(JOB_REQUISITION)
    _bypass_hrms_duplicate_check(doc)

    _apply_parent_fields(doc, payload)
    _ensure_description(doc, payload)

    # Always derive `no_of_positions` from the actual rows in
    # custom_position_details for THIS location group. The UI ships a single
    # total across all locations, but location-grouping splits that total
    # into multiple JRs, so the UI value would be wrong per-JR.
    doc.no_of_positions = len(positions_for_location)
    if not doc.get("custom_hiring_lead"):
        doc.custom_hiring_lead = payload.get("requested_by")

    _apply_qualifications(doc, payload)
    _apply_skills(doc, payload)
    _apply_pre_screened(doc, payload)

    parent_vacancy = payload.get("custom_type_of_position")
    parent_functional_area = payload.get("custom_functional_area")
    parent_employee_type = payload.get("custom_employment_type_link") or payload.get("custom__employee_type")
    for index, p in enumerate(positions_for_location, start=1):
        doc.append(
            "custom_position_details",
            _position_row(p, index, parent_vacancy, parent_functional_area, parent_employee_type),
        )

    return doc


# ---------------------------------------------------------------------------
# META-FIRST FORM CONFIG
# ---------------------------------------------------------------------------
#
# The external "Raise a Requisition" form renders from the Job Requisition
# DocType meta (tabs, sections, fields, mandatory, options) — NOT from a
# re-declared field list. A `Job Requisition Form` config record only stores
# *overrides* (hide / force-mandatory / relabel / regroup / restrict child
# columns); a field with no override row follows the meta exactly. This keeps
# the form in lock-step with the doctype: add a field in Customize Form and it
# appears automatically, no second table to maintain.
#
# `get_job_requisition_form_config` is the read/render surface.
# `_get_writable_parent_fields` makes the write allowlist config-aware.

JOB_REQUISITION_FORM_SETTINGS = "Job Requisition Form Settings"

# Layout-only fieldtypes never rendered as inputs (mirrors candidate_portal).
_LAYOUT_TYPES = frozenset({
    "Column Break", "Tab Break", "Section Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Signature", "Color",
    "Barcode", "Geolocation",
})

# Bookkeeping / framework fields never exposed on the external form.
_SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "amendment_date",
    "status", "workflow_state",
})

# `applies_to` value (config) → parent Table fieldname on Job Requisition.
# The child DocType is resolved from meta at runtime (never hardcoded) so this
# keeps working if a table's child doctype is renamed.
_CHILD_TABLE_BY_GROUP = {
    "Position Details": "custom_position_details",
    "Position Summary": "custom_position_summary",
    "Qualifications": "custom_qualifications",
    "Skills": "custom_skills",
    "Pre-screened Candidates": "custom_pre_screened_candidates",
}

# Virtual "table inside a table" columns. These are stored as a JSON string in a
# Long Text field on a child row (NOT a real Frappe child table), so meta alone
# can't tell the frontend they're a sub-table. We declare the inner schema here
# so the form config can describe the nested editor, while the existing
# serialise/deserialise helpers keep handling the JSON <-> list conversion on
# read/write. `cost_center_allocations` lives on Position Details rows and holds
# a list of {cost_center, percentage}.
_VIRTUAL_NESTED_TABLES = {
    "cost_center_allocations": {
        "label": "Cost Center Allocation",
        "fields": [
            {"fieldname": "cost_center", "label": "Cost Center",
             "fieldtype": "Link", "options": "Cost Center", "is_mandatory": 1},
            {"fieldname": "percentage", "label": "Percentage (%)",
             "fieldtype": "Float", "is_mandatory": 1},
        ],
    },
}


def _get_form_settings():
    """The single Job Requisition Form Settings doc, or None when it can't be
    read (e.g. before the doctype is migrated). Cached per request."""
    try:
        return frappe.get_cached_doc(JOB_REQUISITION_FORM_SETTINGS)
    except Exception:
        return None


def _load_form_overrides(settings=None):
    """Overrides keyed by (applies_to, fieldname) → row dict, read from the
    single settings doc. Empty dict when nothing is configured — callers then
    fall back to pure meta. Never raises."""
    settings = settings or _get_form_settings()
    if not settings:
        return {}
    overrides = {}
    for row in settings.get("field_overrides") or []:
        key = (row.get("applies_to") or "Parent", row.get("fieldname"))
        if key[1]:
            overrides[key] = row
    return overrides


def _three_state(override_value, meta_value, on, off):
    """Resolve a 3-state Select override against a 0/1 meta default.
    `Default` → meta_value; `on` → 1; `off` → 0."""
    if override_value == on:
        return 1
    if override_value == off:
        return 0
    return int(meta_value or 0)


def _child_columns(child_doctype, ov=None):
    """Render-ready column list for a child doctype, meta-first, with optional
    per-column overrides (hide / force-mandatory / relabel / restrict set)."""
    if not child_doctype:
        return []
    try:
        meta = frappe.get_meta(child_doctype)
    except Exception:
        return []

    selected, mandatory = None, set()
    # `configured` = the child-columns picker has been used for this table. When
    # so, the picker's Mandatory selection is AUTHORITATIVE (an unticked column
    # is is_mandatory:0, even if it's `reqd` on the child doctype). When the
    # picker was never used, we fall back to the child meta's own `reqd`.
    configured = False
    if ov is not None:
        sel = ov.get("selected_child_fields")
        man = ov.get("mandatory_child_fields")
        configured = bool(sel) or bool(man)
        if sel:
            try:
                parsed = set(json.loads(sel))
                selected = parsed or None
            except Exception:
                selected = None
        if man:
            try:
                parsed = json.loads(man)
                mandatory = set(parsed) if isinstance(parsed, list) else set()
            except Exception:
                mandatory = set()

    columns = []
    for df in meta.fields:
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname or df.get("hidden"):
            continue
        if selected is not None and df.fieldname not in selected:
            continue
        if configured:
            is_mandatory = 1 if df.fieldname in mandatory else 0
        else:
            is_mandatory = 1 if df.reqd else 0
        col = {
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": df.options or "",
            "is_mandatory": is_mandatory,
            "read_only": int(df.read_only or 0),
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
        }
        # A JSON-backed sub-table (e.g. cost_center_allocations): expose its inner
        # schema so the frontend renders a nested row editor. Stored value is a
        # list of dicts matching `nested_fields` (handled by the
        # serialise/deserialise helpers on read/write).
        _apply_nested_table(col, df.fieldname)
        columns.append(col)
    return columns


def _apply_nested_table(col, fieldname):
    """Augment a column dict with virtual sub-table schema when applicable."""
    nested = _VIRTUAL_NESTED_TABLES.get(fieldname)
    if nested:
        col["is_nested_table"] = 1
        col["nested_label"] = nested["label"]
        col["nested_fields"] = nested["fields"]


def _child_group_fields(child_doctype, group, overrides, restrict):
    """Columns for a child-table group, config-driven.

    When the settings doc has override rows for this group (applies_to == group),
    ONLY those columns are returned — in their configured order, honouring
    Hide / mandatory / read-only / label / options overrides. This is what makes
    removing a child column in the builder actually drop it from the API.

    When the group has no override rows: empty in restrict mode (nothing
    configured), else meta-first (all columns) so an unconfigured table still
    renders fully."""
    try:
        cmeta = frappe.get_meta(child_doctype)
    except Exception:
        return []

    group_rows = sorted(
        [(fn, row) for (grp, fn), row in overrides.items() if grp == group],
        key=lambda x: int(x[1].get("order") or 0),
    )
    if not group_rows:
        return [] if restrict else _child_columns(child_doctype)

    cols = []
    for fn, row in group_rows:
        if (row.get("expose") or "Default") == "Hide":
            continue
        df = cmeta.get_field(fn)
        if not df:
            continue
        col = {
            "fieldname": fn,
            "label": (row.get("label_override") or df.label or fn).strip(),
            "fieldtype": df.fieldtype,
            "options": row.get("options_override") or df.options or "",
            "is_mandatory": _three_state(row.get("mandatory_override"), df.reqd, "Required", "Optional"),
            "read_only": _three_state(row.get("read_only_override"), df.read_only, "Read Only", "Editable"),
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
        }
        _apply_nested_table(col, fn)
        cols.append(col)
    return cols


def _build_form_config(doc=None):
    """Meta-first tabs → sections → fields tree for the Job Requisition form,
    with the single settings doc's overrides applied. Parent fields come from
    the doctype layout; child tables are emitted both inline (as a Table field)
    and collected under `child_groups` for convenience.

    When `Show Only Configured Fields` is on, a parent field is rendered only
    when it has a config row (strict allowlist); otherwise the whole doctype is
    rendered minus any field marked Hide.

    When `doc` (a Job Requisition) is passed, each field carries its current
    `value`, so one call powers the edit screen (config + data)."""
    settings = _get_form_settings()
    overrides = _load_form_overrides(settings)
    restrict = bool(settings and settings.get("restrict_to_configured"))
    meta = frappe.get_meta(JOB_REQUISITION)

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

        ov = overrides.get(("Parent", df.fieldname))
        # Strict allowlist: only configured fields are rendered.
        if restrict and ov is None:
            continue
        expose = (ov.get("expose") if ov else None) or "Default"
        if expose == "Hide":
            continue
        if not restrict and expose != "Show" and df.get("hidden"):
            continue

        tab_lbl = (ov.get("tab_override") if ov else "") or current_tab
        sec_lbl = (ov.get("section_override") if ov else "") or current_section

        entry = {
            "fieldname": df.fieldname,
            "label": (ov.get("label_override") if ov else "") or (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": (ov.get("options_override") if ov else "") or df.options or "",
            "is_mandatory": _three_state(ov.get("mandatory_override") if ov else None, df.reqd, "Required", "Optional"),
            "read_only": _three_state(ov.get("read_only_override") if ov else None, df.read_only, "Read Only", "Editable"),
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
            "length": df.get("length") or 0,
            "order": int(ov.get("order") or 0) if ov else 0,
        }
        if doc is not None:
            entry["value"] = doc.get(df.fieldname)

        if df.fieldtype in ("Table", "Table MultiSelect") and df.options:
            entry["child_doctype"] = df.options
            entry["child_fields"] = _child_columns(df.options, ov)

        tab = tab_map.setdefault(tab_lbl, {"order": [], "map": {}})
        if tab_lbl not in tab_order:
            tab_order.append(tab_lbl)
        if sec_lbl not in tab["map"]:
            tab["map"][sec_lbl] = []
            tab["order"].append(sec_lbl)
        tab["map"][sec_lbl].append(entry)

    tabs = []
    for tab_lbl in tab_order:
        tab = tab_map[tab_lbl]
        sections = []
        for sec_lbl in tab["order"]:
            fields = tab["map"][sec_lbl]
            # Stable sort: explicit `order` first (non-zero), meta order otherwise.
            fields.sort(key=lambda f: (f["order"] == 0, f["order"]))
            sections.append({"section": sec_lbl, "fields": fields})
        tabs.append({"tab": tab_lbl, "sections": sections})

    # Child-table groups, config-driven: only the columns placed in the builder
    # for each group are returned (so removing one drops it from the response).
    child_groups = {}
    for group, table_field in _CHILD_TABLE_BY_GROUP.items():
        tdf = meta.get_field(table_field)
        if not tdf or tdf.fieldtype not in ("Table", "Table MultiSelect") or not tdf.options:
            continue
        fields = _child_group_fields(tdf.options, group, overrides, restrict)
        # Drop a group entirely when restrict is on and nothing is configured for it.
        if restrict and not fields:
            continue
        child_groups[table_field] = {
            "group": group,
            "child_doctype": tdf.options,
            "fields": fields,
        }

    return {
        "settings": JOB_REQUISITION_FORM_SETTINGS,
        "restrict_to_configured": restrict,
        "tabs": tabs,
        "child_groups": child_groups,
    }


@frappe.whitelist()
def get_job_requisition_form_config(name=None):
    """Render config for the external Job Requisition form, driven by the single
    `Job Requisition Form Settings` doc.

    - `name` optional — a Job Requisition id; when passed, fields carry their
      current `value` so the same call powers the edit screen.

    Returns the project response envelope with
    `{settings, restrict_to_configured, tabs:[{tab, sections:[{section,
    fields:[...]}]}], child_groups}`.
    """
    try:
        doc = None
        if name:
            if not frappe.db.exists(JOB_REQUISITION, name):
                return _err(_("Job Requisition not found: {0}").format(name), http=404)
            doc = frappe.get_doc(JOB_REQUISITION, name)
            doc.check_permission("read")

        config = _build_form_config(doc=doc)
        return _ok(message=_("Form configuration fetched."), data=config, http=200)
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_job_requisition_form_config failed")
        return _err(_("Failed to build form configuration: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def get_available_job_requisition_fields():
    """Flat meta dump of Job Requisition (parent + the four child tables), so a
    config UI / the frontend can discover the full field inventory. Mirrors
    candidate_portal.get_available_job_applicant_fields."""
    frappe.has_permission(JOB_REQUISITION_FORM_SETTINGS, "read", throw=True)
    try:
        meta = frappe.get_meta(JOB_REQUISITION)
    except Exception:
        return {"status": "error", "message": _("Could not read Job Requisition meta.")}

    parent_fields, current_tab, current_section = [], "", ""
    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            current_tab = (df.label or "").strip()
            current_section = ""
            continue
        if df.fieldtype == "Section Break":
            current_section = (df.label or "").strip()
            continue
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname or df.fieldname in _SKIP_FIELDNAMES:
            continue
        parent_fields.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "tab_label": current_tab,
            "section_label": current_section,
            "options": df.options or "",
            "reqd": df.reqd or 0,
            "hidden": int(df.get("hidden") or 0),
        })

    child_fields = {}
    for group, table_field in _CHILD_TABLE_BY_GROUP.items():
        tdf = meta.get_field(table_field)
        if tdf and tdf.fieldtype in ("Table", "Table MultiSelect") and tdf.options:
            child_fields[group] = {
                "table_field": table_field,
                "child_doctype": tdf.options,
                "fields": _child_columns(tdf.options),
            }

    return {
        "status": "success",
        "parent_fields": parent_fields,
        "child_fields": child_fields,
        "total": len(parent_fields),
    }


# Explicit map of the live React "Raise a Requisition" form (the 5-step wizard:
# Basic Details → Job Details → Position Selection → Other Details → Review).
# Each section is (tab, section, [(applies_to, fieldname, label, mandatory), ...]).
# This is the source of truth for the seed so the Settings doctype mirrors what
# the frontend renders today — exact labels, grouping and required marks. Fields
# are emitted only when they actually exist on the doctype, so a label tweak can
# never break the seed.
_SEED_LAYOUT = [
    ("Basic Details", "", [
        ("Parent", "requested_by", "Hiring Manager", True),
        ("Parent", "company", "Company", True),
        ("Parent", "department", "Department", True),
        ("Parent", "designation", "Designation", True),
        ("Parent", "custom_functional_area", "Functional Area", True),
    ]),
    ("Job Details", "", [
        ("Parent", "custom_experience_range_from", "Experience Range - From", False),
        ("Parent", "custom_experience_range_to", "To", False),
        ("Parent", "custom_experience_unit", "Unit", False),
        ("Parent", "custom_salary_range_currency", "Salary Range (Currency)", True),
        ("Parent", "custom_salary_range_min", "Salary Range (Min)", True),
        ("Parent", "custom_salary_range_max", "Salary Range (Max)", True),
        ("Parent", "custom_salary_timeframe", "Salary Timeframe", True),
        ("Parent", "posting_date", "Recruitment Start Date", False),
        ("Parent", "custom_hiring_lead", "Hiring Lead", False),
    ]),
    ("Job Details", "Recruiter Instructions", [
        ("Parent", "expected_by", "Expected By Date", True),
        ("Parent", "custom_employment_type_link", "Employment Type (Link)", True),
        ("Parent", "custom_location", "Work Location", True),
        ("Parent", "custom_preferred_notice_period", "Preferred Notice Period", False),
        ("Parent", "custom_preferred_company", "Preferred Target Company", False),
        ("Parent", "custom_other_preferred_companies", "Other Preferred Companies", False),
        ("Parent", "custom_additional_skills", "Required Skills", False),
        ("Parent", "custom_additional_roles__responsibilities", "Position Specific Requirements", False),
    ]),
    ("Position Selection", "", [
        ("Parent", "no_of_positions", "Total Position", True),
    ]),
    ("Position Selection", "Position Details", [
        ("Position Details", "position_no", "Position Number", False),
        ("Position Details", "vacancy_type", "Vacancy Type", True),
        ("Position Details", "location", "Location", True),
        ("Position Details", "functional_area", "Functional Area", True),
        ("Position Details", "reporting_manager", "Reporting Manager", True),
        ("Position Details", "replacement_for", "Replacement For", False),
        ("Position Details", "employee_type", "Employee Type", False),
        ("Position Details", "cost_center_allocations", "Cost Center Allocations", False),
    ]),
    ("Other Details", "", [
        ("Parent", "custom_comments__instructions", "Comments / Instruction", False),
    ]),
    ("Other Details", "Qualifications", [
        ("Qualifications", "qualification", "Qualification", False),
        ("Qualifications", "mandatory", "Mandatory?", False),
    ]),
    ("Other Details", "Pre-Screened Candidates", [
        ("Pre-screened Candidates", "candidate_name", "Candidate Name", False),
        ("Pre-screened Candidates", "email", "Email", False),
        ("Pre-screened Candidates", "phone", "Phone", False),
        ("Pre-screened Candidates", "cv", "Attachment", False),
        ("Pre-screened Candidates", "offer_directly", "Offer Directly?", False),
    ]),
]


def _field_exists(meta, applies_to, fieldname):
    """True when `fieldname` is a real field on the parent (applies_to=='Parent')
    or on the child doctype behind the named group."""
    if applies_to == "Parent":
        return bool(meta.get_field(fieldname))
    table_field = _CHILD_TABLE_BY_GROUP.get(applies_to)
    tdf = meta.get_field(table_field) if table_field else None
    if not tdf or not tdf.options:
        return False
    try:
        return bool(frappe.get_meta(tdf.options).get_field(fieldname))
    except Exception:
        return False


def _build_seed_rows():
    """Materialise the live form (`_SEED_LAYOUT`) as override rows for the
    settings doctype, skipping any field that doesn't exist on the doctype."""
    meta = frappe.get_meta(JOB_REQUISITION)
    rows = []
    order = 0
    for tab, section, fields in _SEED_LAYOUT:
        for applies_to, fieldname, label, mandatory in fields:
            if not _field_exists(meta, applies_to, fieldname):
                continue
            order += 10
            rows.append({
                "applies_to": applies_to,
                "fieldname": fieldname,
                "label_override": label,
                "tab_override": tab,
                "section_override": section,
                "order": order,
                "expose": "Show",
                "mandatory_override": "Required" if mandatory else "Default",
                "read_only_override": "Default",
            })
    return rows


def seed_form_settings(overwrite=False):
    """Populate the single settings doc from `_build_seed_rows`. Returns the
    number of rows written, or -1 when it already had rows and overwrite is off
    (so the caller can avoid clobbering manual edits)."""
    settings = frappe.get_single(JOB_REQUISITION_FORM_SETTINGS)
    if settings.get("field_overrides") and not overwrite:
        return -1
    rows = _build_seed_rows()
    settings.set("field_overrides", [])
    for row in rows:
        settings.append("field_overrides", row)
    settings.restrict_to_configured = 1
    settings.save(ignore_permissions=True)
    return len(rows)


@frappe.whitelist()
def load_current_form_into_settings(overwrite=0):
    """Desk action (builder button): fill the Settings doc with the current
    Job Requisition form so it can be shared / edited. `overwrite=1` replaces
    existing rows."""
    frappe.has_permission(JOB_REQUISITION_FORM_SETTINGS, "write", throw=True)
    try:
        written = seed_form_settings(overwrite=frappe.utils.cint(overwrite))
        if written == -1:
            return _err(
                _("Settings already has fields. Pass overwrite=1 to replace them."),
                http=409,
            )
        frappe.db.commit()
        return _ok(_("Loaded {0} fields from the current form.").format(written), {"count": written}, http=200)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "load_current_form_into_settings failed")
        return _err(_("Failed to load current form: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------


@frappe.whitelist()
def create_job_requisition(payload=None):
    """
    Submit a Job Requisition.

    Groups `custom_position_details` rows by `location` and creates one fresh
    JR per unique location, each holding only that location's positions. Each
    submission is independent — positions are never merged into requisitions
    created by an earlier submission.

    Returns:
        {
          "success": true,
          "message": "Created X requisition(s).",
          "data": {
            "requisitions": [
              {"name": "HR-HIREQ-...", "location": "Pune", "positions_count": 2, "action": "created"},
              ...
            ]
          }
        }
    """
    try:
        payload = _coerce_payload(payload)

        # Strip workflow-managed fields from the payload entirely so they
        # never reach _apply_parent_fields or doc.set().
        for managed in FRAPPE_MANAGED_FIELDS:
            payload.pop(managed, None)

        _validate(payload)

        positions = _list_field(payload, "custom_position_details")
        groups = _group_positions_by_location(positions)

        results = []
        savepoint = "create_job_requisition"
        frappe.db.savepoint(savepoint)
        try:
            # One fresh Job Requisition per unique location in THIS submission.
            # Each location group carries only its own positions (e.g. 5 openings
            # across BLR×2 / Mumbai / Kolkata / Noida → 4 requisitions, the BLR one
            # holding 2 positions). We deliberately do NOT merge into requisitions
            # from earlier submissions — every submit stands on its own.
            for location, group_positions in groups:
                doc = _build_requisition_doc(payload, group_positions)
                doc.insert(ignore_permissions=False)
                results.append(
                    {
                        "name": doc.name,
                        "location": location,
                        "positions_count": len(group_positions),
                        "action": "created",
                    }
                )
        except Exception:
            frappe.db.rollback(save_point=savepoint)
            raise

        frappe.db.commit()

        created_count = len(results)
        return _ok(
            message=_("Created {0} requisition(s).").format(created_count),
            data={"requisitions": results},
            http=201 if created_count else 200,
        )

    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "create_job_requisition failed")
        return _err(_("Failed to create job requisition: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# GET — single + list
# ---------------------------------------------------------------------------


# Status buckets used by the list-view summary cards.
# Edit here if the workflow ever introduces new states.
ACTIVE_STATUSES = ("Open & Approved", "In-Progress", "Job Opening Created")
CLOSED_STATUSES = ("Filled", "Cancelled", "Rejected")


def _compute_global_summary(employee=None, requested_by_override=None):
    """Single aggregate query returning the 4 list-view card counts.

    Scoped to one user when `employee` (Employee ID) or `requested_by_override`
    (already-resolved JR.requested_by value) is supplied — counts then mirror
    the same `requested_by` filter the list query uses (OR-matched against the
    Employee ID and the linked User account).

    When both args are None the counts are global (admin / unfiltered case).
    """
    candidates = []
    if employee:
        candidates.append(employee)
        user_id = frappe.db.get_value("Employee", employee, "user_id")
        if user_id and user_id not in candidates:
            candidates.append(user_id)
    if requested_by_override and requested_by_override not in candidates:
        candidates.append(requested_by_override)

    params = {"active": ACTIVE_STATUSES, "closed": CLOSED_STATUSES}
    where_clause = ""
    if candidates:
        params["candidates"] = tuple(candidates)
        where_clause = "WHERE requested_by IN %(candidates)s"

    row = frappe.db.sql(
        f"""
        SELECT
            COUNT(*)                                        AS total_requisitions,
            COALESCE(SUM(no_of_positions), 0)               AS total_positions,
            COALESCE(SUM(CASE WHEN status IN %(active)s
                              THEN no_of_positions ELSE 0 END), 0) AS active_offer_positions,
            COALESCE(SUM(CASE WHEN status IN %(closed)s
                              THEN no_of_positions ELSE 0 END), 0) AS closed_positions
        FROM `tabJob Requisition`
        {where_clause}
        """,
        params,
        as_dict=True,
    )[0]
    return {
        "total_requisitions": int(row.total_requisitions or 0),
        "total_positions": int(row.total_positions or 0),
        "active_offer_positions": int(row.active_offer_positions or 0),
        "closed_positions": int(row.closed_positions or 0),
    }


def _link_title_value(target_doctype, value):
    """Title of the linked record for `value`, using LINK_TITLE_BY_DOCTYPE.
    Returns None when unmapped / empty / the row is missing (never raises)."""
    title_field = LINK_TITLE_BY_DOCTYPE.get(target_doctype)
    if not value or not title_field:
        return None
    try:
        return frappe.get_cached_value(target_doctype, value, title_field) or None
    except Exception:
        return None


def _with_link_titles(source_doctype, data):
    """Return a copy of `data` where each Link field is immediately followed by
    a `<field>_title` sibling holding the linked record's title.

    Only Link fields whose target DocType is in LINK_TITLE_BY_DOCTYPE get a
    title. The original (id) keys/values are never modified — we only ADD keys,
    so the existing response contract is preserved.
    """
    try:
        meta = frappe.get_meta(source_doctype)
    except Exception:
        return data
    out = {}
    for key, value in data.items():
        out[key] = value
        df = meta.get_field(key)
        if df and df.fieldtype == "Link" and df.options in LINK_TITLE_BY_DOCTYPE:
            out[f"{key}_title"] = _link_title_value(df.options, value)
    return out


def _vacancy_breakdown(doc):
    """New / Replacement breakdown for a requisition, derived from its positions.

    A single requisition can hold BOTH New and Replacement positions, which
    makes the parent "Type of Position" Select ambiguous. So rather than forcing
    one value, we expose explicit counts plus a clear 3-state `type`:
        - all positions New          -> "New"
        - all positions Replacement  -> "Replacement"
        - a mix of both              -> "Mixed"
        - no positions (edge case)   -> the stored parent value

    Per-row `vacancy_type` is itself derived from `replacement_for`
    (see _row_vacancy_type), so this stays correct on create and update alike.
    Returns: {"total": int, "new": int, "replacement": int, "type": str}
    """
    rows = doc.get("custom_position_details") or []
    new = sum(1 for r in rows if _row_vacancy_type(r) == "New")
    replacement = sum(1 for r in rows if _row_vacancy_type(r) == "Replacement")
    if new and replacement:
        vtype = "Mixed"
    elif replacement:
        vtype = "Replacement"
    elif new:
        vtype = "New"
    else:
        vtype = doc.get("custom_type_of_position")
    return {"total": new + replacement, "new": new, "replacement": replacement, "type": vtype}


def _serialise_requisition(doc):
    """Flat round-trip representation of a JR.
    All parent fields keep their DocType field names so the UI can bind
    directly without a translation layer.

    Every Link field is accompanied by a `<field>_title` sibling (the linked
    record's title) so the UI never has to show a raw id. The id keys are
    unchanged — see _with_link_titles / LINK_TITLE_BY_DOCTYPE."""
    out = {
        "name": doc.name,
        "status": doc.get("status"),
        "workflow_state": doc.get("workflow_state"),
        "creation": doc.get("creation"),
        "modified": doc.get("modified"),
    }

    for field in PARENT_WRITABLE_FIELDS:
        out[field] = doc.get(field)
    for field in PARENT_READONLY_FIELDS:
        out[field] = doc.get(field)

    # `custom_work_experience` is a legacy alias for the real Select field
    # `custom_work_experience_range`. The real field doesn't exist under the
    # alias name, so echo its value under both keys — a UI bound to either name
    # then shows the stored value instead of an empty box.
    out["custom_work_experience"] = out.get("custom_work_experience_range")

    # Vacancy mix. A requisition may contain BOTH New and Replacement positions,
    # so a single type is ambiguous — expose explicit counts plus a 3-state type
    # ("New" / "Replacement" / "Mixed"). `custom_type_of_position` mirrors the
    # type so existing bindings keep working; new UI should prefer the breakdown.
    _breakdown = _vacancy_breakdown(doc)
    out["custom_type_of_position"] = _breakdown["type"]
    out["custom_vacancy_breakdown"] = _breakdown

    out["custom_position_details"] = [
        {
            "position_no": row.get("position_no"),
            # Derived from replacement_for so already-saved rows that were
            # mislabelled "New" still report the correct type. See _row_vacancy_type.
            "vacancy_type": _row_vacancy_type(row),
            "location": row.get("location"),
            "reporting_manager": row.get("reporting_manager"),
            "replacement_for": row.get("replacement_for"),
            "employee_type": row.get("employee_type"),
            "functional_area": row.get("functional_area"),
            # JSON string in DB → clean list of {cost_center, percentage}
            # for the UI. Empty list when the field is unset or malformed.
            "cost_center_allocations": _serialise_cost_center_allocations(
                row.get("cost_center_allocations")
            ),
        }
        for row in doc.get("custom_position_details") or []
    ]

    out["custom_position_summary"] = [
        {
            "position_no": row.get("position_no"),
            "status": row.get("status"),
            "job_id": row.get("job_id"),
            "functional_area": row.get("functional_area"),
            "designation_alias": row.get("designation_alias"),
            "location": row.get("location"),
            "candidate": row.get("candidate"),
            "candidate_status": row.get("candidate_status"),
            "hiring_lead": row.get("hiring_lead"),
            "recruiter": row.get("recruiter"),
            "tat_days": row.get("tat_days"),
        }
        for row in doc.get("custom_position_summary") or []
    ]

    out["custom_qualifications"] = [
        {"qualification": row.get("qualification"), "mandatory": row.get("mandatory")}
        for row in doc.get("custom_qualifications") or []
    ]

    out["custom_skills"] = [row.get("skill") for row in doc.get("custom_skills") or [] if row.get("skill")]

    out["custom_pre_screened_candidates"] = [
        {
            # Child-row primary key — surfaced so the UI can identify the
            # same row across refetches (edit/delete tracking).
            "name": row.get("name"),
            "candidate_name": row.get("candidate_name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "cv": row.get("cv"),
            "offer_directly": bool(row.get("offer_directly")),
        }
        for row in doc.get("custom_pre_screened_candidates") or []
    ]

    # Add `<field>_title` siblings for every mapped Link field (id kept as-is).
    out = _with_link_titles(JOB_REQUISITION, out)
    for table_field, child_doctype in (
        ("custom_position_details", "Position Details"),
        ("custom_position_summary", "Job Requisition Position"),
        ("custom_qualifications", "Job Requisition Qualification"),
    ):
        if out.get(table_field):
            out[table_field] = [_with_link_titles(child_doctype, row) for row in out[table_field]]

    return out


@frappe.whitelist()
def get_job_requisition(
    name=None,
    filters=None,
    employee=None,
    limit=20,
    start=0,
    order_by="modified desc",
):
    """
    Two modes — same endpoint, same per-item shape:

      - `name` passed   →  ONE Job Requisition (flat shape).
      - `name` omitted  →  paginated LIST, every item in the same flat shape.

    List-mode optional params:
        filters   JSON object  e.g. {"status": "Pending", "department": "Accounts - D"}
        employee  str  Employee ID — convenience filter for "requisitions
                       raised by this employee". Merged into `filters` as
                       `requested_by`. If `filters` also contains a
                       `requested_by`, the explicit `filters` value wins.
        limit     int  page size              (default 20, max 100)
        start     int  offset                 (default 0)
        order_by  str  field + asc/desc       (default "modified desc")
    """
    try:
        if name:
            if not frappe.db.exists(JOB_REQUISITION, name):
                return _err(_("Job Requisition not found: {0}").format(name), http=404)

            doc = frappe.get_doc(JOB_REQUISITION, name)
            doc.check_permission("read")
            return _ok(
                message=_("Job Requisition fetched."),
                data=_serialise_requisition(doc),
                http=200,
            )

        # List mode
        if isinstance(filters, str):
            try:
                filters = json.loads(filters) if filters.strip() else None
            except json.JSONDecodeError:
                return _err(_("`filters` must be valid JSON."), http=400)
        filters = filters or {}

        # Security: `employee` is REQUIRED in list mode. Without it any caller
        # could enumerate every requisition in the system. An explicit
        # `filters.requested_by` from the caller is treated as an override
        # (same person, just expressed via the filters object) and satisfies
        # the requirement.
        if not employee and "requested_by" not in filters:
            return _err(
                _("`employee` is required to list Job Requisitions."),
                http=400,
            )

        try:
            limit = max(1, min(int(limit), 100))
            start = max(0, int(start))
        except (TypeError, ValueError):
            return _err(_("`limit` and `start` must be integers."), http=400)

        # Resolve `employee` against both representations the JR's
        # `requested_by` field may hold:
        #   - the Employee ID itself (e.g. "37001"), or
        #   - the linked User account (e.g. "user@example.com").
        # When both are known we OR-match — fixes the case where the JR was
        # saved with the user email but the UI sends the Employee ID.
        or_filters = None
        if employee and "requested_by" not in filters:
            candidates = [employee]
            user_id = frappe.db.get_value("Employee", employee, "user_id")
            if user_id and user_id not in candidates:
                candidates.append(user_id)
            if len(candidates) == 1:
                filters["requested_by"] = candidates[0]
            else:
                or_filters = [["requested_by", "=", c] for c in candidates]

        names = frappe.get_list(
            JOB_REQUISITION,
            filters=filters,
            or_filters=or_filters,
            fields=["name"],
            order_by=order_by,
            limit_page_length=limit,
            limit_start=start,
            pluck="name",
        )
        if or_filters:
            # frappe.db.count doesn't accept or_filters; pull all matching
            # names (no pagination) and count them.
            total = len(
                frappe.get_list(
                    JOB_REQUISITION,
                    filters=filters,
                    or_filters=or_filters,
                    pluck="name",
                    limit_page_length=0,
                )
            )
        else:
            total = frappe.db.count(JOB_REQUISITION, filters=filters)
        items = [_serialise_requisition(frappe.get_doc(JOB_REQUISITION, n)) for n in names]

        return _ok(
            message=_("Fetched {0} requisition(s).").format(len(items)),
            data={
                "requisitions": items,
                "pagination": {
                    "total": total,
                    "limit": limit,
                    "start": start,
                    "returned": len(items),
                },
                # Counts scoped to the same caller the list query is scoped to.
                # If the caller passed an explicit `filters.requested_by`, that
                # wins (admins listing for a specific user); else fall back to
                # the resolved `employee`.
                "summary": _compute_global_summary(
                    employee=employee,
                    requested_by_override=filters.get("requested_by"),
                ),
            },
            http=200,
        )

    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "get_job_requisition failed")
        return _err(_("Failed to fetch job requisition: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------


@frappe.whitelist()
def update_job_requisition(name=None, payload=None):
    """
    Update an existing Job Requisition.

    Accepts the same flat payload as create_job_requisition but targets a
    specific document identified by `name`.  Child tables (positions,
    qualifications, skills, pre-screened candidates) are fully replaced.

    Returns:
        {
          "success": true,
          "message": "Requisition HR-HIREQ-00017 updated.",
          "data": { "name": "HR-HIREQ-00017" }
        }
    """
    try:
        if not name:
            return _err(_("'name' is required to update a requisition."), http=400)

        payload = _coerce_payload(payload)

        # Strip workflow-managed fields
        for managed in FRAPPE_MANAGED_FIELDS:
            payload.pop(managed, None)

        if not frappe.db.exists(JOB_REQUISITION, name):
            return _err(_("Job Requisition not found: {0}").format(name), http=404)

        doc = frappe.get_doc(JOB_REQUISITION, name)
        doc.check_permission("write")
        _bypass_hrms_duplicate_check(doc)

        # Apply parent fields (skips None / "")
        _apply_parent_fields(doc, payload)

        # Update no_of_positions if explicitly provided
        positions = _list_field(payload, "custom_position_details")
        if positions:
            parent_vacancy = payload.get("custom_type_of_position")
            parent_functional_area = payload.get("custom_functional_area")
            parent_employee_type = payload.get("custom_employment_type_link") or payload.get("custom__employee_type")

            doc.set("custom_position_details", [])
            for idx, p in enumerate(positions, start=1):
                doc.append(
                    "custom_position_details",
                    _position_row(p, idx, parent_vacancy, parent_functional_area, parent_employee_type),
                )
            # Always sync from the live child table — the payload's
            # `no_of_positions` is a UI-level total that may not match the
            # rows we actually persist (location grouping, row removal, etc.).
            doc.no_of_positions = len(positions)

        # Rewrite child tables if provided
        if "custom_qualifications" in payload:
            _apply_qualifications(doc, payload)
        if "custom_skills" in payload:
            _apply_skills(doc, payload)
        if "custom_pre_screened_candidates" in payload:
            _apply_pre_screened(doc, payload)

        doc.save(ignore_permissions=False)
        frappe.db.commit()

        return _ok(
            message=_("Requisition {0} updated.").format(name),
            data={"name": doc.name},
            http=200,
        )

    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "update_job_requisition failed")
        return _err(_("Failed to update job requisition: {0}").format(str(exc)), http=500)


# ---------------------------------------------------------------------------
# JOB DESCRIPTION PREVIEW
# ---------------------------------------------------------------------------


JOB_DESCRIPTION = "Job Description"


def _coerce_to_record_name(doctype, value):
    """Return the record `name` (id) for `value`, accepting either the id or a
    unique title/label.

    The Preview-JD caller may send `designation_title || designation` (the human
    label) rather than the record id. JD applicability is stored by id, so a label
    has to be resolved back to an id before matching. Left unchanged when:
      - `value` is already a record name, or
      - the label is ambiguous (e.g. 304 Designations share the label
        "Professor" — a label can't pick one, so the caller must send the id), or
      - nothing resolves.
    """
    if not value or frappe.db.exists(doctype, value):
        return value
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return value
    title_fields = []
    tf = meta.get("title_field")
    if tf and meta.get_field(tf):
        title_fields.append(tf)
    guess = doctype.lower().replace(" ", "_") + "_name"
    if meta.get_field(guess) and guess not in title_fields:
        title_fields.append(guess)
    for fld in title_fields:
        names = frappe.get_all(doctype, filters={fld: value}, pluck="name", limit=2)
        if len(names) == 1:
            return names[0]
    return value


def _match_jd_name(designation, department, functional_area=None):
    """Best-matching Job Description name for the given applicability.

    Tiered: prefer a JD whose applicability matches designation + department +
    functional area; fall back to designation + department. Most recently
    modified JD wins within a tier. Returns the JD name or None.
    """
    if functional_area:
        rows = frappe.db.sql(
            """
            SELECT jd.name
            FROM `tabJob Description` jd
            JOIN `tabJD Designations` jdg
              ON jdg.parent = jd.name AND jdg.parenttype = 'Job Description' AND jdg.parentfield = 'designation'
            JOIN `tabJD Department` jdp
              ON jdp.parent = jd.name AND jdp.parenttype = 'Job Description' AND jdp.parentfield = 'department'
            JOIN `tabJD Functional Area` jdf
              ON jdf.parent = jd.name AND jdf.parenttype = 'Job Description' AND jdf.parentfield = 'functional_area'
            WHERE jdg.designation = %s AND jdp.department = %s AND jdf.functional_area = %s
            ORDER BY jd.modified DESC
            LIMIT 1
            """,
            (designation, department, functional_area),
        )
        if rows:
            return rows[0][0]

    rows = frappe.db.sql(
        """
        SELECT jd.name
        FROM `tabJob Description` jd
        JOIN `tabJD Designations` jdg
          ON jdg.parent = jd.name AND jdg.parenttype = 'Job Description' AND jdg.parentfield = 'designation'
        JOIN `tabJD Department` jdp
          ON jdp.parent = jd.name AND jdp.parenttype = 'Job Description' AND jdp.parentfield = 'department'
        WHERE jdg.designation = %s AND jdp.department = %s
        ORDER BY jd.modified DESC
        LIMIT 1
        """,
        (designation, department),
    )
    return rows[0][0] if rows else None


@frappe.whitelist()
def preview_job_description(designation=None, department=None, data=None, functional_area=None):
    """
    Return a preview payload for the Job Description that best matches the
    given (designation, department) pair, or the system-wide default JD
    when nothing matches.

    Used by the React Requisition form to render a JD preview card BEFORE
    the requisition is saved — once the user has picked designation and
    department on the Basic Details step.

    Resolution order
    ----------------
    1. **Exact match** — A Job Description whose `designation` Table
       MultiSelect contains the given designation AND whose `department`
       Table MultiSelect contains the given department. When multiple
       JDs qualify, the most recently modified one wins.
       → `source: "match"`, `matched: true`

    2. **Default fallback** — If no JD matches and exactly one JD is
       marked `is_default = 1`, return that JD as a fallback.
       → `source: "default"`, `matched: false`

    3. **Nothing available** — Neither a match nor a default JD exists.
       → `source: "none"`, `matched: false`, empty payload.

    Args
    ----
    designation : str   (required)  Designation ID.
    department  : str   (required)  Department ID.
    data        : dict|json (optional)  In-progress requisition values keyed
        by the template's placeholder names. Used to fill the matched JD
        template's placeholders for the preview; any token not present here
        renders empty.

    Returns
    -------
    Match found:
        {
          "success": true,
          "message": "Job Description found.",
          "data": {
            "matched": true,
            "source": "match",
            "name": "JD-2026-001",
            "title": "Senior Engineer JD",
            "description_html": "<p>...</p>",
            "skills": ["Python", "Django"]
          }
        }

    Default fallback (still HTTP 200):
        {
          "success": true,
          "message": "No exact match — showing the default Job Description.",
          "data": {
            "matched": false,
            "source": "default",
            "name": "JD-DEFAULT",
            "title": "Default JD",
            "description_html": "<p>...</p>",
            "skills": ["..."]
          }
        }

    Nothing to show (still HTTP 200):
        {
          "success": true,
          "message": "No Job Description found for this designation and department.",
          "data": {
            "matched": false,
            "source": "none",
            "name": null,
            "title": null,
            "description_html": "",
            "skills": []
          }
        }

    Error — missing inputs (HTTP 400):
        {"success": false, "message": "...", "data": null}

    Notes for the frontend
    ----------------------
    - Branch on `data.source`:
        - "match"   → render preview as-is.
        - "default" → render preview AND show a subtle banner like
                      "Showing default JD — no exact match for this
                      designation + department."
        - "none"    → hide / placeholder the preview card.
    - `description_html` is Text Editor HTML; render via
      `dangerouslySetInnerHTML`. Sanitize if you do not trust authors.
    - `skills` is a flat list of Skill IDs — drop-in for chips/tags.
    """
    try:
        if not designation or not department:
            return _err(
                _("Both `designation` and `department` are required."),
                http=400,
            )

        # Optional: in-progress requisition values the frontend has filled.
        # These fill the JD template's placeholders for the preview; anything
        # absent renders empty. Accepts a JSON string or a dict.
        filled_data = data
        if isinstance(filled_data, str):
            try:
                filled_data = json.loads(filled_data or "{}")
            except (TypeError, ValueError):
                filled_data = {}
        if not isinstance(filled_data, dict):
            filled_data = {}

        # The form posts display labels at the top level (designation="Professor")
        # but the canonical link ids live inside `data` (the requisition values:
        # designation="PRF_ACD_DEF_OFF_TEACHING", department="DEP_1097", …). JD
        # applicability matches by id, so prefer the ids from `data`; fall back to
        # coercing the top-level label to an id (works only when the label is
        # unique — designation labels usually aren't, which is why the `data` id
        # is what makes the match reliable).
        match_designation = filled_data.get("designation") or _coerce_to_record_name("Designation", designation)
        match_department = filled_data.get("department") or _coerce_to_record_name("Department", department)
        match_fa = (filled_data.get("custom_functional_area")
                    or (functional_area and _coerce_to_record_name("Functional Area", functional_area)))

        # 1) Best applicability match: designation + department (+ functional
        #    area when supplied), tiered inside the helper.
        matched_name = _match_jd_name(match_designation, match_department, match_fa)
        if matched_name:
            return _ok(
                message=_("Job Description found."),
                data=_build_preview_payload(matched_name, source="match", filled_data=filled_data),
                http=200,
            )

        # 2) Fallback to the default Job Description, if one is configured.
        default_name = frappe.db.get_value(
            JOB_DESCRIPTION, {"is_default": 1}, "name"
        )
        if default_name:
            return _ok(
                message=_("No exact match — showing the default Job Description."),
                data=_build_preview_payload(default_name, source="default", filled_data=filled_data),
                http=200,
            )

        # 3) Nothing to show.
        return _ok(
            message=_(
                "No Job Description found for this designation and department."
            ),
            data={
                "matched": False,
                "source": "none",
                "name": None,
                "title": None,
                "description_html": "",
                "skills": [],
            },
            http=200,
        )

    except frappe.PermissionError as exc:
        return _err(str(exc) or _("Not permitted."), http=403)
    except frappe.ValidationError as exc:
        return _err(str(exc), http=400)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "preview_job_description failed")
        return _err(
            _("Failed to preview job description: {0}").format(str(exc)),
            http=500,
        )


def _link_title(target_doctype, record_name):
    """Return the title-field value of `record_name` in `target_doctype`, or
    None when the doctype has no distinct `title_field` (its name already IS
    the human label) or the lookup fails. Result feeds the JD preview so link
    IDs render as readable names."""
    try:
        title_field = frappe.get_meta(target_doctype).get("title_field")
    except Exception:
        return None
    if not title_field or title_field == "name":
        return None
    try:
        return frappe.db.get_value(target_doctype, record_name, title_field) or None
    except Exception:
        return None


def _child_link_field(child_doctype):
    """Fieldname of the first Link field in `child_doctype`. Used to wrap Table
    MultiSelect values the frontend sends as plain IDs (e.g. custom_skills =
    ["Python"]) into the row dicts JD templates iterate over
    (`{% for row in custom_skills %}{{ row.skill }}`)."""
    try:
        for df in frappe.get_meta(child_doctype).fields:
            if df.fieldtype == "Link":
                return df.fieldname
    except Exception:
        pass
    return None


def _resolve_link_titles(values, doctype=JOB_REQUISITION):
    """Return a copy of `values` with Link IDs replaced by their target
    doctype's title (when one is configured), driven by `doctype`'s meta.

    Used for the Requisition "Preview JD" flow: the frontend sends requisition
    values keyed by Job Requisition fieldnames, where Link fields hold record
    IDs. We swap each ID for its readable title so the rendered JD shows e.g.
    the Functional Area's name rather than its code. Child tables (Table /
    Table MultiSelect) are resolved recursively against the child doctype.
    Non-link fields, unknown keys, and links whose name IS the label pass
    through untouched. Never raises."""
    if not isinstance(values, dict) or not values:
        return values
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return values

    out = dict(values)
    for key, val in values.items():
        if val in (None, "", []):
            continue
        df = meta.get_field(key)
        if not df:
            continue
        if df.fieldtype == "Link" and df.options and isinstance(val, str):
            title = _link_title(df.options, val)
            if title:
                out[key] = title
        elif df.fieldtype in ("Table", "Table MultiSelect") and df.options and isinstance(val, list):
            # Table MultiSelect values may arrive as plain IDs (["Python"])
            # rather than child-row dicts. JD templates iterate them as
            # `{% for row in custom_skills %}{{ row.skill }}`, so wrap each ID
            # under the child's link fieldname before resolving titles.
            link_field = _child_link_field(df.options) if df.fieldtype == "Table MultiSelect" else None
            rows = []
            for row in val:
                if isinstance(row, dict):
                    rows.append(_resolve_link_titles(row, df.options))
                elif link_field and isinstance(row, str):
                    rows.append(_resolve_link_titles({link_field: row}, df.options))
                else:
                    rows.append(row)
            out[key] = rows
    return out


def _build_preview_payload(jd_name, source, filled_data=None):
    """Shared JD → preview payload builder used by exact-match and
    default-fallback paths. Honours read permission on the JD doc.

    `description_html` is the RENDERED preview (Jinja resolved + line
    breaks converted to <p>/<br>), not the raw template — so the React
    Preview JD modal renders human-readable content via
    `dangerouslySetInnerHTML` without exposing `{{ }}` placeholders.

    When `filled_data` (the in-progress requisition values) is supplied, the
    template's placeholders are resolved against the JD doc's own fields
    OVERLAID with those filled values — so e.g. `{{ office_location }}` shows
    what the user typed on the requisition form. Tokens with no supplied value
    render empty. Scalar overrides never clobber the JD's child-table fields
    (designation/department/skills/…) so their `{% for %}` loops keep working.
    """
    from recruitment.recruitment.doctype.job_description.job_description import (
        _render_preview,
        _jd_context_with_titles,
        plain_text_to_html,
        render_with_context,
        substitute_field_tokens,
    )

    doc = frappe.get_doc(JOB_DESCRIPTION, jd_name)
    doc.check_permission("read")

    if filled_data is not None:
        # Link fields arrive as record IDs (e.g. custom_functional_area =
        # "FCC_AC_AET"). Swap each for its target doctype's title where one is
        # configured, so the preview reads human-friendly names instead of
        # codes. Fields whose name IS the label (Designation, Department,
        # Company, Branch — no distinct title_field) pass through unchanged.
        filled_data = _resolve_link_titles(filled_data)

        # Three placeholder formats coexist:
        #   1. Jinja `{{ field }}` (seeded default template) — resolved against
        #      the JD doc's own fields, overlaid with the filled values.
        #   2. Jinja `{{ data.field }}` — resolved against the requisition values
        #      regardless of name. Use this for `designation`/`department`, whose
        #      bare names collide with the JD's own child tables (see below).
        #   3. Builder tokens `#*Field*#` — substituted from the filled values.
        # Resolve the JD doc's own Link fields (top-level + child rows) to titles
        # so JD-group loops like `{% for row in department %}{{ row.department }}`
        # show "Academics Defence Offline", not "DEP_1097".
        context = _jd_context_with_titles(doc)
        for key, value in filled_data.items():
            # Don't let a scalar requisition value overwrite a JD child table
            # (would break the template's `{% for %}` loops).
            if isinstance(context.get(key), list):
                continue
            context[key] = value
        # Always expose the (link-resolved) requisition values under `data` so a
        # template can fetch any field — including the colliding designation /
        # department — as pure Jinja `{{ data.<fieldname> }}`.
        context["data"] = filled_data
        rendered = render_with_context(doc.get("description") or "", context)
        rendered = substitute_field_tokens(rendered, filled_data)
    else:
        _render_preview(doc)
        rendered = doc.get("preview") or ""

    description_html = plain_text_to_html(rendered)
    skills = [
        row.get("skill")
        for row in (doc.get("skills") or [])
        if row.get("skill")
    ]
    return {
        "matched": source == "match",
        "source": source,
        "name": doc.name,
        "title": doc.get("job_description_title") or doc.name,
        "description_html": description_html,
        "skills": skills,
    }


# ---------------------------------------------------------------------------
# LINK FIELD OPTIONS (mirrored from candidate_portal.get_link_field_options
# but whitelisted for desk-session callers rather than candidate-portal users)
# ---------------------------------------------------------------------------


@frappe.whitelist()
def get_link_field_options(doctype, search_text=None, query=None, txt=None, limit=20, include=None, filters=None, skip=0, **kwargs):
    """Returns [{id, label}] for a doctype; label uses title_field when set.
    Accepts `search_text`, `query`, or `txt` as the search term (first non-empty wins).
    `include` is an id (or comma-separated ids) that must always appear in the
    results — used so a pre-selected value renders its label even when it falls
    outside the fetched/searched page (e.g. one designation out of thousands).
    `filters` (dict or JSON string) narrows the base record set — e.g. limiting
    Employees to certain statuses. `include` ids bypass `filters` so a previously
    saved value always renders even if it no longer matches.
    Any additional query param that matches a real field on `doctype` is applied
    as an equality filter (e.g. ?department=DEP_353&custom_status=Active), so the
    front-end can narrow options without JSON-encoding a `filters` argument.
    `skip` is the pagination offset (number of records to skip).
    Accessible to any authenticated Frappe user (desk session or API key/secret)."""
    if not doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Doctype is required.")}

    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Doctype '{0}' not found.").format(doctype)}
    title_field = meta.get("title_field") or None

    has_title = bool(title_field) and title_field != "name"
    fields = ["name"] + ([title_field] if has_title else [])

    if isinstance(filters, str):
        filters = json.loads(filters) if filters.strip() else None
    filters = dict(filters) if filters else {}

    # Map any extra query param that corresponds to a real field on the doctype
    # to an equality filter. Empty values (e.g. an unrendered "{{ data.x }}" or a
    # cleared dependent field) are skipped so they don't filter everything out.
    for key, value in kwargs.items():
        if value in (None, "") or key in filters:
            continue
        if key == "name" or meta.has_field(key):
            filters[key] = value

    search = (search_text or query or txt or "").strip()
    or_filters = None
    if search:
        like = f"%{search}%"
        or_filters = [["name", "like", like]] + ([[title_field, "like", like]] if has_title else [])

    try:
        records = frappe.get_all(
            doctype, fields=fields, filters=filters or None, or_filters=or_filters,
            limit=int(limit or 20), start=int(skip or 0), order_by=f"{title_field or 'name'} asc",
        )
    except Exception as e:
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

    def _to_option(r):
        return {"id": r["name"], "label": (r.get(title_field) if has_title else None) or r["name"]}

    results = [_to_option(r) for r in records]

    # Always surface the pre-selected value(s) so the dropdown can label them,
    # even when they're not part of the current (searched/paginated) page.
    include_ids = [i.strip() for i in str(include or "").split(",") if i and i.strip()]
    if include_ids:
        present = {r["id"] for r in results}
        missing = [i for i in include_ids if i not in present]
        if missing:
            try:
                extra = frappe.get_all(doctype, fields=fields, filters={"name": ["in", missing]})
            except Exception:
                extra = []
            results = [_to_option(r) for r in extra] + results

    return {"status": "success", "doctype": doctype, "title_field": title_field, "total": len(results), "results": results}


def get_allowed_replacement_employee_statuses():
    """Employee statuses configured in Recruitment Settings ->
    'Allowed Replacement Employee Statuses' that an employee must have to be
    selectable as a 'Replacement For' on a Job Requisition position.
    Falls back to ['Active'] when nothing is configured."""
    rows = frappe.get_single("Recruitment Settings").get("allowed_replacement_employee_statuses") or []
    statuses = [r.employee_status for r in rows if r.employee_status]
    return statuses or ["Active"]


@frappe.whitelist()
def get_hiring_lead_options(company=None, search_text=None, query=None, txt=None, limit=20, include=None):
    """Employee options for the Job Requisition 'Hiring lead' field.

    When a **Company Wise** Hiring Lead Configuration matches `company`, the list
    is limited to Employees whose linked User is a configured hiring lead. Falls
    back to ALL Employees when no configuration matches, so requisition creation
    is never blocked. Same response shape as get_link_field_options."""
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        get_config_users_for_company,
    )

    leads, _ = get_config_users_for_company(company)
    filters = {"user_id": ["in", list(leads)]} if leads else None
    return get_link_field_options(
        "Employee", search_text=search_text, query=query, txt=txt,
        limit=limit, include=include, filters=filters,
    )


@frappe.whitelist()
def get_recruiter_options(company=None, search_text=None, query=None, txt=None, limit=20, include=None):
    """User options for the Job Requisition 'Assign to Recruiter' field.

    When a **Company Wise** Hiring Lead Configuration matches `company`, the list
    is limited to the configured recruiters. Falls back to ALL users when no
    configuration matches. Same response shape as get_link_field_options."""
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        get_config_users_for_company,
    )

    _, recruiters = get_config_users_for_company(company)
    filters = {"name": ["in", list(recruiters)]} if recruiters else None
    return get_link_field_options(
        "User", search_text=search_text, query=query, txt=txt,
        limit=limit, include=include, filters=filters,
    )


@frappe.whitelist()
def get_hiring_lead_employees(company=None, search_text=None, limit=20, skip=0):
    """UI-facing list of Employees selectable as the Job Requisition 'Hiring lead'.

    Mirrors the Desk form behaviour so the external/React UI shows the SAME list:
      * When a **Company Wise** Hiring Lead Configuration matches `company`, the
        result is limited to the configured hiring leads (Employees whose linked
        User is configured for that company).
      * When no configuration matches, ALL Employees are returned, so the flow is
        never blocked — identical to the Desk `get_hiring_lead_options` fallback.

    Unlike `get_hiring_lead_options` (which returns the Desk link-widget
    ``{id, label}`` shape), this returns the richer employee fields a form needs
    to render and store the selection. Read-only; touches no other API.

    Response::

        {
          "status": "success",
          "configured": true,            # whether a Company Wise config applied
          "total": 3,
          "results": [
            {"employee": "HR-EMP-0001", "employee_name": "...",
             "designation": "...", "department": "...", "company": "...",
             "user_id": "...", "image": "..."},
            ...
          ]
        }
    """
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        get_config_users_for_company,
    )

    leads, _ = get_config_users_for_company(company)
    # `leads` is the set of configured hiring-lead Users for this company. An empty
    # set means "no Company Wise config matched" -> no restriction (show everyone).
    filters = {"user_id": ["in", list(leads)]} if leads else {}

    search = (search_text or "").strip()
    or_filters = None
    if search:
        like = f"%{search}%"
        or_filters = [["employee_name", "like", like], ["name", "like", like]]

    fields = [
        "name as employee", "employee_name", "designation",
        "department", "company", "user_id", "image",
    ]

    try:
        records = frappe.get_all(
            "Employee",
            fields=fields,
            filters=filters or None,
            or_filters=or_filters,
            limit=int(limit or 20),
            start=int(skip or 0),
            order_by="employee_name asc",
        )
    except Exception as e:
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

    return {
        "status": "success",
        "configured": bool(leads),
        "total": len(records),
        "results": records,
    }


# ---------------------------------------------------------------------------
# Recruitment Settings → Job Requisition Settings enforcement
#
# Runs on the `validate` doc_event (registered in hooks.py) so it covers every
# save path uniformly — Desk UI, the React create/update API, scripted writes
# and imports. The singleton is read once per save via the cached single doc,
# so there is no extra load on save.
# ---------------------------------------------------------------------------


def validate_requisition_settings(doc, method=None):
    """Enforce Recruitment Settings -> Job Requisition Settings on every save.

    Only acts on requisitions that use our `custom_position_details` flow (rows
    present); legacy / HRMS-standard requisitions (which use the `vacancies`
    table) are left untouched, matching sync_no_of_positions' guard."""
    rows = doc.get("custom_position_details") or []
    if not rows:
        return

    settings = frappe.get_cached_doc("Recruitment Settings")
    _enforce_max_positions(doc, rows, settings)
    _enforce_unique_replacement(doc, rows, settings)
    _enforce_future_dated(doc, settings)
    _enforce_edit_after_approval(doc, settings)
    _enforce_initiation_lock(doc, settings)
    _enforce_requested_by_lock(doc, settings)


def _enforce_max_positions(doc, rows, settings):
    """Block saving more position rows than 'Max number of positions per
    requisition'. A value of 0 (or empty) means no limit."""
    max_positions = int(settings.get("max_positions_per_requisition") or 0)
    if max_positions > 0 and len(rows) > max_positions:
        frappe.throw(
            _("This Job Requisition has {0} positions, which exceeds the configured "
              "maximum of {1}. Reduce the positions or raise the limit in "
              "Recruitment Settings.").format(len(rows), max_positions)
        )


def _enforce_unique_replacement(doc, rows, settings):
    """When 'Allow Replacement Employee tagging to multiple requisitions' is OFF,
    a given employee may be the 'Replacement For' on only one position — neither
    twice within this requisition nor on any other live requisition (Cancelled /
    Rejected requisitions are ignored, being dead)."""
    if settings.get("allow_replacement_employee_tagging_to_multiple_requisitions"):
        return

    # 1) No duplicate within this requisition.
    seen = {}
    for idx, r in enumerate(rows, start=1):
        emp = r.get("replacement_for")
        if not emp:
            continue
        if emp in seen:
            frappe.throw(
                _("Employee {0} is selected as the replacement on more than one position "
                  "in this requisition. Each replacement employee can be tagged only once.").format(emp)
            )
        seen[emp] = idx

    if not seen:
        return

    # 2) Not already used on another live requisition.
    DEAD_STATES = ("Cancelled", "Rejected")
    existing = frappe.get_all(
        "Position Details",
        filters={
            "replacement_for": ["in", list(seen.keys())],
            "parenttype": "Job Requisition",
            "parent": ["!=", doc.name or ""],
        },
        fields=["replacement_for", "parent"],
    )
    if not existing:
        return

    live_parents = set(
        frappe.get_all(
            "Job Requisition",
            filters={"name": ["in", list({e.parent for e in existing})],
                     "status": ["not in", DEAD_STATES]},
            pluck="name",
        )
    )
    for e in existing:
        if e.parent in live_parents:
            frappe.throw(
                _("Employee {0} is already tagged as a replacement on requisition {1}. "
                  "Enable 'Allow Replacement Employee tagging to multiple requisitions' "
                  "in Recruitment Settings to allow this.").format(e.replacement_for, e.parent)
            )


def _enforce_future_dated(doc, settings):
    """When 'Allow requisitions for Future dated positions' is OFF, neither the
    Posting Date nor the Expected By date may be in the future."""
    if settings.get("allow_future_dated_positions"):
        return
    today = frappe.utils.getdate(frappe.utils.nowdate())
    for fieldname, label in (("posting_date", _("Posting Date")), ("expected_by", _("Expected By"))):
        value = doc.get(fieldname)
        if value and frappe.utils.getdate(value) > today:
            frappe.throw(
                _("{0} ({1}) is in the future. Future-dated requisitions are not allowed — "
                  "enable 'Allow requisitions for Future dated positions' in Recruitment Settings.")
                .format(label, frappe.utils.formatdate(value))
            )


# Status at which a requisition counts as "approved" for the edit-after-approval gate.
_REQUISITION_APPROVED_STATUS = "Open & Approved"

# Fields ignored when checking "did the user edit an approved requisition" — these
# are workflow/derived/framework fields, not user business edits.
_EDIT_AFTER_APPROVAL_IGNORE = {
    "status", "workflow_state", "modified", "modified_by",
    "no_of_positions", "custom_type_of_position", "time_to_fill",
    "_user_tags", "_comments", "_assign", "_liked_by",
}
_LAYOUT_FIELDTYPES = {
    "Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold",
}
_ROW_META_KEYS = {
    "name", "idx", "creation", "modified", "owner", "modified_by",
    "parent", "parentfield", "parenttype", "docstatus", "doctype",
}


def _row_snapshot(d, fieldname):
    out = []
    for r in d.get(fieldname) or []:
        rd = r.as_dict() if hasattr(r, "as_dict") else dict(r)
        out.append({k: str(v) for k, v in rd.items() if k not in _ROW_META_KEYS})
    return out


def _has_business_changes(doc, before):
    """True when any business field/child table changed between `before` and `doc`,
    ignoring workflow/derived/framework fields. Used so a pure status transition on
    an approved requisition is allowed while real edits are blocked."""
    for df in doc.meta.fields:
        if df.fieldtype in _LAYOUT_FIELDTYPES:
            continue
        fn = df.fieldname
        if fn in _EDIT_AFTER_APPROVAL_IGNORE:
            continue
        if df.fieldtype in ("Table", "Table MultiSelect"):
            if _row_snapshot(before, fn) != _row_snapshot(doc, fn):
                return True
        elif str(before.get(fn) or "") != str(doc.get(fn) or ""):
            return True
    return False


def _enforce_edit_after_approval(doc, settings):
    """When 'Allow Editing of Requisition & Job Positions after Approval' is OFF,
    a requisition already at 'Open & Approved' may not have its business fields or
    positions edited. Pure status / workflow_state moves stay allowed, so the
    approval flow and back-to-draft transitions are never blocked."""
    if settings.get("allow_editing_requisition_after_approval"):
        return
    before = doc.get_doc_before_save()
    if not before or before.get("status") != _REQUISITION_APPROVED_STATUS:
        return
    if _has_business_changes(doc, before):
        frappe.throw(
            _("This requisition is approved ({0}) and editing it is disabled. Enable "
              "'Allow Editing of Requisition & Job Positions after Approval' in Recruitment Settings.")
            .format(_REQUISITION_APPROVED_STATUS)
        )


def _enforce_initiation_lock(doc, settings):
    """When 'Disable Editing of Requisition Initiation Form' is ON, a requisition's
    business fields and positions become read-only once it has been created — only
    the very first save (creation) may set them. Pure status / workflow_state moves
    stay allowed so the requisition can still progress through its workflow.

    Default OFF -> fully editable, so existing behaviour is unchanged."""
    if not settings.get("disable_editing_requisition_initiation_form"):
        return
    before = doc.get_doc_before_save()
    if not before:
        return  # first creation is always allowed
    if _has_business_changes(doc, before):
        frappe.throw(
            _("Editing is disabled for this requisition once it has been created "
              "('Disable Editing of Requisition Initiation Form' is enabled in "
              "Recruitment Settings).")
        )


def _enforce_requested_by_lock(doc, settings):
    """The 'Requested By' employee is fixed after creation unless 'Allow Hiring
    Manager Override' is ON. Default OFF -> requested_by is read-only post-creation;
    ON -> it stays editable. The first save (creation) may always set it."""
    if settings.get("allow_hiring_manager_override"):
        return
    before = doc.get_doc_before_save()
    if not before:
        return  # first creation is always allowed
    if str(before.get("requested_by") or "") != str(doc.get("requested_by") or ""):
        frappe.throw(
            _("'Requested By' cannot be changed after the requisition is created. "
              "Enable 'Allow Hiring Manager Override' in Recruitment Settings to allow this.")
        )


@frappe.whitelist()
def get_replacement_employee_options(
    search_text=None, query=None, txt=None, limit=20, include=None,
    department=None, designation=None, location=None, company=None, functional_area=None,
):
    """Employee options for the 'Replacement For' field.

    Always limited to the allowed replacement statuses. The
    'Restriction for Replacement Employee Selection' setting in Recruitment
    Settings then narrows the list relative to the requisition's own
    designation / company — passed in via `designation` / `company` — so the
    dropdown only offers employees that would pass save-time enforcement
    (see _enforce_replacement_restriction):
      - "None"               -> no extra restriction
      - "Same Designation"   -> only employees sharing the requisition designation
      - "Same Group Company" -> only employees in the requisition's company group
    Same response shape as get_link_field_options."""
    filters = {"status": ["in", get_allowed_replacement_employee_statuses()]}

    restriction = (
        frappe.get_cached_doc("Recruitment Settings").get(
            "restriction_for_replacement_employee_selection"
        )
        or "None"
    )
    if restriction == "Same Designation" and designation:
        filters["designation"] = designation
    elif restriction == "Same Group Company" and company:
        group_companies = _company_group_members(company)
        if group_companies:
            filters["company"] = ["in", list(group_companies)]

    return get_link_field_options(
        "Employee", search_text=search_text, query=query, txt=txt,
        limit=limit, include=include, filters=filters,
    )
