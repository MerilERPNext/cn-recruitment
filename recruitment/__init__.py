__version__ = "0.0.1"

from frappe.utils import add_days, flt, unique
from frappe.www import login
from hrms.controllers.employee_boarding_controller import EmployeeBoardingController
from frappe import _
from frappe.model.document import Document
import frappe
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

# Land signed-in System Users on the Employee Self Service portal (/webapp)
# instead of the Desk. Installed here, at import time, because
# frappe.app.init_request runs the whole login (HTTPRequest -> LoginManager)
# BEFORE the before_request hooks this app installs its other patches from, so a
# before_request entry would miss the first login of every fresh worker.
# Gated by Website Settings -> "Redirect to Employee Self Service after login";
# see recruitment/recruitment/login_redirect.py for the full rationale.
try:
    from recruitment.recruitment.login_redirect import install as _install_login_redirect

    _install_login_redirect()
except Exception as e:
    import logging

    logging.getLogger(__name__).warning(f"Failed to apply webapp login redirect patch: {e}")
