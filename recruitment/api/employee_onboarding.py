import frappe
import json
import re
from recruitment.api.candidate_portal import (
    _get_active_pre_release,
    _get_onboarding_portal_rows,
    _read_onboarding_meta,
    _compute_candidate_field_counts,
)
from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity

DOCTYPENAME = "Employee Onboarding"
MAX_PAGE_LENGTH = 100

# NOTE: `get_applicant_status` moved to recruitment.api.channels.careers
# and renamed to `get_applied_jobs`
# (it belongs with the candidate-facing careers endpoints, and now counts only
# non-Draft applications as "applied").


def _success_response(message, data, **meta):
    frappe.local.response["http_status_code"] = 200
    response = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta:
        response["meta"] = meta
    return response


def _error_response(message, status_code=400):
    frappe.local.response["http_status_code"] = status_code
    return {
        "success": False,
        "message": message,
        "data": [],
    }


def _to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sanitize_order_by(order_by, allowed_fields, default_field):
    default_order = f"{default_field} asc"
    raw = (order_by or "").strip() or default_order
    match = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*)(?:\s+(asc|desc))?", raw, flags=re.IGNORECASE)

    if not match:
        raise frappe.ValidationError(
            "Invalid order_by format. Use '<fieldname> asc|desc', e.g. 'boarding_status asc'."
        )

    fieldname = match.group(1)
    direction = (match.group(2) or "asc").lower()

    if fieldname == "custom_final_status":
        fieldname = "boarding_status"

    if fieldname not in allowed_fields:
        raise frappe.ValidationError(
            f"Invalid order_by field '{fieldname}'. Allowed fields: {', '.join(sorted(allowed_fields))}."
        )

    return f"{fieldname} {direction}"


def _lock_filled_portal_fields(doc, updated_fields):
    """Mark submitted portal fields Filled and snapshot current_value, in memory.

    Only fields that actually hold a value are locked (read-only for HR review);
    an empty field in the submit payload stays Pending so it remains editable and
    isn't counted as filled. For Table fields "has value" means at least one row
    with at least one non-empty cell. Mutates `doc` in place — the caller saves.
    """
    import json as _json
    for prow in (doc.get("custom_candidate_portal_fields") or []):
        if prow.fieldname not in updated_fields:
            continue
        ft = prow.get("fieldtype") or "Data"
        live_val = doc.get(prow.fieldname)

        if ft == "Table":
            rows_data = live_val or []
            has_value = any(
                any(v not in (None, "", [], {}) for v in
                    (r.as_dict() if hasattr(r, "as_dict") else r).values())
                for r in rows_data
            )
        else:
            has_value = live_val not in (None, "", [])

        if not has_value:
            continue

        if ft == "Table":
            prow.current_value = _json.dumps(
                [{k: str(v or "") for k, v in (r.as_dict() if hasattr(r, "as_dict") else r).items()
                  if not k.startswith("_") and k not in {
                      "doctype", "parent", "parenttype", "parentfield",
                      "docstatus", "owner", "creation", "modified", "modified_by"
                  }} for r in (live_val or [])],
                ensure_ascii=False, default=str
            )
        else:
            prow.current_value = str(live_val) if live_val is not None else ""
        prow.approval_status = "Filled"


def _is_concurrent_edit_error(err):
    """True for an optimistic-lock / concurrent-edit clash on save.

    Covers Frappe's TimestampMismatchError and MySQL error 1020 (ER_CHECKREAD,
    "Record has changed since last read"), which surfaces from SELECT ... FOR
    UPDATE during save under concurrency (e.g. a double submit)."""
    if isinstance(err, frappe.TimestampMismatchError):
        return True
    args = getattr(err, "args", None)
    if args and args[0] == 1020:
        return True
    text = str(err)
    return "Record has changed since last read" in text or "has been modified after you have opened it" in text


@candidate_required
def update_onboarding_details(email, data, action="submit"):
    """
    Updates an Employee Onboarding record identified by the job_applicant email.
    Only fields configured in the candidate portal form AND in Pending/Rejected status are accepted.

    `action` controls the post-write field state:
      - "submit" (default, legacy behavior): marks each updated field as Filled and
        snapshots current_value, so the fields lock (read-only) and go to HR review.
      - "save": persists the values only and leaves approval_status untouched
        (stays Pending/Rejected), so the fields remain editable on the next fetch.
    Any unknown value falls back to "submit" to preserve existing callers.
    """
    enforce_candidate_identity(email=email)
    frappe.local.response["http_status_code"] = 200

    # Normalize the action flag; default/unknown -> "submit" (legacy behavior).
    action = (action or "submit").strip().lower()
    is_submit = action != "save"

    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "code": 400, "message": "Invalid data format. Expected JSON."}

    if not data or not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "code": 400, "message": "Data must be a valid dictionary of fields to update."}

    applicant_name = frappe.db.get_value(
        "Job Applicant",
        {"email_id": email},
        "name",
        order_by="modified desc",
    )
    if not applicant_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "code": 404, "message": f"No Job Applicant found for {email}"}

    onboarding_name = frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": applicant_name, "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )

    if not onboarding_name:
        pre_release = _get_active_pre_release(applicant_name)
        if not pre_release:
            frappe.local.response["http_status_code"] = 404
            return {"status": "error", "code": 404, "message": f"No Employee Onboarding record or pending release found for {email}"}
        from recruitment.api.candidate_portal import materialize_onboarding_from_applicant
        onboarding_name = materialize_onboarding_from_applicant(applicant_name, prefill=data)

    try:
        # Apply the candidate's values — and, on submit, lock the filled fields —
        # in a SINGLE save. Retry on a concurrent-edit clash (e.g. a double submit,
        # or HR touching the same record) by re-fetching and re-applying instead of
        # surfacing a 500. One save also avoids firing on_update hooks twice.
        updated = []
        for _attempt in range(3):
            try:
                doc = frappe.get_doc("Employee Onboarding", onboarding_name)

                portal_rows, _ = _get_onboarding_portal_rows(doc)

                # Only allow fields in Pending or Rejected state
                _EDITABLE = frozenset({"Pending", "Rejected"})
                allowed_map = {
                    r.fieldname: r for r in portal_rows
                    if not r.get("hidden")
                    and not r.get("read_only")
                    and (r.get("approval_status") or "Pending") in _EDITABLE
                }

                if not allowed_map:
                    frappe.local.response["http_status_code"] = 400
                    return {"status": "error", "code": 400, "message": "No editable portal fields available. All fields are under review or already approved."}

                # Only validate mandatory constraint for fields actually being submitted.
                # A candidate may update one rejected field at a time without needing to
                # supply all other editable/mandatory fields in the same request.
                submitted_keys = set(data.keys()) & set(allowed_map.keys())
                missing = [
                    allowed_map[fn].label or fn for fn in submitted_keys
                    if is_submit and allowed_map[fn].get("is_mandatory") and data[fn] in (None, "", [])
                ]
                if missing:
                    frappe.local.response["http_status_code"] = 422
                    return {
                        "status": "error",
                        "code": 422,
                        "message": "The following mandatory fields are missing: " + ", ".join(missing),
                        "missing_fields": missing,
                    }

                if not submitted_keys:
                    frappe.local.response["http_status_code"] = 400
                    return {"status": "error", "code": 400, "message": "None of the submitted fields are editable. They may be approved, read-only, or hidden."}

                meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}
                updated = []

                for fn, value in data.items():
                    if fn not in allowed_map:
                        continue

                    meta = meta_lookup.get(fn, {})
                    row = allowed_map[fn]
                    fieldtype = (
                        getattr(row, "fieldtype", None) or
                        (row.get("fieldtype") if isinstance(row, dict) else None) or
                        meta.get("fieldtype", "Data")
                    )

                    if fieldtype == "Table" and isinstance(value, list):
                        doc.set(fn, [])
                        for row_data in value:
                            if not isinstance(row_data, dict):
                                continue
                            if not any(v not in (None, "", [], {}) for v in row_data.values()):
                                continue
                            doc.append(fn, row_data)
                    else:
                        doc.set(fn, value)

                    updated.append(fn)

                # On submit, lock the filled portal fields (mark Filled + snapshot
                # value) BEFORE saving so values and statuses persist in one write.
                if is_submit and updated:
                    _lock_filled_portal_fields(doc, updated)

                doc.save(ignore_permissions=True)
                break
            except Exception as _save_err:
                if _is_concurrent_edit_error(_save_err) and _attempt < 2:
                    frappe.db.rollback()
                    continue
                raise

        # ── Post-save side effects (no further doc.save()) ────────────────────────
        from recruitment.api.field_level_approval import _sync_overall_status
        if is_submit and updated:
            # Sync the candidate action-center item, then recompute boarding_status
            # (flips to Submitted once no field is left Pending or Rejected).
            try:
                from recruitment.api.action_center import sync_onboarding_field_rejection_action
                doc.reload()
                sync_onboarding_field_rejection_action(doc)
            except Exception:
                frappe.log_error(frappe.get_traceback(), "Action Center Sync Failed (Candidate Refill)")
            doc.reload()
            _sync_overall_status(doc)
        elif updated:
            # A save persists values but leaves fields Pending (editable); the
            # count-based derivation can't move past Pending on its own, so nudge
            # Pending -> In Process to reflect partial progress.
            doc.reload()
            _sync_overall_status(doc)
            if (doc.get("boarding_status") or "Pending") == "Pending":
                doc.db_set("boarding_status", "In Process", update_modified=False)

        frappe.db.commit()

        # Value-aware counts: a field with a value counts as "filled" whether it
        # was just saved (still editable) or submitted, plus prefilled values
        # resolved from the Job Applicant. boarding_status stays submit-based.
        doc.reload()
        portal_rows_now, _ = _get_onboarding_portal_rows(doc)
        field_status_counts = _compute_candidate_field_counts(
            portal_rows_now, doc, frappe.get_doc("Job Applicant", applicant_name)
        )

        return {
            "status": "success",
            "code": 200,
            "message": (
                "Employee Onboarding updated successfully. Fields are now pending HR review."
                if is_submit
                else "Progress saved. Fields remain editable."
            ),
            "data": {
                "name": doc.name,
                "job_applicant": doc.job_applicant,
                "updated_fields": updated,
                "action": "submit" if is_submit else "save",
                "boarding_status": doc.get("boarding_status"),
                "field_status_counts": field_status_counts,
            },
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="Employee Onboarding Update Failed")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "code": 500, "message": str(e)}


@frappe.whitelist()
def get_employee_onboarding_list(
    order_by="boarding_status asc",
    page_length=10,
    start=0,
    search_term=None,
    search_fields=None,
):
    try:
        frappe.has_permission(DOCTYPENAME, "read", throw=True)

        page_length_value = _to_int(page_length)
        start_value = _to_int(start)

        if page_length_value is None:
            return _error_response("Invalid page_length. It must be an integer.", 400)
        if start_value is None:
            return _error_response("Invalid start. It must be an integer.", 400)
        if page_length_value < 1:
            return _error_response("Invalid page_length. It must be >= 1.", 400)
        if start_value < 0:
            return _error_response("Invalid start. It must be >= 0.", 400)

        page_length_value = min(page_length_value, MAX_PAGE_LENGTH)

        requested_fields = [
            "name",
            "employee_name",
            "job_applicant",
            "employee",
            "department",
            "designation",
            "date_of_joining",
            "boarding_begins_on",
            "boarding_status",
            "creation",
            "modified",
        ]

        meta = frappe.get_meta(DOCTYPENAME)
        valid_fields = {"name"}
        valid_fields.update(df.fieldname for df in meta.fields if df.fieldname)
        fields = [field for field in requested_fields if field in valid_fields]

        if not fields:
            return _error_response("No valid fields configured for list view.", 500)

        allowed_order_fields = {
            "name",
            "employee_name",
            "department",
            "designation",
            "date_of_joining",
            "boarding_status",
            "creation",
            "modified",
        }
        allowed_order_fields = {field for field in allowed_order_fields if field in valid_fields}
        default_order_field = "boarding_status" if "boarding_status" in allowed_order_fields else "creation"
        safe_order_by = _sanitize_order_by(order_by, allowed_order_fields, default_order_field)

        # ── Search filter ──────────────────────────────────────────────────────
        # Allowed fields that can be searched against
        _SEARCHABLE_FIELDS = {
            "name", "employee_name", "job_applicant",
            "department", "designation", "boarding_status",
        }

        # Parse search_fields from JSON string if needed
        if isinstance(search_fields, str):
            try:
                import json as _json
                search_fields = _json.loads(search_fields)
            except Exception:
                search_fields = []

        # Default search fields if none provided
        if not search_fields or not isinstance(search_fields, list):
            search_fields = ["employee_name", "job_applicant", "department", "designation"]

        # Restrict to allowed + valid fields only
        search_fields = [
            f for f in search_fields
            if f in _SEARCHABLE_FIELDS and f in valid_fields
        ]
        if not search_fields:
            search_fields = ["employee_name", "job_applicant"]

        # Build OR filters when a search term is provided
        filters = []
        if search_term and str(search_term).strip():
            term = f"%{str(search_term).strip()}%"
            or_filters = [[DOCTYPENAME, f, "like", term] for f in search_fields]
            # frappe.get_list supports or_filters as a list of conditions
        else:
            or_filters = []

        data = frappe.get_list(
            DOCTYPENAME,
            fields=fields,
            filters=filters,
            or_filters=or_filters if or_filters else None,
            order_by=safe_order_by,
            start=start_value,
            page_length=page_length_value,
        )

        # Per-row field status counts so the HR list view can render progress
        # without N+1 round trips. One grouped query over the EO's portal child
        # table, then folded back into each row.
        if data:
            # Bulk-resolve department and designation display titles (2 queries, no N+1)
            dept_names = list({r["department"] for r in data if r.get("department")})
            desig_names = list({r["designation"] for r in data if r.get("designation")})

            dept_map = (
                {d.name: d.department_name or d.name for d in frappe.db.get_all(
                    "Department", filters=[["name", "in", dept_names]], fields=["name", "department_name"]
                )} if dept_names else {}
            )
            desig_map = (
                {d.name: d.designation_name or d.name for d in frappe.db.get_all(
                    "Designation", filters=[["name", "in", desig_names]], fields=["name", "designation_name"]
                )} if desig_names else {}
            )

            for row in data:
                row["department_title"] = dept_map.get(row.get("department"), row.get("department") or "")
                row["designation_title"] = desig_map.get(row.get("designation"), row.get("designation") or "")

            # Per-row field status counts — value-aware, using the SAME source of
            # truth as the candidate portal form (get_candidate_portal_form) and
            # the onboarding dashboard (get_dashboard) so the progress shown on
            # every surface matches exactly.
            #
            # Previously this read a single grouped SQL over the
            # `custom_candidate_portal_fields` child table's stored `current_value`.
            # That diverged from the candidate-facing endpoints in three ways:
            #   1. it only ever saw the per-record child table, ignoring the
            #      pre-release / linked / default form that actually drives the
            #      portal (wrong/empty totals in those cases);
            #   2. it counted only the snapshot `current_value` column, so
            #      prefilled / auto-mapped values (resolved from the Job Applicant)
            #      showed as pending;
            #   3. it could drift from the shared bucket definition.
            #
            # We now resolve each row's visible portal field set via
            # `_get_onboarding_portal_rows` (pre-release -> per-record -> linked ->
            # default) and count live values via `_compute_candidate_field_counts`
            # (Employee Onboarding value, falling back to the Job Applicant), with
            # Approved/Rejected HR decisions taking precedence. The output key and
            # shape are unchanged: {total, pending, filled, approved, rejected}.
            empty_counts = {"total": 0, "pending": 0, "filled": 0, "approved": 0, "rejected": 0}
            for row in data:
                counts = dict(empty_counts)
                try:
                    onboarding_doc = frappe.get_doc(DOCTYPENAME, row["name"])
                    job_applicant = row.get("job_applicant")
                    applicant_doc = (
                        frappe.get_doc("Job Applicant", job_applicant)
                        if job_applicant and frappe.db.exists("Job Applicant", job_applicant)
                        else None
                    )
                    pre_release = _get_active_pre_release(job_applicant) if job_applicant else None
                    portal_rows, _ = _get_onboarding_portal_rows(onboarding_doc, pre_release)
                    counts = _compute_candidate_field_counts(portal_rows, onboarding_doc, applicant_doc)
                except Exception:
                    # Never let one bad row break the whole list; fall back to zeros.
                    frappe.log_error(
                        frappe.get_traceback(),
                        "get_employee_onboarding_list: field_status_counts",
                    )
                row["field_status_counts"] = counts

        # Count without a SQL-aggregate field. Different Frappe versions accept
        # only the string form ("count(name)") OR only the dict form
        # ({"COUNT": ...}) and reject the other, so neither is portable. These
        # core APIs behave the same across versions.
        if or_filters:
            # Search active: db.count doesn't take or_filters, so count the
            # matching names. Search result sets are small.
            total_count = len(frappe.get_all(
                DOCTYPENAME,
                filters=filters,
                or_filters=or_filters,
                fields=["name"],
                limit_page_length=0,
            ))
        else:
            total_count = frappe.db.count(DOCTYPENAME, filters=filters or None)

        return _success_response(
            "Employee onboarding list fetched successfully.",
            data,
            pagination={
                "start": start_value,
                "page_length": page_length_value,
                "total_count": total_count,
                "has_more": (start_value + page_length_value) < total_count,
            },
            order_by=safe_order_by,
            search={
                "search_term": search_term or "",
                "search_fields": search_fields,
            },
        )
    except frappe.ValidationError as e:
        return _error_response(str(e), 400)
    except frappe.PermissionError:
        return _error_response("You are not permitted to access Employee Onboarding records.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Employee Onboarding List API Error")
        return _error_response("Unable to fetch Employee Onboarding list right now.", 500)


# ---------------------------------------------------------------------------
# HR-facing onboarding detail page
# ---------------------------------------------------------------------------
#
# Backs the "Onboarding In Progress → <candidate>" screen: profile header,
# Manager / Key People sidebar, and the three tabs (Onboarding Documents,
# Workflow Tasks, Verification Reports). One call per page load.
#
# PERFORMANCE
# -----------
# Everything is assembled from a FIXED number of queries regardless of how many
# people or tasks are involved — nothing is queried per row:
#   * the onboarding is loaded field-by-field (see `_load_onboarding`) rather
#     than via get_doc, which would pull all 11 child tables when 4 are needed;
#   * every person across manager/SPOC/recruiter/buddies/teammates/notify is
#     resolved together through `_people_directory` (4 batched queries total);
#   * tasks are one query; header link labels are at most 4 indexed lookups on
#     links that are actually set.
# Both list-shaped inputs are bounded (`_MAX_TASKS`, `_MAX_PEOPLE`) so a
# pathological record can't turn a page load into an unbounded payload.
#
# SECURITY
# --------
# Permission is checked at the DocType level BEFORE the record is looked up, so
# an unauthorised caller gets 403 without learning whether a docname exists
# (no enumeration oracle), then at the record level once loaded.
#
# `frappe.get_all` DELIBERATELY bypasses permission checks (see its docstring),
# and is used for the User/Employee/Branch/Task lookups below. That is an
# intentional, scoped privilege elevation: a recruiter who can read this
# onboarding must be able to see who its SPOC/manager/buddies are and what tasks
# it carries, even without blanket read access to the Employee or Task doctypes.
# It is kept safe by *what* is selected — only the display columns enumerated in
# `_PERSON_*_FIELDS` / `_TASK_FIELDS`, never `select *` — so widening the payload
# is a deliberate edit here rather than an accident. Do not add salary, personal
# contact, or identity-document columns to these lists.
#
# Reaching this code at all requires an authenticated session: `@frappe.whitelist()`
# without `allow_guest=True` rejects Guest.

# Hard bounds on the two list-shaped parts of the payload. Onboarding tasks and
# key people are normally a handful; these exist so a corrupt or malicious record
# degrades into a truncated response instead of an unbounded query and payload.
_MAX_TASKS = 200
_MAX_PEOPLE = 100

# Link fields on the header that need a human-readable label alongside the ID.
# {EO fieldname: (target doctype, title field on that doctype)}. A None title
# field means the record's name IS the label, so no lookup is issued at all.
_HEADER_LINK_TITLES = {
    "custom_designation": ("Designation", "custom_designation_title"),
    "custom_department": ("Department", "department_name"),
    "custom_group_company": ("Company", "company_name"),
    "custom_current_office_location": ("Branch", None),
}

# Scalar Employee Onboarding columns the page needs. Loading these explicitly —
# instead of frappe.get_doc — avoids fetching the 7 child tables (education,
# employment history, joining-form family/references, key contacts) that this
# endpoint never reads.
_ONBOARDING_FIELDS = (
    "name",
    "creation",
    "modified",
    "boarding_status",
    "boarding_begins_on",
    "job_applicant",
    "employee",
    "employee_name",
    "project",
    "custom_designation",
    "custom_department",
    "custom_group_company",
    "custom_primary_contact_number",
    "custom_email",
    "custom_date_of_joining",
    "custom_current_office_location",
    "custom_onboarding_portal_form",
    "custom_manager",
    "custom_onboarding_spoc",
    "custom_onboarding_recruiter",
)

# The only child tables this endpoint reads. {fieldname: (child doctype, columns)}
_ONBOARDING_CHILD_TABLES = {
    "activities": ("Employee Boarding Activity", ["user"]),
    "custom_onboarding_buddy": ("Onboarding Buddy User", ["user"]),
    "custom_joining_buddy": ("Onboarding Buddy User", ["user"]),
    "custom_candidate_portal_fields": (
        "Employee Onboarding Portal Field",
        ["fieldname", "label", "fieldtype", "hidden", "approval_status"],
    ),
}

# Display columns for people. Deliberately minimal — see the SECURITY note above.
_PERSON_USER_FIELDS = ["name", "full_name", "email", "user_image"]
_PERSON_EMPLOYEE_FIELDS = [
    "name", "user_id", "employee_name", "image", "designation", "department", "branch",
]

# Task columns pulled for the Workflow Tasks tab. Filtered against Task's meta
# before querying so a missing custom field degrades to an absent key rather
# than a SQL error. `_assign` is a standard framework column on every table but
# is absent from meta, hence it is appended separately.
_TASK_FIELDS = (
    "name",
    "subject",
    "status",
    "priority",
    "exp_start_date",
    "exp_end_date",
    "completed_on",
    "completed_by",
    "progress",
    "custom_doj",
    "custom_days_to_join",
)


def _load_onboarding(name):
    """Load only the parts of an Employee Onboarding this page renders.

    Returns a `frappe._dict` carrying the scalar fields plus the 4 child tables
    in `_ONBOARDING_CHILD_TABLES`, or None when the record does not exist.

    Why not `frappe.get_doc`: Employee Onboarding has 11 child tables (education,
    external work history, joining-form education/employment/family/references,
    key contacts, ...) and get_doc issues a query for every one of them. This page
    reads 4, so the targeted load drops 7 queries per request.

    The result is shaped to satisfy `_get_onboarding_portal_rows`, which needs
    `.meta.get_field(...)` and `.get(...)` — `frappe._dict` provides attribute
    access, so a `meta` key stands in for the real Document's `.meta`.
    """
    meta = frappe.get_meta(DOCTYPENAME)
    fields = [f for f in _ONBOARDING_FIELDS if f == "name" or meta.get_field(f)]

    row = frappe.db.get_value(DOCTYPENAME, name, fields, as_dict=True)
    if not row:
        return None

    doc = frappe._dict(row)
    doc.meta = meta
    doc.doctype = DOCTYPENAME

    for fieldname, (child_doctype, columns) in _ONBOARDING_CHILD_TABLES.items():
        if not meta.get_field(fieldname):
            doc[fieldname] = []
            continue
        doc[fieldname] = frappe.get_all(
            child_doctype,
            filters={"parent": name, "parenttype": DOCTYPENAME, "parentfield": fieldname},
            fields=columns,
            order_by="idx asc",
            limit_page_length=0,
        )
    return doc


def _days_since(value):
    """Whole days between `value` (a datetime/date, typically `creation`) and now.
    Returns None when there is no date, and never goes negative."""
    if not value:
        return None
    try:
        delta = frappe.utils.now_datetime() - frappe.utils.get_datetime(value)
    except Exception:
        return None
    return max(delta.days, 0)


def _initials(full_name):
    """Avatar initials — first letter of the first and last name parts ("Gopal
    Kumar" -> "GK"). Falls back to the first character, or "?" for a blank name.
    Punctuation-only parts (e.g. the trailing "." in "Yashwant .") are ignored."""
    parts = [p for p in (full_name or "").split() if p and p[0].isalnum()]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _person_subtitle(department_label, office_location, city, state, location_type):
    """The one-line descriptor under a person's name, e.g.

        Human Resources | Corporate - KLJ Noida One - Noida - UP, Noida, Uttar Pradesh , ( Corporate - Remote )

    Every segment is optional — a person with no employee record, no branch or
    no location type just yields a shorter string (or "" when nothing is known),
    so the UI never has to render stray separators.
    """
    place = ", ".join(p for p in (office_location, city, state) if p)
    head = " | ".join(p for p in (department_label, place) if p)
    if location_type:
        return f"{head} , ( {location_type} )" if head else f"( {location_type} )"
    return head


def _people_directory(user_ids):
    """Resolve every person the page shows — with their Employee context — in a
    FIXED four queries, no matter how many people are involved.

    Each person needs name/avatar (User) plus the descriptor line: department,
    office location, city, state and location type. Those live across Employee ->
    Department / Branch -> Location Type, so rather than walking links per person
    (which would be ~5 queries EACH), every level is fetched in one batched pass
    and joined in memory:

        1. User      — all requested ids
        2. Employee  — all of those users' employee records (user_id in ...)
        3. Branch    — every branch those employees sit in
           + Department — every department those employees sit in
        4. Location Type — every location type those branches carry

    Returns {user_id: <person dict>}; ids with no User row are simply absent.
    """
    # Only ever resolve strings, and never more than _MAX_PEOPLE of them — the
    # ids reaching here include task assignees, which are DB-controlled.
    ids = sorted({u for u in user_ids if u and isinstance(u, str)})[:_MAX_PEOPLE]
    if not ids:
        return {}

    users = frappe.get_all(
        "User",
        filters={"name": ["in", ids]},
        fields=_PERSON_USER_FIELDS,
        limit_page_length=0,
    )
    if not users:
        return {}

    # Employee carries the org context. A user may have no employee record (an
    # external recruiter, say) — such a person still renders, just without a
    # descriptor line.
    #
    # NOTE: `Employee.user_id` carries no DB index, so this filter scans
    # tabEmployee. Bounded by _MAX_PEOPLE and run once per request, but it is the
    # dominant cost of this endpoint on a large Employee table — see the index
    # recommendation in the module notes.
    employees = frappe.get_all(
        "Employee",
        filters={"user_id": ["in", [u.name for u in users]]},
        fields=_PERSON_EMPLOYEE_FIELDS,
        limit_page_length=0,
    )
    emp_by_user = {e.user_id: e for e in employees}

    dept_ids = {e.department for e in employees if e.department}
    branch_ids = {e.branch for e in employees if e.branch}

    dept_labels = (
        {
            r.name: r.department_name
            for r in frappe.get_all(
                "Department",
                filters={"name": ["in", sorted(dept_ids)]},
                fields=["name", "department_name"],
                limit_page_length=0,
            )
        }
        if dept_ids
        else {}
    )

    branches = (
        frappe.get_all(
            "Branch",
            filters={"name": ["in", sorted(branch_ids)]},
            fields=["name", "branch", "custom_office_city", "custom_state", "custom_location_type"],
            limit_page_length=0,
        )
        if branch_ids
        else []
    )
    branch_by_id = {b.name: b for b in branches}

    loctype_ids = {b.custom_location_type for b in branches if b.custom_location_type}
    loctype_labels = (
        {
            r.name: r.location_type
            for r in frappe.get_all(
                "Location Type",
                filters={"name": ["in", sorted(loctype_ids)]},
                fields=["name", "location_type"],
                limit_page_length=0,
            )
        }
        if loctype_ids
        else {}
    )

    directory = {}
    for u in users:
        emp = emp_by_user.get(u.name)
        branch = branch_by_id.get(emp.branch) if emp and emp.branch else None

        department = emp.department if emp else None
        department_label = dept_labels.get(department) if department else None
        # Department names often carry a trailing company abbr / whitespace.
        if department_label:
            department_label = department_label.strip()

        office_location = branch.branch if branch else None
        city = branch.custom_office_city if branch else None
        state = branch.custom_state if branch else None
        location_type = (
            loctype_labels.get(branch.custom_location_type) if branch and branch.custom_location_type else None
        )

        full_name = (emp.employee_name if emp and emp.employee_name else None) or u.full_name or u.name
        directory[u.name] = {
            "user": u.name,
            "employee": emp.name if emp else None,
            "full_name": full_name,
            "initials": _initials(full_name),
            "email": u.email,
            # Employee photo wins over the User avatar — HR keeps the former current.
            "image": (emp.image if emp and emp.image else None) or u.user_image,
            "designation": emp.designation if emp else None,
            "department": department,
            "department_label": department_label,
            "office_location": office_location,
            "city": city,
            "state": state,
            "location_type": location_type,
            "subtitle": _person_subtitle(department_label, office_location, city, state, location_type),
        }
    return directory


def _person(directory, user_id):
    """One person entry, or None when unset/unresolvable — so the UI can render
    its "not assigned yet" placeholder off a null rather than an empty object.

    A user id with no User record still returns a usable (if bare) entry rather
    than vanishing, so a stale assignment is visible on the page instead of
    silently disappearing.
    """
    if not user_id:
        return None
    if user_id in directory:
        return directory[user_id]
    return {
        "user": user_id,
        "employee": None,
        "full_name": user_id,
        "initials": _initials(user_id),
        "email": None,
        "image": None,
        "designation": None,
        "department": None,
        "department_label": None,
        "office_location": None,
        "city": None,
        "state": None,
        "location_type": None,
        "subtitle": "",
    }


def _multiselect_users(doc, fieldname):
    """User ids from a Table MultiSelect of Onboarding Buddy User rows, in order
    and de-duplicated."""
    out = []
    for row in doc.get(fieldname) or []:
        user_id = row.get("user") if hasattr(row, "get") else getattr(row, "user", None)
        if user_id and user_id not in out:
            out.append(user_id)
    return out


def _assigned_users(assign_json):
    """Parse Frappe's `_assign` column (a JSON list of user ids) defensively."""
    if not assign_json:
        return []
    try:
        parsed = json.loads(assign_json)
    except (TypeError, ValueError):
        return []
    return [u for u in parsed if u] if isinstance(parsed, list) else []


def _onboarding_documents(doc):
    """Rows for the Onboarding Documents tab.

    One row per portal form resolved for this candidate (see
    `_get_onboarding_portal_rows` for the pre-release → per-record → linked →
    default precedence). `field_count` is the number of visible portal fields —
    the "(9)" the UI shows beside the form name.

    `status` is the document-level `boarding_status`, so every row reflects the
    onboarding's overall state rather than a per-form state; there is no
    per-form status stored today. `time_since_trigger_days` counts from the
    onboarding's creation.
    """
    portal_rows, form_source = _get_onboarding_portal_rows(doc)
    visible = [r for r in portal_rows if not (r.get("hidden") if hasattr(r, "get") else getattr(r, "hidden", 0))]
    if not visible:
        return []

    form_name = doc.get("custom_onboarding_portal_form")
    label = None
    if form_name:
        label = frappe.db.get_value("Onboarding Portal Forms", form_name, "onboarding_form_name")

    status = doc.get("boarding_status") or "Pending"
    return [
        {
            "form": form_name,
            "form_name": label or form_name or "Onboarding Form",
            "form_source": form_source,
            "field_count": len(visible),
            "status": status,
            "triggered_on": str(doc.get("creation") or "") or None,
            "time_since_trigger_days": _days_since(doc.get("creation")),
            # Only a completed onboarding has a meaningful completion stamp;
            # `modified` is the closest thing to "when it finished".
            "completion_date": str(doc.get("modified") or "") if status == "Completed" else None,
        }
    ]


def _workflow_tasks(doc):
    """(rows, assignee_ids) for the Workflow Tasks tab.

    Tasks hang off the onboarding's Project (see `create_onboarding_tasks` in
    customizations/employee_onboarding/overide_class.py), which is the same join
    the daily `refresh_onboarding_task_days_to_join` scheduler uses. Returns an
    empty list when tasks have not been generated yet.
    """
    project = doc.get("project")
    if not project:
        return [], []

    meta = frappe.get_meta("Task")
    fields = [f for f in _TASK_FIELDS if meta.get_field(f) or f == "name"]
    # `tabTask.project` is indexed, so this stays cheap as the task table grows.
    rows = frappe.get_all(
        "Task",
        filters={"project": project},
        fields=fields + ["_assign"],
        order_by="exp_start_date asc, creation asc",
        limit_page_length=_MAX_TASKS,
    )

    assignees = []
    tasks = []
    for row in rows:
        users = _assigned_users(row.pop("_assign", None))
        assignees.extend(users)
        row["assigned_to"] = users
        tasks.append(row)
    return tasks, assignees


@frappe.whitelist()
def get_employee_onboarding_detail(name):
    """Everything the onboarding detail page renders, in one response.

    Args
    ----
    name : str (required)  Employee Onboarding docname.

    Returns
    -------
    {"success": true, "message": "...", "data": {
        "name", "boarding_status", "job_applicant", "employee",
        "header": {employee_name, employee_id, designation, designation_label,
                   department, department_label, company, company_label,
                   phone, email, date_of_joining, current_office_location,
                   current_office_location_label, boarding_begins_on},
        "manager": <person|null>,
        "key_people": {onboarding_spoc, recruiter, buddies[], teammates[],
                       notify_users[]},
        "onboarding_documents": [...],
        "workflow_tasks": [...],
        "verification_reports": []
    }}

    Notes for the frontend
    ----------------------
    - Every person carries `{user, employee, full_name, initials, email, image,
      designation, department, department_label, office_location, city, state,
      location_type, subtitle}`. `subtitle` is the ready-to-render descriptor
      line ("Human Resources | PP - Noida, Noida, Uttar Pradesh , ( Corporate -
      Remote )"); the individual parts are supplied too if you'd rather compose
      it yourself. `initials` drives the avatar when `image` is null. Any
      segment the person lacks is simply omitted from `subtitle`, so it never
      contains stray separators — it is `""` when nothing is known.
    - Single slots (manager / onboarding_spoc / recruiter) are **null** when
      unassigned, which is the cue to show the "not assigned yet" placeholder.
      List slots (buddies / teammates / notify_users) are always arrays,
      possibly empty.
    - `*_label` keys carry the human-readable name; the bare key carries the link
      ID. Render the label, filter/navigate by the ID.
    - `notify_users` is DERIVED — the distinct users assigned to this
      onboarding's tasks (activity rows plus each Task's assignments). There is
      no explicit notify list stored on the onboarding.
    - `verification_reports` is ALWAYS `[]` today. The key is present so the tab
      can be built against a stable contract, but no verification data is
      captured yet — the `Onboarding Document Verification` doctype exists but
      nothing populates it. Do not treat an empty array as "all verified".
    - `onboarding_documents[].status` is the document-level `boarding_status`
      (Pending / In Process / Submitted / Completed), so all rows share it.
    """
    try:
        # `name` must be a plain string. Frappe treats a dict as a *filter set*
        # in several lookup helpers, so accepting one would let a caller query by
        # arbitrary criteria instead of by docname.
        if not name or not isinstance(name, str):
            return _error_response("`name` is required and must be a string.", 400)

        # Permission BEFORE lookup: an unauthorised caller must not be able to
        # tell an existing docname from a missing one, so the doctype-level check
        # runs first and no query touches the record until it passes.
        frappe.has_permission(DOCTYPENAME, "read", throw=True)

        # Record-level access (user permissions, shares, if_owner) via get_list,
        # which runs the standard permission layer in SQL.
        #
        # NOT `has_permission(doc=name)`: given a docname string that helper does
        # `frappe.get_doc(...)` internally (frappe/permissions.py), reloading all
        # 11 child tables purely to answer a yes/no question. This probe is one
        # indexed query and doubles as the existence check.
        #
        # A record that is missing and one the caller may not see BOTH return 404
        # — deliberately indistinguishable, so this endpoint is not an oracle for
        # which onboardings exist.
        permitted = frappe.get_list(
            DOCTYPENAME,
            filters={"name": name},
            fields=["name"],
            limit_page_length=1,
            ignore_permissions=False,
        )
        if not permitted:
            # Deliberately does not echo `name` back — no reflecting caller input
            # into the response body.
            return _error_response("Employee Onboarding record not found.", 404)

        doc = _load_onboarding(name)
        if not doc:
            return _error_response("Employee Onboarding record not found.", 404)

        # --- header link labels: only look up links that are actually set -----
        labels = {}
        for fieldname, (target_dt, title_field) in _HEADER_LINK_TITLES.items():
            value = doc.get(fieldname)
            if not value:
                continue
            labels[fieldname] = (
                frappe.db.get_value(target_dt, value, title_field) or value
                if title_field
                else value
            )

        # --- people ----------------------------------------------------------
        manager = doc.get("custom_manager")
        spoc = doc.get("custom_onboarding_spoc")
        recruiter = doc.get("custom_onboarding_recruiter")
        buddies = _multiselect_users(doc, "custom_onboarding_buddy")
        teammates = _multiselect_users(doc, "custom_joining_buddy")

        tasks, task_assignees = _workflow_tasks(doc)

        # "Notify Users" has no stored list — it is whoever the onboarding's work
        # is actually assigned to: the users named on the activity rows plus the
        # users assigned to the generated Tasks.
        notify = []
        for source in ([row.get("user") for row in (doc.get("activities") or [])], task_assignees):
            for user_id in source:
                if user_id and user_id not in notify:
                    notify.append(user_id)

        directory = _people_directory(
            [manager, spoc, recruiter] + buddies + teammates + notify
        )

        data = {
            "name": doc.name,
            "boarding_status": doc.get("boarding_status"),
            "job_applicant": doc.get("job_applicant"),
            "employee": doc.get("employee"),
            "header": {
                "employee_name": doc.get("employee_name"),
                "employee_id": doc.get("employee"),
                "designation": doc.get("custom_designation"),
                "designation_label": labels.get("custom_designation"),
                "department": doc.get("custom_department"),
                "department_label": labels.get("custom_department"),
                "company": doc.get("custom_group_company"),
                "company_label": labels.get("custom_group_company"),
                "phone": doc.get("custom_primary_contact_number"),
                "email": doc.get("custom_email"),
                "date_of_joining": str(doc.get("custom_date_of_joining") or "") or None,
                "boarding_begins_on": str(doc.get("boarding_begins_on") or "") or None,
                "current_office_location": doc.get("custom_current_office_location"),
                "current_office_location_label": labels.get("custom_current_office_location"),
            },
            "manager": _person(directory, manager),
            "key_people": {
                "onboarding_spoc": _person(directory, spoc),
                "recruiter": _person(directory, recruiter),
                "buddies": [_person(directory, u) for u in buddies],
                "teammates": [_person(directory, u) for u in teammates],
                "notify_users": [_person(directory, u) for u in notify],
            },
            "onboarding_documents": _onboarding_documents(doc),
            "workflow_tasks": tasks,
            # No verification data is captured yet — see the docstring.
            "verification_reports": [],
        }

        return _success_response("Employee onboarding detail fetched successfully.", data)

    except frappe.PermissionError:
        return _error_response("You are not permitted to access this Employee Onboarding record.", 403)
    except frappe.ValidationError as e:
        return _error_response(str(e), 400)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Employee Onboarding Detail API Error")
        return _error_response("Unable to fetch Employee Onboarding detail right now.", 500)
