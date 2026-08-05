"""Wire the *Employee Joining Form* through to Employee.

The joining form (an ``Onboarding Portal Forms`` record) collects the candidate's
details onto Employee Onboarding. This module configures the second leg —
Employee Onboarding -> Employee — so pressing **Create Employee** carries those
answers across, and later edits keep the Employee in sync.

Mechanism: the ``Recruitment Tool`` table on Recruitment Settings. It is the only
one of the two that can carry child tables (the Field Flow engine wires
``fetch_from``, which Table fields do not support), so keeping the whole joining
form in one place means one screen to audit instead of two.

Run::

    bench --site <site> execute recruitment.joining_form_flow_setup.plan   # dry run
    bench --site <site> execute recruitment.joining_form_flow_setup.apply

``plan`` writes nothing. ``apply`` replaces the Employee Onboarding -> Employee
rows of the Recruitment Tool table and leaves every other pair untouched.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

JOINING_FORM = "Employee Joining Form"
SOURCE_DOCTYPE = "Employee Onboarding"
TARGET_DOCTYPE = "Employee"

# Employee had no home for these four joining-form answers, so we add one.
#
# They are ordinary stored Custom Fields, NOT virtual ones: a virtual field is
# computed by its controller and has no database column, so nothing written to
# it survives — `Employee.father_full_name` is virtual, which is exactly why
# Father's Name could not be mapped in the first place.
EMPLOYEE_FIELDS = [
    {
        "fieldname": "custom_fathers_name", "label": "Father's Name",
        "fieldtype": "Data", "insert_after": "last_name",
    },
    {
        "fieldname": "custom_correspondence_name", "label": "Correspondence Name",
        "fieldtype": "Data", "insert_after": "custom_fathers_name",
    },
    {
        "fieldname": "custom_previous_employment", "label": "Previous Employment",
        "fieldtype": "Table", "options": "Previous Employment",
        "insert_after": "external_work_history",
    },
    {
        "fieldname": "custom_family_details", "label": "Family Details",
        "fieldtype": "Table", "options": "Family Details",
        "insert_after": "custom_dependent",
    },
]

# Joining-form field -> Employee field. Every pair here was checked against the
# live metas: the target exists, is not virtual, and holds a compatible type.
# Child tables map only where both sides use the *same* child doctype, since the
# rows are copied field by field.
MAPPINGS = [
    # Personal Details
    ("employee_name", "employee_name"),
    ("custom_photograph", "image"),                        # Attach -> Attach Image
    ("custom_jf_permanent_address", "permanent_address"),  # Small Text -> Small Text
    ("custom_mobile_no", "cell_number"),
    ("custom_date_of_birth", "date_of_birth"),
    ("custom_pan_card", "pan_number"),
    ("custom_email_id", "personal_email"),
    ("custom_marital_status", "marital_status"),
    ("custom_blood_group", "blood_group"),
    # Emergency Contact Details
    ("custom_emergency_contact_name", "person_to_be_contacted"),
    ("custom_emergency_relation", "relation"),
    ("custom_emergency_contact_no", "emergency_phone_number"),
    # Onto the Employee fields provisioned above
    ("custom_fathers_full_name", "custom_fathers_name"),
    ("custom_correspondence_name", "custom_correspondence_name"),
    # Child tables — same child doctype on both sides
    ("custom_jf_education", "education"),                     # Employee Education
    ("custom_jf_references", "custom_reference"),             # References
    ("custom_jf_employment", "custom_previous_employment"),   # Previous Employment
    ("custom_jf_family", "custom_family_details"),            # Family Details
]

# Joining-form fields deliberately left unmapped, with the reason. Reported by
# `plan` so the gaps stay visible instead of looking like an oversight.
UNMAPPED = {
    "is_fresher":
        "virtual on Employee Onboarding, and no Employee counterpart",
    "custom_jf_declaration_ack": "declaration artefact — belongs to the Onboarding record",
    "custom_jf_signature": "declaration artefact — belongs to the Onboarding record",
    "custom_jf_place": "declaration artefact — belongs to the Onboarding record",
    "custom_jf_declaration_date": "declaration artefact — belongs to the Onboarding record",
}


# ---------------------------------------------------------------------------
# Row building
# ---------------------------------------------------------------------------

def _picker_value(doctype, fieldname):
    """The ``"Label (fieldname) [Fieldtype]"`` string the settings pickers store."""
    df = frappe.get_meta(doctype).get_field(fieldname)
    if not df:
        return None
    return f"{df.label or fieldname} ({fieldname}) [{df.fieldtype}]"


def _resolve():
    """Split MAPPINGS into rows this site can honour and rows it cannot."""
    from recruitment.auto_fetch_fields import _can_read, _can_write

    source_meta = frappe.get_meta(SOURCE_DOCTYPE)
    target_meta = frappe.get_meta(TARGET_DOCTYPE)

    usable, unusable = [], []
    for source_field, target_field in MAPPINGS:
        source_df = source_meta.get_field(source_field)
        target_df = target_meta.get_field(target_field)

        if not source_df:
            unusable.append((source_field, target_field, f"{SOURCE_DOCTYPE} has no {source_field}"))
        elif not target_df:
            unusable.append((source_field, target_field, f"{TARGET_DOCTYPE} has no {target_field}"))
        elif not _can_read(source_df):
            unusable.append((source_field, target_field, f"source is {source_df.fieldtype}"))
        elif not _can_write(target_df):
            unusable.append((source_field, target_field, "target is virtual — no database column"))
        elif source_df.fieldtype == "Table" and source_df.options != target_df.options:
            unusable.append((source_field, target_field,
                             f"child doctype differs ({source_df.options} vs {target_df.options})"))
        else:
            usable.append((source_field, target_field))

    return usable, unusable


def _form_fields():
    """The joining form's own field list, so drift shows up instead of hiding."""
    if not frappe.db.exists("Onboarding Portal Forms", JOINING_FORM):
        return []
    return [
        row.fieldname
        for row in frappe.get_doc("Onboarding Portal Forms", JOINING_FORM).portal_fields
        if row.fieldname
    ]


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

def plan():
    """Report what apply() would configure. Writes nothing."""
    usable, unusable = _resolve()

    print(f"{JOINING_FORM} -> Employee\n")
    print(f"WILL MAP ({len(usable)}):")
    for source_field, target_field in usable:
        df = frappe.get_meta(SOURCE_DOCTYPE).get_field(source_field)
        print(f"  {source_field:34} -> {target_field:28} [{df.fieldtype}]")

    if unusable:
        print(f"\nCANNOT MAP ON THIS SITE ({len(unusable)}):")
        for source_field, target_field, why in unusable:
            print(f"  {source_field:34} -> {target_field:28} {why}")

    print(f"\nINTENTIONALLY NOT MAPPED ({len(UNMAPPED)}):")
    for fieldname, why in UNMAPPED.items():
        print(f"  {fieldname:34} {why}")

    form = set(_form_fields())
    if form:
        covered = {s for s, _ in MAPPINGS} | set(UNMAPPED)
        drifted = form - covered
        if drifted:
            print("\nON THE FORM BUT NOT ACCOUNTED FOR HERE:")
            for fieldname in sorted(drifted):
                print(f"  {fieldname}")
        else:
            print(f"\nAll {len(form)} joining-form fields are accounted for.")
    else:
        print(f"\n(no '{JOINING_FORM}' record on this site — form drift not checked)")


def ensure_employee_fields():
    """Add the Employee fields the joining form has nowhere else to land in."""
    created = []
    for spec in EMPLOYEE_FIELDS:
        if frappe.get_meta(TARGET_DOCTYPE).get_field(spec["fieldname"]):
            continue
        create_custom_field(TARGET_DOCTYPE, {**spec, "module": "Recruitment"},
                            ignore_validate=True)
        created.append(spec["fieldname"])

    if created:
        frappe.clear_cache(doctype=TARGET_DOCTYPE)
    print("Employee fields created:", created or "none needed")
    return created


def apply():
    """Provision the missing Employee fields, then write the mapping rows."""
    ensure_employee_fields()

    usable, unusable = _resolve()

    settings = frappe.get_doc("Recruitment Settings")
    kept = [
        row.as_dict()
        for row in settings.recruitment_tool
        if not (row.source_doctype == SOURCE_DOCTYPE and row.target_doctype == TARGET_DOCTYPE)
    ]
    replaced = len(settings.recruitment_tool) - len(kept)
    settings.set("recruitment_tool", kept)

    source_meta = frappe.get_meta(SOURCE_DOCTYPE)
    for source_field, target_field in usable:
        is_table = source_meta.get_field(source_field).fieldtype == "Table"
        settings.append("recruitment_tool", {
            "source_doctype": SOURCE_DOCTYPE,
            "source_field": _picker_value(SOURCE_DOCTYPE, source_field),
            "target_doctype": TARGET_DOCTYPE,
            "target_field": _picker_value(TARGET_DOCTYPE, target_field),
            # Scalars keep the Employee in step with post-hire edits to the
            # Onboarding. Child tables do not: re-syncing one clears the target
            # table and rebuilds it from the Onboarding, so any row HR added
            # directly on the Employee would be wiped on the next Onboarding
            # save. They are copied once, when the Employee is created.
            "fetch_on_update": 0 if is_table else 1,
        })

    settings.save(ignore_permissions=True)
    frappe.clear_document_cache("Recruitment Settings", "Recruitment Settings")
    frappe.db.commit()

    print(f"replaced {replaced} row(s) with {len(usable)}")
    if unusable:
        print(f"skipped {len(unusable)} (run plan() for the reasons)")

    from recruitment.auto_fetch_fields import get_field_map

    resolved = get_field_map(SOURCE_DOCTYPE, TARGET_DOCTYPE)
    print(f"get_field_map now resolves {len(resolved)} mappings")
