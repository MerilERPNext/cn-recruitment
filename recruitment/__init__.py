__version__ = "0.0.1"

from frappe.utils import add_days, flt, unique
from frappe.www import login
from hrms.controllers.employee_boarding_controller import EmployeeBoardingController
from frappe import _
from frappe.model.document import Document
import frappe
from frappe.www.login import get_context
from recruitment.www.custom_login import get_context
class CustomEmployeeBoardingController(Document):

    def on_submit(self):
        # create the project for the given employee onboarding
        if self.project:
            return

        project_name = _(self.doctype) + " : "
        if self.doctype == "Employee Onboarding":
            project_name += self.job_applicant
        else:
            project_name += self.employee

        project = frappe.get_doc(
            {
                "doctype": "Project",
                "project_name": project_name,
                "expected_start_date": self.date_of_joining
                if self.doctype == "Employee Onboarding"
                else self.resignation_letter_date,
                "department": self.department,
                "company": self.company,
            }
        ).insert(ignore_permissions=True, ignore_mandatory=True)

        self.db_set("project", project.name)
        self.db_set("boarding_status", "Pending")
        self.reload()
        self.create_task_and_notify_user()

EmployeeBoardingController.on_submit = CustomEmployeeBoardingController.on_submit
login.get_context = get_context