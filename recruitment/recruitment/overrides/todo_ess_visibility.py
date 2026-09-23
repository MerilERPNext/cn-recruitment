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

Visibility matrix -- built on `notice_visibility.visible_in_portal` (reused,
not reimplemented), but with `legacy_default_ess=False`: Todo Type is
strict opt-in on both sides, unlike Notice, which keeps its own legacy
"neither set -> ESS" default untouched:

    ESS on  / Alumni off -> ESS only
    ESS off / Alumni on  -> Alumni only
    ESS on  / Alumni on  -> both
    ESS off / Alumni off -> hidden everywhere

The last row is a deliberate, confirmed behaviour change from this module's
first version, which matched Notice's legacy-default row ("neither set"
stayed ESS-visible). Flipping it meant every Todo Type that predates this
field and had never touched either checkbox -- 25 of them at the time this
was written, including "Leave Approval", "Attendance Request" and "Employee
Separation" -- would otherwise have gone invisible in ESS the instant this
shipped, for anyone's brand new ToDo under one of those types. Guarded
against by `recruitment.patches.backfill_ess_todo_type_strict_default`, a
one-time migration setting `custom_show_in_ess_portal=1` on exactly the Todo
Types that were both-off at the time this changed -- so existing ESS
visibility is preserved for everything that already relied on it, and only
a *new* Todo Type created after this patch ran can end up both-off (and
therefore genuinely, intentionally hidden everywhere) by default.

Alumni Portal sessions are exempted from the exclusion (checked via
`is_alumni_employee(frappe.session.user)`): `alumni_guard.py` already
confines an alumni session to `recruitment.recruitment.alumni_portal.*`, so
the only way this query builder ever runs under an alumni session is via
`get_alumni_todo_list`'s own internal delegation call -- which already
narrowed `todo_type_filter` to alumni-visible types itself. Applying the ESS
exclusion on top of that would incorrectly strip out exactly the
Alumni-only (ESS off) types the Alumni Portal is trying to show.

`get_todo_categories` (the category-checkbox / filter-chip counts shown
alongside the list) is a SEPARATE code path -- raw SQL grouping ToDo by
`custom_todo_type`, with no reference to `Todo Type` at all -- so the
`get_todo_list` patch above does not reach it. Patched the same way, but by
wrapping the whole function rather than one internal method: the SQL is
self-contained in one function body, so there is no seam to hook a filter
into from outside. Call the original, then drop hidden categories from its
already-built `{"message": [{"name", "count"}, ...]}` result -- the same
"filter what was already fetched" shape as
`notice_visibility.filter_notices_by_portal`. `'Uncategorized'` (its
synthetic bucket for ToDos with no type) can never collide with a real Todo
Type name, so it is never at risk of being excluded by this.
"""

from __future__ import annotations

import frappe

#: Marker attribute so re-running ``apply_patch`` in a warm process is a no-op.
_PATCHED = "_recruitment_todo_ess_visibility"

ESS_FLAG = "custom_show_in_ess_portal"
ALUMNI_FLAG = "custom_show_in_alumni_portal"


def _ess_hidden_todo_types() -> list[str]:
    """Todo Types not visible in ESS: ESS unchecked, whatever Alumni is set to.

    `legacy_default_ess=False` -- unlike Notice's own use of this same helper,
    a Todo Type with neither box checked is hidden everywhere, not defaulted
    to ESS-visible. See the module docstring for why that is safe to do now.
    """
    if not frappe.db.has_column("Todo Type", ESS_FLAG):
        return []

    from recruitment.recruitment.notice_visibility import visible_in_portal

    rows = frappe.get_all("Todo Type", fields=["name", ESS_FLAG, ALUMNI_FLAG])
    return [
        row["name"]
        for row in rows
        if not visible_in_portal(
            row.get(ESS_FLAG), row.get(ALUMNI_FLAG), "ess", legacy_default_ess=False
        )
    ]


def _hidden_for_current_session() -> list[str]:
    """`_ess_hidden_todo_types()`, skipped entirely for an alumni session."""
    from recruitment.recruitment.alumni_portal import is_alumni_employee

    if is_alumni_employee(frappe.session.user):
        return []
    return _ess_hidden_todo_types()


def _patch_todo_list_filter(todo_api) -> None:
    OptimizedTodoQueryBuilder = todo_api.OptimizedTodoQueryBuilder
    if getattr(OptimizedTodoQueryBuilder, _PATCHED, False):
        return

    original = OptimizedTodoQueryBuilder.apply_todo_type_filter

    def apply_todo_type_filter(self, todo_type_filter):
        original(self, todo_type_filter)
        hidden = _hidden_for_current_session()
        if hidden:
            self.filters.append(["ToDo", "custom_todo_type", "not in", hidden])

    OptimizedTodoQueryBuilder.apply_todo_type_filter = apply_todo_type_filter
    setattr(OptimizedTodoQueryBuilder, _PATCHED, True)


def _patch_todo_categories(todo_api) -> None:
    if getattr(todo_api, _PATCHED, False):
        return

    original = todo_api.get_todo_categories

    @frappe.whitelist()
    def get_todo_categories(type=None, status_filter=None):
        result = original(type=type, status_filter=status_filter)
        hidden = _hidden_for_current_session()
        if not hidden or not isinstance(result, dict):
            return result
        messages = result.get("message")
        if isinstance(messages, list):
            result["message"] = [row for row in messages if row.get("name") not in hidden]
        return result

    todo_api.get_todo_categories = get_todo_categories
    setattr(todo_api, _PATCHED, True)


def apply_patch():
    try:
        from cn_todo_manager.chatnext_todo_manager.api import todo_api
    except ImportError:
        return

    _patch_todo_list_filter(todo_api)
    _patch_todo_categories(todo_api)
