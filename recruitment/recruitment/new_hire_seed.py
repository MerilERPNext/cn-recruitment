"""Dummy New Hire data, one record parked at each stage of the flow.

Built for testing the API and the screens in front of it: rather than five
identical records, this leaves one new hire sitting at every stage, so a list
view, a detail screen and each button can all be exercised without first driving
a record through the whole flow by hand.

    Draft                 editable; "Submit" should send it for approval
    Pending Approval      the approval matrix would be running
    Approved              the pending list; "Initiate Onboarding" is live
    Onboarding Initiated  has a Job Applicant + Employee Onboarding behind it
    Completed             onboarding finished; "Activate" is live

Everything it creates is recognisable by the seed email domain, so `cleanup`
never has to guess. It goes through the real API functions — a seed that writes
rows directly would not prove the endpoints work.

Run:
    bench --site <site> execute recruitment.recruitment.new_hire_seed.run
Inspect without changing anything:
    bench --site <site> execute recruitment.recruitment.new_hire_seed.report
Remove everything it made:
    bench --site <site> execute recruitment.recruitment.new_hire_seed.cleanup
"""

import frappe

from recruitment.api import new_hire as nh

DOMAIN = "newhire-seed.example"
FORM_NAME = "Standard New Hire"

# first, last, gender, doj, the stage to leave them at
PEOPLE = (
    ("Aarav", "Mehta", "Male", "2027-01-05", "Draft"),
    ("Diya", "Nair", "Female", "2027-01-12", "Pending Approval"),
    ("Kabir", "Shah", "Male", "2027-02-02", "Approved"),
    ("Meera", "Iyer", "Female", "2027-02-16", "Onboarding Initiated"),
    ("Rohan", "Gupta", "Male", "2027-03-01", "Completed"),
)


def _log(msg):
    print(f"  {msg}")


def _context():
    """Company / department / designation the seeded people are hired into.

    Read from the site rather than named here — a seed that hardcodes masters
    only works on the machine it was written on.
    """
    company = frappe.db.get_value("Company", {}, "name")
    if not company:
        frappe.throw("No Company on this site — nothing to hire into.")
    return {
        "company": company,
        "department": (frappe.db.get_value("Department", {"company": company}, "name")
                       or frappe.db.get_value("Department", {}, "name")),
        "designation": frappe.db.get_value("Designation", {}, "name"),
        "gender_exists": lambda g: frappe.db.exists("Gender", g),
    }


def _ensure_form():
    """A default New Hire Form with the core Employee fields on it."""
    if not frappe.db.exists("New Hire Form", FORM_NAME):
        doc = frappe.new_doc("New Hire Form")
        doc.form_name = FORM_NAME
        doc.is_default = 1
        doc.restrict_to_configured = 1
        doc.insert(ignore_permissions=True)
        _log(f"created New Hire Form {FORM_NAME}")

    result = nh.seed_default_fields(form=FORM_NAME)
    if result.get("success"):
        added = result["data"]["added"]
        _log(f"form has its default fields ({len(added)} added this run)")
    return FORM_NAME


def _payload(first, last, gender, doj, ctx):
    email = f"{first.lower()}.{last.lower()}@{DOMAIN}"
    payload = {
        "first_name": first,
        "last_name": last,
        "personal_email": email,
        "company_email": email,
        "cell_number": "98765" + str(abs(hash(first + last)) % 100000).zfill(5),
        "date_of_joining": doj,
        "company": ctx["company"],
        "designation": ctx["designation"],
        "department": ctx["department"],
    }
    if ctx["gender_exists"](gender):
        payload["gender"] = gender
    return payload


def _advance(name, target):
    """Walk one new hire up to `target`, through the real endpoints.

    The approval stages are set directly — on a site with no Approval Policy
    Matrix configured for Employee there is no matrix to run, and the point of
    the seed is the data, not the approval engine.
    """
    if target == "Draft":
        frappe.db.set_value("Employee", name, nh.STAGE_FIELD, "Draft")
        return name
    if target == "Pending Approval":
        return name  # created there already

    frappe.db.set_value("Employee", name, nh.STAGE_FIELD, "Approved")
    frappe.db.commit()
    if target == "Approved":
        return name

    result = nh.initiate_onboarding(name)
    if not result.get("success"):
        _log(f"    ! initiate_onboarding failed: {result.get('message')}")
        return name
    onboarding = result["data"]["employee_onboarding"]
    frappe.db.commit()
    if target == "Onboarding Initiated":
        return name

    # Completed = every portal field approved. The hook derives the stage.
    doc = frappe.get_doc("Employee Onboarding", onboarding)
    doc.boarding_status = "Completed"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return name


def run():
    """Create one new hire at each stage. Safe to re-run: existing seed people
    are left alone rather than duplicated."""
    print(f"\nSeeding New Hire test data ({DOMAIN})\n")
    ctx = _context()
    _log(f"company={ctx['company']} department={ctx['department']} designation={ctx['designation']}")
    form = _ensure_form()
    frappe.db.commit()

    made = []
    for first, last, gender, doj, stage in PEOPLE:
        email = f"{first.lower()}.{last.lower()}@{DOMAIN}"
        existing = frappe.db.get_value("Employee", {"personal_email": email}, "name")
        if existing:
            _log(f"{first} {last}: already seeded as {existing}")
            made.append(existing)
            continue

        result = nh.create_new_hire(payload=_payload(first, last, gender, doj, ctx), form=form)
        if not result.get("success"):
            _log(f"{first} {last}: FAILED — {result.get('message')}")
            continue
        name = result["data"]["name"]
        frappe.db.commit()
        _advance(name, stage)
        actual = frappe.db.get_value("Employee", name, nh.STAGE_FIELD)
        _log(f"{first} {last}: {name} -> {actual}")
        made.append(name)

    frappe.db.commit()
    print()
    report()
    return made


def report():
    """What the seed has left on the site."""
    rows = frappe.get_all(
        "Employee",
        filters={"personal_email": ["like", f"%@{DOMAIN}"]},
        fields=["name", "employee_name", "status", nh.STAGE_FIELD, "date_of_joining"],
        order_by="creation asc",
    )
    print(f"Seeded new hires ({len(rows)}):")
    for row in rows:
        onboarding = frappe.db.get_value(
            "Employee Onboarding", {"employee": row.name, "docstatus": ("<", 2)}, "name")
        print(f"  {row.name:14s} {row.employee_name:16s} {row.status:8s} "
              f"{(row.get(nh.STAGE_FIELD) or '-'):22s} {onboarding or ''}")
    if not rows:
        print("  (none — run `run` first)")
    return rows


def cleanup():
    """Remove everything the seed made, in dependency order."""
    print(f"\nRemoving New Hire test data ({DOMAIN})\n")
    people = frappe.get_all(
        "Employee", filters={"personal_email": ["like", f"%@{DOMAIN}"]}, pluck="name")

    for name in people:
        for onboarding in frappe.get_all(
            "Employee Onboarding", filters={"employee": name}, pluck="name"
        ):
            _drop("Employee Onboarding", onboarding)

    for applicant in frappe.get_all(
        JOB_APPLICANT_DT, filters={"email_id": ["like", f"%@{DOMAIN}"]}, pluck="name"
    ):
        _drop(JOB_APPLICANT_DT, applicant)

    for name in people:
        _drop("Employee", name)

    frappe.db.commit()
    _log(f"removed {len(people)} seeded new hire(s)")


JOB_APPLICANT_DT = "Job Applicant"


def _drop(doctype, name):
    try:
        frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        _log(f"removed {doctype} {name}")
    except Exception as exc:
        _log(f"kept {doctype} {name} — {str(exc)[:80]}")
