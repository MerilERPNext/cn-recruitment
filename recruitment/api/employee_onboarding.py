import frappe
import re
from recruitment.api.candidate_portal import (
    _get_active_pre_release,
    _get_onboarding_portal_rows,
    _read_onboarding_meta,
)
from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity

DOCTYPENAME = "Employee Onboarding"
MAX_PAGE_LENGTH = 100

APPLICANT_STATUS_TERMINAL = "Rejected"


def _get_applicant_status_options():
    """Ordered status options from Job Applicant doctype's `status` field."""
    meta = frappe.get_meta("Job Applicant")
    field = meta.get_field("status")
    return [o.strip() for o in (field.options or "").split("\n") if o.strip()]


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
            if allowed_map[fn].get("is_mandatory") and data[fn] in (None, "", [])
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

        doc.save(ignore_permissions=True)

        # On "save": recompute boarding_status, then ensure a save advances
        # Pending -> In Process. A save persists values but leaves fields
        # Pending (so they stay editable), so the count-based derivation can't
        # move past Pending on its own — nudge it to reflect partial progress.
        # Field-level approval_status stays untouched.
        if not is_submit and updated:
            from recruitment.api.field_level_approval import _sync_overall_status
            doc.reload()
            _sync_overall_status(doc)
            if (doc.get("boarding_status") or "Pending") == "Pending":
                doc.db_set("boarding_status", "In Process", update_modified=False)

        # On "submit": mark updated portal fields as Filled, snapshot current_value
        # (locks fields read-only for HR review) and sync the action center.
        # On "save": skip all of this so the fields stay editable on next fetch.
        if is_submit and updated:
            import json as _json
            doc.reload()
            for prow in (doc.get("custom_candidate_portal_fields") or []):
                if prow.fieldname not in updated:
                    continue
                ft = prow.get("fieldtype") or "Data"
                live_val = doc.get(prow.fieldname)

                # Only lock + mark Filled a field that actually holds a value.
                # An empty field in the submit payload stays Pending: editable,
                # not read-only, and not counted as "filled".
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
                          }} for r in rows_data],
                        ensure_ascii=False, default=str
                    )
                else:
                    prow.current_value = str(live_val) if live_val is not None else ""
                prow.approval_status = "Filled"

            doc.save(ignore_permissions=True)

            # ── Sync Candidate Action Center Item ─────────────────────────────
            try:
                from recruitment.api.action_center import sync_onboarding_field_rejection_action
                doc.reload()
                sync_onboarding_field_rejection_action(doc)
            except Exception:
                frappe.log_error(frappe.get_traceback(), "Action Center Sync Failed (Candidate Refill)")

            # Recompute boarding_status: flips to Submitted when no field is
            # left Pending or Rejected, otherwise In Process.
            from recruitment.api.field_level_approval import _sync_overall_status
            doc.reload()
            _sync_overall_status(doc)

        frappe.db.commit()

        from recruitment.api.field_level_approval import _compute_field_status_counts
        doc.reload()
        field_status_counts = _compute_field_status_counts(doc)

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
            eo_names = [row["name"] for row in data]
            agg_rows = frappe.db.sql(
                """
                SELECT
                    parent,
                    COUNT(*) AS total,
                    SUM(CASE WHEN COALESCE(approval_status,'Pending')='Pending'  THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN approval_status='Filled'   THEN 1 ELSE 0 END) AS filled,
                    SUM(CASE WHEN approval_status='Approved' THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN approval_status='Rejected' THEN 1 ELSE 0 END) AS rejected
                FROM `tabEmployee Onboarding Portal Field`
                WHERE parenttype=%s
                  AND parentfield='custom_candidate_portal_fields'
                  AND COALESCE(hidden,0)=0
                  AND parent IN %s
                GROUP BY parent
                """,
                (DOCTYPENAME, tuple(eo_names)),
                as_dict=True,
            )
            counts_by_name = {
                r["parent"]: {
                    "total":    int(r.get("total")    or 0),
                    "pending":  int(r.get("pending")  or 0),
                    "filled":   int(r.get("filled")   or 0),
                    "approved": int(r.get("approved") or 0),
                    "rejected": int(r.get("rejected") or 0),
                }
                for r in agg_rows
            }
            empty_counts = {"total": 0, "pending": 0, "filled": 0, "approved": 0, "rejected": 0}
            for row in data:
                row["field_status_counts"] = counts_by_name.get(row["name"], dict(empty_counts))

        count_result = frappe.get_list(
            DOCTYPENAME,
            fields=[{"COUNT": "name", "as": "total_count"}],
            filters=filters,
            or_filters=or_filters if or_filters else None,
            page_length=1,
        )
        total_count = int((count_result[0] or {}).get("total_count") or 0) if count_result else 0

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

@candidate_required
def get_applicant_status(email):
    """
    Full journey for a candidate: every Job Applicant record under this email,
    with per-job details and a status timeline (transition dates) for each.
    """
    enforce_candidate_identity(email=email)
    import json as _json
    from frappe.utils import getdate

    applicants = frappe.db.get_all(
        "Job Applicant",
        filters={"email_id": email},
        fields=[
            "name", "applicant_name", "status",
            "designation", "custom_company_finalized", "custom_location",
            "custom_employment_type", "custom_experience_range",
            "creation",
        ],
        order_by="creation asc",
    )

    if not applicants:
        return {"success": False, "message": "Applicant not found"}

    all_statuses = _get_applicant_status_options()
    lifecycle = [s for s in all_statuses if s != APPLICANT_STATUS_TERMINAL]
    candidate_name = applicants[0].applicant_name

    def _iso_date(value):
        return getdate(value).isoformat() if value else None

    applications = []
    for app in applicants:
        versions = frappe.db.get_all(
            "Version",
            filters={"ref_doctype": "Job Applicant", "docname": app.name},
            fields=["data", "creation"],
            order_by="creation asc",
        )

        status_dates = {}
        for v in versions:
            try:
                payload = _json.loads(v.data or "{}")
            except Exception:
                continue
            for change in payload.get("changed") or []:
                if not isinstance(change, list) or len(change) < 3:
                    continue
                if change[0] != "status":
                    continue
                new_val = change[2]
                if new_val and new_val not in status_dates:
                    status_dates[new_val] = _iso_date(v.creation)

        creation_date = _iso_date(app.creation)

        active = set()
        if app.status == APPLICANT_STATUS_TERMINAL and app.status in all_statuses:
            active.add(APPLICANT_STATUS_TERMINAL)
        elif app.status in lifecycle:
            current_index = lifecycle.index(app.status)
            active.update(lifecycle[: current_index + 1])

        flags = []
        for stage in all_statuses:
            date = status_dates.get(stage)
            if not date and stage in active and stage in lifecycle and lifecycle.index(stage) == 0:
                date = creation_date
            flags.append({
                "status": stage,
                "flag": stage in active,
                "date": date,
            })

        applications.append({
            "id": app.name,
            "applied_on": creation_date,
            "job": {
                "designation": app.designation,
                "company": app.custom_company_finalized,
                "location": app.custom_location,
                "experience_range": app.custom_experience_range,
                "employment_type": app.custom_employment_type,
            },
            "status": app.status,
            "flags": flags,
        })

    return {
        "success": True,
        "data": {
            "email": email,
            "name": candidate_name,
            "applications": applications,
        },
    }