import frappe
from frappe import _
from frappe.model.document import Document


class OnboardingBuddyAssignmentRule(Document):
    def validate(self):
        # An "All" rule sets Onboarding Buddy / Teammates / Manager from one document,
        # so at least one of the three must be provided (none of them is individually
        # mandatory, to allow any subset).
        if self.role_type == "All" and not (
            self.assigned_buddies or self.assigned_teammates or self.assigned_manager
        ):
            frappe.throw(
                _("For Role Type 'All', select at least one Onboarding Buddy, Teammate or Manager.")
            )


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


def resolve_onboarding_assignments(job_applicant):
    """Resolve onboarding assignments for a Job Applicant from active rules.

    Returns::

        {
            "Onboarding Buddy": [user, ...],   # from the winning rule's buddy table
            "Teammates":        [user, ...],   # from the winning rule's teammate table
            "Manager":          user | None,   # assigned_manager (Employee) -> its linked User
        }

    Matching: active rules filtered by Department / Designation / User Group (blank on the
    rule = match any), ordered by priority asc then most-recently-modified. The first
    matching rule that actually yields a value per role wins ("first match wins").

    Role Type "All" is a convenience rule that can fill all three roles from a single
    document (its own buddy table `assigned_buddies`, teammate table `assigned_teammates`
    and `assigned_manager`). It competes with the single-role rules purely on priority,
    per role — so a higher-priority single-role rule still wins that one role."""
    applicant = frappe.db.get_value(
        "Job Applicant",
        job_applicant,
        ["designation", "custom_department", "custom_employment_type"],
        as_dict=True,
    ) or {}

    rules = frappe.get_all(
        "Onboarding Buddy Assignment Rule",
        filters={"is_active": 1},
        fields=["name", "role_type", "assigned_manager", "priority",
                "department", "designation", "user_group"],
        order_by="priority asc, modified desc",
    )

    result = {"Onboarding Buddy": [], "Teammates": [], "Manager": None}
    done = set()  # roles already satisfied

    def fill_list(role, users):
        if role in done or not users:
            return
        result[role] = users
        done.add(role)

    def fill_manager(assigned_manager):
        if "Manager" in done or not assigned_manager:
            return
        user = frappe.db.get_value("Employee", assigned_manager, "user_id")
        if user:
            result["Manager"] = user
            done.add("Manager")

    for r in rules:
        if not _rule_matches(r, applicant):
            continue

        role = r.role_type
        if role == "Onboarding Buddy":
            fill_list("Onboarding Buddy", _users_from(r.name, "assigned_user"))
        elif role == "Teammates":
            fill_list("Teammates", _users_from(r.name, "assigned_user"))
        elif role == "Manager":
            fill_manager(r.assigned_manager)
        elif role == "All":
            # One document contributes to each of the three roles (only those not
            # already satisfied by an earlier, higher-priority rule).
            fill_list("Onboarding Buddy", _users_from(r.name, "assigned_buddies"))
            fill_list("Teammates", _users_from(r.name, "assigned_teammates"))
            fill_manager(r.assigned_manager)

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
