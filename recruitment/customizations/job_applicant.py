

import frappe
from frappe import _
from frappe.utils import add_days, today, cint

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

def validate_job_applicant(self, method):
    validate_blacklist(self,method)
    validate_duplicity_check_setting(self,method)

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
        
def validate_duplicity_check_setting(self, method):
    if not self.job_title:
        return
    
    company = frappe.db.get_value("Job Opening",self.job_title,"company")
    if not company:
        return
    
    setting = frappe.get_all(
        "Duplicity Check Setting",
        filters=[["Company List","company","=", company]],
        fields=[
            "name",
            "no_of_days_before_reapplication_by_candidate",
            "allow_candidate_for_other_sources",
            "allow_candidate_for_external_recruiter",
            "no_of_days_before_reapplication_by_employee_in_ijp",
            "allow_employee_to_apply_for_ijp",
            "allow_duplicity_check_settings_for_all_sources"
        ],
        limit=1
    )
    if not setting:
        return
    
    setting = setting[0]
    if setting.allow_duplicity_check_settings_for_all_sources:
        return
    
    reapply_days = cint(setting.get("no_of_days_before_reapplication_by_candidate"),0)
    allow_multi = setting.get("allow_candidate_for_other_sources")
    reapply_ijp_days = cint(setting.get("no_of_days_before_reapplication_by_employee_in_ijp"),0)
    allow_multi_ijp = setting.get("allow_employee_to_apply_for_ijp")

    employee = frappe.db.get_value("Employee",{"user_id":self.email_id},"name")
    if employee:
        cutoff = add_days(today(), -reapply_ijp_days)
        job_applicant_filter = [
            ["Job Applicant","creation",">=",cutoff],
            ["Job Applicant","name","!=",self.name]
        ]
        if allow_multi_ijp:
            job_applicant_filter.append(["Job Applicant","job_title","=",self.job_title])
        
    else:
        cutoff = add_days(today(), -reapply_days)
        job_applicant_filter = [
            ["Job Applicant","creation",">=",cutoff],
            ["Job Applicant","name","!=",self.name]
        ]
        if allow_multi:
            job_applicant_filter.append(["Job Applicant","job_title","=",self.job_title])
            
            
    # duplicity check field filters
    field_list = frappe.get_all("Duplicity Check Field List",{"parent":setting.name},"field_name")
    for field in field_list:
        meta = frappe.get_meta('Job Applicant')
        if meta.has_field(field.field_name):
            field_name = field.field_name
            field_value = getattr(self, field_name, None)
            job_applicant_filter.append(["Job Applicant",field_name,"=",field_value])
            
    # findout job applicant
    job_applicant = frappe.db.get_value("Job Applicant",job_applicant_filter,"name")
    if job_applicant:
        frappe.throw(
            _("A job application with the same candidate details already exists within the reapplication limit period. "
            "Please review before proceeding.")
        )

        
        
    
        
        

    

    
    