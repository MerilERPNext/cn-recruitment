import hashlib
import re

import frappe
from frappe.model import no_value_fields
from frappe.model.mapper import get_mapped_doc

# Recruitment Settings' mapping pickers store a field as
# "Label (fieldname) [Fieldtype]" — the fieldtype suffix is missing on older
# rows, and a few rows were saved as a bare fieldname. Match the last
# parenthesised group so labels that contain their own brackets, e.g.
# "Contact No (Alternate)", still resolve to the right fieldname.
_FIELD_REF = re.compile(r"\(([^()]+)\)(?:\s*\[[^\]]*\])?\s*$")


def parse_field_ref(value):
    """Fieldname behind a picker value; None when the cell is empty."""
    value = (value or "").strip()
    if not value:
        return None

    match = _FIELD_REF.search(value)
    return match.group(1).strip() if match else value


def get_field_map(source_doctype, target_doctype, only_fetch_on_update=False):
    """``{source_fieldname: target_fieldname}`` from the Recruitment Tool table.

    Rows are dropped when either side no longer exists, or when the target
    cannot hold a stored value (see :func:`_can_write`). A mapper ``field_map``
    keyed on an unknown column copies nothing anyway, and one stale row must not
    decide whether the rest of the configuration applies. Drops go to the site
    log (throttled — see :func:`_warn_stale_rows`) rather than the Error Log,
    since this runs on every onboarding save.

    Reads nothing from the database: Recruitment Settings comes from the
    document cache and both metas from the meta cache.
    """
    settings = frappe.get_cached_doc("Recruitment Settings")
    source_meta = frappe.get_meta(source_doctype)
    target_meta = frappe.get_meta(target_doctype)

    field_map = {}
    skipped = []

    for entry in settings.recruitment_tool:
        if entry.source_doctype != source_doctype or entry.target_doctype != target_doctype:
            continue
        if only_fetch_on_update and not entry.fetch_on_update:
            continue

        source_field = parse_field_ref(entry.source_field)
        target_field = parse_field_ref(entry.target_field)
        if not source_field or not target_field:
            continue

        source_df = source_meta.get_field(source_field)
        target_df = target_meta.get_field(target_field)
        if not _can_read(source_df) or not _can_write(target_df):
            skipped.append(f"{source_doctype}.{source_field} -> {target_doctype}.{target_field}")
            continue

        field_map[source_field] = target_field

    if skipped:
        _warn_stale_rows(f"{source_doctype} -> {target_doctype}", skipped)

    return field_map


def _can_read(df):
    """Whether a source docfield holds a value worth copying.

    ``Table`` is let through — update_employee_fields rebuilds child tables row
    by row — while the other no-value types (breaks, headings, buttons) carry
    nothing.
    """
    if not df:
        return False
    return df.fieldtype == "Table" or df.fieldtype not in no_value_fields


def _can_write(df):
    """Whether a target docfield can actually store what we copy into it.

    Virtual fields are computed by their controller and have no database
    column, so a ``db.set_value`` against one raises "Unknown column" and takes
    the whole Employee Onboarding save down with it. These are not hypothetical:
    ``Employee.father_full_name`` is virtual on the sites this app runs on, and
    it is one of the configured Recruitment Tool targets.
    """
    return _can_read(df) and not df.get("is_virtual")


def _warn_stale_rows(pair, skipped):
    """Log stale Recruitment Tool rows at most once an hour per doctype pair.

    ``get_field_map`` sits on the Employee Onboarding save path, so an
    unattended bad row would otherwise write a log line on every save. The
    throttle costs one cache read, and only on a site that has such a row.
    """
    digest = hashlib.sha1("|".join(skipped).encode()).hexdigest()[:12]
    key = f"recruitment:stale_field_map:{pair}:{digest}"

    cache = frappe.cache()
    if cache.get_value(key):
        return
    cache.set_value(key, 1, expires_in_sec=3600)

    frappe.logger("recruitment").warning(
        f"Recruitment Tool rows reference missing fields ({pair}): " + ", ".join(skipped)
    )


def _legacy_onboarding_field_map():
    """The pre-Recruitment-Tool ``Fields Mapping`` rows.

    Only consulted when the Recruitment Tool table has nothing for
    Employee Onboarding -> Employee, so a configured Recruitment Tool always wins.
    """
    settings = frappe.get_cached_doc("Recruitment Settings")
    return {
        row.employee_onboarding: row.employee
        for row in settings.mapping_fields
        if row.employee_onboarding and row.employee
    }


@frappe.whitelist()
def job_applicant_fields(job_applicant):
    frappe.has_permission("Job Applicant", "read", doc=job_applicant, throw=True)
    job_applicant_doc = frappe.get_doc("Job Applicant", job_applicant)

    return {
        target_field: job_applicant_doc.get(source_field)
        for source_field, target_field in get_field_map("Job Applicant", "Job Offer").items()
    }


@frappe.whitelist()
def job_requisition_fields(job_requisition):
    frappe.has_permission("Job Requisition", "read", doc=job_requisition, throw=True)
    job_requisition_doc = frappe.get_doc("Job Requisition", job_requisition)

    return {
        target_field: job_requisition_doc.get(source_field)
        for source_field, target_field in get_field_map(
            "Job Requisition", "Job Applicant"
        ).items()
    }


@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    """The one Employee Onboarding -> Employee mapper.

    Both user entry points land here: the form's "Create Employee" button calls
    this path directly, and HRMS's own mapper is redirected onto it through
    ``hooks.override_whitelisted_methods``.
    """
    frappe.has_permission("Employee", "create", throw=True)
    return build_employee(source_name, target_doc)


def build_employee(source_name, target_doc=None):
    """``make_employee`` without the permission gate, for server-side callers.

    The automatic date-of-joining path (``onboarding_extras._doj_joined``) runs
    as whoever saved the Onboarding, who need not hold Employee create rights;
    it inserts with ``ignore_permissions`` of its own.
    """
    # Onboarding must actually be finished — required tasks closed AND every
    # portal field approved. Checked here rather than in make_employee because
    # every path that creates an Employee funnels through this function: the
    # button, HRMS's redirected mapper, and the DOJ-outcome automation. HRMS
    # called this gate from its own make_employee; ours replaced that function
    # and dropped the call, so nothing enforced it.
    frappe.get_doc("Employee Onboarding", source_name).validate_employee_creation()

    field_map = get_field_map("Employee Onboarding", "Employee") or _legacy_onboarding_field_map()

    def set_missing_values(source, target):
        target.personal_email = frappe.db.get_value(
            "Job Applicant", source.job_applicant, "email_id"
        )
        target.status = "Active"

        # Structural link, not a configurable mapping: HRMS resolves
        # Employee Onboarding.employee by matching Employee.job_applicant (see
        # EmployeeOnboarding.set_employee). Set here rather than in Recruitment
        # Settings so a missing config row cannot break the chain.
        target.job_applicant = source.job_applicant

        # get_mapped_doc only applies `field_map` to fields it decides to copy,
        # so a target the mapper skips (no_copy, or a source value it filtered)
        # silently stays blank. Assign the configured pairs directly as well.
        for source_field, target_field in field_map.items():
            value = source.get(source_field)
            if isinstance(value, list):
                # Child tables need their own mapper entry, not a field_map pair.
                continue
            if value not in (None, ""):
                target.set(target_field, value)

        # Field Flow (nextai) chain. The connector records which Onboarding this
        # Employee came from; apply_connector_fetch then resolves the managed
        # `fetch_from` fields right now. Frappe resolves fetch_from server-side
        # only during save and client-side only when the link field *changes* —
        # a mapped doc arrives with the connector already set, so neither fires
        # and every flowed field would open blank.
        from recruitment.recruitment.field_flow_sync import (
            apply_connector_fetch,
            populate_employee_connector,
        )

        populate_employee_connector(target, source.name)
        apply_connector_fetch(target, source)

    return get_mapped_doc(
        "Employee Onboarding",
        source_name,
        {
            "Employee Onboarding": {
                "doctype": "Employee",
                "field_map": field_map,
            }
        },
        target_doc,
        set_missing_values,
    )


def link_employee_to_onboarding(doc, method):
    """Link Employee to Employee Onboarding only after Employee is saved"""
    if not doc.job_applicant:
        return

    employee_onboarding = frappe.get_all(
        "Employee Onboarding",
        filters={
            "job_applicant": doc.job_applicant,
            "docstatus": ["in", ["0", "1"]],  # Draft or Submitted
        },
    )

    if employee_onboarding:
        onboarding = frappe.get_doc("Employee Onboarding", employee_onboarding[0].name)
        onboarding.db_set("employee", doc.name)  # Update only after Employee is saved

        # Fallback connector for the Field Flow chain — covers Employees created
        # outside the Onboarding "Create Employee" mapper.
        from recruitment.recruitment.field_flow_sync import CONNECTOR_FIELD

        if frappe.get_meta("Employee").get_field(CONNECTOR_FIELD) and not doc.get(CONNECTOR_FIELD):
            doc.db_set(CONNECTOR_FIELD, onboarding.name)


def update_employee_fields(doc, event=None):
    # Document-event hook (Employee Onboarding on_update) — not an HTTP endpoint.
    # The recruitment-app whitelist was removed (the frontend's update_employee_fields
    # call targets cn_hrms_core, a different app). Dropping it removes an HTTP write
    # surface without affecting the hook.
    #
    # This runs on every Employee Onboarding save, so it stays off the Employee
    # document write path unless a child table actually has to be rebuilt: `doc`
    # is the Onboarding already in memory, scalar targets go through a single
    # db.set_value, and the Employee doc is only loaded when there is something a
    # plain column write cannot do.
    if not doc.get("employee"):
        return

    # Fetch field mappings only where fetch_on_update is checked
    field_map = get_field_map("Employee Onboarding", "Employee", only_fetch_on_update=True)
    if not field_map:
        return

    employee_meta = frappe.get_meta("Employee")

    child_table_mappings = {}
    update_dict = {}

    for source_field, target_field in field_map.items():
        if employee_meta.get_field(target_field).fieldtype == "Table":
            child_table_mappings[source_field] = target_field
            continue

        value = doc.get(source_field)
        if value is not None:
            update_dict[target_field] = value

    if update_dict:
        frappe.db.set_value("Employee", doc.employee, update_dict)

    if not child_table_mappings:
        return

    employee_doc = frappe.get_doc("Employee", doc.employee)

    for onboarding_child, employee_child in child_table_mappings.items():
        employee_doc.set(employee_child, [])

        for child_row in doc.get(onboarding_child, []):
            new_row = employee_doc.append(employee_child, {})
            for field in child_row.as_dict():
                if field not in ["name", "parent", "parentfield", "parenttype", "idx", "doctype"]:
                    new_row.set(field, child_row.get(field))

    employee_doc.flags.ignore_version = True
    employee_doc.save(ignore_permissions=True)
