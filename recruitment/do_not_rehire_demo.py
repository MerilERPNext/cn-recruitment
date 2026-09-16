"""Do Not Rehire, end to end — both outcomes, on records you can open.

    bench --site <site> execute recruitment.do_not_rehire_demo.seed
    bench --site <site> execute recruitment.do_not_rehire_demo.teardown

It builds on the [DUP-TEST] fixture (``duplicity_test_seed``) and seeds it first
if it is not there, then drives one candidate flagged on the SEPARATION and one
flagged on the EMPLOYEE record through both configured outcomes:

    Block Job Offer        the offer is refused and nothing is saved
    Exceptional Approval   the offer saves, carrying the trigger that starts the
                           Exceptional Approval Workflow

Two settings are forced while it runs, and restored afterwards:

  * **Overriding** is switched off. Administrator overrides every duplicity rule,
    so a script that left it on would watch every offer sail through.
  * **Allow Hiring** is switched off for the Block phase. It turns every refusal
    into an approval instead — including an explicit Block Job Offer — so Block
    cannot be demonstrated (or enforced) while it is on.

The offers it creates are left behind on purpose: they are what there is to
review. ``teardown`` removes them.
"""

import frappe
from frappe.utils import nowdate

from recruitment import duplicity_test_seed as fixture
from recruitment.customizations.ta_duplicity_job_offer import apply_approval_trigger

MARKER = fixture.MARKER
COMPANY = fixture.COMPANY

SEPARATION_CASE = MARKER + " DoNotRehire Applicant"
EMPLOYEE_CASE = MARKER + " EmployeeFlagged Applicant"

BLOCK = "Block Job Offer"
EXCEPTIONAL = "Exceptional Approval"

def _say(line=""):
    print(line)


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed():
    _ensure_fixture()

    settings = frappe.get_doc("TA Duplicity Check Settings", _settings_name())
    original = {
        "do_not_rehire_action": settings.do_not_rehire_action,
        "allow_hiring_on_duplicity_match": settings.allow_hiring_on_duplicity_match,
        "allow_override_by_admins_and_roles": settings.allow_override_by_admins_and_roles,
    }
    teardown(quiet=True)

    try:
        blocked = _run_block_phase(settings.name)
        approved = _run_approval_phase(settings.name)
    finally:
        _apply(settings.name, original)

    _print_guide(settings.name, blocked, approved, original)
    return {"blocked": blocked, "approved": approved}


def _run_block_phase(settings):
    """Both candidates, with the outcome set to Block Job Offer."""
    _apply(settings, {
        "do_not_rehire_action": BLOCK,
        "allow_hiring_on_duplicity_match": 0,
        "allow_override_by_admins_and_roles": 0,
    })
    out = {}
    for label, applicant_name in (("separation", SEPARATION_CASE), ("employee", EMPLOYEE_CASE)):
        out[label] = _attempt_offer(applicant_name)
    return out


def _run_approval_phase(settings):
    """Both candidates again, with the outcome set to Exceptional Approval."""
    _apply(settings, {
        "do_not_rehire_action": EXCEPTIONAL,
        "allow_hiring_on_duplicity_match": 1,
        "allow_override_by_admins_and_roles": 0,
    })
    out = {}
    for label, applicant_name in (("separation", SEPARATION_CASE), ("employee", EMPLOYEE_CASE)):
        out[label] = _create_offer(applicant_name)
    return out


def _attempt_offer(applicant_name):
    """Create an offer that is expected to be refused. Returns the refusal."""
    applicant = _applicant(applicant_name)
    try:
        offer = _offer_doc(applicant)
        offer.insert(ignore_permissions=True)
        frappe.db.commit()
        _say(f"  NOT BLOCKED — {applicant_name} got offer {offer.name}")
        return {"applicant": applicant, "refused": False, "offer": offer.name}
    except frappe.ValidationError as exc:
        frappe.db.rollback()
        message = frappe.utils.strip_html(str(exc)).strip()
        _say(f"  blocked — {applicant_name}: {message[:110]}")
        return {"applicant": applicant, "refused": True, "message": message}


def _create_offer(applicant_name):
    """Create an offer expected to save and carry the approval trigger."""
    applicant = _applicant(applicant_name)
    offer = _offer_doc(applicant)
    offer.insert(ignore_permissions=True)
    frappe.db.commit()

    # The trigger is written by a follow-up save (see ta_duplicity_job_offer);
    # run it here so the result does not depend on a worker being up.
    apply_approval_trigger(offer.name)
    frappe.db.commit()

    stamped = frappe.db.get_value("Job Offer", offer.name, [
        "custom_duplicity_exception_required", "custom_duplicity_exception_reason",
        "custom_duplicity_approval_trigger", "custom_duplicity_approval_reason",
    ], as_dict=True)
    _say(f"  offer {offer.name} — {applicant_name}")
    _say(f"      trigger: {stamped.custom_duplicity_approval_trigger or '(none)'}")
    _say(f"      reason : {(stamped.custom_duplicity_approval_reason or '').strip() or '(none)'}")
    return {"applicant": applicant, "offer": offer.name, "stamped": stamped}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _offer_doc(applicant):
    row = frappe.db.get_value("Job Applicant", applicant,
                              ["applicant_name", "job_title"], as_dict=True)
    doc = frappe.get_doc({
        "doctype": "Job Offer",
        "job_applicant": applicant,
        "applicant_name": row.applicant_name,
        "designation": frappe.db.get_value("Job Opening", row.job_title, "designation"),
        "offer_date": nowdate(),
        "company": COMPANY,
        "status": "Awaiting Response",
    })
    doc.flags.ignore_mandatory = True
    return doc


def _applicant(applicant_name):
    name = frappe.db.get_value("Job Applicant", {"applicant_name": applicant_name}, "name")
    if not name:
        frappe.throw(f"{applicant_name} is missing — run recruitment.duplicity_test_seed.seed")
    return name


def _settings_name():
    name = frappe.db.get_value(
        "TA Duplicity Check Settings",
        {"duplicity_check_setting_name": ["like", MARKER + "%"]}, "name",
    )
    if not name:
        frappe.throw("The [DUP-TEST] settings record is missing — run duplicity_test_seed.seed")
    return name


def _apply(settings, values):
    frappe.db.set_value("TA Duplicity Check Settings", settings, values)
    frappe.db.commit()
    frappe.clear_cache(doctype="TA Duplicity Check Settings")


def _ensure_fixture():
    if not frappe.db.exists("Job Applicant", {"applicant_name": EMPLOYEE_CASE}):
        _say("[DUP-TEST] fixture missing — seeding it first\n")
        fixture.seed()


# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------

def teardown(quiet=False):
    """Remove the offers this demo created. The [DUP-TEST] fixture is left alone."""
    applicants = [
        frappe.db.get_value("Job Applicant", {"applicant_name": n}, "name")
        for n in (SEPARATION_CASE, EMPLOYEE_CASE)
    ]
    for offer in frappe.get_all(
        "Job Offer", filters={"job_applicant": ["in", [a for a in applicants if a] or [""]]},
        pluck="name",
    ):
        _release_action_items(offer, quiet)
        fixture._force_delete("Job Offer", offer, quiet)
    frappe.db.commit()


def _release_action_items(offer, quiet=False):
    """Drop the Candidate Action Center Items the offer created.

    They are raised on insert and link back to the offer, so the offer cannot be
    deleted while they exist — which is what makes a second run of this demo hit
    "already has an active offer" instead of the rule it is demonstrating.
    """
    for item in frappe.get_all(
        "Candidate Action Center Item",
        filters={"reference_doctype": "Job Offer", "reference_docname": offer},
        pluck="name",
    ):
        fixture._force_delete("Candidate Action Center Item", item, quiet)


# ---------------------------------------------------------------------------
# What to review
# ---------------------------------------------------------------------------

def _print_guide(settings, blocked, approved, original):
    print(f"""
=== Do Not Rehire — what to review ===

SETTINGS   {settings}   (company {COMPANY})
  "Matches an Inactive Employee marked Do Not Rehire" is back to {original['do_not_rehire_action']!r}.
  The two outcomes it was driven through are below.
  NOTE: "Allow Hiring Even Though It Matches" (now {original['allow_hiring_on_duplicity_match']})
        turns Block Job Offer into an approval too — Block only blocks while it is off.

EMPLOYEE   the flag, in the two places it can live
  {_employee_line(SEPARATION_CASE)}
  {_employee_line(EMPLOYEE_CASE)}

APPLICANT  open either and look at the Employee Record tab
  {blocked['separation']['applicant']}
  {blocked['employee']['applicant']}

OFFER      1. Block Job Offer  -> refused, nothing saved
             {blocked['separation']['message'][:88] if blocked['separation']['refused'] else 'NOT REFUSED — check the settings'}
           2. Exceptional Approval -> saved and routed
             {approved['separation']['offer']}  (flagged on the separation)
             {approved['employee']['offer']}  (flagged on the employee record)
             Open either: "Duplicity Approval Trigger" carries the workflow name,
             "Duplicity Approval Reason" carries what the approver is shown.

Clean up
  bench --site {frappe.local.site} execute recruitment.do_not_rehire_demo.teardown
""")


def _employee_line(applicant_name):
    applicant = frappe.db.get_value("Job Applicant", {"applicant_name": applicant_name},
                                    ["name", "email_id"], as_dict=True)
    employee = frappe.db.get_value("Employee", {"personal_email": applicant.email_id},
                                   ["name", "employee_name", "custom_do_not_rehire"], as_dict=True)
    if not employee:
        return f"{applicant_name}: no employee matched"
    separation = frappe.db.get_value(
        "Employee Separation", {"employee": employee.name, "docstatus": ["<", 2]},
        "custom_mark_do_not_rehire") or 0
    return (f"{employee.name} {employee.employee_name}: Employee flag={employee.custom_do_not_rehire}, "
            f"Separation flag={separation}")
