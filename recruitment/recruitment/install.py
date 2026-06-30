"""Post-install / post-migrate hooks for the Recruitment app.

Called by Frappe after every `bench migrate` (after_migrate) and after the
initial app install (after_install).  Safe to run multiple times — all
functions are idempotent.
"""
import frappe


def after_install():
    sync_all_lookup_fields()
    repair_broken_fetch_from()


def after_migrate():
    sync_all_lookup_fields()
    repair_broken_fetch_from()


def repair_broken_fetch_from():
    """Neutralize Custom Field ``fetch_from`` references whose source column is
    missing from the linked doctype's table.

    Why this exists
    ---------------
    The same codebase ships to many servers/setups that each have a different
    mix of apps (homefirst_customs, cn_hrms_core, …). Some of those apps add a
    Custom Field with ``fetch_from = "<link_field>.<source_field>"``. If, on a
    given server, ``<source_field>`` has no column (its owning app isn't
    installed there, or a fixture wasn't applied — i.e. schema drift), Frappe's
    *core* link validation runs ``SELECT <source_field> FROM <linked doctype>``
    on every save and dies with:

        MySQLdb.OperationalError (1054, "Unknown column '…' in 'SELECT'")

    That blocks the save entirely — e.g. creating a Job Opening from a Job
    Requisition once its link fields are populated. (See
    frappe.model.base_document.get_invalid_links.)

    A broken ``fetch_from`` is non-functional anyway — it can only ever crash —
    so clearing it is strictly safe: nothing that worked stops working, the
    field simply stops trying to auto-fetch a column that doesn't exist. Running
    it on every migrate makes it self-healing: if a fixture re-introduces a
    broken reference, the next migrate clears it again. Fully idempotent.
    """
    from frappe.model import default_fields

    try:
        rows = frappe.get_all(
            "Custom Field",
            filters={"fetch_from": ["like", "%.%"]},
            fields=["name", "dt", "fieldname", "fetch_from"],
        )
    except Exception:
        # Custom Field table not ready (very early install) — nothing to do.
        return

    cleared = []
    for row in rows:
        fetch_from = (row.fetch_from or "").strip()
        if "." not in fetch_from:
            continue
        link_fieldname, source_part = fetch_from.split(".", 1)
        source_fieldname = source_part.split(".")[-1].strip()
        if not source_fieldname or source_fieldname == "name" or source_fieldname in default_fields:
            continue
        try:
            link_df = frappe.get_meta(row.dt).get_field(link_fieldname)
            # Only ordinary Link fields point at a single, statically-known table.
            if not link_df or link_df.fieldtype != "Link" or not link_df.options:
                continue
            target_doctype = link_df.options
            target_meta = frappe.get_meta(target_doctype)
            if target_meta.issingle or target_meta.is_virtual:
                continue
            if frappe.db.has_column(target_doctype, source_fieldname):
                continue  # column exists → fetch_from is valid, leave it alone
            # Broken reference — clear it so core link validation can't crash.
            frappe.db.set_value("Custom Field", row.name, "fetch_from", None, update_modified=False)
            cleared.append(f"{row.dt}.{row.fieldname} ({fetch_from})")
        except Exception:
            # Hygiene must never break a migrate; skip anything we can't inspect.
            continue

    if cleared:
        frappe.db.commit()
        frappe.clear_cache()
        frappe.logger("recruitment").info(
            "repair_broken_fetch_from cleared {0} broken reference(s): {1}".format(
                len(cleared), "; ".join(cleared)
            )
        )


def sync_all_lookup_fields():
    """Populate TA Job Applicant Field from the live Job Applicant schema.

    Both TA Duplicity Check Settings and TA Rehire Check Settings use this
    same master to drive their field-picker Table MultiSelect.  Calling it
    here ensures the records exist on any fresh install or after a migrate,
    without requiring someone to first open a settings form in the browser."""
    from recruitment.recruitment.doctype.ta_duplicity_check_settings.ta_duplicity_check_settings import (
        sync_job_applicant_fields,
    )

    sync_job_applicant_fields()
