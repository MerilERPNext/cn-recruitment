import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from recruitment.api.candidate_auth import candidate_required, get_current_candidate


# Portal page routes for each step (the candidate portal is a separate frontend).
ACTION_CENTER_URL = "/action-center"
SURVEY_URL_TEMPLATE = "/survey?appl={applicant}"
JOB_OFFER_URL_TEMPLATE = "/job_offer?appl={applicant}"
ONBOARDING_URL_TEMPLATE = "/onboarding?appl={applicant}"

# Logical step keys. The order/label/enabled of these steps is configured per site
# in Candidate Portal Auth Settings -> Post-Login Flow (the `post_login_flow` table).
SURVEY_STEP = "Survey"
JOB_OFFER_STEP = "Job Offer"
ONBOARDING_STEP = "Onboarding"

# All step types the flow understands — used to validate configured rows.
VALID_STEPS = (SURVEY_STEP, JOB_OFFER_STEP, ONBOARDING_STEP)

# Routing used when NO Post-Login Flow is configured (the table is empty). This is
# the original product behaviour — survey (if the Job Opening enables it), then the
# job offer, then the action center — so sites that don't opt in are completely
# unaffected. Onboarding is intentionally NOT a routed step here; it only joins the
# flow once a site explicitly configures the table.
LEGACY_FLOW = (SURVEY_STEP, JOB_OFFER_STEP)

# Default captions used when a configured row leaves the label blank.
DEFAULT_STEP_LABELS = {
    SURVEY_STEP: "Survey",
    JOB_OFFER_STEP: "Offer Acceptance",
    ONBOARDING_STEP: "Onboarding",
}


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------
@candidate_required
def get_post_login_route():
    """Tell the candidate portal where to land after login AND describe the stepper.

    Routing — walks the configured Post-Login Flow in order and points at the first
    step still pending for this candidate:
      - Survey    → render the survey form (survey_required=True + schema).
      - Job Offer → redirect to the job offer page (redirect_url).
      - Onboarding → redirect to the onboarding page (redirect_url).
      - nothing pending → the action center (redirect_url).

    Sidebar — the same response always carries the full stepper so the UI needs only
    this one call:
      - steps[]      : ordered [{key, label, status, redirect_url}] for the portal
                       stepper; status is "completed" | "ongoing" | "pending".
      - current_step : key of the ongoing step (or None).
      - job_applicant / job_opening : the resolved application context.

    With no flow configured, routing keeps the legacy order (Survey → Job Offer →
    action center) and the stepper is empty — i.e. existing sites are unaffected.
    """
    applicant_name, opening_name = _resolve_candidate_application()
    if not applicant_name or not opening_name:
        return {
            "survey_required": False,
            "redirect_url": ACTION_CENTER_URL,
            "job_applicant": applicant_name,
            "job_opening": opening_name,
            "current_step": None,
            "next_step": None,
            "steps": [],
        }

    opening = frappe.get_doc("Job Opening", opening_name)
    steps, current_step = _build_flow(applicant_name, opening)
    # Next step = the first still-pending step after the ongoing one. Steps are
    # ordered completed → ongoing → pending, so the first "pending" row is the
    # step the candidate moves to once the current one is done (None if last).
    next_step = next((s["key"] for s in steps if s["status"] == "pending"), None)
    flow = {
        "job_applicant": applicant_name,
        "job_opening": opening_name,
        "current_step": current_step,
        "next_step": next_step,
        "steps": steps,
    }

    step = _next_step(applicant_name, opening)

    if step == SURVEY_STEP:
        widget_name = opening.get("custom_recruitment_survey_form")
        widget = frappe.get_doc("Microapp Form Widget", widget_name)
        return {
            "survey_required": True,
            "form_name": widget_name,
            "form_schema": _parse_form_schema(widget.get("custom_form_data")),
            **flow,
        }

    if step in (JOB_OFFER_STEP, ONBOARDING_STEP):
        return {"survey_required": False, "redirect_url": _step_url(step, applicant_name), **flow}

    return {"survey_required": False, "redirect_url": ACTION_CENTER_URL, **flow}


@candidate_required
def submit_survey(response):
    """Persist the candidate's survey response and return the next URL.

    Idempotent — a repeat submission for the same applicant returns
    the same redirect without creating a duplicate row.
    """
    applicant_name, opening_name = _resolve_candidate_application()
    if not applicant_name:
        frappe.throw(_("No job application is linked to your account."))
    if not opening_name:
        frappe.throw(_("No job opening is linked to your application."))

    opening = frappe.get_doc("Job Opening", opening_name)
    if not _is_survey_enabled(opening):
        frappe.throw(_("Recruitment survey is not enabled for this job opening."))

    if frappe.db.exists("Recruitment Survey Response", {"job_applicant": applicant_name}):
        return {"status": "success", "redirect_url": _next_url(applicant_name)}

    doc = frappe.new_doc("Recruitment Survey Response")
    doc.job_applicant = applicant_name
    doc.candidate_email = get_current_candidate()
    doc.job_opening = opening_name
    doc.microapp_form_widget = opening.get("custom_recruitment_survey_form")
    doc.response_json = _serialize_response(response)
    doc.submitted_at = now_datetime()
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "redirect_url": _next_url(applicant_name)}


# ---------------------------------------------------------------------------
# Flow configuration (driven by Candidate Portal Auth Settings)
# ---------------------------------------------------------------------------
def _get_flow_config():
    """Ordered [{key, label}] of the steps configured in Candidate Portal Auth Settings.

    Row order in the child table = flow order. Unknown / duplicate / disabled rows
    are dropped, and a blank label falls back to the step's default caption.

    Returns an EMPTY list when the table is not configured — the feature is opt-in,
    so an unconfigured site shows no stepper and keeps the legacy routing (see
    _get_flow_steps).
    """
    try:
        settings = frappe.get_single("Candidate Portal Auth Settings")
        rows = settings.get("post_login_flow") or []
    except Exception:
        rows = []

    seen, out = set(), []
    for row in rows:
        key = (row.get("step") or "").strip()
        if key not in VALID_STEPS or not cint(row.get("enabled")) or key in seen:
            continue
        seen.add(key)
        label = (row.get("label") or "").strip() or DEFAULT_STEP_LABELS.get(key, key)
        out.append({"key": key, "label": label})
    return out


def _get_flow_steps():
    """Ordered step keys for routing — configured flow, else the legacy fallback.

    When a site hasn't configured the Post-Login Flow, fall back to LEGACY_FLOW so
    `get_post_login_route` behaves exactly as it did before this feature existed.
    """
    keys = [cfg["key"] for cfg in _get_flow_config()]
    return keys or list(LEGACY_FLOW)


def _build_flow(applicant_name, opening):
    """Build the portal stepper: ordered steps + the current (ongoing) step key.

    Returns (steps, current_step) where each step is
    {key, label, status, redirect_url} and status is derived from the configured
    order — finished steps are "completed", the first unfinished step is "ongoing",
    the rest are "pending". Empty when the flow isn't configured for this site.
    """
    steps = []
    ongoing_taken = False
    for cfg in _get_flow_config():
        key = cfg["key"]
        if not _is_step_applicable(key, applicant_name, opening):
            continue

        if _is_step_completed(key, applicant_name, opening):
            status = "completed"
        elif not ongoing_taken:
            status = "ongoing"
            ongoing_taken = True
        else:
            status = "pending"

        steps.append({
            "key": key,
            "label": cfg["label"],
            "status": status,
            "redirect_url": _step_url(key, applicant_name),
        })

    current_step = next((s["key"] for s in steps if s["status"] == "ongoing"), None)
    return steps, current_step


def _next_step(applicant_name, opening, skip=()):
    """First step that is an actionable gate now, in configured order, else None.

    `skip` lets a caller ignore steps already handled (e.g. the survey, once it has
    been submitted) so they never re-trigger.
    """
    for step in _get_flow_steps():
        if step in skip:
            continue
        if _is_step_pending(step, applicant_name, opening):
            return step
    return None


def _next_url(applicant_name):
    """Redirect URL for the next gate after the survey, else the action center.

    Runs after a survey submit, so the survey is done by definition — skip it and
    pick the next gate (Job Offer / Onboarding) or fall through to the action
    center. Skipping Survey also prevents a still-"pending" survey (idempotent
    re-submit, a frontend re-fetch, or an uncommitted row) from silently routing
    the candidate to the action center instead of their awaiting offer.
    """
    opening = None
    opening_name = frappe.db.get_value("Job Applicant", applicant_name, "job_title")
    if opening_name and frappe.db.exists("Job Opening", opening_name):
        opening = frappe.get_doc("Job Opening", opening_name)

    step = _next_step(applicant_name, opening, skip=(SURVEY_STEP,))
    if step in (JOB_OFFER_STEP, ONBOARDING_STEP):
        return _step_url(step, applicant_name)
    return ACTION_CENTER_URL


# ---------------------------------------------------------------------------
# Per-step predicates
# ---------------------------------------------------------------------------
def _is_step_applicable(step, applicant_name, opening):
    """Whether `step` is part of THIS candidate's journey (shown in the sidebar)."""
    if step == SURVEY_STEP:
        return bool(opening and _is_survey_enabled(opening) and opening.get("custom_recruitment_survey_form"))
    if step == JOB_OFFER_STEP:
        return True
    if step == ONBOARDING_STEP:
        flags = _offer_flags(applicant_name)
        # A candidate who rejected (and never accepted) an offer never onboards.
        return not (flags["rejected"] and not flags["accepted"])
    return False


def _is_step_completed(step, applicant_name, opening):
    """Whether `step` is finished for this candidate (sidebar = 'completed')."""
    if step == SURVEY_STEP:
        return bool(frappe.db.exists("Recruitment Survey Response", {"job_applicant": applicant_name}))
    if step == JOB_OFFER_STEP:
        flags = _offer_flags(applicant_name)
        return flags["accepted"] or flags["rejected"]
    if step == ONBOARDING_STEP:
        return _onboarding_completed(applicant_name)
    return False


def _is_step_pending(step, applicant_name, opening):
    """Whether `step` is an actionable gate right now (used for forced routing)."""
    if step == SURVEY_STEP:
        return bool(
            opening
            and _is_survey_enabled(opening)
            and opening.get("custom_recruitment_survey_form")
            and not frappe.db.exists("Recruitment Survey Response", {"job_applicant": applicant_name})
        )
    if step == JOB_OFFER_STEP:
        return _offer_flags(applicant_name)["awaiting"]
    if step == ONBOARDING_STEP:
        return _onboarding_in_progress(applicant_name)
    return False


def _step_url(step, applicant_name):
    if step == SURVEY_STEP:
        return SURVEY_URL_TEMPLATE.format(applicant=applicant_name)
    if step == JOB_OFFER_STEP:
        from recruitment.recruitment.link_token import offer_token
        return JOB_OFFER_URL_TEMPLATE.format(applicant=applicant_name) + "&token=" + offer_token(applicant_name)
    if step == ONBOARDING_STEP:
        return ONBOARDING_URL_TEMPLATE.format(applicant=applicant_name)
    return ACTION_CENTER_URL


# ---------------------------------------------------------------------------
# Step state helpers
# ---------------------------------------------------------------------------
def _offer_flags(applicant_name):
    """Aggregate Job Offer state for the applicant (live offers only, docstatus<2)."""
    statuses = {
        (row.status or "").strip().lower()
        for row in frappe.get_all(
            "Job Offer",
            filters={"job_applicant": applicant_name, "docstatus": ("<", 2)},
            fields=["status"],
        )
    }
    return {
        "any": bool(statuses),
        "awaiting": "awaiting response" in statuses,
        "accepted": "accepted" in statuses,
        "rejected": "rejected" in statuses,
    }


def _onboarding_completed(applicant_name):
    for row in frappe.get_all(
        "Employee Onboarding",
        filters={"job_applicant": applicant_name},
        fields=["boarding_status"],
    ):
        if (row.boarding_status or "").strip().lower() == "completed":
            return True
    return False


def _onboarding_in_progress(applicant_name):
    eo = frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": applicant_name, "docstatus": ("<", 2)},
        ["name", "boarding_status"],
        order_by="modified desc",
        as_dict=True,
    )
    if not eo:
        return False
    return (eo.boarding_status or "").strip().lower() != "completed"


# ---------------------------------------------------------------------------
# Misc helpers
# ---------------------------------------------------------------------------
def _resolve_candidate_application():
    """Return (job_applicant_name, job_opening_name) for the current candidate."""
    email = get_current_candidate()
    if not email:
        return None, None
    applicant_name = frappe.db.get_value("Candidate Portal User", email, "job_applicant")
    if not applicant_name:
        applicant_name = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
    if not applicant_name:
        return None, None
    opening_name = frappe.db.get_value("Job Applicant", applicant_name, "job_title")
    return applicant_name, opening_name


def _is_survey_enabled(opening):
    return (
        bool(cint(opening.get("custom_enable_recruitment_survey")))
        and bool(cint(opening.get("custom_recruitment_survey_mandatory_before_offer")))
    )


def _parse_form_schema(form_data):
    if not form_data:
        return None
    if isinstance(form_data, (dict, list)):
        return form_data
    try:
        return frappe.parse_json(form_data)
    except Exception:
        return form_data


def _serialize_response(response):
    if isinstance(response, str):
        return response
    return frappe.as_json(response)
