"""TEMPORARY campus-hiring data seeder (safe to delete).

Seeds the full campus flow end to end on a dev site:
  Region (reused) -> Institute + one Primary TPO each -> region-based fresher
  Job Requisition -> Job Openings (2 per invite, campus fields + eligibility rules)
  -> Campus Invite (multi-institute, submitted -> provisions TPO Desk users) ->
  Candidate Registration (submitted) -> Job Applicants (via the real campus-invite
  application API, eligibility scored). Candidates may apply to more than one opening.

No real email is ever sent: frappe.sendmail is monkeypatched to a no-op for the
whole run. Everything is marked so cleanup() can wipe it:
  - Institutes:   institute_name ends with " (Seed)"
  - TPO users:    email like  tpo.*@campus-seed.test
  - Candidates:   email like  seedcand.*@campus-seed.test
  - Invites:      campus_invite_name starts with "Seed Drive "
  - Openings:     job_title starts with "Seed Fresher Opening"
  - Requisitions: description contains  [CAMPUS-SEED]

Run:
  bench --site recruitment execute recruitment.campus_seed.run \
      --kwargs "{'regions_to_use':4,'total_institutes':10,'candidates_per_institute':50,'apply_ratio':0.8}"
Spread statuses across the pipeline (Interview/Approvals/Accepted/Rejected):
  bench --site recruitment execute recruitment.campus_seed.advance_pipeline
Cleanup:
  bench --site recruitment execute recruitment.campus_seed.cleanup
"""

import frappe
from frappe.utils import today, add_days

SEED_SUFFIX = " (Seed)"
INVITE_PREFIX = "Seed Drive "
OPENING_PREFIX = "Seed Fresher Opening"
REQ_MARKER = "[CAMPUS-SEED]"
TPO_DOMAIN = "@campus-seed.test"
CAND_PREFIX = "seedcand."

# A clean, reversible numeric metric to drive eligibility knock-out rules. Created
# on Job Applicant if missing (freshers have no salary/experience to test against).
AGG_FIELD = "custom_campus_aggregate"
AGG_PASS_MARK = 60  # aggregate % below this => knocked out to Hold

FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
    "Ayaan", "Krishna", "Ishaan", "Ananya", "Diya", "Aadhya", "Saanvi", "Anika",
    "Navya", "Myra", "Aarohi", "Riya", "Meera", "Rahul", "Rohan", "Karan", "Neha",
    "Pooja", "Sneha", "Kiran", "Priya", "Nikhil", "Varun"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Iyer", "Reddy", "Nair", "Patel",
    "Kumar", "Singh", "Rao", "Menon", "Das", "Bose", "Mehta", "Joshi"]
GENDERS = ["Male", "Female", "Other"]

# Preferred campus application fields (must be real Job Applicant fields). Only
# these are declared view_campus on seeded openings, so these are exactly what the
# application payload may carry.
CAMPUS_FIELDS = [
    ("applicant_name", "Applicant First Name", "Data"),
    ("custom_applicant_last_name", "Applicant Last Name", "Data"),
    ("phone_number", "Phone Number", "Data"),
    ("custom_gender", "Gender", "Select"),
    (AGG_FIELD, "Campus Aggregate %", "Float"),
]

# Eligibility rules stamped on every seeded opening. The knock-out on aggregate
# drives the Hold / "Eligibility Not Met" scenario; the gender rule is a non-fatal
# Flag (candidate still Shortlisted, but the flag is recorded in a comment).
ELIGIBILITY_RULES = [
    {"field_name": AGG_FIELD, "operator": "≥", "value": str(AGG_PASS_MARK), "action": "Knock out"},
    {"field_name": "custom_gender", "operator": "one of", "value": "Female", "action": "Flag"},
]

# Each seeded Campus Invite carries this many Job Openings; candidates may apply to
# any (some apply to more than one).
OPENING_ROLES = ["Software Engineer", "Data Analyst"]

# The hiring workflow every seeded opening ships with. This is what drives the whole
# campus pipeline: a candidate's custom_current_stage walks down this list, so the
# pool for each campus round is simply "who is sitting at that stage". Without it
# get_opening_stages() returns [] and nothing can ever advance.
# (The engine appends the Pre Job Offer / Job Offer stages itself.)
HIRING_STAGES = [
    ("Resume Screening", "Screening"),
    ("Group Discussion", "Interview"),
    ("Technical Round 1", "Interview"),
    ("Technical Round 2", "Interview"),
    ("HR Round", "Interview"),
]


def _pick(dt, filters=None):
    rows = frappe.get_all(dt, filters=filters or {}, pluck="name", limit=1)
    return rows[0] if rows else None


def _log(msg):
    print("[campus_seed] " + msg)


def _ensure_campus_field():
    """Idempotently add the Float `custom_campus_aggregate` field to Job Applicant
    AND register it as a campus-visible row in Job Applicant Profile Settings so the
    campus application form/API will accept it (the opening template only emits
    fields present in default_application_fields)."""
    if not frappe.db.exists("Custom Field", f"Job Applicant-{AGG_FIELD}"):
        insert_after = "custom_gender" if frappe.get_meta("Job Applicant").has_field("custom_gender") else "email_id"
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Job Applicant",
            "fieldname": AGG_FIELD,
            "label": "Campus Aggregate %",
            "fieldtype": "Float",
            "insert_after": insert_after,
        }).insert(ignore_permissions=True)
        frappe.clear_cache(doctype="Job Applicant")

    settings = frappe.get_single("Job Applicant Profile Settings")
    if not any(r.reference_name == AGG_FIELD for r in settings.default_application_fields):
        settings.append("default_application_fields", {
            "section": "Education Details",
            "reference_name": AGG_FIELD,
            "display_name": "Campus Aggregate %",
            "fieldtype": "Float",
            "view_campus": 1, "mandatory_campus": 0,
            "view_careers": 0, "view_ijp": 0, "view_refer": 0, "view_preoffer": 0,
            "visibility": "All", "editability": "Editable",
        })
        settings.save(ignore_permissions=True)


def _aggregate_for(gi, c, oi=0):
    """Deterministic aggregate %: ~30% land below the pass mark. Varies by opening
    index `oi` too, so a candidate can be Shortlisted for one opening and on Hold for
    another."""
    if (c * 3 + gi + oi * 4) % 10 < 3:
        return 50 + ((c + gi + oi) % 9)             # 50-58  -> knocked out (Hold)
    return AGG_PASS_MARK + 2 + ((c * 7 + gi + oi * 5) % 34)  # 62-95 -> passes numeric rule


# Education rows a campus application must carry, cached per opening. HR can demand
# Education Stages (Job Applicant Profile Settings -> Required Education Stages) and
# mandatory columns inside the grid; both are enforced on submit, so the seed has to
# supply them exactly as a real candidate would.
_EDU_RULE_CACHE = {}


def _edu_rule_for(opening):
    """``(fieldname, stage_requirement, mandatory columns)`` for `opening`, or None."""
    if opening not in _EDU_RULE_CACHE:
        from recruitment.api.channels._common import get_application_fields_for_channel

        found = None
        for f in get_application_fields_for_channel(opening, "campus"):
            if f.get("stage_requirement"):
                found = (
                    f["reference_name"],
                    f["stage_requirement"],
                    [c for c in (f.get("table_fields") or []) if c.get("reqd_channel")],
                )
                break
        _EDU_RULE_CACHE[opening] = found
    return _EDU_RULE_CACHE[opening]


def _column_value(column, year):
    """A value the seed can put in a mandatory education column."""
    fieldtype, options = column["fieldtype"], (column.get("options") or "")
    if column["fieldname"] in ("year_of_passing", "custom_passing_year"):
        return year
    if fieldtype == "Select":
        return next((o for o in options.split("\n") if o.strip()), "")
    if fieldtype == "Link":
        picked = frappe.get_all(options, pluck="name", limit=1) if options else []
        return picked[0] if picked else None
    if fieldtype in ("Int", "Float", "Percent", "Currency"):
        return year
    if fieldtype in ("Date", "Datetime"):
        return today()
    if fieldtype == "Check":
        return 0
    return "-"


def _education_for(opening, seed):
    """``{grid fieldname: [row per demanded stage]}`` — merged into the form data. The
    passing years walk backwards from the most recent stage so a candidate's history
    reads in order."""
    rule = _edu_rule_for(opening)
    if not rule:
        return {}
    fieldname, requirement, mandatory_columns = rule
    stages = requirement["required_stages"]
    base_year = 2018 + (seed % 4)
    rows = []
    for i, stage in enumerate(stages):
        year = base_year + i * 2
        row = {requirement["fieldname"]: stage}
        for column in mandatory_columns:
            if column["fieldname"] == requirement["fieldname"]:
                continue
            row[column["fieldname"]] = _column_value(column, year)
        rows.append(row)
    return {fieldname: rows}


def _application_field_rows():
    rows = []
    meta = frappe.get_meta("Job Applicant")
    for ref, label, ftype in CAMPUS_FIELDS:
        if not meta.has_field(ref):
            continue
        rows.append({
            "section": "Basic Details",
            "reference_name": ref,
            "display_name": label,
            "fieldtype": ftype,
            "view_campus": 1,
            "mandatory_campus": 0,
            "view_careers": 1, "view_ijp": 0, "view_refer": 0, "view_preoffer": 0,
            "visibility": "All",
            "editability": "Editable",
        })
    return rows


def run(regions_to_use=4, total_institutes=10, candidates_per_institute=50, apply_ratio=0.8,
        openings_per_invite=2):
    regions_to_use = int(regions_to_use)
    total_institutes = int(total_institutes)
    candidates_per_institute = int(candidates_per_institute)
    apply_ratio = float(apply_ratio)
    openings_per_invite = max(1, int(openings_per_invite))

    # --- No real mail. Patch the symbol every module resolves via frappe.sendmail.
    _orig_sendmail = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None

    summary = {"institutes": [], "tpo_users": [], "requisitions": [], "openings": [],
               "invites": [], "registrations": 0, "candidates": 0,
               "applications_ok": 0, "applications_fail": 0,
               "shortlisted": 0, "hold": 0, "other_status": 0, "errors": []}
    try:
        _ensure_campus_field()
        company = _pick("Company")
        designation = _pick("Designation")
        department = _pick("Department")
        employee = _pick("Employee")
        if not (company and designation and employee):
            raise RuntimeError(f"Missing masters company={company} designation={designation} employee={employee}")
        _log(f"masters: company={company} designation={designation} dept={department} employee={employee}")

        # --- Regions (reuse existing) --------------------------------------
        regions = frappe.get_all("Region", fields=["name", "location_region"], limit=max(regions_to_use, 1))
        if not regions:
            raise RuntimeError("No Region records exist to hang the campus flow on.")
        regions = regions[:regions_to_use]
        _log(f"using regions: {[r.location_region for r in regions]}")

        # --- Institutes (+ one Primary TPO each), round-robin over regions --
        region_institutes = {r.name: [] for r in regions}
        app_field_rows = _application_field_rows()
        for i in range(total_institutes):
            region = regions[i % len(regions)]
            inst_name = f"Seed College {i + 1:02d} - {region.location_region}{SEED_SUFFIX}"
            existing = frappe.db.get_value("Institute", {"institute_name": inst_name}, "name")
            state = region.location_region if frappe.db.exists("State", region.location_region) else None
            tpo_email = f"tpo.{i + 1}{TPO_DOMAIN}"
            tpo_name = f"{FIRST_NAMES[i % len(FIRST_NAMES)]} {LAST_NAMES[i % len(LAST_NAMES)]}"
            if existing:
                inst = existing
            else:
                doc = frappe.new_doc("Institute")
                doc.institute_name = inst_name
                doc.college_short_name = f"SC{i + 1:02d}"
                doc.tier = ["Tier-1", "Tier-2", "Tier-3"][i % 3]
                if state:
                    doc.state = state
                doc.region = region.name
                doc.is_active = 1
                doc.batch_size = 120 + i * 10
                doc.append("tpo_contacts", {
                    "contact_name": tpo_name,
                    "role": "Primary TPO",
                    "email": tpo_email,
                    "phone": f"90000{i + 1:05d}",
                    "invite_status": "Not Invited",
                })
                doc.insert(ignore_permissions=True)
                inst = doc.name
            region_institutes[region.name].append(inst)
            summary["institutes"].append(inst)
        _log(f"institutes ready: {len(summary['institutes'])}")

        # --- Per region: requisition + openings + submitted campus invite ----
        region_openings = {}   # region -> [job_opening, ...]
        region_invite = {}
        for region in regions:
            insts = region_institutes[region.name]
            if not insts:
                continue

            # Region-based fresher requisition (best-effort; opening works without it)
            req_name = None
            try:
                req = frappe.new_doc("Job Requisition")
                req.designation = designation
                req.company = company
                if department:
                    req.department = department
                req.no_of_positions = 10
                req.expected_compensation = 400000
                req.status = "Approved Draft"
                req.requested_by = employee
                req.posting_date = today()
                req.expected_by = add_days(today(), 45)
                req.description = f"{REQ_MARKER} Region-based fresher campus requisition for {region.location_region}."
                if req.meta.has_field("custom_hiring_type"):
                    req.custom_hiring_type = "Fresher"
                if req.meta.has_field("custom_regions"):
                    req.append("custom_regions", {"region": region.name, "no_of_openings": 10})
                req.insert(ignore_permissions=True)
                req_name = req.name
                summary["requisitions"].append(req_name)
            except Exception as e:
                summary["errors"].append(f"requisition[{region.location_region}]: {type(e).__name__}: {e}")

            # Multiple Job Openings per invite (candidates may apply to any)
            openings = []
            for role in OPENING_ROLES[:openings_per_invite]:
                opening = frappe.new_doc("Job Opening")
                opening.job_title = f"{OPENING_PREFIX} - {region.location_region} - {role}"
                opening.designation = designation
                opening.company = company
                if department:
                    opening.department = department
                opening.status = "Open"
                opening.vacancies = 10
                if opening.meta.has_field("custom_hiring_type"):
                    opening.custom_hiring_type = "Fresher"
                # The region lives in the `custom_regions` CHILD table: the
                # set_region_from_regions_table validate hook derives custom_region /
                # custom_region_name from it and nulls them when it's empty, so setting
                # the parent fields directly gets wiped on save.
                if opening.meta.has_field("custom_regions"):
                    opening.append("custom_regions", {"region": region.name,
                                                      "no_of_openings": 10})
                if req_name and opening.meta.has_field("job_requisition"):
                    opening.job_requisition = req_name
                if opening.meta.has_field("custom_application_fields"):
                    for row in app_field_rows:
                        opening.append("custom_application_fields", row)
                if opening.meta.has_field("custom_posting_options"):
                    opening.append("custom_posting_options", {
                        "post_to": "Campus", "status": "Active",
                        "display_from": today(), "display_to": add_days(today(), 30),
                    })
                if opening.meta.has_field("custom_eligibility_rules"):
                    for rule in ELIGIBILITY_RULES:
                        opening.append("custom_eligibility_rules", dict(rule))
                if opening.meta.has_field("custom_hiring_stages"):
                    for (stage_name, stage_type) in HIRING_STAGES:
                        opening.append("custom_hiring_stages", {
                            "stage_name": stage_name, "stage_type": stage_type,
                            "owner_role": "System", "notify": 0, "auto": 1,
                        })
                opening.insert(ignore_permissions=True)
                openings.append(opening.name)
                summary["openings"].append(opening.name)
            region_openings[region.name] = openings

            # Campus Invite: invite ALL institutes of this region + ALL its openings
            invite = frappe.new_doc("Campus Invite")
            invite.campus_invite_name = f"{INVITE_PREFIX}{region.location_region}"
            if invite.meta.has_field("region"):
                invite.region = region.name
            for inst in insts:
                invite.append("institutes", {"institute": inst})
            for op in openings:
                invite.append("job_openings", {"job_opening": op})
            invite.insert(ignore_permissions=True)
            invite.submit()  # provisions Primary TPO Desk users (no email; patched)
            region_invite[region.name] = invite.name
            summary["invites"].append(invite.name)
            for row in frappe.get_all("Institute TPO Contact",
                                      filters={"parenttype": "Institute", "parent": ["in", insts],
                                               "role": "Primary TPO"}, pluck="email"):
                if row and row not in summary["tpo_users"]:
                    summary["tpo_users"].append(row)
        _log(f"invites submitted: {len(summary['invites'])}; TPO users provisioned: {len(summary['tpo_users'])}")

        # --- Per institute: submitted Candidate Registration (>=N candidates) -
        institute_candidates = {}  # inst -> list of (email, first, last, phone, gender, gi, c)
        gi = 0
        for region in regions:
            invite_name = region_invite.get(region.name)
            if not invite_name:
                continue
            for inst in region_institutes[region.name]:
                gi += 1
                cands = []
                for c in range(candidates_per_institute):
                    fn = FIRST_NAMES[(gi + c) % len(FIRST_NAMES)]
                    ln = LAST_NAMES[(gi + c) % len(LAST_NAMES)]
                    email = f"{CAND_PREFIX}{gi:02d}.{c + 1:03d}{TPO_DOMAIN}"
                    phone = f"9{gi:02d}{c + 1:07d}"[:10]
                    gender = GENDERS[(gi + c) % len(GENDERS)]
                    cands.append((email, fn, ln, phone, gender, gi, c))
                institute_candidates[inst] = cands

                # skip if a submitted registration already covers this inst+invite
                dupe = frappe.get_all("Candidate Registration",
                    filters={"campus_invite": invite_name, "institute": inst, "docstatus": 1}, limit=1)
                if dupe:
                    summary["registrations"] += 1
                    summary["candidates"] += len(cands)
                    continue

                reg = frappe.new_doc("Candidate Registration")
                reg.campus_invite = invite_name
                reg.institute = inst
                for (email, fn, ln, phone, gender, gi_, c_) in cands:
                    reg.append("candidates", {
                        "first_name": fn, "last_name": ln, "email_id": email,
                        "mobile_number": phone,
                        "gender": gender if frappe.db.exists("Gender", gender) else None,
                    })
                reg.insert(ignore_permissions=True)
                reg.submit()  # emails candidates (patched no-op)
                summary["registrations"] += 1
                summary["candidates"] += len(cands)
            frappe.db.commit()
        _log(f"registrations submitted: {summary['registrations']}; candidates: {summary['candidates']}")

        # --- Candidates apply via the real campus-invite API ---------------
        from recruitment.api.channels.campus import submit_invite_application
        # The Job Applicant custom_gender Select may allow fewer values than the
        # Gender doctype (e.g. no "Other"); only pass it when it's a valid option.
        _ja_gender_df = frappe.get_meta("Job Applicant").get_field("custom_gender")
        allowed_ja_genders = set(
            (o.strip() for o in (_ja_gender_df.options or "").split("\n") if o.strip())
        ) if _ja_gender_df else set()

        for region in regions:
            invite_name = region_invite.get(region.name)
            openings = region_openings.get(region.name) or []
            if not (invite_name and openings):
                continue
            for inst in region_institutes[region.name]:
                cands = institute_candidates.get(inst, [])
                n_apply = int(round(len(cands) * apply_ratio))
                for (email, fn, ln, phone, gender, gi_, c_) in cands[:n_apply]:
                    # Everyone applies to the first opening; ~40% also apply to a
                    # second — so an institute shows candidates split across openings.
                    apply_to = [(0, openings[0])]
                    if len(openings) > 1 and (c_ * 3 + gi_) % 5 < 2:
                        apply_to.append((1, openings[1]))
                    for (oi, opening) in apply_to:
                        form_data = {
                            "applicant_name": fn,
                            "custom_applicant_last_name": ln,
                            "phone_number": phone,
                            AGG_FIELD: _aggregate_for(gi_, c_, oi),
                            **_education_for(opening, c_ + gi_),
                        }
                        if gender in allowed_ja_genders:
                            form_data["custom_gender"] = gender
                        try:
                            res = submit_invite_application(invite_name, opening, email, form_data)
                            if isinstance(res, dict) and res.get("success"):
                                summary["applications_ok"] += 1
                                st = frappe.db.get_value("Job Applicant", res["data"]["name"], "status")
                                if st == "Shortlisted":
                                    summary["shortlisted"] += 1
                                elif st == "Hold":
                                    summary["hold"] += 1
                                else:
                                    summary["other_status"] += 1
                            else:
                                summary["applications_fail"] += 1
                                if len(summary["errors"]) < 8:
                                    summary["errors"].append(
                                        f"apply {email}: {res.get('message') if isinstance(res, dict) else res}")
                        except Exception as e:
                            frappe.db.rollback()
                            summary["applications_fail"] += 1
                            if len(summary["errors"]) < 8:
                                summary["errors"].append(f"apply {email}: {type(e).__name__}: {e}")
                frappe.db.commit()
        _log(f"applications ok={summary['applications_ok']} fail={summary['applications_fail']}")

        frappe.db.commit()
    finally:
        frappe.sendmail = _orig_sendmail

    _log("================ SUMMARY ================")
    for k in ("institutes", "tpo_users", "requisitions", "openings", "invites"):
        _log(f"{k}: {len(summary[k])}")
    _log(f"registrations: {summary['registrations']}  candidates: {summary['candidates']}")
    _log(f"job_applicants_created: {summary['applications_ok']}  failed: {summary['applications_fail']}")
    _log(f"eligibility outcome -> Shortlisted: {summary['shortlisted']}  "
         f"Hold(Eligibility Not Met): {summary['hold']}  other: {summary['other_status']}")
    if summary["errors"]:
        _log("first errors:")
        for e in summary["errors"]:
            _log("  - " + str(e))
    _log("========================================")
    return summary


# Statuses a shortlisted campus candidate can progress into, with the share of the
# non-Hold pool that lands in each. Anything left over stays "Shortlisted".
PIPELINE_SPREAD = [
    ("Interview", 0.30),
    ("Approvals", 0.12),
    ("Accepted", 0.10),
    ("Rejected", 0.12),
]


def advance_pipeline():
    """Spread the seeded non-Hold candidates across the later pipeline statuses
    (Interview / Approvals / Accepted / Rejected) so every status on the Job Applicant
    status field carries realistic data. Hold candidates are left on Hold.

    Deterministic (index-based) and re-runnable: it always recomputes from the full
    non-Hold pool, so running it twice gives the same distribution.
    """
    names = frappe.get_all(
        "Job Applicant",
        filters={"email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"],
                 "status": ["!=", "Hold"]},
        pluck="name",
        order_by="name asc",
    )
    total = len(names)
    if not total:
        _log("advance_pipeline: no seeded applicants found")
        return {}

    # Build one proportional cycle, then scatter it with a coprime stride so the mix
    # repeats every `cycle` records. Assigning in contiguous blocks instead would give
    # whole institutes / openings a single status (and leave others with none).
    cycle = 50
    block = []
    for status, share in PIPELINE_SPREAD:
        block.extend([status] * int(round(cycle * share)))
    block.extend(["Shortlisted"] * max(0, cycle - len(block)))
    block = block[:cycle]
    stride = 7  # coprime with 50 -> (j*stride) % cycle is a permutation
    pattern = [block[(j * stride) % cycle] for j in range(cycle)]

    counts = {}
    for i, name in enumerate(names):
        status = pattern[i % cycle]
        frappe.db.set_value("Job Applicant", name, "status", status, update_modified=False)
        counts[status] = counts.get(status, 0) + 1
    frappe.db.commit()

    counts["Hold"] = frappe.db.count("Job Applicant", {
        "email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"], "status": "Hold"})
    _log(f"advance_pipeline: {counts}")
    return counts


def cleanup():
    """Delete everything run() created (safe, marker-scoped)."""
    counts = {}

    def _bulk_delete(dt, names, cancel=False):
        n = 0
        for nm in names:
            try:
                if cancel:
                    d = frappe.get_doc(dt, nm)
                    if d.docstatus == 1:
                        d.cancel()
                frappe.delete_doc(dt, nm, ignore_permissions=True, force=True, delete_permanently=True)
                n += 1
            except Exception as e:
                print(f"[campus_seed] cleanup {dt} {nm}: {type(e).__name__}: {e}")
        counts[dt] = counts.get(dt, 0) + n

    # Campus Drives built on seed invites, with their interviews + feedback
    seed_inv = frappe.get_all("Campus Invite",
                              filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"]}, pluck="name")
    drives = list(dict.fromkeys(frappe.get_all(
        "Campus Drive Invite",
        filters={"parenttype": "Campus Drive", "campus_invite": ["in", seed_inv or [""]]},
        pluck="parent")))
    for drive in drives:
        for iv in frappe.get_all("Interview", filters={"custom_campus_drive": drive}, pluck="name"):
            for fb in frappe.get_all("Interview Feedback", filters={"interview": iv}, pluck="name"):
                try:
                    fbd = frappe.get_doc("Interview Feedback", fb)
                    if fbd.docstatus == 1:
                        fbd.cancel()
                except Exception:
                    pass
                _bulk_delete("Interview Feedback", [fb])
            _bulk_delete("Interview", [iv])
    _bulk_delete("Campus Drive", drives)

    # Job Applicants (campus candidates)
    jas = frappe.get_all("Job Applicant", filters={"email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"]}, pluck="name")
    _bulk_delete("Job Applicant", jas)
    # Candidate Registrations against seed invites
    seed_invites = frappe.get_all("Campus Invite", filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"]}, pluck="name")
    regs = frappe.get_all("Candidate Registration", filters={"campus_invite": ["in", seed_invites or [""]]}, pluck="name")
    _bulk_delete("Candidate Registration", regs, cancel=True)
    # Campus Invites
    _bulk_delete("Campus Invite", seed_invites, cancel=True)
    # Job Openings
    ops = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]}, pluck="name")
    _bulk_delete("Job Opening", ops)
    # Job Requisitions (marker in description)
    reqs = frappe.get_all("Job Requisition", filters={"description": ["like", f"%{REQ_MARKER}%"]}, pluck="name")
    _bulk_delete("Job Requisition", reqs, cancel=True)
    # Institutes
    insts = frappe.get_all("Institute", filters={"institute_name": ["like", f"%{SEED_SUFFIX}"]}, pluck="name")
    _bulk_delete("Institute", insts)
    # TPO users
    users = frappe.get_all("User", filters={"email": ["like", f"tpo.%{TPO_DOMAIN}"]}, pluck="name")
    _bulk_delete("User", users)
    # The seed-only Job Applicant field + its Profile Settings row
    try:
        settings = frappe.get_single("Job Applicant Profile Settings")
        rows = [r for r in settings.default_application_fields if r.reference_name != AGG_FIELD]
        if len(rows) != len(settings.default_application_fields):
            settings.set("default_application_fields", rows)
            settings.save(ignore_permissions=True)
    except Exception as e:
        print(f"[campus_seed] cleanup settings row: {type(e).__name__}: {e}")
    if frappe.db.exists("Custom Field", f"Job Applicant-{AGG_FIELD}"):
        _bulk_delete("Custom Field", [f"Job Applicant-{AGG_FIELD}"])

    frappe.db.commit()
    print("[campus_seed] cleanup counts:", counts)
    return counts


def normalize_seed_stages(reset_pool_stage="Group Discussion"):
    """Force every seeded Job Opening onto HIRING_STAGES.

    Openings can pick up a different stage list from the TA Interview Strategy
    Template auto-fetch, which won't contain "Group Discussion" — and a candidate
    whose current stage isn't in their opening's list can never advance. This makes
    the seeded pipeline consistent, then parks the campus candidates on the given
    stage so the GD -> Technical hand-off can run.
    """
    ops = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]}, pluck="name")
    wanted = [s for (s, _t) in HIRING_STAGES]
    changed = 0
    for o in ops:
        doc = frappe.get_doc("Job Opening", o)
        current = [r.stage_name for r in (doc.get("custom_hiring_stages") or [])]
        if current == wanted:
            continue
        doc.set("custom_hiring_stages", [])
        for (stage_name, stage_type) in HIRING_STAGES:
            doc.append("custom_hiring_stages", {
                "stage_name": stage_name, "stage_type": stage_type,
                "owner_role": "System", "notify": 0, "auto": 1,
            })
        doc.save(ignore_permissions=True)
        changed += 1

    staged = 0
    if reset_pool_stage:
        names = frappe.get_all(
            "Job Applicant",
            filters={"email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"], "status": "Shortlisted"},
            pluck="name")
        for n in names:
            frappe.db.set_value("Job Applicant", n, "custom_current_stage", reset_pool_stage,
                                update_modified=False)
        staged = len(names)
    frappe.db.commit()
    _log(f"normalize_seed_stages: openings_updated={changed}/{len(ops)} pool_staged={staged}")
    return {"openings_updated": changed, "openings": len(ops), "pool_staged": staged}


def demo_interview_round(drive_name="Seed Campus Drive (Test)", stage="Technical Round 1",
                         panel_size=2, panels_per_role=2):
    """Wire up a Technical round on the seeded drive so bulk scheduling can be tried:
    pushes GD results, adds the round with its hiring stage, and staffs panels from
    Employees that actually have a User login (Interview needs Users)."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import apply_gd_results

    drive = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
    doc = frappe.get_doc("Campus Drive", drive)

    gd_round = next((r for r in doc.rounds if r.requires_gd_grouping), None)
    pushed = apply_gd_results(drive, gd_round.round_code) if gd_round else {}

    doc = frappe.get_doc("Campus Drive", drive)
    row = next((r for r in doc.rounds if (r.hiring_stage or "") == stage), None)
    if not row:
        doc.append("rounds", {"round_name": stage, "round_type": "Technical", "hiring_stage": stage})
        doc.save(ignore_permissions=True)
        doc = frappe.get_doc("Campus Drive", drive)
        row = next(r for r in doc.rounds if (r.hiring_stage or "") == stage)

    interviewers = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                                  pluck="name", limit=panel_size * panels_per_role * 2)
    roles = [r.job_opening for r in doc.linked_job_openings][:panels_per_role]
    doc.set("round_panelists", [p for p in (doc.round_panelists or []) if p.round_code != row.round_code])
    i = 0
    for ri, role in enumerate(roles, start=1):
        for p in range(1, panels_per_role + 1):
            for _s in range(panel_size):
                if i >= len(interviewers):
                    break
                doc.append("round_panelists", {
                    "round_code": row.round_code, "panelist": interviewers[i],
                    "panel_name": f"Panel {ri}{chr(64 + p)}", "job_opening": role,
                })
                i += 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    _log(f"demo_interview_round: gd_push={pushed} round={row.round_code} panelists={i}")
    return {"drive": drive, "round_code": row.round_code, "gd": pushed, "panelists": i}


def demo_submit_feedback(interview=None, result="Cleared"):
    """Submit Interview Feedback from EVERY panel member on one interview, to prove the
    chain: feedback -> majority verdict -> hiring stage advances."""
    drive = frappe.db.get_value("Campus Drive", {"drive_name": "Seed Campus Drive (Test)"}, "name")
    if not interview:
        rows = frappe.get_all("Interview", filters={
            "custom_campus_drive": drive, "status": "Pending", "docstatus": ["<", 2]}, limit=1)
        if not rows:
            return {"error": "no pending campus interview"}
        interview = rows[0].name

    doc = frappe.get_doc("Interview", interview)
    ja = doc.job_applicant
    before = frappe.db.get_value("Job Applicant", ja, "custom_current_stage")
    skill = "Communication"
    if not frappe.db.exists("Skill", skill):
        frappe.get_doc({"doctype": "Skill", "skill_name": skill}).insert(ignore_permissions=True)
    made = []
    for row in doc.interview_details:
        if frappe.db.exists("Interview Feedback", {"interview": interview,
                                                   "interviewer": row.interviewer, "docstatus": 1}):
            continue
        fb = frappe.new_doc("Interview Feedback")
        fb.interview = interview
        fb.interview_round = doc.interview_round
        fb.interviewer = row.interviewer
        fb.job_applicant = ja
        fb.result = result
        fb.feedback = "Auto-generated demo feedback."
        fb.append("skill_assessment", {"skill": skill, "rating": 0.8})
        fb.flags.ignore_permissions = True
        fb.insert(ignore_permissions=True)
        fb.submit()
        made.append(fb.name)
    frappe.db.commit()

    out = {
        "interview": interview, "job_applicant": ja, "feedback_created": len(made),
        "interview_status": frappe.db.get_value("Interview", interview, "status"),
        "stage_before": before,
        "stage_after": frappe.db.get_value("Job Applicant", ja, "custom_current_stage"),
        "applicant_status": frappe.db.get_value("Job Applicant", ja, "status"),
    }
    _log(f"demo_submit_feedback: {out}")
    return out


def demo_verify_round_features():
    """Exercise the four new round features against the seeded drive."""
    from frappe.utils import today
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_drive_stage_options, get_round_pool, schedule_round_interviews,
        nudge_pending_feedback, add_candidate_interview)
    d = frappe.db.get_value("Campus Drive", {"drive_name": "Seed Campus Drive (Test)"}, "name")
    out = {}
    out["stage_options"] = get_drive_stage_options(d)
    pool = get_round_pool(d, "R2")
    out["pool_now"] = len(pool["pool"])
    # selective scheduling: pick just 3 of the remaining pool
    picked = [p["name"] for p in pool["pool"][:3]]
    if picked:
        out["selective"] = schedule_round_interviews(
            d, "R2", scheduled_on=today(), applicants=picked)
        out["selective"] = {k: v for k, v in out["selective"].items() if k != "skipped"}
    out["nudge"] = nudge_pending_feedback(d, "R2")
    ja = frappe.get_all("Job Applicant", filters={
        "email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"]}, pluck="name", limit=1)
    if ja:
        # An additional round is only offered to someone who cleared the round, and its
        # type is fixed — HR supplies the candidate, panel, date and reason. It is
        # staffed on its OWN roster (R2 -> R2-EXTRA), so read the panel from there.
        from recruitment.recruitment.doctype.campus_drive.campus_drive import (
            extra_panel_round_code,
        )

        panel = frappe.db.get_value(
            "Campus Drive Round Panelist",
            {"parent": d, "round_code": extra_panel_round_code("R2")}, "panel_name")
        try:
            out["extra_round"] = add_candidate_interview(
                d, ja[0], today(), round_code="R2", panel=panel,
                reason="Seed check: second look after R2")
        except Exception as e:
            out["extra_round"] = f"{type(e).__name__}: {str(e)[:120]}"
    _log(f"demo_verify_round_features: {out}")
    return out


def demo_verify_selective():
    """Prove selective bulk scheduling: with N waiting, scheduling a chosen 3 creates
    exactly 3 interviews and leaves the rest still waiting."""
    from frappe.utils import today
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_round_pool, schedule_round_interviews)
    d = frappe.db.get_value("Campus Drive", {"drive_name": "Seed Campus Drive (Test)"}, "name")
    doc = frappe.get_doc("Campus Drive", d)

    stage = "HR Round"
    row = next((r for r in doc.rounds if (r.hiring_stage or "") == stage), None)
    if not row:
        doc.append("rounds", {"round_name": stage, "round_type": "HR", "hiring_stage": stage})
        doc.save(ignore_permissions=True)
        doc = frappe.get_doc("Campus Drive", d)
        row = next(r for r in doc.rounds if (r.hiring_stage or "") == stage)
        # reuse the technical panels for this round
        src = [p for p in doc.round_panelists if p.round_code == "R2"][:2]
        for p in src:
            doc.append("round_panelists", {"round_code": row.round_code,
                                           "panelist": p.panelist, "panel_name": "HR Panel"})
        doc.save(ignore_permissions=True)

    # park 5 candidates OF THIS DRIVE at the HR Round stage
    invites = [r.campus_invite for r in doc.campus_invites if r.campus_invite]
    names = frappe.get_all("Job Applicant", filters={
        "custom_campus_invite": ["in", invites]}, pluck="name", limit=5)
    for n in names:
        frappe.db.set_value("Job Applicant", n, "custom_current_stage", stage, update_modified=False)
    frappe.db.commit()

    before = get_round_pool(d, row.round_code)
    picked = [p["name"] for p in before["pool"][:3]]
    res = schedule_round_interviews(d, row.round_code, scheduled_on=today(),
                                    applicants=picked)
    after = get_round_pool(d, row.round_code)
    out = {
        "round": row.round_code, "pool_before": len(before["pool"]),
        "picked": len(picked), "created": res["created"],
        "skipped": res["skipped_count"], "pool_after": len(after["pool"]),
        "already_scheduled_after": after["already_scheduled"],
        "PASS": res["created"] == len(picked) and len(after["pool"]) == len(before["pool"]) - len(picked),
    }
    _log(f"demo_verify_selective: {out}")
    return out


def demo_query_profile():
    """Count real SQL queries per campus-drive endpoint, to catch N+1 regressions."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_drive_breakdown, get_rounds_overview, get_round_pool, nudge_pending_feedback)
    d = frappe.db.get_value("Campus Drive", {"drive_name": "Seed Campus Drive (Test)"}, "name")

    def count(label, fn):
        frappe.db._campus_n = 0
        orig = frappe.db.sql
        def counting(*a, **k):
            frappe.db._campus_n += 1
            return orig(*a, **k)
        frappe.db.sql = counting
        try:
            fn()
        finally:
            frappe.db.sql = orig
        return (label, frappe.db._campus_n)

    out = dict([
        count("get_drive_breakdown", lambda: get_drive_breakdown(d)),
        count("get_rounds_overview", lambda: get_rounds_overview(d)),
        count("get_round_pool(R2)", lambda: get_round_pool(d, "R2")),
        count("nudge_pending_feedback(R2)", lambda: nudge_pending_feedback(d, "R2")),
    ])
    _log(f"demo_query_profile: {out}")
    return out


def demo_query_hotspots(endpoint="get_drive_breakdown"):
    """Show the most-repeated SQL for one endpoint, to pinpoint N+1 sources."""
    import re as _re
    from collections import Counter
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_drive_breakdown, get_rounds_overview, nudge_pending_feedback)
    d = frappe.db.get_value("Campus Drive", {"drive_name": "Seed Campus Drive (Test)"}, "name")
    fns = {"get_drive_breakdown": lambda: get_drive_breakdown(d),
           "get_rounds_overview": lambda: get_rounds_overview(d),
           "nudge_pending_feedback": lambda: nudge_pending_feedback(d, "R2")}
    seen = []
    orig = frappe.db.sql
    def cap(query, *a, **k):
        q = str(query)
        q = _re.sub(r"'[^']*'", "?", q)
        q = _re.sub(r"\s+", " ", q).strip()[:110]
        seen.append(q)
        return orig(query, *a, **k)
    frappe.db.sql = cap
    try:
        fns[endpoint]()
    finally:
        frappe.db.sql = orig
    top = Counter(seen).most_common(6)
    _log(f"demo_query_hotspots[{endpoint}] total={len(seen)}")
    for q, n in top:
        _log(f"   x{n:4d}  {q}")
    return {"total": len(seen), "top": top}


def walkthrough_report():
    """Print what exists at each stage of the campus flow, in flow order, with record
    IDs — so the chain Requisition -> Opening -> Invite -> Registration -> Applicant
    can be followed record by record."""
    reqs = frappe.get_all("Job Requisition", filters={"description": ["like", f"%{REQ_MARKER}%"]},
                          fields=["name", "designation", "no_of_positions", "status"],
                          order_by="creation asc")
    ops = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]},
                         fields=["name", "job_title", "job_requisition", "custom_region_name",
                                 "status", "vacancies"], order_by="creation asc")
    insts = frappe.get_all("Institute", filters={"institute_name": ["like", f"%{SEED_SUFFIX}"]},
                           fields=["name", "institute_name", "region", "tier"], order_by="creation asc")
    invs = frappe.get_all("Campus Invite", filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"]},
                          fields=["name", "campus_invite_name", "region", "status", "docstatus"],
                          order_by="creation asc")
    regs = frappe.get_all("Candidate Registration", filters={"campus_invite": ["in", [i.name for i in invs] or [""]]},
                          fields=["name", "campus_invite", "institute", "docstatus"], order_by="creation asc")
    jas = frappe.get_all("Job Applicant", filters={"email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"]},
                         fields=["name", "job_title", "custom_institute", "custom_campus_invite",
                                 "status", "custom_current_stage"], order_by="creation asc")

    inv_inst = {}
    for r in frappe.get_all("Campus Invite Institute",
                            filters={"parent": ["in", [i.name for i in invs] or [""]]},
                            fields=["parent", "institute"]):
        inv_inst.setdefault(r.parent, []).append(r.institute)
    inv_ops = {}
    for r in frappe.get_all("Campus Invite Job Opening",
                            filters={"parent": ["in", [i.name for i in invs] or [""]]},
                            fields=["parent", "job_opening"]):
        inv_ops.setdefault(r.parent, []).append(r.job_opening)
    reg_counts = {}
    # Counted in Python: a SQL aggregate in `fields` is rejected by Frappe v16.
    for r in frappe.get_all("Candidate Registration Detail",
                            filters={"parent": ["in", [r.name for r in regs] or [""]]},
                            fields=["parent"], limit_page_length=0):
        reg_counts[r.parent] = reg_counts.get(r.parent, 0) + 1

    _log("=" * 78)
    _log(f"STEP 1 — JOB REQUISITIONS (campus / fresher, region-based): {len(reqs)}")
    for r in reqs:
        _log(f"    {r.name}  positions={r.no_of_positions}  status={r.status}")
    _log(f"STEP 2 — JOB OPENINGS (against those requisitions): {len(ops)}")
    for o in ops:
        _log(f"    {o.name}  req={o.job_requisition}  region={o.custom_region_name}  {o.job_title}")
    _log(f"STEP 3 — INSTITUTES (+1 Primary TPO each): {len(insts)}")
    for i in insts:
        _log(f"    {i.name}  {i.institute_name}  region={i.region}  {i.tier}")
    _log(f"STEP 4 — CAMPUS INVITES (institutes + openings, submitted): {len(invs)}")
    for v in invs:
        _log(f"    {v.name}  {v.campus_invite_name}  status={v.status} docstatus={v.docstatus}"
             f"  institutes={inv_inst.get(v.name, [])}  openings={inv_ops.get(v.name, [])}")
    _log(f"STEP 5 — CANDIDATE REGISTRATIONS (by TPO, submitted): {len(regs)}")
    for r in regs:
        _log(f"    {r.name}  invite={r.campus_invite}  institute={r.institute}"
             f"  candidates={reg_counts.get(r.name, 0)}  docstatus={r.docstatus}")
    _log(f"STEP 6 — JOB APPLICANTS (applied via campus invite): {len(jas)}")
    from collections import Counter
    _log(f"    by status: {dict(Counter(j.status for j in jas))}")
    _log(f"    by stage : {dict(Counter(j.custom_current_stage or '<none>' for j in jas))}")
    for j in jas[:5]:
        _log(f"    e.g. {j.name}  opening={j.job_title}  institute={j.custom_institute}"
             f"  invite={j.custom_campus_invite}  status={j.status}")
    _log("=" * 78)
    return {"requisitions": len(reqs), "openings": len(ops), "institutes": len(insts),
            "invites": len(invs), "registrations": len(regs), "applicants": len(jas)}


def fix_opening_regions():
    """Backfill the region on seeded openings via the `custom_regions` child table.

    custom_region / custom_region_name on the parent are derived by the
    set_region_from_regions_table validate hook — writing them directly is pointless.
    """
    ops = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]},
                         fields=["name", "job_requisition"])
    fixed = 0
    for o in ops:
        doc = frappe.get_doc("Job Opening", o.name)
        if doc.get("custom_regions"):
            continue
        rows = frappe.get_all("Job Requisition Region",
                              filters={"parent": o.job_requisition, "parenttype": "Job Requisition"},
                              fields=["region", "no_of_openings"]) if o.job_requisition else []
        if not rows:
            continue
        for r in rows:
            doc.append("custom_regions", {"region": r.region, "no_of_openings": r.no_of_openings})
        doc.save(ignore_permissions=True)
        fixed += 1
    frappe.db.commit()
    out = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]},
                         fields=["name", "custom_region", "custom_region_name"])
    _log(f"fix_opening_regions: fixed={fixed}")
    for r in out:
        _log(f"    {r.name}  region={r.custom_region}  name={r.custom_region_name}")
    return {"fixed": fixed}


def create_walkthrough_drive(drive_name="Campus Drive 2026 - Walkthrough"):
    """Create ONE Campus Drive merging every seeded Campus Invite.

    Rounds are deliberately left empty — add them on the form (Group Discussion,
    Technical, HR) and the Round Tracking board takes over from there. The drive's
    own validate() pulls each invite's institutes and openings in automatically.
    """
    existing = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
    if existing:
        _log(f"create_walkthrough_drive: {drive_name} already exists -> {existing}")
        return {"drive": existing, "created": False}

    invites = frappe.get_all(
        "Campus Invite",
        filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"], "docstatus": 1},
        fields=["name", "campus_invite_name"], order_by="creation asc")
    if not invites:
        _log("create_walkthrough_drive: no submitted seed invites found")
        return {"error": "no submitted seed invites"}

    doc = frappe.new_doc("Campus Drive")
    doc.drive_name = drive_name
    doc.drive_status = "Live"
    doc.drive_owner = "Administrator"
    doc.drive_start_date = today()
    doc.drive_end_date = add_days(today(), 30)
    for i in invites:
        doc.append("campus_invites", {"campus_invite": i.name,
                                      "campus_invite_name": i.campus_invite_name})
    _append_available_institutes(doc, [i.name for i in invites])
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    doc.reload()
    _log("=" * 74)
    _log(f"CAMPUS DRIVE CREATED: {doc.name}  ({drive_name})")
    _log(f"  window: {doc.drive_start_date} -> {doc.drive_end_date}   status: {doc.drive_status}")
    _log(f"  campus invites merged ({len(doc.campus_invites)}):")
    for r in doc.campus_invites:
        _log(f"      {r.campus_invite}  {r.campus_invite_name}")
    _log(f"  participating institutes ({len(doc.participating_institutes)}):")
    for r in doc.participating_institutes:
        _log(f"      {r.institute}")
    _log(f"  linked job openings auto-pulled ({len(doc.linked_job_openings)}):")
    for r in doc.linked_job_openings:
        _log(f"      {r.job_opening}  {r.job_title}")
    _log(f"  rounds: {len(doc.rounds)}  (add these yourself: GD / Technical / HR)")
    _log("=" * 74)
    return {"drive": doc.name, "created": True,
            "invites": len(doc.campus_invites),
            "institutes": len(doc.participating_institutes),
            "openings": len(doc.linked_job_openings)}


def _append_available_institutes(doc, invites):
    """Put the invites' colleges on a drive explicitly.

    Campus Drive no longer copies them in: HR picks which colleges a drive runs,
    because the drives are sized by candidate count. A seed wants the whole set, so
    it asks for it — skipping any college a live drive has already claimed, which is
    what the drive's own validation would refuse.
    """
    from recruitment.recruitment.campus_helpers import live_drive_institutes
    from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

    taken = live_drive_institutes(invites)
    seen = set()
    for invite in invites:
        for institute in get_invite_institutes(invite):
            if institute in seen or institute in taken:
                continue
            seen.add(institute)
            doc.append("participating_institutes", {"institute": institute})
    return sorted(seen)


def create_region_drives():
    """One Campus Drive PER REGION, merging only that region's invites.

    A drive is a physical visit to one region's colleges, so it must never span
    regions — it merges the invites of a single region, and through them that
    region's institutes.
    """
    invites = frappe.get_all(
        "Campus Invite",
        filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"], "docstatus": 1},
        fields=["name", "campus_invite_name", "region"], order_by="creation asc")
    if not invites:
        return {"error": "no submitted seed invites"}

    labels = {r.name: r.location_region for r in frappe.get_all(
        "Region", filters={"name": ["in", list({i.region for i in invites if i.region})] or [""]},
        fields=["name", "location_region"])}

    by_region, order = {}, []
    for i in invites:
        key = i.region or ""
        if key not in by_region:
            by_region[key] = []
            order.append(key)
        by_region[key].append(i)

    made = []
    for region in order:
        label = labels.get(region, region or "Unassigned")
        drive_name = f"Campus Drive 2026 - {label}"
        existing = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
        if existing:
            made.append((existing, drive_name, "exists"))
            continue
        doc = frappe.new_doc("Campus Drive")
        doc.drive_name = drive_name
        doc.drive_status = "Live"
        doc.drive_owner = "Administrator"
        doc.drive_start_date = today()
        doc.drive_end_date = add_days(today(), 30)
        for i in by_region[region]:
            doc.append("campus_invites", {"campus_invite": i.name,
                                          "campus_invite_name": i.campus_invite_name})
        _append_available_institutes(doc, [i.name for i in by_region[region]])
        doc.insert(ignore_permissions=True)
        made.append((doc.name, drive_name, "created"))
    frappe.db.commit()

    _log("=" * 76)
    _log(f"CAMPUS DRIVES — one per region ({len(made)})")
    for (name, label, state) in made:
        d = frappe.get_doc("Campus Drive", name)
        _log(f"  {name}  {label}  [{state}]")
        _log(f"      invites   : {[r.campus_invite for r in d.campus_invites]}")
        _log(f"      institutes: {[r.institute for r in d.participating_institutes]}")
        _log(f"      openings  : {[r.job_opening for r in d.linked_job_openings]}")
    _log("=" * 76)
    return {"drives": [m[0] for m in made]}


def demo_panel_flow(drive_name="Campus Drive 2026 - Karnataka", round_code="R2",
                    stage="Technical Round 1", panels=3, per_panel_interviewers=1):
    """Exercise the CORRECTED interview flow: define panels, assign candidates across
    them (which creates one standard Interview per candidate with that panel's
    interviewers), then submit feedback so the verdict advances the candidate. The
    drive only displays status — it never marks Pass/Fail itself."""
    from frappe.utils import today
    from collections import Counter
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        schedule_round_interviews, get_round_interviews)

    d = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
    doc = frappe.get_doc("Campus Drive", d)
    inv = [r.campus_invite for r in doc.campus_invites]

    names = frappe.get_all("Job Applicant",
                           filters={"custom_campus_invite": ["in", inv]}, pluck="name", limit=30)
    for n in names:
        frappe.db.set_value("Job Applicant", n, "custom_current_stage", stage, update_modified=False)

    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=panels * per_panel_interviewers)
    doc = frappe.get_doc("Campus Drive", d)
    doc.set("round_panelists", [p for p in doc.round_panelists if p.round_code != round_code])
    i = 0
    for pnum in range(1, panels + 1):
        for _s in range(per_panel_interviewers):
            if i >= len(emps):
                break
            doc.append("round_panelists", {"round_code": round_code, "panelist": emps[i],
                                           "panel_name": f"Panel {pnum}"})
            i += 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    res = schedule_round_interviews(d, round_code, scheduled_on=today())
    view = get_round_interviews(d, round_code)
    panel_sizes = {p["panel"]: len(p["candidates"]) for p in view["panels"] if p["candidates"]}
    out = {"scheduled": {k: v for k, v in res.items() if k != "skipped"},
           "panel_sizes": panel_sizes, "total_interviews": view["total_interviews"]}
    _log(f"demo_panel_flow: {out}")
    return out


def clear_interview_batches(drive_name=None):
    """Remove the mistaken GD-style panel batches (gd_group_members/gd_groups) from
    NON-GD rounds — the corrected flow uses real Interview records, not batch marking.
    Leaves the actual Group Discussion round's groups intact."""
    drives = ([frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")]
              if drive_name else
              frappe.get_all("Campus Drive", pluck="name"))
    cleared = 0
    for d in filter(None, drives):
        doc = frappe.get_doc("Campus Drive", d)
        gd_codes = {r.round_code for r in doc.rounds if r.requires_gd_grouping}
        before_g, before_m = len(doc.gd_groups), len(doc.gd_group_members)
        doc.set("gd_groups", [g for g in doc.gd_groups if g.round_code in gd_codes])
        doc.set("gd_group_members", [m for m in doc.gd_group_members if m.round_code in gd_codes])
        if len(doc.gd_groups) != before_g or len(doc.gd_group_members) != before_m:
            doc.save(ignore_permissions=True)
            cleared += 1
    frappe.db.commit()
    _log(f"clear_interview_batches: cleaned {cleared} drives")
    return {"drives_cleaned": cleared}


def demo_perf_check(drive="DRV-2026-2981", round_code="R2"):
    """Query-count each campus-drive read endpoint + a bulk schedule, to confirm no
    N+1 (query count should NOT scale with candidate/interview count)."""
    from frappe.utils import today
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_rounds_overview, get_round_interviews, get_round_pool,
        schedule_round_interviews)

    def q(label, fn):
        state = {"n": 0}
        orig = frappe.db.sql
        def cap(*a, **k):
            state["n"] += 1
            return orig(*a, **k)
        frappe.db.sql = cap
        try:
            out = fn()
        finally:
            frappe.db.sql = orig
        return state["n"], out

    r1, _ = q("rounds_overview", lambda: get_rounds_overview(drive))
    r2, _ = q("round_interviews", lambda: get_round_interviews(drive, round_code))
    r3, _ = q("round_pool", lambda: get_round_pool(drive, round_code))

    # park 6 candidates and schedule, then park 12 and schedule — queries should grow
    # only ~linearly with inserts (unavoidable), NOT quadratically.
    doc = frappe.get_doc("Campus Drive", drive)
    inv = [x.campus_invite for x in doc.campus_invites]

    # free up 6 candidates: clear any existing interviews of theirs for this round
    names = frappe.get_all("Job Applicant", filters={"custom_campus_invite": ["in", inv]},
                           pluck="name", limit=6)
    for iv in frappe.get_all("Interview", filters={"custom_campus_drive": drive,
                             "custom_campus_round_code": round_code,
                             "job_applicant": ["in", names]}, pluck="name"):
        frappe.delete_doc("Interview", iv, force=True, ignore_permissions=True)
    for nm in names:
        frappe.db.set_value("Job Applicant", nm, "custom_current_stage",
                            "Technical Round 1", update_modified=False)
    frappe.db.commit()
    n6, res6 = q("schedule", lambda: schedule_round_interviews(drive, round_code, scheduled_on=today()))
    out = {"rounds_overview_q": r1, "round_interviews_q": r2, "round_pool_q": r3,
           "schedule_q": n6, "schedule_created": res6["created"],
           "schedule_q_per_interview": round(n6 / max(res6["created"], 1), 1)}
    _log(f"demo_perf_check: {out}")
    return out


def demo_ro_hotspots(drive="DRV-2026-2981"):
    import re as _re
    from collections import Counter
    from recruitment.recruitment.doctype.campus_drive.campus_drive import get_rounds_overview
    seen=[]; orig=frappe.db.sql
    def cap(q,*a,**k):
        t=_re.sub(r"'[^']*'","?",str(q)); t=_re.sub(r"\s+"," ",t).strip()[:80]; seen.append(t); return orig(q,*a,**k)
    frappe.db.sql=cap
    try: get_rounds_overview(drive)
    finally: frappe.db.sql=orig
    _log(f"demo_ro_hotspots total={len(seen)} distinct={len(set(seen))}")
    for q,n in Counter(seen).most_common(6): _log(f"  x{n:3d} {q}")
    return {"total":len(seen),"distinct":len(set(seen))}


def demo_clear_advances_next_round(drive="DRV-2026-2980"):
    """Prove: clearing a Technical Round 1 interview moves the candidate into the
    Technical Round 2 round's 'waiting'."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import get_rounds_overview
    doc = frappe.get_doc("Campus Drive", drive)
    # ensure a Technical Round 2 round exists
    if not any((r.hiring_stage or "") == "Technical Round 2" for r in doc.rounds):
        doc.append("rounds", {"round_name": "T2", "round_type": "Technical",
                              "hiring_stage": "Technical Round 2"})
        doc.save(ignore_permissions=True)
    t2_before = next(r["waiting"] for r in get_rounds_overview(drive)["rounds"]
                     if r["hiring_stage"] == "Technical Round 2")

    iv = frappe.get_all("Interview", filters={"custom_campus_drive": drive,
                        "custom_campus_round_code": "R2", "status": "Pending"},
                        fields=["name", "job_applicant"], limit=1)
    if not iv:
        return {"error": "no pending R2 interview"}
    stage_before = frappe.db.get_value("Job Applicant", iv[0].job_applicant, "custom_current_stage")
    res = demo_submit_feedback(interview=iv[0].name, result="Cleared")
    t2_after = next(r["waiting"] for r in get_rounds_overview(drive)["rounds"]
                    if r["hiring_stage"] == "Technical Round 2")
    out = {"cleared_interview": iv[0].name, "stage_before": stage_before,
           "stage_after": res["stage_after"], "interview_status": res["interview_status"],
           "T2_waiting_before": t2_before, "T2_waiting_after": t2_after}
    _log(f"demo_clear_advances_next_round: {out}")
    return out


def demo_debug_advance(interview="HR-INT-2026-0168"):
    """Directly run the stage-advance for a cleared interview and surface any error the
    live hook was swallowing."""
    import traceback
    from recruitment.api.hiring_stage import (
        get_opening_stages, _find_stage, _enter_stage, advance_on_interview_result)
    iv = frappe.get_doc("Interview", interview)
    ja = frappe.get_doc("Job Applicant", iv.job_applicant)
    st = get_opening_stages(ja.job_title)
    idx = _find_stage(st, ja.custom_current_stage)
    out = {"iv_status": iv.status, "stage_before": ja.custom_current_stage, "idx": idx}
    try:
        advance_on_interview_result(interview)
        out["after_advance_fn"] = frappe.db.get_value("Job Applicant", ja.name, "custom_current_stage")
    except Exception:
        out["advance_fn_error"] = traceback.format_exc()[-400:]
    if idx >= 0 and idx + 1 < len(st):
        try:
            _enter_stage(ja, st[idx + 1], result="Auto (Cleared)", interview=interview,
                         ignore_permissions=True)
            out["after_enter_stage"] = frappe.db.get_value("Job Applicant", ja.name, "custom_current_stage")
        except Exception:
            out["enter_stage_error"] = traceback.format_exc()[-500:]
    _log(f"demo_debug_advance: {out}")
    return out


def fix_stale_marital_status():
    """Repair seeded Job Applicants whose custom_marital_status holds a value no longer
    in the field's Select options (e.g. 'Unmarried' after it was renamed to 'Single').
    A stale Select value makes EVERY full save of the record fail, which silently
    blocks the interview stage-advance. Uses db.set_value to bypass validation."""
    df = frappe.get_meta("Job Applicant").get_field("custom_marital_status")
    valid = {o.strip() for o in (df.options or "").split("\n")}
    target = "Single" if "Single" in valid else ""
    rows = frappe.get_all("Job Applicant",
                          filters={"email_id": ["like", f"{CAND_PREFIX}%{TPO_DOMAIN}"]},
                          fields=["name", "custom_marital_status"])
    fixed = 0
    for r in rows:
        if (r.custom_marital_status or "") not in valid:
            frappe.db.set_value("Job Applicant", r.name, "custom_marital_status", target,
                                update_modified=False)
            fixed += 1
    frappe.db.commit()
    _log(f"fix_stale_marital_status: valid={sorted(valid)} target={target!r} fixed={fixed}")
    return {"fixed": fixed, "target": target}


def demo_health_check(drive="DRV-2026-2980"):
    """Verify the Drive Health Check catches the misconfigurations that used to be
    silent: a round mapped to a non-existent stage, and a candidate stranded on an
    orphan stage."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import get_rounds_overview
    doc = frappe.get_doc("Campus Drive", drive)
    inv = [r.campus_invite for r in doc.campus_invites]

    # 1) baseline
    base = get_rounds_overview(drive)["health"]

    # 2) add a round mapped to a stage no opening has
    if not any((r.hiring_stage or "") == "Nonexistent Stage" for r in doc.rounds):
        doc.append("rounds", {"round_name": "Bogus", "round_type": "Technical",
                              "hiring_stage": "Nonexistent Stage"})
        doc.save(ignore_permissions=True)

    # 3) strand a candidate on an orphan stage
    victim = frappe.get_all("Job Applicant", filters={"custom_campus_invite": ["in", inv]},
                            pluck="name", limit=1)[0]
    frappe.db.set_value("Job Applicant", victim, "custom_current_stage", "Ghost Stage",
                        update_modified=False)
    frappe.db.set_value("Job Applicant", victim, "status", "Open", update_modified=False)
    frappe.db.commit()

    after = get_rounds_overview(drive)["health"]
    _log(f"demo_health_check baseline_issues={len(base)}")
    for h in after:
        _log(f"  [{h['level']}] {h['title']} :: {h['detail'][:70]}")
    return {"baseline": len(base), "after": len(after)}


def demo_offer_flow(drive="DRV-2026-2980"):
    """Park 2 candidates at the Offer round's stage and raise Job Offers, to verify
    the offer-round flow (get_offer_candidates + create_offers_for_candidates)."""
    import traceback
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_offer_candidates, create_offers_for_candidates)
    doc = frappe.get_doc("Campus Drive", drive)
    if not any((r.round_type or "") == "Offer" for r in doc.rounds):
        doc.append("rounds", {"round_name": "Offer", "round_type": "Offer", "hiring_stage": "HR Round"})
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        doc = frappe.get_doc("Campus Drive", drive)
    oround = next(r.round_code for r in doc.rounds if (r.round_type or "") == "Offer")
    stage = next(r.hiring_stage for r in doc.rounds if r.round_code == oround)
    inv = [r.campus_invite for r in doc.campus_invites]
    names = frappe.get_all("Job Applicant", filters={"custom_campus_invite": ["in", inv]},
                           pluck="name", limit=2)
    for n in names:
        frappe.db.set_value("Job Applicant", n, "custom_current_stage", stage, update_modified=False)
        frappe.db.set_value("Job Applicant", n, "status", "Open", update_modified=False)
    frappe.db.commit()
    out = {"offer_round": oround, "stage": stage}
    oc = get_offer_candidates(drive, oround)
    out["candidates"] = [(c["applicant_name"], c["has_offer"]) for c in oc["candidates"]]
    picked = [c["name"] for c in oc["candidates"] if not c["has_offer"]]
    try:
        out["create_result"] = create_offers_for_candidates(drive, frappe.as_json(picked))
    except Exception:
        out["create_error"] = traceback.format_exc()[-500:]
    out["offers"] = frappe.get_all("Job Offer", filters={"job_applicant": ["in", picked or [""]]},
                                   fields=["name", "job_applicant", "status", "company"])
    _log(f"demo_offer_flow: {out}")
    return out


def create_ready_drive(drive_name="Campus Drive 2026 - DEMO (ready)"):
    """Create a Campus Drive fully set up for HR to run the flow: rounds aligned to the
    opening's stages, and panels/interviewers pre-loaded. Everything after this (GD
    grouping, scheduling, feedback, offers) is left for the user to do.
    """
    existing = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
    if existing:
        frappe.delete_doc("Campus Drive", existing, force=True, ignore_permissions=True)

    inv = frappe.get_all("Campus Invite",
                         filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"], "docstatus": 1},
                         fields=["name", "campus_invite_name"], order_by="creation desc", limit=1)
    if not inv:
        return {"error": "no submitted seed invite — run campus_seed.run first"}
    invite = inv[0]

    doc = frappe.new_doc("Campus Drive")
    doc.drive_name = drive_name
    doc.drive_status = "Live"
    doc.drive_owner = "Administrator"
    doc.drive_start_date = today()
    doc.drive_end_date = add_days(today(), 30)
    doc.append("campus_invites", {"campus_invite": invite.name,
                                  "campus_invite_name": invite.campus_invite_name})

    # Rounds aligned to the seeded opening's stages (so the pipeline flows cleanly):
    #   GD -> Technical Round 1 -> Technical Round 2 -> HR Round -> Offer
    rounds = [
        ("Group Discussion", "Group Discussion", "Group Discussion"),
        ("Technical Round 1", "Technical", "Technical Round 1"),
        ("Technical Round 2", "Technical", "Technical Round 2"),
        ("HR Round", "HR", "HR Round"),
        ("Offer", "Offer", "Pre Job Offer"),
    ]
    for (rname, rtype, stage) in rounds:
        doc.append("rounds", {"round_name": rname, "round_type": rtype, "hiring_stage": stage})

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    doc = frappe.get_doc("Campus Drive", doc.name)

    # Panelists: 3 panels for each interview round (Technical R1/R2, HR), each with one
    # interviewer that has a User login. GD and Offer rounds don't need panels.
    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=9)
    interview_round_codes = [r.round_code for r in doc.rounds
                             if r.round_type in ("Technical", "HR")]
    i = 0
    for code in interview_round_codes:
        for pnum in range(1, 4):  # Panel 1, 2, 3
            if i >= len(emps):
                i = 0  # reuse interviewers if we run out
            doc.append("round_panelists", {"round_code": code, "panelist": emps[i],
                                           "panel_name": f"Panel {pnum}"})
            i += 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    doc.reload()
    _log("=" * 72)
    _log(f"READY DRIVE: {doc.name}  ({drive_name})  status={doc.drive_status}")
    _log(f"  invite: {invite.name} ({invite.campus_invite_name})")
    _log(f"  institutes: {[r.institute for r in doc.participating_institutes]}")
    _log(f"  openings: {[r.job_opening for r in doc.linked_job_openings]}")
    _log(f"  rounds:")
    for r in doc.rounds:
        _log(f"      {r.round_code}  {r.round_name}  ({r.round_type})  -> stage “{r.hiring_stage}”")
    _log(f"  panelists ({len(doc.round_panelists)}):")
    for p in doc.round_panelists:
        _log(f"      {p.round_code}  {p.panel_name}  {p.panelist}")
    _log(f"  shortlisted candidates ready for GD: {frappe.db.count('Job Applicant', {'custom_campus_invite': invite.name, 'status': 'Shortlisted'})}")
    _log("=" * 72)
    return {"drive": doc.name}


# The rounds every ready/test drive ships with, aligned to the seeded openings' stages.
READY_ROUNDS = [
    ("Group Discussion", "Group Discussion", "Group Discussion"),
    ("Technical Round 1", "Technical", "Technical Round 1"),
    ("Technical Round 2", "Technical", "Technical Round 2"),
    ("HR Round", "HR", "HR Round"),
    ("Offer", "Offer", "Pre Job Offer"),
]


def _reset_invite_candidates(invite_name):
    """Put an invite's candidates back to a clean pre-GD start so a fresh test drive
    has consistent numbers — everyone Shortlisted (genuine Hold kept) at the first
    stage, with no leftover advancement/substatus from prior runs. Also removes any
    interviews from earlier drives on these candidates so counts start at zero."""
    rows = frappe.get_all("Job Applicant", filters={"custom_campus_invite": invite_name},
                          fields=["name", "status"])
    names = [r.name for r in rows]
    for r in rows:
        is_hold = r.status == "Hold"
        frappe.db.set_value("Job Applicant", r.name, {
            # Shortlisted (resume-screened) candidates wait AT the drive's first
            # round — Group Discussion — so the GD round shows them and no health
            # warning fires. Held candidates stay parked at Resume Screening.
            "custom_current_stage": "Resume Screening" if is_hold else "Group Discussion",
            "status": r.status if is_hold else "Shortlisted",
            "custom_substatus": None,
        }, update_modified=False)
    # drop interviews these candidates picked up in earlier drives AND their feedback,
    # else the feedback orphans and (with interview-number reuse) re-attaches to a new
    # interview, showing a phantom "awaiting feedback".
    if names:
        for iv in frappe.get_all("Interview", filters={"job_applicant": ["in", names]}, pluck="name"):
            _delete_interview_with_feedback(iv)
    frappe.db.commit()
    return len(rows)


def _force_delete(doctype, name):
    try:
        d = frappe.get_doc(doctype, name)
        if d.docstatus == 1:
            d.flags.ignore_permissions = True
            d.cancel()
        frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
    except Exception as e:
        print(f"[campus_seed] delete {doctype} {name}: {type(e).__name__}: {e}")


def _delete_interview_with_feedback(interview):
    for fb in frappe.get_all("Interview Feedback", filters={"interview": interview}, pluck="name"):
        _force_delete("Interview Feedback", fb)
    _force_delete("Interview", interview)


def cleanup_orphan_feedback():
    """Delete Interview Feedback that no longer matches its interview: the interview is
    gone, or the feedback predates it (a re-attached orphan from interview-number
    reuse). Fixes phantom 'awaiting feedback' counts on the round board."""
    removed = 0
    for fb in frappe.get_all("Interview Feedback",
                             fields=["name", "interview", "creation"], limit_page_length=0):
        iv_creation = frappe.db.get_value("Interview", fb.interview, "creation") if fb.interview else None
        if not iv_creation or str(fb.creation) < str(iv_creation):
            _force_delete("Interview Feedback", fb.name)
            removed += 1
    frappe.db.commit()
    _log(f"cleanup_orphan_feedback: removed {removed}")
    return {"removed": removed}


def _build_ready_drive(drive_name, invite):
    existing = frappe.db.get_value("Campus Drive", {"drive_name": drive_name}, "name")
    if existing:
        frappe.delete_doc("Campus Drive", existing, force=True, ignore_permissions=True)

    doc = frappe.new_doc("Campus Drive")
    doc.drive_name = drive_name
    doc.drive_status = "Live"
    doc.drive_owner = "Administrator"
    doc.drive_start_date = today()
    doc.drive_end_date = add_days(today(), 30)
    doc.append("campus_invites", {"campus_invite": invite.name,
                                  "campus_invite_name": invite.campus_invite_name})
    for (rname, rtype, stage) in READY_ROUNDS:
        doc.append("rounds", {"round_name": rname, "round_type": rtype, "hiring_stage": stage})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    doc = frappe.get_doc("Campus Drive", doc.name)
    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=9)
    i = 0
    for r in doc.rounds:
        if r.round_type not in ("Technical", "HR"):
            continue
        for pnum in range(1, 4):
            if i >= len(emps):
                i = 0
            doc.append("round_panelists", {"round_code": r.round_code, "panelist": emps[i],
                                           "panel_name": f"Panel {pnum}"})
            i += 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.name


def create_test_drives(count=3):
    """Create `count` independent, clean test drives — each on its OWN region invite so
    their candidates never overlap, each reset to a fresh pre-GD start, each with rounds
    + panelists ready. Run the whole flow on each without one affecting another."""
    invites = frappe.get_all(
        "Campus Invite",
        filters={"campus_invite_name": ["like", f"{INVITE_PREFIX}%"], "docstatus": 1},
        fields=["name", "campus_invite_name", "region"], order_by="creation desc", limit=count)
    if not invites:
        return {"error": "no submitted seed invites — run campus_seed.run first"}

    made = []
    for idx, inv in enumerate(invites, start=1):
        reset = _reset_invite_candidates(inv.name)
        region = frappe.db.get_value("Region", inv.region, "location_region") or inv.campus_invite_name
        name = f"TEST Drive {idx} - {region}"
        drive = _build_ready_drive(name, inv)
        shortlisted = frappe.db.count("Job Applicant", {"custom_campus_invite": inv.name, "status": "Shortlisted"})
        made.append((drive, name, inv.name, reset, shortlisted))

    _log("=" * 72)
    _log(f"CREATED {len(made)} INDEPENDENT TEST DRIVES (each clean, rounds + panels ready)")
    for (drive, name, invn, reset, sl) in made:
        _log(f"  {drive}  {name}")
        _log(f"      invite {invn} · {reset} candidates reset · {sl} Shortlisted ready for GD")
    _log("  Each has: GD → Technical R1 → Technical R2 → HR Round → Offer, 3 panels per interview round.")
    _log("=" * 72)
    return {"drives": [m[0] for m in made]}


def demo_check_interviewer_scope(drive="DRV-2026-3054"):
    """Log in AS a real panelist and confirm they see only their own interviews."""
    doc = frappe.get_doc("Campus Drive", drive)
    panelist_emp = next((p.panelist for p in doc.round_panelists), None)
    user = frappe.db.get_value("Employee", panelist_emp, "user_id") if panelist_emp else None
    if not user:
        return {"error": "no panelist with a user"}
    roles = frappe.get_roles(user)
    total = frappe.db.count("Interview")
    original = frappe.session.user
    try:
        frappe.set_user(user)
        visible = len(frappe.get_list("Interview", limit_page_length=0, ignore_permissions=False))
        # of the visible, how many actually have this user on the panel
        mine = frappe.get_all("Interview Detail",
                              filters={"interviewer": user, "parenttype": "Interview"}, pluck="parent")
        mine = len(set(mine))
    finally:
        frappe.set_user(original)
    out = {"interviewer_user": user, "roles": [r for r in roles if r not in ("All", "Guest")],
           "total_interviews_in_system": total, "visible_to_this_user": visible,
           "actually_on_their_panel": mine}
    _log(f"demo_check_interviewer_scope: {out}")
    return out


def demo_check_scope_plain_interviewer():
    """Prove the permission query restricts a NON-privileged interviewer.
    Creates a throwaway user with only Employee+Interviewer roles, puts them
    on exactly one Interview panel, then lists Interviews AS them."""
    from frappe.utils import random_string
    email = "scope.test.interviewer@example.com"
    if not frappe.db.exists("User", email):
        u = frappe.new_doc("User")
        u.email = email
        u.first_name = "Scope Test"
        u.send_welcome_email = 0
        u.flags.ignore_permissions = True
        u.insert(ignore_permissions=True)
        for r in ("Employee", "Interviewer"):
            if frappe.db.exists("Role", r):
                u.append("roles", {"role": r})
        u.save(ignore_permissions=True)
    roles = [r for r in frappe.get_roles(email) if r not in ("All", "Guest")]
    # attach them to a single interview panel
    iv = frappe.get_all("Interview", limit=1, pluck="name")
    if not iv:
        return {"error": "no interviews in system"}
    iv = iv[0]
    ivdoc = frappe.get_doc("Interview", iv)
    if not any(d.interviewer == email for d in ivdoc.interview_details):
        ivdoc.append("interview_details", {"interviewer": email})
        ivdoc.save(ignore_permissions=True)
    total = frappe.db.count("Interview")
    original = frappe.session.user
    try:
        frappe.set_user(email)
        visible = frappe.get_list("Interview", limit_page_length=0, pluck="name")
    finally:
        frappe.set_user(original)
    out = {"user": email, "roles": roles, "total_interviews": total,
           "visible_count": len(visible), "visible": visible, "put_on_panel_of": iv}
    _log(f"demo_check_scope_plain_interviewer: {out}")
    return out


def demo_cleanup_scope_test():
    email = "scope.test.interviewer@example.com"
    for iv in frappe.get_all("Interview", pluck="name"):
        d = frappe.get_doc("Interview", iv)
        rows = [r for r in d.interview_details if r.interviewer == email]
        if rows:
            for r in rows:
                d.remove(r)
            d.save(ignore_permissions=True)
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, ignore_permissions=True, force=True)
    frappe.db.commit()
    _log("demo_cleanup_scope_test: removed throwaway user + panel rows")


def repair_and_verify(drive="DRV-2026-3062"):
    """Undo any demo_health_check pollution on `drive` and print a READ-ONLY summary:
    remove synthetic rounds, un-strand ghost-stage candidates, then report config."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import get_rounds_overview
    doc = frappe.get_doc("Campus Drive", drive)
    inv = [r.campus_invite for r in doc.campus_invites]

    # 1) drop synthetic "Bogus"/nonexistent-stage rounds
    good = [r for r in doc.rounds if (r.hiring_stage or "") != "Nonexistent Stage"
            and (r.round_name or "") != "Bogus"]
    if len(good) != len(doc.rounds):
        doc.set("rounds", good)
        doc.save(ignore_permissions=True)

    # 2) un-strand anyone parked on a ghost/orphan stage back to a clean start
    valid_stages = {r.hiring_stage for r in doc.rounds if r.hiring_stage}
    for ja in frappe.get_all("Job Applicant", filters={"custom_campus_invite": ["in", inv]},
                             fields=["name", "custom_current_stage", "status"]):
        st = ja.custom_current_stage or ""
        if st in ("Ghost Stage", "Nonexistent Stage"):
            frappe.db.set_value("Job Applicant", ja.name, {
                "custom_current_stage": "Resume Screening",
                "status": "Shortlisted" if ja.status != "Hold" else "Hold",
            }, update_modified=False)
    frappe.db.commit()

    doc.reload()
    ov = get_rounds_overview(drive)
    _log("=" * 60)
    _log(f"DRIVE {drive}  ({doc.drive_name})  status={doc.drive_status}")
    _log(f"  window: {doc.drive_start_date} -> {doc.drive_end_date}")
    _log(f"  invites: {inv}")
    _log(f"  openings: {[r.job_opening for r in doc.linked_job_openings]}")
    _log(f"  rounds:")
    for r in doc.rounds:
        _log(f"      {r.round_code}  {r.round_name}  ({r.round_type})  -> stage “{r.hiring_stage}”")
    npanel = {}
    for p in doc.round_panelists:
        npanel[p.round_code] = npanel.get(p.round_code, 0) + 1
    _log(f"  panels per round: {npanel}")
    sl = frappe.db.count("Job Applicant", {"custom_campus_invite": ["in", inv], "status": "Shortlisted"})
    hold = frappe.db.count("Job Applicant", {"custom_campus_invite": ["in", inv], "status": "Hold"})
    _log(f"  candidates: Shortlisted={sl}  Hold={hold}")
    health = ov.get("health", [])
    _log(f"  HEALTH: {'OK — no issues' if not health else str(len(health)) + ' issue(s)'}")
    for h in health:
        _log(f"      [{h['level']}] {h['title']}")
    _log("=" * 60)
    return {"health_issues": len(health), "shortlisted": sl}


def demo_schedule_r2(drive="DRV-2026-3062"):
    """Move the GD-passed pool into Technical Round 1 and schedule panel interviews,
    to prove the custom_extra_payment AttributeError is gone."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        get_round_pool, schedule_round_interviews)
    doc = frappe.get_doc("Campus Drive", drive)
    inv = [r.campus_invite for r in doc.campus_invites]
    # park a handful of shortlisted candidates at the Technical Round 1 stage
    names = frappe.get_all("Job Applicant",
                           filters={"custom_campus_invite": ["in", inv], "status": "Shortlisted"},
                           pluck="name", limit=6)
    for n in names:
        frappe.db.set_value("Job Applicant", n, "custom_current_stage", "Technical Round 1",
                            update_modified=False)
    frappe.db.commit()
    res = schedule_round_interviews(drive, "R2", "2026-07-30", None, None, frappe.as_json(names))
    _log(f"demo_schedule_r2: created={res.get('created')} skipped_count={res.get('skipped_count')} "
         f"skipped={res.get('skipped')}")
    return res


def skip_pre_job_offer(drive="DRV-2026-3062"):
    """Turn OFF Pre Job Offer for a drive's openings and re-point the Offer round to
    'Job Offer', so the flow goes HR Round -> Job Offer directly. Also un-stick any
    candidate parked on the now-removed 'Pre Job Offer' stage."""
    from recruitment.recruitment.doctype.campus_drive.campus_drive import get_rounds_overview
    doc = frappe.get_doc("Campus Drive", drive)
    openings = [r.job_opening for r in doc.linked_job_openings if r.job_opening]
    inv = [r.campus_invite for r in doc.campus_invites]

    # 1) disable the virtual Pre Job Offer stage on every linked opening
    for op in openings:
        frappe.db.set_value("Job Opening", op, "custom_enable_pre_job_offer", 0,
                            update_modified=False)

    # 2) re-point the Offer round to the Job Offer stage
    for r in doc.rounds:
        if (r.round_type or "") == "Offer" and (r.hiring_stage or "") == "Pre Job Offer":
            r.hiring_stage = "Job Offer"
    doc.save(ignore_permissions=True)

    # 3) move anyone stranded on Pre Job Offer to Job Offer
    moved = 0
    for ja in frappe.get_all("Job Applicant",
                             filters={"custom_campus_invite": ["in", inv],
                                      "custom_current_stage": "Pre Job Offer"}, pluck="name"):
        frappe.db.set_value("Job Applicant", ja, "custom_current_stage", "Job Offer",
                            update_modified=False)
        moved += 1
    frappe.db.commit()

    doc.reload()
    ov = get_rounds_overview(drive)
    _log(f"skip_pre_job_offer: openings={openings} moved={moved}")
    for r in doc.rounds:
        _log(f"   {r.round_code} {r.round_name} ({r.round_type}) -> “{r.hiring_stage}”")
    _log(f"   HEALTH: {'OK' if not ov.get('health') else ov['health']}")
    return {"openings": openings, "moved": moved,
            "health_issues": len(ov.get("health") or [])}


def create_ready_mini_drives(count=3, per=10):
    """Create `count` independent, ready-to-use drives, each on its OWN new submitted
    invite with `per` fresh candidates (Shortlisted, parked at Group Discussion), rounds
    + panels ready. Candidates never overlap between drives. Reuses the existing seed
    openings + institute; only the invite + candidates are new per drive."""
    count = int(count); per = int(per)
    openings = frappe.get_all("Job Opening",
                              filters={"job_title": ["like", f"{OPENING_PREFIX}%"]}, pluck="name")[:2]
    if not openings:
        return {"error": "no seed openings — run campus_seed.run first"}
    op_desig = {op: frappe.db.get_value("Job Opening", op, "designation") for op in openings}
    insts = frappe.get_all("Institute", filters={"institute_name": ["like", f"%{SEED_SUFFIX}"]}, pluck="name")
    inst = insts[0] if insts else None
    regions = frappe.get_all("Region", fields=["name", "location_region"], limit=max(count, 1))
    if not regions:
        return {"error": "no Region records"}

    _orig = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None
    made = []
    try:
        for idx in range(count):
            region = regions[idx % len(regions)]
            invite = frappe.new_doc("Campus Invite")
            invite.campus_invite_name = f"{INVITE_PREFIX}{region.location_region} mini {idx + 1}"
            if invite.meta.has_field("region"):
                invite.region = region.name
            if inst:
                invite.append("institutes", {"institute": inst})
            for op in openings:
                invite.append("job_openings", {"job_opening": op})
            invite.insert(ignore_permissions=True)
            invite.submit()

            short = 0
            for c in range(per):
                gnum = 900 + idx * 100 + c
                fn = FIRST_NAMES[gnum % len(FIRST_NAMES)]
                ln = LAST_NAMES[gnum % len(LAST_NAMES)]
                op = openings[c % len(openings)]
                ja = frappe.new_doc("Job Applicant")
                # First name in the first-name box, surname in the surname box. The
                # whole name is derived into custom_full_name on validate — seeding a
                # merged "Fn Ln" here is what the split_applicant_name_parts patch
                # exists to undo.
                ja.applicant_name = fn
                if ja.meta.has_field("custom_applicant_last_name"):
                    ja.custom_applicant_last_name = ln
                ja.email_id = f"{CAND_PREFIX}m{idx + 1}.{c + 1:03d}{TPO_DOMAIN}"
                ja.phone_number = f"9{gnum:09d}"[:10]
                ja.job_title = op
                ja.designation = op_desig.get(op)
                ja.custom_campus_invite = invite.name
                if ja.meta.has_field("custom_institute") and inst:
                    ja.custom_institute = inst
                ja.status = "Open"
                ja.insert(ignore_permissions=True)
                frappe.db.set_value("Job Applicant", ja.name, {
                    "status": "Shortlisted", "custom_current_stage": "Group Discussion",
                }, update_modified=False)
                short += 1
            frappe.db.commit()

            inv_row = frappe._dict(name=invite.name, campus_invite_name=invite.campus_invite_name)
            drive = _build_ready_drive(f"MINI Drive {idx + 1} - {region.location_region}", inv_row)
            made.append((drive, invite.name, region.location_region, short))
    finally:
        frappe.sendmail = _orig

    _log("=" * 72)
    _log(f"CREATED {len(made)} READY-TO-USE MINI DRIVES ({per} candidates each)")
    for (drive, invn, reg, sl) in made:
        _log(f"  {drive}  (MINI Drive - {reg})  invite {invn} · {sl} Shortlisted ready for GD")
    _log("  Each has: GD → Technical R1 → Technical R2 → HR Round → Offer, 3 panels per interview round.")
    _log("=" * 72)
    return {"drives": [m[0] for m in made]}


def create_gd_test_drive(drive_name="TEST Drive - GD Grouping", colleges=3,
                         per_college_per_role=8, gd_panels=3,
                         fixed_pay=600000, variable_pay=100000):
    """A drive built to exercise GD grouping, on its own invite and candidates.

    The pool is spread across SEVERAL colleges AND several roles, which is what makes
    the four grouping modes differ visibly (all drive candidates / per role / per
    institute / per institute + role), and the GD round is staffed with panels, which
    is what each group's interviewers are read from.

    Re-runnable: the invite, its candidates and the drive are rebuilt each time; the
    markers are the seed ones, so campus_seed.cleanup() still wipes everything.

    bench --site <site> execute recruitment.campus_seed.create_gd_test_drive
    """
    colleges = int(colleges)
    per_college_per_role = int(per_college_per_role)
    gd_panels = int(gd_panels)
    openings = frappe.get_all("Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]},
                              fields=["name", "job_title", "designation"], limit=2)
    if not openings:
        return {"error": "no seed openings — run campus_seed.run first"}

    institutes = []
    for i in range(colleges):
        label = f"GD Test College {chr(65 + i)}{SEED_SUFFIX}"
        name = frappe.db.get_value("Institute", {"institute_name": label})
        if not name:
            inst = frappe.get_doc({
                "doctype": "Institute", "institute_name": label, "tier": "Tier-1",
                "is_active": 1, "college_short_name": f"GDT{i + 1}",
                # An invite can only be sent to a college that has a Primary TPO with an
                # email, so the college is created with one.
                "tpo_contacts": [{"contact_name": f"TPO {chr(65 + i)}", "role": "Primary TPO",
                                  "email": f"tpo.gd{i + 1}{TPO_DOMAIN}",
                                  "phone": f"90001{i + 1:05d}", "invite_status": "Not Invited"}],
            })
            inst.flags.ignore_mandatory = True
            name = inst.insert(ignore_permissions=True).name
        institutes.append(name)

    # Keyed to the drive name: two seeded drives must not share an invite, or building
    # the second silently deletes the first (the rebuild drops the invite and
    # everything hanging off it).
    invite_name = f"{INVITE_PREFIX}{drive_name}"
    _orig = frappe.sendmail
    frappe.sendmail = lambda *a, **k: None  # never mail a TPO from a seeding run
    try:
        # Drop the previous run's invite with everything hanging off it, so the pool
        # size stays exactly what was asked for instead of doubling on every run.
        old = frappe.db.get_value("Campus Invite", {"campus_invite_name": invite_name}, "name")
        if old:
            for drv in frappe.get_all("Campus Drive Invite", filters={"campus_invite": old},
                                      pluck="parent"):
                _force_delete("Campus Drive", drv)
            for ja in frappe.get_all("Job Applicant", filters={"custom_campus_invite": old},
                                     pluck="name"):
                _force_delete("Job Applicant", ja)
            _force_delete("Campus Invite", old)

        invite = frappe.new_doc("Campus Invite")
        invite.campus_invite_name = invite_name
        if invite.meta.has_field("region"):
            invite.region = _pick("Region")
        for inst in institutes:
            invite.append("institutes", {"institute": inst})
        for op in openings:
            invite.append("job_openings", {"job_opening": op.name})
        invite.insert(ignore_permissions=True)
        invite.submit()

        made = 0
        for ci, inst in enumerate(institutes):
            for oi, op in enumerate(openings):
                for c in range(per_college_per_role):
                    made += 1
                    fn = FIRST_NAMES[made % len(FIRST_NAMES)]
                    ln = LAST_NAMES[made % len(LAST_NAMES)]
                    ja = frappe.new_doc("Job Applicant")
                    # Name parts stay separate — see the note in the mixed-drive seed.
                    ja.applicant_name = fn
                    if ja.meta.has_field("custom_applicant_last_name"):
                        ja.custom_applicant_last_name = ln
                    ja.email_id = f"{CAND_PREFIX}gd{ci}{oi}.{c + 1:03d}{TPO_DOMAIN}"
                    ja.phone_number = f"9{made:09d}"[:10]
                    ja.job_title = op.name
                    ja.designation = op.designation
                    ja.custom_campus_invite = invite.name
                    if ja.meta.has_field("custom_institute"):
                        ja.custom_institute = inst
                    ja.status = "Open"
                    ja.insert(ignore_permissions=True)
                    # Straight to the GD starting line: Shortlisted is the pool the
                    # grouping draws from, and the stage is what the round board counts.
                    frappe.db.set_value("Job Applicant", ja.name, {
                        "status": "Shortlisted", "custom_current_stage": "Group Discussion",
                    }, update_modified=False)
        frappe.db.commit()

        drive = _build_ready_drive(drive_name, frappe._dict(
            name=invite.name, campus_invite_name=invite.campus_invite_name))
    finally:
        frappe.sendmail = _orig

    # _build_ready_drive staffs the interview rounds; the GD round needs panels of its
    # own now that every GD group is conducted by one.
    doc = frappe.get_doc("Campus Drive", drive)

    # READY_ROUNDS ships its Offer round on "Pre Job Offer"; openings that only carry
    # "Job Offer" would greet the tester with a red health banner about it, so point
    # that round at whichever offer stage these openings actually have.
    from recruitment.recruitment.doctype.campus_drive.campus_drive import _stage_options

    stages = _stage_options(doc).get("stages") or []
    offer = next((r for r in doc.rounds if r.round_type == "Offer"), None)
    if offer and stages and offer.hiring_stage not in stages:
        offer.hiring_stage = next((s for s in ("Pre Job Offer", "Job Offer") if s in stages),
                                  offer.hiring_stage)

    # The campus package, so an offer raised off this drive comes out prefilled.
    if doc.meta.get_field("fixed_pay"):
        doc.fixed_pay = fixed_pay
        doc.variable_pay = variable_pay

    gd = next((r for r in doc.rounds if r.requires_gd_grouping), None)
    emps = frappe.get_all("Employee", filters={"user_id": ["!=", ""], "status": "Active"},
                          pluck="name", limit=gd_panels)
    for i in range(gd_panels if (gd and emps) else 0):
        doc.append("round_panelists", {"round_code": gd.round_code, "panelist": emps[i % len(emps)],
                                       "panel_name": f"GD Panel {i + 1}"})
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    _log("=" * 72)
    _log(f"GD TEST DRIVE: {drive}  ({drive_name})")
    _log(f"  invite {invite.name} · {len(institutes)} colleges x {len(openings)} roles x "
         f"{per_college_per_role} = {made} Shortlisted, all waiting at Group Discussion")
    for inst in institutes:
        _log(f"      {inst}  {frappe.db.get_value('Institute', inst, 'institute_name')}")
    for op in openings:
        _log(f"      {op.name}  {op.job_title}")
    _log(f"  GD round {gd.round_code if gd else '-'} · panels: "
         f"{[p.panel_name for p in doc.round_panelists if gd and p.round_code == gd.round_code]}")
    _log("  Open the drive → Round Tracking → Group Discussion: pick a grouping, set a")
    _log("  size, Create Groups. Every group shows its panel; Assign Panels re-deals them.")
    _log("=" * 72)
    return {"drive": drive, "invite": invite.name, "institutes": institutes,
            "openings": [op.name for op in openings], "candidates": made,
            "gd_round": gd.round_code if gd else None}


def _ensure_campus_requisition(openings, headcount=50):
    """Put the drive's openings under a Job Requisition with headcount to spare.

    An offer is refused outright when the candidate's opening names no requisition, or
    when the requisition budgets no openings for that opening's REGION — so a drive
    meant for testing offers has to satisfy both first.

    Written straight to the database on purpose: raising a requisition properly means
    walking its approval workflow, which is a different flow from the one being seeded
    here (and one whose hooks are not always installable on a dev bench).
    """
    req = (frappe.db.get_value("Job Opening", openings[0], "job_requisition")
           or _pick("Job Requisition", {"status": ["in", ("Approved Draft", "Approved")]})
           or _pick("Job Requisition"))
    if not req:
        return None

    for op in openings:
        region = frappe.db.get_value("Job Opening", op, "custom_region")
        if region:
            row = frappe.db.get_value("Job Requisition Region", {
                "parent": req, "parenttype": "Job Requisition", "region": region}, "name")
            if row:
                frappe.db.set_value("Job Requisition Region", row, "no_of_openings", headcount,
                                    update_modified=False)
            else:
                child = frappe.get_doc({
                    "doctype": "Job Requisition Region", "parent": req,
                    "parenttype": "Job Requisition", "parentfield": "custom_regions",
                    "region": region, "no_of_openings": headcount})
                child.flags.ignore_mandatory = True
                child.insert(ignore_permissions=True)
        if not frappe.db.get_value("Job Opening", op, "job_requisition"):
            frappe.db.set_value("Job Opening", op, "job_requisition", req, update_modified=False)
    frappe.db.commit()
    return req


def create_offer_test_drive(drive_name="TEST Drive - Offer Flow", colleges=2,
                            per_college_per_role=6, passers=8,
                            fixed_pay=650000, variable_pay=120000):
    """A drive already carried through to its Offer round, ready for Job Offers.

    Builds the drive (colleges x roles, GD panels, its own Fixed / Variable Pay), runs
    the GD — passers and fails — pushes the result, then walks the passers down to the
    Offer round's stage. What's left to try by hand is the part being tested: tick the
    candidates on the Offer round card, raise the offers, and check each one comes out
    carrying the drive's package.

    bench --site <site> execute recruitment.campus_seed.create_offer_test_drive
    """
    from recruitment.api.hiring_stage import _enter_stage, _find_stage, get_opening_stages
    from recruitment.recruitment.doctype.campus_drive.campus_drive import (
        apply_gd_results, generate_gd_groups,
    )

    built = create_gd_test_drive(drive_name=drive_name, colleges=int(colleges),
                                 per_college_per_role=int(per_college_per_role),
                                 fixed_pay=fixed_pay, variable_pay=variable_pay)
    if built.get("error"):
        return built
    drive, gd_code = built["drive"], built["gd_round"]
    requisition = _ensure_campus_requisition(built["openings"])

    generate_gd_groups(drive, gd_code, 6, "drive")

    # Mark the GD: the first `passers` clear it, everyone else fails — the push refuses
    # to run while anyone is still unmarked, which is the point of that validation.
    rows = frappe.get_all("Campus Drive GD Group Member",
                          filters={"parent": drive, "round_code": gd_code},
                          pluck="name", order_by="idx asc")
    passers = min(int(passers), len(rows))
    for i, row in enumerate(rows):
        frappe.db.set_value("Campus Drive GD Group Member", row,
                            {"attendance": "Present", "result": "Pass" if i < passers else "Fail"},
                            update_modified=False)
    frappe.db.commit()
    pushed = apply_gd_results(drive, gd_code)

    # Fast-forward the passers to the Offer round's stage: the interview rounds in
    # between are a separate flow (panels, feedback), and this drive is about offers.
    doc = frappe.get_doc("Campus Drive", drive)
    offer_round = next((r for r in doc.rounds if r.round_type == "Offer"), None)
    stage = offer_round.hiring_stage if offer_round else None
    moved, stage_cache = 0, {}
    if stage:
        cleared = frappe.get_all("Job Applicant",
                                 filters={"custom_campus_drive": drive, "status": ["!=", "Rejected"]},
                                 pluck="name")
        for name in cleared:
            ja = frappe.get_doc("Job Applicant", name)
            opening = ja.get("job_title")
            if opening not in stage_cache:
                stage_cache[opening] = get_opening_stages(opening)
            # _enter_stage works off the opening's own stage row, not a bare name.
            index = _find_stage(stage_cache[opening], stage)
            if index < 0:
                continue
            _enter_stage(ja, stage_cache[opening][index], result="Seeded to the offer stage",
                         ignore_permissions=True)
            moved += 1
    frappe.db.commit()

    _log("=" * 72)
    _log(f"OFFER TEST DRIVE: {drive}  ({drive_name})")
    _log(f"  package: fixed {fixed_pay} · variable {variable_pay}  (Offer Package section)")
    _log(f"  requisition {requisition} linked to {', '.join(built['openings'])}")
    _log(f"  GD pushed: advanced={pushed['advanced']} rejected={pushed['rejected']}")
    _log(f"  {moved} candidate(s) now waiting at the Offer round stage “{stage}”")
    _log("  Open the drive → Round Tracking → Offer: tick candidates → Create Job Offers.")
    _log("  Each offer should open with Total Fixed Pay / Variable Incentive prefilled.")
    _log("=" * 72)
    return {"drive": drive, "requisition": requisition, "offer_stage": stage,
            "ready_for_offer": moved, "gd": pushed}


def test_todo_prefetch_fix():
    """Verify the cn_todo_manager parent-prefetch no longer nulls all fields when one
    configured field isn't a real column (the variable_pay bug)."""
    from cn_todo_manager.chatnext_todo_manager.api.todo_api import _prefetch_reference_data
    reqs = frappe.get_all("Job Requisition", limit=2, pluck="name")
    if not reqs:
        return {"error": "no Job Requisition records locally"}
    todos = [{"reference_type": "Job Requisition", "reference_name": n} for n in reqs]
    lvf = [
        {"fieldname": "designation", "fieldtype": "Link", "options": "Designation"},
        {"fieldname": "company", "fieldtype": "Link", "options": "Company"},
        {"fieldname": "variable_pay", "fieldtype": "Int", "options": ""},        # not a column
        {"fieldname": "definitely_not_a_field_xyz", "fieldtype": "Data"},         # bogus
    ]
    pref = _prefetch_reference_data(todos, lvf)
    out = {}
    for n in reqs:
        out[n] = (pref.get(("Job Requisition", str(n))) or {}).get("_parent")
    _log(f"test_todo_prefetch_fix: {out}")
    return out


def test_todo_prefetch_debug():
    import traceback
    reqs = frappe.get_all("Job Requisition", limit=2, pluck="name")
    rt = "Job Requisition"
    meta = frappe.get_meta(rt)
    vc = set(meta.get_valid_columns())
    parent_fields = {"designation", "company", "variable_pay", "definitely_not_a_field_xyz"}
    fetch = [f for f in parent_fields if f in vc]
    _log(f"valid? designation={'designation' in vc} company={'company' in vc} "
         f"variable_pay={'variable_pay' in vc}")
    _log(f"fetch_fields={fetch}")
    try:
        rows = frappe.get_all(rt, filters={"name": ["in", reqs]}, fields=["name", *fetch])
        _log(f"query OK rows={rows}")
    except Exception:
        _log(f"query FAILED: {traceback.format_exc()[-300:]}")
    return {}


def test_todo_prefetch_debug2():
    import traceback
    rt = "Job Requisition"
    reqs = frappe.get_all(rt, limit=2, pluck="name")
    real_cols = set(frappe.db.get_table_columns(rt))
    _log(f"variable_pay in real table columns? {'variable_pay' in real_cols}")
    _log(f"designation in real cols? {'designation' in real_cols}  company? {'company' in real_cols}")
    try:
        frappe.get_all(rt, filters={"name": ["in", reqs]}, fields=["name", "variable_pay"])
    except Exception:
        _log(f"variable_pay query err: {traceback.format_exc().splitlines()[-1][:160]}")
    # with real-column filter
    parent_fields = {"designation", "company", "variable_pay", "definitely_not_a_field_xyz"}
    fetch = [f for f in parent_fields if f in real_cols]
    rows = frappe.get_all(rt, filters={"name": ["in", reqs]}, fields=["name", *fetch])
    _log(f"fetch={fetch} rows={rows}")
    return {}
