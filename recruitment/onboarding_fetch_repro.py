"""Reproduce the "Create Employee fetches nothing" setup on a local site.

Mirrors the preciousalloys-uat configuration that surfaced the bug, so the
Employee Onboarding -> Employee mapper can be exercised end to end locally:

  * the 12 ``Recruitment Settings -> Recruitment Tool`` rows, in the picker's
    ``"Label (fieldname) [Fieldtype]"`` storage format (one of them deliberately
    names a field that does not exist — that row is on UAT too);
  * a Field Flow (nextai) chain Employee Onboarding -> Employee, provisioned
    through the app's own ``save_field_flows_bulk`` so the engine does the
    wiring exactly as the "Add Custom Field" dialog would;
  * a submitted Employee Onboarding with every mapped source field filled.

Run::

    bench --site <site> execute recruitment.onboarding_fetch_repro.seed
    bench --site <site> execute recruitment.onboarding_fetch_repro.verify
    bench --site <site> execute recruitment.onboarding_fetch_repro.teardown

``seed`` is idempotent — re-running it reuses the same records. It uses its own
Document Data Flow (``REPRO_FLOW``) so an existing "Recruitment Profile Flow"
is left untouched.
"""

import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

REPRO_FLOW = "Onboarding Fetch Repro"
APPLICANT_EMAIL = "repro.applicant@example.com"
APPLICANT_NAME = "Repro Applicant"

# Custom fields the UAT site has that a stock local site may not. Created only
# when missing; an existing field is left exactly as the site has it.
REQUIRED_FIELDS = [
    ("Employee Onboarding", {
        "fieldname": "custom_mobile_no", "label": "Mobile No", "fieldtype": "Data",
        "fetch_from": "job_applicant.phone_number", "fetch_if_empty": 1,
    }),
    ("Employee Onboarding", {
        "fieldname": "custom_emergency_contact_no", "label": "Emergency Contact No",
        "fieldtype": "Data",
    }),
    ("Employee", {
        "fieldname": "custom_emergency_blood_group", "label": "Blood Group",
        "fieldtype": "Select", "options": "\nA+\nA-\nB+\nB-\nAB+\nAB-\nO+\nO-",
    }),
    ("Employee", {
        "fieldname": "custom_alternative_emergency_contact_number",
        "label": "Emergency Contact Number", "fieldtype": "Data",
    }),
]

# Verbatim copy of the UAT Recruitment Tool rows.
RECRUITMENT_TOOL_ROWS = [
    ("Blood Group (custom_blood_group) [Select]", "Blood Group (custom_emergency_blood_group) [Select]"),
    ("Employee Name (employee_name) [Data]", "Full Name (employee_name) [Data]"),
    ("Designation (designation) [Link]", "Designation (designation) [Link]"),
    ("Department (department) [Link]", "Department (department) [Link]"),
    # Stale row: custom_full_name does not exist on Employee Onboarding. Kept so
    # the local site reproduces the skip-and-log path.
    ("Full Name (custom_full_name) [Data]", "Full Name (employee_name) [Data]"),
    ("First Name (custom_first_name) [Data]", "First Name (first_name) [Data]"),
    ("Father's Name (custom_fathers_full_name) [Data]", "Father's Name (father_full_name) [Data]"),
    ("Marital Status (custom_marital_status) [Select]", "Marital Status (marital_status) [Select]"),
    ("Emergency Contact Name (custom_emergency_contact_name) [Data]",
     "Emergency Contact Name (person_to_be_contacted) [Data]"),
    ("Emergency Contact No (custom_emergency_contact_no) [Data]",
     "Emergency Contact Number (custom_alternative_emergency_contact_number) [Data]"),
    ("Correspondence Name (custom_correspondence_name) [Data]", "Last Name (last_name) [Data]"),
    ("Date of Birth (custom_date_of_birth) [Date]", "Date of Birth (date_of_birth) [Date]"),
]

# The two Field Flow rows configured on UAT: source field on Employee
# Onboarding -> destination field on Employee.
FLOW_ROWS = [
    {"Employee Onboarding": "custom_marital_status", "Employee": "custom__custom_marital_status"},
    {"Employee Onboarding": "custom_mobile_no", "Employee": "cell_number"},
]

# Source values, copied from UAT's HR-EMP-ONB-2026-00027.
ONBOARDING_VALUES = {
    "custom_blood_group": "A-",
    "custom_first_name": "Repro Applicant",
    "custom_fathers_full_name": "Repro Father",
    "custom_marital_status": "Married",
    "custom_emergency_contact_name": "Repro Emergency Contact",
    "custom_emergency_contact_no": "8724983753",
    "custom_correspondence_name": "Repro Correspondence",
    "custom_date_of_birth": "1995-07-28",
    "custom_mobile_no": "3987435894",
}


def seed():
    frappe.set_user("Administrator")

    _ensure_custom_fields()
    _ensure_recruitment_tool()
    _ensure_field_flow()
    onboarding = _ensure_onboarding()

    frappe.db.commit()

    print(f"\nSeeded. Open Employee Onboarding {onboarding} and press Create Employee.")
    print("Expected on the mapped form:")
    print("  Blood Group / First Name / Father's Name / DOB / Marital Status  <- Recruitment Tool")
    print("  Mobile No (cell_number) and Marital Status (custom__custom_marital_status)  <- Field Flow")
    print("\nOr check it headlessly: bench --site <site> execute "
          "recruitment.onboarding_fetch_repro.verify")


# ---------------------------------------------------------------------------
# Pieces
# ---------------------------------------------------------------------------

def _ensure_custom_fields():
    created = []
    for doctype, spec in REQUIRED_FIELDS:
        if frappe.get_meta(doctype).get_field(spec["fieldname"]):
            continue
        create_custom_field(doctype, spec, ignore_validate=True)
        created.append(f"{doctype}.{spec['fieldname']}")
        frappe.clear_cache(doctype=doctype)
    print("custom fields created:", created or "none needed")


def _ensure_recruitment_tool():
    """Replace the Employee Onboarding -> Employee rows with the UAT set.

    Rows for other doctype pairs are preserved, so this does not wipe unrelated
    local configuration.
    """
    settings = frappe.get_doc("Recruitment Settings")
    kept = [
        row.as_dict()
        for row in settings.recruitment_tool
        if not (row.source_doctype == "Employee Onboarding" and row.target_doctype == "Employee")
    ]
    settings.set("recruitment_tool", kept)

    for source_field, target_field in RECRUITMENT_TOOL_ROWS:
        settings.append("recruitment_tool", {
            "source_doctype": "Employee Onboarding",
            "source_field": source_field,
            "target_doctype": "Employee",
            "target_field": target_field,
            "fetch_on_update": 1,
        })

    settings.save(ignore_permissions=True)
    frappe.clear_document_cache("Recruitment Settings", "Recruitment Settings")

    from recruitment.auto_fetch_fields import get_field_map

    resolved = get_field_map("Employee Onboarding", "Employee")
    print(f"recruitment_tool: {len(RECRUITMENT_TOOL_ROWS)} rows configured, "
          f"{len(resolved)} resolve to real fields")


def _ensure_field_flow():
    """Provision the nextai chain through the app's own dialog endpoint."""
    from recruitment.recruitment.field_flow_sync import CONNECTOR_FIELD, save_field_flows_bulk

    result = save_field_flows_bulk(json.dumps({
        "flow_name": REPRO_FLOW,
        "flow": [
            {"target_doctype": "Employee Onboarding", "docfield": ""},
            {"target_doctype": "Employee", "docfield": CONNECTOR_FIELD},
        ],
        "source_mode": "Map Existing Fields",
        "editable_after_fetch": 1,
        "rows": [{"fields": row} for row in FLOW_ROWS],
    }))
    if result.get("errors"):
        print("field flow errors:", result["errors"])
    print("field flow created:", [r["fieldname"] for r in result.get("created", [])])

    frappe.clear_cache(doctype="Employee")
    wiring = [
        f"{df.fieldname} <- {df.fetch_from}"
        for df in frappe.get_meta("Employee").get_fields_to_fetch(CONNECTOR_FIELD)
    ]
    print("Employee fetch_from wiring:", wiring)


def _ensure_onboarding():
    """A submitted Employee Onboarding with every mapped source field filled."""
    existing = frappe.get_all(
        "Employee Onboarding",
        filters={"job_applicant": APPLICANT_EMAIL, "docstatus": ["<", 2]},
        pluck="name",
    )
    if existing:
        onboarding = frappe.get_doc("Employee Onboarding", existing[0])
        if onboarding.employee:
            print(f"NOTE: {onboarding.name} already produced Employee "
                  f"{onboarding.employee}; run teardown() to start clean.")
        else:
            print("reusing Employee Onboarding", onboarding.name)
        return onboarding.name

    company = frappe.defaults.get_defaults().get("company") or frappe.get_all(
        "Company", pluck="name", limit=1
    )[0]
    designation = frappe.get_all("Designation", pluck="name", limit=1)[0]
    department = frappe.get_all(
        "Department", filters={"company": company}, pluck="name", limit=1
    )
    today = frappe.utils.nowdate()

    if not frappe.db.exists("Job Applicant", APPLICANT_EMAIL):
        frappe.get_doc({
            "doctype": "Job Applicant",
            "applicant_name": APPLICANT_NAME,
            "email_id": APPLICANT_EMAIL,
            "status": "Open",
            "designation": designation,
            "custom_marital_status": "Married",
            "phone_number": "3987435894",
        }).insert(ignore_permissions=True)

    offer = frappe.get_doc({
        "doctype": "Job Offer",
        "job_applicant": APPLICANT_EMAIL,
        "applicant_name": APPLICANT_NAME,
        "status": "Accepted",
        "offer_date": today,
        "designation": designation,
        "company": company,
    }).insert(ignore_permissions=True)
    offer.submit()

    onboarding = frappe.get_doc({
        "doctype": "Employee Onboarding",
        "company": company,
        "job_applicant": APPLICANT_EMAIL,
        "job_offer": offer.name,
        "employee_name": APPLICANT_NAME,
        "designation": designation,
        "department": department[0] if department else None,
        "date_of_joining": today,
        "boarding_status": "In Process",
        "boarding_begins_on": today,
        **ONBOARDING_VALUES,
    }).insert(ignore_permissions=True)
    onboarding.submit()

    print("created Employee Onboarding", onboarding.name)
    return onboarding.name


# ---------------------------------------------------------------------------
# Headless check + cleanup
# ---------------------------------------------------------------------------

def verify():
    """Map the seeded onboarding and report what each mechanism filled in.

    Nothing is inserted — this is the same call the "Create Employee" button
    makes, so it shows precisely what the form would open with.
    """
    frappe.set_user("Administrator")

    from recruitment.auto_fetch_fields import build_employee, get_field_map
    from recruitment.recruitment.field_flow_sync import CONNECTOR_FIELD

    names = frappe.get_all(
        "Employee Onboarding",
        filters={"job_applicant": APPLICANT_EMAIL, "docstatus": ["<", 2]},
        pluck="name",
    )
    if not names:
        print("Nothing seeded yet — run seed() first.")
        return

    onboarding = frappe.get_doc("Employee Onboarding", names[0])
    employee = build_employee(onboarding.name)

    print(f"\nMapped from {onboarding.name}\n")
    print(f"  {CONNECTOR_FIELD:42} {employee.get(CONNECTOR_FIELD)!r}")
    print(f"  {'job_applicant':42} {employee.get('job_applicant')!r}")

    print("\n-- Recruitment Tool --")
    ok = True
    for source_field, target_field in get_field_map("Employee Onboarding", "Employee").items():
        expected = onboarding.get(source_field)
        actual = employee.get(target_field)
        hit = actual == expected or (not expected and not actual)
        ok = ok and hit
        print(f"  {'OK ' if hit else 'FAIL'} {source_field:34} -> {target_field:44} {actual!r}")

    print("\n-- Field Flow (fetch_from via connector) --")
    for df in frappe.get_meta("Employee").get_fields_to_fetch(CONNECTOR_FIELD):
        expected = onboarding.get(df.fetch_from.split(".")[-1])
        actual = employee.get(df.fieldname)
        hit = actual == expected or (not expected and not actual)
        ok = ok and hit
        print(f"  {'OK ' if hit else 'FAIL'} {df.fetch_from:34} -> {df.fieldname:44} {actual!r}")

    print("\nRESULT:", "everything mapped" if ok else "SOMETHING DID NOT MAP (see FAIL rows)")


def teardown():
    """Remove the seeded documents and the repro flow.

    Leaves the custom fields and the Recruitment Tool rows alone — those are
    configuration you may want to keep while testing.
    """
    frappe.set_user("Administrator")

    from recruitment.recruitment.field_flow_sync import delete_field_flow

    for name in frappe.get_all(
        "Employee", filters={"job_applicant": APPLICANT_EMAIL}, pluck="name"
    ):
        frappe.delete_doc("Employee", name, force=True, ignore_permissions=True)

    for doctype in ("Employee Onboarding", "Job Offer"):
        for name in frappe.get_all(
            doctype, filters={"job_applicant": APPLICANT_EMAIL}, pluck="name"
        ):
            doc = frappe.get_doc(doctype, name)
            if doc.docstatus == 1:
                doc.cancel()
            frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)

    if frappe.db.exists("Job Applicant", APPLICANT_EMAIL):
        frappe.delete_doc("Job Applicant", APPLICANT_EMAIL, force=True, ignore_permissions=True)

    for attachment in frappe.get_all(
        "Data Flow Attachment", filters={"document_data_flow": REPRO_FLOW}, pluck="name"
    ):
        delete_field_flow(attachment)

    if frappe.db.exists("Document Data Flow", REPRO_FLOW):
        frappe.delete_doc("Document Data Flow", REPRO_FLOW, force=True, ignore_permissions=True)

    frappe.db.commit()
    print("torn down")
