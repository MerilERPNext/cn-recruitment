import frappe
import json
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint

from hrms.hr.doctype.job_offer.job_offer import JobOffer


@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    """Gated override of HRMS's Job Offer → "Create Employee".

    Blocks a configured Hiring Lead (for the offer's company) from creating an
    Employee out of a Job Offer when 'Allow Hiring lead to Add Employee From
    Offer' is OFF in Recruitment Settings. System Managers / Administrator, and
    every company without a Hiring Lead Configuration, are unaffected. Once the
    gate passes it delegates to the original HRMS implementation, so the mapping
    behaviour is unchanged. Registered via override_whitelisted_methods in hooks."""
    from hrms.hr.doctype.job_offer.job_offer import make_employee as hrms_make_employee
    from recruitment.customizations.hiring_lead_permissions import _exempt, _settings
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        is_hiring_lead_for_company,
    )

    company = frappe.db.get_value("Job Offer", source_name, "company")
    if (
        not _exempt()
        and is_hiring_lead_for_company(company)
        and not _settings().get("allow_hiring_lead_add_employee_from_offer")
    ):
        frappe.throw(
            _("Hiring leads are not allowed to add an Employee from a Job Offer. "
              "Enable 'Allow Hiring lead to Add Employee From Offer' in Recruitment "
              "Settings → Hiring Lead Permission Settings.")
        )

    return hrms_make_employee(source_name, target_doc)


@frappe.whitelist()
def calculate_salary_structure(self, method=None):
    if self.custom_employee_salary_structure and self.custom_base_salary:
        rec_setting = frappe.get_doc("Recruitment Settings")
        ssa = frappe.db.get_value(
            "Salary Structure Assignment",
            {"name": rec_setting.dummy_salary_structure_assignment},
            ["name"],
        )
        if ssa:
            doc = frappe.get_doc("Salary Structure Assignment", ssa)
            doc.salary_structure = self.custom_employee_salary_structure
            doc.base = self.custom_base_salary
            doc.income_tax_slab = self.custom_income_tax_slab
            doc.save()
            self.custom_earnings = []
            self.custom_deduction = []
            make_salary_slip(
                self,
                self.custom_employee_salary_structure,
                target_doc=None,
                employee=doc.employee,
                posting_date=None,
                as_print=False,
                print_format=None,
                for_preview=0,
            )
        else:
            frappe.throw("No Salary Structure")


@frappe.whitelist()
def make_salary_slip(
    self,
    source,
    target_doc=None,
    employee=None,
    posting_date=None,
    as_print=False,
    print_format=None,
    for_preview=0,
):
    def postprocess(source, target):
        if employee:
            target.employee = employee
            if posting_date:
                target.posting_date = posting_date

        target.run_method("process_salary_structure", for_preview=for_preview)

    doc = get_mapped_doc(
        "Salary Structure",
        source,
        {
            "Salary Structure": {
                "doctype": "Salary Slip",
                "field_map": {
                    "total_earning": "gross_pay",
                    "name": "salary_structure",
                    "currency": "currency",
                },
            }
        },
        target_doc,
        postprocess,
        ignore_child_tables=True,
        # ignore_permissions=ignore_permissions,
        cached=True,
    )
    total_amount = 0
    total = 0
    if doc:
        for i in doc.earnings:
            self.append(
                "custom_earnings", {"component": i.salary_component, "amount": i.amount}
            )
            total_amount += i.amount
        for j in doc.deductions:
            self.append(
                "custom_deduction",
                {"component": j.salary_component, "amount": j.amount},
            )
            total += j.amount
        # self.custom_total_earnings=total_amount
        # self.custom_total_deductions=total
        return doc


# recruitment.customizations.job_offer.CustomJobOffer
class CustomJobOffer(JobOffer):
    def on_change(self):
        pass
