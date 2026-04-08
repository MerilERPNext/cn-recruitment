import frappe
import json
from  hrms.payroll.doctype.salary_slip import salary_slip
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint
from frappe.utils import formatdate



@frappe.whitelist(allow_guest=True)
def download_job_offer_pdf(appl):
    """Download Job Offer PDF for a given applicant — guest-accessible."""
    if not appl:
        frappe.throw("Missing applicant parameter")

    original_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        jo_id = frappe.db.get_value("Job Offer", {
            "job_applicant": appl,
            "docstatus": ["!=", 2],
            "status": "Awaiting Response"
        })
        if not jo_id:
            frappe.throw("No active Job Offer found")

        jo_doc = frappe.get_doc("Job Offer", jo_id)

        pf = None
        try:
            pf = frappe.db.get_single_value("Recruitment Settings", "job_offer_print_format") or None
        except Exception:
            pf = None

        pdf_content = frappe.get_print(
            "Job Offer", jo_id, doc=jo_doc,
            print_format=pf, as_pdf=True
        )

        frappe.local.response.filename = f"{jo_id}.pdf"
        frappe.local.response.filecontent = pdf_content
        frappe.local.response.type = "pdf"
    finally:
        frappe.set_user(original_user)

@frappe.whitelist(allow_guest=True)
def get_job_offer_status(appl):
    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    if not jo_id:
        return {"status": None}
    status = frappe.db.get_value("Job Offer", jo_id, "status")
    return {"status": status}

@frappe.whitelist(allow_guest=True)
def job_offer_update(status, appl, reason=None, message=None):
    frappe.set_user('Administrator')
    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    if status == "Accepted":
        offer_doc=frappe.get_doc("Job Offer",jo_id)
        offer_doc.status="Accepted"
        offer_doc.save()
        appl_doc=frappe.get_doc("Job Applicant",appl)
        appl_doc.status="Accepted"
        appl_doc.save()

    if status == "Rejected":
        frappe.db.set_value("Job Offer",jo_id,"status","Rejected")
        frappe.db.set_value("Job Applicant",appl,"status","Rejected")
        # Store rejection feedback
        if reason:
            frappe.db.set_value("Job Offer", jo_id, "custom_rejection_reason", reason)
        if message:
            frappe.db.set_value("Job Offer", jo_id, "custom_rejection_message", message)
    frappe.db.set_value("Job Offer",jo_id,"docstatus",1)

    webform = frappe.db.get_single_value("Recruitment Settings", "employee_onboarding_webform") or ""
    return {"jo_id": jo_id, "webform": webform}


@frappe.whitelist(allow_guest=True)
def get_job_offer_summary(appl):
    frappe.set_user('Administrator')

    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    if not jo_id:
        return {}

    jo = frappe.get_doc("Job Offer", jo_id)

    duration = jo.get("custom_duration")
    expected_doj = jo.get("custom_expected_doj")
    stipend = jo.get("custom_stipend")

    return {
        "applicant_name": f"{jo.get('applicant_name') or ''} {jo.get('applicant_last_name') or ''}".strip(),
        "designation": jo.designation or "Intern",
        "duration_display": f"{duration} Month{'s' if int(duration) != 1 else ''}" if duration else None,
        "expected_doj_display": formatdate(expected_doj) if expected_doj else None,
        "stipend_display": f"₹ {stipend}" if stipend else None,
    }

@frappe.whitelist(allow_guest=True)
def get_company_logo():
    logo = frappe.db.get_single_value("Website Settings", "app_logo")

    return {
        "logo_url": logo
    }

@frappe.whitelist()
def request_for_offer(jo_id):
    from nextai.funnel.custom_trigger import trigger_event
    doc_data = frappe.get_doc("Job Applicant",jo_id)
    trigger_event(doc=doc_data, event_name="send_mail_to_group_admin")


@frappe.whitelist(allow_guest=True)
def submit_docs(status, appl,url=None):
	jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
	onboarding_webform = frappe.db.get_single_value("Recruitment Settings", "employee_onboarding_webform") or ""
	job_applicant = frappe.db.get_value("Job Offer", jo_id, "job_applicant")
	if status == "Accepted":
		wf_url = url+"/"+onboarding_webform+"/new?job_offer="+jo_id+"&job_applicant="+appl
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
def send_job_offer(job_offer_url, candidate, mail_id,company,designation):
    jo_name = frappe.db.get_value("Job Offer", {"job_applicant": mail_id})
    jo_doc = frappe.get_doc("Job Offer", jo_name)

    # Only allow sending if the Job Offer is submitted (docstatus=1)
    if jo_doc.docstatus != 1:
        frappe.throw("Job Offer must be submitted before sending.")

    email_context = {"canditate": candidate, "job_offer_url": job_offer_url,"company":company,"designation":designation}
    settings = frappe.get_doc("Recruitment Settings")
    job_offer_temp = settings.job_offer_template

    pf = getattr(settings, "job_offer_print_format", None) or None

    output_pdf = frappe.get_print(
        "Job Offer", jo_name, doc=jo_doc, print_format=pf, as_pdf=True, output=None
    )
    pdf_attachment = {
        "fname": jo_name + ".pdf",  # Name of the file
        "fcontent": output_pdf,  # Byte content of the file
        "content_type": "application/pdf",  # Content type of the file
    }
    frappe.sendmail(
        attachments=[pdf_attachment],
        recipients=[mail_id],
        subject=frappe.render_template(
            frappe.db.get_value("Email Template", job_offer_temp, "subject"),
			email_context,
        ),
        message=frappe.render_template(
            frappe.db.get_value("Email Template", job_offer_temp, "response"),
            email_context,
        ),
        args=email_context,
    )
    communication_doc = frappe.new_doc("Communication")
    communication_doc.subject = frappe.render_template(
            frappe.db.get_value("Email Template", job_offer_temp, "subject"),
			email_context,
        )
    communication_doc.content = frappe.render_template(
            frappe.db.get_value("Email Template", job_offer_temp, "response"),
            email_context,
        )
    communication_doc.reference_doctype = "Job Offer"
    communication_doc.reference_name = jo_name
    communication_doc.recipients = mail_id+","
    communication_doc.save()
    frappe.db.set_value("Job Applicant",mail_id,"status","Offered")



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
        
