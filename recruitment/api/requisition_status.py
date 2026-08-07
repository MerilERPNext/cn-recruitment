"""Job Requisition action matrix — Duplicate / Archive / Move to Draft / Activate.

Which actions a requisition offers depends on its own status AND its positions'.
ACTION_MATRIX is the single source of truth: the form asks it which buttons to
draw, and every endpoint re-checks it, so an API call cannot bypass a hidden
button.

Three status values are kept because standard HRMS keys off them:
    Approval Pending -> "Pending"          (hrms staffing_plan.js)
    Approved draft   -> "Open & Approved"  (hrms Create/Associate Job Opening)
    Auto Archived    -> "Filled"           (hrms set_time_to_fill, time-to-fill card)

Moving to Draft writes status with db.set_value (no doc_events) so it can never
start an approval, and revokes whatever approval is in flight first. Re-running
an approval is Flow Config's job, not this module's.
"""

import frappe
from frappe import _

JOB_REQUISITION = "Job Requisition"
JOB_REQUISITION_POSITION = "Job Requisition Position"
POSITION_SUMMARY_FIELD = "custom_position_summary"

DRAFT_STATUS = "Draft"
APPROVAL_PENDING_STATUS = "Pending"
APPROVED_DRAFT_STATUS = "Open & Approved"
APPROVED_ACTIVE_STATUS = "Approved Active"
ARCHIVED_STATUS = "Archived"

POSITION_DRAFT = "Draft"
POSITION_OPEN = "Open"
POSITION_ON_HOLD = "On Hold"
POSITION_FILLED = "Filled"
POSITION_ARCHIVED = "Archived"

STATUS_ACTION_ROLES = ("System Manager", "HR Manager", "HR User", "Recruiter Admin")
LIVE_TRACKER_STATUSES = ("Pending", "Send Back")

# Statuses at which positions exist and are worth materialising / tracking.
POSITIONED_STATUSES = (APPROVED_DRAFT_STATUS, APPROVED_ACTIVE_STATUS, "Filled")


# ---------------------------------------------------------------------------
# The action matrix
# ---------------------------------------------------------------------------
#   Requisition status       Position   Dup  Arch  Draft  Activate
#   Draft                    -           Y    Y     N      N
#   Pending (Appr. Pending)  -           Y    Y     Y      N
#   Rejected                 -           Y    N     N      N
#   Open & Approved          Draft       Y    Y     Y      Y
#   Approved Active          Open        Y    Y     Y      N
#   Approved Active          On Hold     Y    Y     Y      N
#   Approved Active          Filled      Y    N     N      N
#   Filled (Auto Archived)   Filled      Y    N     N      N
#   Archived                 Archived    Y    N     N      N

DUPLICATE = "duplicate"
ARCHIVE = "archive"
MOVE_TO_DRAFT = "move_to_draft"
ACTIVATE = "activate"
ACTIONS = (DUPLICATE, ARCHIVE, MOVE_TO_DRAFT, ACTIVATE)


def _allow(duplicate=False, archive=False, move_to_draft=False, activate=False):
    return {
        DUPLICATE: duplicate,
        ARCHIVE: archive,
        MOVE_TO_DRAFT: move_to_draft,
        ACTIVATE: activate,
    }


# requisition status -> position status -> allowed actions. The None key is the
# default for any position status without an explicit row (and for "no positions").
ACTION_MATRIX = {
    DRAFT_STATUS: {None: _allow(duplicate=True, archive=True)},
    APPROVAL_PENDING_STATUS: {None: _allow(duplicate=True, archive=True, move_to_draft=True)},
    "Rejected": {None: _allow(duplicate=True)},
    APPROVED_DRAFT_STATUS: {
        None: _allow(duplicate=True, archive=True, move_to_draft=True, activate=True)
    },
    APPROVED_ACTIVE_STATUS: {
        None: _allow(duplicate=True, archive=True, move_to_draft=True),
        POSITION_FILLED: _allow(duplicate=True),
    },
    "Filled": {None: _allow(duplicate=True)},
    ARCHIVED_STATUS: {None: _allow(duplicate=True)},
    # Not in the sheet but still valid Select options; treated as terminal.
    "On Hold": {None: _allow(duplicate=True)},
    "Cancelled": {None: _allow(duplicate=True)},
}

# When positions disagree the most restrictive governs: one Filled position is
# enough to block Archive and Move to Draft.
POSITION_PRECEDENCE = (
    POSITION_FILLED,
    POSITION_ON_HOLD,
    POSITION_OPEN,
    POSITION_DRAFT,
    POSITION_ARCHIVED,
)


def _aggregate_position_status(name):
    """The one position status governing requisition-level actions, or None."""
    statuses = set(
        frappe.get_all(
            JOB_REQUISITION_POSITION,
            filters={"parent": name, "parenttype": JOB_REQUISITION},
            pluck="status",
        )
    )
    return next((s for s in POSITION_PRECEDENCE if s in statuses), None)


def _requisition_state(name):
    status = frappe.db.get_value(JOB_REQUISITION, name, "status")
    if status is None:
        frappe.throw(_("Job Requisition {0} not found.").format(name))
    return {
        "requisition_status": status,
        "position_status": _aggregate_position_status(name),
    }


def _allowed_actions(requisition_status, position_status):
    """Matrix lookup. An unrecognised status fails closed to Duplicate only."""
    by_position = ACTION_MATRIX.get(requisition_status)
    if by_position is None:
        return _allow(duplicate=True)
    return by_position.get(position_status) or by_position[None]


def _denial_reason(action, requisition_status, position_status):
    """Built per call so the message is translated in the caller's language."""
    if position_status == POSITION_FILLED:
        return _(
            "An offer has been rolled out against a position on this requisition. "
            "Withdraw the offer first — the position returns to Open and this "
            "action becomes available again."
        )
    if action == ACTIVATE:
        return _(
            "Only an approved requisition awaiting activation ({0}) can be activated. "
            "This one is {1}."
        ).format(APPROVED_DRAFT_STATUS, requisition_status)
    if action == MOVE_TO_DRAFT and requisition_status == DRAFT_STATUS:
        return _("This requisition is already a Draft.")
    return _("This action is not available while the requisition is {0}.").format(
        requisition_status
    )


# ---------------------------------------------------------------------------
# Permission
# ---------------------------------------------------------------------------

def _is_privileged():
    return frappe.session.user == "Administrator" or bool(
        set(STATUS_ACTION_ROLES) & set(frappe.get_roles())
    )


def _ensure_can_change_status(name):
    """Write access AND an HR role — the raiser can edit, but not archive."""
    frappe.has_permission(JOB_REQUISITION, "write", doc=name, throw=True)
    if not _is_privileged():
        frappe.throw(
            _("Only {0} can change a requisition's status.").format(
                ", ".join(STATUS_ACTION_ROLES)
            ),
            frappe.PermissionError,
        )


def _require_action(name, action):
    """Throw unless `action` is allowed right now. Single enforcement point."""
    state = _requisition_state(name)
    allowed = _allowed_actions(state["requisition_status"], state["position_status"])
    if not allowed[action]:
        frappe.throw(
            _denial_reason(action, state["requisition_status"], state["position_status"]),
            title=_("Action Not Allowed"),
        )
    return state


def _actor_name():
    user = frappe.session.user
    return (
        frappe.db.get_value("Employee", {"user_id": user}, "employee_name")
        or frappe.db.get_value("User", user, "full_name")
        or user
    )


# ---------------------------------------------------------------------------
# Revoking an approval in flight
# ---------------------------------------------------------------------------

def _live_trackers(name):
    return frappe.get_all(
        "Approval Tracker",
        filters={
            "doc_type": JOB_REQUISITION,
            "doc_name": name,
            "status": ["in", LIVE_TRACKER_STATUSES],
        },
        fields=["name", "status", "task"],
    )


def _revoke_running_approval(name):
    """Cancel every in-flight approval: tracker Revoked, workflow and ToDos closed.

    Delegates to nextai so the requisition and the approval engine cannot
    disagree. Unlike flow_config.revoke_flow this is not gated on allow_revoke —
    the role check in _ensure_can_change_status is the authorisation.
    """
    trackers = _live_trackers(name)
    if not trackers:
        return {"trackers": [], "workflows": []}

    task_names = [t.task for t in trackers if t.get("task")]
    workflows = (
        sorted(
            {
                w
                for w in frappe.get_all(
                    "Funnel Task", filters={"name": ["in", task_names]}, pluck="workflow"
                )
                if w
            }
        )
        if task_names
        else []
    )

    try:
        from nextai.funnel.doctype.flow_config.revoke_flow import (
            _cancel_stage_workflows,
            _revoke_flow_approvals,
        )

        _cancel_stage_workflows(workflows)
        revoked = _revoke_flow_approvals([frappe._dict(t) for t in trackers])
    except ImportError:
        revoked = _fallback_revoke(trackers)

    return {"trackers": revoked, "workflows": workflows}


def _fallback_revoke(trackers):
    """Used only if nextai is unavailable: close approver ToDos, mark Revoked."""
    revoked = []
    for row in trackers:
        tracker = frappe.get_doc("Approval Tracker", row["name"])
        for log in (tracker.approval_logs or []):
            if (log.status or "") == "Pending" and log.todo_reference:
                frappe.db.set_value(
                    "ToDo", log.todo_reference, "status", "Cancelled", update_modified=False
                )
        tracker.status = "Revoked"
        tracker.flags.ignore_links = True
        tracker.save(ignore_permissions=True)
        revoked.append(tracker.name)
    return revoked


# ---------------------------------------------------------------------------
# Position rows
# ---------------------------------------------------------------------------

def _position_seeds(doc):
    """One dict per individually-tracked position.

    Only lateral requisitions have these — one custom_position_details row each.
    Campus/Fresher budget a lump of openings per region and get none; their
    offers are policed by offer_validation._capacity instead.
    """
    return [
        {"location": d.get("location"), "functional_area": d.get("functional_area")}
        for d in (doc.get("custom_position_details") or [])
    ]


def ensure_position_rows(name, doc=None):
    """Materialise custom_position_summary (status/candidate tracking) from
    custom_position_details (the headcount). Idempotent."""
    if frappe.db.count(JOB_REQUISITION_POSITION, {"parent": name, "parenttype": JOB_REQUISITION}):
        return []

    doc = doc or frappe.get_doc(JOB_REQUISITION, name)
    seeds = _position_seeds(doc)
    if not seeds:
        return []

    created = []
    for index, seed in enumerate(seeds, start=1):
        seed.update(
            {
                "position_no": index,
                "status": POSITION_DRAFT,
                "hiring_lead": doc.get("custom_hiring_lead"),
            }
        )
        created.append(doc.append(POSITION_SUMMARY_FIELD, seed))

    # Adds rows to a different table than any approval stage locks.
    doc.flags.ignore_row_approval_guard = True
    doc.save(ignore_permissions=True)
    return created


def materialise_positions_on_approval(doc, method=None):
    """`on_update`: create position rows once approved.

    Gated on an actual status change so the common save (every edit, every
    workflow touch) costs nothing rather than a count query each time.
    """
    if doc.get("status") not in POSITIONED_STATUSES:
        return
    if not doc.has_value_changed("status"):
        return
    try:
        ensure_position_rows(doc.name, doc=doc)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Requisition: position materialisation failed")


def _set_position_statuses(name, new_status, only_from=None):
    """Bulk-move this requisition's position rows. One UPDATE, not one per row."""
    filters = {"parent": name, "parenttype": JOB_REQUISITION}
    if only_from:
        filters["status"] = ["in", list(only_from)]
    rows = frappe.get_all(JOB_REQUISITION_POSITION, filters=filters, pluck="name")
    if rows:
        frappe.db.set_value(
            JOB_REQUISITION_POSITION, {"name": ["in", rows]}, "status", new_status,
            update_modified=False,
        )
    return rows


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

@frappe.whitelist()
def duplicate_requisition(job_requisition):
    """Copy a requisition into a fresh Draft, resetting lifecycle state.

    The Raise Requisition Scope before_insert hook decides whether this user may
    create a requisition at all.
    """
    if not job_requisition:
        frappe.throw(_("Requisition is required."))
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)
    frappe.has_permission(JOB_REQUISITION, "create", throw=True)
    _require_action(job_requisition, DUPLICATE)

    copy = frappe.copy_doc(frappe.get_doc(JOB_REQUISITION, job_requisition))
    copy.status = DRAFT_STATUS
    for fieldname in ("completed_on", "time_to_fill"):
        if copy.meta.has_field(fieldname):
            copy.set(fieldname, None)
    for row in copy.get(POSITION_SUMMARY_FIELD) or []:
        row.status = POSITION_DRAFT
        row.job_id = None
        row.candidate = None
        row.candidate_status = None
    copy.insert()

    copy.add_comment(
        "Comment", _("Duplicated from {0} by {1}.").format(job_requisition, _actor_name())
    )
    return {"job_requisition": copy.name, "source": job_requisition, "status": copy.status}


@frappe.whitelist()
def archive_requisition(job_requisition, reason=None):
    """Archive a requisition and all its positions.

    Refused while any position is Filled — the offer must be withdrawn first.
    """
    if not job_requisition:
        frappe.throw(_("Requisition is required."))

    _ensure_can_change_status(job_requisition)
    state = _require_action(job_requisition, ARCHIVE)

    revoked = _revoke_running_approval(job_requisition)
    frappe.db.set_value(JOB_REQUISITION, job_requisition, "status", ARCHIVED_STATUS)
    positions = _set_position_statuses(job_requisition, POSITION_ARCHIVED)

    content = _("{0} archived this requisition (was {1}).").format(
        _actor_name(), state["requisition_status"]
    )
    if reason:
        content += " " + _("Reason: {0}").format(reason)
    if revoked["trackers"]:
        content += " " + _("The approval in progress was revoked.")
    frappe.get_doc(JOB_REQUISITION, job_requisition).add_comment("Comment", content)

    return {
        "job_requisition": job_requisition,
        "previous_status": state["requisition_status"],
        "status": ARCHIVED_STATUS,
        "positions_archived": len(positions),
        "revoked": revoked,
    }


@frappe.whitelist()
def move_to_draft(job_requisition, reason=None):
    """Pull a requisition back to Draft, revoking any approval in flight.

    Filled and Archived positions are left alone; the rest return to Draft.
    """
    if not job_requisition:
        frappe.throw(_("Requisition is required."))

    _ensure_can_change_status(job_requisition)

    if frappe.db.get_value(JOB_REQUISITION, job_requisition, "status") == DRAFT_STATUS:
        return {
            "job_requisition": job_requisition,
            "status": DRAFT_STATUS,
            "changed": False,
            "revoked": {"trackers": [], "workflows": []},
        }

    state = _require_action(job_requisition, MOVE_TO_DRAFT)
    revoked = _revoke_running_approval(job_requisition)

    # db.set_value, not save(): a Draft must never trigger the approval matrix.
    frappe.db.set_value(JOB_REQUISITION, job_requisition, "status", DRAFT_STATUS)
    _set_position_statuses(
        job_requisition, POSITION_DRAFT, only_from=(POSITION_OPEN, POSITION_ON_HOLD)
    )

    content = _("{0} moved this requisition from {1} to Draft.").format(
        _actor_name(), state["requisition_status"]
    )
    if reason:
        content += " " + _("Reason: {0}").format(reason)
    if revoked["trackers"]:
        content += " " + _("The approval in progress was revoked.")
    frappe.get_doc(JOB_REQUISITION, job_requisition).add_comment("Comment", content)

    return {
        "job_requisition": job_requisition,
        "previous_status": state["requisition_status"],
        "status": DRAFT_STATUS,
        "changed": True,
        "revoked": revoked,
    }


@frappe.whitelist()
def send_for_approval(job_requisition):
    """Draft -> Pending. Starting the approval itself is Flow Config's job."""
    if not job_requisition:
        frappe.throw(_("Requisition is required."))

    _ensure_can_change_status(job_requisition)

    doc = frappe.get_doc(JOB_REQUISITION, job_requisition)
    if doc.status == APPROVAL_PENDING_STATUS:
        return {
            "job_requisition": job_requisition,
            "status": APPROVAL_PENDING_STATUS,
            "changed": False,
        }
    if doc.status != DRAFT_STATUS:
        frappe.throw(
            _("Only a Draft requisition can be sent for approval. This one is {0}.").format(
                frappe.bold(doc.status)
            ),
            title=_("Not a Draft"),
        )

    doc.status = APPROVAL_PENDING_STATUS
    doc.save()
    doc.add_comment(
        "Comment", _("{0} sent this requisition for approval.").format(_actor_name())
    )

    return {
        "job_requisition": job_requisition,
        "previous_status": DRAFT_STATUS,
        "status": APPROVAL_PENDING_STATUS,
        "changed": True,
    }


@frappe.whitelist()
def bulk_move_to_draft(job_requisitions, reason=None):
    """List-view bulk action. Each row runs in its own savepoint."""
    names = (
        frappe.parse_json(job_requisitions)
        if isinstance(job_requisitions, str)
        else job_requisitions
    )
    if isinstance(names, str):
        names = [names]
    if not names:
        frappe.throw(_("Select at least one requisition."))

    moved, skipped, failed = [], [], []
    for name in names:
        frappe.db.savepoint("move_to_draft")
        try:
            result = move_to_draft(name, reason=reason)
            (moved if result["changed"] else skipped).append(name)
        except Exception as exc:
            frappe.db.rollback(save_point="move_to_draft")
            failed.append({"name": name, "error": str(exc)})

    return {"moved": moved, "skipped": skipped, "failed": failed}


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_requisition_actions(job_requisition):
    """Which actions the current user may run now, and why not. Drives the form."""
    if not job_requisition:
        frappe.throw(_("Requisition is required."))
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)

    state = _requisition_state(job_requisition)
    allowed = _allowed_actions(state["requisition_status"], state["position_status"])

    can_change = frappe.has_permission(
        JOB_REQUISITION, "write", doc=job_requisition
    ) and _is_privileged()
    can_create = frappe.has_permission(JOB_REQUISITION, "create")

    no_permission = _("You do not have permission to run this action.")
    actions = {}
    for action in ACTIONS:
        permitted = can_create if action == DUPLICATE else can_change
        if not permitted:
            actions[action] = {"allowed": False, "reason": no_permission}
        elif allowed[action]:
            actions[action] = {"allowed": True, "reason": None}
        else:
            actions[action] = {
                "allowed": False,
                "reason": _denial_reason(
                    action, state["requisition_status"], state["position_status"]
                ),
            }

    return {
        "job_requisition": job_requisition,
        "requisition_status": state["requisition_status"],
        "position_status": state["position_status"],
        "actions": actions,
        "can_send_for_approval": can_change and state["requisition_status"] == DRAFT_STATUS,
    }
