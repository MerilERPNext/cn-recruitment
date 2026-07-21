import frappe
from frappe import _
from frappe.model.document import Document


class OnboardingBuddyAssignmentRule(Document):
    def validate(self):
        # A rule now assigns ONLY the Onboarding Buddy, so at least one buddy is required.
        if not self.assigned_user:
            frappe.throw(_("Select at least one Onboarding Buddy under Assigned Users."))


def _rule_matches(rule, applicant):
    """True when a rule's blank-means-any filters match the applicant."""
    if rule.department and rule.department != applicant.get("custom_department"):
        return False
    if rule.designation and rule.designation != applicant.get("designation"):
        return False
    if rule.user_group and rule.user_group != applicant.get("custom_employment_type"):
        return False
    return True


def _users_from(rule_name, parentfield):
    """Ordered, non-blank Users from a rule's Table MultiSelect child (`parentfield`)."""
    users = frappe.get_all(
        "Onboarding Buddy User",
        filters={
            "parent": rule_name,
            "parenttype": "Onboarding Buddy Assignment Rule",
            "parentfield": parentfield,
        },
        pluck="user",
        order_by="idx asc",
    )
    return [u for u in users if u]


def _position_reporting_manager(applicant):
    """Reporting Manager (Employee) for the applicant's position.

    Each position lives as a row in the applicant's Job Opening
    (`job_title`) `custom_position_details` table, holding a `location` and a
    `reporting_manager`. We pick the row whose location matches the applicant's
    `custom_location`; failing that (or when a single row exists) we fall back to
    the first row. Returns the Employee name, or None."""
    job_opening = applicant.get("job_title")
    if not job_opening:
        return None

    rows = frappe.get_all(
        "Position Details",
        filters={
            "parent": job_opening,
            "parenttype": "Job Opening",
            "parentfield": "custom_position_details",
        },
        fields=["reporting_manager", "location"],
        order_by="idx asc",
    )
    rows = [r for r in rows if r.get("reporting_manager")]
    if not rows:
        return None

    location = applicant.get("custom_location")
    if location:
        for r in rows:
            if r.get("location") == location:
                return r["reporting_manager"]
    return rows[0]["reporting_manager"]


def _reports_to_users(manager_employee):
    """User ids of Active employees who report to `manager_employee` (the teammates)."""
    if not manager_employee:
        return []
    users = frappe.get_all(
        "Employee",
        filters={"reports_to": manager_employee, "status": "Active"},
        pluck="user_id",
        order_by="employee_name asc",
    )
    return [u for u in users if u]


def resolve_onboarding_assignments(job_applicant):
    """Resolve onboarding assignments for a Job Applicant.

    Returns::

        {
            "Onboarding Buddy": [user, ...],   # from the winning Buddy Assignment Rule
            "Teammates":        [user, ...],   # everyone reporting to the position's manager
            "Manager":          user | None,   # the position's Reporting Manager -> linked User
        }

    Sources (each role now has its own, independent source):

    * Onboarding Buddy — active Onboarding Buddy Assignment Rules, filtered by
      Department / Designation / User Group (blank on the rule = match any),
      ordered by priority asc then most-recently-modified. First matching rule
      that yields buddies wins.
    * Manager — the `reporting_manager` set on the applicant's position row in the
      Job Opening's `custom_position_details` table, resolved to its linked User.
    * Teammates — every Active Employee that reports to that same manager
      (`reports_to`), resolved to their linked Users."""
    applicant = frappe.db.get_value(
        "Job Applicant",
        job_applicant,
        ["name", "designation", "custom_department", "custom_employment_type",
         "job_title", "custom_location"],
        as_dict=True,
    ) or {}

    result = {"Onboarding Buddy": [], "Teammates": [], "Manager": None}

    # --- Onboarding Buddy: from active Onboarding Buddy Assignment Rules. ---
    rules = frappe.get_all(
        "Onboarding Buddy Assignment Rule",
        filters={"is_active": 1},
        fields=["name", "priority", "department", "designation", "user_group"],
        order_by="priority asc, modified desc",
    )
    for r in rules:
        if not _rule_matches(r, applicant):
            continue
        buddies = _users_from(r.name, "assigned_user")
        if buddies:
            result["Onboarding Buddy"] = buddies
            break  # first matching rule wins

    # --- Manager + Teammates: derived from the position's Reporting Manager. ---
    manager_employee = _position_reporting_manager(applicant)
    if manager_employee:
        manager_user = frappe.db.get_value("Employee", manager_employee, "user_id")
        if manager_user:
            result["Manager"] = manager_user
        result["Teammates"] = _reports_to_users(manager_employee)

    return result


def resolve_buddies(job_applicant):
    """Backward-compatible single-value view over resolve_onboarding_assignments().

    Legacy callers (pre-onboarding dialog / release) still expect one User per role via
    the keys 'Onboarding Buddy', 'Joining Buddy' (now == Teammates) and 'Manager'.
    Returns the first user of each resolved list (or None)."""
    a = resolve_onboarding_assignments(job_applicant)
    first = lambda lst: (lst[0] if lst else None)
    return {
        "Onboarding Buddy": first(a.get("Onboarding Buddy")),
        "Joining Buddy": first(a.get("Teammates")),
        "Manager": a.get("Manager"),
    }
