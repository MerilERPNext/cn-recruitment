"""
Job Requisition API
===================

create_job_requisition(payload)
    Submit endpoint for the React "Raise a Requisition" form.
    Accepts a FLAT payload using DocType field names directly.
    Positions arrive in `custom_position_details` and are grouped by
    `location` on the backend: one Job Requisition per unique location,
    upserting (appending positions) when an open JR for the same
    (designation, department, requested_by, location) already exists.

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


def _find_existing_requisition(designation, department, requested_by, location):
    """Open JR (same designation+department+requested_by) that already has a
    position at this `location`, or None."""
    rows = frappe.db.sql(
        """
        SELECT jr.name
        FROM `tabJob Requisition` jr
        JOIN `tabPosition Details` pd ON pd.parent = jr.name
        WHERE jr.designation = %s
          AND jr.department = %s
          AND jr.requested_by = %s
          AND COALESCE(jr.status, '') NOT IN ('Cancelled', 'Filled')
          AND pd.location = %s
        LIMIT 1
        """,
        (designation, department, requested_by, location),
    )
    return rows[0][0] if rows else None


def _bypass_hrms_duplicate_check(doc):
    """HRMS rejects more than one open JR per (designation, department,
    requested_by). Our flow uses `location` too, so shadow that method."""
    doc.validate_duplicates = lambda: None


# ---------------------------------------------------------------------------
# Payload → doc mapping
# ---------------------------------------------------------------------------


def _position_row(p, position_no, parent_vacancy_default, parent_functional_area):
    """Build a single child row dict for `custom_position_details`."""
    vacancy = (p.get("vacancy_type") or parent_vacancy_default or "New").strip() or "New"
    return {
        "position_no": position_no,
        "vacancy_type": vacancy,
        "replacement_for": p.get("replacement_for"),
        "reporting_manager": p.get("reporting_manager"),
        "location": p.get("location"),
        "functional_area": p.get("functional_area") or parent_functional_area,
        "employee_type": p.get("employee_type"),
    }


def _apply_parent_fields(doc, payload):
    """Copy parent-level fields from payload onto the doc.

    - Skips None and "" so optional empty inputs don't blank existing values
      on upsert.
    - Skips workflow-managed fields (status, workflow_state) entirely —
      sending those is what causes the
      "'NoneType' object has no attribute 'options'" error in Frappe when the
      field meta cannot be resolved for a Select that the workflow engine owns.
    - Wraps each set() in a try/except so a bad value produces a clear error
      message ('field X = value Y') instead of a cryptic NoneType traceback.
    """
    for field in PARENT_WRITABLE_FIELDS:
        if field in FRAPPE_MANAGED_FIELDS:
            continue  # safety guard — should never be in PARENT_WRITABLE_FIELDS
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


def _apply_qualifications(doc, payload):
    doc.set("custom_qualifications", [])
    for q in _list_field(payload, "custom_qualifications"):
        if not isinstance(q, dict) or not q.get("qualification"):
            continue
        doc.append(
            "custom_qualifications",
            {"qualification": q["qualification"], "mandatory": q.get("mandatory") or "Required"},
        )


def _apply_skills(doc, payload):
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
    """`validate` hook — keep parent.no_of_positions in lock-step with the
    actual row count in custom_position_details.

    Fires on every save of Job Requisition, regardless of how the doc was
    edited (our API, Desk UI, scripted update). Only acts when the table
    has rows — leaves the field untouched for legacy / HRMS-standard flows
    where `custom_position_details` is empty (those flows use the standard
    `vacancies` table instead, which we don't want to override).
    """
    position_rows = doc.get("custom_position_details") or []
    if position_rows:
        doc.no_of_positions = len(position_rows)


def _build_requisition_doc(payload, positions_for_location):
    """Construct an unsaved Job Requisition for one location group."""
    doc = frappe.new_doc(JOB_REQUISITION)
    _bypass_hrms_duplicate_check(doc)

    _apply_parent_fields(doc, payload)

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
    for index, p in enumerate(positions_for_location, start=1):
        doc.append("custom_position_details", _position_row(p, index, parent_vacancy, parent_functional_area))

    return doc


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------


@frappe.whitelist()
def create_job_requisition(payload=None):
    """
    Submit a Job Requisition.

    Groups `custom_position_details` rows by `location`; creates one JR per
    unique location, OR appends positions to an open JR with the same
    (designation, department, requested_by, location) — true upsert.

    Returns:
        {
          "success": true,
          "message": "Created X, updated Y requisition(s).",
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
        parent_vacancy = payload.get("custom_type_of_position")
        parent_functional_area = payload.get("custom_functional_area")

        results = []
        savepoint = "create_job_requisition"
        frappe.db.savepoint(savepoint)
        try:
            for location, group_positions in groups:
                existing_name = _find_existing_requisition(
                    payload.get("designation"),
                    payload.get("department"),
                    payload.get("requested_by"),
                    location,
                )

                if existing_name:
                    doc = frappe.get_doc(JOB_REQUISITION, existing_name)
                    _bypass_hrms_duplicate_check(doc)
                    _apply_parent_fields(doc, payload)
                    start_idx = len(doc.get("custom_position_details") or [])
                    for offset, p in enumerate(group_positions, start=1):
                        doc.append(
                            "custom_position_details",
                            _position_row(p, start_idx + offset, parent_vacancy, parent_functional_area),
                        )
                    # Resync from the live child table after appending,
                    # not from the payload-supplied total.
                    doc.no_of_positions = len(doc.get("custom_position_details") or [])
                    doc.save(ignore_permissions=False)
                    action = "updated"
                else:
                    doc = _build_requisition_doc(payload, group_positions)
                    doc.insert(ignore_permissions=False)
                    action = "created"

                results.append(
                    {
                        "name": doc.name,
                        "location": location,
                        "positions_count": len(group_positions),
                        "action": action,
                    }
                )
        except Exception:
            frappe.db.rollback(save_point=savepoint)
            raise

        frappe.db.commit()

        created_count = sum(1 for r in results if r["action"] == "created")
        updated_count = sum(1 for r in results if r["action"] == "updated")
        return _ok(
            message=_("Created {0}, updated {1} requisition(s).").format(created_count, updated_count),
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


def _serialise_requisition(doc):
    """Flat round-trip representation of a JR.
    All parent fields keep their DocType field names so the UI can bind
    directly without a translation layer."""
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

    out["custom_position_details"] = [
        {
            "position_no": row.get("position_no"),
            "vacancy_type": row.get("vacancy_type"),
            "location": row.get("location"),
            "reporting_manager": row.get("reporting_manager"),
            "replacement_for": row.get("replacement_for"),
            "employee_type": row.get("employee_type"),
            "functional_area": row.get("functional_area"),
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

            doc.set("custom_position_details", [])
            for idx, p in enumerate(positions, start=1):
                doc.append(
                    "custom_position_details",
                    _position_row(p, idx, parent_vacancy, parent_functional_area),
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


@frappe.whitelist()
def preview_job_description(designation=None, department=None):
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

        # 1) Try exact match on designation + department.
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

        if rows:
            return _ok(
                message=_("Job Description found."),
                data=_build_preview_payload(rows[0][0], source="match"),
                http=200,
            )

        # 2) Fallback to the default Job Description, if one is configured.
        default_name = frappe.db.get_value(
            JOB_DESCRIPTION, {"is_default": 1}, "name"
        )
        if default_name:
            return _ok(
                message=_("No exact match — showing the default Job Description."),
                data=_build_preview_payload(default_name, source="default"),
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


def _build_preview_payload(jd_name, source):
    """Shared JD → preview payload builder used by exact-match and
    default-fallback paths. Honours read permission on the JD doc.

    `description_html` is the RENDERED preview (Jinja resolved + line
    breaks converted to <p>/<br>), not the raw template — so the React
    Preview JD modal renders human-readable content via
    `dangerouslySetInnerHTML` without exposing `{{ }}` placeholders.
    """
    from recruitment.recruitment.doctype.job_description.job_description import (
        _render_preview,
        plain_text_to_html,
    )

    doc = frappe.get_doc(JOB_DESCRIPTION, jd_name)
    doc.check_permission("read")
    _render_preview(doc)
    description_html = plain_text_to_html(doc.get("preview") or "")
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
def get_link_field_options(doctype, search_text=None, query=None, txt=None, limit=20):
    """Returns [{id, label}] for a doctype; label uses title_field when set.
    Accepts `search_text`, `query`, or `txt` as the search term (first non-empty wins).
    Accessible to any authenticated Frappe user (desk session or API key/secret)."""
    if not doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Doctype is required.")}

    try:
        title_field = frappe.get_meta(doctype).get("title_field") or None
    except Exception:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Doctype '{0}' not found.").format(doctype)}

    has_title = bool(title_field) and title_field != "name"
    fields = ["name"] + ([title_field] if has_title else [])

    search = (search_text or query or txt or "").strip()
    or_filters = None
    if search:
        like = f"%{search}%"
        or_filters = [["name", "like", like]] + ([[title_field, "like", like]] if has_title else [])

    try:
        records = frappe.get_all(
            doctype, fields=fields, or_filters=or_filters,
            limit=int(limit or 20), order_by=f"{title_field or 'name'} asc",
        )
    except Exception as e:
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

    results = [{"id": r["name"], "label": (r.get(title_field) if has_title else None) or r["name"]} for r in records]
    return {"status": "success", "doctype": doctype, "title_field": title_field, "total": len(results), "results": results}