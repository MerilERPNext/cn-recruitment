"""Test data for "source-mandatory fields reach the New Hire form".

Sets up one of each case the sync has to handle, through the real save paths
(the settings save fires the hook; a form save runs its own validate):

    phone_number   Mandatory for IJP     -> Employee cell_number (the Field Flow
                                            target is virtual, so it falls back)
    designation    Mandatory for Careers -> Employee designation (same name)
    test1          Mandatory for Refer, only for Knowledge Planet (KP) openings
                                         -> on the all-companies form, NOT on the PW form
    applicant_name (already mandatory)   -> Employee first_name, via Field Flow
    custom_linkedin_url (already)        -> no Employee field: the orange warning

and two forms plus one draft new hire:

    NH Test - All Companies   no company, default form. cell_number starts as
                              Optional here so you can see it forced to Required.
    NH Test - PW Only         company PW, so test1 stays off it.
    draft new hire            raised on the first form WITHOUT a mobile number —
                              submitting it must fail on "Personal Mobile NO".

The settings rows it touches are snapshotted first; `cleanup` puts them back
exactly and deletes everything else it made.

Run:
    bench --site <site> execute recruitment.recruitment.new_hire_source_seed.run
Inspect without changing anything:
    bench --site <site> execute recruitment.recruitment.new_hire_source_seed.report
Undo:
    bench --site <site> execute recruitment.recruitment.new_hire_source_seed.cleanup
"""

import json

import frappe

from recruitment.api import new_hire as nh
from recruitment.recruitment import new_hire_source_fields as src

SETTINGS = src.SETTINGS_DOCTYPE
ROW_DT = src.SETTINGS_ROW_DOCTYPE
SNAPSHOT_KEY = "nh_source_seed_snapshot"
DOMAIN = "nh-source-seed.example"

FORM_ALL = "NH Test - All Companies"
FORM_PW = "NH Test - PW Only"
PW_COMPANY = "PW"
OTHER_COMPANY = "KP"

# reference_name -> values the seed sets on its settings row
SETTINGS_CHANGES = {
    "phone_number": {"mandatory_ijp": 1},
    "designation": {"mandatory_careers": 1},
    "test1": {
        "mandatory_refer": 1,
        "applicable_enabled": 1,
        "applicability_config": json.dumps([{"type": "Company", "value": OTHER_COMPANY}]),
    },
}
_SNAPSHOT_COLS = ("applicable_enabled", "applicability_config", *src.SOURCE_COLUMNS)


def _log(msg):
    print(f"  {msg}")


def _messages():
    """What the hooks msgprinted, drained so it doesn't pile up."""
    out = []
    for entry in getattr(frappe.local, "message_log", None) or []:
        if isinstance(entry, str):
            try:
                entry = json.loads(entry)
            except ValueError:
                pass
        text = entry.get("message") if isinstance(entry, dict) else entry
        if text:
            out.append(frappe.utils.strip_html(str(text)))
    frappe.local.message_log = []
    return out


def _read_snapshot():
    """Straight from the table: the defaults cache can lag a rolled-back write, and
    a stale "no snapshot" would make cleanup leave the seeded settings in place."""
    return frappe.db.get_value("DefaultValue", {"parent": "__global", "defkey": SNAPSHOT_KEY}, "defvalue")


def _settings_rows(settings):
    return {r.reference_name: r for r in settings.default_application_fields if r.reference_name}


# ------------------------------------------------------------------------ run --

def _snapshot(settings):
    """Record the rows' original values — once, so a re-run can't overwrite the
    originals with the seed's own values."""
    if _read_snapshot():
        return
    rows = _settings_rows(settings)
    snap = {
        ref: {col: rows[ref].get(col) for col in _SNAPSHOT_COLS}
        for ref in SETTINGS_CHANGES
        if ref in rows
    }
    frappe.db.set_global(SNAPSHOT_KEY, json.dumps(snap))
    _log(f"snapshotted settings rows: {', '.join(snap)}")


def _ensure_form(name, company, is_default):
    if frappe.db.exists("New Hire Form", name):
        _log(f"{name}: exists")
        return
    doc = frappe.get_doc({
        "doctype": "New Hire Form",
        "form_name": name,
        "is_default": is_default,
        "restrict_to_configured": 1,
    }).insert(ignore_permissions=True)
    # Insert fills a blank Company from the user's default — set it explicitly.
    if (doc.company or "") != (company or ""):
        doc.company = company
        doc.save(ignore_permissions=True)
    result = nh.seed_default_fields(form=name)
    _log(f"{name}: created (company={company or 'all'}), "
         f"{len(result.get('data', {}).get('added', []))} default fields")


def _make_cell_number_optional():
    """Start cell_number as Optional so the sync visibly flips it to Required."""
    doc = frappe.get_doc("New Hire Form", FORM_ALL)
    row = next((r for r in doc.field_overrides if r.fieldname == "cell_number"), None)
    if row and not row.get(src.SOURCE_FLAG):
        row.mandatory_override = "Optional"
        doc.flags.source_fields_synced = True
        doc.save(ignore_permissions=True)
        _log(f"{FORM_ALL}: cell_number set to Optional before the settings change")


def _apply_settings():
    settings = frappe.get_single(SETTINGS)
    _snapshot(settings)
    rows = _settings_rows(settings)
    for ref, values in SETTINGS_CHANGES.items():
        row = rows.get(ref)
        if not row:
            _log(f"! {ref} is not in {SETTINGS} — skipped")
            continue
        row.update(values)
    settings.save(ignore_permissions=True)  # fires sync_all_forms
    _log(f"{SETTINGS} saved; the hook said:")
    for msg in _messages():
        _log(f"    {msg}")


def _draft_new_hire():
    email = f"source.test@{DOMAIN}"
    existing = frappe.db.get_value("Employee", {"personal_email": email}, "name")
    if existing:
        _log(f"draft new hire: already {existing}")
        return existing
    payload = {
        "first_name": "Source",
        "last_name": "Mandatory Test",
        "gender": "Male",
        "personal_email": email,
        "company_email": email,
        "date_of_joining": frappe.utils.add_days(frappe.utils.today(), 30),
        "company": PW_COMPANY,
        "department": (frappe.db.get_value("Department", {"company": PW_COMPANY}, "name")
                       or frappe.db.get_value("Department", {}, "name")),
        "designation": frappe.db.get_value("Designation", {}, "name"),
        "date_of_birth": "1998-05-14",
        # no cell_number — that's the point
    }
    result = nh.create_new_hire(payload=payload, form=FORM_ALL, submit=0)
    _messages()
    if not result.get("success"):
        _log(f"! draft new hire not created: {result.get('message')}")
        return None
    _log(f"draft new hire: {result['data']['name']} (stage {result['data']['stage']})")
    return result["data"]["name"]


def run():
    print(f"\nSeeding source-mandatory New Hire test data\n")
    setup = nh.setup_new_hire_support()  # the Employee stage/form fields; idempotent
    if setup.get("data", {}).get("created_fields"):
        _log(f"added Employee fields: {setup['data']['created_fields']}")

    _ensure_form(FORM_ALL, None, 1)
    _ensure_form(FORM_PW, PW_COMPANY, 0)
    _make_cell_number_optional()
    _apply_settings()
    _draft_new_hire()
    frappe.db.commit()
    print()
    report()


# --------------------------------------------------------------------- report --

def report():
    print("Settings rows the seed touches:")
    for ref in (*SETTINGS_CHANGES, "applicant_name", "custom_linkedin_url"):
        row = frappe.db.get_value(ROW_DT, {"parenttype": SETTINGS, "reference_name": ref},
                                  list(_SNAPSHOT_COLS), as_dict=True)
        if not row:
            continue
        sources = [label for col, label in src.SOURCE_COLUMNS.items() if row.get(col)]
        scope = f"  scope={row.applicability_config}" if row.applicable_enabled else ""
        print(f"  {ref:22s} mandatory for: {', '.join(sources) or '-'}{scope}")

    unmapped = []
    fields = src.source_mandatory_fields(unmapped)
    print("\nMaps to Employee:")
    for fn, entry in fields.items():
        print(f"  {entry['applicant_field']:22s} -> {fn:16s} ({', '.join(entry['sources'])})")
    for ref in unmapped:
        print(f"  {ref:22s} -> (no Employee field — not added)")

    for name in (FORM_ALL, FORM_PW):
        if not frappe.db.exists("New Hire Form", name):
            continue
        doc = frappe.get_doc("New Hire Form", name)
        print(f"\n{name}  (company: {doc.company or 'all'})")
        for row in doc.field_overrides:
            flag = "  <- mandatory at source" if row.get(src.SOURCE_FLAG) else ""
            print(f"  {row.fieldname:18s} {row.expose:7s} {row.mandatory_override:9s}{flag}")
        config = nh._build_form_config(doc)
        required = [f["label"] for t in config["tabs"] for s in t["sections"]
                    for f in s["fields"] if f["is_mandatory"]]
        print(f"  renders as required: {', '.join(required)}")

    for emp in frappe.get_all("Employee", filters={"personal_email": ["like", f"%@{DOMAIN}"]},
                              fields=["name", "employee_name", nh.FORM_FIELD, nh.STAGE_FIELD]):
        doc = frappe.get_doc("Employee", emp.name)
        form = nh.resolve_form(form=emp.get(nh.FORM_FIELD))
        try:
            nh._validate_mandatory(doc, form, config=nh._build_form_config(
                form, employment_type=doc.get("employment_type")))
            verdict = "would submit (nothing missing)"
        except frappe.ValidationError as exc:
            verdict = f"submit blocked -> {exc}"
        _messages()
        print(f"\nDraft new hire {emp.name} ({emp.employee_name}), stage {emp.get(nh.STAGE_FIELD)}")
        print(f"  {verdict}")


# -------------------------------------------------------------------- cleanup --

def cleanup():
    print("\nRemoving source-mandatory New Hire test data\n")
    for name in frappe.get_all("Employee", filters={"personal_email": ["like", f"%@{DOMAIN}"]},
                               pluck="name"):
        _drop("Employee", name)

    for name in (FORM_ALL, FORM_PW):
        if frappe.db.exists("New Hire Form", name):
            _drop("New Hire Form", name)

    raw = _read_snapshot()
    if raw:
        snap = json.loads(raw)
        settings = frappe.get_single(SETTINGS)
        rows = _settings_rows(settings)
        for ref, values in snap.items():
            if ref in rows:
                rows[ref].update(values)
        settings.save(ignore_permissions=True)
        frappe.defaults.clear_default(SNAPSHOT_KEY, parent="__global")
        _messages()
        _log(f"restored settings rows: {', '.join(snap)}")
    else:
        _log("no settings snapshot — settings left as they are")

    frappe.db.commit()


def _drop(doctype, name):
    try:
        frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        _log(f"removed {doctype} {name}")
    except Exception as exc:
        _log(f"kept {doctype} {name} — {str(exc)[:120]}")
