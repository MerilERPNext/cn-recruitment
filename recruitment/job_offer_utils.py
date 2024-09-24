import frappe
from nextai.funnel.custom_trigger import trigger_event
import json


@frappe.whitelist(allow_guest=True)
def job_offer_update(status, appl):
    frappe.set_user('Administrator')
    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    settings = frappe.get_doc("Recruitment Settings")
    jo_doc = frappe.get_doc("Job Offer",jo_id)
    if status == "Accepted":
        frappe.db.set_value("Job Offer",jo_id,"status","Accepted")
        frappe.db.set_value("Job Applicant",appl,"status","Offer Accepted")
        # trigger_event(doc=jo_doc, event_name="accept_jo")
    if status == "Rejected":
        frappe.db.set_value("Job Offer",jo_id,"status","Rejected")
        frappe.db.set_value("Job Applicant",appl,"status","Offer Rejected")
        # trigger_event(doc=jo_doc, event_name="reject_jo")
    frappe.db.set_value("Job Offer",jo_doc,"docstatus",1)
    return {"jo_id": jo_id, "webform": settings.employee_onboarding_webform}

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
def send_job_offer(job_offer_url, candidate, mail_id,company,designation):
    email_context = {"canditate": candidate, "job_offer_url": job_offer_url,"company":company,"designation":designation}
    settings = frappe.get_doc("Recruitment Settings")
    job_offer_temp = settings.job_offer_template
    jo_name = frappe.db.get_value("Job Offer", {"job_applicant": mail_id})
    jo_doc = frappe.get_doc("Job Offer", jo_name)

    output_pdf = frappe.get_print(
        "Job Offer", jo_name, doc=jo_doc, as_pdf=True, output=None
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



