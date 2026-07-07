

import frappe
from frappe import _
from frappe.utils import add_days, get_link_to_form, today

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

def validate_blacklist_employee(self,method):
    mno=frappe.db.get_all("Job Applicant",{"phone_number":self.cell_number,"custom_blacklist":1},["name"])
    if mno:
        frappe.throw("This Candidate Is Blacklisted")
    email=frappe.db.get_all("Job Applicant",{"phone_number":self.personal_email,"custom_blacklist":1},["name"])
    if email:
        frappe.throw("This Candidate Is Blacklisted")


@frappe.whitelist()
def get_follow_up_state(job_applicant):
    """Compute the Job Offer gate state for the Job Applicant form.

    The follow-up decision is made when the interviewer submits feedback, so the
    gate reads the applicant's **most recent Interview Feedback** by date (rounds
    run sequentially -- the latest feedback is the applicant's current state).
    ``Create > Job Offer`` is eligible only when that latest feedback is
    ``Cleared`` AND its follow-up verdict is ``"No"`` (final selection). A
    ``"Yes"`` verdict, a ``Rejected`` result, or a blank verdict all keep the
    gate closed; HR runs any further round the normal way.

    :param job_applicant: name of the Job Applicant.
    :returns: dict with ``latest_result`` (result of the most recent Interview
        Feedback for the applicant, or ``None``) and ``offer_eligible``.
    """
    latest = frappe.get_all(
        "Interview Feedback",
        # Only submitted feedback is a finalised verdict; a draft mid-edit must
        # not drive the gate.
        filters={"job_applicant": job_applicant, "docstatus": 1},
        fields=["result", "custom_follow_up_interview_needed"],
        order_by="creation desc",
        limit=1,
    )
    latest_result = latest[0].result if latest else None
    follow_up = latest[0].custom_follow_up_interview_needed if latest else None

    offer_eligible = (latest_result == "Cleared") and (follow_up == "No")

    return {
        "latest_result": latest_result,
        "offer_eligible": offer_eligible,
    }
