import frappe
import re
from recruitment.api.candidate_portal import _get_onboarding_portal_rows, _read_onboarding_meta

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


@frappe.whitelist(allow_guest=True)
def update_onboarding_details(email, data):
    """
    Updates an Employee Onboarding record identified by the job_applicant email.
    Only fields configured in the candidate portal form AND in Pending/Rejected status are accepted.
    After save, marks each updated field as Filled and snapshots current_value.
    """
    frappe.local.response["http_status_code"] = 200

    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "code": 400, "message": "Invalid data format. Expected JSON."}

    if not data or not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "code": 400, "message": "Data must be a valid dictionary of fields to update."}

    onboarding_name = frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": email, "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )

    if not onboarding_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "code": 404, "message": f"No Employee Onboarding record found for {email}"}

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

        # Mark updated portal fields as Filled and snapshot current_value
        if updated:
            import json as _json
            doc.reload()
            for prow in (doc.get("custom_candidate_portal_fields") or []):
                if prow.fieldname not in updated:
                    continue
                ft = prow.get("fieldtype") or "Data"
                live_val = doc.get(prow.fieldname)
                if ft == "Table":
                    rows_data = live_val or []
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

        frappe.db.commit()

        return {
            "status": "success",
            "code": 200,
            "message": "Employee Onboarding updated successfully. Fields are now pending HR review.",
            "data": {
                "name": doc.name,
                "job_applicant": doc.job_applicant,
                "updated_fields": updated,
            },
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(), title="Employee Onboarding Update Failed")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "code": 500, "message": str(e)}


@frappe.whitelist()
def get_employee_onboarding_list(order_by="boarding_status asc", page_length=10, start=0):
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

        data = frappe.get_list(
            DOCTYPENAME,
            fields=fields,
            order_by=safe_order_by,
            start=start_value,
            page_length=page_length_value,
        )

        count_result = frappe.get_list(
            DOCTYPENAME,
            fields=["count(name) as total_count"],
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
        )
    except frappe.ValidationError as e:
        return _error_response(str(e), 400)
    except frappe.PermissionError:
        return _error_response("You are not permitted to access Employee Onboarding records.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Employee Onboarding List API Error")
        return _error_response("Unable to fetch Employee Onboarding list right now.", 500)

@frappe.whitelist(allow_guest=True)
def get_applicant_status(email):
    """
    Full journey for a candidate: every Job Applicant record under this email,
    with per-job details and a status timeline (transition dates) for each.
    """
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