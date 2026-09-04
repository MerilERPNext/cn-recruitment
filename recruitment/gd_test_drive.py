"""TEMPORARY: one campus drive, 10 candidates, parked at the start of the GD round.

Built for testing the GD / panel / assignment behaviour end to end:

  * 10 candidates, all Shortlisted and sitting at the Group Discussion stage — the
    exact state ``generate_gd_groups`` pools from, so you can group them from scratch.
  * 4 rounds: Group Discussion -> Technical Round 1 -> HR Round -> Job Offer, each
    mapped to a real hiring stage on the opening (a round whose stage is not on the
    opening can never receive anyone).
  * Panelists rostered ONE PER PANEL, so "one interviewer per group / per interview"
    is visible rather than something you have to take on trust:
        R1 (GD)        GD Panel 1 / 2 / 3   — 3 groups of 3-4 get one interviewer each
        R2 (Technical) Tech Panel 1 / 2     — candidates alternate between them
        R3 (HR)        HR Panel 1
        R2-EXTRA       Review Panel 1       — the Additional Round's OWN roster
  * A spare pool of 4 more candidates (``add_late_candidates``) so you can prove that
    grouping again picks up ONLY the new ones and leaves finished groups frozen.
  * THREE DEDICATED PANEL LOGINS for the GD round (gdtest.panel1..3@example.com,
    password below). They hold the Employee role and nothing else — no HR User, no
    Recruiter Admin — because the whole point of the Group Discussion doctype is that
    a panel member needs no permission on the Campus Drive, and every real Employee on
    this site carries HR roles that would let them see everything anyway. Log in as one
    and you should find their own group and no other.

NO REAL EMAIL: frappe.sendmail is patched off for the whole run and every address is
an @example.com address (RFC 2606 reserved — undeliverable to any real person).

    bench --site homefirst-dev.localhost execute recruitment.gd_test_drive.run
    bench --site homefirst-dev.localhost execute recruitment.gd_test_drive.add_late_candidates
    bench --site homefirst-dev.localhost execute recruitment.gd_test_drive.status
    bench --site homefirst-dev.localhost execute recruitment.gd_test_drive.reset
"""

import frappe
from frappe.utils import add_days, today

MARK = "[GD-TEST]"
PREFIX = "GD Test"
DOMAIN = "@example.com"

GD_STAGE = "Group Discussion"
TECH_STAGE = "Technical Round 1"
HR_STAGE = "HR Round"
# The terminal offer stage every opening gets for free (hiring_stage._append_offer_stages).
# NOT "Pre Job Offer": that one is only appended when the opening has
# custom_enable_pre_job_offer ticked, so pointing a round at it on an opening without
# the flag gives you a round no candidate can ever reach — and the drive says so.
OFFER_STAGE = "Job Offer"

# The opening's hiring workflow. The drive's rounds map onto these by name.
STAGES = [
    ("Resume Screening", "Screening"),
    (GD_STAGE, "Interview"),
    (TECH_STAGE, "Interview"),
    (HR_STAGE, "Interview"),
]

ROUNDS = [
    (GD_STAGE, "Group Discussion", GD_STAGE),
    (TECH_STAGE, "Technical", TECH_STAGE),
    (HR_STAGE, "HR", HR_STAGE),
    ("Job Offer", "Offer", OFFER_STAGE),
]

# (round code suffix, panel name) -> one panelist each, so no panel ever holds two
# people. R2-EXTRA is the Additional Round's own roster.
PANEL_PLAN = [
    ("R1", "GD Panel 1"), ("R1", "GD Panel 2"), ("R1", "GD Panel 3"),
    ("R2", "Tech Panel 1"), ("R2", "Tech Panel 2"),
    ("R3", "HR Panel 1"),
    ("R2-EXTRA", "Review Panel 1"),
]

# The GD round's panels get their own logins, one each. See the docstring: a real
# Employee here holds HR roles, and an HR user sees every Group Discussion, so testing
# the scoping with one would prove nothing. Dev-site fixtures on an @example.com
# address (RFC 2606, undeliverable) — `reset` deletes them.
PANEL_USERS = [
    ("GD Panel", "One", "gdtest.panel1" + DOMAIN),
    ("GD Panel", "Two", "gdtest.panel2" + DOMAIN),
    ("GD Panel", "Three", "gdtest.panel3" + DOMAIN),
]
# Long enough to clear Frappe's password-strength check (a short one is rejected as
# "commonly used"). Dev-site fixture accounts on an undeliverable domain.
PANEL_PASSWORD = "Gd-Panel-Test-2026!"

NAMES = [
    ("Aarav", "Sharma"), ("Diya", "Iyer"), ("Rohan", "Verma"), ("Ananya", "Nair"),
    ("Karan", "Reddy"), ("Meera", "Patel"), ("Vivaan", "Gupta"), ("Priya", "Menon"),
    ("Arjun", "Rao"), ("Sneha", "Joshi"), ("Nikhil", "Desai"), ("Kavya", "Mehta"),
    ("Varun", "Singh"), ("Aditi", "Kumar"),
]


def _log(msg):
    print("[gd_test_drive] " + str(msg))


def _pick(dt, filters=None):
    rows = frappe.get_all(dt, filters=filters or {}, pluck="name", limit=1)
    return rows[0] if rows else None


def _names():
    """Existing docnames of the fixtures this seeder owns."""
    return {
        "Campus Drive": frappe.get_all("Campus Drive",
                                       filters={"drive_name": ["like", f"{PREFIX}%"]}, pluck="name"),
        "Candidate Registration": frappe.get_all(
            "Candidate Registration",
            filters={"campus_invite": ["in", frappe.get_all(
                "Campus Invite", filters={"campus_invite_name": ["like", f"{PREFIX}%"]},
                pluck="name") or [""]]}, pluck="name"),
        "Campus Invite": frappe.get_all("Campus Invite",
                                        filters={"campus_invite_name": ["like", f"{PREFIX}%"]},
                                        pluck="name"),
        "Job Opening": frappe.get_all("Job Opening",
                                      filters={"job_title": ["like", f"{PREFIX}%"]}, pluck="name"),
        "Institute": frappe.get_all("Institute",
                                    filters={"institute_name": ["like", f"{PREFIX}%"]}, pluck="name"),
    }


def _applicants():
    return frappe.get_all("Job Applicant",
                          filters={"email_id": ["like", f"gdtest.%{DOMAIN}"]}, pluck="name")


# ---------------------------------------------------------------------------

def run(candidates=10):
    """Build the drive. Re-runnable: it clears its own previous fixtures first."""
    candidates = int(candidates)
    orig = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    try:
        reset(quiet=True)

        company = _pick("Company")
        designation = _pick("Designation")
        department = _pick("Department")
        region = _pick("Region")
        if not (company and designation):
            raise RuntimeError("Missing Company / Designation masters.")

        # --- institute + its Primary TPO -----------------------------------
        inst = frappe.new_doc("Institute")
        inst.institute_name = f"{PREFIX} College"
        inst.college_short_name = "GDTEST"
        inst.tier = "Tier-1"
        inst.is_active = 1
        inst.region = region
        inst.append("tpo_contacts", {
            "contact_name": "GD Test TPO", "role": "Primary TPO",
            "email": f"gdtest.tpo{DOMAIN}", "phone": "9800000001",
            "invite_status": "Not Invited"})
        inst.flags.ignore_mandatory = True
        inst.insert(ignore_permissions=True)

        # --- opening with the hiring workflow the rounds map onto ----------
        op = frappe.new_doc("Job Opening")
        op.job_title = f"{PREFIX} Opening"
        op.company = company
        op.designation = designation
        if department:
            op.department = department
        op.status = "Open"
        op.vacancies = candidates
        op.description = f"{MARK} Opening for GD / panel testing."
        for stage_name, stage_type in STAGES:
            op.append("custom_hiring_stages", {
                "stage_name": stage_name, "stage_type": stage_type,
                "owner_role": "System", "notify": 0, "auto": 1})
        op.flags.ignore_mandatory = True
        op.insert(ignore_permissions=True)

        # --- invite (submitted) + registration ------------------------------
        inv = frappe.new_doc("Campus Invite")
        inv.campus_invite_name = f"{PREFIX} Invite"
        inv.region = region
        inv.registration_expiry_date = add_days(today(), 30)
        inv.append("institutes", {"institute": inst.name})
        inv.append("job_openings", {"job_opening": op.name})
        inv.flags.ignore_mandatory = True
        inv.insert(ignore_permissions=True)
        inv.submit()

        reg = frappe.new_doc("Candidate Registration")
        reg.campus_invite = inv.name
        reg.institute = inst.name
        for i in range(candidates):
            first, last = NAMES[i % len(NAMES)]
            reg.append("candidates", {
                "first_name": first, "last_name": last,
                "email_id": f"gdtest.{i + 1:02d}{DOMAIN}",
                "mobile_number": f"98{i + 1:08d}"[:10]})
        reg.flags.ignore_mandatory = True
        reg.insert(ignore_permissions=True)
        reg.submit()

        # --- the drive ------------------------------------------------------
        drive = frappe.new_doc("Campus Drive")
        drive.drive_name = f"{PREFIX} Drive"
        drive.drive_owner = "Administrator"
        drive.drive_start_date = add_days(today(), -1)   # Live
        drive.drive_end_date = add_days(today(), 30)
        drive.append("campus_invites", {"campus_invite": inv.name,
                                        "campus_invite_name": inv.campus_invite_name})
        # Stated, not inherited: Campus Drive leaves the college choice to HR.
        drive.append("participating_institutes", {"institute": inst.name})
        for round_name, round_type, stage in ROUNDS:
            drive.append("rounds", {"round_name": round_name, "round_type": round_type,
                                    "hiring_stage": stage})
        drive.flags.ignore_mandatory = True
        drive.insert(ignore_permissions=True)

        # --- candidates, parked at the GD stage -----------------------------
        made = _make_candidates(op.name, inv.name, inst.name, drive.name, 0, candidates)

        # --- panelists: ONE per panel ---------------------------------------
        panelists = _roster(drive.name)

        frappe.db.commit()
    finally:
        frappe.sendmail = orig

    _log("=" * 74)
    _log(f"Drive       : {drive.name}  ({drive.drive_name})  [{drive.drive_status}]")
    _log(f"Opening     : {op.name}   Invite: {inv.name}   Institute: {inst.name}")
    _log(f"Candidates  : {len(made)} Shortlisted, all sitting at '{GD_STAGE}'")
    _log(f"Panelists   : {panelists} rows, one interviewer per panel")
    _log("-" * 74)
    _log("GD panel logins (Employee role ONLY — no access to the drive itself):")
    for first, last, email in PANEL_USERS:
        _log(f"    {email}   password: {PANEL_PASSWORD}")
    _log("-" * 74)
    _log("AS HR (Administrator), on the drive:")
    _log("  1. Group Discussion round -> Create Groups (size 3)")
    _log("     => 3-4 groups, each with its OWN panel (never two interviewers on one)")
    _log("     => and one Group Discussion record per group: /app/group-discussion")
    _log("  2. Untick 'Auto-assign panels' first to test the manual route:")
    _log("     => NO Group Discussion is created until you set a panel on a group;")
    _log("        set one and it appears, clear it and it goes away again")
    _log("  3. Mark a candidate Pass on the drive, then open that group's Group")
    _log("     Discussion => the mark is already there (and the other way round)")
    _log("")
    _log("AS A PANEL MEMBER (log in as one of the three above):")
    _log("  4. /app/group-discussion => ONLY the group(s) they are on. Open another")
    _log("     one by URL and you get a permission error; the Campus Drive is closed")
    _log("     to them entirely")
    _log("  5. Same card as HR sees: mark everyone Present, then Pass/Fail, then")
    _log("     'Finish & send results' => passers move to Technical Round 1, fails are")
    _log("     Rejected, and the group locks on BOTH the GD and the drive")
    _log("")
    _log("BACK AS HR:")
    _log("  6. The drive's GD card now shows that group Completed with its verdicts")
    _log("  7. bench execute recruitment.gd_test_drive.add_late_candidates")
    _log("     then 'Group New Candidates' => ONLY the 4 new ones are grouped, and")
    _log("     only the new group gets a new Group Discussion")
    _log("  8. 'Regroup' => rebuilds the un-run groups, leaves the Completed one alone")
    _log("  9. Technical Round 1 -> Assign to Panels => one interviewer per candidate")
    _log(" 10. Additional Round after Technical Round 1 -> panel is Review Panel 1")
    _log("")
    _log("  bench --site homefirst-dev.localhost execute recruitment.gd_test_drive.status")
    _log("=" * 74)
    return {"drive": drive.name, "opening": op.name, "invite": inv.name,
            "candidates": made, "panelists": panelists}


def _make_candidates(opening, invite, institute, drive, start, count):
    made = []
    for i in range(start, start + count):
        first, last = NAMES[i % len(NAMES)]
        doc = frappe.new_doc("Job Applicant")
        doc.applicant_name = first
        if doc.meta.has_field("custom_applicant_last_name"):
            doc.custom_applicant_last_name = last
        doc.email_id = f"gdtest.{i + 1:02d}{DOMAIN}"
        doc.phone_number = f"98{i + 1:08d}"[:10]
        doc.status = "Shortlisted"          # the pool generate_gd_groups reads
        doc.source = "Campus Hiring"
        doc.job_title = opening
        doc.designation = frappe.db.get_value("Job Opening", opening, "designation")
        doc.custom_campus_invite = invite
        doc.custom_institute = institute
        doc.custom_campus_drive = drive
        doc.custom_current_stage = GD_STAGE  # parked at the start of the GD round
        doc.flags.ignore_mandatory = True
        doc.insert(ignore_permissions=True)
        made.append(doc.name)
    return made


def _panel_employees():
    """User + Employee for each GD panel login, returned in PANEL_USERS order.

    The Employee is what the roster links to (Campus Drive Round Panelist is an
    Employee link); the User is what the Group Discussion is scoped and shared by.
    Employee.user_id is the join between them.
    """
    company = _pick("Company")
    department = _pick("Department")
    designation = _pick("Designation")
    out = []
    for first, last, email in PANEL_USERS:
        if not frappe.db.exists("User", email):
            user = frappe.new_doc("User")
            user.email = email
            user.first_name = first
            user.last_name = last
            user.send_welcome_email = 0
            user.new_password = PANEL_PASSWORD
            user.append("roles", {"role": "Employee"})
            user.flags.ignore_permissions = True
            user.insert(ignore_permissions=True)

        emp = frappe.db.get_value("Employee", {"user_id": email}, "name")
        if not emp:
            doc = frappe.new_doc("Employee")
            doc.first_name = first
            doc.last_name = last
            doc.employee_name = f"{first} {last}"
            doc.user_id = email
            doc.status = "Active"
            doc.company = company
            doc.department = department
            doc.designation = designation
            doc.gender = "Other"
            doc.date_of_birth = add_days(today(), -9000)
            doc.date_of_joining = add_days(today(), -365)
            doc.flags.ignore_mandatory = True
            emp = doc.insert(ignore_permissions=True).name
        out.append(emp)
    return out


def _roster(drive_name):
    """One panelist per panel — the point being that no panel ever holds two, so a
    group / interview can only ever get a single interviewer."""
    doc = frappe.get_doc("Campus Drive", drive_name)
    codes = {r.round_name: r.round_code for r in doc.rounds}
    by_index = {"R1": codes.get(GD_STAGE), "R2": codes.get(TECH_STAGE),
                "R3": codes.get(HR_STAGE)}

    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=len(PANEL_PLAN))
    if not emps:
        _log("WARNING: no Employee has a linked User — panels cannot take interviews.")
        return 0
    # The GD panels take the dedicated non-HR logins; the later rounds keep the site's
    # real Employees, so the contrast between the two is visible on one drive.
    gd_emps = _panel_employees()

    doc.set("round_panelists", [])
    gd_i = 0
    for i, (slot, panel) in enumerate(PANEL_PLAN):
        if slot.endswith("-EXTRA"):
            base = by_index.get(slot.split("-")[0])
            code = f"{base}-EXTRA" if base else None
        else:
            code = by_index.get(slot)
        if not code:
            continue
        if slot == "R1" and gd_emps:
            panelist = gd_emps[gd_i % len(gd_emps)]
            gd_i += 1
        else:
            panelist = emps[i % len(emps)]
        doc.append("round_panelists", {"round_code": code, "panel_name": panel,
                                       "panelist": panelist})
    doc.save(ignore_permissions=True)
    return len(doc.round_panelists)


@frappe.whitelist()
def add_late_candidates(count=4):
    """Four more Shortlisted candidates on the same drive — the "late arrivals" case.

    Group again afterwards: ONLY these are grouped, existing groups are untouched and
    any Completed group stays frozen.
    """
    count = int(count)
    drive = _pick("Campus Drive", {"drive_name": ["like", f"{PREFIX}%"]})
    if not drive:
        _log("No test drive — run() first.")
        return
    opening = _pick("Job Opening", {"job_title": ["like", f"{PREFIX}%"]})
    invite = _pick("Campus Invite", {"campus_invite_name": ["like", f"{PREFIX}%"]})
    institute = _pick("Institute", {"institute_name": ["like", f"{PREFIX}%"]})
    start = len(_applicants())
    made = _make_candidates(opening, invite, institute, drive, start, count)
    frappe.db.commit()
    _log(f"added {len(made)} late candidate(s): {made}")
    _log("now click 'Group New Candidates' — only these should be grouped")
    return made


@frappe.whitelist()
def status():
    """Where everything stands right now."""
    drive = _pick("Campus Drive", {"drive_name": ["like", f"{PREFIX}%"]})
    if not drive:
        _log("No test drive — run() first.")
        return
    _log(f"Drive {drive}")
    for r in frappe.get_all("Campus Drive Round", filters={"parent": drive},
                            fields=["round_code", "round_name", "hiring_stage"],
                            order_by="idx asc"):
        panels = frappe.get_all("Campus Drive Round Panelist",
                                filters={"parent": drive, "round_code": r.round_code},
                                fields=["panel_name", "panelist"])
        extra = frappe.get_all("Campus Drive Round Panelist",
                               filters={"parent": drive, "round_code": f"{r.round_code}-EXTRA"},
                               fields=["panel_name", "panelist"])
        _log(f"  {r.round_code} {r.round_name:20s} stage={r.hiring_stage or '-':18s} "
             f"panels={[p.panel_name for p in panels]}"
             + (f"  EXTRA={[p.panel_name for p in extra]}" if extra else ""))

    groups = frappe.get_all("Campus Drive GD Group", filters={"parent": drive},
                            fields=["round_code", "group_name", "group_status",
                                    "panel_name", "candidate_count"], order_by="idx asc")
    _log(f"  GD groups ({len(groups)}):")
    for g in groups:
        _log(f"    {g.group_name:10s} [{g.group_status:10s}] panel={g.panel_name or '-':16s} "
             f"n={g.candidate_count}")

    gds = frappe.get_all("Group Discussion", filters={"campus_drive": drive},
                         fields=["name", "round_code", "group_name", "panel_name", "status",
                                 "results_pushed", "candidate_count"],
                         order_by="group_name asc")
    _log(f"  Group Discussions ({len(gds)}) — one per group WITH a panel:")
    for g in gds:
        who = frappe.get_all("Group Discussion Interviewer",
                             filters={"parent": g.name}, pluck="interviewer")
        _log(f"    {g.name} {g.group_name:10s} [{g.status:11s}] "
             f"panel={g.panel_name or '-':16s} n={g.candidate_count} "
             f"pushed={bool(g.results_pushed)} -> {who}")
    unpanelled = [g.group_name for g in groups if not g.panel_name]
    if unpanelled:
        _log(f"    (no Group Discussion for {unpanelled} — they have no panel yet)")

    by_stage = {}
    for a in frappe.get_all("Job Applicant", filters={"name": ["in", _applicants() or [""]]},
                            fields=["name", "status", "custom_current_stage"]):
        by_stage.setdefault((a.custom_current_stage, a.status), 0)
        by_stage[(a.custom_current_stage, a.status)] += 1
    _log("  candidates by (stage, status):")
    for k, v in sorted(by_stage.items(), key=lambda x: str(x[0])):
        _log(f"    {str(k):48s} {v}")

    ivs = frappe.get_all("Interview", filters={"custom_campus_drive": drive},
                         fields=["name", "custom_campus_round_code", "custom_interview_panel",
                                 "status", "job_applicant"])
    _log(f"  interviews ({len(ivs)}):")
    for iv in ivs:
        who = frappe.get_all("Interview Detail", filters={"parent": iv.name}, pluck="interviewer")
        _log(f"    {iv.name} {iv.custom_campus_round_code} panel={iv.custom_interview_panel} "
             f"[{iv.status}] interviewers={who}")


@frappe.whitelist()
def reset(quiet=False):
    """Delete everything this seeder owns, so run() starts clean."""
    removed = {}

    def wipe(dt, names):
        n = 0
        submittable = bool(frappe.get_meta(dt).is_submittable)
        for name in names:
            try:
                if submittable:
                    frappe.db.set_value(dt, name, "docstatus", 2, update_modified=False)
                frappe.delete_doc(dt, name, force=True, ignore_permissions=True,
                                  delete_permanently=True)
                n += 1
            except Exception as exc:
                if not quiet:
                    _log(f"  could not delete {dt} {name}: {exc}")
        removed[dt] = n

    applicants = _applicants()
    for dt, field in (("Interview Feedback", "job_applicant"), ("Interview", "job_applicant")):
        wipe(dt, frappe.get_all(dt, filters={field: ["in", applicants or [""]]}, pluck="name"))
    wipe("Job Offer", frappe.get_all("Job Offer",
                                     filters={"job_applicant": ["in", applicants or [""]]},
                                     pluck="name"))
    wipe("Job Applicant", applicants)

    fixtures = _names()
    for dt in ("Campus Drive", "Candidate Registration", "Campus Invite",
               "Job Opening", "Institute"):
        wipe(dt, fixtures.get(dt) or [])
    # Employee before User: Employee.user_id points at it, and Frappe's link check
    # refuses to delete a User that is still somebody's login.
    wipe("Employee", frappe.get_all(
        "Employee", filters={"user_id": ["like", f"gdtest.%{DOMAIN}"]}, pluck="name"))
    wipe("User", frappe.get_all("User", filters={"name": ["like", f"gdtest.%{DOMAIN}"]},
                                pluck="name"))

    frappe.db.commit()
    if not quiet:
        _log(f"reset: {removed}")
    return removed
