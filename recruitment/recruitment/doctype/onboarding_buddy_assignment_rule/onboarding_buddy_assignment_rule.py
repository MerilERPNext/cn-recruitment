import frappe
from frappe.model.document import Document


class OnboardingBuddyAssignmentRule(Document):
    pass


def resolve_buddies(job_applicant):
    """Return {Onboarding Buddy: user, Joining Buddy: user, Manager: user} by matching
    active rules against the applicant's department/designation/employment_type. Lower
    priority wins; ties broken by most-recently-modified rule. Missing role types map
    to None."""
    applicant = frappe.db.get_value(
        "Job Applicant",
        job_applicant,
        ["designation", "custom_department", "custom_employment_type"],
        as_dict=True,
    ) or {}

    rules = frappe.get_all(
        "Onboarding Buddy Assignment Rule",
        filters={"is_active": 1},
        fields=["name", "role_type", "assigned_user", "priority",
                "department", "designation", "user_group"],
        order_by="priority asc, modified desc",
    )

    result = {"Onboarding Buddy": None, "Joining Buddy": None, "Manager": None}
    for r in rules:
        role = r.role_type
        if role not in result or result[role]:
            continue
        if r.department and r.department != applicant.get("custom_department"):
            continue
        if r.designation and r.designation != applicant.get("designation"):
            continue
        if r.user_group and r.user_group != applicant.get("custom_employment_type"):
            continue
        result[role] = r.assigned_user

    return result
