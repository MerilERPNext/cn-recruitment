"""Duplicity check logic consumed by the Job Applicant before_insert hook.

Looks up the applicable TA Duplicity Check Settings for the applicant's company
and enforces:
  - Reapplication cooldown: same position applied within N days → blocked.
  - Multi-position restriction: active application at a different opening → blocked.

Both candidate (external) and IJP (employee) paths use separate settings fields.

NOT implemented here (unclear from codebase):
  - allow_candidate_multi_positions_external_recruiter — no reliable field
    distinguishes "external recruiter" applications in the Job Applicant record.
"""
import frappe
from frappe import _
from frappe.utils import add_days, getdate, nowdate

_ADMIN_ROLES = frozenset({"System Manager", "Administrator"})
_WITHDRAWN_SUBSTATUS = "Withdrawn by Candidate"


# ---------------------------------------------------------------------------
# Settings lookup
# ---------------------------------------------------------------------------

def _get_applicable_setting(company):
    """Return the TA Duplicity Check Settings doc covering *company*, or None.

    Queries the TA Duplicity Check Company child table directly — avoids
    loading every settings doc in a loop.
    """
    if not company:
        return None

    parent_name = frappe.db.get_value(
        "TA Duplicity Check Company",
        {"company": company},
        "parent",
    )
    if not parent_name:
        return None

    try:
        return frappe.get_doc("TA Duplicity Check Settings", parent_name)
    except frappe.DoesNotExistError:
        return None


# ---------------------------------------------------------------------------
# Override permission
# ---------------------------------------------------------------------------

def _user_can_override(settings):
    """True if the current user is allowed to skip duplicity enforcement."""
    if not settings.allow_override_by_admins_and_roles:
        return False
    roles = set(frappe.get_roles())
    return bool(roles & _ADMIN_ROLES) or "HR Manager" in roles


# ---------------------------------------------------------------------------
# Main hook (registered in hooks.py → Job Applicant → before_insert)
# ---------------------------------------------------------------------------

def _resolve_company(applicant):
    """Prefer custom_company_finalized; fall back to the Job Opening's company.

    custom_company_finalized is only set later in the pipeline, so new
    applicants would have it blank. The Job Opening always has a company.
    """
    return applicant.custom_company_finalized or (
        frappe.db.get_value("Job Opening", applicant.job_title, "company")
        if applicant.job_title else None
    )


def check_duplicity(applicant, method=None):
    """Enforce TA Duplicity Check Settings on every new Job Applicant."""
    settings = _get_applicable_setting(_resolve_company(applicant))
    if not settings:
        return

    if _user_can_override(settings):
        return

    # Collect the fieldnames the admin configured as duplicate-detection keys.
    fieldnames = [
        row.applicant_field
        for row in (settings.select_duplicity_check_fields or [])
        if row.applicant_field
    ]
    if not fieldnames:
        return

    # Build OR conditions: an existing applicant matches if ANY configured
    # field has the same value as the incoming applicant.
    or_filters = []
    for fn in fieldnames:
        val = applicant.get(fn)
        if val:
            or_filters.append([fn, "=", val])

    if not or_filters:
        return  # No matchable values on this applicant yet — nothing to check.

    is_ijp = bool(applicant.get("custom_applied_employee"))
    if is_ijp:
        _check_ijp(applicant, settings, or_filters)
    else:
        _check_candidate(applicant, settings, or_filters)


# ---------------------------------------------------------------------------
# Candidate (external / non-IJP) rules
# ---------------------------------------------------------------------------

def _check_candidate(applicant, settings, or_filters):
    cooldown = int(settings.days_before_candidate_reapplication or 0)
    allow_multi = bool(settings.allow_candidate_multi_positions_other_sources)

    # ── Same-position reapplication cooldown ────────────────────────────────
    if cooldown and applicant.job_title:
        cutoff = add_days(nowdate(), -cooldown)
        existing = frappe.db.get_all(
            "Job Applicant",
            filters=[
                ["custom_company_finalized", "=", applicant.custom_company_finalized],
                ["job_title", "=", applicant.job_title],
                ["creation", ">=", cutoff],
            ],
            or_filters=or_filters,
            fields=["name", "creation"],
            ignore_permissions=True,
            limit=1,
        )
        if existing:
            can_reapply = frappe.utils.formatdate(
                add_days(getdate(existing[0]["creation"]), cooldown)
            )
            frappe.throw(
                _("This candidate has already applied for <b>{0}</b>. "
                  "Reapplication is allowed only after {1}.").format(
                    applicant.job_title,
                    can_reapply,
                ),
                title=_("Duplicate Application"),
            )

    # ── Multi-position restriction ───────────────────────────────────────────
    if not allow_multi and applicant.job_title:
        existing = frappe.db.get_all(
            "Job Applicant",
            filters=[
                ["custom_company_finalized", "=", applicant.custom_company_finalized],
                ["job_title", "!=", applicant.job_title],
                ["status", "not in", ["Rejected"]],
            ],
            or_filters=or_filters,
            fields=["name", "job_title", "custom_substatus"],
            ignore_permissions=True,
            limit=10,
        )
        # Also exclude applications that were withdrawn by the candidate.
        active = [r for r in existing if r.get("custom_substatus") != _WITHDRAWN_SUBSTATUS]
        if active:
            frappe.throw(
                _("This candidate already has an active application <b>{0}</b> for another "
                  "position. Applying to multiple positions simultaneously is not permitted.").format(
                    active[0]["name"]
                ),
                title=_("Multiple Position Application Not Allowed"),
            )


# ---------------------------------------------------------------------------
# Employee / IJP rules
# ---------------------------------------------------------------------------

def _check_ijp(applicant, settings, or_filters):
    cooldown = int(settings.days_before_employee_ijp_reapplication or 0)
    allow_multi = bool(settings.allow_employee_multi_positions_ijp)
    employee = applicant.get("custom_applied_employee")

    # For IJP, filter by the specific employee to avoid false matches with
    # other candidates who share the same email / phone number.
    employee_filter = ["custom_applied_employee", "=", employee]

    # ── Same-position reapplication cooldown ────────────────────────────────
    if cooldown and applicant.job_title:
        cutoff = add_days(nowdate(), -cooldown)
        existing = frappe.db.get_all(
            "Job Applicant",
            filters=[
                employee_filter,
                ["job_title", "=", applicant.job_title],
                ["creation", ">=", cutoff],
            ],
            fields=["name", "creation"],
            ignore_permissions=True,
            limit=1,
        )
        if existing:
            can_reapply = frappe.utils.formatdate(
                add_days(getdate(existing[0]["creation"]), cooldown)
            )
            frappe.throw(
                _("You have already applied for <b>{0}</b> via IJP. "
                  "Reapplication is allowed only after {1}.").format(
                    applicant.job_title,
                    can_reapply,
                ),
                title=_("Duplicate IJP Application"),
            )

    # ── Multi-position restriction ───────────────────────────────────────────
    if not allow_multi and applicant.job_title:
        existing = frappe.db.get_all(
            "Job Applicant",
            filters=[
                employee_filter,
                ["job_title", "!=", applicant.job_title],
                ["status", "not in", ["Rejected"]],
            ],
            fields=["name", "job_title", "custom_substatus"],
            ignore_permissions=True,
            limit=10,
        )
        active = [r for r in existing if r.get("custom_substatus") != _WITHDRAWN_SUBSTATUS]
        if active:
            frappe.throw(
                _("You already have an active IJP application <b>{0}</b> for another position. "
                  "Applying to multiple positions via IJP simultaneously is not permitted.").format(
                    active[0]["name"]
                ),
                title=_("Multiple IJP Position Application Not Allowed"),
            )
