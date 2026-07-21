import frappe
from frappe.model.mapper import get_mapped_doc

from hrms.hr.doctype.job_requisition.job_requisition import JobRequisition


# Job Requisition field -> Job Opening field, for pairs whose *meaning* is the
# same but whose fieldname differs. Same-named fields (company, department,
# designation, description, custom_functional_area, the shared child tables,
# etc.) are copied automatically by get_mapped_doc and don't belong here.
_JR_TO_JO_FIELD_MAP = {
    "name": "job_requisition",
    "no_of_positions": "vacancies",
    "custom_employment_type_link": "employment_type",
    "custom_location": "location",
    "reason_for_requesting": "custom_reason_for_requesting",
}

# Job Opening Select fields whose option set differs from the Job Requisition
# field of the same name. get_mapped_doc copies same-named fields blindly, which
# could plant an option the target doesn't offer; we scrub those post-copy.
_JO_GUARDED_SELECTS = ("custom_work_experience_range", "custom_preferred_notice_period")

# Job Requisition salary-timeframe -> Job Opening salary_per.
_TIMEFRAME_TO_SALARY_PER = {"Annual": "Year", "Monthly": "Month"}

# Requisition person -> Hiring Team role, in priority order. Each entry is
# (requisition fieldname, fieldtype, role). "Employee" fields are resolved to
# their linked User (a hiring-team row needs a User); "User" fields are used
# as-is. Priority order also breaks ties: if the same user fills two of these
# fields, the first (highest) role wins and the person is listed once.
_JR_HIRING_TEAM_SOURCES = (
    ("requested_by", "Employee", "Hiring Manager"),
    ("custom_hiring_lead", "Employee", "Hiring Lead"),
    ("custom_assign_to_recruiter", "User", "Recruiter"),
)


def _resolve_team_user(value, fieldtype):
    """Return the User id for a requisition person field, or None to skip.

    Employee links resolve to their ``user_id`` (an Employee with no linked user
    can't be a hiring-team member and is skipped); User links pass through.
    """
    if not value:
        return None
    if fieldtype == "Employee":
        return frappe.db.get_value("Employee", value, "user_id") or None
    return value


def _fill_hiring_team_from_requisition(source, target):
    """Seed the Job Opening's Hiring Team from the requisition's people.

    Only runs when creating an opening *from* a requisition (the mapper path),
    and only when the target has no hiring team yet — so a manually-built team
    on an opening that later gets a requisition linked is never overridden.
    """
    if not target.meta.has_field("custom_hiring_team"):
        return
    if target.get("custom_hiring_team"):
        return

    seen_users = set()
    for fieldname, fieldtype, role in _JR_HIRING_TEAM_SOURCES:
        user = _resolve_team_user(source.get(fieldname), fieldtype)
        if not user or user in seen_users:
            continue
        seen_users.add(user)
        target.append("custom_hiring_team", {"user": user, "role": role})


def _to_number(value):
    """Best-effort numeric parse of a free-text Data field; None when not numeric."""
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


@frappe.whitelist()
def make_job_opening(source_name, target_doc=None):
    """Create a Job Opening from a Job Requisition, carrying across every field
    whose meaning is shared between the two doctypes.

    Replaces HRMS's ``make_job_opening`` (wired via ``override_whitelisted_methods``
    in hooks.py) for two reasons:

      1. HRMS placed its ``field_map`` as a sibling of the doctype entry instead
         of nesting it, so its non-same-name mappings (job_requisition, vacancies)
         were silently never applied. We nest it correctly here.
      2. We extend the map to the recruitment custom fields (employment type,
         location, salary, experience, notice period, the shared child tables …)
         so the opening opens fully pre-filled.

    Route uniqueness (the "Route must be unique" error) is handled separately and
    uniformly at save time by ``job_opening_settings.ensure_unique_route``.

    Derived values are computed defensively — a malformed source value is skipped
    rather than raised, so the mapping never breaks the "Create Job Opening" action.
    """

    def set_missing_values(source, target):
        target.job_title = source.designation
        # A freshly created opening always starts Open (JR status options such as
        # "Open & Approved" aren't valid on Job Opening).
        target.status = "Open"
        target.description = source.description

        # Seed the Hiring Team from the requisition's people (hiring manager,
        # hiring lead, recruiter). Guarded so it never overrides a team that was
        # built manually before a requisition was linked.
        try:
            _fill_hiring_team_from_requisition(source, target)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "make_job_opening hiring-team seed failed")

        try:
            company_currency = (
                frappe.db.get_value("Company", source.company, "default_currency")
                if source.company
                else None
            )
            target.currency = source.get("custom_salary_range_currency") or company_currency or target.currency

            # Compensation: explicit expected_compensation first, then the
            # min/max salary range (stored as free-text Data on the requisition).
            if source.get("expected_compensation"):
                target.lower_range = source.expected_compensation
            salary_min = _to_number(source.get("custom_salary_range_min"))
            salary_max = _to_number(source.get("custom_salary_range_max"))
            if salary_min is not None:
                target.lower_range = salary_min
            if salary_max is not None:
                target.upper_range = salary_max

            salary_per = _TIMEFRAME_TO_SALARY_PER.get(source.get("custom_salary_timeframe"))
            if salary_per:
                target.salary_per = salary_per

            # Minimum experience: the "from" end of the requisition's range.
            min_experience = _to_number(source.get("custom_experience_range_from"))
            if min_experience is not None and target.meta.has_field("custom_min_experience_required"):
                target.custom_min_experience_required = min_experience

            # Drop any Select value the target doctype doesn't actually offer, so
            # a blindly-copied option can't render as an invalid/blank choice.
            for fieldname in _JO_GUARDED_SELECTS:
                df = target.meta.get_field(fieldname)
                value = target.get(fieldname)
                if df and value:
                    allowed = {opt.strip() for opt in (df.options or "").split("\n") if opt.strip()}
                    if value not in allowed:
                        target.set(fieldname, None)
        except Exception:
            # Enrichment is best-effort; the core mapping must still succeed.
            frappe.log_error(frappe.get_traceback(), "make_job_opening enrichment failed")

    return get_mapped_doc(
        "Job Requisition",
        source_name,
        {
            "Job Requisition": {
                "doctype": "Job Opening",
                "field_map": _JR_TO_JO_FIELD_MAP,
            }
        },
        target_doc,
        set_missing_values,
    )


class CustomJobRequisition(JobRequisition):
    """Override of HRMS Job Requisition for the recruitment flow.

    HRMS's ``validate_duplicates`` rejects more than one *open* Job Requisition
    per (designation, department, requested_by). Our flow deliberately raises
    ONE requisition per location — all of which legitimately share the same
    designation / department / requested_by — so HRMS (wrongly, for us) flags
    those siblings as duplicates and blocks the save with, e.g.:

        A Job Requisition for President requested by 37001 already exists: HR-HIREQ-00017

    The React API already bypassed this per-instance (see
    ``recruitment.api.job_requisition._bypass_hrms_duplicate_check``), but the
    Desk form save path (Save after a status change, etc.) never goes through
    that API, so the check still fired there.

    Overriding the method on the class disables it uniformly across *every*
    save path — Desk UI, API, scripted writes and imports — which is why this
    is registered via ``override_doctype_class`` rather than a per-call patch.

    Everything else (validate → set_time_to_fill, associate_job_opening,
    make_job_opening, get_avg_time_to_fill, …) is inherited from the HRMS class
    unchanged. The existing ``validate`` doc_event (sync_no_of_positions) also
    keeps running, since doc_events fire in addition to the class methods.
    """

    def validate_duplicates(self):
        # Intentional no-op: location-level requisitions legitimately share the
        # (designation, department, requested_by) triple. See class docstring.
        pass
