# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Guest-facing DPDP consent endpoints.

The DPDP consent page is shown to a candidate immediately after they accept
their Job Offer (see ``job_offer_update`` -> ``dpdp_consent_required``). It is
part of the same guest portal flow, so these endpoints are gated with the very
same signed offer token the candidate already holds — no new scope needed.

Two endpoints:
  - ``get_dpdp_consent_form``  -> the configured form to render the page.
  - ``submit_dpdp_consent``    -> record the candidate's ticks as an immutable
                                  Job Applicant DPDP Consent Log.

Both are defensive: if the feature is off, or the settings/doctypes are not yet
migrated on a site, callers behave exactly as before.
"""

import json

import frappe
from frappe import _
from frappe.utils import cint, now_datetime, today

from recruitment.job_offer_utils import _authorize_offer, is_dpdp_consent_enabled

LOG_DOCTYPE = "Job Applicant DPDP Consent Log"


def _normalize_accepted_keys(responses):
    """Return the set of consent keys the candidate ticked.

    Accepts any of the shapes the frontend might send:
      - JSON string of any of the below
      - ["accuracy", "agreement"]                         (list of accepted keys)
      - {"accuracy": true, "agreement": false}            (key -> bool map)
      - [{"consent_key": "accuracy", "accepted": true}]   (list of row objects)
    """
    if not responses:
        return set()

    if isinstance(responses, str):
        try:
            responses = json.loads(responses)
        except (ValueError, TypeError):
            return set()

    accepted = set()
    if isinstance(responses, dict):
        for key, val in responses.items():
            if cint(val):
                accepted.add(str(key))
    elif isinstance(responses, (list, tuple)):
        for item in responses:
            if isinstance(item, dict):
                key = item.get("consent_key") or item.get("key")
                if key and cint(item.get("accepted", 1)):
                    accepted.add(str(key))
            elif item is not None:
                accepted.add(str(item))
    return accepted


def _existing_submitted_log(appl):
    """Name of an already-accepted (submitted) consent log for this applicant."""
    return frappe.db.get_value(
        LOG_DOCTYPE,
        {"job_applicant": appl, "docstatus": 1, "consent_given": 1},
        "name",
    )


@frappe.whitelist(allow_guest=True)
def get_dpdp_consent_form(appl, token=None):
    """Return the configured DPDP consent form for the candidate portal page.

    ``enabled: False`` means the page should not be shown at all (feature off) —
    the UI can simply skip straight to onboarding.
    """
    if not appl:
        frappe.throw(_("Missing applicant parameter"))
    _authorize_offer(appl, token, "read")

    if not is_dpdp_consent_enabled():
        return {"enabled": False}

    settings = frappe.get_cached_doc("DPDP Act Settings")

    information_clauses = [
        {"information_collected": row.information_collected, "purpose": row.purpose}
        for row in (settings.information_clauses or [])
        if row.is_active
    ]
    consent_statements = [
        {
            "consent_key": row.consent_key,
            "statement": row.statement,
            "is_mandatory": cint(row.is_mandatory),
        }
        for row in (settings.consent_statements or [])
        if row.is_active
    ]

    applicant = frappe.db.get_value(
        "Job Applicant", appl, ["applicant_name", "email_id"], as_dict=True
    ) or {}

    existing = _existing_submitted_log(appl)

    return {
        "enabled": True,
        "already_consented": bool(existing),
        "consent_log": existing,
        "enforce_before_onboarding": cint(settings.enforce_before_onboarding),
        "require_all_mandatory": cint(settings.require_all_mandatory),
        "capture_employee_name": cint(settings.capture_employee_name),
        "capture_date": cint(settings.capture_date),
        "form_title": settings.form_title,
        "form_subtitle": settings.form_subtitle,
        "intro_content": settings.intro_content,
        "information_column_label": settings.information_column_label,
        "purpose_column_label": settings.purpose_column_label,
        "information_clauses": information_clauses,
        "closing_content": settings.closing_content,
        "declaration_heading": settings.declaration_heading,
        "consent_statements": consent_statements,
        "confirmation_note": settings.confirmation_note,
        "applicant_name": applicant.get("applicant_name"),
        "email_id": applicant.get("email_id"),
    }


@frappe.whitelist(allow_guest=True)
def submit_dpdp_consent(
    appl,
    token=None,
    responses=None,
    employee_name=None,
    signature=None,
    acceptance_date=None,
):
    """Record the candidate's DPDP consent as an immutable log and return status.

    ``responses`` lists which consent statements were ticked (see
    ``_normalize_accepted_keys`` for accepted shapes). When every mandatory
    statement is accepted the log is submitted (locked) and ``consent_given`` is
    True — that is the signal the onboarding gate looks for.
    """
    if not appl:
        frappe.throw(_("Missing applicant parameter"))
    _authorize_offer(appl, token, "write")

    if not is_dpdp_consent_enabled():
        frappe.throw(_("DPDP consent is not enabled."))

    # Idempotent: if the candidate already accepted, don't create a duplicate.
    existing = _existing_submitted_log(appl)
    if existing:
        return {"consent_log": existing, "consent_given": True, "status": "Accepted"}

    settings = frappe.get_cached_doc("DPDP Act Settings")
    accepted_keys = _normalize_accepted_keys(responses)

    active_statements = [row for row in (settings.consent_statements or []) if row.is_active]

    # Enforce mandatory ticks up-front for a clear error to the candidate.
    if cint(settings.require_all_mandatory):
        missing = [
            row for row in active_statements
            if cint(row.is_mandatory) and row.consent_key not in accepted_keys
        ]
        if missing:
            frappe.throw(_("Please accept all mandatory statements to continue."))

    original_ignore = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        log = frappe.new_doc(LOG_DOCTYPE)
        log.job_applicant = appl

        # Snapshot the exact content presented, for audit.
        log.form_title = settings.form_title
        log.form_subtitle = settings.form_subtitle
        log.intro_content = settings.intro_content
        log.information_column_label = settings.information_column_label
        log.purpose_column_label = settings.purpose_column_label
        log.closing_content = settings.closing_content
        log.declaration_heading = settings.declaration_heading

        for row in (settings.information_clauses or []):
            if row.is_active:
                log.append("information_clauses", {
                    "information_collected": row.information_collected,
                    "purpose": row.purpose,
                    "is_active": 1,
                })

        for row in active_statements:
            log.append("consent_responses", {
                "consent_key": row.consent_key,
                "statement": row.statement,
                "is_mandatory": cint(row.is_mandatory),
                "accepted": 1 if row.consent_key in accepted_keys else 0,
            })

        if cint(settings.capture_employee_name) and employee_name:
            log.employee_name = employee_name
        if signature:
            log.signature = signature
        if cint(settings.capture_date):
            log.acceptance_date = acceptance_date or today()

        # Audit trail.
        log.ip_address = frappe.local.request_ip if hasattr(frappe.local, "request_ip") else None
        try:
            log.user_agent = frappe.get_request_header("User-Agent")
        except Exception:
            pass

        log.insert(ignore_permissions=True)

        # consent_given is derived in the controller (all mandatory accepted).
        if log.consent_given:
            log.submit()

        return {
            "consent_log": log.name,
            "consent_given": bool(log.consent_given),
            "status": log.status,
        }
    finally:
        frappe.flags.ignore_permissions = original_ignore
