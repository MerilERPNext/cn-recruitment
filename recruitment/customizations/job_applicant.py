

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


def create_follow_up_interview(self, method):
    """Open a blank draft Interview when HR flags a follow-up round.

    Fires on Job Applicant ``on_update``. When the ``Follow-up Interview
    Needed?`` dropdown (``custom_follow_up_interview_needed``) transitions into
    ``"Yes"``, a blank draft Interview is created for the applicant so HR can
    schedule the next round. The dropdown is intentionally left as ``"Yes"``
    until that new round is cleared, at which point
    ``recruitment.customizations.interview.interview.reset_follow_up_on_verdict``
    resets it to blank.

    :param self: the Job Applicant document being saved.
    :param method: the doc-event name (unused).
    """
    if self.custom_follow_up_interview_needed != "Yes":
        return

    # Only act on the transition into "Yes", not on every subsequent save.
    before = self.get_doc_before_save()
    if before and before.get("custom_follow_up_interview_needed") == "Yes":
        return

    # Guard: never spawn a second draft while one is still open (docstatus 0).
    if frappe.db.exists("Interview", {"job_applicant": self.name, "docstatus": 0}):
        return

    # Never let a follow-up spawn failure block the applicant save. A savepoint
    # rolls back any partial write from the failed attempt (e.g. a bad job_title
    # makes the Interview's fetched job_opening an invalid link), and HR is asked
    # to create the round manually instead.
    savepoint = "follow_up_interview"
    frappe.db.savepoint(savepoint)
    try:
        interview = frappe.new_doc("Interview")
        interview.job_applicant = self.name
        interview.status = "Pending"
        interview.insert(ignore_permissions=True, ignore_mandatory=True)
    except Exception:
        frappe.db.rollback(save_point=savepoint)
        frappe.log_error(
            title="Follow-up Interview Auto-Create Failed",
            message=frappe.get_traceback(),
        )
        frappe.msgprint(
            _(
                "Could not auto-create the follow-up interview for {0}. "
                "Please create it manually."
            ).format(frappe.bold(self.applicant_name or self.name)),
            title=_("Follow-up Interview Not Created"),
            indicator="orange",
        )
        return

    frappe.msgprint(
        _("A blank follow-up Interview {0} has been created — please schedule it.").format(
            get_link_to_form("Interview", interview.name)
        ),
        alert=True,
        indicator="blue",
    )


@frappe.whitelist()
def get_follow_up_state(job_applicant):
    """Compute the follow-up flow state for the Job Applicant form.

    Used by ``public/js/job_applicant.js`` to (a) lock/unlock the follow-up
    dropdown and (b) show/hide the gated ``Create > Job Offer`` button.

    :param job_applicant: name of the Job Applicant.
    :returns: dict with ``latest_status`` (status of the most recently created
        Interview for the applicant, or ``None``), ``editable`` (dropdown is
        editable only when the latest round is Cleared) and ``offer_eligible``
        (dropdown is ``"No"`` AND the latest round is Cleared).
    """
    latest = frappe.get_all(
        "Interview",
        filters={"job_applicant": job_applicant},
        fields=["status"],
        order_by="creation desc",
        limit=1,
    )
    latest_status = latest[0].status if latest else None

    follow_up = frappe.db.get_value(
        "Job Applicant", job_applicant, "custom_follow_up_interview_needed"
    )

    editable = latest_status == "Cleared"
    offer_eligible = (follow_up == "No") and (latest_status == "Cleared")

    return {
        "latest_status": latest_status,
        "editable": editable,
        "offer_eligible": offer_eligible,
    }
