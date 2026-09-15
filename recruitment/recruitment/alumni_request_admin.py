"""Staff-facing actions on `Alumni Portal Request` (approve/reject a stage).

Deliberately kept OUT of `alumni_guard.ALUMNI_NAMESPACES`. An alumni session must
never reach these -- the guard's default-deny does that automatically with no
per-function check needed here (see `alumni_guard.py`'s module docstring:
"Everyone else [not an alumni session] is untouched"). HR staff calling this
module are ordinary ESS/Desk sessions, so the guard hook never intervenes for
them at all.

Authorization here is role-based against each stage's `assigned_role`
(`Alumni Portal Request Stage.assigned_role`), mirroring the same
soft/role-driven authorization model ESS's own Separation/Confirmation engine
uses (Frappe doctype permissions on `Employee Separation` are System-Manager-only
too -- the real gate there is ToDo/role assignment, not raw doctype perms; see
`revoke_separation.py` in the reference). `act_on_alumni_request_stage` saves
with `ignore_permissions=True` for the same reason -- the explicit role check
above it is what actually authorizes the action, not the doctype's write
permission (which stays System Manager / HR Manager only, so casual Desk users
can't edit these records outside this controlled action path).

Endpoints (call as `recruitment.recruitment.alumni_request_admin.<fn>`):
    act_on_alumni_request_stage, get_pending_alumni_requests_for_me
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime


def _user_can_act_on_stage(stage_row, user: str) -> bool:
    if not stage_row or not stage_row.assigned_role:
        return False
    return stage_row.assigned_role in frappe.get_roles(user)


@frappe.whitelist(methods=["POST"])
def act_on_alumni_request_stage(request_name: str, action: str, remarks: str | None = None) -> dict:
    """Approve or reject the CURRENT (first Pending) stage of a request.

    Sequential like Separation/Confirmation: only the first Pending stage is
    ever actionable. Approving the last stage completes the request; rejecting
    any stage halts it immediately and marks remaining stages Skipped.
    """
    if action not in ("Approve", "Reject"):
        frappe.throw(_("action must be 'Approve' or 'Reject'."))

    doc = frappe.get_doc("Alumni Portal Request", request_name)

    if doc.status not in ("Submitted", "In Review"):
        frappe.throw(_("This request is not currently awaiting review (status: {0}).").format(doc.status))

    stage = doc.current_stage()
    if not stage:
        frappe.throw(_("No pending stage on this request."))

    if not _user_can_act_on_stage(stage, frappe.session.user):
        frappe.throw(_("You do not hold the role required to act on this stage."), frappe.PermissionError)

    stage.status = "Approved" if action == "Approve" else "Rejected"
    stage.action_taken_by = frappe.session.user
    stage.action_taken_on = now_datetime()
    stage.remarks = (remarks or "").strip()[:500]

    if action == "Reject":
        doc.status = "Rejected"
        doc.decided_by = frappe.session.user
        doc.decision_on = now_datetime()
        doc.decision_remarks = stage.remarks
        for row in doc.stages:
            if row.status == "Pending":
                row.status = "Skipped"
    else:
        remaining_pending = [r for r in doc.stages if r.status == "Pending"]
        if remaining_pending:
            doc.status = "In Review"
        else:
            doc.status = "Approved"
            doc.decided_by = frappe.session.user
            doc.decision_on = now_datetime()
            doc.decision_remarks = stage.remarks

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status, "stage": stage.stage_name}


@frappe.whitelist(methods=["GET"])
def get_pending_alumni_requests_for_me() -> dict:
    """Open requests whose CURRENT stage's role is held by the calling staff user."""
    user_roles = set(frappe.get_roles(frappe.session.user))
    open_requests = frappe.get_all(
        "Alumni Portal Request",
        filters={"status": ["in", ("Submitted", "In Review")]},
        fields=["name", "alumni_employee_name", "request_category", "status", "requested_on"],
        order_by="requested_on asc",
    )
    actionable = []
    for req in open_requests:
        doc = frappe.get_doc("Alumni Portal Request", req.name)
        stage = doc.current_stage()
        if stage and stage.assigned_role in user_roles:
            actionable.append({**req, "current_stage": stage.stage_name})
    return {"requests": actionable}
