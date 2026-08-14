"""Existing strength vs. hiring already in flight, for one requisition.

Answers the two questions a hiring approver asks before saying yes to a Job
Requisition:

    "How many of this role do we ALREADY have in that region?"   -> active_employees
    "And how many are we ALREADY hiring there?"                  -> active_requisitions
                                                                    / active_openings

Both are counted from the masters (Employee, Job Requisition) and then STORED on
the requisition — per region on ``custom_regions``, and as totals on the parent —
so lists, reports and the React form can read them without recomputing, and so a
requisition keeps the picture that was true when it was raised.

Region is the axis, because that is how this business is organised: an Employee
carries ``custom_region``, and a requisition budgets its headcount per region on
``custom_regions``. A lateral requisition has no region rows, so its region is
resolved from the Branch it is raised against (``custom_location``, else the
locations on ``custom_position_details``) — see ``requisition_regions``.

WHY THE COUNTS ARE WRITTEN IN on_update AND NOT IN validate
-----------------------------------------------------------
``validate_requisition_settings`` blocks any business-field change on a
requisition that is already approved (and, when the initiation lock is on, on any
requisition at all after creation). Derived columns written during validate would
read as exactly such an edit and every save of an approved requisition would be
refused. Writing them after the save with ``db.set_value`` (no doc_events, no
``modified`` bump) keeps the numbers fresh without ever tripping those guards, and
cannot recurse.
"""

import frappe

JOB_REQUISITION = "Job Requisition"
JOB_REQUISITION_REGION = "Job Requisition Region"
EMPLOYEE = "Employee"

# An employee counts toward existing strength only while they are on the rolls.
ACTIVE_EMPLOYEE_STATUS = "Active"

# What counts as "already hiring" for the same role in the same region. Approval
# Pending is in on purpose: headcount awaiting sign-off is real competing demand,
# and leaving it out is how two regions each approve the same hire. Draft is out
# (nobody has committed to it) and so is everything terminal.
ACTIVE_HIRING_STATUSES = ("Approval Pending", "Approved Draft", "Approved Active")

# Where each number is stored.
ROW_FIELDS = ("active_employees", "active_requisitions", "active_openings")
# A lateral position row carries the strength figure only — see _write_position_row.
POSITION_ROW_FIELD = "active_employees"
PARENT_FIELDS = {
    "active_employees": "custom_active_employees",
    "active_requisitions": "custom_active_requisitions",
    "active_openings": "custom_active_openings",
}
SNAPSHOT_FIELD = "custom_headcount_last_updated"

# The Employee field carrying the region. Named here so a site that renames it has
# one place to change.
EMPLOYEE_REGION_FIELD = "custom_region"

# The Employee field carrying the work location, matched against the Branch on a
# lateral requisition's position rows.
EMPLOYEE_LOCATION_FIELD = "branch"

JOB_REQUISITION_POSITION_DETAIL = "Position Details"

# The two axes, and how a requisition picks one. They are NOT interchangeable:
#
#   REGION   — fresher / campus. Headcount is budgeted per region on custom_regions,
#              so "do we already have these people" is a regional question.
#   LOCATION — lateral. The requisition names an exact Branch per position, along
#              with a department and designation, so the comparison is the people
#              already doing that job at that branch. Rolling a lateral hire up to a
#              region would answer a question nobody asked.
AXIS_REGION = "region"
AXIS_LOCATION = "location"


def _zero():
    return {"active_employees": 0, "active_requisitions": 0, "active_openings": 0}


# ---------------------------------------------------------------------------
# Which regions a requisition is asking for
# ---------------------------------------------------------------------------

def requisition_axis(doc):
    """``(axis, [keys])`` — what this requisition is counted against.

    The region rows win when present: only a fresher/campus requisition has them,
    and they are the headcount budget itself. Otherwise the position rows give one
    Branch per position, which is the lateral axis. A requisition with neither has
    nothing to compare against and returns no keys, which callers report as "not
    counted" rather than as zero.
    """
    regions = [r.region for r in (doc.get("custom_regions") or []) if r.region]
    if regions:
        return AXIS_REGION, list(dict.fromkeys(regions))

    locations = [p.location for p in (doc.get("custom_position_details") or []) if p.location]
    if locations:
        return AXIS_LOCATION, list(dict.fromkeys(locations))

    return None, []


def requisition_regions(doc):
    """Back-compat shim: the region keys only, empty for a lateral requisition."""
    axis, keys = requisition_axis(doc)
    return keys if axis == AXIS_REGION else []


# ---------------------------------------------------------------------------
# The counts themselves — one query each, never one per region
# ---------------------------------------------------------------------------

def _employee_counts(designation, regions):
    """``{region: active employees}`` holding `designation` in each region."""
    if not (designation and regions):
        return {}
    if not frappe.get_meta(EMPLOYEE).has_field(EMPLOYEE_REGION_FIELD):
        return {}

    rows = frappe.db.sql(
        f"""
        select `{EMPLOYEE_REGION_FIELD}` as region, count(*) as cnt
        from `tabEmployee`
        where status = %(status)s
          and designation = %(designation)s
          and `{EMPLOYEE_REGION_FIELD}` in %(regions)s
        group by `{EMPLOYEE_REGION_FIELD}`
        """,
        {"status": ACTIVE_EMPLOYEE_STATUS, "designation": designation,
         "regions": tuple(regions)},
        as_dict=True,
    )
    return {r.region: int(r.cnt or 0) for r in rows}


def _hiring_counts(designation, regions, exclude=None):
    """``{region: {"reqs": n, "openings": n}}`` — live demand for the same role.

    Counted off the region rows of OTHER requisitions, so "openings" is the
    headcount those requisitions budgeted for that region, not their whole
    company-wide ask.
    """
    if not (designation and regions):
        return {}

    rows = frappe.db.sql(
        """
        select rgn.region as region,
               count(distinct rgn.parent) as reqs,
               sum(rgn.no_of_openings) as openings
        from `tabJob Requisition Region` rgn
        inner join `tabJob Requisition` jr on jr.name = rgn.parent
        where rgn.parenttype = %(parenttype)s
          and rgn.region in %(regions)s
          and jr.designation = %(designation)s
          and jr.status in %(statuses)s
          and jr.name != %(exclude)s
        group by rgn.region
        """,
        {"parenttype": JOB_REQUISITION, "regions": tuple(regions),
         "designation": designation, "statuses": tuple(ACTIVE_HIRING_STATUSES),
         "exclude": exclude or ""},
        as_dict=True,
    )
    return {r.region: {"reqs": int(r.reqs or 0), "openings": int(r.openings or 0)}
            for r in rows}


def _location_employee_counts(company, department, designation, locations):
    """``{location: active employees}`` doing this exact job at each branch.

    The lateral key is the full one the requisition itself states — company +
    department + designation + branch. A looser key would answer a different
    question: "Collection Officers at Jodhpur II" is the comparison, not "anyone at
    Jodhpur II" and not "Collection Officers company-wide".
    """
    if not (designation and locations):
        return {}
    meta = frappe.get_meta(EMPLOYEE)
    if not meta.has_field(EMPLOYEE_LOCATION_FIELD):
        return {}

    where = [
        "status = %(status)s",
        "designation = %(designation)s",
        f"`{EMPLOYEE_LOCATION_FIELD}` in %(locations)s",
    ]
    params = {"status": ACTIVE_EMPLOYEE_STATUS, "designation": designation,
              "locations": tuple(locations)}
    # Company and department narrow the count only when the requisition states them
    # — an unstated one must not silently exclude everybody.
    if company:
        where.append("company = %(company)s")
        params["company"] = company
    if department:
        where.append("department = %(department)s")
        params["department"] = department

    rows = frappe.db.sql(
        f"""
        select `{EMPLOYEE_LOCATION_FIELD}` as location, count(*) as cnt
        from `tabEmployee`
        where {" and ".join(where)}
        group by `{EMPLOYEE_LOCATION_FIELD}`
        """,
        params, as_dict=True,
    )
    return {r.location: int(r.cnt or 0) for r in rows}


def _location_hiring_counts(company, department, designation, locations, exclude=None):
    """``{location: {"reqs": n, "openings": n}}`` — live lateral demand per branch.

    A lateral requisition itemises its headcount, so one position row IS one
    opening: the openings figure is the row count, not a budgeted number.
    """
    if not (designation and locations):
        return {}

    where = [
        "pos.parenttype = %(parenttype)s",
        "pos.location in %(locations)s",
        "jr.designation = %(designation)s",
        "jr.status in %(statuses)s",
        "jr.name != %(exclude)s",
    ]
    params = {"parenttype": JOB_REQUISITION, "locations": tuple(locations),
              "designation": designation, "statuses": tuple(ACTIVE_HIRING_STATUSES),
              "exclude": exclude or ""}
    if company:
        where.append("jr.company = %(company)s")
        params["company"] = company
    if department:
        where.append("jr.department = %(department)s")
        params["department"] = department

    rows = frappe.db.sql(
        f"""
        select pos.location as location,
               count(distinct pos.parent) as reqs,
               count(*) as openings
        from `tabPosition Details` pos
        inner join `tabJob Requisition` jr on jr.name = pos.parent
        where {" and ".join(where)}
        group by pos.location
        """,
        params, as_dict=True,
    )
    return {r.location: {"reqs": int(r.reqs or 0), "openings": int(r.openings or 0)}
            for r in rows}


def headcount_by_location(company, department, designation, locations, exclude=None):
    """``{location: {active_employees, active_requisitions, active_openings}}``."""
    locations = [loc for loc in dict.fromkeys(locations or []) if loc]
    if not (designation and locations):
        return {}

    employees = _location_employee_counts(company, department, designation, locations)
    hiring = _location_hiring_counts(company, department, designation, locations,
                                     exclude=exclude)
    out = {}
    for loc in locations:
        live = hiring.get(loc) or {}
        out[loc] = {
            "active_employees": employees.get(loc, 0),
            "active_requisitions": live.get("reqs", 0),
            "active_openings": live.get("openings", 0),
        }
    return out


def headcount_for(doc, exclude=None):
    """``(axis, {key: counts})`` for a requisition, on whichever axis applies."""
    axis, keys = requisition_axis(doc)
    if axis == AXIS_REGION:
        return axis, headcount_by_region(doc.designation, keys,
                                         exclude=exclude or doc.name)
    if axis == AXIS_LOCATION:
        return axis, headcount_by_location(doc.get("company"), doc.get("department"),
                                           doc.designation, keys,
                                           exclude=exclude or doc.name)
    return None, {}


def headcount_by_region(designation, regions, exclude=None):
    """``{region: {active_employees, active_requisitions, active_openings}}``.

    Every requested region is present, zeroed when nothing matches, so callers can
    render a row per region without checking for holes.
    """
    regions = [r for r in dict.fromkeys(regions or []) if r]
    if not (designation and regions):
        return {}

    employees = _employee_counts(designation, regions)
    hiring = _hiring_counts(designation, regions, exclude=exclude)

    out = {}
    for region in regions:
        live = hiring.get(region) or {}
        out[region] = {
            "active_employees": employees.get(region, 0),
            "active_requisitions": live.get("reqs", 0),
            "active_openings": live.get("openings", 0),
        }
    return out


def _totals(by_region):
    total = _zero()
    for counts in by_region.values():
        for key in total:
            total[key] += counts[key]
    return total


# ---------------------------------------------------------------------------
# Storing it on the requisition
# ---------------------------------------------------------------------------

def _write_rows(doctype, updates):
    """Apply ``{row name: {field: value}}`` in as few UPDATEs as possible.

    Rows sharing a value are written together — a lateral requisition with fifty
    positions at three branches is three UPDATEs, not fifty. Writing per row made
    this hook's cost scale with the size of the requisition, on every single save.
    """
    if not updates:
        return 0
    batches = {}
    for row_name, values in updates.items():
        batches.setdefault(tuple(sorted(values.items())), []).append(row_name)
    for values, names in batches.items():
        frappe.db.set_value(doctype, {"name": ["in", names]}, dict(values),
                            update_modified=False)
    return len(batches)


def store_headcount(doc, method=None):
    """``on_update``: refresh the stored counts on `doc` and its region rows.

    Written with ``db.set_value`` so no validation (and so none of the
    edit-after-approval guards) runs — see the module docstring. The values are
    mirrored onto the in-memory document as well, so the response to the save that
    triggered this already carries the fresh numbers.
    """
    try:
        _store_headcount(doc)
    except Exception:
        # A reporting number must never be the reason a requisition fails to save.
        frappe.log_error(frappe.get_traceback(), "Job Requisition: headcount refresh failed")


def _store_headcount(doc):
    from frappe.utils import now

    axis, by_key = headcount_for(doc)

    if axis == AXIS_REGION:
        updates = {}
        for row in (doc.get("custom_regions") or []):
            counts = by_key.get(row.region) or _zero()
            updates[row.name] = {f: counts[f] for f in ROW_FIELDS}
            for field in ROW_FIELDS:      # keep the loaded doc honest too
                row.set(field, counts[field])
        _write_rows(JOB_REQUISITION_REGION, updates)
    elif axis == AXIS_LOCATION:
        # One count per position row. Rows sharing a branch all show that branch's
        # number — the parent total is computed off the deduped keys below, so a
        # requisition with three positions at one branch does not triple-count it.
        # A position row carries only the strength figure: the live-hiring numbers are
        # a requisition-level comparison, not a property of one budgeted seat.
        updates = {}
        has_field = frappe.get_meta(JOB_REQUISITION_POSITION_DETAIL).has_field(
            POSITION_ROW_FIELD)
        for row in (doc.get("custom_position_details") or []):
            counts = by_key.get(row.location) or _zero()
            if has_field:
                updates[row.name] = {POSITION_ROW_FIELD: counts["active_employees"]}
                row.set(POSITION_ROW_FIELD, counts["active_employees"])
        _write_rows(JOB_REQUISITION_POSITION_DETAIL, updates)

    total = _totals(by_key)
    meta = doc.meta
    updates = {}
    for key, fieldname in PARENT_FIELDS.items():
        if meta.has_field(fieldname):
            updates[fieldname] = total[key]
            doc.set(fieldname, total[key])
    if meta.has_field(SNAPSHOT_FIELD):
        stamp = now()
        updates[SNAPSHOT_FIELD] = stamp
        doc.set(SNAPSHOT_FIELD, stamp)

    if updates:
        frappe.db.set_value(JOB_REQUISITION, doc.name, updates, update_modified=False)
    return total


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_requisition_headcount(job_requisition):
    """Counts for one requisition, broken down on whichever axis applies.

    Read-only: it never writes, so it is safe to call from a form that has unsaved
    changes.
    """
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)
    doc = frappe.get_doc(JOB_REQUISITION, job_requisition)
    axis, by_key = headcount_for(doc)
    return _payload(doc.designation, axis, by_key)


@frappe.whitelist()
def preview_headcount(designation, regions=None, locations=None, company=None,
                      department=None, job_requisition=None):
    """The same numbers for a requisition that is still being filled in.

    The form calls this as soon as the key is complete, so the approver sees
    existing strength BEFORE the requisition is saved. Which argument is supplied
    picks the axis: `regions` for a fresher requisition, `locations` (plus the
    company/department the lateral key needs) for a lateral one.
    """
    regions = _key_list(regions, "region")
    locations = _key_list(locations, "location")

    if regions:
        return _payload(designation, AXIS_REGION,
                        headcount_by_region(designation, regions, exclude=job_requisition))
    if locations:
        return _payload(designation, AXIS_LOCATION,
                        headcount_by_location(company, department, designation, locations,
                                              exclude=job_requisition))
    return _payload(designation, None, {})


def _key_list(value, dict_key):
    """Accept a JSON string, a list of ids, or a list of grid rows."""
    if isinstance(value, str):
        value = frappe.parse_json(value) or []
    return [v.get(dict_key) if isinstance(v, dict) else v for v in (value or []) if v]


@frappe.whitelist()
def refresh_requisition_headcount(job_requisition):
    """Recompute and re-store the counts on demand (the form's Refresh action)."""
    frappe.has_permission(JOB_REQUISITION, "write", doc=job_requisition, throw=True)
    doc = frappe.get_doc(JOB_REQUISITION, job_requisition)
    _store_headcount(doc)
    frappe.db.commit()

    axis, by_key = headcount_for(doc)
    return _payload(doc.designation, axis, by_key)


def _region_labels(keys):
    return {
        r.name: r.location_region
        for r in frappe.get_all("Region", filters={"name": ["in", list(keys) or [""]]},
                                fields=["name", "location_region"])
    } if keys else {}


def _payload(designation, axis, by_key):
    """One shape for both axes.

    `axis` is None when the requisition states neither a region nor a location — the
    caller MUST render that as "not counted", never as zero: an approver reading
    "0 already in this role" when the truth is "we could not tell" is the one wrong
    answer this feature can give.
    """
    labels = _region_labels(by_key) if axis == AXIS_REGION else {}
    rows = [
        {"key": key, "label": labels.get(key) or key, **counts}
        for key, counts in by_key.items()
    ]
    return {
        "designation": designation,
        "axis": axis,
        "counted": bool(by_key),
        # Kept under their own names too, so a caller can read whichever it expects
        # without switching on the axis first.
        "regions": rows if axis == AXIS_REGION else [],
        "locations": rows if axis == AXIS_LOCATION else [],
        "rows": rows,
        "totals": _totals(by_key),
    }


# ---------------------------------------------------------------------------
# Backfill
# ---------------------------------------------------------------------------

def backfill(batch=200):
    """Populate the counts on requisitions that pre-date this feature."""
    names = frappe.get_all(JOB_REQUISITION, pluck="name", order_by="creation asc")
    done = 0
    for name in names:
        try:
            _store_headcount(frappe.get_doc(JOB_REQUISITION, name))
            done += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"headcount backfill failed: {name}")
        if done % batch == 0:
            frappe.db.commit()
    frappe.db.commit()
    print(f"[headcount] backfilled {done} of {len(names)} requisitions")
    return done
