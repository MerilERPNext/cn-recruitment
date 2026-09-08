import frappe
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import date_diff, format_duration, get_link_to_form, time_diff_in_seconds

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
RECRUITER_ROLE = "Recruiter"

_JR_HIRING_TEAM_SOURCES = (
    ("requested_by", "Employee", "Hiring Manager"),
    ("custom_hiring_lead", "Employee", "Hiring Lead"),
    ("custom_assign_to_recruiter", "User", RECRUITER_ROLE),
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


def _fill_hiring_team_from_requisition(source, target, recruiter=None):
    """Seed the Job Opening's Hiring Team from the requisition's people.

    Only runs when creating an opening *from* a requisition (the mapper path),
    and only when the target has no hiring team yet — so a manually-built team
    on an opening that later gets a requisition linked is never overridden.

    `recruiter` overrides the requisition's `custom_assign_to_recruiter` for the
    Recruiter row. A Fresher requisition has no single recruiter — it names one
    per region — so the opening raised for a region is staffed with that region's
    recruiter rather than a parent field that is empty on every Fresher
    requisition.
    """
    if not target.meta.has_field("custom_hiring_team"):
        return
    if target.get("custom_hiring_team"):
        return

    seen_users = set()
    for fieldname, fieldtype, role in _JR_HIRING_TEAM_SOURCES:
        if role == RECRUITER_ROLE and recruiter:
            user = recruiter
        else:
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



RECRUITER_FIELD = "custom_assign_to_recruiter"
OPENING_RECRUITER_FIELD = "custom_recruiter"
HIRING_TYPE_FRESHER = "Fresher"


def _requisition_recruiter(job_requisition):
	return frappe.db.get_value("Job Requisition", job_requisition, RECRUITER_FIELD) \
		if job_requisition else None


def _has_region_recruiters(job_requisition):
	"""True when a Fresher requisition names a recruiter on its Regions table.

	Fresher hiring has no single recruiter to assign: the requisition covers
	several regions and each one gets its own recruiter, its own Job Opening and
	its own headcount. So "who owns this?" is answered per region, and the parent
	`custom_assign_to_recruiter` stays empty on every Fresher requisition.
	"""
	if not job_requisition:
		return False
	return bool(frappe.get_all(
		"Job Requisition Region",
		filters={
			"parent": job_requisition,
			"parenttype": "Job Requisition",
			"recruiter": ["is", "set"],
		},
		limit=1,
	))


def assert_recruiter_assigned(job_requisition, opening=None, recruiter=None):
	"""A requisition without a recruiter cannot become a job opening.

	The recruiter is who owns the opening once it is live — they seed its hiring
	team, and every candidate that arrives is theirs to work. An opening created
	without one belongs to nobody, which is only noticed when applications start
	piling up unattended.

	Three ways to satisfy it, in the order they are cheapest to check:
	  * `recruiter` — named explicitly by the caller building the opening;
	  * the opening's own `custom_recruiter` — how a per-region Fresher opening
	    carries its owner;
	  * the requisition's `custom_assign_to_recruiter` (Lateral), or any recruiter
	    on its Regions table (Fresher).
	"""
	if not job_requisition:
		return
	if recruiter:
		return
	if opening is not None and opening.get(OPENING_RECRUITER_FIELD):
		return
	if _requisition_recruiter(job_requisition) or _has_region_recruiters(job_requisition):
		return

	is_fresher = frappe.db.get_value(
		"Job Requisition", job_requisition, "custom_hiring_type"
	) == HIRING_TYPE_FRESHER
	where = (
		_("Set a <b>Recruiter</b> on each row of the <b>Regions</b> table")
		if is_fresher
		else _("Set <b>Assign to Recruiter</b> on the requisition")
	)
	frappe.throw(
		_("{0} has no recruiter assigned, so its job opening would belong to nobody. "
		  "{1} and try again.").format(
			get_link_to_form("Job Requisition", job_requisition), where),
		title=_("Assign a recruiter first"),
	)


def set_days_to_expected_by(doc, method=None):
	"""Job Requisition `validate` — store the days between the requisition's
	posting date and the date it is expected by, so the wait a hiring manager
	asked for is visible and reportable without recomputing it per row.

	Cleared when either date is missing. A negative value (expected_by before
	posting_date) is stored as-is rather than clamped — that's a data-entry
	problem worth seeing, not one to hide behind a 0.
	"""
	if not doc.get("posting_date") or not doc.get("expected_by"):
		doc.custom_days_to_expected_by = None
		return
	doc.custom_days_to_expected_by = date_diff(doc.expected_by, doc.posting_date)


def require_recruiter_on_new_opening(doc, method=None):
	"""Job Opening `validate` — the same rule, wherever the opening is created from.

	The Desk button goes through make_job_opening below, but the web app builds the
	opening straight through the Resource API, so the rule has to live on the target
	doctype as well or that path walks straight past it. Creation only: a requisition
	losing its recruiter later must not block edits to an opening already running.
	"""
	if doc.is_new():
		assert_recruiter_assigned(doc.get("job_requisition"), opening=doc)


@frappe.whitelist()
def make_job_opening(source_name, target_doc=None, recruiter=None):
    """Create a Job Opening from a Job Requisition, carrying across every field
    whose meaning is shared between the two doctypes.

    `recruiter` names the User who will own the opening, for callers that know it
    better than the requisition does — a Fresher requisition keeps a recruiter per
    region rather than one on the parent, so
    `recruitment.customizations.fresher_openings` passes that region's recruiter
    in. Omitted, the requisition's own `custom_assign_to_recruiter` is used, which
    is the Lateral behaviour and is unchanged.

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

    # Checked before anything is mapped, so the Desk button says it straight away
    # rather than after the form has been filled in.
    assert_recruiter_assigned(source_name, recruiter=recruiter)

    def set_missing_values(source, target):
        target.job_title = source.designation
        # A freshly created opening always starts Open (JR status options such as
        # "Open & Approved" aren't valid on Job Opening).
        target.status = "Open"
        target.description = source.description
        if recruiter and target.meta.has_field(OPENING_RECRUITER_FIELD):
            target.set(OPENING_RECRUITER_FIELD, recruiter)

        # Seed the Hiring Team from the requisition's people (hiring manager,
        # hiring lead, recruiter). Guarded so it never overrides a team that was
        # built manually before a requisition was linked.
        try:
            _fill_hiring_team_from_requisition(source, target, recruiter=recruiter)
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

    def set_time_to_fill(self):
        """HRMS keys this off status == "Filled"; our completion status is named
        "Auto Archived", so the inherited check would never fire."""
        from recruitment.api.requisition_status import AUTO_ARCHIVED_STATUS

        if self.status == AUTO_ARCHIVED_STATUS and self.completed_on:
            self.time_to_fill = time_diff_in_seconds(self.completed_on, self.posting_date)


@frappe.whitelist()
def get_avg_time_to_fill(company=None, department=None, designation=None):
    """Average time-to-fill, for the stock "Time to Fill" number card.

    Replaces HRMS's version (via ``override_whitelisted_methods``), which filters
    on the retired status "Filled" and would always report 0. Same signature.
    """
    from recruitment.api.requisition_status import AUTO_ARCHIVED_STATUS

    filters = {"status": AUTO_ARCHIVED_STATUS}
    if company:
        filters["company"] = company
    if department:
        filters["department"] = department
    if designation:
        filters["designation"] = designation

    avg = frappe.db.get_list(
        "Job Requisition", filters=filters, fields=["avg(time_to_fill) as average_time"]
    )[0].average_time
    return format_duration(avg) if avg else 0
