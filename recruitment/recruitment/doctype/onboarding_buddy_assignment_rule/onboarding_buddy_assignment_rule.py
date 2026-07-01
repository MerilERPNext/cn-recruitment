import frappe
from frappe.model.document import Document


class OnboardingBuddyAssignmentRule(Document):
    pass


def resolve_onboarding_assignments(job_applicant):
    """Resolve onboarding assignments for a Job Applicant from active rules.

    Returns::

        {
            "Onboarding Buddy": [user, ...],   # from the winning rule's Assigned Users table
            "Teammates":        [user, ...],   # from the winning rule's Assigned Users table
            "Manager":          user | None,   # assigned_manager (Employee) -> its linked User
        }

    Matching: active rules filtered by Department / Designation / User Group (blank on the
    rule = match any), ordered by priority asc then most-recently-modified. The first
    matching rule that actually yields a value per role wins ("first match wins")."""
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

    for r in rules:
        role = r.role_type
        if role not in result or role in done:
            continue
        if r.department and r.department != applicant.get("custom_department"):
            continue
        if r.designation and r.designation != applicant.get("designation"):
            continue
        if r.user_group and r.user_group != applicant.get("custom_employment_type"):
            continue

        if role == "Manager":
            user = None
            if r.assigned_manager:
                user = frappe.db.get_value("Employee", r.assigned_manager, "user_id")
            if user:
                result["Manager"] = user
                done.add(role)
            continue

        # Onboarding Buddy / Teammates -> collect all users from the rule's child table.
        users = frappe.get_all(
            "Onboarding Buddy User",
            filters={
                "parent": r.name,
                "parenttype": "Onboarding Buddy Assignment Rule",
                "parentfield": "assigned_user",
            },
            pluck="user",
            order_by="idx asc",
        )
        users = [u for u in users if u]
        if users:
            result[role] = users
            done.add(role)

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
