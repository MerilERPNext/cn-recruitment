"""Post-install / post-migrate hooks for the Recruitment app.

Called by Frappe after every `bench migrate` (after_migrate) and after the
initial app install (after_install).  Safe to run multiple times — all
functions are idempotent.
"""
import frappe


def after_install():
    repair_broken_fetch_from()
    ensure_default_requisition_scope()


def ensure_default_requisition_scope():
    """Seed the built-in "Default - System Managers" Raise Requisition Scope.

    Install-time only — the steady-state path is the one-time patch
    `recruitment.patches.create_default_requisition_scope`, and the record is
    protected from deletion, so it is deliberately NOT re-asserted on every
    migrate.

    This exists because `frappe.installer.install_app` defaults to
    `set_as_patched=True`: a fresh install writes a Patch Log row for every patch
    without running it, so the patch alone would never fire on a new site and no
    one but Administrator could raise a requisition.
    """
    from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
        ensure_default_scope,
    )

    try:
        ensure_default_scope()
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_default_requisition_scope: skipped", exc_info=True
        )


def after_migrate():
    repair_broken_fetch_from()
    ensure_performance_indexes()
    ensure_job_offer_salary_period()
    ensure_tpo_access()
    ensure_custom_html_blocks()
    ensure_offer_compensation()
    ensure_alumni_employee_field()
    ensure_alumni_employee_employee_field()
    ensure_alumni_user_link_field()
    ensure_alumni_todo_type_field()
    ensure_ess_todo_type_field()
    ensure_alumni_todo_form_field()
    backfill_alumni_flag()
    backfill_employee_alumni_mirror()
    ensure_alumni_employee_request_workflow()
    ensure_alumni_hd_category_field()
    ensure_notice_portal_fields()
    ensure_education_presentation()
    ensure_tpo_email_templates()
    ensure_hr_ops_email_template()
    ensure_campus_panel_email_template()
    ensure_hired_status()
    ensure_webapp_login_redirect_field()


#: What the switch does, kept in one place so the field description and a later
#: migrate that refreshes it cannot drift apart.
WEBAPP_REDIRECT_DESCRIPTION = (
    "Send users with the Employee role to /webapp when they sign in, instead of "
    "the Desk. Administrator, Website Users and anyone without the role are "
    "unaffected."
)


def ensure_webapp_login_redirect_field():
    """Add `Website Settings.custom_redirect_to_webapp_after_login` — the switch
    behind `recruitment.recruitment.login_redirect`.

    Sits in the Landing Page section right after the stock `home_page` field,
    which answers the same question for Website Users.

    The value is written once, here, at the moment the field is created. A
    Custom Field `default` only applies to documents inserted afterwards, and
    Website Settings is a Single that already exists on every site, so without
    this the switch would read NULL — off — and the redirect would never fire.
    A later migrate only refreshes the description (which changes when the rule
    behind the switch changes) and leaves the value alone, so an admin who
    unticks it stays unticked.
    """
    if frappe.get_meta("Website Settings").get_field(
        "custom_redirect_to_webapp_after_login"
    ):
        _refresh_webapp_login_redirect_description()
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Website Settings",
            {
                "fieldname": "custom_redirect_to_webapp_after_login",
                "label": "Redirect employees to Employee Self Service after login",
                "fieldtype": "Check",
                "default": "1",
                "insert_after": "home_page",
                "description": WEBAPP_REDIRECT_DESCRIPTION,
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.db.set_single_value(
            "Website Settings", "custom_redirect_to_webapp_after_login", 1
        )
        frappe.clear_cache(doctype="Website Settings")
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_webapp_login_redirect_field: skipped", exc_info=True
        )


def _refresh_webapp_login_redirect_description():
    """Bring an already-created switch's help text back in step.

    Only the description — the ticked/unticked value is the admin's, and the
    label is left alone in case it has been translated or renamed on a site.
    """
    name = frappe.db.get_value(
        "Custom Field",
        {
            "dt": "Website Settings",
            "fieldname": "custom_redirect_to_webapp_after_login",
        },
    )
    if not name:
        # Declared in a fixture or the doctype itself rather than as a Custom
        # Field — not ours to rewrite.
        return

    try:
        if (
            frappe.db.get_value("Custom Field", name, "description")
            == WEBAPP_REDIRECT_DESCRIPTION
        ):
            return

        frappe.db.set_value(
            "Custom Field", name, "description", WEBAPP_REDIRECT_DESCRIPTION
        )
        frappe.clear_cache(doctype="Website Settings")
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_webapp_login_redirect_field: description not refreshed",
            exc_info=True,
        )


def ensure_alumni_todo_form_field():
    """Add `Todo Type.custom_alumni_form` — the form the portal renders.

    There is no link from a ToDo (or Todo Type) to a Microapp Form Widget: the
    ChatNext form is resolved at runtime from the Funnel node, which the Alumni
    Portal cannot reach. This gives the portal a form it can render directly,
    configured per Todo Type alongside the visibility flag.

    Owned by this app as a Custom Field, so cn_todo_manager is untouched.
    Idempotent.
    """
    if frappe.get_meta("Todo Type").get_field("custom_alumni_form"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Todo Type",
            {
                "fieldname": "custom_alumni_form",
                "label": "Alumni Portal Form",
                "fieldtype": "Link",
                "options": "Microapp Form Widget",
                "insert_after": "custom_show_in_alumni_portal",
                "depends_on": "eval:doc.custom_show_in_alumni_portal",
                "description": (
                    "Form shown with todos of this type in the Alumni Portal. "
                    "Leave empty for no form."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="Todo Type")
    except Exception:
        frappe.logger("recruitment").warning("ensure_alumni_todo_form_field: skipped")


def ensure_alumni_todo_type_field():
    """Add `Todo Type.custom_show_in_alumni_portal` — the Alumni Portal gate.

    A Custom Field owned by this app rather than an edit to cn_todo_manager's
    doctype JSON, so the Todo Manager app stays untouched and a `bench update`
    cannot overwrite it.

    Opt-IN by design: a Todo Type is invisible to the Alumni Portal until
    someone ticks this. New types added by other teams therefore cannot leak
    into the portal by default. Idempotent.
    """
    if frappe.get_meta("Todo Type").get_field("custom_show_in_alumni_portal"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Todo Type",
            {
                "fieldname": "custom_show_in_alumni_portal",
                "label": "Show in Alumni Portal",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "is_active",
                "description": (
                    "When ticked, todos of this type are visible in the Alumni "
                    "Portal. Leave unticked to keep them out of it."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="Todo Type")
    except Exception:
        frappe.logger("recruitment").warning("ensure_alumni_todo_type_field: skipped")


def ensure_ess_todo_type_field():
    """Add `Todo Type.custom_show_in_ess_portal` — the ESS Portal gate.

    Sibling of `custom_show_in_alumni_portal` (same Custom Field ownership
    rationale: the field belongs to this app, not to cn_todo_manager, so it
    survives a `bench update` there). Together the two flags
    follow the same visibility matrix already shipped for
    `Notice.show_in_ess_portal` / `Notice.show_in_alumni_portal` -- see
    `recruitment.recruitment.notice_visibility.visible_in_portal`. The
    Todo Type side of that matrix is enforced by cn_todo_manager itself
    (`todo_api.ess_hidden_todo_types`), which reads these fields:

        ESS on  / Alumni off -> ESS only
        ESS off / Alumni on  -> Alumni only
        ESS on  / Alumni on  -> both
        ESS off / Alumni off -> ESS only (legacy default -- unchanged)

    Idempotent -- and the one-time backfill below is tied to the same
    "field doesn't exist yet" guard so it runs exactly once, at the moment
    the field is created, never again. That matters here specifically:
    ESS previously had NO Todo-Type gating at all, so any Todo Type already
    carrying `custom_show_in_alumni_portal = 1` before this field existed
    (e.g. "Helpdesk", which had 56 open ToDos in ESS at the time this was
    written) was already visible in both portals. Without this backfill,
    those rows would default to `custom_show_in_ess_portal = 0` the instant
    this field is created and silently vanish from ESS for everyone --
    existing behaviour must not change for a Todo Type nobody has touched.
    Running it only at creation time (not on every migrate) is what lets an
    admin later deliberately set up a genuinely ESS-excluded, Alumni-only
    Todo Type without this backfill re-forcing it back on.
    """
    if frappe.get_meta("Todo Type").get_field("custom_show_in_ess_portal"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Todo Type",
            {
                "fieldname": "custom_show_in_ess_portal",
                "label": "Show in ESS Portal",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_show_in_alumni_portal",
                "description": (
                    "Show todos of this type in the ESS Portal. If both portal "
                    "checkboxes are unticked, todos of this type stay visible in "
                    "the ESS Portal (legacy default)."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.db.sql(
            """
            UPDATE `tabTodo Type`
            SET custom_show_in_ess_portal = 1
            WHERE custom_show_in_alumni_portal = 1
            """
        )
        frappe.db.commit()
        frappe.clear_cache(doctype="Todo Type")
    except Exception:
        frappe.logger("recruitment").warning("ensure_ess_todo_type_field: skipped")


def ensure_tpo_email_templates():
    """Ship the TPO welcome / campus invite Email Templates.

    Created once so the two mailers work out of the box; never rewritten, so the
    wording belongs to whoever edits it afterwards. See
    recruitment.recruitment.tpo_mailers.
    """
    from recruitment.recruitment.tpo_mailers import ensure_default_email_templates

    try:
        ensure_default_email_templates()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "TPO email templates: setup failed")


def ensure_hr_ops_email_template():
    """Ship the "HR Ops Offer Verification" Email Template.

    Created once so 'Notify HR Ops' works the moment the setting is ticked; never
    rewritten afterwards. See recruitment.recruitment.hr_ops_offer_review.
    """
    from recruitment.recruitment.hr_ops_offer_review import ensure_default_email_template

    try:
        ensure_default_email_template()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "HR Ops email template: setup failed")


def ensure_campus_panel_email_template():
    """Ship the "Campus Interview Panel Assignment" Email Template.

    Created once so the panel mail works the moment Campus Settings turns it on;
    never rewritten. See recruitment.recruitment.campus_panel_mailers.
    """
    from recruitment.recruitment.campus_panel_mailers import ensure_default_email_template

    try:
        ensure_default_email_template()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Campus panel email template: setup failed")


def ensure_education_presentation():
    """Education grid columns + the Education Stage label.

    Runs here rather than in a patch because other installed apps customise
    Employee Education too, and their customisation sync would otherwise undo it
    on the next migrate — see recruitment.recruitment.education_presentation.
    """
    from recruitment.recruitment.education_presentation import apply_education_presentation

    apply_education_presentation()


def ensure_notice_portal_fields():
    """Add the `Notice.show_in_ess_portal` / `Notice.show_in_alumni_portal`
    checkboxes that gate portal-specific notice visibility.

    Both default to unchecked; when both are unchecked the notice shows only in the
    ESS Portal (legacy default). Read by
    recruitment.recruitment.notice_visibility. Idempotent; skips when the Notice
    doctype isn't installed (nextai absent)."""
    if not frappe.db.exists("DocType", "Notice"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        meta = frappe.get_meta("Notice")
        created = False
        if not meta.get_field("show_in_ess_portal"):
            create_custom_field(
                "Notice",
                {
                    "fieldname": "show_in_ess_portal",
                    "label": "Show in ESS Portal",
                    "fieldtype": "Check",
                    "default": "0",
                    "insert_after": "is_global",
                    "description": (
                        "Show this notice in the ESS Portal. If both portal "
                        "checkboxes are unchecked, the notice defaults to ESS only."
                    ),
                    "module": "Recruitment",
                },
                ignore_validate=True,
            )
            created = True
        if not meta.get_field("show_in_alumni_portal"):
            create_custom_field(
                "Notice",
                {
                    "fieldname": "show_in_alumni_portal",
                    "label": "Show in Alumni Portal",
                    "fieldtype": "Check",
                    "default": "0",
                    "insert_after": "show_in_ess_portal",
                    "description": "Show this notice in the Alumni Portal.",
                    "module": "Recruitment",
                },
                ignore_validate=True,
            )
            created = True
        if created:
            frappe.clear_cache(doctype="Notice")
    except Exception:
        frappe.logger("recruitment").warning("ensure_notice_portal_fields: skipped")


def ensure_alumni_hd_category_field():
    """Add the `HD Category.custom_show_in_alumni_portal` checkbox.

    HR ticks it to expose a helpdesk category (and its tickets) in the Alumni
    Portal; unticked categories/tickets are hidden there. Read by
    recruitment.recruitment.alumni_portal / alumni_helpdesk. Idempotent; skips
    when HD Category isn't installed (pw_helpdesk absent)."""
    if not frappe.db.exists("DocType", "HD Category"):
        return
    if frappe.get_meta("HD Category").get_field("custom_show_in_alumni_portal"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "HD Category",
            {
                "fieldname": "custom_show_in_alumni_portal",
                "label": "Show in Alumni Portal",
                "fieldtype": "Check",
                "insert_after": "is_active",
                "description": (
                    "If checked, this category and its tickets appear in the "
                    "Alumni Portal. Unchecked categories are hidden there."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="HD Category")
    except Exception:
        frappe.logger("recruitment").warning("ensure_alumni_hd_category_field: skipped")


def ensure_alumni_user_link_field():
    """Add the read-only `Employee.custom_alumni_user` Link field.

    Stores the personal-email User provisioned when the Employee leaves, so the
    Alumni Portal can resolve Employee <-> alumni User without guessing from
    `personal_email` (which may change, or be shared between records).
    Maintained by recruitment.recruitment.alumni_user_switch. Idempotent.
    """
    if frappe.get_meta("Employee").get_field("custom_alumni_user"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Employee",
            {
                "fieldname": "custom_alumni_user",
                "label": "Alumni User",
                "fieldtype": "Link",
                "options": "User",
                "read_only": 1,
                "insert_after": "custom_is_alumni_employee",
                "description": (
                    "Personal-email User account used for the Alumni Portal. "
                    "Created automatically when the employee leaves."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="Employee")
    except Exception:
        frappe.logger("recruitment").warning("ensure_alumni_user_link_field: skipped")


def ensure_alumni_employee_field():
    """Add the `User.custom_is_alumni_employee` checkbox that gates Alumni Portal
    access. Kept in sync with Employee.status == 'Left' by
    recruitment.recruitment.alumni_portal.sync_alumni_flag. Idempotent."""
    if frappe.get_meta("User").get_field("custom_is_alumni_employee"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "User",
            {
                "fieldname": "custom_is_alumni_employee",
                "label": "Is Alumni Employee",
                "fieldtype": "Check",
                "insert_after": "enabled",
                "description": (
                    "Set automatically when the linked Employee's status is 'Left'. "
                    "Grants access to the Alumni Portal."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="User")
    except Exception:
        frappe.logger("recruitment").warning("ensure_alumni_employee_field: skipped")


def ensure_alumni_employee_employee_field():
    """Add an EDITABLE `Employee.custom_is_alumni_employee` checkbox.

    This is the control HR uses to grant/revoke Alumni Portal access from the
    Employee form. It is a normal stored Check field; its value is written through
    to the linked User's `custom_is_alumni_employee` flag (the flag that actually
    gates portal login) by recruitment.recruitment.alumni_portal.sync_alumni_flag.
    New exits (status == 'Left') default to granted, but a later manual untick is
    never overridden.

    Idempotent, and self-heals the earlier VIRTUAL read-only definition (which
    mirrored the User flag and could not be edited) into this editable stored one.
    Converting virtual -> stored adds the DB column on migrate; existing values
    are seeded from the User flag by `backfill_employee_alumni_mirror`.

    The `depends_on` show/hide rule is deliberately NOT part of that self-heal:
    it is set once, when the field is first created, and never rewritten on a
    later migrate -- so an admin can change (or clear) it in Customize Form and
    the change sticks.
    """
    from frappe.utils import cint

    # Only ever meaningful for someone who has actually left -- an Active
    # employee can't be alumni -- so the field starts out hidden on the form
    # until status says otherwise. Creation-time default only (see docstring):
    # not in `desired` below, so a later migrate leaves whatever an admin set.
    depends_on = 'eval:doc.status != "Active"'

    # Editable + stored: undo the old virtual / read-only / getter definition,
    # and keep it as an Employee-list column so HR can see it at a glance
    # without opening each record. These ARE re-asserted on every migrate.
    desired = {
        "is_virtual": 0,
        "read_only": 0,
        "options": "",
        "no_copy": 1,
        "in_list_view": 1,
    }
    try:
        existing = frappe.get_meta("Employee").get_field("custom_is_alumni_employee")
        if existing:
            cf_name = frappe.db.get_value(
                "Custom Field",
                {"dt": "Employee", "fieldname": "custom_is_alumni_employee"},
            )
            if cf_name:
                cf = frappe.get_doc("Custom Field", cf_name)
                if (
                    cint(cf.is_virtual)
                    or cint(cf.read_only)
                    or (cf.options or "")
                    or not cint(cf.in_list_view)
                ):
                    cf.update(desired)
                    cf.save(ignore_permissions=True)
                    frappe.clear_cache(doctype="Employee")
            return

        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Employee",
            {
                "fieldname": "custom_is_alumni_employee",
                "label": "Is Alumni Employee",
                "fieldtype": "Check",
                "insert_after": "user_id",
                "no_copy": 1,
                "depends_on": depends_on,
                "in_list_view": 1,
                "description": (
                    "Grants access to the Alumni Portal. Editable — checking or "
                    "unchecking here grants or revokes portal access for the linked "
                    "User. New exits (status = 'Left') default to granted. Only "
                    "shown once the employee is no longer Active."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="Employee")
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_alumni_employee_employee_field: skipped", exc_info=True
        )


def backfill_employee_alumni_mirror():
    """Seed the (now editable, stored) `Employee.custom_is_alumni_employee` column
    from the authoritative `User.custom_is_alumni_employee` flag, so existing
    alumni show as checked on the Employee form after the virtual -> stored switch.
    Idempotent; skips until the column exists (added when the field turns stored)."""
    if not frappe.db.has_column("Employee", "custom_is_alumni_employee"):
        return
    try:
        frappe.db.sql(
            """
            UPDATE `tabEmployee` e
            JOIN `tabUser` u ON u.name = e.user_id
            SET e.custom_is_alumni_employee = COALESCE(u.custom_is_alumni_employee, 0)
            WHERE COALESCE(e.custom_is_alumni_employee, 0)
                  <> COALESCE(u.custom_is_alumni_employee, 0)
            """
        )
        frappe.db.commit()
    except Exception:
        frappe.logger("recruitment").warning("backfill_employee_alumni_mirror: skipped")


def backfill_alumni_flag():
    """One-time (idempotent) backfill: flag Users of already-'Left' employees as
    alumni, so existing former employees can use the Alumni Portal."""
    if not frappe.get_meta("User").get_field("custom_is_alumni_employee"):
        return
    try:
        frappe.db.sql(
            """
            UPDATE `tabUser` u
            JOIN `tabEmployee` e ON e.user_id = u.name
            SET u.custom_is_alumni_employee = 1
            WHERE e.status = 'Left'
              AND (u.custom_is_alumni_employee IS NULL OR u.custom_is_alumni_employee = 0)
            """
        )
        frappe.db.commit()
    except Exception:
        frappe.logger("recruitment").warning("backfill_alumni_flag: skipped")


def ensure_alumni_employee_request_workflow():
    """Idempotently create the Alumni Employee Request approval Workflow (states,
    action masters and the Workflow itself). Business logic lives in the service
    module; this is the migrate entry point. Never breaks a migrate."""
    try:
        from recruitment.recruitment.alumni_employee_request_service import (
            ensure_alumni_employee_request_workflow as _ensure,
        )

        _ensure()
    except Exception:
        frappe.logger("recruitment").warning(
            "ensure_alumni_employee_request_workflow: skipped"
        )


def ensure_custom_html_blocks():
    """Push every app-managed Custom HTML Block (html/css/js kept as source files
    under recruitment/recruitment/custom_blocks) into its DB record. Idempotent —
    it only writes when the files actually changed."""
    try:
        from recruitment.recruitment.custom_blocks import sync_custom_html_blocks

        sync_custom_html_blocks()
    except Exception:
        frappe.logger("recruitment").warning("ensure_custom_html_blocks: skipped")


def ensure_offer_compensation():
    """Set up the dynamic Offer Compensation + Clauses feature: custom fields on
    Employee Grade / Job Offer, standard Salary Components, settings defaults,
    grade rules, clause templates and the sample Location Allowance. Idempotent."""
    try:
        from recruitment.recruitment.offer_compensation import setup_offer_compensation

        setup_offer_compensation()
    except Exception:
        frappe.logger("recruitment").warning("ensure_offer_compensation: skipped")


def ensure_tpo_access():
    """Keep the TPO role's permissions in sync on every migrate: create/read/write
    on Candidate Registration, and READ-ONLY (never create) on Campus Invite."""
    try:
        from recruitment.recruitment.tpo_access import (
            ensure_tpo_role,
            ensure_tpo_permissions,
            ensure_tpo_readonly_permissions,
        )

        ensure_tpo_role()
        ensure_tpo_permissions()
        ensure_tpo_readonly_permissions()
    except Exception:
        frappe.logger("recruitment").warning("ensure_tpo_access: skipped")

    # Backfill the new Campus Invite.status so pre-existing invites (status NULL)
    # aren't wrongly hidden by the "status != Completed" list/link filters.
    try:
        if frappe.get_meta("Campus Invite").get_field("status"):
            frappe.db.sql(
                """UPDATE `tabCampus Invite`
                   SET status = CASE WHEN docstatus = 1 THEN 'Invited' ELSE 'Draft' END
                   WHERE status IS NULL OR status = ''"""
            )
    except Exception:
        frappe.logger("recruitment").warning("ensure_tpo_access: campus invite status backfill skipped")


def ensure_job_offer_salary_period():
    """Add the 'Salary Component Period' selector (Monthly/Annual) on Job Offer.

    Drives whether percentage-based salary components compute on a monthly or
    annual basis (see recruitment.customizations.job_offer). Idempotent —
    created once, defaults to Annual; offers already saved keep their value."""
    if frappe.get_meta("Job Offer").get_field("custom_salary_period"):
        return
    try:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field

        create_custom_field(
            "Job Offer",
            {
                "fieldname": "custom_salary_period",
                "label": "Salary Component Period",
                "fieldtype": "Select",
                "options": "Monthly\nAnnual",
                "default": "Annual",
                "insert_after": "custom_base_salary",
                "description": (
                    "Compute percentage components on a Monthly or Annual basis. "
                    "Monthly: Basic = Base, CTC = annual CTC ÷ 12. "
                    "Annual: Basic = Base × 12, CTC = annual CTC."
                ),
                "module": "Recruitment",
            },
            ignore_validate=True,
        )
        frappe.clear_cache(doctype="Job Offer")
    except Exception:
        frappe.logger("recruitment").warning("ensure_job_offer_salary_period: skipped")


# Hot link/filter columns that the permission-query conditions, list views,
# reports and dedup lookups filter/join on, but which ship without an index.
# Adding these is the single biggest list-load latency win (see perf audit).
# (doctype, column) — only added when the column exists and isn't already indexed.
_PERF_INDEX_TARGETS = [
    ("Job Opening", "job_requisition"),
    ("Job Applicant", "job_title"),
    ("Job Applicant", "phone_number"),
    ("Job Applicant", "email_id"),
    ("Job Requisition", "requested_by"),
    ("Job Requisition", "custom_assign_to_recruiter"),
    ("Interview", "job_applicant"),
    ("Interview", "job_opening"),
    ("Interview Detail", "interviewer"),
    ("Job Opening Posting Channel", "external_recruiter"),
    ("Job Opening Posting Channel", "external_recruiter_group"),
    ("TA External Recruiter Group Member", "external_recruiter"),
    # Scanned on every Candidate Registration save by the duplicate check, and by
    # the TPO drive cards.
    ("Candidate Registration", "campus_invite"),
    # The hiring-workflow engine filters Job Applicant by these on every campus
    # round card, offer/pre-offer candidate list, stage-pipeline report and SLA
    # sweep — all currently full scans.
    ("Job Applicant", "custom_current_stage"),
    ("Job Applicant", "custom_campus_invite"),
]


def _column_is_indexed(doctype, column):
    """True if `column` already participates in any index on the table."""
    table = f"tab{doctype}"
    try:
        rows = frappe.db.sql(f"SHOW INDEX FROM `{table}`", as_dict=True)
    except Exception:
        # Can't inspect (table missing, etc.) → treat as indexed so we don't
        # attempt a risky ALTER.
        return True
    return any((r.get("Column_name") == column) for r in rows)


def ensure_performance_indexes():
    """Idempotently add single-column indexes on the hot columns above.

    Safe + self-healing: skips columns that don't exist or are already indexed,
    and never lets an index failure break the migrate. Index DDL only affects
    query speed, not behaviour. NOTE: on very large existing tables the first
    `ADD INDEX` briefly locks the table — expected for a migrate.
    """
    added = []
    for doctype, column in _PERF_INDEX_TARGETS:
        try:
            if not frappe.db.has_column(doctype, column):
                continue
            if _column_is_indexed(doctype, column):
                continue
            frappe.db.add_index(doctype, [column])
            added.append(f"{doctype}.{column}")
        except Exception:
            frappe.logger("recruitment").warning(
                f"ensure_performance_indexes: skipped {doctype}.{column}"
            )
            continue

    if added:
        frappe.logger("recruitment").info(
            "ensure_performance_indexes added {0} index(es): {1}".format(
                len(added), ", ".join(added)
            )
        )


def repair_broken_fetch_from():
    """Neutralize Custom Field ``fetch_from`` references whose source no longer
    resolves on the linked doctype (missing column and/or missing docfield).

    Why this exists
    ---------------
    The same codebase ships to many servers/setups that each have a different
    mix of apps (homefirst_customs, cn_hrms_core, …). Some of those apps add a
    Custom Field with ``fetch_from = "<link_field>.<source_field>"``. If, on a
    given server, ``<source_field>`` has no column (its owning app isn't
    installed there, or a fixture wasn't applied — i.e. schema drift), Frappe's
    *core* link validation runs ``SELECT <source_field> FROM <linked doctype>``
    on every save and dies with:

        MySQLdb.OperationalError (1054, "Unknown column '…' in 'SELECT'")

    That blocks the save entirely — e.g. creating a Job Opening from a Job
    Requisition once its link fields are populated. (See
    frappe.model.base_document.get_invalid_links.)

    A broken ``fetch_from`` is non-functional anyway — it can only ever crash —
    so clearing it is strictly safe: nothing that worked stops working, the
    field simply stops trying to auto-fetch a column that doesn't exist. Running
    it on every migrate makes it self-healing: if a fixture re-introduces a
    broken reference, the next migrate clears it again. Fully idempotent.
    """
    from frappe.model import default_fields

    try:
        rows = frappe.get_all(
            "Custom Field",
            filters={"fetch_from": ["like", "%.%"]},
            fields=["name", "dt", "fieldname", "fetch_from"],
        )
    except Exception:
        # Custom Field table not ready (very early install) — nothing to do.
        return

    cleared = []
    for row in rows:
        fetch_from = (row.fetch_from or "").strip()
        if "." not in fetch_from:
            continue
        link_fieldname, source_part = fetch_from.split(".", 1)
        source_fieldname = source_part.split(".")[-1].strip()
        if not source_fieldname or source_fieldname == "name" or source_fieldname in default_fields:
            continue
        try:
            link_df = frappe.get_meta(row.dt).get_field(link_fieldname)
            # Only ordinary Link fields point at a single, statically-known table.
            if not link_df or link_df.fieldtype != "Link" or not link_df.options:
                continue
            target_doctype = link_df.options
            target_meta = frappe.get_meta(target_doctype)
            if target_meta.issingle or target_meta.is_virtual:
                continue
            # A valid fetch_from needs BOTH a real column (for the SQL fetch in
            # get_invalid_links) AND a resolvable docfield (for value assignment
            # in set_fetch_from_value). Missing column -> "Unknown column" (1054);
            # column present but docfield gone -> "Wrong Fetch From value". Either
            # way the source no longer resolves, so the reference is broken.
            column_exists = frappe.db.has_column(target_doctype, source_fieldname)
            field_exists = bool(target_meta.get_field(source_fieldname))
            if column_exists and field_exists:
                continue  # fully valid fetch_from → leave it alone
            # Broken reference — clear it so core link validation can't crash.
            frappe.db.set_value("Custom Field", row.name, "fetch_from", None, update_modified=False)
            cleared.append(f"{row.dt}.{row.fieldname} ({fetch_from})")
        except Exception:
            # Hygiene must never break a migrate; skip anything we can't inspect.
            continue

    if cleared:
        frappe.db.commit()
        frappe.clear_cache()
        frappe.logger("recruitment").info(
            "repair_broken_fetch_from cleared {0} broken reference(s): {1}".format(
                len(cleared), "; ".join(cleared)
            )
        )


# The offer stage on a candidate: an offer exists but they have not replied yet.
# Sits between "Approvals" (waiting for the offer to be raised) and "Accepted"
# (the candidate said yes), and is what recruitment.api.bulk_job_offer writes.
HIRED_STATUS = "Hired"
HIRED_AFTER = "Approvals"
HIRED_SUB_STATUSES = ("Offer To Be Sent", "Offer Sent")


def ensure_hired_status():
    """Add "Hired" to Job Applicant.status, and its sub-statuses to the master.

    Applied from after_migrate rather than a patch: the status options live in a
    Property Setter that ships as a fixture, and a fixture sync re-applies its own
    value over anything a patch wrote. Idempotent — it only writes when "Hired" is
    genuinely missing, and it never reorders what is already there.
    """
    try:
        meta = frappe.get_meta("Job Applicant")
        field = meta.get_field("status")
        if not field:
            return
        options = [o for o in (field.options or "").split("\n")]
        if HIRED_STATUS in options:
            _ensure_hired_sub_statuses()
            return

        at = options.index(HIRED_AFTER) + 1 if HIRED_AFTER in options else len(options)
        options.insert(at, HIRED_STATUS)
        frappe.make_property_setter({
            "doctype": "Job Applicant", "fieldname": "status", "property": "options",
            "value": "\n".join(options), "property_type": "Text",
        }, is_system_generated=False)
        frappe.clear_cache(doctype="Job Applicant")
        _ensure_hired_sub_statuses()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Hired status: setup failed")


def _ensure_hired_sub_statuses():
    """The two the offer flow writes, so the dropdown offers them from day one."""
    from recruitment.api.hiring_stage import _ensure_sub_status_option

    for sub_status in HIRED_SUB_STATUSES:
        _ensure_sub_status_option(HIRED_STATUS, sub_status)
