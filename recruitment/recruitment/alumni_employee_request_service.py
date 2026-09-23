"""Service layer for the Alumni Employee Request feature (Recruitment app).

An Alumni Employee Request is raised — typically from the Alumni Portal by a
Guest, but also from Desk — asking that a former employee be granted Alumni
Portal access. The request is routed through a Frappe **Workflow** (no approval
logic is hardcoded anywhere); when it reaches the ``Approved`` workflow state the
linked Employee is flagged with ``custom_is_alumni_employee = 1``.

That flag is the *existing* Alumni Portal gate (see
``recruitment.recruitment.alumni_portal``): setting it on the Employee is mirrored
to the linked User by the existing ``sync_alumni_flag`` Employee ``on_update``
hook, after which the person can sign in to the Alumni Portal. Nothing in the
existing login / gate / sync behaviour is modified — this module only *reuses* it.

Layering
--------
* ``api/alumni_request.py``      — thin whitelisted (Guest) transport layer.
* this module                    — reusable business logic (validation, creation,
                                   the ``mark_employee_as_alumni`` helper, and the
                                   workflow-transition hook).
* ``doctype/alumni_employee_request`` — the persisted document + controller.

Everything here is idempotent and never raises to break an unrelated save.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, getdate, now_datetime, validate_email_address

from recruitment.recruitment.alumni_portal import ALUMNI_FLAG, employee_is_alumni

DOCTYPE = "Alumni Employee Request"
ALUMNI_LEFT_STATUS = "Left"
ACTIVE_STATUS = "Active"

# Workflow states that still count as an in-flight request for duplicate checks.
OPEN_WORKFLOW_STATES = ("Pending Approval", "HR Approved")

# workflow_state -> user-facing `status`. Keeps `status` correct on every entry
# path (Guest create, Desk create, workflow transition) — not only on transitions
# where the workflow's own update_field would fire.
_STATE_TO_STATUS = {
    "Draft": "Draft",
    "Pending Approval": "Pending Approval",
    "HR Approved": "Pending Approval",
    "Approved": "Approved",
    "Rejected": "Rejected",
    "Cancelled": "Cancelled",
}


def status_for_state(workflow_state: str | None) -> str:
    """Map a workflow_state to the user-facing `status` (defaults to the state)."""
    return _STATE_TO_STATUS.get(workflow_state or "", workflow_state or "Draft")

_logger = frappe.logger("recruitment", allow_site=True)


class AlumniRequestError(frappe.ValidationError):
    """Raised when an Alumni Employee Request cannot be accepted.

    ``error_code`` is optional and machine-readable, for the handful of cases
    where a caller (the Alumni Portal frontend) needs to branch on WHICH rule
    failed rather than just display the message — e.g. offering a fix instead
    of a dead end when Personal Email is missing. Every other raise site leaves
    it unset, and the API layer only includes the field in the JSON response
    when it is present, so this is additive: an unset code changes nothing.
    """

    def __init__(self, message, error_code: str | None = None):
        super().__init__(message)
        self.error_code = error_code


# ── Input hygiene ─────────────────────────────────────────────────────────────
def _clean(value) -> str:
    """Trim a scalar to a plain string ("" for None)."""
    return (value or "").strip() if isinstance(value, str) else ("" if value is None else str(value).strip())


def _employee_emails(emp: "frappe._dict") -> set[str]:
    """Every email that legitimately identifies this Employee, lower-cased."""
    candidates = {
        emp.get("company_email"),
        emp.get("personal_email"),
        emp.get("prefered_email"),
        emp.get("user_id"),
    }
    if emp.get("user_id"):
        candidates.add(frappe.db.get_value("User", emp.get("user_id"), "email"))
    return {c.strip().lower() for c in candidates if c}


# ── Validation ────────────────────────────────────────────────────────────────
def validate_alumni_request(employee_id: str, email: str, *, ignore_request=None) -> "frappe._dict":
    """Validate that an Alumni Employee Request may be raised for ``employee_id``.

    Enforces every rule in one place so the Guest API, the Desk controller and any
    scripted caller behave identically:

    * the Employee must exist,
    * be Active OR Inactive (not Suspended or other statuses),
    * not already be an alumni (flag not already set),
    * have a linked User,
    * the supplied ``email`` must match one of the Employee's known emails
      (identity check for the unauthenticated Guest path), and
    * have no other open (Draft / Pending / HR-approved) request.

    Inactive Employees are valid alumni candidates — they represent employees who
    have already left or are in the process of leaving the company and should be
    eligible to become Alumni Employees.

    Returns the resolved Employee row (as ``frappe._dict``) on success; raises
    :class:`AlumniRequestError` with a user-safe message otherwise. ``ignore_request``
    lets a document exclude itself from the duplicate check on re-save.
    """
    employee_id = _clean(employee_id)
    email = _clean(email).lower()

    if not employee_id:
        raise AlumniRequestError(_("Employee is required."))

    emp = frappe.db.get_value(
        "Employee",
        employee_id,
        [
            "name", "employee_name", "status", "user_id", "company",
            "company_email", "personal_email", "prefered_email",
            "cell_number", "date_of_birth",
        ],
        as_dict=True,
    )
    if not emp:
        raise AlumniRequestError(_("No employee found for {0}.").format(employee_id))

    # Allow both Active and Inactive employees to request alumni status.
    # Inactive employees are former employees who are valid alumni candidates.
    if emp.status not in (ACTIVE_STATUS, "Inactive"):
        raise AlumniRequestError(
            _("Employee {0} cannot request alumni status with status '{1}'.").format(
                emp.employee_name or employee_id, emp.status or _("Unknown")
            )
        )

    if not emp.user_id:
        raise AlumniRequestError(
            _("Employee {0} has no linked User account, so Alumni Portal access "
              "cannot be granted.").format(emp.employee_name or employee_id)
        )

    if is_already_alumni(emp):
        raise AlumniRequestError(_("Employee is already an Alumni Employee."))

    # Personal Email is required for Alumni Portal access after approval.
    # This is validated upfront so the requestor knows they need to add it before proceeding.
    personal_email = (emp.get("personal_email") or "").strip()
    if not personal_email:
        raise AlumniRequestError(
            _("Personal Email is required for Alumni Portal request. "
              "Please add a Personal Email to the Employee record before creating the request."),
            error_code="PERSONAL_EMAIL_REQUIRED",
        )

    # Identity check — the requester must know an email tied to the Employee.
    if email and email not in _employee_emails(emp):
        raise AlumniRequestError(
            _("The email provided does not match our records for this employee.")
        )

    if _has_open_request(emp.name, ignore_request):
        raise AlumniRequestError(
            _("A pending Alumni Employee Request already exists for this employee.")
        )

    return emp


# ── Personal Email (the PERSONAL_EMAIL_REQUIRED recovery step) ────────────────
# Signed-in roles that may fill in another Employee's Personal Email.
_PERSONAL_EMAIL_ADMIN_ROLES = {"System Manager", "HR Manager", "HR User"}


def _may_set_personal_email(emp: "frappe._dict", identity_email: str) -> bool:
    """True if the caller has proven they may write this Employee's Personal Email.

    Accepts either proof, matching the two ways the portal reaches this step:

    * a signed-in session that is the Employee's own linked User, or carries an
      HR / System Manager role, and
    * the Guest proof ``create_alumni_employee_request`` already relies on —
      Employee ID plus an email that is *already* on the Employee record.
    """
    session_user = getattr(frappe.session, "user", None)
    if session_user and session_user != "Guest":
        if session_user == emp.get("user_id"):
            return True
        if _PERSONAL_EMAIL_ADMIN_ROLES & set(frappe.get_roles(session_user)):
            return True

    return bool(identity_email) and identity_email in _employee_emails(emp)


def update_employee_personal_email(
    employee_id: str, personal_email: str, *, identity_email: str = ""
) -> "frappe._dict":
    """Fill in a missing ``Employee.personal_email`` so an Alumni Request can proceed.

    The recovery half of the ``PERSONAL_EMAIL_REQUIRED`` failure that
    :func:`validate_alumni_request` raises: the portal collects the address, calls
    here, then re-submits the request. Writes that ONE field and nothing else.

    Deliberately narrow:

    * the write goes through ``frappe.db.set_value`` — the same way
      ``alumni_portal.update_alumni_profile`` writes Employee fields — so no
      Employee ``validate`` / ``on_update`` hook fires. It therefore never creates
      a User, never touches ``custom_is_alumni_employee``, never changes
      ``Employee.status``, and never enables or disables an account.
    * it only fills a BLANK. An Employee that already has a Personal Email is left
      untouched, so this can't be used to redirect an existing alumni identity to
      somebody else's address.
    * ``Inactive`` Employees are accepted — they are the expected alumni candidates,
      so status is never a reason to refuse.

    Returns the Employee row carrying the saved address; raises
    :class:`AlumniRequestError` with a machine-readable ``error_code`` otherwise.
    """
    employee_id = _clean(employee_id)
    personal_email = _clean(personal_email)
    identity_email = _clean(identity_email).lower()

    if not employee_id:
        raise AlumniRequestError(_("Employee is required."))

    emp = frappe.db.get_value(
        "Employee",
        employee_id,
        [
            "name", "employee_name", "status", "user_id",
            "company_email", "personal_email", "prefered_email",
        ],
        as_dict=True,
    )
    if not emp:
        raise AlumniRequestError(_("No employee found for {0}.").format(employee_id))

    if not _may_set_personal_email(emp, identity_email):
        # Same wording as the create endpoint's identity failure, so a caller can't
        # tell "wrong email" apart from "no such employee".
        raise AlumniRequestError(
            _("The email provided does not match our records for this employee."),
            error_code="NOT_AUTHORIZED",
        )

    if (emp.get("personal_email") or "").strip():
        raise AlumniRequestError(
            _("This employee already has a Personal Email on record. "
              "Please contact HR to change it."),
            error_code="PERSONAL_EMAIL_ALREADY_SET",
        )

    if not personal_email:
        raise AlumniRequestError(
            _("Personal Email is required."),
            error_code="INVALID_PERSONAL_EMAIL",
        )

    if not validate_email_address(personal_email):  # "" when it doesn't parse
        raise AlumniRequestError(
            _("'{0}' is not a valid email address.").format(personal_email),
            error_code="INVALID_PERSONAL_EMAIL",
        )

    # The alumni account has to be independent of the company login — the checkbox
    # handler enforces that at switch time, so reject the clash now instead, while
    # the portal can still ask for a different address.
    company_addresses = {
        (emp.get("company_email") or "").strip().lower(),
        (emp.get("user_id") or "").strip().lower(),
    } - {""}
    if personal_email.lower() in company_addresses:
        raise AlumniRequestError(
            _("Personal Email must be different from the company email so the "
              "alumni account is independent."),
            error_code="INVALID_PERSONAL_EMAIL",
        )

    frappe.db.set_value("Employee", emp.name, "personal_email", personal_email)
    frappe.db.commit()

    # Report success only once the row actually carries the new address.
    saved = (frappe.db.get_value("Employee", emp.name, "personal_email") or "").strip()
    if saved != personal_email:
        raise AlumniRequestError(
            _("Could not save the Personal Email. Please try again.")
        )

    _logger.info(f"Personal Email set on Employee {emp.name} via the alumni request flow.")
    emp.personal_email = saved
    return emp


def is_already_alumni(emp: "frappe._dict | str") -> bool:
    """True if the Employee is effectively already an alumnus.

    Considers the authoritative User-side gate (via ``employee_is_alumni``), the
    Employee's own ``custom_is_alumni_employee`` checkbox, and a ``Left`` status.
    """
    name = emp if isinstance(emp, str) else emp.get("name")
    if not name:
        return False
    if employee_is_alumni(name):
        return True
    row = frappe.db.get_value(
        "Employee", name, [ALUMNI_FLAG, "status"], as_dict=True
    ) or {}
    return bool(cint(row.get(ALUMNI_FLAG))) or row.get("status") == ALUMNI_LEFT_STATUS


def _has_open_request(employee_id: str, ignore_request=None) -> bool:
    filters = {
        "employee": employee_id,
        "workflow_state": ["in", OPEN_WORKFLOW_STATES],
    }
    if ignore_request:
        filters["name"] = ["!=", ignore_request]
    return bool(frappe.db.exists(DOCTYPE, filters))


# ── Creation (used by the Guest API) ──────────────────────────────────────────
def create_alumni_employee_request(
    *,
    employee: str,
    email: str = "",
    mobile_number: str = "",
    date_of_birth: str = "",
    remarks: str = "",
    company: str = "",
    created_from: str = "Portal",
) -> "frappe.model.document.Document":
    """Validate the payload and create a `Alumni Employee Request` document.

    Runs with ``ignore_permissions`` so the Guest transport layer can create the
    document, but only ever after :func:`validate_alumni_request` has passed. The
    document is inserted straight into the ``Pending Approval`` workflow state so
    it enters the approval matrix immediately. Raises :class:`AlumniRequestError`
    on any validation failure.
    """
    emp = validate_alumni_request(employee, email)

    doc = frappe.new_doc(DOCTYPE)
    doc.employee = emp.name
    doc.employee_name = emp.employee_name
    doc.user = emp.user_id
    # Never trust a guest-supplied Company blindly — it's a Link field, so an
    # unknown value would fail validation. Use it only if it's a real Company,
    # otherwise fall back to the Employee's own company.
    supplied_company = _clean(company)
    doc.company = (
        supplied_company
        if supplied_company and frappe.db.exists("Company", supplied_company)
        else emp.company
    )
    doc.email = _clean(email) or emp.company_email or emp.personal_email
    doc.mobile_number = _clean(mobile_number) or emp.cell_number
    if _clean(date_of_birth):
        doc.date_of_birth = getdate(date_of_birth)
    doc.remarks = _clean(remarks)
    doc.created_from = created_from if created_from in ("Portal", "Desktop") else "Portal"
    # Enter the approval matrix straight away (skip the manual Draft state).
    doc.workflow_state = "Pending Approval"
    doc.status = "Pending Approval"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    _logger.info(
        f"Alumni Employee Request {doc.name} created for employee {emp.name} "
        f"(from {doc.created_from})"
    )
    return doc


# ── Approval-tracker read (for the no-login portal status view) ───────────────
TRACKER_DOCTYPE = "Approval Tracker"

# nextai Approval Log Entry status -> a stable, portal-friendly state label.
_LOG_STATE_LABEL = {
    "Pending": "Pending",
    "Approved": "Approved",
    "Rejected": "Rejected",
    "Send Back": "Sent Back",
    "Skipped": "Skipped",
    "Revoked": "Revoked",
    "Cancelled": "Cancelled",
}


def _as_str(v) -> str | None:
    """Serialize a date/datetime (or anything) to a string, or None."""
    return str(v) if v else None


def _request_identity_matches(req: "frappe._dict", email: str) -> bool:
    """True if ``email`` matches the request's own email or the Employee's emails.

    This is the identity check that lets a Guest read *their own* request status
    without logging in, while preventing enumeration of other people's requests.
    """
    email = _clean(email).lower()
    if not email:
        return False
    if (req.get("email") or "").strip().lower() == email:
        return True
    emp = frappe.db.get_value(
        "Employee",
        req.get("employee"),
        ["company_email", "personal_email", "prefered_email", "user_id"],
        as_dict=True,
    )
    return bool(emp and email in _employee_emails(emp))


def get_request_status(
    request_id: str = "", email: str = "", employee: str = "",
    *, require_identity: bool = True,
) -> dict:
    """Return the approval-tracker progress for one Alumni Employee Request.

    The request is located by ``request_id`` when given, otherwise by ``employee``
    (the most recent request for that Employee). When both are given the request
    must match both. Reads the nextai ``Approval Tracker`` + ``Approval Log Entry``
    rows and returns each stage with its state (Approved / Pending / Rejected …),
    approver and timestamp, plus the overall status. When ``require_identity`` is
    set (the Guest path), ``email`` must match the request/employee — otherwise a
    uniform :class:`AlumniRequestError` is raised so requests can't be enumerated.
    Falls back to the request's own ``status`` when no tracker exists yet.
    """
    request_id = _clean(request_id)
    employee = _clean(employee)
    if not request_id and not employee:
        raise AlumniRequestError(_("A Request ID or Employee is required."))

    # Locate the request: by id, else the latest one for the employee.
    name = request_id or frappe.db.get_value(
        DOCTYPE, {"employee": employee}, "name", order_by="creation desc"
    )
    req = frappe.db.get_value(
        DOCTYPE,
        name,
        ["name", "employee", "employee_name", "email", "status",
         "approved_by", "approved_on", "request_date", "rejected_reason",
         "remarks", "company", "mobile_number", "owner", "creation"],
        as_dict=True,
    ) if name else None

    # Uniform "not found" — never reveal which of id / employee / email was wrong.
    identity_ok = bool(req) and (not require_identity or _request_identity_matches(req, email))
    employee_ok = (not employee) or (req and req.get("employee") == employee)
    if not req or not identity_ok or not employee_ok:
        raise AlumniRequestError(_("No matching request was found for the details provided."))

    payload = {
        "success": True,
        "request_id": req.name,
        "employee": req.employee,
        "employee_name": req.employee_name,
        "request_status": req.status,
        "request_date": _as_str(req.request_date),
        "approved_by": req.approved_by,
        "approved_on": _as_str(req.approved_on),
        "rejected_reason": req.rejected_reason,
        "tracker": None,
        "approval_mode": None,
        "current_step": None,
        "total_stages": 0,
        "current_stage": None,      # where the approval has "arrived" (active stage)
        "overall_state": req.status,
        "stages": [],
        "summary": None,
        "history": [],
    }

    tracker_name = frappe.db.get_value(
        TRACKER_DOCTYPE,
        {"doc_type": DOCTYPE, "doc_name": req.name},
        "name",
        order_by="creation desc",
    )
    if tracker_name:
        tracker = frappe.get_doc(TRACKER_DOCTYPE, tracker_name)
        payload.update(_ladder_from_tracker(tracker, req.status))
    else:
        # No approval run yet — still show the FULL ladder from the active matrix
        # (every stage "Upcoming"), with the first stage as the arrived one.
        payload.update(_ladder_without_tracker(_active_matrix_stages(), req.status))

    # Rich, UI-ready extras: request summary (with attachments) + a people/comment
    # timeline (requester followed by each approval stage).
    payload["summary"] = _build_summary(req)
    payload["history"] = _build_history(req, payload["stages"])
    return payload


def _stage_approver_from_config(s) -> str:
    """Human-readable approver from a matrix/log stage row (role/user/level/…)."""
    return (
        s.get("role") or s.get("user") or s.get("level")
        or s.get("employee_doc_field") or s.get("dynamic_user_assignment")
        or s.get("custom_assigned_to_roles") or s.get("custom_allocated_to_users")
        or s.get("user_field") or ""
    )


def _active_matrix_stages() -> list:
    """Approval Stages of the active matrix for this doctype (lowest priority), or []."""
    apm = frappe.get_all(
        "Approval Policy Matrix",
        filters={"target_doctype": DOCTYPE, "is_active": 1},
        fields=["name"], order_by="priority_level asc", limit=1,
    )
    if not apm:
        return []
    return frappe.get_doc("Approval Policy Matrix", apm[0].name).get("approval_stages") or []


def _resolve_person(user_id: str | None) -> dict:
    """Resolve a User id to a display person: {user, name, image, role}.

    ``role`` is the person's Designation title (via their linked Employee) when
    available — the "Marketing Manager" / "Finance Lead" style label. Safe for
    ``None`` / ``Guest`` / unknown users (fields come back ``None``).
    """
    if not user_id or user_id == "Guest":
        return {"user": user_id or None, "name": None, "image": None, "role": None}
    u = frappe.db.get_value("User", user_id, ["full_name", "user_image"], as_dict=True) or {}
    role = None
    designation = frappe.db.get_value("Employee", {"user_id": user_id}, "designation")
    if designation:
        role = frappe.db.get_value("Designation", designation, "designation_name") or designation
    return {
        "user": user_id,
        "name": u.get("full_name") or user_id,
        "image": u.get("user_image"),
        "role": role,
    }


def _log_comment(lg) -> str | None:
    """Best-effort human comment for an Approval Log Entry (approve / reject /
    send-back note). Skips JSON blobs; returns a plain string or None."""
    for field in ("approval_response_data", "rejection_response_data",
                  "send_back_comment", "delegation_notes"):
        v = lg.get(field)
        if v and isinstance(v, str):
            v = v.strip()
            if v and not v.startswith("{") and not v.startswith("["):
                return v
    return None


def _fmt_bytes(n) -> str:
    n = int(n or 0)
    if n >= 1024 * 1024:
        return f"{round(n / 1024 / 1024, 1)} MB"
    if n >= 1024:
        return f"{round(n / 1024)} KB"
    return f"{n} B"


def _request_documents(request_name: str) -> list:
    """Files attached to the Alumni Employee Request (for the 'Attached Documents'
    panel)."""
    rows = frappe.get_all(
        "File",
        filters={"attached_to_doctype": DOCTYPE, "attached_to_name": request_name},
        fields=["file_name", "file_url", "file_size", "is_private"],
        order_by="creation asc",
    )
    return [
        {
            "name": f.file_name,
            "url": f.file_url,
            "size": _fmt_bytes(f.file_size),
            "size_bytes": f.file_size or 0,
            "is_private": bool(f.is_private),
        }
        for f in rows
    ]


def _build_summary(req: "frappe._dict") -> dict:
    """Request-summary panel (meta + attached documents)."""
    return {
        "request_id": req.get("name"),
        "employee": req.get("employee"),
        "employee_name": req.get("employee_name"),
        "company": req.get("company"),
        "email": req.get("email"),
        "mobile_number": req.get("mobile_number"),
        "status": req.get("status"),
        "priority": "Normal",              # no priority field on the request
        "created_on": _as_str(req.get("creation")),
        "request_date": _as_str(req.get("request_date")),
        "documents": _request_documents(req.get("name")),
    }


def _build_history(req: "frappe._dict", stages: list) -> list:
    """People + comment timeline: the requester, then one entry per approval stage
    (approved stages carry actor/time/comment; the active one is 'Awaiting Action';
    upcoming ones stay 'Pending'). Mirrors an 'Approval History' feed."""
    history = [{
        "actor": _resolve_person(req.get("owner")),
        "role_label": "Requester",
        "stage": "Draft",
        "step": 0,
        "state": "Completed",
        "timestamp": _as_str(req.get("creation")),
        "comment": req.get("remarks") or None,
    }]

    for s in stages:
        acted_by = s.get("acted_by")
        if acted_by:
            actor = s.get("acted_by_person") or _resolve_person(acted_by)
            role_label = actor.get("role") or s.get("approver") or s.get("name")
        else:
            actor = {"user": None, "name": s.get("approver") or s.get("name"),
                     "image": None, "role": s.get("approver")}
            role_label = s.get("approver") or ""
        state = s.get("state")
        history.append({
            "actor": actor,
            "role_label": role_label,
            "stage": s.get("name"),
            "step": s.get("step"),
            "state": "Awaiting Action" if s.get("is_current") and state in ("Awaiting Approval", "Pending") else state,
            "timestamp": s.get("acted_on"),
            "comment": s.get("comment"),
        })
    return history


def _ladder_from_tracker(tracker, req_status: str) -> dict:
    """Full stage ladder for a live tracker: every matrix stage, overlaid with its
    log (state / approver / time). Stages not yet reached show as ``Upcoming``; the
    active pending stage is flagged ``is_current`` and surfaced as ``current_stage``.
    """
    logs_by_idx = {lg.idx: lg for lg in (tracker.get("approval_logs") or [])}
    # Base ladder = the matrix snapshot (all stages). Fall back to the log rows
    # themselves for older trackers that carry no snapshot.
    stage_rows = tracker.get("approval_stages") or list(tracker.get("approval_logs") or [])
    current_step = cint(tracker.current_approval_step)          # 0-based active pointer
    is_pending = (tracker.status or "") in ("", "Pending")

    stages, current_stage = [], None
    for s in stage_rows:
        idx = s.idx
        lg = logs_by_idx.get(idx)
        name = s.get("approval_name") or f"Stage {idx}"
        approver_type = s.get("approver_type") or (lg.get("approver_type") if lg else "") or ""
        if lg:
            raw = lg.get("status") or "Pending"
            approver = _stage_approver_from_config(lg) or _stage_approver_from_config(s)
            acted_by = lg.get("user") or None
            acted_on = _as_str(lg.get("approval_time"))
            comment = _log_comment(lg)
        else:
            raw = "Upcoming"                                    # stage not reached yet
            approver = _stage_approver_from_config(s)
            acted_by, acted_on, comment = None, None, None

        is_current = bool(is_pending and (idx - 1) == current_step)
        label = _LOG_STATE_LABEL.get(raw, raw)
        if is_current and label == "Pending":
            label = "Awaiting Approval"

        stages.append({
            "step": idx, "name": name, "approver_type": approver_type,
            "approver": approver, "state": label, "is_current": is_current,
            "acted_by": acted_by, "acted_by_person": _resolve_person(acted_by),
            "acted_on": acted_on, "comment": comment,
        })
        if is_current:
            current_stage = {"step": idx, "name": name, "approver": approver}

    return {
        "tracker": tracker.name,
        "approval_mode": tracker.approval_mode,
        "current_step": current_step,
        "total_stages": len(stages),
        "current_stage": current_stage,
        "overall_state": tracker.status or req_status,
        "stages": stages,
    }


def _ladder_without_tracker(stage_rows: list, req_status: str) -> dict:
    """Full ladder before any approval run: matrix stages as ``Upcoming`` with the
    first as the arrived/current stage (or all resolved if already terminal)."""
    terminal = req_status in ("Approved", "Rejected", "Cancelled")
    stages, current_stage = [], None
    for s in stage_rows:
        idx = s.idx
        is_current = (not terminal) and idx == 1
        if terminal:
            label = req_status
        else:
            label = "Awaiting Approval" if is_current else "Upcoming"
        name = s.get("approval_name") or f"Stage {idx}"
        approver = _stage_approver_from_config(s)
        stages.append({
            "step": idx, "name": name, "approver_type": s.get("approver_type") or "",
            "approver": approver, "state": label, "is_current": is_current,
            "acted_by": None, "acted_by_person": _resolve_person(None),
            "acted_on": None, "comment": None,
        })
        if is_current:
            current_stage = {"step": idx, "name": name, "approver": approver}
    return {
        "tracker": None, "approval_mode": None,
        "current_step": None if terminal else 0,
        "total_stages": len(stages), "current_stage": current_stage,
        "overall_state": req_status, "stages": stages,
    }


# ── The reusable alumni-marking helper (Step 9) ───────────────────────────────
def mark_employee_as_alumni(employee_id: str) -> dict:
    """Flag ``employee_id`` as an alumni employee — idempotently.

    Sets ``Employee.custom_is_alumni_employee = 1`` and saves the Employee, which
    fires the existing ``sync_alumni_flag`` ``on_update`` hook and mirrors the flag
    onto the linked ``User`` (the real Alumni Portal gate). If the Employee is
    already an alumnus this is a no-op. Never modifies ``Employee.status`` or
    ``User.enabled``.

    Called by the Alumni Request approval workflow. Bypasses the Personal Email
    validation that applies only to manual user-initiated checkbox changes.

    Returns ``{"success": bool, "already": bool, "employee": id}``.
    """
    employee_id = _clean(employee_id)
    if not employee_id or not frappe.db.exists("Employee", employee_id):
        return {"success": False, "already": False, "employee": employee_id}

    if is_already_alumni(employee_id):
        return {"success": True, "already": True, "employee": employee_id}

    emp = frappe.get_doc("Employee", employee_id)
    emp.set(ALUMNI_FLAG, 1)
    # Save through the ORM so the existing sync_alumni_flag hook mirrors the flag
    # onto the linked User — that is what actually grants Alumni Portal access.
    # Signal the checkbox validation hook to skip Personal Email requirement, since
    # this is being set by the approval workflow, not a manual user action.
    frappe.local.flags._alumni_checkbox_from_approval_workflow = True
    try:
        emp.save(ignore_permissions=True)
        frappe.db.commit()
    finally:
        # Clean up the flag
        frappe.local.flags.pop("_alumni_checkbox_from_approval_workflow", None)

    _logger.info(f"Employee {employee_id} marked as alumni employee.")
    return {"success": True, "already": False, "employee": employee_id}


# ── Workflow transition hook (Step 8) ─────────────────────────────────────────
def handle_workflow_transition(doc, method: str | None = None) -> None:
    """`Alumni Employee Request` ``on_update`` hook.

    When the document reaches the ``Approved`` workflow state, flag the linked
    Employee as an alumnus exactly once (guarded by ``employee_marked_alumni``).
    Any other transition is ignored. Failures are logged, never raised, so a
    workflow action is never blocked by a downstream error.
    """
    if doc.get("workflow_state") != "Approved":
        return
    if cint(doc.get("employee_marked_alumni")):
        return  # already done — idempotent
    if not doc.get("employee"):
        return

    try:
        result = mark_employee_as_alumni(doc.employee)
        if result.get("success"):
            # Stamp the guard + approval metadata without re-triggering hooks.
            doc.db_set("employee_marked_alumni", 1, update_modified=False)
            doc.db_set("approved_by", frappe.session.user, update_modified=False)
            doc.db_set("approved_on", now_datetime(), update_modified=False)
            doc.db_set("status", "Approved", update_modified=False)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            f"Alumni Employee Request: failed to mark employee alumni ({doc.name})",
        )


# ── Workflow bootstrap (called from install.after_migrate) ────────────────────
_WORKFLOW_NAME = "Alumni Employee Request Approval"

# state name -> (doc_status, allow_edit role, status field value, style)
#
# IMPORTANT: the FIRST state is the workflow's default/initial state. Guest and
# Desk submissions are created directly here, so it must be "Pending Approval" —
# if a "Draft" state were first, Frappe would treat the creation as a Draft ->
# Pending Approval *transition* and reject it (the Guest holds no HR role).
_WF_STATES = [
    ("Pending Approval", "0", "HR User",    "Pending Approval", "Warning"),
    ("HR Approved",      "0", "HR Manager", "Pending Approval", "Info"),
    ("Approved",         "0", "HR Manager", "Approved",         "Success"),
    ("Rejected",         "0", "HR Manager", "Rejected",         "Danger"),
    ("Cancelled",        "0", "HR Manager", "Cancelled",        "Danger"),
]

# (action, from_state, to_state, allowed role)
_WF_TRANSITIONS = [
    ("HR Approve",    "Pending Approval", "HR Approved", "HR User"),
    ("Reject",        "Pending Approval", "Rejected",    "HR User"),
    ("Cancel",        "Pending Approval", "Cancelled",   "HR Manager"),
    ("Final Approve", "HR Approved",      "Approved",    "HR Manager"),
    ("Reject",        "HR Approved",      "Rejected",    "HR Manager"),
]


def ensure_alumni_employee_request_workflow() -> None:
    """Idempotently reconcile the Alumni Employee Request approval Workflow.

    Creates the backing ``Workflow State`` / ``Workflow Action Master`` masters and
    upserts the ``Workflow`` so its states/transitions always match the canonical
    definition above (this workflow is app-managed). Skips silently when the
    doctype or the required HR roles are not yet present. Called from
    ``recruitment.recruitment.install.after_migrate``.
    """
    if not frappe.db.exists("DocType", DOCTYPE):
        return
    # Don't build a workflow referencing roles that aren't installed.
    required_roles = {r for _, _, _, r in _WF_TRANSITIONS} | {s[2] for s in _WF_STATES}
    if any(not frappe.db.exists("Role", role) for role in required_roles):
        _logger.info("ensure_alumni_employee_request_workflow: required HR roles missing, skipped")
        return

    try:
        _ensure_masters()

        # Upsert: reuse the existing Workflow if present so re-migrates fix an
        # older definition (e.g. a stale initial state) in place.
        if frappe.db.exists("Workflow", _WORKFLOW_NAME):
            wf = frappe.get_doc("Workflow", _WORKFLOW_NAME)
        else:
            wf = frappe.new_doc("Workflow")
            wf.workflow_name = _WORKFLOW_NAME

        wf.document_type = DOCTYPE
        wf.is_active = 1
        wf.override_status = 0
        wf.send_email_alert = 0
        wf.workflow_state_field = "workflow_state"

        wf.set("states", [])
        wf.set("transitions", [])
        for state, doc_status, allow_edit, update_value, _style in _WF_STATES:
            wf.append("states", {
                "state": state,
                "doc_status": doc_status,
                "allow_edit": allow_edit,
                "update_field": "status",
                "update_value": update_value,
            })
        for action, from_state, to_state, role in _WF_TRANSITIONS:
            wf.append("transitions", {
                "state": from_state,
                "action": action,
                "next_state": to_state,
                "allowed": role,
                "allow_self_approval": 1,
            })

        wf.save(ignore_permissions=True)
        frappe.db.commit()
        _logger.info("ensure_alumni_employee_request_workflow: reconciled workflow")
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_alumni_employee_request_workflow: skipped", exc_info=True
        )


def _ensure_masters() -> None:
    """Create the Workflow State + Workflow Action Master records the workflow needs."""
    for state, _ds, _ae, _uv, style in _WF_STATES:
        if not frappe.db.exists("Workflow State", state):
            frappe.get_doc({
                "doctype": "Workflow State",
                "workflow_state_name": state,
                "style": style,
            }).insert(ignore_permissions=True, ignore_if_duplicate=True)

    for action in {a for a, _f, _t, _r in _WF_TRANSITIONS}:
        if not frappe.db.exists("Workflow Action Master", action):
            frappe.get_doc({
                "doctype": "Workflow Action Master",
                "workflow_action_name": action,
            }).insert(ignore_permissions=True, ignore_if_duplicate=True)
