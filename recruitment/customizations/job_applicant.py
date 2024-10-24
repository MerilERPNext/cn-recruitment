

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


def validate_blacklist(self,method):
    if self.phone_number:
        status=frappe.db.get_value("Job Applicant",{"phone_number":self.phone_number},"status")
        if status=="Blacklisted":
            self.status="Blacklisted"
    elif self.email_id:
        status=frappe.db.get_value("Job Applicant",{"email_id":self.email_id},"status")
        if status=="Blacklisted":
            self.status="Blacklisted"


