"""Post-install / post-migrate hooks for the Recruitment app.

Called by Frappe after every `bench migrate` (after_migrate) and after the
initial app install (after_install).  Safe to run multiple times — all
functions are idempotent.
"""
import frappe


def after_install():
    sync_all_lookup_fields()


def after_migrate():
    sync_all_lookup_fields()


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
