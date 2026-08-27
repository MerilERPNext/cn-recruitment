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
    # Lateral (default) vs Fresher. Drives which child table the create/update
    # flow consumes — see HIRING_TYPE_FRESHER and create_job_requisition.
    "custom_hiring_type",
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
    # Existing strength vs. hiring already in flight for this designation in this
    # requisition's region(s). Counted from the masters and stored on the doc by
    # recruitment.api.requisition_headcount — read-only here so the UI can show
    # them but no caller can write them.
    "custom_active_employees",
    "custom_active_requisitions",
    "custom_active_openings",
    "custom_headcount_last_updated",
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


# Hiring type drives which child table the create/update flow consumes.
# Anything other than "Fresher" (Lateral, blank, legacy) keeps the original
# location/position-details behaviour untouched.
HIRING_TYPE_FRESHER = "Fresher"
HIRING_TYPE_LATERAL = "Lateral"
# Config-only value: a field configured as "Both" renders for either hiring type.
HIRING_TYPE_BOTH = "Both"


def _is_fresher(payload):
    """True only when the requisition is explicitly a Fresher requisition."""
    return (payload.get("custom_hiring_type") or "").strip() == HIRING_TYPE_FRESHER


def _normalise_hiring_type(value):
    """A requisition's `custom_hiring_type` → canonical "Fresher" / "Lateral".

    Mirrors _is_fresher exactly: only an explicit "Fresher" is Fresher, so blank
    and legacy values resolve to Lateral — the same bucket the create/update flow
    puts them in. Keeps render and write in lock-step."""
    return HIRING_TYPE_FRESHER if (value or "").strip() == HIRING_TYPE_FRESHER else HIRING_TYPE_LATERAL


def _validate_regions(payload):
    """Fresher flow validation — the `custom_regions` table stands in for
    `custom_position_details`. Each row needs a region and a positive opening
    count. Parent-mandatory config is still enforced."""
    _enforce_config_mandatory(frappe.new_doc(JOB_REQUISITION), payload)

    regions = _list_field(payload, "custom_regions")
    if not regions:
        frappe.throw(_("At least one region is required in `custom_regions` for a Fresher requisition."))
    for idx, r in enumerate(regions, start=1):
        if not isinstance(r, dict):
            frappe.throw(_("custom_regions[{0}] must be an object.").format(idx))
        if not r.get("region"):
            frappe.throw(_("custom_regions[{0}].region is required (grouping key).").format(idx))
        try:
            openings = int(r.get("no_of_openings") or 0)
        except (TypeError, ValueError):
            frappe.throw(_("custom_regions[{0}].no_of_openings must be a number.").format(idx))
        if openings < 1:
            frappe.throw(_("custom_regions[{0}].no_of_openings must be at least 1.").format(idx))


def _validate(payload):
    missing = [k for k in REQUIRED_PARENT_KEYS if not payload.get(k)]
    if missing:
        frappe.throw(_("Missing required fields: {0}").format(", ".join(missing)))

    # Fresher requisitions are validated against `custom_regions` instead of
    # `custom_position_details` — the Lateral path below is left exactly as-is.
    if _is_fresher(payload):
        _validate_regions(payload)
        return

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


def _group_openings_by_region(regions):
    """Fresher flow: total openings per region, preserving first-seen order.

    Mirrors _group_positions_by_location but for the `custom_regions` table —
    multiple rows for the same region are summed so one Job Requisition is
    created per unique region carrying that region's total openings."""
    totals, order = {}, []
    for r in regions:
        region = r["region"]
        if region not in totals:
            totals[region] = 0
            order.append(region)
        totals[region] += int(r.get("no_of_openings") or 0)
    return [(region, totals[region]) for region in order]


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
        # Optional sub-location under the row's Branch (filtered by `location`
        # in the form). Stored as-sent; no row requires it.
        "sub_location": p.get("sub_location"),
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
    place that the frontend reads too.

    When the hiring-type feature is on, a field is only enforced for the hiring
    types it is configured for. Without this, a Fresher-only Required field would
    block every Lateral submission (and vice versa) even though the form never
    rendered it — the mandatory set must match what the user was actually shown."""
    settings = _get_form_settings()
    overrides = _load_form_overrides(settings)
    if not overrides:
        return
    selected = _resolve_selected_hiring_type(settings, payload.get("custom_hiring_type") or "")
    missing = []
    for (applies_to, fieldname), row in overrides.items():
        if applies_to != "Parent" or row.get("mandatory_override") != "Required":
            continue
        if not _row_matches_hiring_type(row, selected):
            continue
        if payload.get(fieldname) in (None, "", []):
            df = doc.meta.get_field(fieldname)
            missing.append(df.label if df and df.label else fieldname)
    if missing:
        frappe.throw(_("Missing required fields: {0}").format(", ".join(missing)))


def _normalize_temporal(df, value):
	"""Coerce a Date / Datetime / Time payload value into the shape its column wants.

	Browsers hand back full ISO timestamps — ``2026-08-31T00:00:00+05:30`` from a
	date picker, or ``2026-08-31T18:30:00.000Z`` once ``toISOString()`` has been
	through UTC — but ``expected_by`` and ``posting_date`` are **Date** columns.
	Frappe does not coerce on assignment: ``doc.set()`` keeps the string verbatim,
	so the raw timestamp reaches MariaDB and is silently truncated (or rejected,
	depending on ``sql_mode``). Normalising here means the value stored is the day
	the user actually picked.

	The UTC case is the one that bites: ``2026-08-31T18:30:00.000Z`` *is*
	1 September in Asia/Kolkata, so trusting the leading ``YYYY-MM-DD`` text would
	be a silent off-by-one. ``getdate`` / ``get_datetime`` do the timezone-aware
	parse instead of string-slicing.

	Anything unparseable is passed through untouched, so the existing
	"Invalid value for field X" error still reports the original input rather than
	this helper swallowing it.
	"""
	if not df or not isinstance(value, str):
		return value

	try:
		if df.fieldtype == "Date":
			return frappe.utils.getdate(value)
		if df.fieldtype == "Datetime":
			return frappe.utils.get_datetime(value)
	except Exception:
		return value
	return value


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
        value = _normalize_temporal(df, value)
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
    2. `custom_type_of_position` = "New" / "Replacement" / "Both", derived from
       the rows (a row is a Replacement when it has a `replacement_for` — see
       _row_vacancy_type). Stored so PRINT and any field reader show the correct
       type, including "Both" when the requisition holds a mix. The value is
       assigned only when it is a valid Select option, so a save can never fail.

    Only acts when the table has rows — leaves fields untouched for legacy /
    HRMS-standard flows where `custom_position_details` is empty (those use the
    standard `vacancies` table, which we don't want to override). Campus/Fresher
    requisitions are the other shape with no position rows: they budget headcount
    per region, so `_sync_positions_from_regions` keeps the parent in step there.
    """
    position_rows = doc.get("custom_position_details") or []
    if not position_rows:
        _sync_positions_from_regions(doc)
        return

    doc.no_of_positions = len(position_rows)

    new = sum(1 for r in position_rows if _row_vacancy_type(r) == "New")
    replacement = len(position_rows) - new
    if new and replacement:
        vtype = "Both"
    elif replacement:
        vtype = "Replacement"
    else:
        vtype = "New"

    df = doc.meta.get_field("custom_type_of_position")
    allowed = (df.options or "").split("\n") if df else []
    if vtype in allowed:
        doc.custom_type_of_position = vtype


def _sync_positions_from_regions(doc):
    """`no_of_positions` for the Fresher / campus shape, which has no position rows.

    Those requisitions budget headcount per region (`custom_regions`), so the
    parent total is the sum of `no_of_openings`. It was only ever written once, at
    creation (`_build_region_requisition_doc`), which left it stale the moment a
    region's openings were edited — the total on the requisition no longer matched
    its own table.

    Does nothing when there are no region rows either: that is the legacy /
    HRMS-standard shape, where `no_of_positions` belongs to the standard
    `vacancies` table and must not be overwritten.
    """
    region_rows = doc.get("custom_regions") or []
    if not region_rows:
        return

    doc.no_of_positions = sum(
        frappe.utils.cint(row.get("no_of_openings")) for row in region_rows
    )


def _default_jd_name():
    """The configured default Job Description, Active versions only.

    `status` is empty on JDs created before versioning, so it is coalesced
    rather than compared directly — otherwise every legacy default would be
    treated as superseded and silently stop being served.
    """
    return frappe.db.get_value(
        JOB_DESCRIPTION,
        {"is_default": 1, "status": ["in", ("Active", "", None)]},
        "name",
    )


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
              AND COALESCE(NULLIF(jd.status, ''), 'Active') = 'Active'
            ORDER BY jd.modified DESC
            LIMIT 1
            """,
            (designation, department),
        )
        jd_name = rows[0][0] if rows else None
        if not jd_name and frappe.get_meta(JOB_DESCRIPTION).get_field("is_default"):
            jd_name = _default_jd_name()
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


def _build_region_requisition_doc(payload, region, openings):
    """Construct an unsaved Job Requisition for one region (Fresher flow).

    Parallels _build_requisition_doc but for the region grouping:
      - carries a single `custom_regions` row (this region + its openings),
      - leaves `custom_position_details` empty (Fresher requisitions don't use
        the position/location table),
      - `no_of_positions` = openings for this region,
      - `custom_type_of_position` = "New" — every Fresher requisition is New.

    sync_no_of_positions / validate_requisition_settings both no-op when
    `custom_position_details` is empty, so these values are preserved on save."""
    doc = frappe.new_doc(JOB_REQUISITION)
    _bypass_hrms_duplicate_check(doc)

    _apply_parent_fields(doc, payload)
    _ensure_description(doc, payload)

    doc.no_of_positions = openings
    doc.custom_type_of_position = "New"
    if not doc.get("custom_hiring_type"):
        doc.custom_hiring_type = HIRING_TYPE_FRESHER
    if not doc.get("custom_hiring_lead"):
        doc.custom_hiring_lead = payload.get("requested_by")

    _apply_qualifications(doc, payload)
    _apply_skills(doc, payload)
    _apply_pre_screened(doc, payload)

    doc.append("custom_regions", {"region": region, "no_of_openings": openings})

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
    # Derived mirrors of the Regions / Position Details tables — filled on save,
    # never entered, so they would only render as empty read-only boxes on the
    # requisition form.
    "custom_region", "custom_position_location",
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
    "Regions": "custom_regions",
}

# Core Lateral/Fresher switch — always rendered regardless of the settings doc's
# `restrict_to_configured` allowlist. `custom_hiring_type` is the selector (a
# parent field); `custom_regions` is its Fresher-only table, surfaced through
# `child_groups` exactly like `custom_position_details`. Without these the form
# can't switch modes, so they bypass the strict allowlist.
_ALWAYS_RENDER_PARENT = frozenset({"custom_hiring_type"})
_ALWAYS_RENDER_TABLES = frozenset({"custom_regions"})

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


def _row_order(row):
    """Sort weight of a config row. Rows with no explicit `order` sink below
    ordered ones instead of masquerading as position 0."""
    try:
        value = int(row.get("order") or 0)
    except (TypeError, ValueError):
        value = 0
    return value or _NO_EXPLICIT_ORDER


def _load_form_overrides(settings=None):
    """Overrides keyed by (applies_to, fieldname) → row dict, read from the
    single settings doc. Empty dict when nothing is configured — callers then
    fall back to pure meta. Never raises.

    A field can occupy only ONE slot, but the child table has no uniqueness
    constraint, so duplicate rows for the same field can exist (hand-added in
    the Advanced raw grid, or left behind by an older seed). This used to let
    whichever row happened to be LAST win, which made the builder show a field
    in one tab while the API emitted it in another. The lowest `order` wins
    instead: that is the slot the builder itself renders, so both agree."""
    settings = settings or _get_form_settings()
    if not settings:
        return {}
    overrides = {}
    for row in settings.get("field_overrides") or []:
        key = (row.get("applies_to") or "Parent", row.get("fieldname"))
        if not key[1]:
            continue
        current = overrides.get(key)
        if current is not None and _row_order(current) <= _row_order(row):
            continue
        overrides[key] = row
    return overrides


def _basis_hiring_type(settings=None):
    """True when the settings doc opts into per-field hiring-type filtering.

    Off (the default, and the state of every already-deployed site) makes every
    hiring-type code path below inert — the form renders exactly as it did
    before the feature existed."""
    settings = settings or _get_form_settings()
    return bool(settings and settings.get("basis_hiring_type"))


def _resolve_selected_hiring_type(settings, hiring_type):
    """The hiring type to filter config rows by, or None for "don't filter".

    None (no filtering) whenever the feature is off OR the caller didn't say
    which hiring type it is rendering — the latter is the existing "return both
    tables and toggle client-side" contract."""
    if hiring_type is None or not _basis_hiring_type(settings):
        return None
    return _normalise_hiring_type(hiring_type)


def _row_matches_hiring_type(row, selected):
    """True when an override row should render for the `selected` hiring type.

    - `selected is None`      → no filtering; every row applies.
    - row "Both"              → applies to both hiring types.
    - row blank               → applies. A blank row predates this feature (or
      was added straight to the Advanced grid), so it is type-agnostic rather
      than accidentally Fresher-only or Lateral-only.
    - otherwise               → applies only to its own hiring type.
    """
    if selected is None:
        return True
    row_type = (row.get("hiring_type") or "").strip()
    if not row_type or row_type == HIRING_TYPE_BOTH:
        return True
    return row_type == selected


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


def _child_group_fields(child_doctype, group, overrides, restrict, selected_hiring_type=None):
    """Columns for a child-table group, config-driven.

    When the settings doc has override rows for this group (applies_to == group),
    ONLY those columns are returned — in their configured order, honouring
    Hide / mandatory / read-only / label / options overrides. This is what makes
    removing a child column in the builder actually drop it from the API.

    When the group has no override rows: empty in restrict mode (nothing
    configured), else meta-first (all columns) so an unconfigured table still
    renders fully.

    `selected_hiring_type` (None unless the hiring-type feature is on AND the
    caller named a type) keeps only the columns configured for that type. The
    "was this group configured at all?" test deliberately runs against the
    UNFILTERED rows, so a group whose columns are all Fresher-only correctly
    returns nothing for Lateral instead of falling back to the full meta."""
    try:
        cmeta = frappe.get_meta(child_doctype)
    except Exception:
        return []

    configured_rows = [(fn, row) for (grp, fn), row in overrides.items() if grp == group]
    if not configured_rows:
        return [] if restrict else _child_columns(child_doctype)

    group_rows = sorted(
        [(fn, row) for fn, row in configured_rows if _row_matches_hiring_type(row, selected_hiring_type)],
        key=lambda x: int(x[1].get("order") or 0),
    )

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


# Sort weight for a tab/section holding no explicitly-ordered field — parks it
# after every configured group, still in meta order among its unconfigured peers.
_NO_EXPLICIT_ORDER = 10**9


def _sequence_key(fields, meta_seq):
    """Sort key for a tab or section: (lowest explicit `order` it holds, meta position).

    Field `order` is the only sequence HR actually sets in the builder, and it is
    per-field — so a tab/section inherits the position of its earliest-ordered
    field. Without this, tabs render in DocType meta order (first field seen wins)
    and the configured sequence is silently ignored; a field ordered 10 whose
    doctype field sits low in the meta would still render its tab last.
    """
    explicit = [f["order"] for f in fields if f["order"]]
    return (min(explicit) if explicit else _NO_EXPLICIT_ORDER, meta_seq)


@frappe.request_cache
def _is_hiring_manager_locked(fieldname):
	"""Whether ``requested_by`` must render read-only for the current user.

	Recruitment Settings → "Allow Hiring Manager Override in Requisition" decides
	whether a requisition may be raised *on behalf of* somebody else. OFF (the
	default) pins it to the logged-in employee; ON allows a System Manager or
	Administrator to change it.

	Answered here, on the form config, rather than in the React form: the
	requisition wizard builds its fields straight from this payload's
	``read_only``, so the rule lands in the one place both the wizard and any
	future consumer already read. It also means changing the setting takes effect
	on reload rather than needing a frontend rebuild.

	Note this is presentation only — it stops the field being *offered*. The
	server-side lock on changing ``requested_by`` still applies from the second
	save onward (see ``_enforce_requested_by_lock``); at creation the value is
	whatever the client sends.
	"""
	if fieldname != "requested_by":
		return False
	if frappe.utils.cint(
		frappe.db.get_single_value("Recruitment Settings", "allow_hiring_manager_override")
	):
		# Override allowed — but still only for the roles that may act for others.
		roles = set(frappe.get_roles())
		return not roles.intersection({"System Manager", "Administrator"})
	return True


def _build_form_config(doc=None, hiring_type=None):
    """Meta-first tabs → sections → fields tree for the Job Requisition form,
    with the single settings doc's overrides applied. Parent fields come from
    the doctype layout; child tables are emitted both inline (as a Table field)
    and collected under `child_groups` for convenience.

    When `Show Only Configured Fields` is on, a parent field is rendered only
    when it has a config row (strict allowlist); otherwise the whole doctype is
    rendered minus any field marked Hide.

    When `doc` (a Job Requisition) is passed, each field carries its current
    `value`, so one call powers the edit screen (config + data).

    `hiring_type` optionally resolves the Lateral/Fresher switch server-side:
    - "Fresher" keeps `custom_regions` and drops `custom_position_details`,
    - anything else (Lateral / blank) keeps `custom_position_details` and drops
      `custom_regions`.
    Omit it to get BOTH tables (the UI then toggles client-side).

    When the settings doc ticks `Configure Basis Hiring Type` AND `hiring_type`
    is passed, every configured field (parent and child column) is additionally
    filtered to those marked for that hiring type or for Both. With the tick off
    — the default, and the state of every existing site — nothing below changes
    behaviour."""
    settings = _get_form_settings()
    overrides = _load_form_overrides(settings)
    restrict = bool(settings and settings.get("restrict_to_configured"))
    basis_hiring_type = _basis_hiring_type(settings)
    # None = don't filter by hiring type (feature off, or caller didn't name one).
    selected = _resolve_selected_hiring_type(settings, hiring_type)
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
        always_render = df.fieldname in _ALWAYS_RENDER_PARENT
        # Strict allowlist: only configured fields are rendered — except the core
        # Lateral/Fresher switch fields, which must always be present.
        if restrict and ov is None and not always_render:
            continue
        # Hiring-type filter: drop a configured field that isn't marked for the
        # hiring type being rendered. The switch field itself never drops — the
        # form can't change hiring type without it.
        if ov is not None and not always_render and not _row_matches_hiring_type(ov, selected):
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
            "default": df.get("default") or "",
            "length": df.get("length") or 0,
            "order": int(ov.get("order") or 0) if ov else 0,
        }
        if _is_hiring_manager_locked(df.fieldname):
            # Applied after the override lookup on purpose: this is a policy
            # switch, not a per-field presentation choice, so a settings-doc
            # "Editable" override must not be able to unlock it.
            entry["read_only"] = 1

        if doc is not None:
            entry["value"] = doc.get(df.fieldname)

        if df.fieldtype in ("Table", "Table MultiSelect") and df.options:
            entry["child_doctype"] = df.options
            entry["child_fields"] = _child_columns(df.options, ov)

        # `seq` = first-seen (meta) position, the tie-break for tabs/sections that
        # carry no explicit `order`.
        tab = tab_map.setdefault(tab_lbl, {"order": [], "map": {}, "seq": len(tab_map)})
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
        for sec_seq, sec_lbl in enumerate(tab["order"]):
            fields = tab["map"][sec_lbl]
            # Stable sort: explicit `order` first (non-zero), meta order otherwise.
            fields.sort(key=lambda f: (f["order"] == 0, f["order"]))
            sections.append(({"section": sec_lbl, "fields": fields}, _sequence_key(fields, sec_seq)))
        # A section/tab sorts by the lowest `order` it holds, so the sequence HR
        # sets in the builder is the sequence the form renders. Groups with no
        # explicit order keep their meta order, after the configured ones.
        sections.sort(key=lambda pair: pair[1])
        sections = [sec for sec, _ in sections]
        tab_fields = [f for sec in sections for f in sec["fields"]]
        tabs.append(({"tab": tab_lbl, "sections": sections}, _sequence_key(tab_fields, tab["seq"])))
    tabs.sort(key=lambda pair: pair[1])
    tabs = [tab for tab, _ in tabs]

    # Child-table groups, config-driven: only the columns placed in the builder
    # for each group are returned (so removing one drops it from the response).
    child_groups = {}
    for group, table_field in _CHILD_TABLE_BY_GROUP.items():
        tdf = meta.get_field(table_field)
        if not tdf or tdf.fieldtype not in ("Table", "Table MultiSelect") or not tdf.options:
            continue
        always = table_field in _ALWAYS_RENDER_TABLES
        # Always-render tables return their full column set even with nothing
        # configured, so pass restrict=False for them.
        fields = _child_group_fields(
            tdf.options, group, overrides, restrict and not always, selected_hiring_type=selected
        )
        # Drop a group entirely when nothing is left for it — either because
        # restrict is on and it was never configured, or because the hiring-type
        # filter removed all of its columns. `selected is not None` only when the
        # feature is on, so this stays byte-for-byte the old rule when it is off.
        if not fields and not always and (restrict or selected is not None):
            continue
        child_groups[table_field] = {
            "group": group,
            "child_doctype": tdf.options,
            "fields": fields,
        }

    # Resolve the Lateral/Fresher switch server-side when the caller passes the
    # selected hiring type — return only the table that applies so the UI can
    # render it directly (Fresher → Regions, else → Position Details).
    if hiring_type is not None:
        drop = (
            "custom_position_details"
            if _normalise_hiring_type(hiring_type) == HIRING_TYPE_FRESHER
            else "custom_regions"
        )
        child_groups.pop(drop, None)
        for tab in tabs:
            for sec in tab["sections"]:
                sec["fields"] = [f for f in sec["fields"] if f["fieldname"] != drop]

    # A tab/section can end up empty once the hiring-type filter has run — don't
    # ship empty shells the UI would render as blank steps. Only prunes when the
    # feature resolved a hiring type, so the old shape is untouched otherwise.
    if selected is not None:
        for tab in tabs:
            tab["sections"] = [s for s in tab["sections"] if s["fields"]]
        tabs = [t for t in tabs if t["sections"]]

    return {
        "settings": JOB_REQUISITION_FORM_SETTINGS,
        "restrict_to_configured": restrict,
        "basis_hiring_type": 1 if basis_hiring_type else 0,
        "hiring_type": hiring_type,
        # Recruitment Settings -> "Allow Hiring Manager Override in Requisition".
        # Carried on the config the form already fetches rather than through a
        # second request, so the Hiring Manager field can be locked on first
        # render instead of flickering from editable to disabled.
        "allow_hiring_manager_override": frappe.utils.cint(
            frappe.db.get_single_value("Recruitment Settings", "allow_hiring_manager_override")
        ),
        "tabs": tabs,
        "child_groups": child_groups,
    }


@frappe.whitelist()
def get_job_requisition_form_config(name=None, hiring_type=None):
    """Render config for the external Job Requisition form, driven by the single
    `Job Requisition Form Settings` doc.

    - `name` optional — a Job Requisition id; when passed, fields carry their
      current `value` so the same call powers the edit screen.
    - `hiring_type` optional — "Fresher" returns the Regions table (and drops
      Position Details); "Lateral"/blank returns Position Details (and drops
      Regions). Omit to get BOTH tables and toggle client-side.
      When the settings doc ticks `Configure Basis Hiring Type`, passing this
      ALSO filters every configured field to the ones marked for that hiring
      type (or for Both) — so the caller renders `custom_hiring_type` first, then
      re-calls with the picked value to get that type's fields. `basis_hiring_type`
      in the response tells the caller whether that second call is needed.

    Returns the project response envelope with
    `{settings, restrict_to_configured, basis_hiring_type, hiring_type,
    tabs:[{tab, sections:[{section, fields:[...]}]}], child_groups}`.
    """
    try:
        doc = None
        if name:
            if not frappe.db.exists(JOB_REQUISITION, name):
                return _err(_("Job Requisition not found: {0}").format(name), http=404)
            doc = frappe.get_doc(JOB_REQUISITION, name)
            doc.check_permission("read")

        config = _build_form_config(doc=doc, hiring_type=hiring_type)
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


# ---------------------------------------------------------------------------
# Job Requisition list columns — config-driven column settings for the
# requisition LIST view. Mirrors the channel column settings
# (recruitment.api.channels._common.get_configured_columns) but sourced from
# Recruitment Settings → requisition_list_columns against Job Requisition.
#
# This is READ-ONLY config, exposed via its own endpoint. get_job_requisition
# and the create/update flow are intentionally left untouched — the frontend
# renders the list from get_requisition_list_columns (headers/order) plus the
# existing get_job_requisition payload (rows).
# ---------------------------------------------------------------------------

# Used when nothing is configured, so the list view keeps its current behaviour
# out of the box. Job Requisition fieldnames; "name" is the Requisition ID.
_DEFAULT_REQUISITION_COLUMNS = [
    "name", "designation", "department", "company",
    "status", "no_of_positions",
    # The ask is only meaningful next to what already exists: how many of this
    # designation are on the rolls in this region, and how many are already being
    # hired there. Both are stored on the requisition, so this costs no extra query.
    "custom_active_employees", "custom_active_openings",
    "posting_date", "expected_by",
]

# Column key already carries a friendlier label than the raw field for these.
_REQUISITION_COLUMN_LABEL_OVERRIDES = {"name": "Requisition ID"}


def _parse_requisition_column_fieldname(stored):
    """Extract the fieldname from a stored 'Label (fieldname)' column value (the
    Autocomplete format used by the settings table). Falls back to the trimmed
    string when it isn't in that format."""
    if not stored:
        return None
    stored = stored.strip()
    if stored.endswith(")") and "(" in stored:
        return stored[stored.rfind("(") + 1:-1].strip()
    return stored


def _requisition_column_label(jr_meta, fieldname):
    if fieldname in _REQUISITION_COLUMN_LABEL_OVERRIDES:
        return _REQUISITION_COLUMN_LABEL_OVERRIDES[fieldname]
    df = jr_meta.get_field(fieldname)
    if df and df.label:
        return df.label
    return fieldname.replace("_", " ").title()


def get_configured_requisition_columns():
    """Ordered, enabled list columns for the Job Requisition list view, from
    Recruitment Settings → requisition_list_columns. Returns a list of
    {"fieldname", "label", "value_key"}. Falls back to a default column set when
    nothing is configured, so the list view keeps working out of the box.
    Disabled rows, blanks, duplicates and fields that don't exist on Job
    Requisition (except "name") are dropped."""
    jr_meta = frappe.get_meta(JOB_REQUISITION)

    fieldnames = []
    settings = frappe.get_cached_doc("Recruitment Settings")
    for row in settings.get("requisition_list_columns") or []:
        if not row.get("enable"):
            continue
        fn = _parse_requisition_column_fieldname(row.get("column"))
        if fn:
            fieldnames.append(fn)

    if not fieldnames:
        fieldnames = list(_DEFAULT_REQUISITION_COLUMNS)

    columns, seen = [], set()
    for fn in fieldnames:
        if fn in seen or (fn != "name" and not jr_meta.has_field(fn)):
            continue
        seen.add(fn)
        columns.append({
            "fieldname": fn,
            "label": _requisition_column_label(jr_meta, fn),
            "value_key": fn,
        })
    return columns


@frappe.whitelist()
def get_requisition_list_columns():
    """OPTIONAL columns-only endpoint. The same `columns` payload is ALSO returned
    inside get_job_requisition (list mode) under data.columns, so the frontend can
    render the whole list from ONE call and does NOT need to hit this endpoint.

    Kept only for callers that want the column config on its own (e.g. render the
    header before the rows load, or a settings preview). Returns the standard
    envelope with data = {"columns": [{"fieldname", "label", "value_key"}, ...]},
    where `value_key` is the key the flat get_job_requisition payload carries the
    display value under — no translation layer on the frontend.

    Read-only: get_job_requisition and the requisition create/update flow are
    unaffected."""
    return _ok(
        message=_("Requisition list columns fetched."),
        data={"columns": get_configured_requisition_columns()},
        http=200,
    )


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
                # Inert unless `basis_hiring_type` is ticked; "Lateral" is the
                # documented default for a newly-configured field.
                "hiring_type": HIRING_TYPE_LATERAL,
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

        fresher = _is_fresher(payload)
        if fresher:
            # Fresher flow: group the `custom_regions` rows by region and create
            # one requisition per unique region.
            groups = _group_openings_by_region(_list_field(payload, "custom_regions"))
        else:
            # Lateral (default) flow — unchanged.
            positions = _list_field(payload, "custom_position_details")
            groups = _group_positions_by_location(positions)

        results = []
        savepoint = "create_job_requisition"
        frappe.db.savepoint(savepoint)
        try:
            # One fresh Job Requisition per group in THIS submission — by location
            # for Lateral, by region for Fresher. Each carries only its own group's
            # data. We deliberately do NOT merge into requisitions from earlier
            # submissions — every submit stands on its own.
            if fresher:
                for region, openings in groups:
                    doc = _build_region_requisition_doc(payload, region, openings)
                    doc.insert(ignore_permissions=False)
                    results.append(
                        {
                            "name": doc.name,
                            "region": region,
                            "positions_count": openings,
                            "action": "created",
                        }
                    )
            else:
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
ACTIVE_STATUSES = ("Approved Draft", "Approved Active")
CLOSED_STATUSES = ("Auto Archived", "Archived", "Cancelled", "Rejected")


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
        - a mix of both              -> "Both"
        - no positions (edge case)   -> the stored parent value

    Per-row `vacancy_type` is itself derived from `replacement_for`
    (see _row_vacancy_type), so this stays correct on create and update alike.
    Returns: {"total": int, "new": int, "replacement": int, "type": str}
    """
    rows = doc.get("custom_position_details") or []
    new = sum(1 for r in rows if _row_vacancy_type(r) == "New")
    replacement = sum(1 for r in rows if _row_vacancy_type(r) == "Replacement")
    if new and replacement:
        vtype = "Both"
    elif replacement:
        vtype = "Replacement"
    elif new:
        vtype = "New"
    else:
        vtype = doc.get("custom_type_of_position")
    return {"total": new + replacement, "new": new, "replacement": replacement, "type": vtype}


# ---------------------------------------------------------------------------
# Approval allocation — "to whom is this requisition's approval currently
# allocated". Surfaced on each requisition so the UI can show the pending
# approver(s) on hover over the status. Mirrors the `allocated_to` object shape
# of cn_leave_shift_managment.api.get_open_approval_todos:
#     [{"name": <full name>, "employee": <employee id>, "designation_name": <designation>}]
#
# The data lives on the Nextai Approval Tracker created when an approval matrix
# applies (doc_type="Job Requisition", doc_name=<req>). The current allocation is
# the set of approvers on the tracker's Approval Log Entry rows whose status is
# still "Pending". Requisitions without a matrix/tracker are unaffected ([]).
# ---------------------------------------------------------------------------

def _approval_users_from_log(row):
    """User ids for one pending Approval Log Entry: the primary `user` plus any
    `custom_allocated_to_users` (a comma-separated list of users)."""
    users = []
    if row.get("user"):
        users.append(str(row["user"]).strip())
    raw = row.get("custom_allocated_to_users")
    if raw:
        users.extend(u.strip() for u in str(raw).split(",") if u.strip())
    return users


def _approval_user_info(user_id):
    """{name, employee, designation_name} for an approver user — same keys as the
    leave/shift `allocated_to` object. `designation_name` is the approver's
    Employee designation (None when they have no Employee record)."""
    full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
    emp = frappe.db.get_value(
        "Employee", {"user_id": user_id}, ["name", "designation"], as_dict=True
    )
    return {
        "name": full_name,
        "employee": emp.name if emp else None,
        "designation_name": (emp.designation if emp else None) or None,
    }


def _get_requisition_approval_allocation(name):
    """Current pending approvers for a Job Requisition, as a list of
    {name, employee, designation_name} (the get_open_approval_todos `allocated_to`
    shape). Anchored on the Approval Tracker for this requisition; returns [] when
    there is no tracker, the tracker isn't Pending, or nothing is currently
    allocated. Never raises — any lookup failure yields []."""
    try:
        tracker_name = frappe.db.get_value(
            "Approval Tracker",
            {"doc_type": JOB_REQUISITION, "doc_name": name, "status": "Pending"},
            "name",
            order_by="modified desc",
        )
        if not tracker_name:
            return []

        pending_logs = frappe.get_all(
            "Approval Log Entry",
            filters={
                "parent": tracker_name,
                "parenttype": "Approval Tracker",
                "parentfield": "approval_logs",
                "status": "Pending",
            },
            fields=["user", "custom_allocated_to_users"],
        )

        allocation, seen = [], set()
        for log_row in pending_logs:
            for user_id in _approval_users_from_log(log_row):
                if user_id in seen:
                    continue
                seen.add(user_id)
                allocation.append(_approval_user_info(user_id))
        return allocation
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "get_requisition_approval_allocation failed"
        )
        return []


def _config_exposed_parent_fields():
    """Parent fieldnames exposed via Form Settings that the static
    PARENT_WRITABLE_FIELDS / PARENT_READONLY_FIELDS tuples don't already cover.

    Memoised for the request: list mode serialises up to 100 requisitions per
    call and the answer is identical for every one of them, so this must not be
    recomputed per row. `frappe.local` is torn down between requests, so a
    settings change is picked up on the next call."""
    cached = getattr(frappe.local, "_jr_config_exposed_fields", None)
    if cached is not None:
        return cached

    static = set(PARENT_WRITABLE_FIELDS) | set(PARENT_READONLY_FIELDS)
    meta = frappe.get_meta(JOB_REQUISITION)
    fields = []
    for (applies_to, fieldname), row in _load_form_overrides().items():
        if applies_to != "Parent" or fieldname in static:
            continue
        if row.get("expose") == "Hide":
            continue
        df = meta.get_field(fieldname)
        if not df or df.fieldtype in _LAYOUT_TYPES or df.fieldtype in CHILD_TABLE_FIELDTYPES:
            continue
        fields.append(fieldname)

    frappe.local._jr_config_exposed_fields = fields
    return fields


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
        # Pending approver(s) this requisition's approval is currently allocated
        # to, for the status-hover UI. [] unless an approval matrix/tracker is
        # active and Pending. Same object shape as the leave/shift
        # get_open_approval_todos `allocated_to`.
        "approval_allocation": _get_requisition_approval_allocation(doc.name),
    }

    for field in PARENT_WRITABLE_FIELDS:
        out[field] = doc.get(field)
    for field in PARENT_READONLY_FIELDS:
        out[field] = doc.get(field)

    # Fields added through Job Requisition Form Settings are not in the static
    # tuples above — including virtual ("managed") fields, which is how fields
    # get added at all once the doctype is near MariaDB's row-size limit. Emit
    # every parent field the config exposes, or a configured field would accept
    # a value on write (see _get_writable_parent_fields) and always read back
    # missing. Child tables are serialised explicitly further down.
    for fieldname in _config_exposed_parent_fields():
        if fieldname not in out:
            out[fieldname] = doc.get(fieldname)

    # `custom_work_experience` is a legacy alias for the real Select field
    # `custom_work_experience_range`. The real field doesn't exist under the
    # alias name, so echo its value under both keys — a UI bound to either name
    # then shows the stored value instead of an empty box.
    out["custom_work_experience"] = out.get("custom_work_experience_range")

    # Vacancy mix. A requisition may contain BOTH New and Replacement positions,
    # so a single type is ambiguous — expose explicit counts plus a 3-state type
    # ("New" / "Replacement" / "Both"). `custom_type_of_position` mirrors the
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
            # Active employees already doing this designation, in this department,
            # at this location — the lateral answer to "do we already have these
            # people". Stored per row by recruitment.api.requisition_headcount.
            "active_employees": row.get("active_employees") or 0,
            "sub_location": row.get("sub_location"),
            "reporting_manager": row.get("reporting_manager"),
            "replacement_for": row.get("replacement_for"),
            "employee_type": row.get("employee_type"),
            "functional_area": row.get("functional_area"),
            # JSON string in DB → clean list of {cost_center, percentage}
            # for the UI. Empty list when the field is unset or malformed.
            "cost_center_allocations": _serialise_cost_center_allocations(
                row.get("cost_center_allocations")
            ),
            # Outcome of this position's own approval, stamped by a row-level
            # approval stage. Blank on requisitions whose matrix approves the
            # document as a whole rather than per position.
            "approval_status": row.get("approval_status"),
            "approved_by": row.get("approved_by"),
            "approved_on": row.get("approved_on"),
            # Child row name — the key the approval flow's row_approvals use, so
            # a per-position approval can be matched back to its row.
            "row_name": row.get("name"),
        }
        for row in doc.get("custom_position_details") or []
    ]

    # Fresher requisitions carry their openings in `custom_regions` instead.
    out["custom_regions"] = [
        {
            "region": row.get("region"),
            "no_of_openings": row.get("no_of_openings"),
            # Per-region existing strength / live demand, so the UI can show each
            # region's "asking for N, already have M" line next to its ask.
            "active_employees": row.get("active_employees") or 0,
            "active_requisitions": row.get("active_requisitions") or 0,
            "active_openings": row.get("active_openings") or 0,
        }
        for row in doc.get("custom_regions") or []
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

    # Which detail tables actually carry rows. A Lateral requisition fills
    # `custom_position_details` and a Fresher one fills `custom_regions`, so a
    # caller can render only the table that has data instead of guessing from
    # the hiring type or counting the arrays itself.
    out["available_tables"] = {
        "position_details": bool(out["custom_position_details"]),
        "regions": bool(out["custom_regions"]),
        "position_summary": bool(out["custom_position_summary"]),
    }

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
                # Configured list-view columns (headers + order), bundled here so
                # the frontend renders the list from a single call. Same payload as
                # the standalone get_requisition_list_columns endpoint.
                "columns": get_configured_requisition_columns(),
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

        # Fresher flow: rewrite the `custom_regions` table when provided. Unlike
        # create, update targets one existing requisition, so rows are replaced
        # in place (no re-grouping/splitting). `no_of_positions` becomes the sum
        # of the openings and the type stays "New".
        if "custom_regions" in payload:
            regions = _list_field(payload, "custom_regions")
            doc.set("custom_regions", [])
            total_openings = 0
            for r in regions:
                if not isinstance(r, dict) or not r.get("region"):
                    continue
                openings = int(r.get("no_of_openings") or 0)
                total_openings += openings
                doc.append("custom_regions", {"region": r["region"], "no_of_openings": openings})
            if doc.get("custom_regions"):
                doc.no_of_positions = total_openings
                doc.custom_type_of_position = "New"

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

    Only Active versions are considered — a superseded JD stays readable as a
    record but must never be matched into a new requisition.
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
              AND COALESCE(NULLIF(jd.status, ''), 'Active') = 'Active'
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
          AND COALESCE(NULLIF(jd.status, ''), 'Active') = 'Active'
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
            "skills": ["Python", "Django"],
            "prefill": {
              "custom_experience_range_from": "3",
              "custom_experience_range_to": "5",
              "custom_functional_area": ["Engineering"],
              "custom_skills": ["Python", "Django"]
            }
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
    - `prefill` holds the matched JD's own field values, already keyed by
      JOB REQUISITION fieldnames (see JD_TO_REQUISITION_PREFILL), so the form
      can apply them directly — e.g. the JD's
      min/max_preferred_work_experience_years arrive as
      custom_experience_range_from / custom_experience_range_to.
      Only fields the JD actually fills are present; a missing key means
      "leave the current form value alone". Present (possibly empty) on every
      source, including "none".
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
        default_name = _default_jd_name()
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
                "prefill": {},
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
        beautify_jd_html,
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

    description_html = beautify_jd_html(rendered)
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
        "prefill": _jd_prefill_values(doc),
    }


# ---------------------------------------------------------------------------
# JD → Job Requisition prefill
# ---------------------------------------------------------------------------

# Maps a Job Description fieldname to the Job Requisition fieldname it should
# populate on the React requisition form once designation + department resolve
# a JD. Keyed by JD fieldname → (requisition fieldname, coercion).
#
# `coercion` normalises the JD value into the shape the requisition field
# expects:
#   "num"     → Float rendered for a Data field ("3.0" → "3", 2.5 → "2.5").
#   "rows:X"  → child rows flattened to the plain values under child key X.
#   "quals:X" → child rows turned into {qualification, mandatory} objects, the
#               shape `custom_qualifications` accepts (a flat list is skipped).
#   None      → passed through untouched.
#
# To surface another JD field on the requisition, add one line here — nothing
# else in the flow needs to change.
JD_TO_REQUISITION_PREFILL = {
    # Experience
    "min_preferred_work_experience_years": ("custom_experience_range_from", "num"),
    "max_preferred_work_experience_years": ("custom_experience_range_to", "num"),
    # Applicability
    "company": ("company", None),
    "functional_area": ("custom_functional_area", "rows:functional_area"),
    # Skills — same child doctype on both sides (Job Requisition Skill).
    "skills": ("custom_skills", "rows:skill"),
    # Education — the JD's degrees become the requisition's qualifications.
    "degree": ("custom_qualifications", "quals:degree"),
}


def _prefill_number(value):
    """Render a JD Float for a Data-typed requisition field: 3.0 → "3",
    2.5 → "2.5". Returns None when there is nothing to prefill (0 included —
    a JD leaves these blank rather than meaning "zero years")."""
    if value in (None, "", 0):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if not num:
        return None
    return str(int(num)) if num.is_integer() else str(num)


def _prefill_rows(value, child_key):
    """Flatten JD child rows to the plain values the requisition form binds to,
    e.g. skills → ["Python", "Django"]. Accepts row objects, dicts, or values
    already flattened to plain IDs."""
    out = []
    for row in value or []:
        if isinstance(row, str):
            item = row
        elif isinstance(row, dict):
            item = row.get(child_key)
        else:
            item = getattr(row, child_key, None)
        if item and item not in out:
            out.append(item)
    return out


def _prefill_qualifications(value, child_key):
    """JD degree rows → the objects `custom_qualifications` accepts.

    That table stores {qualification, mandatory} rows, so a flat list of degree
    names would be discarded by _apply_qualifications, which skips anything that
    is not an object. `mandatory` defaults to "Required", matching what that
    function assumes when the caller omits it.
    """
    return [
        {"qualification": item, "mandatory": "Required"}
        for item in _prefill_rows(value, child_key)
    ]


def _jd_prefill_values(doc):
    """Return the matched JD's values keyed by JOB REQUISITION fieldnames, so
    the frontend can drop the dict straight onto the requisition form once
    designation + department pick a JD.

    Only fields the JD actually carries a value for are included — an absent
    key means "JD says nothing, leave whatever the user typed". Never raises;
    a bad mapping entry is skipped rather than failing the whole preview.
    """
    prefill = {}
    for jd_field, (req_field, coercion) in JD_TO_REQUISITION_PREFILL.items():
        try:
            raw = doc.get(jd_field)
            if coercion == "num":
                value = _prefill_number(raw)
            elif coercion and coercion.startswith("rows:"):
                value = _prefill_rows(raw, coercion.split(":", 1)[1]) or None
            elif coercion and coercion.startswith("quals:"):
                value = _prefill_qualifications(raw, coercion.split(":", 1)[1]) or None
            else:
                value = raw or None
            if value is not None:
                prefill[req_field] = value
        except Exception:
            continue
    return prefill


# ---------------------------------------------------------------------------
# LINK FIELD OPTIONS (mirrored from candidate_portal.get_link_field_options
# but whitelisted for desk-session callers rather than candidate-portal users)
# ---------------------------------------------------------------------------


def _requisition_scope_name_filter(doctype, company=None, department=None, designation=None):
    """`["in", [...]]` limiting `doctype` to what Raise Requisition Scope lets the
    session user raise for, or None when that field is unrestricted for them.

    Backs the `requisition_scope=1` flag on :func:`get_link_field_options` so the
    ESS/React requisition form offers exactly the Companies / Departments /
    Designations the Desk form does — the pickers can't offer a value the
    before_insert gate would then reject.

    The allowance is context-aware, so pass whatever the form has already chosen.
    """
    field = {"Company": "company", "Department": "department", "Designation": "designation"}.get(doctype)
    if not field:
        return None

    from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
        allowed_requisition_values,
    )

    allowance = allowed_requisition_values(
        company=company, department=department, designation=designation
    ).get(field)
    # Absent means no configured assignment restricts this field at all, which is
    # unrestricted. Treating a missing entry as an empty allowance would return
    # `["in", [""]]` below and block every value — the exact inversion of what
    # "nobody scoped this" means.
    if allowance is None or allowance.get("unrestricted"):
        return None
    # No permitted values ⇒ match nothing. `[""]` rather than `[]` because an
    # empty IN list is dropped by the query builder, which would silently show
    # everything — the opposite of what a deny-by-default scope means.
    return ["in", allowance.get("values") or [""]]


@frappe.whitelist()
def get_link_field_options(
    doctype, search_text=None, query=None, txt=None, limit=20, include=None, filters=None, skip=0,
    requisition_scope=None, req_company=None, req_department=None, req_designation=None, **kwargs,
):
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
    # Only fields backed by an actual column are filterable — layout/child-table
    # fields (Table, Table MultiSelect, HTML, Section Break, …) have no column on
    # the doctype's table, so equality-filtering them raises "Unknown column".
    from frappe.model import no_value_fields

    for key, value in kwargs.items():
        if value in (None, "") or key in filters:
            continue
        if key == "name":
            filters[key] = value
            continue
        df = meta.get_field(key)
        if df and df.fieldtype not in no_value_fields:
            filters[key] = value

    # Opt-in Raise Requisition Scope restriction. Deliberately a flag rather than
    # always-on: this endpoint serves link pickers across the whole app, and
    # Company/Department/Designation elsewhere (Job Offer, reports) must not be
    # narrowed by a requisition-raising rule.
    if frappe.utils.cint(requisition_scope or 0):
        scope_filter = _requisition_scope_name_filter(
            doctype, company=req_company, department=req_department, designation=req_designation
        )
        if scope_filter is not None:
            existing = filters.get("name")
            if isinstance(existing, (list, tuple)) and len(existing) == 2 and existing[0] == "in":
                # Intersect rather than overwrite, so a caller-supplied name
                # filter still applies.
                filters["name"] = ["in", [v for v in existing[1] if v in set(scope_filter[1])] or [""]]
            elif existing:
                filters["name"] = existing if existing in scope_filter[1] else ""
            else:
                filters["name"] = scope_filter

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
def get_hiring_lead_options(company=None, employee=None, search_text=None, query=None, txt=None, limit=20, include=None):
    """Employee options for the Job Requisition 'Hiring lead' field.

    Limited to configured hiring leads when a Hiring Lead Configuration matches —
    **Company Wise** by `company`, or **Assignment Framework** by `employee` (the
    requisition's Hiring Manager / Requested By). Falls back to ALL Employees when
    no configuration matches, so requisition creation is never blocked. Same
    response shape as get_link_field_options."""
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        get_config_users,
    )

    leads, _ = get_config_users(company, employee)
    filters = {"user_id": ["in", list(leads)]} if leads else None
    return get_link_field_options(
        "Employee", search_text=search_text, query=query, txt=txt,
        limit=limit, include=include, filters=filters,
    )


@frappe.whitelist()
def get_recruiter_options(company=None, employee=None, search_text=None, query=None, txt=None, limit=20, include=None):
    """User options for the Job Requisition 'Assign to Recruiter' field.

    Limited to configured recruiters when a Hiring Lead Configuration matches —
    **Company Wise** by `company`, or **Assignment Framework** by `employee` (the
    requisition's Hiring Manager / Requested By). Falls back to ALL users when no
    configuration matches. Same response shape as get_link_field_options."""
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        get_config_users,
    )

    _, recruiters = get_config_users(company, employee)
    filters = {"name": ["in", list(recruiters)]} if recruiters else None
    return get_link_field_options(
        "User", search_text=search_text, query=query, txt=txt,
        limit=limit, include=include, filters=filters,
    )


@frappe.whitelist()
def get_hiring_lead_employees(company=None, employee=None, search_text=None, limit=20, skip=0):
    """UI-facing list of Employees selectable as the Job Requisition 'Hiring lead'.

    Mirrors the Desk form behaviour so the external/React UI shows the SAME list:
      * When a **Company Wise** Hiring Lead Configuration matches `company`, the
        result is limited to the configured hiring leads (Employees whose linked
        User is configured for that company).
      * When an **Assignment Framework** Hiring Lead Configuration matches
        `employee` (the requisition's Hiring Manager / Requested By, via its
        Dynamic User Assignments), the configured hiring leads are added too.
      * When no configuration matches either key, ALL Employees are returned, so
        the flow is never blocked — identical to the Desk fallback.

    `employee` is the Employee ID whose Assignment Framework membership drives the
    match; pass the requisition's Hiring Manager. Company Wise callers may omit it.

    Unlike `get_hiring_lead_options` (which returns the Desk link-widget
    ``{id, label}`` shape), this returns the richer employee fields a form needs
    to render and store the selection. Read-only; touches no other API.

    Response::

        {
          "status": "success",
          "configured": true,            # whether any config restricted the list
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
        get_config_users,
    )

    leads, _ = get_config_users(company, employee)
    # `leads` is the set of configured hiring-lead Users matched via the Company
    # Wise (`company`) and/or Assignment Framework (`employee`) paths. An empty set
    # means "no config matched" -> no restriction (show everyone).
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
    _enforce_position_vacancy_type(doc, settings)
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


def _enforce_position_vacancy_type(doc, settings):
    """When 'Allow only New or Replacement type' is ON and a specific type is
    selected (New or Replacement), reject requisitions whose position mix does
    not match.  'Both' in the setting means no restriction.

    Relies on sync_no_of_positions (runs first in the validate hook chain)
    having already written the correct value into custom_type_of_position."""
    if not settings.get("allow_only_new_or_replacement_type"):
        return
    restriction = settings.get("allowed_position_vacancy_type") or "Both"
    if restriction == "Both":
        return

    current = doc.get("custom_type_of_position")
    if not current or current == restriction:
        return

    type_labels = {
        "New": _("New"),
        "Replacement": _("Replacement"),
        "Both": _("New and Replacement (mixed)"),
    }
    current_label = type_labels.get(current, current)
    frappe.throw(
        _("Recruitment Settings only allows <b>{0}</b> vacancy type positions. "
          "This requisition contains <b>{1}</b> positions. "
          "Please update the positions or change the setting in Recruitment Settings.").format(
            restriction, current_label
        ),
        title=_("Position Type Restriction"),
    )


# Edit-after-approval gate. A tuple, not one value: the old "Open & Approved"
# meant both approved-and-awaiting-activation AND activated, so omitting either
# here would silently unlock an activated requisition for editing.
_REQUISITION_APPROVED_STATUSES = ("Approved Draft", "Approved Active")

# Fields ignored when checking "did the user edit an approved requisition" — these
# are workflow/derived/framework fields, not user business edits.
_EDIT_AFTER_APPROVAL_IGNORE = {
    "status", "workflow_state", "modified", "modified_by",
    "no_of_positions", "custom_type_of_position", "time_to_fill",
    "_user_tags", "_comments", "_assign", "_liked_by",
    # Existing-strength / live-hiring roll-ups. Counted from the masters and
    # rewritten after every save (see recruitment.api.requisition_headcount), and
    # previewed on the client while the form is open — so they legitimately differ
    # from the stored value without anyone having edited the requisition.
    "custom_active_employees", "custom_active_requisitions", "custom_active_openings",
    "custom_headcount_last_updated",
    # Parent mirrors of where the requisition hires — the Regions table's region
    # and the Position Details table's location (see
    # recruitment.customizations.job_requisition_region). Derived, never typed —
    # and both tables they are copied from are themselves guarded, so ignoring
    # them here gives nothing away while letting a pre-existing requisition pick
    # the values up on its next save.
    "custom_region", "custom_position_location",
}
_LAYOUT_FIELDTYPES = {
    "Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold",
}
_ROW_META_KEYS = {
    "name", "idx", "creation", "modified", "owner", "modified_by",
    "parent", "parentfield", "parenttype", "docstatus", "doctype",
}
# Child-row columns that are derived, not entered — same reasoning as the parent
# entries above, for the per-region breakdown on custom_regions.
_ROW_DERIVED_KEYS = {"active_employees", "active_requisitions", "active_openings"}


def _row_snapshot(d, fieldname):
    ignore = _ROW_META_KEYS | _ROW_DERIVED_KEYS
    out = []
    for r in d.get(fieldname) or []:
        rd = r.as_dict() if hasattr(r, "as_dict") else dict(r)
        out.append({k: str(v) for k, v in rd.items() if k not in ignore})
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
    if not before or before.get("status") not in _REQUISITION_APPROVED_STATUSES:
        return
    if _has_business_changes(doc, before):
        frappe.throw(
            _("This requisition is approved ({0}) and editing it is disabled. Enable "
              "'Allow Editing of Requisition & Job Positions after Approval' in Recruitment Settings.")
            .format(before.get("status"))
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


def _company_group_members(company):
    """Companies in the same corporate group as `company`, via ERPNext's Company
    tree (parent_company / is_group / nested-set lft-rgt).

    Returns a set that always includes `company` itself. When the company has no
    group parent, or the tree isn't set up, it falls back to just ``{company}``
    so the "Same Group Company" filter degrades to the company itself rather than
    erroring."""
    if not company:
        return set()
    members = {company}
    try:
        parent = frappe.db.get_value("Company", company, "parent_company")
        if not parent:
            return members
        grp = frappe.db.get_value("Company", parent, ["lft", "rgt"], as_dict=True)
        if grp and grp.get("lft") is not None and grp.get("rgt") is not None:
            members.update(
                frappe.get_all(
                    "Company",
                    filters={"lft": [">=", grp.lft], "rgt": ["<=", grp.rgt]},
                    pluck="name",
                )
            )
    except Exception:
        # Never let group resolution break the picker — restrict to the company.
        pass
    return members


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


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def unassociated_job_opening_query(doctype, txt, searchfield, start, page_len, filters):
    """Link-field query for the "Activate Job Requisition" Job Opening picker.

    A Job Opening belongs to at most one requisition (activate_job_requisition below
    rejects anything else), so the picker must not offer openings that are already
    associated — otherwise every already-linked opening shows up and the user only
    finds out it was invalid after picking it.

    Offered: openings with status Open whose `job_requisition` is unset, plus the one
    this requisition already holds (so re-activating the same pair still works).
    `filters` carries the requisition in `job_requisition` and its optional
    company / designation / department scope.
    """
    from frappe.query_builder import Order

    filters = dict(filters or {})
    requisition = filters.get("job_requisition")

    jo = frappe.qb.DocType("Job Opening")
    query = (
        frappe.qb.from_(jo)
        .select(jo.name, jo.job_title, jo.designation, jo.status)
        .where(jo.status == "Open")
    )

    for key in ("company", "designation", "department"):
        value = filters.get(key)
        if value:
            query = query.where(getattr(jo, key) == value)

    # Unset is stored as NULL here, but tolerate "" too — a Link cleared through some
    # other path can land as an empty string.
    available = jo.job_requisition.isnull() | (jo.job_requisition == "")
    if requisition:
        available = available | (jo.job_requisition == requisition)
    query = query.where(available)

    if txt:
        like = f"%{txt}%"
        query = query.where(jo.name.like(like) | jo.job_title.like(like) | jo.designation.like(like))

    return (
        query.orderby(jo.job_title, order=Order.asc)
        .limit(page_len)
        .offset(start)
        .run()
    )


@frappe.whitelist()
def activate_job_requisition(job_requisition, job_opening):
    """"Activate Job Requisition" — associate an existing Job Opening with the
    requisition (mirrors HRMS's "Associate Job Opening": stamps job_requisition +
    vacancies onto the chosen Job Opening) and move it to "Approved Active".

    Activation is the Approved Draft -> Approved Active step in the requisition
    status matrix: approval is already done, and linking the opening is what makes
    the positions available to link to a candidate when raising an offer. Each
    position row moves from Draft to Open at the same time, so the position status
    tracks the requisition rather than sitting at its creation default."""
    if not job_requisition or not job_opening:
        frappe.throw(frappe._("Both Job Requisition and Job Opening are required."))
    frappe.has_permission("Job Requisition", "write", doc=job_requisition, throw=True)
    frappe.has_permission("Job Opening", "write", doc=job_opening, throw=True)

    # Same gate the form buttons read, so the list-view action and any direct API
    # call are held to the requisition/position status matrix too. Imported here
    # rather than at module scope: requisition_status is a sibling API module and
    # a top-level import would couple the two files' load order.
    from recruitment.api.requisition_status import (
        ACTIVATE,
        _require_action,
        mark_requisition_active,
    )

    _require_action(job_requisition, ACTIVATE)

    # Strict one opening <-> one requisition:
    # (a) the opening must not already belong to a *different* requisition.
    existing_req = frappe.db.get_value("Job Opening", job_opening, "job_requisition")
    if existing_req and existing_req != job_requisition:
        frappe.throw(
            frappe._("Job Opening {0} is already associated with Job Requisition {1}.").format(
                frappe.bold(job_opening), frappe.bold(existing_req)
            ),
            title=frappe._("Already Associated"),
        )
    # (b) the requisition must not already have a *different* opening.
    existing_opening = frappe.db.get_value(
        "Job Opening", {"job_requisition": job_requisition, "name": ["!=", job_opening]}, "name"
    )
    if existing_opening:
        frappe.throw(
            frappe._("Job Requisition {0} is already associated with Job Opening {1}.").format(
                frappe.bold(job_requisition), frappe.bold(existing_opening)
            ),
            title=frappe._("Already Associated"),
        )

    doc = frappe.get_doc("Job Requisition", job_requisition)
    # associate_job_opening is inherited from the HRMS JobRequisition class.
    doc.associate_job_opening(job_opening)

    # Activating a requisition opens it up: the requisition becomes Approved
    # Active and every position that was still Draft becomes Open. Positions
    # already Filled / On Hold / Archived are left as they are. Shared with the
    # Job Opening hook so this action and "Create Job Opening" cannot diverge.
    mark_requisition_active(job_requisition)

    return {
        "job_requisition": job_requisition,
        "job_opening": job_opening,
        "status": "Approved Active",
    }


# ---------------------------------------------------------------------------
# Approval flow — what the requisition's approval has done so far.
#
# Backs the "Approval Flow" tab in the requisition drawer. The data lives on the
# Nextai Approval Tracker created when an approval matrix applies; a requisition
# with no tracker simply reports has_approval = False so the UI hides the tab.
#
# A row-level stage (one approval task per position) contributes SEVERAL logs
# under a single stage index, so each stage is returned with an aggregate status
# plus a per-position breakdown.
# ---------------------------------------------------------------------------

def _aggregate_stage_logs(logs):
    """Stage-level status for logs that share a stage. Delegates to nextai so the
    tab and the approval engine can never disagree about when a stage is done."""
    try:
        from nextai.funnel.doctype.funnel_task.utils.row_approval import (
            aggregate_row_log_status,
        )

        return aggregate_row_log_status(logs)
    except Exception:
        statuses = [(l.get("status") or "Pending") for l in logs if (l.get("status") or "") != "Cancelled"]
        total = len(statuses)
        actioned = sum(1 for s in statuses if s != "Pending")
        if not statuses or actioned < total:
            status = "Pending"
        elif "Rejected" in statuses:
            status = "Rejected"
        else:
            status = "Approved"
        return {"status": status, "actioned": actioned, "total": total}


def _split_users(*values):
    """User ids out of the comma-separated columns an approval log uses."""
    out = []
    for value in values:
        for uid in str(value or "").split(","):
            uid = uid.strip()
            if uid and uid not in out:
                out.append(uid)
    return out


def _approval_display_names(user_ids):
    """{user_id: display name} for a whole flow in one query.

    Prefers the Employee name (what an HR user recognises) and falls back to the
    User's full name, then the id itself.
    """
    user_ids = [u for u in dict.fromkeys(user_ids) if u]
    if not user_ids:
        return {}

    names = {
        row["name"]: row.get("full_name") or row["name"]
        for row in frappe.get_all(
            "User", filters={"name": ["in", user_ids]}, fields=["name", "full_name"]
        )
    }
    for row in frappe.get_all(
        "Employee",
        filters={"user_id": ["in", user_ids]},
        fields=["user_id", "employee_name"],
    ):
        if row.get("employee_name"):
            names[row["user_id"]] = row["employee_name"]
    return {uid: names.get(uid, uid) for uid in user_ids}


@frappe.whitelist()
def get_requisition_approval_flow(requisition_name):
    """Approval flow for one Job Requisition, shaped for the UI tab.

    Returns one entry per approval stage — who it is with, who acted, the
    outcome, and when it started/finished — plus, for a stage that fans out over
    positions, a row-by-row breakdown.

    Cost is four queries regardless of how many stages or positions there are:
    tracker, stages, logs, and one name lookup for every user in the flow.
    """
    if not requisition_name:
        frappe.throw(frappe._("Requisition is required."))

    frappe.has_permission(JOB_REQUISITION, "read", doc=requisition_name, throw=True)

    empty = {
        "requisition": requisition_name,
        "has_approval": False,
        "tracker": None,
        "status": None,
        "stages": [],
    }

    tracker = frappe.db.get_value(
        "Approval Tracker",
        {"doc_type": JOB_REQUISITION, "doc_name": requisition_name},
        ["name", "status", "approval_mode", "current_approval_step", "creation"],
        as_dict=True,
        order_by="creation desc",
    )
    if not tracker:
        return empty

    stages = frappe.get_all(
        "Approval Stages",
        filters={"parent": tracker.name, "parenttype": "Approval Tracker"},
        fields=["idx", "approval_name", "approval_label", "rejection_label",
                "enable_row_level_approval"],
        order_by="idx asc",
    )
    logs = frappe.get_all(
        "Approval Log Entry",
        filters={"parent": tracker.name, "parenttype": "Approval Tracker"},
        fields=["name", "stage_index", "stage_name", "status", "user",
                "custom_allocated_to_users", "custom_assigned_to_roles", "role",
                "approval_time", "creation", "is_row_log", "row_label", "row_idx",
                "row_docnames", "approval_label", "rejection_label"],
        order_by="stage_index asc, row_idx asc, idx asc",
    )

    # One name lookup for every user mentioned anywhere in the flow.
    everyone = []
    for log in logs:
        everyone.extend(_split_users(log.get("user"), log.get("custom_allocated_to_users")))
    names = _approval_display_names(everyone)

    logs_by_stage = {}
    for log in logs:
        logs_by_stage.setdefault(log.get("stage_index") or 0, []).append(log)

    def action_word(stage_status, stage_logs):
        """The action label for the stage as a whole.

        Derived from the aggregate status, not from any one log — a row-level
        stage has several logs and the last one is not necessarily the outcome.
        """
        sample = stage_logs[0] if stage_logs else {}
        if stage_status == "Approved":
            return sample.get("approval_label") or "Approve"
        if stage_status == "Rejected":
            return sample.get("rejection_label") or "Reject"
        return stage_status

    out_stages = []
    for stage in stages:
        index = stage.idx - 1
        stage_logs = logs_by_stage.get(index, [])
        aggregate = _aggregate_stage_logs(stage_logs) if stage_logs else {
            "status": "Not started", "actioned": 0, "total": 0
        }

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
            for role in str(log.get("custom_assigned_to_roles") or log.get("role") or "").split(","):
                role = role.strip()
                if role and role not in roles:
                    roles.append(role)

        entry = {
            "stage_index": index,
            "stage_name": (
                stage.approval_name
                or (stage_logs[0].get("stage_name") if stage_logs else None)
                or frappe._("Stage {0}").format(stage.idx)
            ),
            "approvers": approvers,
            "roles": roles,
            "action_taken_by": acted_by,
            "action": action_word(aggregate["status"], stage_logs) if stage_logs else "—",
            "status": aggregate["status"],
            "trigger_date": stage_logs[0].get("creation") if stage_logs else None,
            # A stage is only "completed" once nothing in it is still pending.
            "completed_date": max(completed) if completed and aggregate["status"] != "Pending" else None,
        }

        # Per-position detail for a stage that fanned out.
        if len(stage_logs) > 1 or any(l.get("is_row_log") for l in stage_logs):
            entry["is_row_stage"] = True
            entry["rows"] = {"actioned": aggregate["actioned"], "total": aggregate["total"]}
            entry["row_approvals"] = [
                {
                    "label": log.get("row_label"),
                    # Child row name(s) this approval covers — matches the
                    # `row_name` on custom_position_details, so the UI can line a
                    # position up with its approval without parsing the label.
                    "row_docnames": [
                        r.strip() for r in str(log.get("row_docnames") or "").split(",") if r.strip()
                    ],
                    "status": log.get("status") or "Pending",
                    "approvers": [
                        names.get(u, u)
                        for u in _split_users(log.get("custom_allocated_to_users"), log.get("user"))
                    ],
                    "action_taken_by": (
                        [names.get(u, u) for u in _split_users(log.get("user"))]
                        if log.get("status") in ("Approved", "Rejected") else []
                    ),
                    "completed_date": log.get("approval_time"),
                }
                for log in stage_logs
            ]
        out_stages.append(entry)

    return {
        "requisition": requisition_name,
        "has_approval": True,
        "tracker": tracker.name,
        "status": tracker.status,
        "mode": tracker.approval_mode,
        "current_step": tracker.current_approval_step,
        "started_on": tracker.creation,
        "stages": out_stages,
    }


@frappe.whitelist()
def get_job_requisition_details(requisition_name=None, name=None):
    """Everything the requisition detail view needs, in ONE call.

    The list view already has its own endpoint; this is the per-item view opened
    when a row is clicked. It returns both tabs' data together so the drawer
    makes a single request:

      * ``requisition``   — the flat requisition, including
        ``custom_position_details`` (with each position's own approval outcome),
        ``custom_regions`` and ``available_tables`` for the Position Details tab.
      * ``approval_flow`` — the per-stage approval trail for the Approval Flow
        tab, with a per-position breakdown for row-level stages. Its
        ``has_approval`` flag is False when the requisition never went through an
        approval, which is the signal to hide that tab.

    ``requisition_name`` is the parameter; ``name`` is accepted as an alias so
    either convention works from the client.
    """
    requisition_name = requisition_name or name
    if not requisition_name:
        frappe.throw(frappe._("Requisition is required."))

    if not frappe.db.exists(JOB_REQUISITION, requisition_name):
        frappe.throw(
            frappe._("Job Requisition {0} not found.").format(requisition_name),
            frappe.DoesNotExistError,
        )

    frappe.has_permission(JOB_REQUISITION, "read", doc=requisition_name, throw=True)

    doc = frappe.get_doc(JOB_REQUISITION, requisition_name)

    return {
        "requisition": _serialise_requisition(doc),
        # Permission was checked above; the flow helper re-checks harmlessly.
        "approval_flow": get_requisition_approval_flow(requisition_name),
    }
