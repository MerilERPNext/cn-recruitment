import frappe

EXTERNAL_RECRUITER_ROLE = "External Recruiter"


def _external_recruiter_name(user):
    """The TA External Recruiter record linked to this Desk user, or None."""
    return frappe.db.get_value("TA External Recruiter", {"user": user}, "name")


def _assigned_openings_subquery(recruiter):
    """SQL subquery yielding Job Opening names this external recruiter is assigned
    to — directly, or via any TA External Recruiter Group they belong to — AND
    whose posting window is currently live (today within Display From…Display To;
    blank dates = open-ended). Matches the `custom_external_recruiters` child rows
    on Job Opening."""
    rec = frappe.db.escape(recruiter, percent=False)
    return f"""
        SELECT er.parent
        FROM `tabJob Opening External Recruiter` AS er
        WHERE er.parenttype = 'Job Opening'
          AND er.parentfield = 'custom_external_recruiters'
          AND (er.display_from IS NULL OR er.display_from <= CURDATE())
          AND (er.display_to IS NULL OR er.display_to >= CURDATE())
          AND (
                er.external_recruiter = {rec}
                OR er.external_recruiter_group IN (
                    SELECT gm.parent
                    FROM `tabTA External Recruiter Group Member` AS gm
                    WHERE gm.parenttype = 'TA External Recruiter Group'
                      AND gm.external_recruiter = {rec}
                )
          )
    """


def set_external_recruiter_posting_status(doc, method=None):
    """Job Opening `validate` hook: set each External Recruiter row's read-only
    `job_posting_status` to Active when today is within its Display From…Display To
    window (blank = open-ended), else Inactive — so the grid reflects live
    availability (which the permission scoping also enforces)."""
    from frappe.utils import getdate, today

    rows = doc.get("custom_external_recruiters") or []
    if not rows:
        return
    today_d = getdate(today())
    for r in rows:
        active = True
        if r.display_from and getdate(r.display_from) > today_d:
            active = False
        if r.display_to and getdate(r.display_to) < today_d:
            active = False
        r.job_posting_status = "Active" if active else "Inactive"


def _is_opening_assigned(opening, recruiter):
    """True when `recruiter` (a TA External Recruiter name) is assigned to
    `opening` — directly or via a group — AND the row's posting window is live
    today (blank Display From/To = open-ended)."""
    from frappe.utils import getdate, today

    rows = frappe.get_all(
        "Job Opening External Recruiter",
        filters={"parent": opening, "parenttype": "Job Opening", "parentfield": "custom_external_recruiters"},
        fields=["external_recruiter", "external_recruiter_group", "display_from", "display_to"],
    )
    if not rows:
        return False
    groups = set(
        frappe.get_all(
            "TA External Recruiter Group Member",
            filters={"external_recruiter": recruiter, "parenttype": "TA External Recruiter Group"},
            pluck="parent",
        )
    )
    today_d = getdate(today())
    for r in rows:
        matches = r.external_recruiter == recruiter or (
            r.external_recruiter_group and r.external_recruiter_group in groups
        )
        if not matches:
            continue
        if r.display_from and getdate(r.display_from) > today_d:
            continue
        if r.display_to and getdate(r.display_to) < today_d:
            continue
        return True
    return False


def job_opening_has_permission(doc, ptype, user):
    """External recruiters get READ-ONLY access to assigned openings only.
    Returns None (defer to standard perms) for everyone else."""
    if not user:
        user = frappe.session.user
    if user == "Administrator" or EXTERNAL_RECRUITER_ROLE not in frappe.get_roles(user):
        return None
    if ptype not in ("read", "print", "email", "export"):
        return False  # no write/delete on openings
    recruiter = _external_recruiter_name(user)
    return bool(recruiter) and _is_opening_assigned(doc.name, recruiter)


def job_applicant_has_permission(doc, ptype, user):
    """External recruiters may read/create/write applicants only under their
    assigned openings. Privileged roles and non-recruiters defer to defaults."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return None
    roles = frappe.get_roles(user)
    if EXTERNAL_RECRUITER_ROLE not in roles:
        return None
    if {"System Manager", "Recruiter Admin", "HR User", "Management"} & set(roles):
        return None
    recruiter = _external_recruiter_name(user)
    if not recruiter:
        return False
    opening = doc.get("job_title")
    if not opening:
        # New applicant not yet tied to an opening — allow create; deny otherwise.
        return ptype == "create"
    return _is_opening_assigned(opening, recruiter)


def job_opening_query(user):
    """External recruiters see only the Job Openings assigned to them (directly or
    via a group). Everyone else is unrestricted by this app (standard perms apply)."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return "1 = 1"

    roles = frappe.get_roles(user)
    if EXTERNAL_RECRUITER_ROLE in roles:
        recruiter = _external_recruiter_name(user)
        if not recruiter:
            return "1 = 0"  # role but no recruiter record → see nothing
        return f"`tabJob Opening`.name IN ({_assigned_openings_subquery(recruiter)})"

    return "1 = 1"


def ja_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)
    if user != "Administrator":
        # External recruiters: only applicants under their assigned openings.
        if EXTERNAL_RECRUITER_ROLE in roles and not (
            {"System Manager", "Recruiter Admin", "HR User", "Management"} & set(roles)
        ):
            recruiter = _external_recruiter_name(user)
            if not recruiter:
                return "1 = 0"
            return f"`tabJob Applicant`.job_title IN ({_assigned_openings_subquery(recruiter)})"
        if "System Manager" in roles or "Recruiter Admin" in roles or "HR User" in roles or "Management" in roles:
            return "1 = 1"
        elif "Job Recruiter" in roles:
            return f"""
                (
                    `tabJob Applicant`.owner = {frappe.db.escape(user, percent=False)}
                    OR EXISTS (
                        SELECT 1 FROM `tabJob Opening` AS job_opening
                        WHERE job_opening.name = `tabJob Applicant`.job_title
                        AND job_opening.owner = {frappe.db.escape(user, percent=False)}
                    )
                )
            """

        elif "Hiring Manager" in roles:
            employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
            if employee:
                return f"""
                    `tabJob Applicant`.job_title IN (
                        SELECT job_opening.name
                        FROM `tabJob Opening` AS job_opening
                        WHERE job_opening.job_requisition IN (
                            SELECT req.name FROM `tabJob Requisition` AS req
                            WHERE req.requested_by = {frappe.db.escape(employee, percent=False)}
                            OR req.owner = {frappe.db.escape(user, percent=False)}
                        )
                    )
                """
    return "1 = 1"



def interview_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)

    if user == "Administrator" or any(role in roles for role in ["HR User", "Recruiter Admin", "System Manager","Management"]):
        return "1=1"

    return f"""
        `tabInterview`.owner = {frappe.db.escape(user)}
        OR EXISTS (
            SELECT 1
            FROM `tabInterview Detail` AS id
            WHERE id.parent = `tabInterview`.name
              AND id.parenttype = 'Interview'
              AND id.interviewer = {frappe.db.escape(user)}
        )
    """
