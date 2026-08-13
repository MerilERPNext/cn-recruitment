"""TEMPORARY end-to-end recruitment-flow seeder (safe to delete).

Builds THREE complete chains, each a different variation of the same flow:

    Job Requisition -> Job Opening(s) -> Campus Invite -> Candidate Registration
    -> Campus Drive

  Variation A "Fresher / Live"      JR Approved Active (activated on an opening)
                                    2 openings, 3 institutes, invite In Progress,
                                    3 submitted registrations, drive LIVE.
  Variation B "Lateral / Upcoming"  JR Approved Draft (approved, NOT yet activated)
                                    with tracked position rows, 1 opening,
                                    2 institutes, invite Invited, 2 submitted
                                    registrations + 1 DRAFT registration,
                                    drive DRAFT (window in the future).
  Variation C "Fresher / Closed"    JR Approved Active, 2 openings (one Closed),
                                    2 institutes, invite Completed,
                                    2 submitted registrations, drive COMPLETED.

Plus four standalone requisitions so every remaining Job Requisition status has a
live example: Draft, Approval Pending, Rejected, Archived.

NO REAL EMAIL IS EVER SENT: this site has a live default outgoing account, so
frappe.sendmail is monkeypatched to a no-op for the whole run. Every address used
is an @example.com address (RFC 2606 reserved — it can never reach a real inbox).

Everything is marked so cleanup() can wipe it:
    Requisitions : description contains  [FLOW-DEMO]
    Institutes   : institute_name ends with " (Flow Demo)"
    TPO users    : email like  tpo.*@example.com  with full name ending "(Flow Demo)"
    Openings     : job_title starts with "Demo "
    Invites      : campus_invite_name starts with "Demo Invite "
    Drives       : drive_name starts with "Demo Drive "
    Candidates   : registrations pointing at the demo invites

Run:
    bench --site homefirst-dev.localhost execute recruitment.flow_demo_seed.run
Report what exists:
    bench --site homefirst-dev.localhost execute recruitment.flow_demo_seed.report
Cleanup:
    bench --site homefirst-dev.localhost execute recruitment.flow_demo_seed.cleanup
"""

import frappe
from frappe.utils import add_days, today

REQ_MARKER = "[FLOW-DEMO]"
INST_SUFFIX = " (Flow Demo)"
OPENING_PREFIX = "Demo "
INVITE_PREFIX = "Demo Invite "
DRIVE_PREFIX = "Demo Drive "
EMAIL_DOMAIN = "@example.com"

FIRST_NAMES = ["Aarav", "Vivaan", "Ananya", "Diya", "Arjun", "Saanvi", "Ishaan",
               "Myra", "Rohan", "Neha", "Karan", "Priya", "Nikhil", "Aditi",
               "Varun", "Sneha", "Rahul", "Kavya", "Siddharth", "Meera"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Iyer", "Reddy", "Nair", "Patel",
              "Kumar", "Singh", "Rao", "Menon", "Joshi", "Mehta", "Desai"]

# Hiring workflow stamped on every demo opening. The campus rounds map onto these
# stages, so "who is waiting for round X" is simply "who sits at stage X".
HIRING_STAGES = [
    ("Resume Screening", "Screening"),
    ("Group Discussion", "Interview"),
    ("Technical Round 1", "Interview"),
    ("HR Round", "Interview"),
]

# Rounds put on every demo drive: (round name, round type, hiring stage)
DRIVE_ROUNDS = [
    ("Pre-Placement Talk", "PPT", ""),
    ("Group Discussion", "Group Discussion", "Group Discussion"),
    ("Technical Round 1", "Technical", "Technical Round 1"),
    ("HR Round", "HR", "HR Round"),
    ("Offer", "Offer", "Pre Job Offer"),
]

# Campus application fields declared on every demo opening.
CAMPUS_FIELDS = [
    ("applicant_name", "First Name", "Data"),
    ("custom_applicant_last_name", "Last Name", "Data"),
    ("phone_number", "Phone Number", "Data"),
    ("custom_gender", "Gender", "Select"),
]

_counter = {"n": 0}


def _log(msg):
    print("[flow_demo] " + str(msg))


def _next():
    _counter["n"] += 1
    return _counter["n"]


def _pick(dt, filters=None, order_by=None):
    rows = frappe.get_all(dt, filters=filters or {}, pluck="name", limit=1, order_by=order_by)
    return rows[0] if rows else None


def _designation(preferred):
    """A real Designation: the preferred one if the site has it, else any."""
    for name in preferred:
        if frappe.db.exists("Designation", name):
            return name
    return _pick("Designation")


def _masters():
    company = _pick("Company")
    employee = _pick("Employee", {"status": "Active", "user_id": ["!=", ""]}) or _pick("Employee")
    department = _pick("Department", {"company": company}) or _pick("Department")
    branch = _pick("Branch")
    if not (company and employee):
        raise RuntimeError(f"Missing masters: company={company} employee={employee}")
    return frappe._dict(company=company, employee=employee, department=department, branch=branch)


def _application_field_rows():
    meta = frappe.get_meta("Job Applicant")
    rows = []
    for ref, label, ftype in CAMPUS_FIELDS:
        if not meta.has_field(ref):
            continue
        rows.append({
            "section": "Basic Details", "reference_name": ref, "display_name": label,
            "fieldtype": ftype, "view_campus": 1, "mandatory_campus": 0,
            "view_careers": 1, "view_ijp": 0, "view_refer": 0, "view_preoffer": 0,
            "visibility": "All", "editability": "Editable",
        })
    return rows


# ---------------------------------------------------------------------------
# Institutes (each with a Primary TPO on an @example.com address)
# ---------------------------------------------------------------------------

DEMO_COLLEGES = [
    "Sardar Patel Institute of Technology",
    "Ramaiah Institute of Management",
    "Symbiosis Institute of Business Studies",
    "Thiagarajar School of Management",
    "Amrita School of Business",
    "Nirma Institute of Management",
    "Chitkara Business School",
]


def _ensure_institute(index, region):
    """Idempotent demo Institute + one Primary TPO contact on an example.com address."""
    college = DEMO_COLLEGES[index % len(DEMO_COLLEGES)]
    inst_name = f"{college}{INST_SUFFIX}"
    existing = frappe.db.get_value("Institute", {"institute_name": inst_name}, "name")
    if existing:
        return existing

    tpo_first = FIRST_NAMES[index % len(FIRST_NAMES)]
    tpo_last = LAST_NAMES[index % len(LAST_NAMES)]
    doc = frappe.new_doc("Institute")
    doc.institute_name = inst_name
    doc.college_short_name = f"DEMO{index + 1:02d}"
    doc.tier = ["Tier-1", "Tier-2", "Tier-3"][index % 3]
    doc.region = region
    doc.is_active = 1
    doc.batch_size = 120 + index * 15
    doc.append("tpo_contacts", {
        "contact_name": f"{tpo_first} {tpo_last} (Flow Demo)",
        "role": "Primary TPO",
        # example.com is reserved by RFC 2606 — undeliverable to any real person.
        "email": f"tpo.{tpo_first.lower()}.{tpo_last.lower()}{index + 1}{EMAIL_DOMAIN}",
        "phone": f"98{index + 1:08d}"[:10],
        "invite_status": "Not Invited",
    })
    doc.insert(ignore_permissions=True)
    return doc.name


# ---------------------------------------------------------------------------
# Job Requisition
# ---------------------------------------------------------------------------

def _make_requisition(m, *, title, designation, status, hiring_type, type_of_position,
                      positions, regions=None, position_details=0):
    """One Job Requisition. `regions` -> region-budget rows (campus/fresher style);
    `position_details` -> N individually tracked position rows (lateral style)."""
    req = frappe.new_doc("Job Requisition")
    req.designation = designation
    req.company = m.company
    if m.department:
        req.department = m.department
    req.no_of_positions = positions
    # Always born a Draft — the target status is reached by walking the real
    # transitions below, because that is what materialises the position rows.
    req.status = "Draft"
    req.requested_by = m.employee
    req.posting_date = today()
    req.expected_by = add_days(today(), 60)
    req.expected_compensation = 450000
    req.description = f"{REQ_MARKER} {title}"
    req.reason_for_requesting = f"{title} — demo record for end-to-end flow testing."

    if req.meta.has_field("custom_hiring_type"):
        req.custom_hiring_type = hiring_type
    if req.meta.has_field("custom_type_of_position"):
        req.custom_type_of_position = type_of_position
    if req.meta.has_field("custom_location") and m.branch:
        req.custom_location = m.branch
    if req.meta.has_field("custom_salary_range_min"):
        req.custom_salary_range_min = "400000"
    if req.meta.has_field("custom_salary_range_max"):
        req.custom_salary_range_max = "650000"
    if req.meta.has_field("custom_salary_timeframe"):
        req.custom_salary_timeframe = "Annual"
    if req.meta.has_field("custom_work_experience_range"):
        req.custom_work_experience_range = "Fresher" if hiring_type == "Fresher" else "3 - 5 years"

    # Region budget rows — how a campus/fresher requisition spreads its headcount.
    if regions and req.meta.has_field("custom_regions"):
        per = max(1, positions // len(regions))
        for region in regions:
            req.append("custom_regions", {"region": region, "no_of_openings": per})

    # Individually tracked positions — how a lateral requisition is policed.
    if position_details and req.meta.has_field("custom_position_details") and m.branch:
        for _i in range(position_details):
            req.append("custom_position_details", {
                "reporting_manager": m.employee,
                "location": m.branch,
                "approval_status": "Approved" if status.startswith("Approved") else "Pending",
            })

    req.insert(ignore_permissions=True)

    if status != "Draft":
        # Draft -> Approval Pending is written at db level: no doc_events, so no
        # approval flow is kicked off for a demo record. The final hop IS a real
        # save, because that is the on_update that fires
        # materialise_positions_on_approval and turns custom_position_details
        # (the headcount) into custom_position_summary (the trackable rows).
        frappe.db.set_value("Job Requisition", req.name, "status", "Approval Pending")
        if status != "Approval Pending":
            doc = frappe.get_doc("Job Requisition", req.name)
            doc.status = status
            doc.save(ignore_permissions=True)

    return req.name


# ---------------------------------------------------------------------------
# Job Opening
# ---------------------------------------------------------------------------

def _make_opening(m, *, title, designation, region, vacancies, status="Open",
                  app_fields=None, campus=True):
    op = frappe.new_doc("Job Opening")
    op.job_title = f"{OPENING_PREFIX}{title}"
    op.designation = designation
    op.company = m.company
    if m.department:
        op.department = m.department
    op.status = status
    op.vacancies = vacancies
    op.description = f"{REQ_MARKER} {title}"
    if op.meta.has_field("planned_vacancies"):
        op.planned_vacancies = vacancies
    if op.meta.has_field("custom_hiring_type"):
        op.custom_hiring_type = "Fresher" if campus else "Lateral"
    if op.meta.has_field("custom_location") and m.branch:
        op.custom_location = m.branch
    # Region lives in the child table — the validate hook derives the parent
    # custom_region fields from it and blanks them when the table is empty.
    if region and op.meta.has_field("custom_regions"):
        op.append("custom_regions", {"region": region, "no_of_openings": vacancies})
    if app_fields and op.meta.has_field("custom_application_fields"):
        for row in app_fields:
            op.append("custom_application_fields", dict(row))
    if campus and op.meta.has_field("custom_posting_options"):
        op.append("custom_posting_options", {
            "post_to": "Campus", "status": "Active",
            "display_from": today(), "display_to": add_days(today(), 60),
        })
    if op.meta.has_field("custom_hiring_stages"):
        for stage_name, stage_type in HIRING_STAGES:
            op.append("custom_hiring_stages", {
                "stage_name": stage_name, "stage_type": stage_type,
                "owner_role": "System", "notify": 0, "auto": 1,
            })
    op.insert(ignore_permissions=True)
    return op.name


def _activate(requisition, opening):
    """Approved Draft -> Approved Active: link the opening and open the positions.
    Uses the real endpoint so the status matrix is exercised, not bypassed."""
    from recruitment.api.job_requisition import activate_job_requisition

    activate_job_requisition(requisition, opening)


# ---------------------------------------------------------------------------
# Campus Invite / Candidate Registration / Campus Drive
# ---------------------------------------------------------------------------

def _make_invite(*, name, region, institutes, openings, expiry_days, final_status=None):
    inv = frappe.new_doc("Campus Invite")
    inv.campus_invite_name = f"{INVITE_PREFIX}{name}"
    if inv.meta.has_field("region"):
        inv.region = region
    if inv.meta.has_field("registration_expiry_date"):
        inv.registration_expiry_date = add_days(today(), expiry_days)
    for inst in institutes:
        inv.append("institutes", {"institute": inst})
    for op in openings:
        inv.append("job_openings", {"job_opening": op})
    inv.insert(ignore_permissions=True)
    # on_submit provisions a Desk user for each Primary TPO and mails them their
    # password link — mail is patched off for this run.
    inv.submit()
    if final_status and final_status != "Invited":
        inv.db_set("status", final_status)
    return inv.name


def _candidate_rows(n):
    rows = []
    for _i in range(n):
        idx = _next()
        first = FIRST_NAMES[idx % len(FIRST_NAMES)]
        last = LAST_NAMES[idx % len(LAST_NAMES)]
        rows.append({
            "first_name": first,
            "last_name": last,
            # Readable, realistic, and undeliverable: example.com is RFC-2606 reserved.
            "email_id": f"{first.lower()}.{last.lower()}{idx:03d}{EMAIL_DOMAIN}",
            "mobile_number": f"9{idx:09d}"[:10],
        })
    return rows


def _make_registration(*, invite, institute, count, submit=True):
    reg = frappe.new_doc("Candidate Registration")
    reg.campus_invite = invite
    reg.institute = institute
    for row in _candidate_rows(count):
        reg.append("candidates", row)
    reg.insert(ignore_permissions=True)
    if submit:
        # on_submit emails every candidate their apply link — patched off.
        reg.submit()
    return reg.name, count


def _make_drive(m, *, name, invite, start, end, owner="Administrator"):
    """Drive status is NOT set by hand: Campus Drive derives it from its window
    (before start -> Draft, inside -> Live, after end -> Completed)."""
    doc = frappe.new_doc("Campus Drive")
    doc.drive_name = f"{DRIVE_PREFIX}{name}"
    doc.drive_owner = owner
    doc.drive_start_date = start
    doc.drive_end_date = end
    inv_label = frappe.db.get_value("Campus Invite", invite, "campus_invite_name")
    doc.append("campus_invites", {"campus_invite": invite, "campus_invite_name": inv_label})
    for rname, rtype, stage in DRIVE_ROUNDS:
        row = {"round_name": rname, "round_type": rtype}
        if stage:
            row["hiring_stage"] = stage
        doc.append("rounds", row)
    doc.insert(ignore_permissions=True)

    # Staff the interview rounds so the panel/GD machinery has something to deal out.
    doc = frappe.get_doc("Campus Drive", doc.name)
    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=6)
    if emps:
        i = 0
        for r in doc.rounds:
            if r.round_type not in ("Technical", "HR", "Group Discussion"):
                continue
            for pnum in (1, 2):
                doc.append("round_panelists", {
                    "round_code": r.round_code, "panelist": emps[i % len(emps)],
                    "panel_name": f"Panel {pnum}",
                })
                i += 1
        doc.save(ignore_permissions=True)
    return doc.name, doc.drive_status


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

SETTINGS_DT = "Recruitment Settings"
ALLOW_EDIT_FIELD = "allow_editing_requisition_after_approval"


def _set_allow_edit(value):
    frappe.db.set_single_value(SETTINGS_DT, ALLOW_EDIT_FIELD, value)
    frappe.clear_document_cache(SETTINGS_DT, SETTINGS_DT)


def purge_queued_since(since, dry_run=False):
    """Delete Email Queue rows still unsent that were raised after `since`.

    Patching frappe.sendmail stops everything this process sends, but the approval
    engine raises its "Approval Required" notification from a BACKGROUND job, in
    another process the patch never reaches — and that one is addressed to a real
    HR mailbox, not to an @example.com dummy. Demo requisitions must not page a
    real approver, so anything this seeder caused is dropped before the scheduler
    can flush it. Only 'Not Sent' rows are touched; already-sent mail is history.
    """
    rows = frappe.get_all("Email Queue",
                          filters={"status": "Not Sent", "creation": [">=", since]},
                          fields=["name"])
    if dry_run:
        return [r.name for r in rows]
    for r in rows:
        frappe.db.delete("Email Queue Recipient", {"parent": r.name})
        frappe.db.delete("Email Queue", {"name": r.name})
    frappe.db.commit()
    return [r.name for r in rows]


def run():
    from frappe.utils import now

    started_at = now()
    orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None   # no real mail, for the whole run

    # Position tracking rows are written by a NESTED save inside the on_update
    # hook, and that nested save re-reads its "before" snapshot from the db — by
    # then the status is already Approved, so the edit-after-approval guard blocks
    # it. Enabling the setting for the duration of the seed is exactly the remedy
    # the guard's own error message prescribes; the previous value is restored.
    prev_allow_edit = frappe.db.get_single_value(SETTINGS_DT, ALLOW_EDIT_FIELD)
    _set_allow_edit(1)

    out = {"variations": [], "extra_requisitions": [], "errors": []}
    try:
        m = _masters()
        _log(f"masters: company={m.company} employee={m.employee} dept={m.department} branch={m.branch}")

        regions = frappe.get_all("Region", fields=["name", "location_region"], limit=3)
        if not regions:
            raise RuntimeError("No Region records exist — the campus flow hangs off Region.")
        while len(regions) < 3:
            regions.append(regions[0])
        app_fields = _application_field_rows()

        # ---------------- Variation A — Fresher / Live drive ----------------
        _log("--- Variation A: Fresher campus hiring, drive LIVE ---")
        region_a = regions[0]
        desig_a = _designation(["Relationship Manager", "RMS", "Associate"])
        insts_a = [_ensure_institute(i, region_a.name) for i in range(3)]

        req_a = _make_requisition(
            m, title="Campus Fresher Intake 2026 — Relationship Manager Trainee",
            designation=desig_a, status="Approved Draft", hiring_type="Fresher",
            type_of_position="New", positions=30, regions=[region_a.name])

        op_a1 = _make_opening(m, title=f"Relationship Manager Trainee — {region_a.location_region}",
                              designation=desig_a, region=region_a.name, vacancies=20,
                              app_fields=app_fields)
        op_a2 = _make_opening(m, title=f"Sales Officer Trainee — {region_a.location_region}",
                              designation=desig_a, region=region_a.name, vacancies=10,
                              app_fields=app_fields)
        # Activation is what moves Approved Draft -> Approved Active and opens the
        # positions. Strictly one opening per requisition, so op_a2 stands alone.
        _activate(req_a, op_a1)

        inv_a = _make_invite(name=f"{region_a.location_region} Campus 2026", region=region_a.name,
                             institutes=insts_a, openings=[op_a1, op_a2], expiry_days=30,
                             final_status="In Progress")
        regs_a, cands_a = [], 0
        for inst in insts_a:
            name, n = _make_registration(invite=inv_a, institute=inst, count=6)
            regs_a.append(name)
            cands_a += n
        drive_a, status_a = _make_drive(m, name=f"{region_a.location_region} 2026",
                                        invite=inv_a, start=add_days(today(), -5),
                                        end=add_days(today(), 25))
        out["variations"].append({
            "variation": "A — Fresher / Live", "requisition": req_a,
            "requisition_status": frappe.db.get_value("Job Requisition", req_a, "status"),
            "openings": [op_a1, op_a2], "invite": inv_a,
            "invite_status": frappe.db.get_value("Campus Invite", inv_a, "status"),
            "registrations": regs_a, "candidates": cands_a,
            "drive": drive_a, "drive_status": status_a,
        })
        frappe.db.commit()

        # ------------- Variation B — Lateral / positions / upcoming -------------
        _log("--- Variation B: Lateral hiring with tracked positions, drive DRAFT ---")
        region_b = regions[1]
        desig_b = _designation(["Area Sales Manager", "CSM", "Business Analyst"])
        insts_b = [_ensure_institute(i, region_b.name) for i in (3, 4)]

        req_b = _make_requisition(
            m, title="Lateral Hiring — Area Sales Manager (Replacement)",
            designation=desig_b, status="Approved Draft", hiring_type="Lateral",
            type_of_position="Replacement", positions=3, position_details=3)

        op_b1 = _make_opening(m, title=f"Area Sales Manager — {region_b.location_region}",
                              designation=desig_b, region=region_b.name, vacancies=3,
                              app_fields=app_fields)
        # Deliberately NOT activated — this is the "approved, awaiting activation"
        # state, so the requisition stays Approved Draft and its positions stay Draft.

        inv_b = _make_invite(name=f"{region_b.location_region} Lateral 2026", region=region_b.name,
                             institutes=insts_b, openings=[op_b1], expiry_days=45,
                             final_status="Invited")
        regs_b, cands_b = [], 0
        for inst in insts_b:
            name, n = _make_registration(invite=inv_b, institute=inst, count=5)
            regs_b.append(name)
            cands_b += n
        # One DRAFT registration too, so the un-submitted state has an example.
        draft_reg, draft_n = _make_registration(invite=inv_b, institute=insts_b[0],
                                                count=3, submit=False)
        drive_b, status_b = _make_drive(m, name=f"{region_b.location_region} Lateral 2026",
                                        invite=inv_b, start=add_days(today(), 20),
                                        end=add_days(today(), 40))
        out["variations"].append({
            "variation": "B — Lateral / Upcoming", "requisition": req_b,
            "requisition_status": frappe.db.get_value("Job Requisition", req_b, "status"),
            "openings": [op_b1], "invite": inv_b,
            "invite_status": frappe.db.get_value("Campus Invite", inv_b, "status"),
            "registrations": regs_b, "draft_registration": draft_reg,
            "candidates": cands_b + draft_n,
            "drive": drive_b, "drive_status": status_b,
        })
        frappe.db.commit()

        # --------------- Variation C — Fresher / completed drive ---------------
        _log("--- Variation C: Fresher campus hiring, drive COMPLETED ---")
        region_c = regions[2]
        desig_c = _designation(["Customer Service Manager", "CSM", "Analyst"])
        insts_c = [_ensure_institute(i, region_c.name) for i in (5, 6)]

        req_c = _make_requisition(
            m, title="Campus Fresher Intake 2025 — Customer Service Trainee",
            designation=desig_c, status="Approved Draft", hiring_type="Fresher",
            type_of_position="Both", positions=15, regions=[region_c.name])

        op_c1 = _make_opening(m, title=f"Customer Service Trainee — {region_c.location_region}",
                              designation=desig_c, region=region_c.name, vacancies=10,
                              app_fields=app_fields)
        op_c2 = _make_opening(m, title=f"Operations Trainee — {region_c.location_region}",
                              designation=desig_c, region=region_c.name, vacancies=5,
                              app_fields=app_fields, status="Closed")
        _activate(req_c, op_c1)

        inv_c = _make_invite(name=f"{region_c.location_region} Campus 2025", region=region_c.name,
                             institutes=insts_c, openings=[op_c1, op_c2], expiry_days=-15,
                             final_status="Completed")
        regs_c, cands_c = [], 0
        for inst in insts_c:
            name, n = _make_registration(invite=inv_c, institute=inst, count=5)
            regs_c.append(name)
            cands_c += n
        drive_c, status_c = _make_drive(m, name=f"{region_c.location_region} 2025",
                                        invite=inv_c, start=add_days(today(), -40),
                                        end=add_days(today(), -10))
        out["variations"].append({
            "variation": "C — Fresher / Completed", "requisition": req_c,
            "requisition_status": frappe.db.get_value("Job Requisition", req_c, "status"),
            "openings": [op_c1, op_c2], "invite": inv_c,
            "invite_status": frappe.db.get_value("Campus Invite", inv_c, "status"),
            "registrations": regs_c, "candidates": cands_c,
            "drive": drive_c, "drive_status": status_c,
        })
        frappe.db.commit()

        # ------- Standalone requisitions covering the remaining statuses -------
        _log("--- Extra requisitions for the remaining statuses ---")
        desig_x = _designation(["Business Analyst", "Analyst", "Associate"])
        for label, status in (("Draft", "Draft"),
                              ("Awaiting Approval", "Approval Pending"),
                              ("Rejected by Approver", "Rejected")):
            name = _make_requisition(
                m, title=f"Status Sample — {label}", designation=desig_x,
                status=status, hiring_type="Lateral", type_of_position="New", positions=2)
            out["extra_requisitions"].append({"name": name, "status": status})

        # Archived is reached through the real action, not by writing the field.
        arch = _make_requisition(
            m, title="Status Sample — To Be Archived", designation=desig_x,
            status="Draft", hiring_type="Lateral", type_of_position="New", positions=2)
        try:
            from recruitment.api.requisition_status import archive_requisition
            archive_requisition(arch, reason="Demo record — headcount withdrawn.")
        except Exception as exc:
            out["errors"].append(f"archive {arch}: {type(exc).__name__}: {exc}")
            frappe.db.set_value("Job Requisition", arch, "status", "Archived")
        out["extra_requisitions"].append(
            {"name": arch, "status": frappe.db.get_value("Job Requisition", arch, "status")})

        frappe.db.commit()
    finally:
        frappe.sendmail = orig_sendmail
        _set_allow_edit(prev_allow_edit or 0)
        frappe.db.commit()
        purged = purge_queued_since(started_at)
        out["purged_emails"] = len(purged)
        _log(f"dropped {len(purged)} queued notification(s) raised by this run")

    _report(out)
    return out


def _report(out):
    _log("=" * 78)
    for v in out["variations"]:
        pos = frappe.get_all("Job Requisition Position",
                             filters={"parent": v["requisition"], "parenttype": "Job Requisition"},
                             pluck="status")
        _log(f"{v['variation']}")
        _log(f"   Requisition : {v['requisition']}  [{v['requisition_status']}]"
             + (f"  positions={len(pos)} {sorted(set(pos))}" if pos else "  positions=0 (region-budgeted)"))
        _log(f"   Openings    : {', '.join(v['openings'])}")
        _log(f"   Invite      : {v['invite']}  [{v['invite_status']}]")
        regs = ", ".join(v["registrations"])
        if v.get("draft_registration"):
            regs += f"  (+ draft {v['draft_registration']})"
        _log(f"   Registration: {regs}  — {v['candidates']} candidates")
        _log(f"   Drive       : {v['drive']}  [{v['drive_status']}]")
    _log("-" * 78)
    _log("Extra requisitions (status coverage):")
    for r in out["extra_requisitions"]:
        _log(f"   {r['name']}  [{r['status']}]")
    if out["errors"]:
        _log("-" * 78)
        for e in out["errors"]:
            _log("ERROR: " + str(e))
    _log("=" * 78)


def report():
    """Print what the seeder currently has on the site."""
    reqs = frappe.get_all("Job Requisition",
                          filters={"description": ["like", f"%{REQ_MARKER}%"]},
                          fields=["name", "status", "designation", "no_of_positions"],
                          order_by="creation asc")
    _log(f"Requisitions ({len(reqs)}):")
    for r in reqs:
        _log(f"   {r.name}  [{r.status}]  {r.designation} x{r.no_of_positions}")

    ops = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]},
                         fields=["name", "job_title", "status", "job_requisition", "vacancies"])
    _log(f"Openings ({len(ops)}):")
    for o in ops:
        _log(f"   {o.name}  [{o.status}]  {o.job_title}  req={o.job_requisition or '-'}  vac={o.vacancies}")

    invs = frappe.get_all("Campus Invite",
                          filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"]},
                          fields=["name", "campus_invite_name", "status", "docstatus"])
    _log(f"Campus Invites ({len(invs)}):")
    for i in invs:
        regs = frappe.db.count("Candidate Registration", {"campus_invite": i.name})
        _log(f"   {i.name}  [{i.status}] docstatus={i.docstatus}  {i.campus_invite_name}  registrations={regs}")

    drives = frappe.get_all("Campus Drive", filters={"drive_name": ["like", f"{DRIVE_PREFIX}%"]},
                            fields=["name", "drive_name", "drive_status",
                                    "drive_start_date", "drive_end_date"])
    _log(f"Campus Drives ({len(drives)}):")
    for d in drives:
        _log(f"   {d.name}  [{d.drive_status}]  {d.drive_name}  {d.drive_start_date} -> {d.drive_end_date}")


def cleanup():
    """Remove everything this seeder created."""
    removed = {}

    submittable = {}

    def _wipe(dt, names, force=True):
        n = 0
        if dt not in submittable:
            submittable[dt] = bool(frappe.get_meta(dt).is_submittable)
        for name in names:
            try:
                # A submitted doc refuses deletion. These are demo records, so the
                # docstatus is dropped straight at db level rather than running a
                # real cancel (which would fire on_cancel side effects).
                if submittable[dt]:
                    frappe.db.set_value(dt, name, "docstatus", 2, update_modified=False)
                frappe.delete_doc(dt, name, force=force, ignore_permissions=True,
                                  delete_permanently=True)
                n += 1
            except Exception as exc:
                _log(f"  could not delete {dt} {name}: {exc}")
        removed[dt] = n

    invites = frappe.get_all("Campus Invite",
                             filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"]},
                             pluck="name")
    _wipe("Campus Drive", frappe.get_all(
        "Campus Drive", filters={"drive_name": ["like", f"{DRIVE_PREFIX}%"]}, pluck="name"))
    _wipe("Candidate Registration", frappe.get_all(
        "Candidate Registration", filters={"campus_invite": ["in", invites or [""]]}, pluck="name"))
    _wipe("Campus Invite", invites)
    _wipe("Job Opening", frappe.get_all(
        "Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]}, pluck="name"))
    _wipe("Job Requisition", frappe.get_all(
        "Job Requisition", filters={"description": ["like", f"%{REQ_MARKER}%"]}, pluck="name"))
    _wipe("Institute", frappe.get_all(
        "Institute", filters={"institute_name": ["like", f"%{INST_SUFFIX}"]}, pluck="name"))
    _wipe("User", frappe.get_all(
        "User", filters={"full_name": ["like", "%(Flow Demo)"]}, pluck="name"))

    frappe.db.commit()
    _log(f"cleanup: {removed}")
    return removed
