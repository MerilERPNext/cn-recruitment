

import frappe

@frappe.whitelist()
def validate_applicant(job_applicant):
    if job_applicant:
        doc=frappe.get_doc("Job Applicant",job_applicant)
        mno=frappe.db.get_all("Job Applicant",{"phone_number":doc.phone_number,"name":["!=",job_applicant]},["name"])
        if len(mno)>1:
            mobile=[]
            for i in mno:
                mobile.append(i.name)
            if mobile:
                return mobile
        else:
            email=frappe.db.get_all("Job Applicant",{"email_id":doc.email_id,"name":["!=",job_applicant]},["name"])
           
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

def validate_blacklist_employee(self,method):
    mno=frappe.db.get_all("Job Applicant",{"phone_number":self.cell_number},["name"])
    if mno:
        frappe.throw("This Candidate Is Blacklisted")
    email=frappe.db.get_all("Job Applicant",{"phone_number":self.personal_email},["name"])
    if email:
        frappe.throw("This Candidate Is Blacklisted")
