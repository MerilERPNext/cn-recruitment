import json
import frappe
from frappe import _
from hrms.hr.doctype.employee_onboarding.employee_onboarding import EmployeeOnboarding

class IncompleteTaskError(frappe.ValidationError):
    pass

class CustomEmployeeOnboarding(EmployeeOnboarding):
    def validate(self):
        super().validate()
        self.set_employee()
        self.initialize_candidate_portal_fields()
        self.validate_duplicate_employee_onboarding()

    def initialize_candidate_portal_fields(self):
        """
        One-time snapshot of default candidate portal fields from
        Onboarding Portal Forms into this onboarding record.
        """
        if not self.is_new():
            return
        if self.docstatus != 0:
            return
        if not self.meta.get_field("custom_candidate_portal_fields"):
            return
        if self.get("custom_candidate_portal_fields"):
            return

        try:
            settings_name = self.get_selected_onboarding_portal_form()
            if settings_name and self.meta.get_field("custom_onboarding_portal_form") and not self.custom_onboarding_portal_form:
                self.custom_onboarding_portal_form = settings_name
            default_rows = (
                frappe.get_doc("Onboarding Portal Forms", settings_name).portal_fields or []
                if settings_name
                else []
            )
        except Exception:
            default_rows = []

        if not default_rows:
            return

        self.set("custom_candidate_portal_fields", [])
        for row in default_rows:
            self.append("custom_candidate_portal_fields", {
                "fieldname": row.fieldname,
                "label": row.label,
                "fieldtype": row.fieldtype,
                "tab_label": row.tab_label,
                "section_label": row.section_label,
                "is_mandatory": row.is_mandatory,
                "read_only": row.read_only,
                "hidden": row.hidden,
                "options": row.options,
            })

    def get_selected_onboarding_portal_form(self):
        if self.meta.get_field("custom_onboarding_portal_form") and self.custom_onboarding_portal_form:
            return self.custom_onboarding_portal_form

        default_form = frappe.db.get_value(
            "Onboarding Portal Forms",
            {"default": 1},
            "name",
            order_by="modified desc",
        )
        if default_form:
            return default_form

        return frappe.db.get_value(
            "Onboarding Portal Forms",
            {},
            "name",
            order_by="modified desc",
        )

    def set_employee(self):
        if not self.employee:
            self.employee = frappe.db.get_value("Employee", {"job_applicant": self.job_applicant}, "name")

    def validate_duplicate_employee_onboarding(self):
        emp_onboarding = frappe.db.exists(
            "Employee Onboarding", {"job_applicant": self.job_applicant, "docstatus": ("!=", 2)}
        )
        if emp_onboarding and emp_onboarding != self.name:
            frappe.throw(
                _("Employee Onboarding: {0} already exists for Job Applicant: {1}").format(
                    frappe.bold(emp_onboarding), frappe.bold(self.job_applicant)
                )
            )

    def validate_employee_creation(self):
        if self.docstatus != 1:
            frappe.throw(_("Submit this to create the Employee record"))
        else:
            for activity in self.activities:
                if not activity.required_for_employee_creation:
                    continue
                task_status = frappe.db.get_value("Task", activity.task, "status")
                if task_status not in ["Completed", "Cancelled"]:
                    frappe.throw(
                        _("All the mandatory tasks for employee creation are not completed yet."),
                        IncompleteTaskError,
                    )

    def on_submit(self):
        # Project and Tasks are intentionally NOT created on submit.
        # They are created on demand via the "Create Onboarding Tasks"
        # button (-> create_onboarding_tasks()). We deliberately bypass
        # EmployeeBoardingController.on_submit(), which would create them.
        pass

    def on_update_after_submit(self):
        # HRMS re-creates tasks on every post-submit save; suppress that.
        # Task metadata refresh is handled by the populate_onboarding_task_meta
        # doc_event hook instead.
        pass

    def on_cancel(self):
        super().on_cancel()

    def create_onboarding_tasks(self):
        """Create the Project and Tasks for this onboarding on demand.

        Mirrors HRMS EmployeeBoardingController.on_submit's project/task
        creation, but is invoked explicitly from the "Create Onboarding
        Tasks" button instead of automatically at submit time. Idempotent:
        the Project is created only once, and create_task_and_notify_user()
        skips activity rows that already have a linked Task.
        """
        if not self.project:
            project_name = _(self.doctype) + " : " + (
                self.job_applicant or self.employee_name or self.name
            )
            project = frappe.get_doc({
                "doctype": "Project",
                "project_name": project_name,
                "expected_start_date": self.date_of_joining,
                "department": self.department,
                "company": self.company,
            }).insert(ignore_permissions=True, ignore_mandatory=True)
            self.db_set("project", project.name)
            self.db_set("boarding_status", "Pending")
            self.reload()

        # HRMS helper: one Task per activity (skips already-linked rows) and
        # assigns the configured users/roles.
        self.create_task_and_notify_user()

        # Stamp DOJ / days-to-join / priority on the freshly created Tasks.
        from recruitment.recruitment.onboarding_extras import populate_onboarding_task_meta
        populate_onboarding_task_meta(self)

    @frappe.whitelist()
    def mark_onboarding_as_completed(self):
        for activity in self.activities:
            frappe.db.set_value("Task", activity.task, "status", "Completed")
        frappe.db.set_value("Project", self.project, "status", "Completed")
        self.boarding_status = "Completed"
        self.save()

@frappe.whitelist()
def manually_create_onboarding_tasks(onboarding_name):
    doc = frappe.get_doc("Employee Onboarding", onboarding_name)
    doc.create_onboarding_tasks()
    return "Tasks created successfully"



def reassign_tasks():

    onboardings = frappe.get_all(
        "Employee Onboarding",
        filters={
            "boarding_status": ["!=", "Completed"],
            "project": ["is", "set"]
        },
        fields=["name", "project"]
    )

    all_tasks = []

    for onboarding in onboardings:
        project = onboarding["project"]
        onboarding_id = onboarding["name"]

        unassigned_tasks = frappe.get_all(
            "Task",
            filters={
                "project": project,
                "status": ["!=", "Completed"],
                "_assign": ["is", "not set"]
            },
            fields=["name", "subject"]
        )

        funnel_tasks = frappe.get_all(
            "Task",
            filters={
                "project": project,
                "status": ["!=", "Completed"],
                "_assign": ["like", "%funnel@chatnext.hybrowlabs.com%"]
            },
            fields=["name", "subject", "_assign"]
        )

        for task in unassigned_tasks + funnel_tasks:
            task["onboarding_id"] = onboarding_id
            all_tasks.append(task)

    process_tasks(all_tasks)


def process_tasks(tasks):
    for task in tasks:

        onboarding_id = task.get("onboarding_id")
        if not onboarding_id:
            continue

        employee_onboarding = frappe.db.get_value("Employee Onboarding", onboarding_id, "employee")
        if not employee_onboarding:
            continue

        template_id = frappe.db.get_value("Employee Onboarding", onboarding_id, "employee_onboarding_template")
        if not template_id:
            continue

        template_doc = frappe.get_doc("Employee Onboarding Template", template_id)
        matched_activity = next(
            (activity for activity in template_doc.activities if activity.activity_name.lower() in task["subject"].lower()), None
        )
        if not matched_activity:
            continue

        condition = matched_activity.custom_assignment_condition
        if not condition:
            continue

        assigned_user = resolve_user_from_condition("Employee Onboarding", onboarding_id, condition)

        if not assigned_user:
            continue

        assign_value = json.dumps(assigned_user if isinstance(assigned_user, list) else [assigned_user])
        frappe.db.set_value("Task", task["name"], "_assign", assign_value)
        frappe.db.commit()

def resolve_user_from_condition(start_doctype, start_docname, condition):

    field_path = condition.strip().split(".")

    current_doctype = start_doctype
    current_docname = start_docname

    for index, field in enumerate(field_path):
        field = field.strip()

        if field == "owner":
            final_value = frappe.db.get_value(current_doctype, current_docname, "owner")
            if final_value:
                return final_value
            else:
                return None  

        field_meta = frappe.db.get_value(
            "DocField",
            {"parent": current_doctype, "fieldname": field},
            ["fieldtype", "options"],
            as_dict=True
        ) or frappe.db.get_value(
            "Custom Field",
            {"dt": current_doctype, "fieldname": field},
            ["fieldtype", "options"],
            as_dict=True
        )

        if not field_meta:
            return None  

        if index == len(field_path) - 1:
            final_value = frappe.db.get_value(current_doctype, current_docname, field)
            if final_value:
                return final_value
            else:
                return None  

        if field_meta["fieldtype"] == "Link":
            linked_docname = frappe.db.get_value(current_doctype, current_docname, field)
            if not linked_docname:
                return None  


            current_doctype = field_meta["options"]
            current_docname = linked_docname

        elif field_meta["fieldtype"] == "Table MultiSelect":
            child_table_doctype = field_meta["options"]

            employee_entries = frappe.get_all(
                child_table_doctype,
                filters={"parent": current_docname},
                fields=["employee"]
            )

            if not employee_entries:
                return None  

            employee_ids = [entry["employee"] for entry in employee_entries if entry.get("employee")]

            resolved_users = []
            for emp_id in employee_ids:
                user_id = frappe.db.get_value("Employee", emp_id, "user_id")
                if user_id:
                    resolved_users.append(user_id)

            if resolved_users:
                return resolved_users  

            return None

        else:
            return None  

    return None
