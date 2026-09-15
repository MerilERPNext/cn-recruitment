"""Alumni Portal — Separation/Confirmation history, and self-contained staged
Alumni Requests (e.g. re-engagement consideration, document verification).

Two distinct things live in this module, both session-scoped and alumni-only
(reuse `_require_alumni_session`/`alumni_employee_name` from `alumni_portal`):

1. READ-ONLY history of the alumnus's own, already-existing ESS records
   (`get_my_separation_status`, `get_my_confirmation_history`). These reflect a
   process that already happened while the person was still an active employee
   -- nothing is created or mutated here. Where possible they call the exact,
   already-whitelisted `cn_hrms_core` read APIs directly as plain Python
   function calls (not RPC) -- e.g. `get_separation_details`,
   `get_notice_period_and_separation_policy` -- so the numbers shown match what
   ESS itself would show. They deliberately do NOT reconstruct a per-stage
   Approval Tracker timeline (who-approved-what-when): that lives in `nextai`'s
   Approval Tracker/Approval Stages/Approval Log Entry doctypes, whose exact
   field-level schema wasn't verified while building this, and guessing it
   would risk silently wrong output. `boarding_status` (Employee Separation's
   own coarse status Select) is surfaced instead as a safe, verified stand-in
   for "where the process is."

2. A NEW, self-contained staged-request engine
   (`get_alumni_request_categories`, `create_alumni_request`,
   `get_my_alumni_requests`, `get_alumni_request`, `revoke_alumni_request`) that
   replicates the *shape* of Separation/Confirmation's business logic --
   sequential review stages, role-based approvers, a terminal-status lifecycle,
   revoke -- WITHOUT depending on the `nextai` Funnel/Approval-Matrix engine.
   That engine assumes Employee identity (ToDos, Frappe roles, Employee
   link-field approver resolution) and alumni sessions are deliberately
   firewalled away from nearly all of it by `alumni_guard.py`. See
   `Alumni Portal Request`'s doctype docstring for the full rationale.

   Staff-side stage actions (approve/reject) live in the SEPARATE
   `alumni_request_admin` module, deliberately NOT added to
   `alumni_guard.ALUMNI_NAMESPACES` -- so an alumni session can never reach them,
   with no per-function check needed (the guard's default-deny handles it).

Endpoints (call as `recruitment.recruitment.alumni_separation.<fn>`):
    get_my_separation_status, get_my_confirmation_history,
    get_alumni_request_categories, create_alumni_request,
    get_my_alumni_requests, get_alumni_request, revoke_alumni_request
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from recruitment.recruitment.alumni_portal import (
    _d,
    _require_alumni_session,
    alumni_employee_name,
)


def _current_alumni_employee() -> str:
    employee = alumni_employee_name()
    if not employee:
        frappe.throw(_("No employee record linked to this account."))
    return employee


# ── Read-only: my own historical Separation ──────────────────────────────────

@frappe.whitelist(methods=["GET"])
def get_my_separation_status() -> dict:
    """The alumnus's own most recent Employee Separation record, read-only."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    sep_name = frappe.db.get_value(
        "Employee Separation",
        {"employee": employee, "docstatus": ["!=", 2]},
        "name",
        order_by="creation desc",
    )
    if not sep_name:
        return {"has_separation_record": False}

    sep = frappe.db.get_value(
        "Employee Separation",
        sep_name,
        [
            "name",
            "boarding_status",
            "custom_status",
            "custom_resignaion_type",
            "custom_resignation_date",
            "custom_final_last_working_day",
            "custom_requested_last_working_date",
            "custom_proposed_last_working_day",
            "custom_notice_period_days",
            "custom_reason_for_resignation",
            "custom_final_reason_for_separation",
            "custom_asset_noc_clearance_date",
            "custom_finance_noc_clearance_date",
            "custom_loan_advance_noc_date",
            "resignation_letter_date",
        ],
        as_dict=True,
    )

    relieving_date = frappe.db.get_value("Employee", employee, "relieving_date")

    notice_period_label = None
    try:
        from cn_hrms_core.cn_hrms_core.apis.assignment_details import (
            get_notice_period_and_separation_policy,
        )

        notice_period_label = (
            get_notice_period_and_separation_policy(employee=employee) or {}
        ).get("notice_period")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Alumni: notice period lookup failed")

    approval_summary = {}
    try:
        from cn_hrms_core.cn_hrms_core.apis.separation_details import (
            get_separation_details,
        )

        approval_summary = get_separation_details(employee=employee) or {}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Alumni: separation details lookup failed")

    return {
        "has_separation_record": True,
        "separation": {
            "name": sep.name,
            "type": sep.custom_resignaion_type,
            "status": sep.custom_status or sep.boarding_status,
            "boarding_status": sep.boarding_status,
            "resignation_date": _d(sep.custom_resignation_date),
            "last_working_day": _d(
                sep.custom_final_last_working_day
                or sep.custom_requested_last_working_date
                or sep.custom_proposed_last_working_day
            ),
            "relieving_date": _d(relieving_date),
            "notice_period": notice_period_label,
            "reason_for_resignation": sep.custom_reason_for_resignation,
            "final_reason_for_separation": sep.custom_final_reason_for_separation,
            "clearance": {
                "asset_noc": _d(sep.custom_asset_noc_clearance_date),
                "finance_noc": _d(sep.custom_finance_noc_clearance_date),
                "loan_advance_noc": _d(sep.custom_loan_advance_noc_date),
            },
            "approval": approval_summary,
        },
    }


@frappe.whitelist(methods=["GET"])
def get_my_confirmation_history() -> dict:
    """The alumnus's full probation-confirmation journey, read-only."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    rows = frappe.get_all(
        "Employee Confirmation",
        filters={"employee": employee, "docstatus": ["!=", 2]},
        fields=["name", "status", "probation_end_date", "is_extension_confirmation", "modified"],
        order_by="creation asc",
    )
    return {
        "confirmations": [
            {
                "name": r.name,
                "status": r.status,
                "is_extension": bool(r.is_extension_confirmation),
                "probation_end_date": _d(r.probation_end_date),
                "date": _d(r.modified),
            }
            for r in rows
        ]
    }


# ── Self-contained staged Alumni Requests ────────────────────────────────────

@frappe.whitelist(methods=["GET"])
def get_alumni_request_categories() -> dict:
    """Active request categories available to raise a new request against."""
    _require_alumni_session()
    rows = frappe.get_all(
        "Alumni Request Category",
        filters={"is_active": 1},
        fields=["name", "category_name", "description"],
        order_by="category_name asc",
    )
    return {"categories": rows}


@frappe.whitelist(methods=["POST"])
def create_alumni_request(request_category: str, reason: str | None = None) -> dict:
    """Raise a new staged request. Stages are copied from the category's
    `stage_template` at creation time, so later edits to the category don't
    retroactively change requests already in flight (mirrors how Separation/
    Confirmation resolve their Approval Policy Matrix at initiation time)."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    category = frappe.get_doc("Alumni Request Category", request_category)
    if not category.is_active:
        frappe.throw(_("This request category is not currently accepting requests."))
    if not category.stage_template:
        frappe.throw(_("This request category has no review stages configured. Contact HR."))

    doc = frappe.new_doc("Alumni Portal Request")
    doc.alumni_employee = employee
    doc.alumni_user = frappe.session.user
    doc.request_category = category.name
    doc.status = "Submitted"
    doc.requested_on = now_datetime()
    doc.reason = (reason or "").strip()[:1000]
    for row in category.stage_template:
        doc.append(
            "stages",
            {"stage_name": row.stage_name, "assigned_role": row.assigned_role, "status": "Pending"},
        )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist(methods=["GET"])
def get_my_alumni_requests(status: str | None = None, limit: int = 50, start: int = 0) -> dict:
    """The calling alumnus's own requests only -- hard-filtered on employee, never a caller-supplied one."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    filters = {"alumni_employee": employee}
    if status:
        filters["status"] = status

    rows = frappe.get_all(
        "Alumni Portal Request",
        filters=filters,
        fields=["name", "request_category", "status", "requested_on", "decision_on"],
        order_by="requested_on desc",
        limit_page_length=min(int(limit), 100),
        limit_start=int(start),
    )
    total = frappe.db.count("Alumni Portal Request", filters=filters)
    return {"requests": rows, "total": total}


@frappe.whitelist(methods=["GET"])
def get_alumni_request(name: str) -> dict:
    """One request's full detail + stage timeline -- ownership-checked."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    doc = frappe.get_doc("Alumni Portal Request", name)
    if doc.alumni_employee != employee:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized to view this request."), frappe.PermissionError)

    return {
        "name": doc.name,
        "request_category": doc.request_category,
        "status": doc.status,
        "requested_on": _d(doc.requested_on),
        "reason": doc.reason,
        "decided_by": doc.decided_by,
        "decision_on": _d(doc.decision_on),
        "decision_remarks": doc.decision_remarks,
        "revoke_reason": doc.revoke_reason,
        "stages": [
            {
                "stage_name": s.stage_name,
                "assigned_role": s.assigned_role,
                "status": s.status,
                "action_taken_by": s.action_taken_by,
                "action_taken_on": _d(s.action_taken_on),
                "remarks": s.remarks,
            }
            for s in doc.stages
        ],
    }


@frappe.whitelist(methods=["POST"])
def revoke_alumni_request(name: str, reason: str | None = None) -> dict:
    """Self-revoke a still-open request -- ownership-checked, and only when the
    category allows self-revoke (`Alumni Request Category.allow_alumni_self_revoke`)."""
    _require_alumni_session()
    employee = _current_alumni_employee()

    doc = frappe.get_doc("Alumni Portal Request", name)
    if doc.alumni_employee != employee:
        frappe.local.response["http_status_code"] = 403
        frappe.throw(_("Not authorized to revoke this request."), frappe.PermissionError)

    if doc.status not in ("Draft", "Submitted", "In Review"):
        frappe.throw(
            _("Only a request still under review can be revoked (current status: {0}).").format(doc.status)
        )

    allow_self_revoke = frappe.db.get_value(
        "Alumni Request Category", doc.request_category, "allow_alumni_self_revoke"
    )
    if not allow_self_revoke:
        frappe.throw(_("Requests of this category cannot be self-revoked. Contact HR."))

    doc.status = "Revoked"
    doc.revoke_reason = (reason or "").strip()[:500]
    for row in doc.stages:
        if row.status == "Pending":
            row.status = "Skipped"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status}
