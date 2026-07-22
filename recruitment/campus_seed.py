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
                req.status = "Open & Approved"
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
        out["extra_round"] = add_candidate_interview(
            d, ja[0], "Technical Round 2", today(), round_code="R2")
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
    for r in frappe.get_all("Candidate Registration Detail",
                            filters={"parent": ["in", [r.name for r in regs] or [""]]},
                            fields=["parent", "count(name) as c"], group_by="parent"):
        reg_counts[r.parent] = r.c

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
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    doc.reload()
    _log("=" * 74)
    _log(f"CAMPUS DRIVE CREATED: {doc.name}  ({drive_name})")
    _log(f"  window: {doc.drive_start_date} -> {doc.drive_end_date}   status: {doc.drive_status}")
    _log(f"  campus invites merged ({len(doc.campus_invites)}):")
    for r in doc.campus_invites:
        _log(f"      {r.campus_invite}  {r.campus_invite_name}")
    _log(f"  participating institutes auto-pulled ({len(doc.participating_institutes)}):")
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
