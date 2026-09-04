import frappe

EXTERNAL_RECRUITER_ROLE = "External Recruiter"
TPO_ROLE = "TPO"


def _external_recruiter_name(user):
    """The TA External Recruiter record linked to this Desk user, or None."""
    return frappe.db.get_value("TA External Recruiter", {"user": user}, "name")


def _assigned_openings_subquery(recruiter):
    """SQL subquery yielding Job Opening names this external recruiter is assigned
    to — directly, or via any TA External Recruiter Group they belong to — AND
    whose posting window is currently live (today within Display From…Display To;
    blank dates = open-ended). Reads from custom_posting_options (unified channel
    table) rows where post_to is 'External Recruiter' or 'External Recruiter Group'."""
    rec = frappe.db.escape(recruiter, percent=False)
    return f"""
        SELECT pc.parent
        FROM `tabJob Opening Posting Channel` AS pc
        WHERE pc.parenttype = 'Job Opening'
          AND pc.parentfield = 'custom_posting_options'
          AND pc.post_to IN ('External Recruiter', 'External Recruiter Group')
          AND (pc.display_from IS NULL OR pc.display_from <= CURDATE())
          AND (pc.display_to IS NULL OR pc.display_to >= CURDATE())
          AND (
                pc.external_recruiter = {rec}
                OR pc.external_recruiter_group IN (
                    SELECT gm.parent
                    FROM `tabTA External Recruiter Group Member` AS gm
                    WHERE gm.parenttype = 'TA External Recruiter Group'
                      AND gm.external_recruiter = {rec}
                )
          )
    """


def set_external_recruiter_posting_status(doc, method=None):
    """Job Opening `validate` hook: set each posting channel row's `status` to
    Active when today is within its Display From…Display To window (blank =
    open-ended), else Inactive. Applies to all rows in custom_posting_options."""
    from frappe.utils import getdate, today

    rows = doc.get("custom_posting_options") or []
    if not rows:
        return
    today_d = getdate(today())
    for r in rows:
        active = True
        if r.display_from and getdate(r.display_from) > today_d:
            active = False
        if r.display_to and getdate(r.display_to) < today_d:
            active = False
        r.status = "Active" if active else "Inactive"


def _is_opening_assigned(opening, recruiter):
    """True when `recruiter` (a TA External Recruiter name) is assigned to
    `opening` — directly or via a group — AND the row's posting window is live
    today (blank Display From/To = open-ended)."""
    from frappe.utils import getdate, today

    rows = frappe.get_all(
        "Job Opening Posting Channel",
        filters={
            "parent": opening, "parenttype": "Job Opening", "parentfield": "custom_posting_options",
            "post_to": ["in", ["External Recruiter", "External Recruiter Group"]],
        },
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
    via a group). Everyone else is unrestricted by this app (standard perms apply).

    A privileged role (System Manager / Recruiter Admin / HR User / Management)
    always wins: such a user sees every opening even when they *also* carry the
    External Recruiter role — otherwise an HR person who happens to also be set up
    as an external recruiter (and has no TA External Recruiter record) would be
    scoped down to nothing. Mirrors the exemption in ``ja_query``."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return "1 = 1"

    roles = set(frappe.get_roles(user))
    privileged = {"System Manager", "Recruiter Admin", "HR User", "Management"}
    if EXTERNAL_RECRUITER_ROLE in roles and not (privileged & roles):
        recruiter = _external_recruiter_name(user)
        if not recruiter:
            return "1 = 0"  # role but no recruiter record → see nothing
        return f"`tabJob Opening`.name IN ({_assigned_openings_subquery(recruiter)})"

    return "1 = 1"


def campus_invite_query(user):
    """A TPO sees only the Campus Invites that concern them: submitted (sent),
    not yet Completed, and where their Desk login email is one of the invite's TPO
    contacts. This scopes the Campus Invite list view AND the Campus Invite link on
    Candidate Registration (both go through get_list). Privileged roles (System
    Manager / HR Manager / HR User) are unrestricted.

    Note: a TPO is only ever granted read on Campus Invite (never create/write) —
    see recruitment.recruitment.tpo_access.ensure_tpo_readonly_permissions."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return "1 = 1"

    roles = set(frappe.get_roles(user))
    privileged = {"System Manager", "HR Manager", "HR User", "Recruiter Admin", "Management"}
    if TPO_ROLE in roles and not (privileged & roles):
        u = frappe.db.escape(user, percent=False)
        return f"""(
            `tabCampus Invite`.docstatus = 1
            AND (`tabCampus Invite`.status IS NULL OR `tabCampus Invite`.status != 'Completed')
            AND EXISTS (
                SELECT 1 FROM `tabInstitute TPO Contact` AS tc
                WHERE tc.parenttype = 'Campus Invite'
                  AND tc.parent = `tabCampus Invite`.name
                  AND LOWER(tc.email) = LOWER({u})
            )
        )"""

    return "1 = 1"


CANDIDATE_REGISTRATION_PRIVILEGED = {
    "System Manager",
    "HR Manager",
    "HR User",
    "Recruiter Admin",
    "Management",
}


def candidate_registration_query(user):
    """A TPO sees only the Candidate Registrations they created (owner = their login).

    TPOs log in from a Campus Invite email and register their candidates here, so
    one TPO must never see another's registrations. Privileged roles (System
    Manager / HR Manager / HR User / Recruiter Admin / Management) stay unrestricted,
    so nothing changes for HR. Only users carrying the TPO role *without* a
    privileged role are scoped down."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return "1 = 1"

    roles = set(frappe.get_roles(user))
    if TPO_ROLE in roles and not (CANDIDATE_REGISTRATION_PRIVILEGED & roles):
        return f"`tabCandidate Registration`.owner = {frappe.db.escape(user, percent=False)}"

    return "1 = 1"


def candidate_registration_has_permission(doc, ptype, user):
    """Document-level mirror of ``candidate_registration_query`` so a TPO cannot open
    another TPO's Candidate Registration via a direct link. Creating is always
    allowed (the new doc's owner is the TPO); other actions require ownership.
    Returns None (defer to standard perms) for Administrator and every non-TPO /
    privileged user, so no other role is affected."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return None

    roles = set(frappe.get_roles(user))
    if TPO_ROLE not in roles or (CANDIDATE_REGISTRATION_PRIVILEGED & roles):
        return None

    if ptype == "create":
        return True
    # owner is unset on a brand-new in-memory doc; treat that as the current user.
    return (doc.owner or user) == user


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


# ---------------------------------------------------------------------------
# Group Discussion — a panel sees their own GDs, and nothing else
# ---------------------------------------------------------------------------
# The whole point of the doctype: an interviewer conducting one group used to need
# the entire Campus Drive to mark it — every college, every role, every other panel's
# candidates, and write access to the schedule. Now they get one document per group
# they are on, and these two functions are what keep it to that.
#
# Both are needed, and they do different jobs:
#   * the query condition scopes the LIST (and any report / count / link search);
#   * has_permission scopes a SINGLE document, which the query never sees — without
#     it, an interviewer who guessed a name could open somebody else's GD by URL.
GROUP_DISCUSSION_FULL_ROLES = (
    "HR User",
    "HR Manager",
    "Recruiter Admin",
    "System Manager",
    "Management",
    "Hiring Lead",
)


def _runs_recruitment(user):
    return bool(set(frappe.get_roles(user)) & set(GROUP_DISCUSSION_FULL_ROLES))


def group_discussion_query(user):
    if not user:
        user = frappe.session.user
    if user == "Administrator" or _runs_recruitment(user):
        return "1=1"

    return f"""
        `tabGroup Discussion`.owner = {frappe.db.escape(user)}
        OR EXISTS (
            SELECT 1
            FROM `tabGroup Discussion Interviewer` AS gdi
            WHERE gdi.parent = `tabGroup Discussion`.name
              AND gdi.parenttype = 'Group Discussion'
              AND gdi.interviewer = {frappe.db.escape(user)}
        )
    """


def group_discussion_has_permission(doc, ptype, user=None):
    """None = defer to the standard checks (role perms, then the share the panel is
    given); False = this user is not on the panel and never sees it."""
    if not user:
        user = frappe.session.user
    if user == "Administrator" or _runs_recruitment(user):
        return None
    if (doc.get("owner") or "") == user:
        return None
    # Queried rather than read off doc.interviewers: a permission check must not pull
    # every child table of the document in to answer one question.
    return (
        None
        if frappe.db.exists(
            "Group Discussion Interviewer",
            {"parent": doc.name, "parenttype": "Group Discussion", "interviewer": user},
        )
        else False
    )
