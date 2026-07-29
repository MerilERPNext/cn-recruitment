

import frappe
from frappe.utils import add_days, today
from frappe import _
@frappe.whitelist()
def validate_applicant(job_applicant):
    if job_applicant:
        doc=frappe.get_doc("Job Applicant",job_applicant)
        date_365_days_ago = add_days(today(), -365)
        mno=frappe.db.get_all("Job Applicant",{"phone_number":doc.phone_number,"name":["!=",job_applicant],"creation": [">=", date_365_days_ago]},["name"])
        if len(mno)>1:
            mobile=[]
            for i in mno:
                mobile.append(i.name)
            if mobile:
                return mobile
        else:
            email=frappe.db.get_all("Job Applicant",{"email_id":doc.email_id,"name":["!=",job_applicant],"creation": [">=", date_365_days_ago]},["name"])
           
            em=[]
            for i in email:
                em.append(i.name)
            if em:
                return em
    return False


def validate_blacklist(self,method):
    if self.phone_number:
        blacklist=frappe.db.get_value("Job Applicant",{"phone_number":self.phone_number},"custom_blacklist")
        if blacklist:
            self.custom_blacklist=1
    elif self.email_id:
        blacklist=frappe.db.get_value("Job Applicant",{"email_id":self.email_id},"custom_blacklist")
        if blacklist:
            self.custom_blacklist=1




def validation_blacklist_on_doctypes(self,method):
    if self.job_applicant:
        doc=frappe.get_doc("Job Applicant",self.job_applicant)
        if doc.custom_blacklist:
            frappe.throw("The Applicant Is Blacklisted.So You Cannot Create {0} ".format(self.doctype))

        if self.custom_extra_payment:
            for row in self.custom_extra_payment:

                if not row.salary_component:
                    continue

                paid_after_confirmation = frappe.db.get_value(
                    "Salary Component",
                    row.salary_component,
                    "custom_paid_after_confirmation"
                )

                if paid_after_confirmation and row.pay_frequency:
                    frappe.throw(
                        _("Row #{0}: You cannot select Pay Frequency for Salary Component <b>{1}</b> because it is marked as 'Paid After Confirmation'.").format(
                            row.idx,
                            row.salary_component
                        )
                    )


def validate_blacklist_employee(self,method):
    if self.job_applicant:
        blacklisted = frappe.db.get_value("Job Applicant", {"name": self.job_applicant}, "custom_blacklist")
        if blacklisted:
            frappe.throw("The Applicant is Blacklisted. You cannot create an Employee record for this applicant.")
        if self.cell_number:
            mno=frappe.db.get_value("Job Applicant",{"phone_number":self.cell_number,"custom_blacklist":1},"name")
            if mno:
                frappe.throw("This Candidate Is Blacklisted")
        if self.personal_email:
            email=frappe.db.get_value("Job Applicant",{"email_id":self.personal_email,"custom_blacklist":1},"name")
            if email:
                frappe.throw("This Candidate Is Blacklisted")
