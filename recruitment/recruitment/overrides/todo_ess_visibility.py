"""ESS Portal visibility for ToDo Types, applied without touching cn_todo_manager.

`Todo Type.custom_show_in_alumni_portal` already gates the Alumni Portal --
`alumni_portal.get_alumni_todo_list` narrows to an explicit allow-list before
delegating to `cn_todo_manager`'s own `get_todo_list`, so that side needs no
change here.

`custom_show_in_ess_portal` (the sibling field this module reads) is new. ESS
has no equivalent allow-list wrapper: both the thin ESS dashboard widget
(`recruitment/frontend`'s `todoService.ts`) and the full embedded Todo app
(cn_todo_manager's own `task-manager` bundle, mounted into ESS via
`TodoAppShadowWrapper`) call `cn_todo_manager.chatnext_todo_manager.api
.todo_api.get_todo_list` directly, with no Todo-Type restriction at all --
today every caller sees every Todo Type. Patching cn_todo_manager's own
source is exactly what the Alumni Portal work avoided doing (its Custom
Fields survive a `bench update` there; edits to its .py files would not), so
this follows the same monkeypatch approach already used elsewhere in this
codebase (see cn_hrms_core's overrides/*.py) instead: reuse the query
builder every caller already funnels through, from outside the app that
owns it.

Visibility matrix -- the exact one already shipped for
`Notice.show_in_ess_portal` / `.show_in_alumni_portal`, reused (not
reimplemented) via `notice_visibility.visible_in_portal`:

    ESS on  / Alumni off -> ESS only
    ESS off / Alumni on  -> Alumni only
    ESS on  / Alumni on  -> both
    ESS off / Alumni off -> ESS only (legacy default -- unchanged)

Only the first row is new behaviour: previously an Alumni-only Todo Type
(Alumni on, ESS off) still showed up in ESS, same as everything else. This
patch adds exactly that one exclusion and nothing else -- an "ESS off,
Alumni off" or "ESS on" type is completely unaffected, so existing,
non-alumni-flagged Todo Types keep behaving exactly as before.

Alumni Portal sessions are exempted from the exclusion (checked via
`is_alumni_employee(frappe.session.user)`): `alumni_guard.py` already
confines an alumni session to `recruitment.recruitment.alumni_portal.*`, so
the only way this query builder ever runs under an alumni session is via
`get_alumni_todo_list`'s own internal delegation call -- which already
narrowed `todo_type_filter` to alumni-visible types itself. Applying the ESS
exclusion on top of that would incorrectly strip out exactly the
Alumni-only (ESS off) types the Alumni Portal is trying to show.
"""

from __future__ import annotations

import frappe

#: Marker attribute so re-running ``apply_patch`` in a warm process is a no-op.
_PATCHED = "_recruitment_todo_ess_visibility"

ESS_FLAG = "custom_show_in_ess_portal"
ALUMNI_FLAG = "custom_show_in_alumni_portal"


def _ess_hidden_todo_types() -> list[str]:
    """Todo Types explicitly opted out of ESS (Alumni on, ESS off)."""
    if not frappe.db.has_column("Todo Type", ESS_FLAG):
        return []

    from recruitment.recruitment.notice_visibility import visible_in_portal

    rows = frappe.get_all("Todo Type", fields=["name", ESS_FLAG, ALUMNI_FLAG])
    return [
        row["name"]
        for row in rows
        if not visible_in_portal(row.get(ESS_FLAG), row.get(ALUMNI_FLAG), "ess")
    ]


def apply_patch():
    try:
        from cn_todo_manager.chatnext_todo_manager.api.todo_api import (
            OptimizedTodoQueryBuilder,
        )
    except ImportError:
        return

    if getattr(OptimizedTodoQueryBuilder, _PATCHED, False):
        return

    original = OptimizedTodoQueryBuilder.apply_todo_type_filter

    def apply_todo_type_filter(self, todo_type_filter):
        original(self, todo_type_filter)

        from recruitment.recruitment.alumni_portal import is_alumni_employee

        if is_alumni_employee(frappe.session.user):
            return

        hidden = _ess_hidden_todo_types()
        if hidden:
            self.filters.append(["ToDo", "custom_todo_type", "not in", hidden])

    OptimizedTodoQueryBuilder.apply_todo_type_filter = apply_todo_type_filter
    setattr(OptimizedTodoQueryBuilder, _PATCHED, True)
