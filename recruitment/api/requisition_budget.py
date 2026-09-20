"""AOP budget check for Job Requisitions.

Accounts keep each Cost Center's and Department's annual operating plan on the
master itself, both edited by hand:

  * ``custom_budget``             — the AOP amount.
  * ``custom_budget_utilization`` — how much of it is already used.

What is left (budget minus utilization) is what a requisition may ask for. A
requisition asks for its Salary Range (Max), annualised from its Salary
Timeframe, once per position:

  * Department  — the whole ask, against the requisition's department.
  * Cost Center — a position row's ``cost_center_allocations`` split that position
    across cost centers by percentage. Whatever is not allocated (a row without
    allocations, the rest of a split under 100%, or a region requisition with no
    position rows at all) is charged to the requisition's Cost Centre, else to
    its department's cost center.

Two consequences, both behind Recruitment Settings -> "Enable AOP Budget Check"
(off: nothing is blocked and nothing is flagged):

  * Raising a requisition — or changing what an existing one asks for — is
    refused when any master has less left than the requisition needs.
    ``enforce_budget``.
  * Budgets move after requisitions are raised. ``custom_over_budget`` marks the
    live requisitions a master can no longer cover. It is recomputed after every
    save, whenever a budget is edited or the setting is toggled, and nightly.
    The requisition itself is left alone; the form shows a banner.

A master with no budget set (blank / zero) has no AOP configured and is skipped.
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import cint, create_batch, escape_html, flt, fmt_money

from recruitment.api.job_requisition import (
    SALARY_MAX_FIELD,
    SALARY_TIMEFRAME_FIELD,
    _serialise_cost_center_allocations,
    _to_amount,
)

JOB_REQUISITION = "Job Requisition"
POSITION_DETAILS = "Position Details"
COST_CENTER = "Cost Center"
DEPARTMENT = "Department"
RECRUITMENT_SETTINGS = "Recruitment Settings"

SETTING_FIELD = "enable_aop_budget_check"
BUDGET_FIELD = "custom_budget"
UTILIZATION_FIELD = "custom_budget_utilization"
OVER_BUDGET_FIELD = "custom_over_budget"
REQUISITION_COST_CENTER_FIELD = "custom_cost_centre"
DEPARTMENT_COST_CENTER_FIELD = "custom_cost_center_code"
CURRENCY_FIELD = "custom_salary_range_currency"
POSITION_TABLE = "custom_position_details"
ALLOCATIONS_FIELD = "cost_center_allocations"

LABEL_FIELD = {COST_CENTER: "cost_center_name", DEPARTMENT: "department_name"}

# Requisitions still hiring against a budget — the only ones that are flagged.
LIVE_STATUSES = ("Approval Pending", "Approved Draft", "Approved Active")
# Closed or paused: a save is never blocked on budget.
UNCHECKED_STATUSES = ("Rejected", "On Hold", "Cancelled", "Archived", "Auto Archived")

# AOP budgets are annual; the short timeframes use working-year conventions.
PERIODS_PER_YEAR = {
    "Annual": 1,
    "Monthly": 12,
    "Fortnightly": 26,
    "Weekly": 52,
    "Daily": 260,
    "Hourly": 2080,
}

# Parent fields that decide what a requisition asks for. The position rows'
# allocations are compared separately (see _ask_changed).
ASK_FIELDS = (
    "department",
    REQUISITION_COST_CENTER_FIELD,
    SALARY_MAX_FIELD,
    SALARY_TIMEFRAME_FIELD,
    "no_of_positions",
)

REFRESH_METHOD = "recruitment.api.requisition_budget.refresh_over_budget_flags"
REFRESH_JOB_ID = "recruitment_requisition_budget_refresh"
# Set when a budget changes; a refresh already running sees it and does one more pass.
RERUN_KEY = "recruitment_requisition_budget_rerun"
MAX_REFRESH_PASSES = 3
BATCH_SIZE = 500


def is_enabled(cache=True):
    # The field arrives with a migrate. Until then the check is simply off —
    # reading a field that does not exist would break every requisition save.
    if not frappe.get_meta(RECRUITMENT_SETTINGS).has_field(SETTING_FIELD):
        return False
    return bool(
        cint(
            frappe.db.get_single_value(RECRUITMENT_SETTINGS, SETTING_FIELD, cache=cache)
        )
    )


# ---------------------------------------------------------------------------
# What a requisition asks for, and what the masters have left
#
# `cache` (a dict) is passed by the batch refresh so every master is read once
# for the whole run; a single save leaves it None and reads only what it needs.
# ---------------------------------------------------------------------------


def annual_cost_per_position(doc):
    """Salary Range (Max) for one position over a year; 0 when it is blank."""
    amount = _to_amount(doc.get(SALARY_MAX_FIELD))
    if not amount or amount <= 0:
        return 0.0
    timeframe = (doc.get(SALARY_TIMEFRAME_FIELD) or "").strip()
    return amount * PERIODS_PER_YEAR.get(timeframe, 1)


def _department_cost_center(department, cache=None):
    if not department or not frappe.get_meta(DEPARTMENT).has_field(
        DEPARTMENT_COST_CENTER_FIELD
    ):
        return None
    if cache is None:
        return frappe.db.get_value(DEPARTMENT, department, DEPARTMENT_COST_CENTER_FIELD)
    if DEPARTMENT_COST_CENTER_FIELD not in cache:
        cache[DEPARTMENT_COST_CENTER_FIELD] = dict(
            frappe.get_all(
                DEPARTMENT,
                filters={DEPARTMENT_COST_CENTER_FIELD: ["is", "set"]},
                fields=["name", DEPARTMENT_COST_CENTER_FIELD],
                as_list=True,
            )
        )
    return cache[DEPARTMENT_COST_CENTER_FIELD].get(department)


def _fallback_cost_center(doc, cache=None):
    """The cost center whatever a position row does not allocate is charged to."""
    cost_center = str(doc.get(REQUISITION_COST_CENTER_FIELD) or "").strip()
    return cost_center or _department_cost_center(doc.get("department"), cache)


def requirement(doc, cache=None):
    """What `doc` asks for: ``(total, {cost center: amount})``."""
    per_position = annual_cost_per_position(doc)
    if not per_position:
        return 0.0, {}

    by_cost_center = defaultdict(float)
    rows = doc.get(POSITION_TABLE) or []
    if rows:
        positions = len(rows)
        unallocated = 0.0  # in positions; a 60% split leaves 0.4 of one
        for row in rows:
            allocated = 0.0
            for allocation in _serialise_cost_center_allocations(
                row.get(ALLOCATIONS_FIELD)
            ):
                if not isinstance(allocation, dict) or allocation.get(
                    "cost_center"
                ) in (None, ""):
                    continue
                percentage = flt(allocation.get("percentage"))
                if percentage <= 0:
                    continue
                by_cost_center[str(allocation["cost_center"])] += (
                    per_position * percentage / 100
                )
                allocated += percentage
            # Rounded so 33.33 x 3 counts as fully allocated.
            unallocated += max(0.0, flt(100 - allocated, 1)) / 100
    else:
        positions = unallocated = cint(doc.get("no_of_positions"))

    if unallocated > 0:
        cost_center = _fallback_cost_center(doc, cache)
        if cost_center:
            by_cost_center[str(cost_center)] += per_position * unallocated

    return per_position * positions, dict(by_cost_center)


def _load_budgets(doctype, names=None):
    label_field = LABEL_FIELD[doctype]
    filters = {BUDGET_FIELD: [">", 0]}
    if names is not None:
        filters["name"] = ["in", list(names)]
    rows = frappe.get_all(
        doctype,
        filters=filters,
        fields=["name", label_field, BUDGET_FIELD, UTILIZATION_FIELD],
    )
    return {
        row.name: {
            "label": row.get(label_field) or row.name,
            "budget": flt(row.get(BUDGET_FIELD)),
            "utilized": flt(row.get(UTILIZATION_FIELD)),
        }
        for row in rows
    }


def _budgets(doctype, names, cache=None):
    """``{name: {label, budget, utilized}}`` for those of `names` that have a budget set."""
    meta = frappe.get_meta(doctype)
    if not names or not (
        meta.has_field(BUDGET_FIELD) and meta.has_field(UTILIZATION_FIELD)
    ):
        return {}
    if cache is None:
        return _load_budgets(doctype, names)
    if doctype not in cache:
        cache[doctype] = _load_budgets(doctype)
    return {name: cache[doctype][name] for name in names if name in cache[doctype]}


def _summary(doctype, label, required, available, budget, utilized, currency):
    def money(amount):
        return fmt_money(amount, precision=0, currency=currency)

    left = (
        _("only {0} is left").format(money(available))
        if available > 0
        else _("no budget is left")
    )
    return _('{0} "{1}" needs {2}, but {3} (Budget {4} − Utilized {5}).').format(
        _(doctype), label, money(required), left, money(budget), money(utilized)
    )


def shortfalls(doc, cache=None):
    """Each Department / Cost Center `doc` needs more from than it has left."""
    total, by_cost_center = requirement(doc, cache)
    asks = []
    if total and doc.get("department"):
        asks.append((DEPARTMENT, {doc.get("department"): total}))
    if by_cost_center:
        asks.append((COST_CENTER, by_cost_center))
    if not asks:
        return []

    currency = doc.get(CURRENCY_FIELD) or (
        doc.get("company")
        and frappe.get_cached_value("Company", doc.get("company"), "default_currency")
    )
    out = []
    for doctype, needs in asks:
        for name, master in _budgets(doctype, needs, cache).items():
            available = master["budget"] - master["utilized"]
            required = needs[name]
            if flt(required, 2) <= flt(available, 2):
                continue
            out.append(
                {
                    "doctype": doctype,
                    "name": name,
                    "label": master["label"],
                    "budget": master["budget"],
                    "utilized": master["utilized"],
                    "available": available,
                    "required": required,
                    "summary": _summary(
                        doctype,
                        master["label"],
                        required,
                        available,
                        master["budget"],
                        master["utilized"],
                        currency,
                    ),
                }
            )
    return out


# ---------------------------------------------------------------------------
# Job Requisition hooks
# ---------------------------------------------------------------------------


def _allocation_snapshot(doc):
    return [
        str(row.get(ALLOCATIONS_FIELD) or "") for row in (doc.get(POSITION_TABLE) or [])
    ]


def _ask_changed(doc):
    before = doc.get_doc_before_save()
    if not before:
        return True
    if any(str(before.get(f) or "") != str(doc.get(f) or "") for f in ASK_FIELDS):
        return True
    return _allocation_snapshot(before) != _allocation_snapshot(doc)


def _over_budget_message(rows):
    items = "".join(f"<li>{escape_html(row['summary'])}</li>" for row in rows)
    return (
        _(
            "This requisition can't be saved because it needs more than the AOP budget that is left:"
        )
        + f"<ul>{items}</ul>"
        + _(
            "Amount needed = Salary Range (Max) for one year × number of positions. Lower the salary "
            "range or the number of positions, or ask the Accounts team to update the budget."
        )
    )


def enforce_budget(doc, method=None):
    """``validate``: refuse a requisition that asks for more than is left.

    Checked when the requisition is raised and whenever what it asks for changes.
    Other saves (status moves, approvals, unrelated edits) are never blocked by a
    budget that shrank afterwards — that is what the Over Budget flag is for."""
    if frappe.flags.in_patch or frappe.flags.in_install or frappe.flags.in_migrate:
        return
    if doc.get("status") in UNCHECKED_STATUSES:
        return
    if not doc.is_new() and not _ask_changed(doc):
        return
    if not is_enabled():
        return
    rows = shortfalls(doc)
    if rows:
        frappe.throw(_over_budget_message(rows), title=_("Over Budget"))


def is_over_budget(doc, enabled=None, cache=None):
    if doc.get("status") not in LIVE_STATUSES:
        return False
    if enabled is None:
        enabled = is_enabled()
    return bool(enabled and shortfalls(doc, cache))


def store_budget_flag(doc, method=None):
    """``on_update``: keep this requisition's Over Budget flag current.

    ``db.set_value`` so none of the requisition's validations (edit-after-approval
    guards) run, and only when the value actually changes."""
    if not doc.meta.has_field(OVER_BUDGET_FIELD):
        return
    try:
        flag = cint(is_over_budget(doc))
        if cint(doc.get(OVER_BUDGET_FIELD)) != flag:
            frappe.db.set_value(
                JOB_REQUISITION,
                doc.name,
                OVER_BUDGET_FIELD,
                flag,
                update_modified=False,
            )
            doc.set(OVER_BUDGET_FIELD, flag)
    except Exception:
        # A banner must never be the reason a requisition fails to save.
        frappe.log_error(
            title="Job Requisition: Over Budget flag refresh failed",
            message=frappe.get_traceback(),
            reference_doctype=JOB_REQUISITION,
            reference_name=doc.name,
        )


# ---------------------------------------------------------------------------
# Batch refresh (nightly, and after a budget / setting change)
# ---------------------------------------------------------------------------


def _position_rows(parents):
    """``{requisition: [position rows]}`` in a query per BATCH_SIZE requisitions."""
    rows = defaultdict(list)
    fields = ["parent"]
    if frappe.get_meta(POSITION_DETAILS).has_field(ALLOCATIONS_FIELD):
        fields.append(ALLOCATIONS_FIELD)
    for batch in create_batch(parents, BATCH_SIZE):
        for row in frappe.get_all(
            POSITION_DETAILS,
            filters={
                "parenttype": JOB_REQUISITION,
                "parentfield": POSITION_TABLE,
                "parent": ["in", batch],
            },
            fields=fields,
            order_by="idx asc",
        ):
            rows[row.parent].append(row)
    return rows


def _write_flags(names, value):
    for batch in create_batch(names, BATCH_SIZE):
        frappe.db.set_value(
            JOB_REQUISITION,
            {"name": ["in", batch]},
            OVER_BUDGET_FIELD,
            value,
            update_modified=False,
        )


def _refresh_pass():
    """One pass over every requisition that is live or still flagged. A fixed
    handful of queries however many requisitions there are."""
    if not is_enabled(cache=False):
        flagged = frappe.get_all(
            JOB_REQUISITION, filters={OVER_BUDGET_FIELD: 1}, pluck="name"
        )
        _write_flags(flagged, 0)
        return len(flagged)

    meta = frappe.get_meta(JOB_REQUISITION)
    fields = ["name", "status", "company", OVER_BUDGET_FIELD] + [
        f for f in (*ASK_FIELDS, CURRENCY_FIELD) if meta.has_field(f)
    ]
    requisitions = frappe.get_all(
        JOB_REQUISITION,
        or_filters={"status": ["in", LIVE_STATUSES], OVER_BUDGET_FIELD: 1},
        fields=fields,
    )
    rows = _position_rows([r.name for r in requisitions])

    cache = {}
    to_flag, to_clear = [], []
    for requisition in requisitions:
        requisition[POSITION_TABLE] = rows.get(requisition.name, [])
        flag = is_over_budget(requisition, enabled=True, cache=cache)
        if flag != bool(cint(requisition.get(OVER_BUDGET_FIELD))):
            (to_flag if flag else to_clear).append(requisition.name)

    _write_flags(to_flag, 1)
    _write_flags(to_clear, 0)
    return len(to_flag) + len(to_clear)


def refresh_over_budget_flags():
    """Scheduler / background job: recompute the flag on every requisition that
    could carry one. With the setting off this only clears flags left behind.

    A budget edited while a pass is running sets RERUN_KEY; the pass is committed
    and repeated so that edit is not left for the nightly run."""
    if not frappe.get_meta(JOB_REQUISITION).has_field(OVER_BUDGET_FIELD):
        return 0
    changed = 0
    for _attempt in range(MAX_REFRESH_PASSES):
        frappe.cache.delete_value(RERUN_KEY)
        changed += _refresh_pass()
        frappe.db.commit()
        # expires=True reads Redis itself, not the request-local copy, which a
        # value set by another process (with an expiry) never updates.
        if not frappe.cache.get_value(RERUN_KEY, expires=True):
            break
    return changed


def _request_refresh():
    frappe.cache.set_value(RERUN_KEY, 1, expires_in_sec=3600)
    # "default", not "long": a pass is a handful of queries, and the long queue can
    # sit behind a backlog of workflow jobs, leaving banners stale for that long.
    frappe.enqueue(
        REFRESH_METHOD, queue="default", job_id=REFRESH_JOB_ID, deduplicate=True
    )


def enqueue_refresh():
    """Refresh in the background once this transaction commits (so the job reads
    the new budget). Many edits at once — a data import — still queue one job."""
    frappe.db.after_commit.add(_request_refresh)


# ---------------------------------------------------------------------------
# Budget masters & settings
# ---------------------------------------------------------------------------


def on_budget_master_update(doc, method=None):
    """``on_update`` of Cost Center / Department: a budget edit re-flags the live
    requisitions straight away rather than waiting for the nightly run. A brand
    new master has no requisitions yet, so only edits count."""
    if not doc.get_doc_before_save():
        return
    watched = [BUDGET_FIELD, UTILIZATION_FIELD]
    if doc.doctype == DEPARTMENT:
        watched.append(DEPARTMENT_COST_CENTER_FIELD)
    if any(doc.has_value_changed(f) for f in watched) and is_enabled():
        enqueue_refresh()


def on_settings_update(doc):
    """Recruitment Settings saved: turning the check on flags, turning it off clears."""
    if doc.has_value_changed(SETTING_FIELD):
        enqueue_refresh()


# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------


def budget_status(doc):
    """What the Over Budget banner shows for `doc`: nothing unless it is flagged
    and still live (an archived requisition may carry a flag until the next refresh)."""
    if not (
        cint(doc.get(OVER_BUDGET_FIELD))
        and doc.get("status") in LIVE_STATUSES
        and is_enabled()
    ):
        return {"over_budget": False, "shortfalls": []}
    rows = shortfalls(doc)
    return {"over_budget": bool(rows), "shortfalls": rows}


@frappe.whitelist()
def get_budget_status(job_requisition):
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)
    return budget_status(frappe.get_doc(JOB_REQUISITION, job_requisition))
