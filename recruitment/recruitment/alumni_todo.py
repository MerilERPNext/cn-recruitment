"""Alumni Portal -- Separation "Act" button support: detects whether the
calling alumnus has a pending ToDo tied to their own Employee Separation
record.

This does NOT duplicate a completion mechanism. `alumni_portal.py` already has
a full, mature alumni ToDo system --  `get_alumni_todo`, `get_alumni_todo_form`,
`submit_alumni_todo_action`, `update_alumni_todo` -- gated by
`_require_own_todo` (ownership, via `_user_owns_todo`) and
`_todo_type_visible_to_alumni` (category visibility). The Act button should
navigate to THAT existing screen/flow using the `todo.name` this module
returns, not to a new one.

(An earlier version of this file duplicated a completion mechanism against a
different, less complete engine -- `cn_todo_manager...todo_reference_api` --
before the real system above was found. It's been removed: the actual fix
needed was `_todo_type_visible_to_alumni` in `alumni_portal.py` rejecting
every Separation ToDo outright, since the Separation engine creates plain
ToDos with no `custom_todo_type` set at all, so the portal's opt-in
`Todo Type.custom_show_in_alumni_portal` flag could never be ticked for them.
That function now also allows any ToDo whose `reference_type` is
`"Employee Separation"`, regardless of category -- see
`_ALUMNI_ALWAYS_VISIBLE_REFERENCE_TYPES` in `alumni_portal.py`.)

Endpoint (call as `recruitment.recruitment.alumni_todo.<fn>`):
    get_my_pending_separation_todo
"""

from __future__ import annotations

import frappe

from recruitment.recruitment.alumni_portal import (
    _d,
    _require_alumni_session,
    _todo_type_visible_to_alumni,
    _user_owns_todo,
    alumni_employee_name,
)


def _identity_users(user: str) -> list[str]:
    """Every user identity `user` is known by -- their current session
    identity plus their pre-switch company email, if any (see
    `recruitment.recruitment.alumni_user_switch`). Used only to SEARCH for a
    candidate pending ToDo; whatever is found is then re-verified through the
    real `_user_owns_todo`, the same check `alumni_portal.py`'s own ToDo
    endpoints use, so this can never advertise an Act button for a ToDo the
    real system would then refuse to open.
    """
    users = {user}
    employee = alumni_employee_name(user)
    if employee:
        company_user = frappe.db.get_value("Employee", employee, "user_id")
        if company_user:
            users.add(company_user)
    return list(users)


@frappe.whitelist(methods=["GET"])
def get_my_pending_separation_todo() -> dict:
    """The alumnus's own open ToDo tied to their Employee Separation record, if
    any, plus how many are pending in total. This is what the Separation
    status page's "Act" button is gated on and labelled with: shown only when
    `has_pending_todo` is true, with `pending_count` (e.g. "3 tasks pending").
    Point the button at `alumni_portal.get_alumni_todo` / `get_alumni_todo_form`
    / `submit_alumni_todo_action` (the existing ToDo screen), passing
    `todo.name` -- not at anything new.
    """
    user = _require_alumni_session()
    employee = alumni_employee_name(user)
    if not employee:
        return {"has_pending_todo": False, "pending_count": 0}

    separation = frappe.db.get_value(
        "Employee Separation",
        {"employee": employee, "docstatus": ["!=", 2]},
        "name",
        order_by="creation desc",
    )
    if not separation:
        return {"has_pending_todo": False, "pending_count": 0}

    candidates = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": "Employee Separation",
            "reference_name": separation,
            "allocated_to": ["in", _identity_users(user)],
            "status": "Open",
        },
        fields=[
            "name", "description", "priority", "date", "custom_todo_type",
            "allocated_to", "assigned_by", "owner",
        ],
        order_by="creation desc",
    )

    # Re-verify every candidate through the real ownership + portal-visibility
    # checks (a raw `allocated_to` match isn't enough on its own -- see
    # `_identity_users`'s docstring), so `pending_count` never counts a ToDo
    # the Act button would then fail to open.
    pending = [
        row for row in candidates
        if _user_owns_todo(user, row.name, row) and _todo_type_visible_to_alumni(row.name)
    ]

    if not pending:
        return {"has_pending_todo": False, "pending_count": 0}

    latest = pending[0]
    return {
        "has_pending_todo": True,
        "pending_count": len(pending),
        "todo": {
            "name": latest.name,
            "subject": latest.description,
            "todo_type": latest.custom_todo_type,
            "priority": latest.priority,
            "due_date": _d(latest.date),
            "reference_doctype": "Employee Separation",
            "reference_name": separation,
        },
    }
