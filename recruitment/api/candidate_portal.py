import frappe
from frappe import _

from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity, get_current_candidate

_LAYOUT_TYPES = frozenset({
    "Column Break", "Tab Break", "Section Break", "HTML", "HTML Editor",
    "Button", "Fold", "Heading", "Break", "Image", "Attach Image",
    "Signature", "Color", "Barcode", "Geolocation",
})

_SKIP_FIELDNAMES = frozenset({
    "naming_series", "amended_from", "amendment_date",
    "custom_field_approval_json", "custom_approval_html",
    "custom_field_level_approvals",
    "custom_candidate_portal_fields_tab",
    "custom_candidate_portal_fields",
    "custom_onboarding_portal_form",
})


def _read_onboarding_meta():
    try:
        meta = frappe.get_meta("Employee Onboarding")
    except Exception:
        return []

    result = []
    current_tab = ""
    current_section = ""
    skip_tab_labels = {"Field Level Approvals"}

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label and tab_label not in skip_tab_labels:
                current_tab = tab_label
                current_section = ""
            continue

        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section = sec_label
            continue

        if df.fieldtype in _LAYOUT_TYPES or df.fieldname in _SKIP_FIELDNAMES or df.get("hidden"):
            continue

        result.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "tab_label": current_tab,
            "section_label": current_section,
            "options": df.options or "",
            "reqd": df.reqd or 0,
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
            "read_only": df.read_only or 0,
            "length": df.get("length") or 0,
        })

    return result


def _read_job_applicant_meta(include_hidden=False, include_skipped=False):
    try:
        meta = frappe.get_meta("Job Applicant")
    except Exception:
        return []

    result = []
    current_tab = ""
    current_section = ""

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            tab_label = (df.label or "").strip()
            if tab_label:
                current_tab = tab_label
                current_section = ""
            continue

        if df.fieldtype == "Section Break":
            sec_label = (df.label or "").strip()
            if sec_label:
                current_section = sec_label
            continue

        if df.fieldtype in _LAYOUT_TYPES:
            continue
        if not df.fieldname:
            continue
        if not include_skipped and df.fieldname in _SKIP_FIELDNAMES:
            continue
        if not include_hidden and df.get("hidden"):
            continue

        result.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "tab_label": current_tab,
            "section_label": current_section,
            "options": df.options or "",
            "reqd": df.reqd or 0,
        })

    return result


def _get_default_onboarding_portal_form_name():
    return frappe.db.get_value(
        "Onboarding Portal Forms",
        {"default": 1},
        "name",
        order_by="modified desc",
    )


def resolve_onboarding_portal_form(job_applicant=None):
    """Pick the Onboarding Portal Form for a candidate by User Assignment.

    A form lists one or more Dynamic User Assignments (Target Type = Job
    Applicant) and applies to whichever candidates any of them select. This
    replaces the older Department + Designation matching, which forced HR to
    express a candidate segment as a single dept/designation pair.

    Each assignment's conditions are evaluated live against this candidate
    rather than read from its Assigned Users table, which is only a snapshot
    refreshed when the assignment is saved — so a candidate created since that
    save is still matched correctly.

    Where several forms match, the most recently modified wins. Falls back to the
    form flagged Default, so onboarding never hard-fails.

    Returns the form name or None.
    """
    if job_applicant:
        from nextai.nextai.doctype.dynamic_user_assignment.dynamic_user_assignment import (
            check_target_matches_conditions,
        )

        # One pass over the child table, grouped by form, so a form with several
        # assignments costs one query rather than one per assignment. Queried via
        # the query builder because get_all drops the child Link column here.
        child = frappe.qb.DocType("Onboarding Portal Form Assignment")
        rows = (
            frappe.qb.from_(child)
            .select(child.parent, child.user_assignment)
            .where(child.parenttype == "Onboarding Portal Forms")
        ).run(as_dict=True)
        duas_by_form = {}
        for row in rows:
            if row.user_assignment:
                duas_by_form.setdefault(row.parent, []).append(row.user_assignment)

        for form_name in frappe.get_all(
            "Onboarding Portal Forms", pluck="name", order_by="modified desc"
        ):
            for dua in duas_by_form.get(form_name, []):
                try:
                    if check_target_matches_conditions(dua, job_applicant):
                        return form_name
                except Exception:
                    # One misconfigured assignment (bad field name, deleted DUA)
                    # shouldn't block the other assignments, forms, or fallback.
                    frappe.log_error(
                        frappe.get_traceback(),
                        f"resolve_onboarding_portal_form: match failed for {form_name} / {dua}",
                    )

    return _get_default_onboarding_portal_form_name()


def _get_portal_settings(form_name=None):
    try:
        settings_name = form_name or _get_default_onboarding_portal_form_name()
        if not settings_name:
            return []
        return frappe.get_doc("Onboarding Portal Forms", settings_name).portal_fields or []
    except Exception:
        return []


def _get_onboarding_name_by_job_applicant(job_applicant_id):
    return frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": job_applicant_id, "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )


def _get_onboarding_portal_rows(onboarding_doc=None, pre_release=None):
    """
    Returns (portal_field_rows, form_source) based on priority:
      1. Active Pre Onboarding Release's selected form -> "pre_release_form"
         (HR's latest intent for this candidate wins.)
      2. custom_candidate_portal_fields child table    -> "per_record_fields"
      3. custom_onboarding_portal_form linked form     -> "linked_form"
      4. Global default Onboarding Portal Forms        -> "default_form"
    """
    if pre_release and pre_release.get("onboarding_portal_form"):
        return _get_portal_settings(pre_release["onboarding_portal_form"]), "pre_release_form"

    if onboarding_doc and onboarding_doc.meta.get_field("custom_candidate_portal_fields"):
        rows = onboarding_doc.get("custom_candidate_portal_fields") or []
        if rows:
            return rows, "per_record_fields"

    selected_form = None
    if onboarding_doc and onboarding_doc.meta.get_field("custom_onboarding_portal_form"):
        selected_form = onboarding_doc.get("custom_onboarding_portal_form")

    if selected_form:
        return _get_portal_settings(selected_form), "linked_form"

    return _get_portal_settings(None), "default_form"


def _get_active_pre_release(job_applicant):
    """Returns a dict describing the applicant's released pre-onboarding state when
    no Employee Onboarding has been materialized yet, or None.

    The dict shape mirrors the legacy Pre Onboarding Release row:
      {"name": <job_applicant_id>, "onboarding_portal_form": <form>}
    `name` is the applicant ID since pre-release data now lives on Job Applicant.
    """
    if not job_applicant:
        return None
    row = frappe.db.get_value(
        "Job Applicant",
        job_applicant,
        [
            "custom_onboarding_portal_form",
            "custom_pre_onboarding_status",
            "custom_pre_onboarding_employee_onboarding",
        ],
        as_dict=True,
    )
    if not row:
        return None
    if row.get("custom_pre_onboarding_employee_onboarding"):
        return None
    if (row.get("custom_pre_onboarding_status") or "") not in ("Released", "Draft"):
        return None
    if not row.get("custom_onboarding_portal_form"):
        return None
    return {
        "name": job_applicant,
        "onboarding_portal_form": row["custom_onboarding_portal_form"],
    }


_KEY_CONTACT_ROLES = (
    ("custom_onboarding_buddy", "Onboarding Buddy"),
    ("custom_joining_buddy", "Joining Buddy"),
    ("custom_manager", "Manager"),
)


def _iter_onboarding_contact_users(eo_doc, applicant_doc=None):
    """Yield ``(user_id, role_label)`` for the onboarding key contacts, read straight
    from the Onboarding Setup fields — Onboarding Buddy + Teammates (Table MultiSelect,
    each holding multiple Users) and Manager (single User Link). Falls back to the same
    fields on the Job Applicant when the onboarding has none.

    This replaces the old ``custom_key_contacts`` child table: the buddy/manager fields
    are now the single source of truth, so no separate contacts table is maintained."""
    for source_field, role_label in _KEY_CONTACT_ROLES:
        value = eo_doc.get(source_field) if eo_doc is not None else None
        if not value and applicant_doc is not None:
            value = applicant_doc.get(source_field)
        if not value:
            continue

        if isinstance(value, list):
            # Table MultiSelect (Onboarding Buddy User rows) -> each row's `user`.
            for row in value:
                user_id = row.get("user") if hasattr(row, "get") else getattr(row, "user", None)
                if user_id:
                    yield user_id, role_label
        else:
            # Single Link (User) — e.g. Manager, or the applicant's scalar fields.
            yield value, role_label


def _seed_buddy_table(doc, fieldname, users):
    """Seed an Employee Onboarding Table MultiSelect (child: Onboarding Buddy User, link
    field 'user') with the given users — but ONLY when the table is still empty, so a
    manual selection (or an earlier run) is never overwritten. Blanks, duplicates and
    non-existent users are skipped."""
    if doc.get(fieldname):
        return
    seen = set()
    for u in users:
        if u and u not in seen and frappe.db.exists("User", u):
            doc.append(fieldname, {"user": u})
            seen.add(u)


def _apply_onboarding_automation_fields(doc, applicant, job_offer_name=None):
    """Phase-1 onboarding automation. Stamps the Onboarding Setup tab fields onto the
    Employee Onboarding draft:
      - Recruiter      <- Job Applicant.custom_recruiter (flows from Requisition/Opening)
      - Onboarding SPOC<- Job Offer creator (owner), else the initiating session user
      - Onboarding Buddy / Teammates (Table MultiSelect) <- the applicant's manual pick
                          PLUS every user from the matching Onboarding Buddy Assignment
                          Rule (multi-select).
      - Manager (single Link) <- applicant's manual pick, else the rule's Manager
                          (Employee resolved to its linked User).

    Tables are only seeded when empty and single values only when blank, so a manual
    override — or a second run — never clobbers existing data. Best-effort: never raises
    and never blocks onboarding creation."""
    try:
        if not doc.get("custom_onboarding_recruiter") and applicant.get("custom_recruiter"):
            doc.custom_onboarding_recruiter = applicant.get("custom_recruiter")

        if not doc.get("custom_onboarding_spoc"):
            spoc = None
            if job_offer_name:
                spoc = frappe.db.get_value("Job Offer", job_offer_name, "owner")
            spoc = spoc or frappe.session.user
            if spoc and spoc != "Guest" and frappe.db.exists("User", spoc):
                doc.custom_onboarding_spoc = spoc

        # Rule-based multi assignments (lists of users) + single Manager.
        try:
            from recruitment.recruitment.doctype.onboarding_buddy_assignment_rule.onboarding_buddy_assignment_rule import (
                resolve_onboarding_assignments,
            )
            assigns = resolve_onboarding_assignments(applicant.name) or {}
        except Exception:
            assigns = {}

        # Onboarding Buddy (Table MultiSelect) = applicant's manual pick + rule buddies.
        _seed_buddy_table(
            doc, "custom_onboarding_buddy",
            [applicant.get("custom_onboarding_buddy")] + (assigns.get("Onboarding Buddy") or []),
        )
        # Teammates (Table MultiSelect, stored on custom_joining_buddy) = manual + rule teammates.
        _seed_buddy_table(
            doc, "custom_joining_buddy",
            [applicant.get("custom_joining_buddy")] + (assigns.get("Teammates") or []),
        )
        # Manager is a single Link (User): applicant's manual pick, else the rule's manager.
        if not doc.get("custom_manager"):
            manager = applicant.get("custom_manager") or assigns.get("Manager")
            if manager:
                doc.custom_manager = manager
    except Exception:
        frappe.log_error(frappe.get_traceback(), "materialize_onboarding: apply automation fields failed")


# Employee Onboarding fields that materialize_onboarding_from_applicant manages
# explicitly (or that must never be auto-overwritten) — auto-map leaves these alone.
_ONBOARDING_AUTOMAP_SKIP = frozenset({
    "job_applicant", "job_offer", "employee", "amended_from", "naming_series",
    "boarding_status", "employee_onboarding_template", "date_of_joining",
    "boarding_begins_on", "custom_onboarding_portal_form", "custom_bgv_vendor",
    "custom_onboarding_buddy", "custom_joining_buddy", "custom_manager",
    # Onboarding Automation tab — populated explicitly by _apply_onboarding_automation_fields.
    "custom_onboarding_recruiter", "custom_onboarding_spoc", "custom_onboarding_teammates",
})

# Fieldtypes safe to copy by value. Excludes attachments, JSON, signatures, ratings
# etc. (handled elsewhere / candidate-supplied), so auto-map only touches plain data.
_ONBOARDING_AUTOMAP_TYPES = frozenset({
    "Data", "Small Text", "Text", "Long Text", "Text Editor", "Select", "Link",
    "Date", "Datetime", "Time", "Int", "Float", "Currency", "Percent", "Check",
})

# Same-meaning fields whose NAME differs across doctypes. Each Employee Onboarding
# field maps to an ordered list of (source, source_fieldname); the first present &
# valid value wins. source is "offer" (Job Offer) or "applicant" (Job Applicant).
_ONBOARDING_FIELD_ALIASES = {
    "custom_first_name":        [("offer", "applicant_name"), ("applicant", "applicant_name")],
    "custom_last_name":         [("offer", "applicant_last_name"), ("applicant", "custom_applicant_last_name")],
    "custom_mobile_number":     [("applicant", "phone_number"), ("offer", "custom_phone_number")],
    "custom_personal_email_id": [("applicant", "email_id"), ("offer", "applicant_email")],
    "department":               [("applicant", "custom_department"), ("applicant", "custom_division_finalized")],
    "custom_work_location":     [("applicant", "custom_location")],
    "custom_nationality":       [("applicant", "country")],
}


def _auto_map_offer_applicant_fields(doc, applicant, job_offer_name=None):
    """Best-effort prefill: copy Job Offer / Job Applicant values into the matching
    Employee Onboarding fields at creation, so HR and the candidate start from a
    populated draft instead of a blank form.

    Contract (important): NEVER raises and NEVER blocks onboarding creation. Any
    field whose source value is missing, or whose Link/Select value would be
    invalid, is simply skipped and left blank/editable — so the later
    doc.insert() can't fail because of an auto-mapped value. Precedence is Job
    Offer first (final terms), then Job Applicant. Fields the materialize flow
    sets explicitly (DOJ, portal form, buddies, BGV vendor, links) are untouched."""
    try:
        offer = None
        if job_offer_name:
            try:
                offer = frappe.get_doc("Job Offer", job_offer_name)
            except Exception:
                offer = None

        source_docs = {"offer": offer, "applicant": applicant}
        source_meta = {}
        for key, sdoc in source_docs.items():
            if sdoc is None:
                continue
            try:
                source_meta[key] = frappe.get_meta(sdoc.doctype)
            except Exception:
                source_meta[key] = None

        def src_value(src_key, fieldname):
            sdoc = source_docs.get(src_key)
            smeta = source_meta.get(src_key)
            if not sdoc or not smeta or not smeta.get_field(fieldname):
                return None
            val = sdoc.get(fieldname)
            return val if val not in (None, "") else None

        def assign(eo_df, value):
            """Validate-then-set; returns True only if the value was applied."""
            if value in (None, ""):
                return False
            ft = eo_df.fieldtype
            if ft == "Link":
                if not eo_df.options or not frappe.db.exists(eo_df.options, value):
                    return False
            elif ft == "Select":
                options = [o.strip() for o in (eo_df.options or "").split("\n")]
                if value not in options:
                    return False
            try:
                doc.set(eo_df.fieldname, value)
                return True
            except Exception:
                return False

        eo_meta = frappe.get_meta("Employee Onboarding")

        # (1) Same fieldname on both sides — Offer precedence, then Applicant.
        for df in eo_meta.fields:
            f = df.fieldname
            if not f or df.fieldtype not in _ONBOARDING_AUTOMAP_TYPES:
                continue
            if f in _ONBOARDING_AUTOMAP_SKIP or f in _ONBOARDING_FIELD_ALIASES:
                continue
            for src_key in ("offer", "applicant"):
                if assign(df, src_value(src_key, f)):
                    break

        # (2) Same meaning, different fieldname — curated aliases.
        for eo_field, candidates in _ONBOARDING_FIELD_ALIASES.items():
            df = eo_meta.get_field(eo_field)
            if not df:
                continue
            for src_key, src_field in candidates:
                if assign(df, src_value(src_key, src_field)):
                    break

        # (3) employee_name = First + Last (only if still blank).
        if not doc.get("employee_name"):
            first = doc.get("custom_first_name") or src_value("offer", "applicant_name") or src_value("applicant", "applicant_name")
            last = doc.get("custom_last_name") or src_value("offer", "applicant_last_name") or src_value("applicant", "custom_applicant_last_name")
            full = " ".join(p for p in [first, last] if p).strip()
            if full:
                try:
                    doc.employee_name = full
                except Exception:
                    pass
    except Exception:
        # Auto-map is purely additive convenience — never let it break creation.
        frappe.log_error(frappe.get_traceback(), "materialize_onboarding: auto-map fields failed")


def _dpdp_consent_pending(job_applicant_id):
    """True when DPDP consent is *enforced* for this applicant but not yet given.

    Gates auto-creation of Employee Onboarding: while consent is pending, onboarding
    must not be instantiated. Defensive by design — if the feature is off, the
    setting is not enforcing, or the DPDP doctypes are not present on the site, this
    returns False so the flow behaves exactly as it does today.
    """
    try:
        from frappe.utils import cint
        from recruitment.job_offer_utils import is_dpdp_consent_enabled

        if not is_dpdp_consent_enabled():
            return False
        if not cint(frappe.db.get_single_value("DPDP Act Settings", "enforce_before_onboarding")):
            return False
        given = frappe.db.get_value(
            "Job Applicant DPDP Consent Log",
            {"job_applicant": job_applicant_id, "docstatus": 1, "consent_given": 1},
            "name",
        )
        return not bool(given)
    except Exception:
        return False


def materialize_onboarding_from_applicant(job_applicant_id, prefill=None):
    """Creates the Employee Onboarding doc from the applicant's pre-onboarding fields,
    stamps the release fields onto it, links back via custom_pre_onboarding_employee_onboarding,
    and clears the action item.

    If a draft EO already exists, refreshes BGV Vendor and the Onboarding Setup fields
    (Onboarding Buddy / Teammates / Manager, via _apply_onboarding_automation_fields)
    from the applicant and returns its name."""
    if not job_applicant_id:
        return None

    applicant = frappe.get_doc("Job Applicant", job_applicant_id)

    existing_eo = applicant.get("custom_pre_onboarding_employee_onboarding")
    if existing_eo and not frappe.db.exists("Employee Onboarding", existing_eo):
        # The linked Employee Onboarding was deleted out from under us, leaving a
        # dangling reference on the applicant. Drop it and fall through to create a
        # fresh one — returning the stale name would crash callers that get_doc the
        # result (e.g. _sync_onboarding_action_for_applicant on Job Offer accept).
        applicant.db_set("custom_pre_onboarding_employee_onboarding", None, update_modified=False)
        existing_eo = None
    if existing_eo:
        try:
            eo_doc = frappe.get_doc("Employee Onboarding", existing_eo)
            if eo_doc.docstatus == 0:
                if applicant.get("custom_bgv_vendor"):
                    eo_doc.custom_bgv_vendor = applicant.get("custom_bgv_vendor")
                accepted_offer = frappe.db.get_value(
                    "Job Offer",
                    {"job_applicant": job_applicant_id, "status": "Accepted", "docstatus": ("<", 2)},
                    "name",
                    order_by="creation desc",
                )
                _apply_onboarding_automation_fields(eo_doc, applicant, accepted_offer)
                eo_doc.save(ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "materialize_onboarding_from_applicant: refresh existing EO failed")
        return existing_eo

    # DPDP gate: while consent is enforced for this applicant and not yet given, do
    # NOT auto-instantiate the Employee Onboarding. Creation resumes automatically
    # once the candidate submits consent (submit_dpdp_consent re-runs the auto flow).
    # Feature off / consent already given => no effect, behaves exactly as before.
    if _dpdp_consent_pending(job_applicant_id):
        return None

    if not applicant.get("custom_onboarding_portal_form"):
        frappe.throw(_("No Onboarding Portal Form has been released for this applicant."))

    job_offer = frappe.db.get_value(
        "Job Offer",
        {"job_applicant": job_applicant_id, "status": "Accepted", "docstatus": ("<", 2)},
        "name",
        order_by="creation desc",
    )

    doc = frappe.new_doc("Employee Onboarding")
    doc.job_applicant = job_applicant_id
    if job_offer:
        doc.job_offer = job_offer
    doc.custom_onboarding_portal_form = applicant.custom_onboarding_portal_form
    doc.custom_bgv_vendor = applicant.get("custom_bgv_vendor")

    prefill = prefill or {}
    # Joining date comes off the Job Offer: that is the date actually agreed with the
    # candidate, and HR revises it there when it slips. Employee Onboarding requires a
    # Job Offer, so in practice the offer's date is always the one used — the Job
    # Applicant's Expected DOJ is only an early indication, is optional and so often
    # blank, and is kept below purely as a guard.
    doj = (
        prefill.get("date_of_joining")
        or prefill.get("custom_date_of_joining")
        or (frappe.db.get_value("Job Offer", job_offer, "custom_expected_doj")
            if job_offer else None)
        or applicant.get("custom_expected_doj")
    )
    if doj:
        doc.date_of_joining = doj
    bbo = prefill.get("boarding_begins_on") or doc.date_of_joining
    if bbo:
        doc.boarding_begins_on = bbo

    # Auto-fill every matching Job Offer / Job Applicant value into the draft so the
    # candidate/HR start from a populated form. Best-effort and non-fatal: missing or
    # invalid data is skipped (field stays blank/editable), never raises.
    _auto_map_offer_applicant_fields(doc, applicant, job_offer)

    # Onboarding Automation tab — Recruiter / SPOC / Buddy-Manager links.
    _apply_onboarding_automation_fields(doc, applicant, job_offer)

    doc.insert(ignore_permissions=True)

    from frappe.utils import now_datetime
    applicant.db_set("custom_pre_onboarding_employee_onboarding", doc.name, update_modified=False)
    applicant.db_set("custom_pre_onboarding_status", "Onboarding Created", update_modified=False)
    if not applicant.get("custom_pre_onboarding_released_at"):
        applicant.db_set("custom_pre_onboarding_released_at", now_datetime(), update_modified=False)

    # Remove any stale Job-Applicant-tied Action Center Item now that the
    # EO's after_insert hook has created the canonical EO-tied one.
    if applicant.email_id:
        try:
            from recruitment.api.action_center import _delete_minimal_item
            _delete_minimal_item(applicant.email_id, "Job Applicant", job_applicant_id, commit=False)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "materialize_onboarding_from_applicant: delete JA action item failed")

    return doc.name



def _get_child_table_fields(child_doctype):
    if not child_doctype:
        return []

    try:
        meta = frappe.get_meta(child_doctype)
    except Exception:
        return []

    fields = []
    for df in meta.fields:
        if df.fieldtype in _LAYOUT_TYPES or not df.fieldname or df.get("hidden"):
            continue

        fields.append({
            "fieldname": df.fieldname,
            "label": (df.label or df.fieldname).strip(),
            "fieldtype": df.fieldtype,
            "options": df.options or "",
            "reqd": df.reqd or 0,
            "read_only": df.read_only or 0,
            "depends_on": df.get("depends_on") or "",
            "mandatory_depends_on": df.get("mandatory_depends_on") or "",
            "length": df.get("length") or 0,
        })

    return fields


def _filter_child_fields(all_fields, selected_child_fields_json, mandatory_child_fields_json=None):
    """
    Filters child fields to only those in selected_child_fields_json (empty = all).
    Marks fields listed in mandatory_child_fields_json as portal-mandatory by setting reqd=1.
    Both inputs are JSON arrays of fieldnames; missing/invalid inputs degrade gracefully.
    """
    import json as _json

    selected = None
    if selected_child_fields_json:
        try:
            parsed = set(_json.loads(selected_child_fields_json))
            if parsed:
                selected = parsed
        except Exception:
            selected = None

    mandatory = set()
    if mandatory_child_fields_json:
        try:
            parsed = _json.loads(mandatory_child_fields_json)
            if isinstance(parsed, list):
                mandatory = set(parsed)
        except Exception:
            mandatory = set()

    result = []
    for f in all_fields:
        if selected is not None and f["fieldname"] not in selected:
            continue
        if f["fieldname"] in mandatory:
            f = dict(f)
            f["reqd"] = 1
            f["portal_mandatory"] = 1
        result.append(f)
    return result


def _serialize_doc_field_value(doc, fieldname, fieldtype):
    value = doc.get(fieldname)

    if fieldtype == "Table":
        if not value:
            return []

        rows = []
        for row in value:
            row_dict = row.as_dict() if hasattr(row, "as_dict") else dict(row)
            cleaned_row = {
                key: val
                for key, val in row_dict.items()
                if not key.startswith("_") and key not in {
                    "doctype", "parent", "parenttype", "parentfield",
                    "docstatus", "owner", "creation", "modified", "modified_by",
                }
            }
            rows.append(cleaned_row)

        return rows

    return value


# Approval statuses that mean the candidate cannot edit that field
_CANDIDATE_READONLY_STATUSES = frozenset({"Filled", "Approved"})


def _resolve_field_value(eo_doc, applicant_doc, fieldname, fieldtype):
    """EO value wins; fall back to the same fieldname on Job Applicant when EO is
    empty/missing so pre-offer data the candidate already entered auto-populates."""
    if eo_doc is not None:
        val = _serialize_doc_field_value(eo_doc, fieldname, fieldtype)
        if val not in (None, "", []):
            return val
    if applicant_doc is not None and applicant_doc.meta.get_field(fieldname):
        val = _serialize_doc_field_value(applicant_doc, fieldname, fieldtype)
        if val not in (None, "", []):
            return val
    return None


def _is_empty_value(val):
    return val in (None, "", [], {})


def _field_count_bucket(approval_status, has_value):
    """Bucket a portal field for candidate-facing progress counts.

    Value-based, not purely approval-status based: a field that holds a value
    counts as 'filled' even while still editable (a saved draft, or an
    auto-prefilled value), so the candidate's progress reflects what they've
    actually entered. HR decisions still win — Approved/Rejected take precedence
    over the value check.
    """
    status = (approval_status or "Pending").strip().lower()
    if status == "approved":
        return "approved"
    if status == "rejected":
        return "rejected"
    return "filled" if has_value else "pending"


def _compute_candidate_field_counts(portal_rows, eo_doc=None, applicant_doc=None):
    """Value-aware {total,pending,filled,approved,rejected} over visible portal rows.

    Unlike field_level_approval._compute_field_status_counts (approval_status only,
    which drives boarding_status), this resolves each field's actual value (EO value,
    falling back to the Job Applicant) so saved/prefilled fields report as 'filled'.
    Candidate-facing responses only — boarding_status stays submit-based.
    """
    counts = {"total": 0, "pending": 0, "filled": 0, "approved": 0, "rejected": 0}
    for row in portal_rows:
        if row.get("hidden"):
            continue
        counts["total"] += 1
        ft = row.get("fieldtype") or "Data"
        val = _resolve_field_value(eo_doc, applicant_doc, row.get("fieldname"), ft)
        counts[_field_count_bucket(row.get("approval_status"), not _is_empty_value(val))] += 1
    return counts


def _build_tabbed_response(portal_rows, meta_lookup, doc=None, applicant_doc=None):
    tab_order = []
    tab_map = {}

    for row in portal_rows:
        fn = row.fieldname
        tab_lbl = (row.tab_label or "").strip()
        sec_lbl = (row.section_label or "").strip()
        meta = meta_lookup.get(fn, {})

        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        # Effective read_only: base setting OR locked by approval status
        approval_status = (row.get("approval_status") or "Pending").strip()
        base_read_only = int(row.read_only or 0)
        effective_read_only = base_read_only or (1 if approval_status in _CANDIDATE_READONLY_STATUSES else 0)

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "is_mandatory": int(row.is_mandatory or 0),
            "read_only": effective_read_only,
            "hidden": int(row.hidden or 0),
            "options": field_options,
            "value": _resolve_field_value(doc, applicant_doc, fn, fieldtype),
            "approval_status": approval_status,
            "hr_comment": row.get("hr_comment") or "",
            # Conditional-logic metadata for the portal UI (show/hide,
            # conditional-mandatory, format hints). Sourced from the DocType meta.
            "depends_on": meta.get("depends_on", ""),
            "mandatory_depends_on": meta.get("mandatory_depends_on", ""),
            "length": meta.get("length", 0),
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if tab_lbl not in tab_map:
            tab_map[tab_lbl] = {"section_order": [], "section_map": {}}
            tab_order.append(tab_lbl)

        tab_entry = tab_map[tab_lbl]
        if sec_lbl not in tab_entry["section_map"]:
            tab_entry["section_map"][sec_lbl] = []
            tab_entry["section_order"].append(sec_lbl)

        tab_entry["section_map"][sec_lbl].append(field_entry)

    tabs = []
    for tab_lbl in tab_order:
        tab_entry = tab_map[tab_lbl]
        sections = [
            {"section": sec_lbl, "fields": tab_entry["section_map"][sec_lbl]}
            for sec_lbl in tab_entry["section_order"]
        ]

        # Compute per-tab field status counts (value-aware, mutually exclusive):
        #   "filled"   = field holds a value (saved, prefilled, or submitted)
        #   "pending"  = field is empty
        #   "approved"/"rejected" = HR decision (takes precedence)
        counts = {"total": 0, "filled": 0, "approved": 0, "rejected": 0, "pending": 0}
        for sec in sections:
            for field in sec["fields"]:
                counts["total"] += 1
                bucket = _field_count_bucket(
                    field.get("approval_status"),
                    not _is_empty_value(field.get("value")),
                )
                counts[bucket] += 1

        # Flat list of this tab's mandatory fields, so the portal can render the
        # "Required fields" checklist without walking every section itself.
        required_fields = [
            {
                "fieldname": field["fieldname"],
                "label": field["label"],
                "fieldtype": field["fieldtype"],
                "section": sec["section"],
                "value": field["value"],
                "filled": not _is_empty_value(field["value"]),
            }
            for sec in sections
            for field in sec["fields"]
            if field.get("is_mandatory")
        ]

        tabs.append({
            "tab": tab_lbl,
            "field_counts": counts,
            "required_fields": required_fields,
            "sections": sections,
        })

    return tabs


def _initials(name):
    parts = [p for p in (name or "").split() if p]
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _link_title(doctype, name):
    """Title-field label for a Link value, falling back to the raw id."""
    if not name:
        return None
    try:
        tf = frappe.get_meta(doctype).get_title_field()
        if not tf or tf == "name":
            return name
        return frappe.get_cached_value(doctype, name, tf) or name
    except Exception:
        return name


def _get_branding(eo_doc, applicant_doc):
    """Company badge shown atop the candidate portal. Sourced from the Employee
    Onboarding company, falling back to the Job Applicant's finalized company."""
    company = eo_doc.get("company") if eo_doc is not None else None
    if not company and applicant_doc is not None:
        company = applicant_doc.get("custom_company_finalized") or applicant_doc.get("company")
    if not company:
        return {"company": None, "company_name": None, "logo": None, "badge_label": None}

    name = frappe.db.get_value("Company", company, "company_name") or company
    # Company logo is optional / site-specific — read it defensively.
    logo = None
    try:
        if frappe.get_meta("Company").get_field("company_logo"):
            logo = frappe.db.get_value("Company", company, "company_logo")
    except Exception:
        logo = None
    return {
        "company": company,
        "company_name": name,
        "logo": logo,
        "badge_label": f"{name} Candidate".upper(),
    }


def _get_joining_info(eo_doc, applicant_doc):
    """Date-of-joining block driving the "days to joining" / "pick a date" header."""
    from frappe.utils import getdate, nowdate, date_diff

    doj = eo_doc.get("date_of_joining") if eo_doc is not None else None
    bbo = eo_doc.get("boarding_begins_on") if eo_doc is not None else None
    if not doj and applicant_doc is not None:
        doj = applicant_doc.get("custom_date_of_joining")
    days = date_diff(getdate(doj), getdate(nowdate())) if doj else None

    # Role (Designation) and Department — Employee Onboarding wins, falling back
    # to the Job Applicant (designation / custom_department) when EO is empty.
    role = eo_doc.get("designation") if eo_doc is not None else None
    if not role and applicant_doc is not None:
        role = applicant_doc.get("designation")
    department = eo_doc.get("department") if eo_doc is not None else None
    if not department and applicant_doc is not None:
        department = applicant_doc.get("custom_department")

    return {
        "date_of_joining": doj,
        "boarding_begins_on": bbo,
        "days_to_joining": days,
        "is_set": bool(doj),
        "role": role,
        "role_name": _link_title("Designation", role),
        "department": department,
        "department_name": _link_title("Department", department),
    }


def _get_key_contacts(eo_doc, applicant_doc):
    """Resolve Onboarding Buddy / Teammates / Manager into ready-to-render contact
    cards, straight from the Onboarding Setup fields (custom_onboarding_buddy /
    custom_joining_buddy / custom_manager), with a Job Applicant fallback."""
    contacts = []
    seen = set()

    def add(emp_name, role, email=None, phone=None):
        if not emp_name or (emp_name, role) in seen:
            return
        emp = frappe.db.get_value(
            "Employee", emp_name,
            ["employee_name", "designation", "cell_number", "company_email",
             "personal_email", "image", "branch"],
            as_dict=True,
        )
        if not emp:
            return
        seen.add((emp_name, role))
        name = emp.employee_name or emp_name
        contacts.append({
            "role": role,
            "employee": emp_name,
            "name": name,
            "initials": _initials(name),
            "designation": emp.designation,
            "designation_label": _link_title("Designation", emp.designation),
            "location": emp.branch,
            "location_label": _link_title("Branch", emp.branch),
            "email": email or emp.company_email or emp.personal_email,
            "phone": phone or emp.cell_number,
            "image": emp.image,
        })

    for user_id, role_label in _iter_onboarding_contact_users(eo_doc, applicant_doc):
        add(frappe.db.get_value("Employee", {"user_id": user_id}, "name"), role_label)

    return contacts


def _get_onboarding_journey():
    """The "After you're onboarded" timeline, defined once in Onboarding Settings."""
    try:
        settings = frappe.get_cached_doc("Onboarding Settings")
    except Exception:
        return {"title": "After you're onboarded", "subtitle": "", "steps": []}

    steps = [
        {
            "title": s.get("title"),
            "timeframe": s.get("timeframe"),
            "detail": s.get("detail"),
            "icon": s.get("icon"),
        }
        for s in (settings.get("onboarding_journey") or [])
    ]
    return {
        "title": settings.get("onboarding_journey_title") or "After you're onboarded",
        "subtitle": settings.get("onboarding_journey_subtitle") or "",
        "steps": steps,
    }


def _allowed_child_doctypes():
    """Metadata-enumeration fix: the set of child tables the onboarding Field
    Inspector legitimately inspects — the ``options`` of every Table /
    Table MultiSelect field on the onboarding-related forms the inspector renders
    (Employee Onboarding and Job Applicant). Derived from the live meta so it
    tracks configuration, while still bounding ``child_doctype`` to genuine child
    tables reachable from those forms (never an arbitrary backend doctype)."""
    allowed = set()
    for parent_dt in ("Employee Onboarding", "Job Applicant"):
        try:
            meta = frappe.get_meta(parent_dt)
        except Exception:
            continue
        for df in meta.fields:
            if df.fieldtype in ("Table", "Table MultiSelect") and df.options:
                allowed.add(df.options)
    return allowed


@frappe.whitelist()
def get_child_doctype_fields(child_doctype):
    """Returns all non-layout fields for a given child DocType.
    Used by the Field Inspector UI to populate child field selection panels."""
    # Metadata-enumeration fix: keep the read gate on the owning config doctype as
    # an outer authorization check, then constrain `child_doctype` itself to the
    # child tables actually referenced by the onboarding forms the inspector
    # renders. The previous code only checked the (unrelated) parent form's
    # permission and let any `child_doctype` through, so any authenticated user
    # could enumerate arbitrary doctype field metadata. Both checks run BEFORE any
    # get_meta lookup so nothing leaks for tampered names.
    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)
    if not child_doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("child_doctype is required.")}
    if child_doctype not in _allowed_child_doctypes():
        frappe.throw(
            _("Not permitted to read {0}").format(child_doctype),
            frappe.PermissionError,
        )
    fields = _get_child_table_fields(child_doctype)
    return {"status": "success", "child_doctype": child_doctype, "fields": fields}


@frappe.whitelist()
def get_onboarding_form_fields(form_name):

    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)

    if not form_name:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Please select an onboarding portal form.")}

    doc = frappe.get_doc("Onboarding Portal Forms", form_name)
    rows = [
        {
            "fieldname": row.fieldname,
            "label": row.label,
            "fieldtype": row.fieldtype,
            "tab_label": row.tab_label,
            "section_label": row.section_label,
            "is_mandatory": row.is_mandatory,
            "read_only": row.read_only,
            "hidden": row.hidden,
            "options": row.options,
            # Carry the child-field configuration over to the per-record table
            "selected_child_fields":  row.get("selected_child_fields")  or "",
            "mandatory_child_fields": row.get("mandatory_child_fields") or "",
        }
        for row in (doc.get("portal_fields") or [])
    ]

    return {
        "status": "success",
        "form_name": doc.name,
        "total": len(rows),
        "fields": rows,
    }


@frappe.whitelist()
def get_all_onboarding_fields():
    frappe.has_permission("Onboarding Portal Forms", "read", throw=True)
    fields = _read_onboarding_meta()
    return {"status": "success", "total": len(fields), "fields": fields}


@frappe.whitelist()
def get_all_onboarding_fields_for_onboarding():
    frappe.has_permission("Employee Onboarding", "read", throw=True)
    fields = _read_onboarding_meta()
    return {"status": "success", "total": len(fields), "fields": fields}


@frappe.whitelist()
def get_available_job_applicant_fields():
    frappe.has_permission("Job Applicant Profile Settings", "read", throw=True)
    fields = _read_job_applicant_meta(include_hidden=True, include_skipped=True)
    return {"status": "success", "total": len(fields), "fields": fields}


def _resolve_candidate_applicant(provided, prefer_field=None):
    """Resolves an email or HR-APP-... id to a Job Applicant `name` for the
    authenticated candidate. Emails must match the session; HR-APP-... ids
    are enforced via Candidate Portal User link. When `prefer_field` is given
    and the input is an email, the latest applicant with that field set wins
    the tiebreak (falls back to most-recently-modified)."""
    session_email = get_current_candidate()
    if not session_email:
        frappe.local.response["http_status_code"] = 401
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    provided = (provided or "").strip()
    if not provided:
        return None

    if "@" in provided:
        if provided.lower() != session_email.lower():
            frappe.local.response["http_status_code"] = 403
            frappe.throw(_("Not allowed to access this resource."), frappe.PermissionError)
        name = None
        if prefer_field:
            name = frappe.db.get_value(
                "Job Applicant",
                {"email_id": provided, prefer_field: ["is", "set"]},
                "name",
                order_by="modified desc",
            )
        return name or frappe.db.get_value(
            "Job Applicant",
            {"email_id": provided},
            "name",
            order_by="modified desc",
        )

    enforce_candidate_identity(job_applicant_id=provided)
    return provided


def _get_pre_offer_form_rows(applicant_name):
    """Returns the list of pre-offer form rows from Job Applicant.custom_pre_offer_forms."""
    return frappe.get_all(
        "Job Applicant Pre Offer Form",
        filters={"parent": applicant_name, "parenttype": "Job Applicant", "parentfield": "custom_pre_offer_forms"},
        fields=["name", "portal_form", "status", "sent_at", "filled_at", "action_item"],
        order_by="idx asc",
    )


def _portal_form_rows(__form_name=None):
    """Legacy stub — Job Applicant Portal Forms has been removed."""
    return []


def _resolve_pre_offer_target(applicant_name, requested_form):
    """Picks which pre-offer form row to render/save against.
    If `requested_form` is given, returns that row if present; else None.
    If not given, returns the first row with status='Sent' (the next pending one)."""
    rows = _get_pre_offer_form_rows(applicant_name)
    if not rows:
        return None, []
    if requested_form:
        for r in rows:
            if r["portal_form"] == requested_form:
                return r, rows
        return None, rows
    for r in rows:
        if (r.get("status") or "").strip() == "Sent":
            return r, rows
    return rows[0], rows


@candidate_required
def get_pre_offer_form(job_applicant_id, form_name=None):
    """Returns a pre-offer form for the candidate to fill.

    - If `form_name` is provided, returns that specific form (tabs + values).
    - If not, returns the next pending (status='Sent') form; falls back to the first row.
    - Always includes `forms[]`: the full list of pre-offer forms with their status, so the
      frontend can render a selector when the candidate has multiple pending forms.
    """
    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name or not frappe.db.exists("Job Applicant", applicant_name):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    target_row, all_rows = _resolve_pre_offer_target(applicant_name, form_name)

    if target_row is None and form_name:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("Pre Offer Form '{0}' has not been sent to this applicant.").format(form_name),
            "forms": all_rows,
        }

    if target_row is None:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("No Pre Offer Form has been sent for this applicant yet.")}

    portal_rows = _portal_form_rows(target_row["portal_form"])
    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("Pre Offer Form '{0}' has no fields configured.").format(target_row["portal_form"]),
            "forms": all_rows,
        }

    doc = frappe.get_doc("Job Applicant", applicant_name)
    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}
    tab_order = []
    tab_map = {}

    for row in portal_rows:
        fn = row.fieldname
        tab_lbl = (row.tab_label or "").strip()
        sec_lbl = (row.section_label or "").strip()
        meta = meta_lookup.get(fn, {})

        fieldtype = row.fieldtype or meta.get("fieldtype", "Data")
        field_options = row.options or meta.get("options", "")

        field_entry = {
            "fieldname": fn,
            "label": row.label or meta.get("label", fn),
            "fieldtype": fieldtype,
            "is_mandatory": int(row.is_mandatory or 0),
            "read_only": int(row.read_only or 0),
            "hidden": int(row.hidden or 0),
            "options": field_options,
            "value": _serialize_doc_field_value(doc, fn, fieldtype),
        }
        if fieldtype == "Table":
            field_entry["child_doctype"] = field_options
            all_child = _get_child_table_fields(field_options)
            field_entry["child_fields"] = _filter_child_fields(
                all_child,
                row.get("selected_child_fields"),
                row.get("mandatory_child_fields"),
            )

        if tab_lbl not in tab_map:
            tab_map[tab_lbl] = {"section_order": [], "section_map": {}}
            tab_order.append(tab_lbl)

        tab_entry = tab_map[tab_lbl]
        if sec_lbl not in tab_entry["section_map"]:
            tab_entry["section_map"][sec_lbl] = []
            tab_entry["section_order"].append(sec_lbl)

        tab_entry["section_map"][sec_lbl].append(field_entry)

    return {
        "status": "success",
        "job_applicant": applicant_name,
        "form_name": target_row["portal_form"],
        "pre_offer_form_status": target_row.get("status") or "Sent",
        "forms": all_rows,
        "tabs": [
            {
                "tab": tab_lbl,
                "sections": [
                    {"section": sec_lbl, "fields": tab_map[tab_lbl]["section_map"][sec_lbl]}
                    for sec_lbl in tab_map[tab_lbl]["section_order"]
                ],
            }
            for tab_lbl in tab_order
        ],
    }


@candidate_required
def save_pre_offer_form_data(job_applicant_id, data, form_name=None):
    """Persist a candidate's pre-offer form submission.

    `form_name` identifies which pre-offer form is being filled. If omitted, the next pending
    form (status='Sent') is auto-selected; ambiguous cases (multiple Sent) require `form_name`.
    Marks the child row + its action item as Filled/Completed.
    """
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name or not frappe.db.exists("Job Applicant", applicant_name):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    all_rows = _get_pre_offer_form_rows(applicant_name)
    if not all_rows:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No Pre Offer Form has been sent to this applicant.")}

    target_row = None
    if form_name:
        for r in all_rows:
            if r["portal_form"] == form_name:
                target_row = r
                break
        if not target_row:
            frappe.local.response["http_status_code"] = 404
            return {"status": "error", "message": _("Pre Offer Form '{0}' has not been sent to this applicant.").format(form_name)}
    else:
        pending = [r for r in all_rows if (r.get("status") or "") == "Sent"]
        if len(pending) == 1:
            target_row = pending[0]
        elif len(pending) > 1:
            frappe.local.response["http_status_code"] = 400
            return {
                "status": "error",
                "message": _("Multiple Pre Offer Forms are pending; please specify which one with `form_name`."),
                "pending_forms": [r["portal_form"] for r in pending],
            }
        elif all_rows:
            target_row = all_rows[0]

    if target_row is None:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No Pre Offer Form is pending for this applicant.")}

    portal_rows = _portal_form_rows(target_row["portal_form"])
    if not portal_rows:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Pre Offer Form '{0}' has no fields configured.").format(target_row["portal_form"])}

    allowed_map = {r.fieldname: r for r in portal_rows if not r.get("hidden") and not r.get("read_only")}

    if not allowed_map:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No editable fields configured in the Pre Offer Form.")}

    missing = [
        row.label or fn for fn, row in allowed_map.items()
        if row.get("is_mandatory") and (fn not in data or data[fn] in (None, "", []))
    ]

    if missing:
        frappe.local.response["http_status_code"] = 422
        return {
            "status": "error",
            "message": _("The following mandatory fields are missing: {0}").format(", ".join(missing)),
            "missing_fields": missing,
        }

    meta_lookup = {f["fieldname"]: f for f in _read_job_applicant_meta()}

    try:
        doc = frappe.get_doc("Job Applicant", applicant_name)
        updated = []

        for fn, value in data.items():
            if fn not in allowed_map:
                continue
            meta = meta_lookup.get(fn, {})
            fieldtype = allowed_map[fn].get("fieldtype") or meta.get("fieldtype", "Data")

            if fieldtype == "Table" and isinstance(value, list):
                doc.set(fn, [])
                for row_data in value:
                    doc.append(fn, row_data)
            else:
                doc.set(fn, value)

            updated.append(fn)

        from frappe.utils import now_datetime
        for child_row in (doc.get("custom_pre_offer_forms") or []):
            if child_row.portal_form == target_row["portal_form"]:
                child_row.status = "Filled"
                child_row.filled_at = now_datetime()
                break

        pre_offer_rows = doc.get("custom_pre_offer_forms") or []
        if pre_offer_rows and all((r.status or "") == "Filled" for r in pre_offer_rows):
            doc.custom_substatus = "Pre Offer Form Filled"

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        from recruitment.api.action_center import mark_item_completed
        candidate_email = doc.email_id
        if candidate_email:
            if target_row.get("name"):
                mark_item_completed(
                    reference_doctype="Job Applicant Pre Offer Form",
                    reference_docname=target_row["name"],
                    candidate_email=candidate_email,
                    commit=True,
                )
            else:
                mark_item_completed(
                    reference_doctype="Job Applicant",
                    reference_docname=applicant_name,
                    candidate_email=candidate_email,
                    commit=True,
                )

        return {
            "status": "success",
            "message": _("Pre Offer Form submitted successfully."),
            "form_name": target_row["portal_form"],
            "updated_fields": updated,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Pre Offer Form Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}



@candidate_required
def get_candidate_portal_form(job_applicant_id):
    """
    Returns the structured portal form for a given job applicant.

    Scenario A — Employee Onboarding record exists:
        Form fields and pre-filled values are resolved from the onboarding doc.
        Source priority: per-record child table > linked portal form > global default.

    Scenario B — No Employee Onboarding record found:
        Falls back to the global default Onboarding Portal Form.
        All field values will be null.
    """
    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    onboarding_name = _get_onboarding_name_by_job_applicant(applicant_name)
    doc = frappe.get_doc("Employee Onboarding", onboarding_name) if onboarding_name else None
    pre_release = _get_active_pre_release(applicant_name)
    applicant_doc = frappe.get_doc("Job Applicant", applicant_name)

    portal_rows, form_source = _get_onboarding_portal_rows(doc, pre_release)

    if not portal_rows:
        frappe.local.response["http_status_code"] = 404
        return {
            "status": "error",
            "message": _("No candidate portal fields configured. Please set up an Onboarding Portal Form."),
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}

    # Value-aware field status counts (visible portal fields only): a field with a
    # value counts as "filled" whether it was saved, prefilled, or submitted, so
    # progress reflects what the candidate has actually entered. Works before the
    # EO is materialized too (values resolve from the Job Applicant).
    field_status_counts = _compute_candidate_field_counts(portal_rows, doc, applicant_doc)

    return {
        "status": "success",
        "job_applicant": applicant_name,
        "form_source": form_source,
        "onboarding_name": doc.name if doc else None,
        "pre_release_name": pre_release["name"] if pre_release else None,
        "boarding_status": doc.boarding_status if doc else None,
        "field_status_counts": field_status_counts,
        "branding": _get_branding(doc, applicant_doc),
        "joining": _get_joining_info(doc, applicant_doc),
        "key_contacts": _get_key_contacts(doc, applicant_doc),
        "onboarding_journey": _get_onboarding_journey(),
        "tabs": _build_tabbed_response(portal_rows, meta_lookup, doc, applicant_doc),
    }


@candidate_required
def save_candidate_portal_data(job_applicant_id, data):
    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    applicant_name = _resolve_candidate_applicant(job_applicant_id)
    if not applicant_name:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    onboarding_name = _get_onboarding_name_by_job_applicant(applicant_name)
    pre_release = _get_active_pre_release(applicant_name)

    if not onboarding_name:
        if not pre_release:
            frappe.local.response["http_status_code"] = 404
            return {"status": "error", "message": _(f"No onboarding form pending for '{job_applicant_id}'.")}
        onboarding_name = materialize_onboarding_from_applicant(applicant_name, prefill=data)
        pre_release = None  # materialized; no longer "active"

    onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)
    portal_rows, _ = _get_onboarding_portal_rows(onboarding_doc, pre_release)

    # Only allow editing fields where approval_status is Pending or Rejected
    _EDITABLE_STATUSES = frozenset({"Pending", "Rejected"})
    allowed_map = {
        r.fieldname: r for r in portal_rows
        if not r.get("hidden")
        and not r.get("read_only")
        and (r.get("approval_status") or "Pending") in _EDITABLE_STATUSES
    }

    if not allowed_map:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("No editable fields available. All fields are under review or already approved.")}

    # Validate mandatory fields (only among editable fields)
    missing = [
        row.label or fn for fn, row in allowed_map.items()
        if row.get("is_mandatory") and (fn not in data or data[fn] in (None, "", []))
    ]

    if missing:
        frappe.local.response["http_status_code"] = 422
        return {
            "status": "error",
            "message": _("The following mandatory fields are missing: {0}").format(", ".join(missing)),
            "missing_fields": missing,
        }

    meta_lookup = {f["fieldname"]: f for f in _read_onboarding_meta()}

    try:
        doc = onboarding_doc
        updated = []

        for fn, value in data.items():
            if fn not in allowed_map:
                continue

            meta = meta_lookup.get(fn, {})
            fieldtype = allowed_map[fn].get("fieldtype") or meta.get("fieldtype", "Data")

            if fieldtype == "Table" and isinstance(value, list):
                doc.set(fn, [])
                for row_data in value:
                    doc.append(fn, row_data)
            else:
                doc.set(fn, value)

            updated.append(fn)

        doc.save(ignore_permissions=True)

        # After saving, mark updated portal field rows as "Filled"
        # and snapshot the submitted value into current_value
        if updated:
            import json as _json
            doc.reload()
            for row in (doc.get("custom_candidate_portal_fields") or []):
                if row.fieldname not in updated:
                    continue
                ft = row.get("fieldtype") or "Data"
                # Snapshot submitted value
                live_val = doc.get(row.fieldname)
                if ft == "Table":
                    rows_data = live_val or []
                    row.current_value = _json.dumps(
                        [{k: str(v or "") for k, v in (r.as_dict() if hasattr(r, "as_dict") else r).items()
                          if not k.startswith("_") and k not in {
                              "doctype", "parent", "parenttype", "parentfield",
                              "docstatus", "owner", "creation", "modified", "modified_by"
                          }} for r in rows_data],
                        ensure_ascii=False, default=str
                    )
                else:
                    row.current_value = str(live_val) if live_val is not None else ""
                # Mark as Filled (awaiting HR review)
                row.approval_status = "Filled"

            # Update overall submission status
            doc.save(ignore_permissions=True)

        # ── Sync Candidate Action Center Item ─────────────────────────────────
        try:
            from recruitment.api.action_center import sync_onboarding_field_rejection_action
            doc.reload()
            sync_onboarding_field_rejection_action(doc)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Action Center Sync Failed (Candidate Refill)")

        # Recompute boarding_status (Pending / In Process / Submitted / Completed)
        # so the candidate-side save reflects overall progress.
        from recruitment.api.field_level_approval import _sync_overall_status
        doc.reload()
        _sync_overall_status(doc)
        doc.reload()
        portal_rows_now, _ = _get_onboarding_portal_rows(doc)
        field_status_counts = _compute_candidate_field_counts(
            portal_rows_now, doc, frappe.get_doc("Job Applicant", applicant_name)
        )

        # Stamp applicant substatus on first candidate fill
        try:
            current_substatus = frappe.db.get_value("Job Applicant", applicant_name, "custom_substatus")
            if (current_substatus or "") != "Pre Onboarding Filled":
                frappe.db.set_value(
                    "Job Applicant", applicant_name,
                    "custom_substatus", "Pre Onboarding Filled",
                    update_modified=False,
                )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Failed to update applicant substatus on candidate fill")

        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Data saved successfully. Fields are now pending HR review."),
            "updated_fields": updated,
            "boarding_status": doc.get("boarding_status"),
            "field_status_counts": field_status_counts,
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Candidate Portal Save Error")
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}


@candidate_required
def get_portal_field_names(job_applicant_id=None):
    enforce_candidate_identity(job_applicant_id=job_applicant_id)
    onboarding_doc = None
    if job_applicant_id:
        onboarding_name = _get_onboarding_name_by_job_applicant(job_applicant_id)
        if onboarding_name:
            onboarding_doc = frappe.get_doc("Employee Onboarding", onboarding_name)

    rows, _ = _get_onboarding_portal_rows(onboarding_doc)
    return {
        "status": "success",
        "fields": [r.fieldname for r in rows],
    }


# NOTE: `get_job_applicant_portal_form`, `save_job_applicant_portal_data` and
# `get_job_applicant_portal_field_names` were removed. Replacements:
#
#   list of open positions on careers page:
#     recruitment.api.channels.careers.list_openings
#
#   field config for a careers application form:
#     recruitment.api.channels.careers.get_application_fields(opening)
#
#   save / submit the application (one status-driven endpoint — draft vs submit):
#     recruitment.api.channels.careers.submit_application(job_applicant_email, job_opening, form_data, status)
#
# The new endpoints source their field config from
# Job Opening → custom_application_fields (with Job Applicant Profile Settings
# defaults), rather than the legacy Job Applicant Portal Forms doctype.


@frappe.whitelist()
def get_candidate_feature_flags():
    doc = frappe.get_single("Candidate Portal Feature Flag")

    result = {}
    for row in doc.feature_flags:
        if row.page_name:
            result[row.page_name.strip().lower().replace(" ", "_")] = row.is_enabled

    return result


@candidate_required
def get_link_field_options(doctype, search_text=None, query=None, txt=None, limit=20, include=None, filters=None, skip=0, **kwargs):
    """Returns [{id, label}] for a doctype; label uses title_field when set.

    Generic link-options endpoint used by every Link field on the candidate portal,
    so the defaults below preserve the original behaviour exactly — callers that
    pass only `doctype`/`search`/`limit` are unaffected.

    Accepts `search_text`, `query`, or `txt` as the search term (first non-empty wins).
    `filters` (dict or JSON string) narrows the base record set — e.g. limiting City
    to a given State: filters={"state": "Bihar"}. `filters` can only RESTRICT results,
    never widen them, so it adds no extra data exposure.
    Any additional query param that matches a real field on `doctype` is also applied
    as an equality filter (e.g. ?state=Bihar), so the front-end can narrow options
    without JSON-encoding `filters`. Empty values are ignored so a cleared dependent
    field (e.g. no State picked yet) doesn't filter everything out.
    `include` is an id (or comma-separated ids) that must always appear in the results
    (so a pre-selected value renders its label even when outside the current page);
    `include` ids bypass `filters`. `skip` is the pagination offset.
    Accessible to any authenticated Frappe user (desk session or API key/secret) — the
    candidate portal frontend authenticates via the candidate user's API key+secret."""
    if not doctype:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Doctype is required.")}

    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Doctype '{0}' not found.").format(doctype)}
    title_field = meta.get("title_field") or None

    has_title = bool(title_field) and title_field != "name"
    fields = ["name"] + ([title_field] if has_title else [])

    if isinstance(filters, str):
        filters = frappe.parse_json(filters) if filters.strip() else None
    filters = dict(filters) if filters else {}

    # Map any extra query param that corresponds to a real field on the doctype to an
    # equality filter. Empty values (an unrendered "{{ ... }}" or a cleared dependent
    # field) are skipped so they don't filter everything out.
    for key, value in kwargs.items():
        if value in (None, "") or key in filters:
            continue
        if key == "name" or meta.has_field(key):
            filters[key] = value

    search = (search_text or query or txt or "").strip()
    or_filters = None
    if search:
        like = f"%{search}%"
        or_filters = [["name", "like", like]] + ([[title_field, "like", like]] if has_title else [])

    try:
        records = frappe.get_all(
            doctype, fields=fields, filters=filters or None, or_filters=or_filters,
            limit=int(limit or 20), start=int(skip or 0), order_by=f"{title_field or 'name'} asc",
        )
    except Exception as e:
        frappe.local.response["http_status_code"] = 500
        return {"status": "error", "message": str(e)}

    def _to_option(r):
        return {"id": r["name"], "label": (r.get(title_field) if has_title else None) or r["name"]}

    results = [_to_option(r) for r in records]

    # Always surface the pre-selected value(s) so the dropdown can label them, even
    # when they're not part of the current (searched/paginated/filtered) page.
    include_ids = [i.strip() for i in str(include or "").split(",") if i and i.strip()]
    if include_ids:
        present = {r["id"] for r in results}
        missing = [i for i in include_ids if i not in present]
        if missing:
            try:
                extra = frappe.get_all(doctype, fields=fields, filters={"name": ["in", missing]})
            except Exception:
                extra = []
            results = [_to_option(r) for r in extra] + results

    return {"status": "success", "doctype": doctype, "title_field": title_field, "total": len(results), "results": results}


@frappe.whitelist(allow_guest=True)
def get_website_branding():
    settings = frappe.get_single("Website Settings")
    return {
        "title_prefix": settings.title_prefix,
        "app_logo": settings.app_logo,
    }
