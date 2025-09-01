import frappe
import json
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint

from hrms.hr.doctype.job_offer.job_offer import JobOffer


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
