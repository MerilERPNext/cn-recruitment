import frappe
from nextai.funnel.custom_trigger import trigger_event
import json
from  hrms.payroll.doctype.salary_slip import salary_slip
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint

import frappe
from urllib.parse import urlencode


@frappe.whitelist()
def send_job_offer(job_offer):

    doc = frappe.get_doc("Job Offer", job_offer)

    # Get current site URL dynamically
    site_url = frappe.utils.get_url()

    # Job offer page route
    base_offer_url = f"{site_url}/job_offer"

    params = {
        "appl": doc.applicant_email
    }

    offer_url = f"{base_offer_url}?{urlencode(params)}"

    email_message = f"""
    <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6">

        <p>Dear {doc.applicant_name},</p>

        <p>
        We are delighted to offer you the position of
        <strong>{doc.designation}</strong> at
        <strong>{doc.company}</strong>.
        </p>

        <p>
        Please find your offer details enclosed/attached for your reference.
        </p>

        <p>
        To proceed further, we kindly request you to confirm your acceptance of this offer
        by or before <strong>{doc.custom_jo_expiry_date}</strong>.
        </p>

        <p>
        <a href="{offer_url}" style="color:#0b5ed7;">
        {offer_url}
        </a>
        </p>

        <p>
        We are excited about the possibility of you joining our team and contributing to our growth.
        Should you have any questions or need clarification regarding the offer, please feel free to reach out.
        </p>

        <p>
        Looking forward to your positive response.
        </p>

        <p>
        Thank You,<br>
        <strong>{doc.company} Team</strong>
        </p>

    </div>
    """

    frappe.sendmail(
        recipients=[doc.applicant_email],
        subject=f"Offer of Employment with {doc.company}",
        message=email_message,
        now=True
    )

    return "Email Sent Successfully"


@frappe.whitelist()
def send_onboarding_form(job_applicant):

    doc = frappe.get_doc("Job Applicant", job_applicant)

    job_offer = frappe.db.get_value("Job Offer", {"job_applicant": doc.name}, "name")

    # Base onboarding form URL
    base_onboarding_url = "https://nexus-dev.m.frappe.cloud/employee-onboarding/new"

    params = {
        "job_applicant": doc.email_id,
        "job_offer": job_offer or "",
        "date_of_joining": doc.custom_date_of_joining or "",
        "boarding_begins_on": doc.custom_expected_doj or ""
    }

    onboarding_url = f"{base_onboarding_url}?{urlencode(params)}"

    email_message = f"""
    <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6">

    <p>Hello <strong>{doc.applicant_name.upper()}</strong>,</p>

    <p>
    We hope you're doing great! As part of our continued onboarding process at WikiWorks Technologies Private Limited, we need a few more essential details from you.
    To make this as simple as possible, we've set up a secure online form where you can submit all the required information.
    </p>

    <p><strong>What You Need to Do:</strong></p>

    <ol>
        <li>
        Before filling out the form, kindly keep your documents ready such as Aadhar Card, PAN Card, UAN Card,
        PRAN Card (if available), Marriage Certificate, Passport & Visa (if available), Address Proof for both
        Current & Permanent address, Educational Certificates, Experience & Relieving Letter, Cancelled Cheque,
        Passport first page copy, and Parents Aadhar details for nomination.
        </li>

        <li>
        Click the link below to access the form:<br>
        <a href="{onboarding_url}" style="color:#0b5ed7;">Onboarding Form Link</a>
        </li>

        <li>
        Fill in your personal, educational, and professional details.
        </li>

        <li>
        Please complete and submit the form within <strong>48 Hours</strong>.
        </li>
    </ol>

    <p>
    By providing your information promptly, you'll help us streamline our internal processes so that we can
    welcome you smoothly on your first day.
    </p>

    <p><strong>What's Next?</strong></p>

    <p>
    Our next email will cover both IT and Non-IT essentials, including hardware requirements,
    travel plans, accommodation options, and more. Stay tuned!
    </p>

    <p>
    Thank you for your cooperation, and please feel free to reach out to
    <strong>HR Team</strong>
    </p>

    <br>

    <p>
    Best regards,<br>
    <strong>Onboarding Team</strong>
    </p>

    </div>
    """

    frappe.sendmail(
        recipients=[doc.email_id],
        subject="Please Complete Your Details: SubmissionLink and Deadline",
        message=email_message,
        now=True
    )

    return "Email Sent Successfully"


@frappe.whitelist(allow_guest=True)
def get_job_offer_status(appl):
    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    if not jo_id:
        return {"status": None}
    status = frappe.db.get_value("Job Offer", jo_id, "status")
    return {"status": status}
    
# @frappe.whitelist(allow_guest=True)
# def job_offer_update(status, appl):
#     frappe.set_user('Administrator')
#     jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
#     settings = frappe.get_doc("Recruitment Settings")
#     if status == "Accepted":
#         offer_doc=frappe.get_doc("Job Offer",jo_id)
#         offer_doc.status="Accepted"
#         offer_doc.save()
#         appl_doc=frappe.get_doc("Job Applicant",appl)
#         appl_doc.status="Offer Accepted"
#         appl_doc.save()
#         # frappe.db.set_value("Job Offer",jo_id,"status","Accepted")
#         # frappe.db.set_value("Job Applicant",appl,"status","Offer Accepted")
        
#         # trigger_event(doc=jo_doc, event_name="accept_jo")
#     if status == "Rejected":
#         frappe.db.set_value("Job Offer",jo_id,"status","Rejected")
#         frappe.db.set_value("Job Applicant",appl,"status","Offer Rejected")
#     frappe.db.set_value("Job Offer",jo_id,"docstatus",1)
#         # trigger_event(doc=jo_doc, event_name="reject_jo")
    
#     return {"jo_id": jo_id, "webform": settings.employee_onboarding_webform}

@frappe.whitelist(allow_guest=True)
def job_offer_update(status, appl):

    frappe.set_user("Administrator")

    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})

    settings = frappe.get_doc("Recruitment Settings")

    if status == "Accepted":
        frappe.db.set_value("Job Offer", jo_id, "status", "Accepted")
        frappe.db.set_value("Job Applicant", appl, "status", "Offer Accepted")

    elif status == "Rejected":
        frappe.db.set_value("Job Offer", jo_id, "status", "Rejected")
        frappe.db.set_value("Job Applicant", appl, "status", "Offer Rejected")

    frappe.db.set_value("Job Offer", jo_id, "docstatus", 1)

    # Redirect back to job_offer page
    site_url = frappe.utils.get_url()

    redirect_url = f"{site_url}/job_offer?appl={appl}"

    return {
        "jo_id": jo_id,
        "redirect_url": redirect_url
    }

    
@frappe.whitelist()
def request_for_offer(jo_id):
    doc_data = frappe.get_doc("Job Applicant",jo_id)
    trigger_event(doc=doc_data, event_name="send_mail_to_group_admin")


@frappe.whitelist(allow_guest=True)
def submit_docs(status, appl,url=None):
	jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
	settings = frappe.get_doc("Recruitment Settings")
	job_applicant = frappe.db.get_value("Job Offer", jo_id, "job_applicant")
	if status == "Accepted":
		wf_url = url+"/"+settings.employee_onboarding_webform+"/new?job_offer="+jo_id+"&job_applicant="+appl
		email_context = {"url":wf_url,"name": jo_id, "applicant_name": frappe.db.get_value("Job Offer", {"job_applicant": appl},"applicant_name"),"company":frappe.db.get_value("Job Offer", {"job_applicant": appl},"company"),"designation":frappe.db.get_value("Job Offer", {"job_applicant": appl},"designation")}
		frappe.sendmail(
			recipients=[job_applicant],
			subject=frappe.render_template(
				frappe.db.get_value("Email Template", "Employee Onboarding", "subject"),
				email_context,
			),
			message=frappe.render_template(
				frappe.db.get_value("Email Template", "Employee Onboarding", "response_html"),
				email_context,
			),
			args=email_context,
		)

@frappe.whitelist()
def calculate_salary_structure(self,method=None):
    if self.custom_employee_salary_structure and self.custom_base_salary:
        rec_setting=frappe.get_doc("Recruitment Settings")
        ssa= frappe.db.get_value("Salary Structure Assignment",{"name":rec_setting.dummy_salary_structure_assignment},["name"])
        if ssa:
            doc=frappe.get_doc("Salary Structure Assignment",ssa)
            doc.salary_structure=self.custom_employee_salary_structure
            doc.base=self.custom_base_salary
            doc.income_tax_slab=self.custom_income_tax_slab
            doc.save()
            self.custom_earnings=[]
            self.custom_deduction=[]
            make_salary_slip(self,self.custom_employee_salary_structure,target_doc=None,
            employee=doc.employee,
            posting_date=None,
            as_print=False,
            print_format=None,
            for_preview=0,)
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
    def postprocess(source,target):
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
        #ignore_permissions=ignore_permissions,
        cached=True,
    )
    total_amount = 0
    total=0
    if doc:
        for i in doc.earnings:
            self.append("custom_earnings",{'component':i.salary_component,'amount':i.amount})
            total_amount+=i.amount
        for j in doc.deductions:
            self.append("custom_deduction",{'component':j.salary_component,'amount':j.amount})
            total+=j.amount
        # self.custom_total_earnings=total_amount
        # self.custom_total_deductions=total
        return doc
        
