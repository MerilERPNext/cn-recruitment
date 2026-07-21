"""Statutory forms generator.

Builds a filled `Employee PF Form 11` and `Employee Gratuity Nomination`
record from an approved Employee Onboarding, renders each via its Print
Format, and attaches the PDF both to the form record (`generated_pdf`)
and back onto the Employee Onboarding's existing `custom_pf_form` /
`custom_gratuity_form` fields on the Statutory tab.

Public entry points are whitelisted so the HR button on Employee
Onboarding can invoke them; future state-machine hooks can also call
`generate_all(onboarding_name)` directly.

Locked statuses (Signed, Filed) refuse overwrites — HR must move the
record back to Draft to regenerate.
"""

import frappe
from frappe import _
from frappe.utils import now, today
from frappe.utils.file_manager import save_file
from frappe.utils.pdf import get_pdf


PF_FORM_DOCTYPE = "Employee PF Form 11"
GRATUITY_FORM_DOCTYPE = "Employee Gratuity Nomination"

PF_PRINT_FORMAT = "Employee PF Form 11"
GRATUITY_PRINT_FORMAT = "Employee Gratuity Nomination Form F"

EO_PF_ATTACH_FIELD = "custom_pf_form"
EO_GRATUITY_ATTACH_FIELD = "custom_gratuity_form"

LOCKED_STATUSES = ("Signed", "Filed")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@frappe.whitelist()
def generate_all(onboarding_name, force=False):
    force = _coerce_bool(force)
    return {
        "pf_form_11": generate_pf_form_11(onboarding_name, force=force),
        "gratuity_nomination": generate_gratuity_nomination(onboarding_name, force=force),
    }


@frappe.whitelist()
def generate_pf_form_11(onboarding_name, force=False):
    force = _coerce_bool(force)
    onboarding = frappe.get_doc("Employee Onboarding", onboarding_name)
    form = _get_or_create_form(PF_FORM_DOCTYPE, onboarding_name)

    if form.status in LOCKED_STATUSES and not force:
        return _locked_result(form)

    _populate_pf_form(form, onboarding)
    form.status = "Generated"
    form.generated_on = now()
    form.flags.ignore_permissions = True
    form.save()

    pdf_url = _render_and_attach(
        form_doc=form,
        print_format=PF_PRINT_FORMAT,
        eo_doc=onboarding,
        eo_field=EO_PF_ATTACH_FIELD,
        file_prefix="PF-Form-11",
    )
    return {"name": form.name, "status": form.status, "pdf_url": pdf_url, "skipped": False}


@frappe.whitelist()
def generate_gratuity_nomination(onboarding_name, force=False):
    force = _coerce_bool(force)
    onboarding = frappe.get_doc("Employee Onboarding", onboarding_name)
    form = _get_or_create_form(GRATUITY_FORM_DOCTYPE, onboarding_name)

    if form.status in LOCKED_STATUSES and not force:
        return _locked_result(form)

    _populate_gratuity_form(form, onboarding)
    form.status = "Generated"
    form.generated_on = now()
    form.flags.ignore_permissions = True
    form.save()

    pdf_url = _render_and_attach(
        form_doc=form,
        print_format=GRATUITY_PRINT_FORMAT,
        eo_doc=onboarding,
        eo_field=EO_GRATUITY_ATTACH_FIELD,
        file_prefix="Gratuity-Form-F",
    )
    return {"name": form.name, "status": form.status, "pdf_url": pdf_url, "skipped": False}


@frappe.whitelist()
def generate_bulk(onboarding_names, mode="all", force=True):
    """Bulk variant of the per-record statutory generators for the list view.

    `onboarding_names` is a JSON list (or list) of Employee Onboarding names.
    `mode` is one of: "pf" (PF Form 11 only), "gratuity" (Gratuity Nomination
    only), or "all" (both). Each onboarding is processed independently and a bad
    one never aborts the batch — failures are logged and tallied. Reuses the exact
    same single-record logic (autofill -> render -> attach to the EO Statutory
    fields), so behaviour matches the on-form button precisely.

    Returns processed / succeeded / skipped (locked) / failed counts plus per-row
    details for the UI summary."""
    force = _coerce_bool(force)

    if isinstance(onboarding_names, str):
        onboarding_names = frappe.parse_json(onboarding_names or "[]")
    onboarding_names = onboarding_names or []

    if mode not in ("pf", "gratuity", "all"):
        frappe.throw(_("Invalid mode: {0}").format(mode))

    succeeded = skipped = failed = 0
    details = []

    for name in onboarding_names:
        try:
            if not frappe.db.exists("Employee Onboarding", name):
                failed += 1
                details.append({"name": name, "ok": False, "message": _("Onboarding not found")})
                continue

            if mode == "pf":
                results = {"pf_form_11": generate_pf_form_11(name, force=force)}
            elif mode == "gratuity":
                results = {"gratuity_nomination": generate_gratuity_nomination(name, force=force)}
            else:
                results = generate_all(name, force=force)

            sub_results = list(results.values())
            # "Skipped" only when EVERY requested form was locked (Signed/Filed).
            was_skipped = bool(sub_results) and all(r.get("skipped") for r in sub_results)
            if was_skipped:
                skipped += 1
                details.append({"name": name, "ok": True, "skipped": True, "results": results})
            else:
                succeeded += 1
                details.append({"name": name, "ok": True, "skipped": False, "results": results})
        except Exception:
            failed += 1
            frappe.log_error(frappe.get_traceback(), "Bulk Statutory Forms")
            details.append({"name": name, "ok": False, "message": _("Error — see Error Log")})

    frappe.db.commit()

    return {
        "processed": len(onboarding_names),
        "succeeded": succeeded,
        "skipped": skipped,
        "failed": failed,
        "details": details,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_form(doctype, onboarding_name):
    name = frappe.db.get_value(doctype, {"employee_onboarding": onboarding_name}, "name")
    if name:
        return frappe.get_doc(doctype, name)
    return frappe.new_doc(doctype, employee_onboarding=onboarding_name)


def _locked_result(form):
    return {
        "name": form.name,
        "status": form.status,
        "skipped": True,
        "message": _("Form is {0} — move it back to Draft before regenerating.").format(form.status),
    }


# ---------------------------------------------------------------------------
# Field mapping: Employee Onboarding -> PF Form 11
# ---------------------------------------------------------------------------

def _populate_pf_form(form, eo):
    form.member_name = _full_name(eo)

    marital = (eo.get("custom_marital_status") or "").strip()
    spouse_name = _find_family_member(eo, "Spouse")
    if marital == "Married" and spouse_name:
        form.name_type = "Spouse"
        form.fathers_or_spouse_name = spouse_name
    else:
        form.name_type = "Father"
        form.fathers_or_spouse_name = eo.get("custom_fathers_name")

    form.date_of_birth = eo.get("custom_date_of_birth")
    form.gender = _normalize_gender(eo.get("custom_gender"))
    form.marital_status = _normalize_marital(marital)
    form.email_id = eo.get("custom_personal_email_id")
    form.mobile_number = eo.get("custom_mobile_number")

    has_prev = (eo.get("custom_has_previous_work_experience") or "").strip() == "Yes"
    form.was_epf_member = 1 if (has_prev and eo.get("custom_uan")) else 0
    form.was_eps_member = 1 if (eo.get("custom_were_you_eligible_for_pension_under_eps") or "") == "Yes" else 0
    form.uan = eo.get("custom_uan")
    if has_prev:
        form.previous_employment_exit_date = _last_employment_exit_date(eo)

    nationality = (eo.get("custom_nationality") or "").strip()
    is_intl = bool(nationality and nationality.lower() != "india")
    form.is_international_worker = 1 if is_intl else 0
    if is_intl:
        form.country_of_origin = nationality
    if (eo.get("custom_has_passport") or "") == "Yes":
        form.passport_no = eo.get("custom_passport_number")

    form.bank_account_no = eo.get("custom_account_number")
    form.ifsc_code = eo.get("custom_ifsc_code")
    form.aadhaar_number = eo.get("custom_aadhaar_number")
    form.pan_number = eo.get("custom_pan_number")


def _find_family_member(eo, relation):
    for row in (eo.get("custom_family_details") or []):
        if (row.get("relation") or "").strip().lower() == relation.lower():
            return row.get("member_name")
    return None


def _last_employment_exit_date(eo):
    rows = eo.get("custom_employment_history") or []
    candidates = [r.get("end_date") for r in rows if r.get("end_date")]
    return max(candidates) if candidates else None


def _full_name(eo):
    parts = [eo.get("custom_first_name"), eo.get("custom_middle_name"), eo.get("custom_last_name")]
    full = " ".join(p for p in parts if p)
    return full or eo.get("employee_name")


def _normalize_gender(g):
    if not g:
        return None
    g = g.strip().capitalize()
    return g if g in ("Male", "Female", "Transgender") else g


def _normalize_marital(m):
    if not m:
        return None
    m = m.strip().capitalize()
    return m if m in ("Married", "Unmarried", "Widow", "Widower", "Divorcee") else m


# ---------------------------------------------------------------------------
# Field mapping: Employee Onboarding -> Gratuity Nomination
# ---------------------------------------------------------------------------

def _populate_gratuity_form(form, eo):
    form.employee_name = _full_name(eo)
    form.sex = _gender_to_sex(eo.get("custom_gender"))
    form.religion = eo.get("custom_religion")
    form.marital_status = _normalize_marital(eo.get("custom_marital_status"))
    form.department = eo.get("department")
    form.branch = eo.get("custom_work_location")
    form.designation = eo.get("designation")
    form.date_of_appointment = eo.get("date_of_joining")
    form.permanent_address = _join_permanent_address(eo)

    form.set("nominees", [])
    gratuity_rows = [r for r in (eo.get("custom_nomination_details") or [])
                     if (r.get("nomination_type") or "").strip() == "Gratuity"]
    source_rows = gratuity_rows or list(eo.get("custom_nomination_details") or [])

    for src in source_rows:
        form.append("nominees", {
            "nominee_name": src.get("nominee_name"),
            "relationship": src.get("relation"),
            "nominee_address": src.get("address"),
            "age": src.get("age"),
            "share_percentage": src.get("percentage"),
        })

    form.has_family = 1 if form.nominees else 0
    form.parents_dependent = 0
    if not form.place_of_signing:
        form.place_of_signing = eo.get("custom_permanent_city")
    if not form.date_of_signing:
        form.date_of_signing = today()


def _gender_to_sex(g):
    if not g:
        return None
    g = g.strip().capitalize()
    if g in ("Male", "Female"):
        return g
    return "Other"


def _join_permanent_address(eo):
    parts = [
        eo.get("custom_permanent_address"),
        eo.get("custom_permanent_city"),
        eo.get("custom_permanent_state"),
        eo.get("custom_permanent_postal_code"),
    ]
    return ", ".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# PDF render + dual attach
# ---------------------------------------------------------------------------

def _render_and_attach(form_doc, print_format, eo_doc, eo_field, file_prefix):
    html = frappe.get_print(
        doctype=form_doc.doctype,
        name=form_doc.name,
        print_format=print_format,
        as_pdf=False,
        no_letterhead=True,
    )
    pdf_bytes = get_pdf(html)
    filename = "{0}-{1}.pdf".format(file_prefix, form_doc.name)

    # Attach the PDF to the statutory form record (its `generated_pdf` field)...
    _attach_pdf_to_field(form_doc.doctype, form_doc.name, "generated_pdf", filename, pdf_bytes)

    # ...and a copy owned by the Employee Onboarding itself, so the read-only
    # Attach field on the Statutory tab points at a file the EO owns. Owning the
    # file avoids cross-doctype private-file permission issues (HR opening the EO
    # field would otherwise be permission-checked against the statutory form) and
    # makes the PDF show under the EO's Attachments.
    return _attach_pdf_to_field("Employee Onboarding", eo_doc.name, eo_field, filename, pdf_bytes)


def _attach_pdf_to_field(dt, dn, fieldname, filename, pdf_bytes):
    """Point `dt.dn.fieldname` (an Attach field) at a fresh private PDF owned by
    that document, removing any file previously attached to the same field so
    regenerations don't orphan attachments. Returns the new file URL."""
    _remove_field_files(dt, dn, fieldname)
    file_doc = save_file(
        filename,
        pdf_bytes,
        dt,
        dn,
        df=fieldname,
        is_private=1,
    )
    frappe.db.set_value(dt, dn, fieldname, file_doc.file_url, update_modified=False)
    return file_doc.file_url


def _remove_field_files(dt, dn, fieldname):
    """Delete File records previously attached to `dt.dn` on `fieldname`.
    Failures are logged but never abort generation."""
    existing = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": dt,
            "attached_to_name": dn,
            "attached_to_field": fieldname,
        },
        pluck="name",
    )
    for file_name in existing:
        try:
            frappe.delete_doc("File", file_name, ignore_permissions=True, delete_permanently=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "statutory_forms: old attachment cleanup failed")


def _coerce_bool(val):
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        return val.strip().lower() in ("1", "true", "yes", "y", "on")
    return False
