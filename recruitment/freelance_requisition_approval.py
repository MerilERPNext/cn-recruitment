"""TEMPORARY: one Freelancer requisition driven through the real approval matrix.

The flow seeder (:mod:`recruitment.ta_attribute_flow_seed`) writes an approved
status straight onto the requisition, because the approval matrix is configured
per site and a seeder cannot assume one. This script does the opposite: it builds
ONE requisition and walks it through the site's actual matrix, approving every
stage as the person the matrix resolves to, so the end state is a genuinely
approved requisition rather than one that merely looks approved.

The matrix it uses
------------------
``APM-2026-00077`` — "TEST - Position Level Approval", the active matrix behind
Flow Config ``Raise_Requisition_workflow_PW`` (which fires on ``after_insert``,
so approval starts the moment the requisition is created — no separate "send for
approval" step is needed to get a tracker).

Both stages are **row-level**: they approve each row of
``custom_position_details`` on its own, and the stage completes only when every
row is approved.

    Stage 1  "Reporting Manager (per position)"
             row_approver_field      = reporting_manager
             row_approver_resolve_by = Self          -> the manager approves
             fallback                = Block         -> a row with no manager halts it

    Stage 2  "HRBP of that manager"
             row_approver_field      = reporting_manager
             row_approver_resolve_by = custom_hrbp   -> that manager's HRBP approves
             fallback                = Create Unassigned Task
             on completion           : writes Job Requisition.status

So each position row needs a ``reporting_manager`` who (a) has a ``user_id`` and
(b) has a ``custom_hrbp`` who also has a ``user_id``. :func:`_approver_pairs`
picks real employees that already satisfy both — no Employee record is edited.

The Job Description
-------------------
A Job Description is an HR-authored master, not something this script writes. It
carries its own applicability — company plus a list of designations and
departments — and a requisition picks one up **automatically** when its
designation + department fall inside that list
(``recruitment.api.job_description.find_matching_job_description``).

So the requisition is raised on a designation the site's JDs actually cover
(:func:`_jd_covered_context`), through the same endpoint the React form posts to
(``create_job_requisition``), and the JD's rendered content lands in
``description`` on its own. Raising it on an uncovered designation is how the
first version of this script quietly ended up with a hand-typed description and
no JD at all.

Run:
    bench --site recruitment execute recruitment.freelance_requisition_approval.run
Inspect without changing anything:
    bench --site recruitment execute recruitment.freelance_requisition_approval.report
Remove what this built:
    bench --site recruitment execute recruitment.freelance_requisition_approval.cleanup
"""

import frappe
from frappe.utils import add_days, today

MARKER = "[FREELANCE-APPROVAL]"
MATRIX = "APM-2026-00077"
JOB_REQUISITION = "Job Requisition"
POSITION_CHILD = "custom_position_details"
FREELANCER_TYPE = "Freelancer"
POSITIONS = 3


SETTINGS = "Recruitment Settings"


def _log(msg):
    print(f"  {msg}")


def _set_single(field, value):
    """Write a Recruitment Settings field and make the next read see it.

    ``frappe.db.get_single_value`` memoises into ``frappe.db.value_cache``, which
    ``frappe.clear_cache`` does not touch — so flipping a setting twice in one
    process would keep reading the first value.
    """
    frappe.db.set_single_value(SETTINGS, field, value)
    frappe.clear_cache(doctype=SETTINGS)
    frappe.db.value_cache.pop(SETTINGS, None)


def _first(doctype, filters=None, order_by="name asc"):
    rows = frappe.get_all(doctype, filters=filters or {}, pluck="name",
                          limit_page_length=1, order_by=order_by)
    return rows[0] if rows else None


# --------------------------------------------------------------------------- #
# Approvers
# --------------------------------------------------------------------------- #

def _approver_pairs(limit=POSITIONS):
    """``[(manager, manager_user, hrbp, hrbp_user), ...]`` the matrix can resolve.

    Both stages hang off the position row's ``reporting_manager``: stage 1 needs
    that employee to have a login, stage 2 needs their ``custom_hrbp`` to have one
    too. Anything short of that and the stage either blocks (stage 1's fallback)
    or parks an unassigned task nobody owns (stage 2's).

    Selected by query rather than configured, so this reads whatever the site
    actually has instead of asserting names that may not exist. Ordered by name so
    a re-run picks the same people.
    """
    rows = frappe.db.sql(
        """
        SELECT e.name AS manager, e.employee_name AS manager_name, e.user_id AS manager_user,
               e.company AS company,
               h.name AS hrbp, h.employee_name AS hrbp_name, h.user_id AS hrbp_user
        FROM `tabEmployee` e
        JOIN `tabEmployee` h ON h.name = e.custom_hrbp
        WHERE e.status = 'Active'
          AND IFNULL(e.user_id, '') != ''
          AND IFNULL(h.user_id, '') != ''
        ORDER BY e.name ASC
        """,
        as_dict=True,
    )
    if not rows:
        frappe.throw(
            "No Active employee on this site has both a login and a custom_hrbp who "
            "also has one. Stage 1 would block and stage 2 would have no approver."
        )
    return rows[:limit]


# --------------------------------------------------------------------------- #
# Job Description — authored by HR, matched by condition
# --------------------------------------------------------------------------- #

def _jd_covered_context(company):
    """``(designation, department, jd_name)`` a Job Description already covers.

    Queried rather than configured. A JD's applicability is a cross-product of its
    designation and department tables, so "which designation should this
    requisition use" has exactly one correct answer per site: one the JDs cover.
    Picking the first Designation on the site instead — which is what this did
    before — lands on one no JD mentions, and the requisition is then saved with
    whatever description the caller typed, silently skipping the feature.

    Superseded JDs are excluded the same way ``find_matching_job_description``
    excludes them, and ``status`` is coalesced because JDs created before
    versioning have it empty.
    """
    rows = frappe.db.sql(
        """
        SELECT jd.name, g.designation, p.department
        FROM `tabJob Description` jd
        JOIN `tabJD Designations` g
          ON g.parent = jd.name AND g.parenttype = 'Job Description'
         AND g.parentfield = 'designation'
        JOIN `tabJD Department` p
          ON p.parent = jd.name AND p.parenttype = 'Job Description'
         AND p.parentfield = 'department'
        WHERE COALESCE(NULLIF(jd.status, ''), 'Active') = 'Active'
          AND jd.company = %s
        ORDER BY jd.modified DESC
        """,
        company,
        as_dict=True,
    )
    if not rows:
        frappe.throw(
            f"No Active Job Description covers any designation in {company}. "
            "HR authors the JD; this script only raises a requisition that matches one."
        )

    # Prefer a pair only ONE Active JD covers. Where two cover the same pair the
    # match is decided by whichever was modified last, which makes the run
    # non-reproducible — and is the duplicate `prevent_duplicate_applicability`
    # exists to stop.
    seen = {}
    for row in rows:
        seen.setdefault((row["designation"], row["department"]), []).append(row["name"])
    for (designation, department), jds in seen.items():
        if len(jds) == 1:
            return designation, department, jds[0]

    designation, department = next(iter(seen))
    return designation, department, seen[(designation, department)][0]


def _apply_job_description(requisition, designation, department):
    """Link and hydrate the matched JD, exactly as the Job Requisition form does.

    ``create_job_requisition`` fills ``description`` from the JD but never sets
    ``custom_job_description_template`` — only the desk form's ``try_autofetch_jd``
    does, and a requisition raised through the API therefore carries the JD's
    content with no record of where it came from. Setting the link here matches
    what a human raising the same requisition would end up with.
    """
    from recruitment.api.job_description import find_matching_job_description

    payload = find_matching_job_description(designation, department)
    if not payload or not payload.get("name"):
        _log("no Job Description matched — description left as raised")
        return None

    doc = frappe.get_doc(JOB_REQUISITION, requisition)
    if doc.meta.has_field("custom_job_description_template"):
        doc.custom_job_description_template = payload["name"]
    if payload.get("description"):
        doc.description = payload["description"]
    if payload.get("skills") and doc.meta.has_field("custom_skills"):
        doc.set("custom_skills", [])
        for skill in payload["skills"]:
            doc.append("custom_skills", {"skill": skill})
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)

    _log(f"job description '{payload['name']}' auto-populated "
         f"({len(payload.get('description') or '')} chars, "
         f"{len(payload.get('skills') or [])} skill(s))")
    return payload["name"]


# --------------------------------------------------------------------------- #
# The requisition
# --------------------------------------------------------------------------- #

def _employment_type():
    existing = frappe.db.get_value("Employment Type", {"employee_type_name": FREELANCER_TYPE}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({"doctype": "Employment Type", "employee_type_name": FREELANCER_TYPE})
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    return doc.name


def _create_requisition(pairs):
    """One Freelancer requisition, raised the way the form raises it.

    Goes through ``create_job_requisition`` rather than ``new_doc`` so the whole
    server path runs — validation, location grouping, and ``_ensure_description``,
    which is what pulls the matched Job Description's content in. Building the
    document by hand skips all three, and the JD never arrives.

    Built under the *managers'* company, not simply the first company on the site.
    The approval hangs off those employees, and a requisition raised in one company
    whose approvers all sit in another is a shape no real site has — it also puts
    the requisition's own company at odds with every name on its approval trail.
    """
    existing = frappe.db.get_value(
        JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
    )
    if existing:
        _log(f"requisition {existing} already exists — reusing")
        return existing

    company = pairs[0]["company"]
    designation, department, jd_name = _jd_covered_context(company)
    _log(f"JD-covered context: designation {designation}, department {department} "
         f"-> '{jd_name}'")

    branch = _first("Branch")
    payload = {
        "requested_by": pairs[0]["manager"],
        "company": company,
        "department": department,
        "designation": designation,
        "no_of_positions": len(pairs),
        "posting_date": today(),
        "expected_by": add_days(today(), 45),
        "reason_for_requesting": f"{MARKER} Freelance hiring — approval matrix walkthrough.",
        "custom_type_of_position": "New",
        "custom_employment_type_link": _employment_type(),
        # Without this the Job Opening raised from this requisition is refused —
        # require_recruiter_on_new_opening will not let an opening belong to
        # nobody. Set at raise time, as HR does on the form.
        "custom_assign_to_recruiter": pairs[0]["manager_user"],
        # Marked Required by this site's Job Requisition form config, so
        # create_job_requisition rejects the payload without them
        # (_enforce_config_mandatory). Values are indicative, not the point of
        # the run.
        "custom_functional_area": _first("Functional Area"),
        "custom_salary_range_currency": _first("Currency", {"name": "INR"}) or _first("Currency"),
        "custom_salary_range_min": "600000",
        "custom_salary_range_max": "900000",
        "custom_salary_timeframe": "Annual",
        # All rows share one location, so the location grouping in
        # create_job_requisition produces a single requisition rather than one
        # per manager.
        "custom_position_details": [
            {
                "location": branch,
                "reporting_manager": pair["manager"],
                "vacancy_type": "New",
                "approval_status": "Pending",
            }
            for pair in pairs
        ],
    }

    from recruitment.api.job_requisition import create_job_requisition

    result = create_job_requisition(payload)
    data = (result or {}).get("data") or {}
    created = data.get("requisitions") or []
    if not created:
        frappe.throw(f"create_job_requisition returned no requisition: {result}")
    requisition = created[0]["name"]

    # The endpoint fills `description` from the JD but does not record which JD it
    # came from; the form does both. Stamp the link so the requisition says where
    # its description came from.
    _apply_job_description(requisition, designation, department)

    # `description` is what cleanup() and the reuse check above find this record
    # by, and the JD has just overwritten it. Carry the marker in a field the JD
    # does not own.
    frappe.db.set_value(
        JOB_REQUISITION, requisition, "reason_for_requesting",
        f"{MARKER} Freelance hiring — approval matrix walkthrough.",
    )

    _log(f"requisition {requisition} raised — company {company}, {len(pairs)} positions")
    for i, pair in enumerate(pairs, 1):
        _log(f"  position {i}: manager {pair['manager_name']} ({pair['manager_user']}) "
             f"-> HRBP {pair['hrbp_name']} ({pair['hrbp_user']})")
    return requisition


# --------------------------------------------------------------------------- #
# Driving the approval
# --------------------------------------------------------------------------- #

def _tracker(requisition):
    rows = frappe.get_all(
        "Approval Tracker",
        filters={"doc_type": JOB_REQUISITION, "doc_name": requisition},
        fields=["name", "status", "current_approval_step", "approval_matrix"],
        order_by="creation desc",
    )
    return rows[0] if rows else None


def _wait_for_tracker(requisition, timeout=60):
    """Poll until the Approval Tracker exists.

    Flow Config starts the approval from a background job, not inline in the
    ``after_insert`` hook — so immediately after insert there is nothing to read,
    and a single lookup reports "no approval configured" for a requisition whose
    approval is merely a second away. Committing between polls is what lets this
    connection see the worker's write.
    """
    import time

    deadline = time.monotonic() + timeout
    while True:
        frappe.db.commit()
        tracker = _tracker(requisition)
        if tracker:
            return tracker
        if time.monotonic() >= deadline:
            return None
        time.sleep(2)


def _open_todos(requisition):
    """Every open approver ToDo for this requisition, with who must act on it.

    Read through Approval Log Entry rather than ToDo alone: the log is what ties a
    ToDo to its tracker, its stage and (for a row stage) the child row, and it is
    what ``process_approval_action`` looks up. A ToDo with no log is not an
    approval task.
    """
    tracker = _tracker(requisition)
    if not tracker:
        return []

    # The approver lives on the log, not on the ToDo: these tasks are created with
    # ``allocated_to`` empty and the resolved person in ``user`` /
    # ``custom_allocated_to_users``. Reading ToDo.allocated_to finds nobody and
    # makes a perfectly assigned task look unassigned.
    logs = frappe.db.sql(
        """
        SELECT name, todo_reference, status, user, custom_allocated_to_users,
               stage_name, row_label, row_idx, is_row_log
        FROM `tabApproval Log Entry`
        WHERE parent = %s AND parenttype = 'Approval Tracker'
        ORDER BY idx
        """,
        tracker["name"],
        as_dict=True,
    )

    out = []
    for log in logs:
        if (log.get("status") or "") != "Pending":
            continue
        todo_name = log.get("todo_reference")
        if not todo_name or not frappe.db.exists("ToDo", todo_name):
            continue
        if frappe.db.get_value("ToDo", todo_name, "status") != "Open":
            continue
        approver = (log.get("user") or "").strip() or (
            (log.get("custom_allocated_to_users") or "").split(",")[0].strip()
        )
        out.append({
            "name": todo_name,
            "log": log["name"],
            "approver": approver or None,
            "stage": log.get("stage_name"),
            "row": log.get("row_label") or "-",
        })
    return out


def _approve_open_todos(requisition, max_rounds=8):
    """Approve every open task, as its own approver, until none remain.

    A loop rather than a fixed two passes: a row stage opens one task per position,
    and closing the last one advances the tracker and opens the next stage's tasks
    in the same request. How many rounds that takes is a property of the matrix, so
    it is discovered rather than assumed. ``max_rounds`` is only a runaway guard.
    """
    original_user = frappe.session.user
    approved = []
    try:
        for round_no in range(1, max_rounds + 1):
            todos = _open_todos(requisition)
            if not todos:
                break
            _log(f"round {round_no}: {len(todos)} open task(s)")
            for todo in todos:
                approver = todo["approver"]
                if not approver:
                    _log(f"  {todo['row']}: no approver resolved — skipping ({todo['stage']})")
                    continue
                frappe.set_user(approver)
                try:
                    from nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions import (
                        action_api_handler,
                    )
                    action_api_handler([todo["name"]], "Approve")
                    frappe.db.commit()
                    approved.append((todo["name"], approver))
                    _log(f"  approved {todo['row']} as {approver}  [{todo['stage']}]")
                except Exception as exc:
                    frappe.db.rollback()
                    _log(f"  FAILED {todo['name']} as {approver}: "
                         f"{type(exc).__name__}: {frappe.utils.strip_html(str(exc))[:160]}")
                    return approved, exc
                finally:
                    frappe.set_user(original_user)
    finally:
        frappe.set_user(original_user)
    return approved, None


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #

def run():
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None

    prev_allow_edit = frappe.db.get_single_value(
        SETTINGS, "allow_editing_requisition_after_approval"
    )
    _set_single("allow_editing_requisition_after_approval", 1)

    try:
        print(f"\nmatrix: {MATRIX}")
        pairs = _approver_pairs()
        requisition = _create_requisition(pairs)
        frappe.db.commit()

        tracker = _wait_for_tracker(requisition)
        if not tracker:
            _log("no Approval Tracker appeared — is a background worker running? "
                 "Flow Config Raise_Requisition_workflow_PW starts it after insert.")
            return requisition
        _log(f"tracker {tracker['name']} (matrix {tracker['approval_matrix']})")

        approved, error = _approve_open_todos(requisition)
        print()
        _log(f"{len(approved)} task(s) approved")
        if error:
            _log("approval stopped early — see the failure above")
    finally:
        _set_single("allow_editing_requisition_after_approval", prev_allow_edit)
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report()
    return requisition


def report():
    requisition = frappe.db.get_value(
        JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
    )
    print("\n" + "=" * 74)
    print("FREELANCER REQUISITION — APPROVAL MATRIX WALKTHROUGH")
    print("=" * 74)
    if not requisition:
        print("\nnot created yet\n")
        return

    doc = frappe.get_doc(JOB_REQUISITION, requisition)
    print(f"\nrequisition : {doc.name}")
    print(f"company     : {doc.company}")
    print(f"raised by   : {doc.requested_by} ({frappe.db.get_value('Employee', doc.requested_by, 'employee_name')})")
    print(f"status      : {doc.status}")
    print(f"designation : {doc.designation}   department: {doc.department}")
    print(f"job desc.   : {doc.get('custom_job_description_template') or '(none)'}"
          f"   description: {len(doc.get('description') or '')} chars"
          f"   skills: {len(doc.get('custom_skills') or [])}")

    print(f"\npositions ({POSITION_CHILD}):")
    for row in doc.get(POSITION_CHILD) or []:
        mgr = frappe.db.get_value("Employee", row.reporting_manager, "employee_name")
        print(f"  {row.idx}. manager={row.reporting_manager} ({mgr})  "
              f"approval_status={row.approval_status!r}  by={row.approved_by or '-'}")

    summary = doc.get("custom_position_summary") or []
    print(f"\nmaterialised position rows: {len(summary)}")
    for row in summary:
        print(f"  {row.idx}. status={row.status!r} location={row.location}")

    tracker = _tracker(requisition)
    print(f"\ntracker     : {tracker}")
    if tracker:
        t = frappe.get_doc("Approval Tracker", tracker["name"])
        for i, stage in enumerate(t.approval_stages or [], 1):
            print(f"  stage {i}: {stage.get('approval_name')!r} "
                  f"update {stage.get('update_field')!r} -> {stage.get('update_value')!r}")
        print("  logs:")
        for log in t.get("approval_logs") or []:
            print(f"    stage_idx={log.get('approval_stage_index')} status={log.get('status')!r} "
                  f"approver={log.get('approver') or log.get('user_id') or '-'} "
                  f"row={log.get('row_docname') or '-'}")

    print(f"\nopen tasks  : {len(_open_todos(requisition))}")
    print()


def cleanup():
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        requisition = frappe.db.get_value(
            JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
        )
        if not requisition:
            print("nothing to remove")
            return

        tracker = _tracker(requisition)
        if tracker:
            for log in frappe.get_all(
                "Approval Log Entry", filters={"parent": tracker["name"]},
                fields=["todo_reference"], parent_doctype="Approval Tracker",
            ):
                todo = log.get("todo_reference")
                if todo and frappe.db.exists("ToDo", todo):
                    frappe.delete_doc("ToDo", todo, force=True, ignore_permissions=True)
            frappe.delete_doc("Approval Tracker", tracker["name"], force=True, ignore_permissions=True)
            print(f"  tracker {tracker['name']} removed")

        frappe.delete_doc(JOB_REQUISITION, requisition, force=True, ignore_permissions=True,
                          delete_permanently=True)
        print(f"  requisition {requisition} removed")
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()


# --------------------------------------------------------------------------- #
# Hiring workflow — the attribute rule and the strategy template
# --------------------------------------------------------------------------- #
# Which interview rounds a Job Opening starts with is decided the same way the
# offer letter is: a Dynamic User Assignment of purpose *Attributes* names the
# field values an opening must have, a TA Interview Strategy Template lists that
# assignment in `applicable_to`, and the opening is matched against it.
#
# The assignment below pins THREE fields on Job Opening — designation, department
# and employment_type. That is deliberate: specificity is the tie-break when
# several templates admit the same opening, so a three-field rule outranks the
# seeder's one-field "TA Seed Strategy - Freelancer" and this opening gets the
# freelance-animation workflow rather than the generic freelancer one.

ASSIGNMENT_NAME = "Freelance Animation Openings"
STRATEGY_NAME = "Freelance Animation Hiring Workflow"
OPENING_DOCTYPE = "Job Opening"
OFFER_DOCTYPE = "Job Offer"

STRATEGY_ROUNDS = [
    ("Showreel Screening", "Screening"),
    ("Animation Craft Round", "Interview"),
    ("Studio Fit Round", "Interview"),
    ("Commercials & Availability", "Interview"),
]


def _attribute_assignment(designation, department, employment_type):
    """The Attributes assignment the strategy template hangs off.

    Purpose *Attributes*, never *People*: an assignment that resolves to employees
    answers "who", and the resolver skips it because it says nothing about which
    openings a template covers — worse, since assignments OR, admitting one would
    cancel every attribute rule beside it.
    """
    if frappe.db.exists("Dynamic User Assignment", ASSIGNMENT_NAME):
        return ASSIGNMENT_NAME

    doc = frappe.new_doc("Dynamic User Assignment")
    doc.assignment_name = ASSIGNMENT_NAME
    doc.assignment_code = ASSIGNMENT_NAME
    doc.assignment_purpose = "Attributes"
    doc.target_type = "Employee"
    doc.description = (
        f"{MARKER} Job Openings for freelance animation roles — the condition the "
        "hiring workflow template is matched on."
    )
    doc.attribute_match = "All fields must match (AND)"
    # The seed picks its masters independently, so a hierarchy check could reject
    # a Department that is not under the chosen Company on this site's tree.
    doc.validate_attribute_hierarchy = 0
    doc.append("applicable_for_process", {"document_type": OPENING_DOCTYPE})
    for field, value in (
        ("designation", designation),
        ("department", department),
        ("employment_type", employment_type),
    ):
        doc.append("assignment_attributes", {
            "scope_doctype": OPENING_DOCTYPE,
            "scope_field": field,
            "attribute_value": value,
        })
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    _log(f"assignment '{ASSIGNMENT_NAME}' -> Job Opening "
         f"designation={designation}, department={department}, employment_type={employment_type}")
    return doc.name


def _strategy_template(assignment):
    if frappe.db.exists("TA Interview Strategy Template", STRATEGY_NAME):
        return STRATEGY_NAME

    doc = frappe.new_doc("TA Interview Strategy Template")
    doc.template_name = STRATEGY_NAME
    # Never the default: the default is the fallback used when nothing matches,
    # and claiming it would mask whatever this site already relies on.
    doc.is_default = 0
    doc.append("applicable_to", {"dynamic_user_assignment": assignment})
    for round_name, kind in STRATEGY_ROUNDS:
        is_interview = kind == "Interview"
        doc.append("interview_rounds", {
            "round_name": round_name,
            "step_type": kind,
            "is_mandatory": 1 if is_interview else 0,
            "allow_skipping": "No" if is_interview else "Yes",
            "enable_panel_interview": "No",
        })
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    _log(f"strategy template '{STRATEGY_NAME}' ({len(STRATEGY_ROUNDS)} rounds)")
    return doc.name


# --------------------------------------------------------------------------- #
# The Job Opening
# --------------------------------------------------------------------------- #

def _posting_channels():
    """One row per channel the opening can be posted to.

    External Recruiter / Group rows carry a real reference or are dropped — a
    posting row pointing at nothing is worse than one channel fewer.
    """
    recruiter = _first("TA External Recruiter")
    group = _first("TA External Recruiter Group")

    rows = []
    for channel in ("Careers Page", "Refer", "IJP", "Campus",
                    "External Recruiter", "External Recruiter Group"):
        if channel == "External Recruiter" and not recruiter:
            continue
        if channel == "External Recruiter Group" and not group:
            continue
        row = {
            "post_to": channel,
            "status": "Active",
            "display_from": today(),
            "display_to": add_days(today(), 60),
        }
        if channel == "External Recruiter":
            row["external_recruiter"] = recruiter
        if channel == "External Recruiter Group":
            row["external_recruiter_group"] = group
        rows.append(row)
    return rows


def _fill_hiring_stages(opening):
    """Prefill the stages from whichever strategy template the attributes match.

    Routed through the real resolver — the same call the Job Opening form makes —
    rather than copying :data:`STRATEGY_ROUNDS` in directly. Copying them would
    prove nothing about the matching; a mismatch between what lands here and what
    the template lists is a real finding, and :func:`report_opening` checks it.
    """
    from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
        get_hiring_stages_for_job_opening,
    )

    result = get_hiring_stages_for_job_opening(job_opening=opening) or {}
    stages = result.get("stages") or []
    if not stages:
        _log(f"no stages resolved: {result}")
        return result

    doc = frappe.get_doc(OPENING_DOCTYPE, opening)
    doc.set("custom_hiring_stages", [])
    for idx, stage in enumerate(stages, start=1):
        doc.append("custom_hiring_stages", dict(stage, idx=idx))
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)
    _log(f"stages from '{result.get('template_name')}': "
         + ", ".join(s["stage_name"] for s in stages))
    return result


def _create_opening(requisition):
    """The Job Opening for the approved requisition, posted to every channel.

    Carries the requisition's own designation / department / employment type,
    because those are exactly the fields the hiring-workflow assignment matches on
    — an opening that drifts from its requisition would resolve to a different
    workflow than the one raised for it.
    """
    existing = frappe.db.get_value(OPENING_DOCTYPE, {"job_requisition": requisition}, "name")
    if existing:
        _log(f"opening {existing} already exists — reusing")
        return existing

    req = frappe.get_doc(JOB_REQUISITION, requisition)
    designation_name = frappe.db.get_value("Designation", req.designation, "designation_name")

    doc = frappe.new_doc(OPENING_DOCTYPE)
    doc.job_title = f"{designation_name or req.designation} (Freelance)"
    doc.company = req.company
    doc.designation = req.designation
    doc.department = req.department
    doc.status = "Open"
    doc.employment_type = req.get("custom_employment_type_link")
    doc.job_requisition = requisition
    doc.vacancies = req.no_of_positions
    doc.planned_vacancies = req.no_of_positions
    doc.custom_hiring_type = "Lateral"
    doc.custom_functional_area = req.get("custom_functional_area")
    # The Job Description the requisition resolved, carried onto the posting —
    # this is the text a candidate actually reads.
    doc.description = req.get("description")
    if doc.meta.has_field("custom_recruiter"):
        doc.custom_recruiter = req.get("custom_assign_to_recruiter") or frappe.session.user

    for row in _posting_channels():
        doc.append("custom_posting_options", row)

    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    _log(f"opening {doc.name} created — {len(doc.get('custom_posting_options') or [])} posting channel(s)")
    return doc.name


def _activate(requisition, opening):
    """Approved Draft -> Approved Active, through the real endpoint.

    Uses the app's own action so the requisition/position status matrix is
    exercised rather than bypassed: this is what moves each tracked position from
    Draft to Open and makes them linkable to a candidate when an offer is raised.
    """
    from recruitment.api.job_requisition import activate_job_requisition

    status = frappe.db.get_value(JOB_REQUISITION, requisition, "status")
    if status == "Approved Active":
        _log("requisition already Approved Active")
        return
    activate_job_requisition(requisition, opening)
    _log(f"requisition activated -> {frappe.db.get_value(JOB_REQUISITION, requisition, 'status')}")


def create_opening():
    """Step 2: hiring workflow rule + strategy template + Job Opening + postings.

    Separate entry point from :func:`run` so the two halves of the flow can be
    reviewed one at a time, which is how they are being walked through. Idempotent
    — every piece is reused if it already exists.
    """
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    prev_allow_edit = frappe.db.get_single_value(
        "Recruitment Settings", "allow_editing_requisition_after_approval"
    )
    _set_single("allow_editing_requisition_after_approval", 1)

    try:
        requisition = frappe.db.get_value(
            JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
        )
        if not requisition:
            frappe.throw("Run recruitment.freelance_requisition_approval.run first.")

        req = frappe.get_doc(JOB_REQUISITION, requisition)
        if req.status not in ("Approved Draft", "Approved Active"):
            frappe.throw(
                f"{requisition} is {req.status}. Finish the approval before raising the opening."
            )

        print(f"\nrequisition {requisition} ({req.status})")

        assignment = _attribute_assignment(
            req.designation, req.department, req.get("custom_employment_type_link")
        )
        _strategy_template(assignment)

        opening = _create_opening(requisition)
        _activate(requisition, opening)
        _fill_hiring_stages(opening)
        frappe.db.commit()
    finally:
        _set_single("allow_editing_requisition_after_approval", prev_allow_edit)
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_opening()
    return opening


def report_opening():
    """What the opening resolved to, and whether it matches the template."""
    requisition = frappe.db.get_value(
        JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
    )
    opening = frappe.db.get_value(OPENING_DOCTYPE, {"job_requisition": requisition}, "name") if requisition else None

    print("\n" + "=" * 74)
    print("JOB OPENING — POSTINGS + HIRING WORKFLOW")
    print("=" * 74)
    if not opening:
        print("\nnot created yet\n")
        return

    doc = frappe.get_doc(OPENING_DOCTYPE, opening)
    print(f"\nopening      : {doc.name}  '{doc.job_title}'")
    print(f"requisition  : {doc.job_requisition} "
          f"({frappe.db.get_value(JOB_REQUISITION, doc.job_requisition, 'status')})")
    print(f"status       : {doc.status}   vacancies: {doc.vacancies}")
    print(f"matched on   : designation={doc.designation} department={doc.department} "
          f"employment_type={doc.employment_type}")
    print(f"description  : {len(doc.get('description') or '')} chars (from the requisition's JD)")

    print(f"\nposting channels ({len(doc.get('custom_posting_options') or [])}):")
    for row in doc.get("custom_posting_options") or []:
        target = row.get("external_recruiter") or row.get("external_recruiter_group") or ""
        print(f"  {row.post_to:<26} {row.status:<8} {row.display_from} -> {row.display_to}  {target}")

    from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
        get_hiring_stages_for_job_opening,
    )
    resolved = get_hiring_stages_for_job_opening(job_opening=opening) or {}
    expected = [name for name, _k in STRATEGY_ROUNDS]
    got = [s["stage_name"] for s in (resolved.get("stages") or [])]
    on_doc = [s.stage_name for s in (doc.get("custom_hiring_stages") or [])]
    verdict = "OK" if got == expected else ("MISMATCH" if got else "none")

    print(f"\nhiring workflow template : {resolved.get('template_name') or '-'}  [{verdict}]"
          + ("   <- fallback default, not an attribute match" if resolved.get("is_default") else ""))
    print(f"  expected rounds : {', '.join(expected)}")
    print(f"  resolved rounds : {', '.join(got) or '-'}")
    print(f"  stages on doc   : {', '.join(on_doc) or '-'}")

    print(f"\nposition rows on the requisition:")
    for row in frappe.get_all(
        "Job Requisition Position",
        filters={"parent": doc.job_requisition, "parenttype": JOB_REQUISITION},
        fields=["idx", "status", "location"], order_by="idx",
    ):
        print(f"  {row['idx']}. status={row['status']!r} location={row['location']}")
    print()


# --------------------------------------------------------------------------- #
# Job Applicants — one per posting channel
# --------------------------------------------------------------------------- #
# A posting channel is only real if a candidate can arrive through it, so each
# channel on the opening gets exactly one applicant carrying the fields that
# channel actually fills in: a referral names the referring employee, an IJP
# application names the internal employee applying, and so on. The channels are
# read off the opening rather than restated here — the two cannot drift.

APPLICANT_DOMAIN = "@freelance-flow.test"

# post_to -> (Job Applicant Source, first, last, what that channel stamps)
CHANNEL_CANDIDATES = {
    "Careers Page":             ("Careers Page",      "Ira",     "Bhatnagar", None),
    "Refer":                    ("Employee Referral", "Nikhil",  "Rane",      "referral"),
    "IJP":                      ("IJP",               "Sanya",   "Kulkarni",  "internal"),
    "Campus":                   ("Campus Hiring",     "Dev",     "Menon",     None),
    "External Recruiter":       ("External Recruiter","Tara",    "Sethi",     None),
    "External Recruiter Group": ("External Recruiter","Imran",   "Qureshi",   None),
}


def _ensure_source(source):
    if not frappe.db.exists("Job Applicant Source", source):
        frappe.get_doc({"doctype": "Job Applicant Source", "source_name": source}).insert(
            ignore_permissions=True
        )
        _log(f"job applicant source '{source}' created")
    return source


def _create_applicants(opening):
    """One Job Applicant per posting channel on ``opening``.

    Inserted as ordinary documents so every hook runs — in particular the
    ``after_insert`` seeding that places a new applicant on the opening's first
    hiring stage. Writing the stage here instead would prove nothing about the
    workflow actually reaching candidates.
    """
    op = frappe.get_doc(OPENING_DOCTYPE, opening)
    channels = [row.post_to for row in (op.get("custom_posting_options") or [])]
    if not channels:
        frappe.throw(f"{opening} has no posting channels.")

    # Someone to hang the referral / IJP links off. Any Active employee with a
    # record will do; these fields are about which channel the candidate came
    # through, not about who the person is.
    internal = _first("Employee", {"status": "Active", "company": op.company}) or _first(
        "Employee", {"status": "Active"}
    )

    created = []
    for channel in channels:
        spec = CHANNEL_CANDIDATES.get(channel)
        if not spec:
            _log(f"no candidate defined for channel {channel} — skipped")
            continue
        source, first, last, stamps = spec
        slug = channel.lower().replace(" ", "-")
        email = f"{first.lower()}.{last.lower()}.{slug}{APPLICANT_DOMAIN}"

        existing = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
        if existing:
            created.append(existing)
            continue

        _ensure_source(source)

        doc = frappe.new_doc("Job Applicant")
        doc.applicant_name = f"{first} {last}"
        doc.email_id = email
        doc.phone_number = f"9{abs(hash(email)) % 1000000000:09d}"
        doc.job_title = opening
        doc.designation = op.designation
        doc.status = "Open"
        doc.source = source
        if doc.meta.has_field("company_name"):
            doc.company_name = op.company
        if doc.meta.has_field("custom_employment_type"):
            doc.custom_employment_type = op.employment_type
        if doc.meta.has_field("custom_recruiter"):
            doc.custom_recruiter = op.get("custom_recruiter")

        # What each channel actually records about where the candidate came from.
        if stamps == "referral" and internal:
            if doc.meta.has_field("custom_referred_by"):
                doc.custom_referred_by = internal
            if doc.meta.has_field("source_name"):
                doc.source_name = internal
        if stamps == "internal" and internal:
            if doc.meta.has_field("custom_applied_employee"):
                doc.custom_applied_employee = internal

        doc.flags.ignore_mandatory = True
        doc.insert(ignore_permissions=True)
        created.append(doc.name)

        stage = frappe.db.get_value("Job Applicant", doc.name, "custom_current_stage")
        _log(f"{channel:<26} {doc.applicant_name:<18} source={source:<18} stage={stage or '-'}")
    return created


def _flow_opening(throw=True):
    """The Job Opening this flow built, or None."""
    requisition = frappe.db.get_value(
        JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
    )
    opening = frappe.db.get_value(
        OPENING_DOCTYPE, {"job_requisition": requisition}, "name"
    ) if requisition else None
    if not opening and throw:
        frappe.throw("Run create_opening first.")
    return opening


def create_applicants():
    """Step 3: one candidate per posting channel, seeded onto the first stage."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        opening = _flow_opening()
        print(f"\nopening {opening}")
        _create_applicants(opening)
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_applicants()
    return opening


def report_applicants():
    requisition = frappe.db.get_value(
        JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
    )
    opening = frappe.db.get_value(
        OPENING_DOCTYPE, {"job_requisition": requisition}, "name"
    ) if requisition else None

    print("\n" + "=" * 78)
    print("JOB APPLICANTS — ONE PER POSTING CHANNEL")
    print("=" * 78)
    if not opening:
        print("\nnot created yet\n")
        return

    op = frappe.get_doc(OPENING_DOCTYPE, opening)
    stages = [s.stage_name for s in (op.get("custom_hiring_stages") or [])]
    print(f"\nopening        : {opening}  '{op.job_title}'")
    print(f"hiring stages  : {' -> '.join(stages) or '-'}")

    applicants = frappe.get_all(
        "Job Applicant",
        filters={"job_title": opening},
        fields=["name", "applicant_name", "source", "status", "custom_current_stage",
                "custom_referred_by", "custom_applied_employee"],
        order_by="creation asc",
    )
    print(f"\napplicants ({len(applicants)}):")
    first_stage = stages[0] if stages else None
    for a in applicants:
        link = a.get("custom_referred_by") or a.get("custom_applied_employee") or ""
        ok = "OK" if a["custom_current_stage"] == first_stage else "!!"
        print(f"  [{ok}] {a['applicant_name']:<18} source={a['source'] or '-':<18} "
              f"stage={a['custom_current_stage'] or '-':<22} {link}")

    print(f"\nstage history (proof the workflow reached the candidate):")
    for a in applicants[:2]:
        rows = frappe.db.sql(
            """SELECT idx, stage_name, result FROM `tabJob Applicant Stage History`
               WHERE parent = %s ORDER BY idx""", a["name"], as_dict=True)
        print(f"  {a['applicant_name']}: " +
              (", ".join(f"{r['stage_name']} ({r['result']})" for r in rows) or "-"))
    print()


# --------------------------------------------------------------------------- #
# Screening — preconditions, score, pass mark
# --------------------------------------------------------------------------- #
# Two independent gates on one opening:
#
#   Pre-screening rules  `custom_min_experience_required` / `custom_auto_reject_ctc_above`
#                        become Preconditions. Failing either rejects outright,
#                        whatever the score.
#   Screener questions   Score-based rows award points; the total must reach
#                        `custom_screener_pass_mark`.
#
# Outcome: any Precondition fails OR score < pass mark -> Rejected / "Failed
# Screening"; otherwise Shortlisted / "Screening Completed".
#
# Screening is NOT hooked to insert on this site — `on_applicant_insert` exists
# but nothing in hooks.py calls it, so it runs on demand from the Job Applicant's
# "Run Screening" button. This step calls the same whitelisted endpoint.

MIN_EXPERIENCE = 2.0
MAX_EXPECTED_CTC = 1200000.0
PASS_MARK = 30

SCREENER_QUESTIONS = [
    {
        "question": "Total years of animation experience",
        "applicant_field": "custom_total_experience",
        "answer_type": "Number", "kind": "Score-based",
        "operator": ">=", "expected_value": "5", "score": 30,
        "action": "pts", "on_missing": "Skip", "required": 0,
    },
    {
        "question": "Expected CTC within the freelance band",
        "applicant_field": "custom_expected_ctc",
        "answer_type": "Number", "kind": "Score-based",
        "operator": "<=", "expected_value": "900000", "score": 30,
        "action": "pts", "on_missing": "Skip", "required": 0,
    },
]

# Each candidate is given values that land them on a DIFFERENT outcome, so one
# run exercises every branch rather than six copies of the same pass.
#   applicant_name -> (experience, expected CTC, what should happen and why)
# Asserted on `custom_screening_result` (Passed / Failed), not on `status`: a
# candidate who passes is handed straight to the hiring workflow, which advances
# them to the next stage and leaves `status` as "Interview" rather than the
# "Shortlisted" the screening engine set a moment earlier. The screening result is
# the field that records what screening itself decided.
SCREENING_PROFILES = {
    "Ira Bhatnagar":  ("7", "850000",  "Passed", "both score rules hit -> 60"),
    "Nikhil Rane":    ("3", "800000",  "Passed", "CTC rule only -> 30, exactly the pass mark"),
    "Sanya Kulkarni": ("1", "700000",  "Failed", "below the 2-year minimum -> Precondition fails"),
    "Dev Menon":      ("6", "1500000", "Failed", "expected CTC over the auto-reject ceiling"),
    "Tara Sethi":     ("4", "1000000", "Failed", "preconditions pass but score 0 < pass mark 30"),
    "Imran Qureshi":  ("8", "600000",  "Passed", "both score rules hit -> 60"),
}


def _configure_screening(opening):
    """Put the pre-screening rules and screener questions on the opening."""
    doc = frappe.get_doc(OPENING_DOCTYPE, opening)
    doc.custom_min_experience_required = MIN_EXPERIENCE
    doc.custom_auto_reject_ctc_above = MAX_EXPECTED_CTC
    doc.custom_screener_pass_mark = PASS_MARK
    doc.set("custom_screener_questions", [])
    for q in SCREENER_QUESTIONS:
        doc.append("custom_screener_questions", dict(q))
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)

    from recruitment.recruitment.screening_engine import screening_enabled

    _log(f"screening configured: min experience {MIN_EXPERIENCE}y, "
         f"auto-reject CTC > {MAX_EXPECTED_CTC:,.0f}, pass mark {PASS_MARK}, "
         f"{len(SCREENER_QUESTIONS)} scored question(s)")
    _log(f"screening_enabled({opening}) = {screening_enabled(opening)}")
    return doc.name


def _apply_screening_profiles(opening):
    """Give each candidate the values their intended outcome needs."""
    for applicant in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name"], order_by="creation asc",
    ):
        profile = SCREENING_PROFILES.get(applicant["applicant_name"])
        if not profile:
            continue
        experience, ctc, _expected, _why = profile
        frappe.db.set_value("Job Applicant", applicant["name"], {
            "custom_total_experience": experience,
            "custom_expected_ctc": ctc,
            # Screening refuses to re-run a candidate already past a decision
            # point, so anyone re-tested has to be back at Open first.
            "status": "Open",
            "custom_substatus": None,
        }, update_modified=False)
    frappe.db.commit()


def run_screening_test():
    """Step 4: configure screening, then screen every candidate on the opening."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        opening = _flow_opening()
        print(f"\nopening {opening}")
        _configure_screening(opening)
        _apply_screening_profiles(opening)

        from recruitment.recruitment.screening_engine import run_for_applicant

        for applicant in frappe.get_all(
            "Job Applicant", filters={"job_title": opening},
            fields=["name", "applicant_name"], order_by="creation asc",
        ):
            # run_for_applicant is what the queued job calls; running it inline
            # keeps the outcome in this transaction instead of waiting on a worker.
            run_for_applicant(applicant["name"])
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_screening()


def report_screening():
    opening = _flow_opening(throw=False)
    print("\n" + "=" * 88)
    print("SCREENING — PRECONDITIONS + SCORE vs PASS MARK")
    print("=" * 88)
    if not opening:
        print("\nnot created yet\n")
        return

    op = frappe.get_doc(OPENING_DOCTYPE, opening)
    print(f"\nopening   : {opening}")
    print(f"rules     : experience >= {op.custom_min_experience_required}y (Precondition), "
          f"expected CTC <= {op.custom_auto_reject_ctc_above:,.0f} (Precondition)")
    print(f"questions : " + "; ".join(
        f"{q.question} {q.operator} {q.expected_value} -> {q.score}pts"
        for q in op.get("custom_screener_questions") or []))
    print(f"pass mark : {op.custom_screener_pass_mark}\n")

    hdr = (f"  {'candidate':<17}{'exp':>4}{'expected CTC':>14}  {'score':>7}  "
           f"{'screening':<9}{'status':<11}{'stage now':<24}")
    print(hdr)
    print("  " + "-" * (len(hdr) - 2))
    ok = True
    for a in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name", "status", "custom_substatus",
                "custom_screening_result", "custom_current_stage",
                "custom_screening_score", "custom_screening_max_score",
                "custom_total_experience", "custom_expected_ctc"],
        order_by="creation asc",
    ):
        profile = SCREENING_PROFILES.get(a["applicant_name"])
        expected = profile[2] if profile else None
        match = "" if expected is None else (
            "  OK" if a["custom_screening_result"] == expected else "  MISMATCH")
        if match == "  MISMATCH":
            ok = False
        print(f"  {a['applicant_name']:<17}{a['custom_total_experience'] or '-':>4}"
              f"{float(a['custom_expected_ctc'] or 0):>14,.0f}"
              f"  {str(a['custom_screening_score'] or 0) + '/' + str(a['custom_screening_max_score'] or 0):>7}"
              f"  {a['custom_screening_result'] or '-':<9}{a['status']:<11}"
              f"{a['custom_current_stage'] or '-':<24}{match}")
        if profile:
            print(f"  {'':<17}{profile[3]}")

    print("\n  passing screening hands the candidate to the hiring workflow, which")
    print("  advances them a stage (result 'Auto (Screened)'); a fail stays put as")
    print("  'Auto (Rejected)'. Stage history:")
    for a in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name"], order_by="creation asc",
    ):
        rows = frappe.db.sql(
            """SELECT stage_name, result FROM `tabJob Applicant Stage History`
               WHERE parent = %s ORDER BY idx""", a["name"], as_dict=True)
        print(f"    {a['applicant_name']:<17}" +
              " -> ".join(f"{r['stage_name']} ({r['result']})" for r in rows))

    print(f"\n  every outcome as expected: {ok}")

    # One candidate's full log — the per-check record the engine leaves behind.
    sample = frappe.db.get_value(
        "Job Applicant", {"job_title": opening, "applicant_name": "Tara Sethi"}, "name")
    if sample:
        print(f"\n  screening log for Tara Sethi (preconditions pass, score short):")
        for r in frappe.db.sql(
            """SELECT source, question, operator, expected_value, actual_value, passed, points_awarded
               FROM `tabJob Applicant Screening Result` WHERE parent = %s ORDER BY idx""",
            sample, as_dict=True,
        ):
            print(f"    [{'PASS' if r['passed'] else 'FAIL'}] {r['source']:<20} "
                  f"{(r['question'] or '')[:44]:<46} {r['actual_value']} {r['operator']} "
                  f"{r['expected_value']}  +{r['points_awarded']}")
    print()


# --------------------------------------------------------------------------- #
# Campus eligibility rules
# --------------------------------------------------------------------------- #
# A separate gate from screening, and a campus-only one: an opening posted to the
# Campus channel is seeded from Campus Eligibility Settings on its first save
# (`apply_default_eligibility_rules`, a Job Opening validate hook), and each rule
# is read as a TRIGGER — "when <field> <operator> <value> -> <action>":
#
#   a matching Knock out rule -> Rejected, sub-status "Eligibility Not Met"
#   a matching Flag rule      -> Hold,     sub-status "Eligibility Flagged"
#   nothing matches           -> Shortlisted
#
# Note the reading: "Driving licence = No -> Flag" holds the candidates who
# answered No and leaves everyone else alone. A rule naming a child row
# (`table::field`) can only fire on a row the candidate actually has, so a
# candidate with no education rows is never knocked out by a qualification rule.
#
# The candidates below come through the Campus channel and are given exactly the
# data each outcome needs.
#   name -> (qualification rows, driving licence, expected status, why)
ELIGIBILITY_CANDIDATES = {
    "Priya Deshmukh": (["10th"], "Yes", "Rejected",
                       "10th matches a Knock out rule"),
    "Farhan Ali":     (["Graduation"], "No", "Hold",
                       "graduate, but 'licence = No' matches the Flag rule"),
    "Anjali Rao":     (["Graduation", "Post Graduation"], "Yes", "Shortlisted",
                       "no rule fires"),
}


def _campus_applicant(opening, name, qualifications, licence):
    """A campus candidate carrying the fields the eligibility rules read."""
    first, last = name.split(" ", 1)
    email = f"{first.lower()}.{last.lower()}.campus{APPLICANT_DOMAIN}"
    existing = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
    if existing:
        return existing

    op = frappe.get_doc(OPENING_DOCTYPE, opening)
    _ensure_source("Campus Hiring")

    doc = frappe.new_doc("Job Applicant")
    doc.applicant_name = name
    doc.email_id = email
    doc.phone_number = f"9{abs(hash(email)) % 1000000000:09d}"
    doc.job_title = opening
    doc.designation = op.designation
    doc.status = "Open"
    doc.source = "Campus Hiring"
    if doc.meta.has_field("company_name"):
        doc.company_name = op.company
    if doc.meta.has_field("do_you_have_a_driving_license"):
        doc.do_you_have_a_driving_license = licence
    for qualification in qualifications:
        doc.append("custom_educational_qualification", {
            "qualification": qualification,
            "school_univ": "Seeded for the eligibility walkthrough",
        })
    # Screening would decide these candidates before eligibility ever ran, and
    # this step is about the eligibility gate on its own.
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    return doc.name


def run_eligibility_test():
    """Step 5: campus eligibility rules — knock out, flag, and pass."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        opening = _flow_opening()
        op = frappe.get_doc(OPENING_DOCTYPE, opening)
        rules = op.get("custom_eligibility_rules") or []
        if not rules:
            frappe.throw(
                f"{opening} has no eligibility rules. They are seeded from Campus "
                "Eligibility Settings on the first save of a Campus-posted opening."
            )

        print(f"\nopening {opening} — {len(rules)} eligibility rule(s)")
        from recruitment.recruitment.eligibility_engine import evaluate_eligibility

        for name, (qualifications, licence, _expected, _why) in ELIGIBILITY_CANDIDATES.items():
            applicant = _campus_applicant(opening, name, qualifications, licence)
            # The same call the campus application path makes on submit.
            evaluate_eligibility(applicant)
            frappe.db.commit()
            _log(f"{name:<17} evaluated")
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_eligibility()


def report_eligibility():
    opening = _flow_opening(throw=False)
    print("\n" + "=" * 88)
    print("CAMPUS ELIGIBILITY — KNOCK OUT / FLAG / PASS")
    print("=" * 88)
    if not opening:
        print("\nnot created yet\n")
        return

    op = frappe.get_doc(OPENING_DOCTYPE, opening)
    campus = [r.post_to for r in (op.get("custom_posting_options") or [])
              if r.post_to == "Campus" and (r.status or "Active") != "Inactive"]
    print(f"\nopening        : {opening}")
    print(f"campus channel : {'posted' if campus else 'NOT posted — rules would not apply'}")
    print(f"defaults seeded: {'yes' if op.get('custom_eligibility_defaults_applied') else 'no'} "
          f"(from Campus Eligibility Settings, on first save)")
    print(f"\nrules ({len(op.get('custom_eligibility_rules') or [])}) — read as "
          f"'when <field> <op> <value> -> <action>':")
    for r in op.get("custom_eligibility_rules") or []:
        print(f"  when {r.field_name} {r.operator} {r.value!r}  ->  {r.action}")

    print()
    hdr = f"  {'candidate':<17}{'qualifications':<28}{'licence':<9}{'status':<13}{'sub-status':<24}"
    print(hdr)
    print("  " + "-" * (len(hdr) - 2))
    ok = True
    for name, (_q, _l, expected, why) in ELIGIBILITY_CANDIDATES.items():
        applicant = frappe.db.get_value(
            "Job Applicant", {"job_title": opening, "applicant_name": name},
            ["name", "status", "custom_substatus", "do_you_have_a_driving_license"], as_dict=True)
        if not applicant:
            print(f"  {name:<17}not created")
            ok = False
            continue
        quals = frappe.db.sql(
            """SELECT qualification FROM `tabEmployee Education`
               WHERE parent = %s ORDER BY idx""", applicant["name"])
        match = "  OK" if applicant["status"] == expected else "  MISMATCH"
        if match == "  MISMATCH":
            ok = False
        print(f"  {name:<17}{', '.join(q[0] for q in quals):<28}"
              f"{applicant['do_you_have_a_driving_license'] or '-':<9}"
              f"{applicant['status']:<13}{applicant['custom_substatus'] or '-':<24}{match}")
        print(f"  {'':<17}{why}")

    print(f"\n  every outcome as expected: {ok}")
    print("\n  the engine records its reasoning on each candidate's timeline:")
    for name in ELIGIBILITY_CANDIDATES:
        applicant = frappe.db.get_value(
            "Job Applicant", {"job_title": opening, "applicant_name": name}, "name")
        if not applicant:
            continue
        comment = frappe.db.get_value(
            "Comment",
            {"reference_doctype": "Job Applicant", "reference_name": applicant,
             "comment_type": "Comment"},
            "content", order_by="creation desc")
        print(f"    {name:<17}{frappe.utils.strip_html(comment or '-')[:96]}")
    print()


# --------------------------------------------------------------------------- #
# Interviews
# --------------------------------------------------------------------------- #
# The three candidates screening passed are sitting on "Animation Craft Round".
# Each remaining Interview stage is walked the way the form walks it:
#
#   prepare_interview   -> an Interview is scheduled for the stage
#   complete_interview  -> an Interview Feedback is filed and submitted; its
#                          on_submit auto-advance hook moves the candidate on
#
# `complete_interview` refuses to run without a scheduled Interview, on purpose —
# it used to manufacture one, which meant "Mark as Completed" filed feedback
# against an interview that never happened. So both calls are made, in order, and
# neither is short-circuited.

# Who reaches the end, and who is turned down on the way — a run where everyone
# clears proves only the happy path.
INTERVIEW_OUTCOMES = {
    "Ira Bhatnagar": ("Candidate Selected", 5, "Strong reel, sharp timing. Take forward."),
    "Imran Qureshi": ("Candidate Selected", 4, "Solid craft, good availability."),
    "Nikhil Rane":   ("Candidate Rejected", 2, "Reel does not meet the bar for this brief."),
}


def _interview_stages(opening):
    """The opening's stages that are actual interviews, in order."""
    return [
        s.stage_name
        for s in (frappe.get_doc(OPENING_DOCTYPE, opening).get("custom_hiring_stages") or [])
        if (s.stage_type or "") == "Interview"
    ]


def _schedule_interview(applicant, stage_name):
    """Create the Interview for a stage, the way the form does.

    ``prepare_interview`` only *returns* the values to prefill a new Interview with
    — creating the document is the client's half of that call. Skipping it and
    going straight to ``complete_interview`` is refused, which is the point: a
    stage is completed against an interview that was actually scheduled.
    """
    from recruitment.api.hiring_stage import (
        get_interview_round_field,
        prepare_interview,
    )

    prefill = prepare_interview(applicant, stage_name=stage_name)
    round_field = prefill.get("interview_round_field") or get_interview_round_field()

    existing = frappe.db.get_value("Interview", {
        "job_applicant": applicant,
        round_field: prefill["interview_round"],
    }, "name")
    if existing:
        return existing

    iv = frappe.new_doc("Interview")
    iv.job_applicant = prefill["job_applicant"]
    if round_field:
        iv.set(round_field, prefill["interview_round"])
    iv.job_opening = prefill.get("job_opening")
    iv.designation = prefill.get("designation")
    iv.scheduled_on = today()
    # At least one interviewer is mandatory — the feedback's on_submit re-saves
    # the Interview and re-runs its validation. Fall back to the acting user when
    # the stage names no panel, which is what the form does.
    for interviewer in (prefill.get("interviewers") or [frappe.session.user]):
        iv.append("interview_details", {"interviewer": interviewer})
    iv.flags.ignore_mandatory = True
    iv.flags.ignore_validate = True
    iv.insert(ignore_permissions=True)
    return iv.name


def run_interviews():
    """Step 6: schedule and complete each interview stage for the screened-in candidates."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        opening = _flow_opening()
        stages = _interview_stages(opening)
        print(f"\nopening {opening}")
        print(f"  interview stages: {' -> '.join(stages)}")

        from recruitment.api.hiring_stage import complete_interview

        for name, (assessment, rating, comments) in INTERVIEW_OUTCOMES.items():
            applicant = frappe.db.get_value(
                "Job Applicant", {"job_title": opening, "applicant_name": name}, "name")
            if not applicant:
                _log(f"{name}: not found")
                continue

            print(f"\n  {name}")
            for _step in range(len(stages) + 1):
                doc = frappe.get_doc("Job Applicant", applicant)
                current = doc.get("custom_current_stage")
                if doc.status == "Rejected":
                    _log(f"    rejected at {current}")
                    break
                if current not in stages:
                    _log(f"    at {current} — not an interview stage, done")
                    break

                interview = _schedule_interview(applicant, current)
                # The last stage carries the real decision; earlier ones clear so
                # the candidate reaches it.
                last = current == stages[-1]
                this_assessment = assessment if last else "Candidate Selected"
                this_rating = rating if last else 4
                complete_interview(
                    applicant,
                    rating=this_rating,
                    comments=comments if last else "Cleared this round.",
                    assessment=this_assessment,
                    stage_name=current,
                )
                after = frappe.db.get_value(
                    "Job Applicant", applicant, ["custom_current_stage", "status"], as_dict=True)
                _log(f"    {current:<28} {interview:<12} {this_assessment:<20} -> "
                     f"{after['custom_current_stage']} ({after['status']})")
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_interviews()


def report_interviews():
    opening = _flow_opening(throw=False)
    print("\n" + "=" * 92)
    print("INTERVIEWS — SCHEDULED, FED BACK, ADVANCED")
    print("=" * 92)
    if not opening:
        print("\nnot created yet\n")
        return

    stages = _interview_stages(opening)
    print(f"\nopening          : {opening}")
    print(f"interview stages : {' -> '.join(stages)}\n")

    for a in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name", "status", "custom_substatus", "custom_current_stage"],
        order_by="creation asc",
    ):
        interviews = frappe.get_all(
            "Interview", filters={"job_applicant": a["name"]},
            fields=["name", "status", "scheduled_on"], order_by="creation asc")
        if not interviews and a["status"] == "Rejected":
            continue
        print(f"  {a['applicant_name']:<17} status={a['status']:<11} "
              f"stage={a['custom_current_stage'] or '-':<26} interviews={len(interviews)}")
        for iv in interviews:
            fb = frappe.get_all(
                "Interview Feedback", filters={"interview": iv["name"], "docstatus": 1},
                fields=["result", "average_rating", "feedback"])
            for f in fb:
                print(f"      {iv['name']:<14} {iv['status']:<10} "
                      f"rating={f['average_rating'] * 5:.0f}/5  {f['result']:<9} {f['feedback'][:44]}")
        hist = frappe.db.sql(
            """SELECT stage_name, result FROM `tabJob Applicant Stage History`
               WHERE parent = %s ORDER BY idx""", a["name"], as_dict=True)
        print(f"      history: " + " -> ".join(f"{h['stage_name']} ({h['result']})" for h in hist))
    print()


# --------------------------------------------------------------------------- #
# Offer letter — a DOCX Document Template and the assignment that admits it
# --------------------------------------------------------------------------- #
# Two halves, matching how the feature is configured:
#
#   the template   a real .docx carrying `{{ placeholder }}` tokens, rendered by
#                  docxtpl against the Job Offer and converted to PDF
#   the applicability
#                  a Dynamic User Assignment of purpose *Attributes* naming the
#                  Job Offer field values this letter covers, listed in the
#                  template's `user_assignment` table with
#                  `assignment_type = "User Assignment"`
#
# Nothing else decides which letter an offer gets: no default, no per-Employment-
# Type table. An offer no template admits has no letter, cannot be previewed, and
# is refused at submit.

OFFER_TEMPLATE_NAME = "Freelance Animator Offer Letter (DOCX)"
OFFER_ASSIGNMENT_NAME = "Freelance Animation Offers"

# Written into the .docx as docxtpl tokens. Every name is a real Job Offer
# fieldname — the render context is built from the document's own fields, so a
# token that names nothing renders empty rather than failing.
OFFER_DOCX_BODY = [
    ("heading", "OFFER OF ENGAGEMENT"),
    ("subheading", "Freelance Animation"),
    ("para", "Reference: {{ name }}"),
    ("para", "Date: {{ offer_date }}"),
    ("para", ""),
    ("para", "Dear {{ applicant_name }},"),
    ("para", ""),
    ("para", "We are pleased to engage you as {{ designation }} with {{ company }} "
             "on a freelance basis."),
    ("para", ""),
    ("bold", "Terms of engagement"),
    ("bullet", "Engagement type: {{ custom_employment_type }}"),
    ("bullet", "Expected start date: {{ custom_expected_doj }}"),
    ("bullet", "Agreed fee (CTC): {{ custom_ctc }}"),
    ("bullet", "Offer valid until: {{ custom_jo_expiry_date }}"),
    ("para", ""),
    ("para", "This letter was selected by the Freelance Animation user assignment "
             "attributes. Seeing it on any other kind of offer means the attribute "
             "filtering is wrong."),
    ("para", ""),
    ("para", "Yours sincerely,"),
    ("para", "Talent Acquisition"),
]


def _build_offer_docx():
    """Write the .docx template to a temp path and return it.

    Authored here rather than shipped as a binary so the tokens in it are visible
    and reviewable in this file — a checked-in .docx is opaque to anyone reading
    the flow, and the whole point is which placeholders the letter uses.
    """
    import tempfile

    from docx import Document as Docx
    from docx.shared import Pt

    docx = Docx()
    for kind, text in OFFER_DOCX_BODY:
        if kind == "heading":
            para = docx.add_paragraph()
            run = para.add_run(text)
            run.bold = True
            run.font.size = Pt(16)
        elif kind == "subheading":
            para = docx.add_paragraph()
            run = para.add_run(text)
            run.italic = True
            run.font.size = Pt(11)
        elif kind == "bold":
            docx.add_paragraph().add_run(text).bold = True
        elif kind == "bullet":
            docx.add_paragraph(text, style="List Bullet")
        else:
            docx.add_paragraph(text)

    path = tempfile.mkstemp(suffix=".docx", prefix="offer_template_")[1]
    docx.save(path)
    return path


def _offer_assignment(company, employment_type, designation):
    """The Attributes assignment that admits this letter.

    Three fields AND-ed on Job Offer. Specificity is the tie-break when several
    letters admit one offer, so a three-field rule outranks a broader one — which
    is what stops the seeder's one-field freelancer letter from claiming this
    offer.
    """
    if frappe.db.exists("Dynamic User Assignment", OFFER_ASSIGNMENT_NAME):
        return OFFER_ASSIGNMENT_NAME

    doc = frappe.new_doc("Dynamic User Assignment")
    doc.assignment_name = OFFER_ASSIGNMENT_NAME
    doc.assignment_code = OFFER_ASSIGNMENT_NAME
    doc.assignment_purpose = "Attributes"
    doc.target_type = "Employee"
    doc.description = (
        f"{MARKER} Job Offers this freelance animation offer letter covers."
    )
    doc.attribute_match = "All fields must match (AND)"
    doc.validate_attribute_hierarchy = 0
    doc.append("applicable_for_process", {"document_type": OFFER_DOCTYPE})
    for field, value in (
        ("company", company),
        ("custom_employment_type", employment_type),
        ("designation", designation),
    ):
        doc.append("assignment_attributes", {
            "scope_doctype": OFFER_DOCTYPE,
            "scope_field": field,
            "attribute_value": value,
        })
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)
    _log(f"assignment '{OFFER_ASSIGNMENT_NAME}' -> Job Offer company={company}, "
         f"custom_employment_type={employment_type}, designation={designation}")
    return doc.name


def _offer_docx_template(assignment):
    """The Document Template itself — template_type Docx, with the file attached."""
    if frappe.db.exists("Document Template", OFFER_TEMPLATE_NAME):
        return OFFER_TEMPLATE_NAME

    # The File goes in first: Document Template.validate refuses a Docx template
    # with no `template_file`, so attaching it after the insert is too late.
    path = _build_offer_docx()
    with open(path, "rb") as handle:
        content = handle.read()
    uploaded = frappe.get_doc({
        "doctype": "File",
        "file_name": f"{OFFER_TEMPLATE_NAME}.docx",
        "content": content,
        "is_private": 1,
    }).insert(ignore_permissions=True)

    doc = frappe.new_doc("Document Template")
    doc.letter_name = OFFER_TEMPLATE_NAME
    doc.letter_description = f"{MARKER} Freelance animation offer letter, rendered from a .docx."
    doc.doctype_name = OFFER_DOCTYPE
    doc.type_of_letter = "Offer Letters"
    doc.template_type = "Docx"
    doc.template_file = uploaded.file_url
    doc.assignment_type = "User Assignment"
    doc.append("user_assignment", {"dynamic_user_assignment": assignment})
    doc.flags.ignore_mandatory = True
    doc.insert(ignore_permissions=True)

    # Now point the file at its template so it shows in the form's attachments
    # rather than floating unowned in the File list.
    frappe.db.set_value("File", uploaded.name, {
        "attached_to_doctype": "Document Template",
        "attached_to_name": doc.name,
        "attached_to_field": "template_file",
    }, update_modified=False)

    _log(f"document template '{OFFER_TEMPLATE_NAME}' (Docx, {len(content):,} bytes) "
         f"-> {uploaded.file_url}")
    return doc.name


def create_offer_template():
    """Step 7: the DOCX offer letter and the assignment that makes it applicable."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        requisition = frappe.db.get_value(
            JOB_REQUISITION, {"reason_for_requesting": ["like", f"%{MARKER}%"]}, "name"
        )
        req = frappe.get_doc(JOB_REQUISITION, requisition)
        assignment = _offer_assignment(
            req.company, req.get("custom_employment_type_link"), req.designation
        )
        _offer_docx_template(assignment)
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_offer_template()


def report_offer_template():
    print("\n" + "=" * 84)
    print("OFFER LETTER — DOCX TEMPLATE + USER ASSIGNMENT APPLICABILITY")
    print("=" * 84)
    if not frappe.db.exists("Document Template", OFFER_TEMPLATE_NAME):
        print("\nnot created yet\n")
        return

    tpl = frappe.get_doc("Document Template", OFFER_TEMPLATE_NAME)
    print(f"\ntemplate        : {tpl.name}")
    print(f"renders         : {tpl.doctype_name} / {tpl.type_of_letter}")
    print(f"template type   : {tpl.template_type}   file: {tpl.template_file}")
    print(f"assignment type : {tpl.assignment_type}")
    for row in tpl.get("user_assignment") or []:
        dua = row.dynamic_user_assignment
        purpose = frappe.db.get_value("Dynamic User Assignment", dua, "assignment_purpose")
        match = frappe.db.get_value("Dynamic User Assignment", dua, "attribute_match")
        print(f"  {dua}  (purpose {purpose}, {match})")
        for a in frappe.db.sql(
            """SELECT scope_doctype, scope_field, value_doctype, attribute_value
               FROM `tabAssignment Attribute` WHERE parent = %s ORDER BY idx""",
            dua, as_dict=True,
        ):
            print(f"    {a['scope_doctype']}.{a['scope_field']} = "
                  f"{a['attribute_value']}  ({a['value_doctype']})")

    print(f"\nplaceholders in the .docx:")
    import re
    tokens = sorted({t.strip() for _k, text in OFFER_DOCX_BODY
                     for t in re.findall(r"{{\s*(.*?)\s*}}", text)})
    print("  " + ", ".join(tokens))
    print()


# --------------------------------------------------------------------------- #
# Pre Job Offer
# --------------------------------------------------------------------------- #
# The step between clearing the last interview and raising the actual offer: the
# candidate is asked to confirm the details the offer will be built from, through
# a Pre Offer Portal Form. HR reviews each answer field by field
# (`api.pre_offer_field_approval`) and only then is the Job Offer raised.
#
# Worth being clear about: the pre-offer does NOT render a Document Template. It
# is a portal form, not a letter — nothing in api/action_center.py touches
# Document Template. The DOCX template built in the previous step is the *offer*
# letter, and it is exercised when the Job Offer is raised.
#
# Two send paths exist. `send_pre_offer_form` sends a named Pre Offer Portal Form;
# `send_pre_offer` is form-less and builds the form from the Job Opening's
# pre-offer config, which this site's Job Opening has no fields for — so the
# named-form path is the one that works here.

PRE_OFFER_FORM_PREFERENCES = ("Employee Joining Form", "Default Onboarding Form")


def _pre_offer_form():
    for name in PRE_OFFER_FORM_PREFERENCES:
        if frappe.db.exists("Onboarding Portal Forms", name):
            return name
    return _first("Onboarding Portal Forms")


def send_pre_offers():
    """Step 8: send the pre job offer to everyone who cleared the interviews."""
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        opening = _flow_opening()
        form = _pre_offer_form()
        if not form:
            frappe.throw("No Pre Offer Portal Form exists on this site.")

        print(f"\nopening {opening}   form '{form}'")

        from recruitment.api.action_center import send_pre_offer_form

        # Everyone who came through the interviews, not a hard-coded list — a
        # candidate rejected at the last round must not be sent a pre-offer.
        candidates = frappe.get_all(
            "Job Applicant",
            filters={"job_title": opening, "status": ["!=", "Rejected"],
                     "custom_current_stage": "Pre Job Offer"},
            fields=["name", "applicant_name"], order_by="creation asc",
        )
        if not candidates:
            frappe.throw("Nobody is at the Pre Job Offer stage — run run_interviews first.")

        for candidate in candidates:
            result = send_pre_offer_form(candidate["name"], form)
            _log(f"{candidate['applicant_name']:<17} {result.get('status')}: "
                 f"sent={result.get('sent')} skipped={result.get('skipped')}")
        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        frappe.db.commit()

    report_pre_offers()


def report_pre_offers():
    opening = _flow_opening(throw=False)
    print("\n" + "=" * 92)
    print("PRE JOB OFFER — SENT TO THE CANDIDATES WHO CLEARED")
    print("=" * 92)
    if not opening:
        print("\nnot created yet\n")
        return

    print()
    for a in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name", "status", "custom_substatus", "custom_current_stage"],
        order_by="creation asc",
    ):
        rows = frappe.db.sql(
            """SELECT portal_form, status, sent_at, action_item
               FROM `tabJob Applicant Pre Offer Form` WHERE parent = %s ORDER BY idx""",
            a["name"], as_dict=True)
        if not rows:
            continue
        print(f"  {a['applicant_name']:<17} status={a['status']:<11} "
              f"sub={a['custom_substatus'] or '-':<24} stage={a['custom_current_stage'] or '-'}")
        for r in rows:
            print(f"      form '{r['portal_form'] or '(form-less)'}'  {r['status']}  "
                  f"sent {r['sent_at']}  action item {r['action_item'] or '-'}")

    print("\n  candidates NOT sent a pre-offer (and why):")
    for a in frappe.get_all(
        "Job Applicant", filters={"job_title": opening},
        fields=["name", "applicant_name", "status", "custom_substatus", "custom_current_stage"],
        order_by="creation asc",
    ):
        if frappe.db.exists("Job Applicant Pre Offer Form", {"parent": a["name"]}):
            continue
        print(f"    {a['applicant_name']:<17} {a['status']:<12} "
              f"{a['custom_substatus'] or '-':<24} at {a['custom_current_stage'] or '-'}")

    print("\n  the candidate action centre items raised by the send:")
    for item in frappe.get_all(
        "Candidate Action Center Item",
        filters={"reference_doctype": "Job Applicant Pre Offer Form"},
        fields=["name", "candidate_email", "status"], order_by="creation desc",
        limit_page_length=6,
    ):
        print(f"    {item['candidate_email']:<46} {item['status']}")
    print()
