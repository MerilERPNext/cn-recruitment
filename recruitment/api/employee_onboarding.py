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


def _snapshot_portal_values(doc, updated_fields):
    """Refresh ONLY the `current_value` snapshot of the given portal rows from the
    live doc values, leaving `approval_status` untouched (stays Pending/Rejected,
    i.e. editable).

    The approval read endpoint (`get_onboarding_fields_for_approval`) shows each
    field's stored `current_value`, which is otherwise refreshed only on submit
    (via `_lock_filled_portal_fields`). Calling this on the "save" path makes a
    plain save visible to that endpoint immediately, without locking the field.
    Mutates `doc` in place — the caller saves.
    """
    import json as _json
    for prow in (doc.get("custom_candidate_portal_fields") or []):
        if prow.fieldname not in updated_fields:
            continue
        ft = prow.get("fieldtype") or "Data"
        live_val = doc.get(prow.fieldname)
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
def update_onboarding_details_ess(email, data, action="submit"):
    """Session-authenticated twin of `update_onboarding_details`, for internal
    (HR / ESS) portals.

    IDENTICAL request/response contract and behaviour to `update_onboarding_details`
    — same params (`email`, `data`, `action`), same validation, same write path,
    same JSON shape — with ONE difference: it is NOT gated by `@candidate_required`
    / `enforce_candidate_identity` (which force a logout for anyone who is not a
    logged-in candidate). Instead it runs as the logged-in session user and is
    guarded by ordinary Employee Onboarding *write* permission. The candidate-facing
    endpoint above is left exactly as-is.
    """
    frappe.has_permission(DOCTYPENAME, "write", throw=True)
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

                # Persist the portal `current_value` snapshot in the SAME save so the
                # approval read endpoint (which shows current_value) reflects this
                # write immediately. On submit the fields also lock (mark Filled);
                # on save the snapshot is refreshed but the field stays editable.
                if updated:
                    if is_submit:
                        _lock_filled_portal_fields(doc, updated)
                    else:
                        _snapshot_portal_values(doc, updated)

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
                frappe.log_error(frappe.get_traceback(), "Action Center Sync Failed (ESS Refill)")
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

        # Drop the cached copy so the immediately-following read (e.g. the approval
        # panel refetch) sees this write straight away instead of a pre-update copy.
        frappe.clear_document_cache(DOCTYPENAME, onboarding_name)

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
        frappe.log_error(message=frappe.get_traceback(), title="Employee Onboarding Update Failed (ESS)")
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
# Backs the "Onboarding In Progress -> <candidate>" screen: header, Key People
# sidebar and the three tabs. One call per page load, assembled in a fixed number
# of queries — nothing is looked up per row.
#
# The User/Employee/Branch/Task reads below use frappe.get_all, which bypasses
# permission checks: whoever may read this onboarding may see its key people and
# tasks without needing blanket access to those doctypes. That elevation is kept
# narrow by the column allowlists (_PERSON_*_FIELDS, _TASK_FIELDS) — never
# select *. Do not add salary, statutory or identity-document columns to them.

# Bound the two list-shaped parts of the payload so a corrupt record degrades to
# a truncated response rather than an unbounded query.
_MAX_TASKS = 200
_MAX_PEOPLE = 100

# {header key: (Employee field, Employee Onboarding fallback field)}. The
# Employee wins once it exists — this endpoint runs post-creation and HR may have
# corrected details there since.
_HEADER_FIELD_SOURCES = {
    "employee_name": ("employee_name", "employee_name"),
    "designation": ("designation", "custom_designation"),
    "department": ("department", "custom_department"),
    "company": ("company", "custom_group_company"),
    "phone": ("cell_number", "custom_primary_contact_number"),
    "date_of_joining": ("date_of_joining", "custom_date_of_joining"),
    "office_location": ("branch", "custom_current_office_location"),
}

# {header key: (target doctype, title field)}. These doctypes name themselves with
# codes (DES_PW_00004, DEP_76, PP_01), so a label never comes from `name`.
# Office location needs several columns and is handled by _office_location.
_HEADER_LINK_TITLES = {
    "designation": ("Designation", "custom_designation_title"),
    "department": ("Department", "department_name"),
    "company": ("Company", "company_name"),
}

# Scalar columns the page needs. Listing them explicitly instead of using
# get_doc avoids loading the 7 child tables this endpoint never reads.
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

_PERSON_USER_FIELDS = ["name", "full_name", "email", "user_image"]
_PERSON_EMPLOYEE_FIELDS = [
    "name", "user_id", "employee_name", "image", "designation", "department", "branch",
]

# Filtered against Task's meta before querying, so a missing custom field yields
# an absent key rather than a SQL error.
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

    Returns a `frappe._dict` of the scalar fields plus the 4 child tables in
    `_ONBOARDING_CHILD_TABLES`, or None when the record does not exist. get_doc
    would query all 11 child tables; this page reads 4.

    The `meta` key stands in for a real Document's `.meta`, which
    `_get_onboarding_portal_rows` calls into.
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


_HEADER_EMPLOYEE_FIELDS = [
    "name", "employee_name", "employee_number", "status", "custom_employment_status",
    "image", "designation", "department", "company", "branch",
    "cell_number", "company_email", "personal_email", "date_of_joining",
]


def _resolve_employee_id(doc):
    """The Employee this onboarding produced, or None.

    Prefers the stored `employee` link, which HRMS fills during validate — so it
    stays blank if the Employee is created and the onboarding never re-saved.
    Falls back to HRMS's own lookup (`Employee.job_applicant`) so the page is
    correct immediately; one extra query, only in that degraded case.
    """
    employee_id = doc.get("employee")
    if employee_id:
        return employee_id
    job_applicant = doc.get("job_applicant")
    if not job_applicant:
        return None
    return frappe.db.get_value("Employee", {"job_applicant": job_applicant}, "name")


def _header_employee(employee_id):
    """The linked Employee row, or None. One lookup by primary key, only when set."""
    if not employee_id:
        return None
    return frappe.db.get_value("Employee", employee_id, _HEADER_EMPLOYEE_FIELDS, as_dict=True)


def _office_location(branch_id):
    """The header's office location, as parts plus a `display` string:

        PP - Noida, Noida, Uttar Pradesh, India, ( Corporate )

    A Branch docname is a code, so the readable name comes from its `branch`
    field. Returns the same keys (all None, `display: ""`) when there is no
    branch, so the header shape never varies. At most 2 lookups, only when set.
    """
    blank = {
        "id": None, "label": None, "city": None, "state": None,
        "country": None, "location_type": None, "display": "",
    }
    if not branch_id:
        return blank

    row = frappe.db.get_value(
        "Branch",
        branch_id,
        ["branch", "custom_office_city", "custom_state", "custom_country", "custom_location_type"],
        as_dict=True,
    )
    if not row:
        # Dangling link — surface the id rather than dropping the field silently.
        return {**blank, "id": branch_id, "label": branch_id, "display": branch_id}

    location_type = (
        frappe.db.get_value("Location Type", row.custom_location_type, "location_type")
        if row.custom_location_type
        else None
    )

    label = row.branch or branch_id
    place = ", ".join(p for p in (label, row.custom_office_city, row.custom_state, row.custom_country) if p)
    return {
        "id": branch_id,
        "label": label,
        "city": row.custom_office_city,
        "state": row.custom_state,
        "country": row.custom_country,
        "location_type": location_type,
        "display": f"{place}, ( {location_type} )" if location_type else place,
    }


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
    """Avatar initials: "Gopal Kumar" -> "GK", blank -> "?". Punctuation-only
    parts (the trailing "." in "Yashwant .") are ignored."""
    parts = [p for p in (full_name or "").split() if p and p[0].isalnum()]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _person_subtitle(department_label, office_location, city, state, location_type):
    """The one-line descriptor under a person's name:

        Human Resources | PP - Noida, Noida, Uttar Pradesh , ( Corporate )

    Every segment is optional; missing ones are dropped rather than leaving stray
    separators, so an unknown person yields "".
    """
    place = ", ".join(p for p in (office_location, city, state) if p)
    head = " | ".join(p for p in (department_label, place) if p)
    if location_type:
        return f"{head} , ( {location_type} )" if head else f"( {location_type} )"
    return head


def _people_directory(user_ids):
    """{user_id: person dict} for every person the page shows, in four queries
    regardless of how many there are.

    Each person's descriptor line spans User -> Employee -> Department / Branch ->
    Location Type. Walking those per person would be ~5 queries each, so every
    level is fetched in one batched pass and joined in memory. Ids with no User
    row are absent from the result.
    """
    # Task assignees reach here from the DB, so bound and type-check the ids.
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

    # A user without an Employee record (an external recruiter, say) still
    # renders, just without a descriptor line.
    # NOTE: Employee.user_id is unindexed, so this scans tabEmployee. Bounded and
    # run once per request, but it is this endpoint's dominant cost at scale.
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
    """One person entry, or None when unassigned — the UI renders its "not
    assigned yet" placeholder off the null. An id with no User row still yields a
    bare entry so a stale assignment stays visible rather than disappearing."""
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
    """User ids from an Onboarding Buddy User table, in order, de-duplicated."""
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
    """Rows for the Onboarding Documents tab — one per portal form resolved for
    this candidate (`_get_onboarding_portal_rows` owns the precedence).

    `field_count` is the visible portal field count the UI shows beside the form
    name. `status` is the document-level `boarding_status`, since no per-form
    status is stored today, so every row carries the same value.
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

    Tasks hang off the onboarding's Project, the same join
    `refresh_onboarding_task_days_to_join` uses. Empty until tasks are generated.
    """
    project = doc.get("project")
    if not project:
        return [], []

    meta = frappe.get_meta("Task")
    fields = [f for f in _TASK_FIELDS if meta.get_field(f) or f == "name"]
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
        "header": {employee_name, employee_id, employee_number, employee_status,
                   custom_employment_status, image, initials,
                   designation, designation_label,
                   department, department_label, company, company_label,
                   phone, email, date_of_joining, boarding_begins_on,
                   current_office_location, current_office_location_label,
                   current_office_location_display, current_office_location_detail},
        "manager": <person|null>,
        "key_people": {onboarding_spoc, recruiter, buddies[], teammates[],
                       notify_users[]},
        "onboarding_documents": [...],
        "workflow_tasks": [...],
        "verification_reports": []
    }}

    Notes for the frontend
    ----------------------
    - Every person is `{user, employee, full_name, initials, email, image,
      designation, department, department_label, office_location, city, state,
      location_type, subtitle}`. `subtitle` is ready to render; the parts are
      supplied too. `initials` drives the avatar when `image` is null.
    - Single slots (manager / onboarding_spoc / recruiter) are null when
      unassigned — the cue for the "not assigned yet" placeholder. List slots
      (buddies / teammates / notify_users) are always arrays, possibly empty.
    - `*_label` carries the readable name, the bare key the link ID: render the
      label, navigate by the ID. The linked doctypes name themselves with codes,
      so the bare ID is not presentable.
    - Office location also has `current_office_location_display` (ready-to-render
      place line) and `current_office_location_detail` with the parts broken out.
    - Header values prefer the linked Employee and fall back to the onboarding's
      own fields. `employee_number`, `employee_status`, `custom_employment_status`
      and `image` come only from the Employee and are null until it exists. The
      shape never changes. `employee_status` is the record's lifecycle state
      (Active / Left / ...); `custom_employment_status` is the HR state
      (On Probation, Confirmed, On Notice Period, ...).
    - `onboarding_template` / `onboarding_template_label` are ALWAYS null — which
      flow was run is resolved on the flow side. The keys exist so the shape does
      not change when that is wired up.
    - `notify_users` is derived from the users assigned to this onboarding's
      activity rows and Tasks; no explicit notify list is stored.
    - `verification_reports` is ALWAYS []. Nothing captures verification data yet,
      so do not read an empty array as "all verified".
    - `onboarding_documents[].status` is the doc-level `boarding_status`, so all
      rows share it.
    """
    try:
        # Frappe treats a dict as a filter set in several lookup helpers, so
        # accepting one would let a caller query by criteria instead of docname.
        if not name or not isinstance(name, str):
            return _error_response("`name` is required and must be a string.", 400)

        # Doctype permission first, before any query touches the record.
        frappe.has_permission(DOCTYPENAME, "read", throw=True)

        # Record-level access (user permissions, shares, if_owner) in one indexed
        # query that doubles as the existence check. Not `has_permission(doc=name)`:
        # given a docname that helper calls get_doc internally, reloading all 11
        # child tables to answer a yes/no. Missing and forbidden both return 404,
        # so this is not an oracle for which onboardings exist.
        permitted = frappe.get_list(
            DOCTYPENAME,
            filters={"name": name},
            fields=["name"],
            limit_page_length=1,
            ignore_permissions=False,
        )
        if not permitted:
            # Does not echo `name` back into the response body.
            return _error_response("Employee Onboarding record not found.", 404)

        doc = _load_onboarding(name)
        if not doc:
            return _error_response("Employee Onboarding record not found.", 404)

        employee_id = _resolve_employee_id(doc)
        emp = _header_employee(employee_id)

        def pick(employee_field, onboarding_field):
            value = emp.get(employee_field) if emp else None
            return value or doc.get(onboarding_field)

        header_values = {
            key: pick(employee_field, onboarding_field)
            for key, (employee_field, onboarding_field) in _HEADER_FIELD_SOURCES.items()
        }
        header_values["email"] = (
            (emp.get("company_email") or emp.get("personal_email") if emp else None)
            or doc.get("custom_email")
        )

        # --- header link labels: only look up links that are actually set -----
        # Titles are stored with stray trailing spaces on some records
        # ("Human Resource "), so every label is stripped before it ships.
        labels = {}
        for key, (target_dt, title_field) in _HEADER_LINK_TITLES.items():
            value = header_values.get(key)
            if not value:
                continue
            title = frappe.db.get_value(target_dt, value, title_field)
            labels[key] = (title or "").strip() or value

        office = _office_location(header_values.get("office_location"))
        employee_name = header_values.get("employee_name")

        manager = doc.get("custom_manager")
        spoc = doc.get("custom_onboarding_spoc")
        recruiter = doc.get("custom_onboarding_recruiter")
        buddies = _multiselect_users(doc, "custom_onboarding_buddy")
        teammates = _multiselect_users(doc, "custom_joining_buddy")

        tasks, task_assignees = _workflow_tasks(doc)

        # No notify list is stored; it is whoever the work is assigned to.
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
            "employee": employee_id,
            "header": {
                "employee_name": employee_name,
                "employee_id": employee_id,
                "employee_number": emp.get("employee_number") if emp else None,
                "employee_status": emp.get("status") if emp else None,
                "custom_employment_status": emp.get("custom_employment_status") if emp else None,
                "image": emp.get("image") if emp else None,
                "initials": _initials(employee_name),
                # Owned by the flow side; kept here only so the shape is stable.
                "onboarding_template": None,
                "onboarding_template_label": None,
                "designation": header_values.get("designation"),
                "designation_label": labels.get("designation"),
                "department": header_values.get("department"),
                "department_label": labels.get("department"),
                "company": header_values.get("company"),
                "company_label": labels.get("company"),
                "phone": header_values.get("phone"),
                "email": header_values.get("email"),
                "date_of_joining": str(header_values.get("date_of_joining") or "") or None,
                "boarding_begins_on": str(doc.get("boarding_begins_on") or "") or None,
                "current_office_location": office["id"],
                "current_office_location_label": office["label"],
                "current_office_location_display": office["display"],
                "current_office_location_detail": office,
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
