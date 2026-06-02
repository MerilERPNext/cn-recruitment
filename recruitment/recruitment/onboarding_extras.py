"""
Phase-1 Onboarding Extras
-------------------------
Strict additive layer for the Allocation -> Post-DOJ flow.

Wiring:
  hooks.py doc_events:
    "Employee Onboarding": {
        "before_save": "...onboarding_extras.auto_map_manager",
        "on_update":   "...onboarding_extras.handle_doj_outcome",
    }

  hooks.py doctype_js / doctype_list_js:
    "Task": [..., "public/js/task_onboarding_form.js"]
    "Task": "public/js/task_onboarding_listview.js"

Convention:
  Each Boarding Activity row's `activity_name` MUST equal an Email Template name.
  When HR triggers an interaction, we look up the Email Template by Task.subject.

Settings (Onboarding Settings single, all default ON / non-breaking):
  - enable_auto_manager_mapping     -> gates auto_map_manager
  - enable_doj_outcome_automation   -> gates handle_doj_outcome
  See _onboarding_setting_enabled(); a never-saved single keeps the default.
"""

import frappe
from frappe import _
from frappe.utils import add_days, getdate, today


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _onboarding_setting_enabled(fieldname: str, default: int = 1) -> bool:
    """Read a boolean toggle from the `Onboarding Settings` single.

    Returns `default` when the field was never saved (the single row doesn't
    exist yet) so existing installs keep their pre-setting behaviour — i.e.
    these automations stay ON until HR explicitly unticks them in
    Onboarding Settings. Once saved, the stored 0/1 wins.
    """
    value = frappe.db.get_single_value("Onboarding Settings", fieldname)
    if value is None:
        return bool(default)
    return bool(value)


def _days_to_join(doj_date) -> int:
    """Difference in days between the candidate's DOJ and today.
    Negative if DOJ is in the past.
    """
    return (getdate(doj_date) - getdate(today())).days


def _priority_for_days(days: int) -> str:
    """Map remaining days-to-join to Task priority."""
    if days <= 5:
        return "High"
    if days <= 10:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------------------
# 1. Manager mapping — runs on Employee Onboarding before_save
# ---------------------------------------------------------------------------

def auto_map_manager(doc, method=None):
    """Auto-fill Reporting Manager from the candidate's Branch.

    Source : doc.custom_work_location (Link → Branch)
    Lookup : Branch.custom_branch_head (Link → Employee)
    Target : doc.custom_reports_to (Link → Employee)

    Idempotent — runs on every save but only writes when the target is empty
    AND the source resolves to a Branch Head. HR can override by typing a
    different Employee in Reports To; manual values are preserved.

    Gated by Onboarding Settings -> "Auto-map Reporting Manager from Branch Head".
    """
    if not _onboarding_setting_enabled("enable_auto_manager_mapping"):
        return

    if doc.get("custom_reports_to"):
        return  # already set (manual override or earlier run)

    branch = doc.get("custom_work_location")
    if not branch:
        return

    head = frappe.db.get_value("Branch", branch, "custom_branch_head")
    if head:
        doc.custom_reports_to = head


# ---------------------------------------------------------------------------
# 2. Task metadata — DOJ + Days-to-Join + priority, no auto-Overdue
# ---------------------------------------------------------------------------

def populate_onboarding_task_meta(doc, method=None):
    """Populate `custom_doj` and `custom_days_to_join` on every Task linked to
    this Onboarding's Project, set priority, and clear `exp_end_date` so
    ERPNext's daily `update_status()` doesn't auto-flip Open → Overdue
    (Task.update_status only flips when exp_end_date is set and in the past).

    Callers:
      - overide_class.create_onboarding_tasks (the "Create Onboarding Tasks"
        button, right after the Tasks are created)
      - Employee Onboarding `on_update_after_submit` hook (DOJ may have changed)

    Uses db.set_value to avoid re-triggering Task.on_update which would re-run
    HRMS's boarding_status recalculation needlessly.
    """
    doj = doc.get("date_of_joining")
    if not doj:
        return
    days = _days_to_join(doj)
    priority = _priority_for_days(days)

    for activity in (doc.get("activities") or []):
        if not activity.task:
            continue
        frappe.db.set_value("Task", activity.task, {
            "custom_doj": doj,
            "custom_days_to_join": days,
            "exp_end_date": None,
            "priority": priority,
        }, update_modified=False)


def refresh_onboarding_task_days_to_join():
    """Daily scheduler: refresh `custom_days_to_join` and `priority` on every
    open Task that belongs to a still-active Employee Onboarding.

    Without this, `custom_days_to_join` snapshots the value at task creation
    and goes stale. Running once a day keeps the list view honest without
    blowing up the request path.
    """
    rows = frappe.db.sql(
        """
        SELECT t.name, eo.date_of_joining
        FROM `tabTask` t
        INNER JOIN `tabEmployee Onboarding` eo ON eo.project = t.project
        WHERE t.status NOT IN ('Completed', 'Cancelled')
          AND eo.docstatus = 1
          AND eo.boarding_status != 'Completed'
          AND eo.date_of_joining IS NOT NULL
        """,
        as_dict=True,
    )
    for row in rows:
        days = _days_to_join(row.date_of_joining)
        priority = _priority_for_days(days)
        frappe.db.set_value(
            "Task",
            row.name,
            {"custom_days_to_join": days, "priority": priority},
            update_modified=False,
        )


# ---------------------------------------------------------------------------
# 3. DOJ outcome dispatcher — runs on Employee Onboarding on_update
# ---------------------------------------------------------------------------

DOJ_FLAG = "in_phase1_doj_outcome"


def handle_doj_outcome(doc, method=None):
    """Dispatch on `custom_doj_outcome` change.

    Joined    -> create Employee via recruitment's overridden make_employee, set Active.
    Not Joined-> cancel Job Offer (db_set), reopen Requisition, mark Onboarding Cancelled.
    Postponed -> update date_of_joining + boarding_begins_on; HRMS recalculates Tasks on save.

    Gated by Onboarding Settings -> "Automate DOJ Outcome (Joined / Not Joined /
    Postponed)". When disabled, the field change is stored with no side effects.
    """
    if not doc.has_value_changed("custom_doj_outcome"):
        return
    if not _onboarding_setting_enabled("enable_doj_outcome_automation"):
        return
    if frappe.flags.get(DOJ_FLAG):
        return

    outcome = (doc.get("custom_doj_outcome") or "").strip()
    if not outcome:
        return

    frappe.flags[DOJ_FLAG] = True
    try:
        if outcome == "Joined":
            _doj_joined(doc)
        elif outcome == "Not Joined":
            _doj_not_joined(doc)
        elif outcome == "Postponed":
            _doj_postponed(doc)
    finally:
        frappe.flags[DOJ_FLAG] = False


def _doj_joined(doc):
    if doc.get("employee"):
        # Already created — just ensure status is Active.
        frappe.db.set_value("Employee", doc.employee, "status", "Active")
        return

    # Use the recruitment-overridden mapper so Recruitment Settings.mapping_fields apply.
    from recruitment.customizations.employee_onboarding.employee_onboarding import (
        make_employee as recruitment_make_employee,
    )

    emp = recruitment_make_employee(doc.name)
    if not emp:
        return

    _apply_employee_defaults(emp, doc)
    emp.status = "Active"
    emp.insert(ignore_permissions=True)
    frappe.db.set_value("Employee Onboarding", doc.name, "employee", emp.name)


def _apply_employee_defaults(emp, onboarding):
    """Fill Employee fields that Recruitment Settings.mapping_fields can't cover.

    Standard mandatory Employee fields (first_name, gender, date_of_birth)
    aren't direct fields on Employee Onboarding — they're either derivable
    from the full name or supplied via the candidate portal. company_email
    is mandatory in this site by customization; we backfill from
    personal_email as a last resort. Each field has exactly one fallback chain.
    """
    portal = _candidate_portal_value  # convenience alias

    # 1. first_name (mandatory) — split employee_name on whitespace.
    if not emp.get("first_name"):
        full = (emp.get("employee_name") or onboarding.get("employee_name") or "").strip()
        if full:
            parts = full.split()
            emp.first_name = parts[0]
            if len(parts) >= 3:
                emp.middle_name = parts[1]
                emp.last_name = " ".join(parts[2:])
            elif len(parts) == 2:
                emp.last_name = parts[1]

    # 2. gender (mandatory, Link to Gender) — prefer custom_gender field on the
    #    Onboarding form (added by homefirst_customs); fall back to candidate
    #    portal row "gender".
    if not emp.get("gender"):
        emp.gender = onboarding.get("custom_gender") or portal(onboarding, "gender")

    # 3. date_of_birth (mandatory) — prefer custom_date_of_birth field on the
    #    Onboarding form; fall back to candidate portal row "date_of_birth".
    if not emp.get("date_of_birth"):
        emp.date_of_birth = onboarding.get("custom_date_of_birth") or portal(onboarding, "date_of_birth")

    # 4. company_email — fallback to personal_email if not otherwise set.
    if not emp.get("company_email"):
        emp.company_email = emp.get("personal_email") or portal(onboarding, "personal_email")

    # 5. reports_to — from custom_reports_to (set by allocation or manually).
    if not emp.get("reports_to") and onboarding.get("custom_reports_to"):
        emp.reports_to = onboarding.custom_reports_to


def _candidate_portal_value(onboarding, fieldname: str):
    """Return current_value of the candidate-portal row matching `fieldname`.

    Returns None if the row is missing, empty, or in 'Rejected' state.
    """
    for row in (onboarding.get("custom_candidate_portal_fields") or []):
        if (row.get("fieldname") or "").strip() != fieldname:
            continue
        if (row.get("approval_status") or "") == "Rejected":
            return None
        value = row.get("current_value")
        return value if value not in (None, "") else None
    return None


def _doj_not_joined(doc):
    # Cancel the Job Offer via docstatus=2 (the standard "cancelled" docstatus).
    # Using db_set avoids triggering on_cancel chains.
    if doc.get("job_offer"):
        frappe.db.set_value("Job Offer", doc.job_offer, "docstatus", 2)

    # Reopen the Job Requisition via Job Opening.
    if doc.get("job_applicant"):
        opening = frappe.db.get_value("Job Applicant", doc.job_applicant, "job_title")
        if opening:
            req_name = frappe.db.get_value("Job Opening", opening, "job_requisition")
            if req_name:
                frappe.db.set_value("Job Requisition", req_name, "status", "Open Requisition")

    # Cancel the Onboarding (docstatus=2). boarding_status doesn't have a
    # "Cancelled" option in standard HRMS, so docstatus is the right place to
    # represent withdrawal.
    frappe.db.set_value("Employee Onboarding", doc.name, "docstatus", 2)


def _doj_postponed(doc):
    new_doj = doc.get("custom_doj_outcome_date")
    if not new_doj:
        return
    new_doj = getdate(new_doj)
    # Mutating the doc in on_update is safe via db_set; we don't trigger another
    # full save cycle. HRMS recalculates Task dates only on next save() of the
    # Onboarding, so call save() once with our flag still raised to avoid
    # re-entering this handler.
    doc.db_set("date_of_joining", new_doj, update_modified=False)
    doc.db_set("boarding_begins_on", new_doj, update_modified=False)
    # Update existing Tasks' exp_start_date/exp_end_date via HRMS helper.
    _reschedule_tasks(doc, new_doj)


def _reschedule_tasks(doc, new_begin):
    """Rewrite Task dates and DOJ metadata after a Postponed outcome.

    exp_end_date is intentionally left None — see populate_onboarding_task_meta.
    """
    new_doj = doc.get("date_of_joining") or new_begin
    days = _days_to_join(new_doj)
    priority = _priority_for_days(days)

    for activity in (doc.get("activities") or []):
        if not activity.task:
            continue
        begin_on = activity.begin_on or 0
        start = add_days(new_begin, begin_on)
        frappe.db.set_value("Task", activity.task, {
            "exp_start_date": start,
            "exp_end_date": None,
            "custom_doj": new_doj,
            "custom_days_to_join": days,
            "priority": priority,
        }, update_modified=False)


# ---------------------------------------------------------------------------
# 3. Interaction email triggers — called from Client Scripts
# ---------------------------------------------------------------------------

@frappe.whitelist()
def trigger_interaction_email(task: str):
    """Single-task variant. Called from the Task form button."""
    result = _trigger_one(task)
    return result


@frappe.whitelist()
def bulk_trigger_interactions(tasks):
    """Bulk variant. Called from Task list view bulk action.

    `tasks` accepts a JSON-encoded list (Frappe sends list args this way) or a
    Python list when called server-side.
    """
    if isinstance(tasks, str):
        tasks = frappe.parse_json(tasks)

    sent, failed, errors = 0, 0, []
    for tname in (tasks or []):
        try:
            _trigger_one(tname)
            sent += 1
        except Exception as e:
            failed += 1
            errors.append(f"{tname}: {e}")
            frappe.log_error(frappe.get_traceback(), f"Onboarding interaction failed: {tname}")

    return {"sent": sent, "failed": failed, "errors": errors}


def _trigger_one(task_name: str) -> dict:
    """Send the Email Template named `<Task.subject>` to the candidate, then
    mark the Task Completed. Adds an audit comment on the Employee Onboarding.
    """
    task = frappe.get_doc("Task", task_name)

    if task.status == "Completed":
        frappe.throw(_("Task '{0}' is already completed").format(task.name))

    if not task.project:
        frappe.throw(_("Task '{0}' has no project — not an onboarding task").format(task.name))

    onboarding_name = frappe.db.get_value(
        "Employee Onboarding", {"project": task.project}, "name"
    )
    if not onboarding_name:
        frappe.throw(_("No Employee Onboarding linked to project '{0}'").format(task.project))

    onboarding = frappe.get_doc("Employee Onboarding", onboarding_name)

    # HRMS sets Task.subject as `<activity_name> : <employee_name>` (see
    # hrms/controllers/employee_boarding_controller.py). Strip the candidate
    # suffix so the lookup matches the Email Template / activity_name.
    template_name = _activity_name_from_task(task, onboarding)
    if not frappe.db.exists("Email Template", template_name):
        frappe.throw(
            _("No Email Template named '{0}'. Create one with that exact name to enable this interaction.").format(template_name)
        )
    template = frappe.get_doc("Email Template", template_name)

    recipient = _resolve_candidate_email(onboarding)
    if not recipient:
        frappe.throw(_("No candidate email found on Employee Onboarding '{0}'").format(onboarding.name))

    candidate_name = (
        frappe.db.get_value("Job Applicant", onboarding.job_applicant, "applicant_name")
        if onboarding.job_applicant
        else (onboarding.employee_name or "")
    )

    context = {
        "doc": onboarding,
        "onboarding": onboarding,
        "candidate_name": candidate_name,
        "doj": onboarding.date_of_joining,
        "boarding_begins_on": onboarding.boarding_begins_on,
    }

    subject = frappe.render_template(template.subject or template_name, context)
    message = frappe.render_template(template.response or "", context)

    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=message,
        reference_doctype="Employee Onboarding",
        reference_name=onboarding.name,
    )

    # Use task.save() (not db.set_value) so HRMS's Task.on_update hook fires —
    # that hook recalculates Project.percent_complete which in turn updates
    # Employee Onboarding's boarding_status. db.set_value would skip this.
    task.status = "Completed"
    task.save(ignore_permissions=True)

    onboarding.add_comment(
        "Info",
        _("Interaction '{0}' triggered. Email sent to {1}.").format(template_name, recipient),
    )

    return {"ok": True, "task": task.name, "sent_to": recipient, "interaction": template_name}


def _activity_name_from_task(task, onboarding) -> str:
    """Recover the source `activity_name` from a Task.

    Preferred path: find the Boarding Activity row whose `task` field equals
    this Task. Fallback: rsplit the subject on ' : ' (the format HRMS uses).
    """
    for activity in (onboarding.get("activities") or []):
        if activity.task == task.name and activity.activity_name:
            return activity.activity_name

    subject = task.subject or ""
    return subject.rsplit(" : ", 1)[0].strip() if " : " in subject else subject.strip()


def _resolve_candidate_email(onboarding):
    if onboarding.job_applicant:
        email = frappe.db.get_value("Job Applicant", onboarding.job_applicant, "email_id")
        if email:
            return email
    if onboarding.employee:
        email = frappe.db.get_value("Employee", onboarding.employee, "personal_email") or \
                frappe.db.get_value("Employee", onboarding.employee, "company_email")
        if email:
            return email
    return None
