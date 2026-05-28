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
    "custom__employee_type",
    "custom_employment_type",
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
                "cv": cand.get("cv"),
                "offer_directly": 1 if cand.get("offer_directly") else 0,
            },
        )


def _build_requisition_doc(payload, positions_for_location):
    """Construct an unsaved Job Requisition for one location group."""
    doc = frappe.new_doc(JOB_REQUISITION)
    _bypass_hrms_duplicate_check(doc)

    _apply_parent_fields(doc, payload)

    if not payload.get("no_of_positions"):
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
                    doc.no_of_positions = (doc.no_of_positions or 0) + len(group_positions)
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


def _compute_global_summary():
    """Single aggregate query returning the 4 list-view card counts.
    Always global — does NOT honor list filters by design."""
    row = frappe.db.sql(
        """
        SELECT
            COUNT(*)                                        AS total_requisitions,
            COALESCE(SUM(no_of_positions), 0)               AS total_positions,
            COALESCE(SUM(CASE WHEN status IN %(active)s
                              THEN no_of_positions ELSE 0 END), 0) AS active_offer_positions,
            COALESCE(SUM(CASE WHEN status IN %(closed)s
                              THEN no_of_positions ELSE 0 END), 0) AS closed_positions
        FROM `tabJob Requisition`
        """,
        {"active": ACTIVE_STATUSES, "closed": CLOSED_STATUSES},
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

        # Convenience: `employee` query param folds into filters.requested_by.
        # Explicit `filters.requested_by` wins so callers can still override.
        if employee and "requested_by" not in filters:
            filters["requested_by"] = employee

        try:
            limit = max(1, min(int(limit), 100))
            start = max(0, int(start))
        except (TypeError, ValueError):
            return _err(_("`limit` and `start` must be integers."), http=400)

        names = frappe.get_list(
            JOB_REQUISITION,
            filters=filters,
            fields=["name"],
            order_by=order_by,
            limit_page_length=limit,
            limit_start=start,
            pluck="name",
        )
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
                "summary": _compute_global_summary(),
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
            if not payload.get("no_of_positions"):
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