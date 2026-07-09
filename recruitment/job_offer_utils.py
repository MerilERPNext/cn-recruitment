import frappe
import json
from  hrms.payroll.doctype.salary_slip import salary_slip
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint
from frappe.utils import formatdate, now_datetime, time_diff_in_hours, flt, fmt_money

from recruitment.recruitment.link_token import OFFER_SCOPE, offer_token, require_token


def is_dpdp_consent_enabled():
    """Whether the DPDP consent step is switched on in DPDP Act Settings.

    Defensive by design: if the settings single/field does not exist yet (feature
    not migrated on a site) it returns False, so callers behave exactly as before.
    """
    try:
        return bool(cint(frappe.db.get_single_value("DPDP Act Settings", "enabled")))
    except Exception:
        return False


def _authorize_offer(appl, token, ptype="read"):
    """Gate the offer endpoints for both audiences:
      - internal desk/HR users (logged in with Job Offer permission) — they call
        these without a token (e.g. job_offer.js after_save),
      - candidates on the guest offer page — verified via the signed link token.
    A guest with neither is rejected (closes the applicant-id enumeration)."""
    user = frappe.session.user
    if user and user != "Guest" and frappe.has_permission("Job Offer", ptype):
        return
    require_token(OFFER_SCOPE, appl, token)


def get_job_offer_print_format(job_offer=None):
    """Resolve which Job Offer Print Format to use.

    Picks the print format mapped to the applicant's Employment Type in
    Recruitment Settings (`job_offer_print_format_mapping`). Falls back to the
    single `job_offer_print_format` default when there is no matching row.

    Backward compatible by design: an empty mapping table resolves to the exact
    same value as before. Never raises — on any error it degrades to the default
    (or None / Frappe default) so existing render / download paths keep working.

    `job_offer` may be a Job Offer name (str) or a Job Offer doc; if omitted,
    only the default is returned.
    """
    try:
        settings = frappe.get_cached_doc("Recruitment Settings")
    except Exception:
        settings = None

    default_pf = (getattr(settings, "job_offer_print_format", None) or None) if settings else None

    if not job_offer or not settings:
        return default_pf

    try:
        if isinstance(job_offer, str):
            job_applicant = frappe.db.get_value("Job Offer", job_offer, "job_applicant")
        else:
            job_applicant = job_offer.get("job_applicant")

        if not job_applicant:
            return default_pf

        employment_type = frappe.db.get_value(
            "Job Applicant", job_applicant, "custom_employment_type"
        )
        if not employment_type:
            return default_pf

        for row in (settings.get("job_offer_print_format_mapping") or []):
            if row.employment_type == employment_type and row.print_format:
                return row.print_format
    except Exception:
        # Any unexpected issue -> safe default, never break rendering.
        pass

    return default_pf


@frappe.whitelist()
def get_job_offer_print_preview_url(job_offer):
    """Build the Print-view URL for a Job Offer using the employment-type-specific
    print format (Recruitment Settings mapping), falling back to the default.

    Used by the "Preview Offer Letter" button on the Job Offer desk form so it
    always opens the correct format — unlike Frappe's own print icon, which only
    knows the doctype default. Returns a plain URL string the client opens."""
    if not job_offer:
        frappe.throw("Missing job_offer parameter")

    from urllib.parse import urlencode

    params = {
        "doctype": "Job Offer",
        "name": job_offer,
        "trigger_print": 0,
        "no_letterhead": 0,
    }
    pf = get_job_offer_print_format(job_offer)
    if pf:
        params["format"] = pf

    return "/printview?" + urlencode(params)


@frappe.whitelist(allow_guest=True)
def download_job_offer_pdf(appl, token=None):
    """Download Job Offer PDF for a given applicant — guest, token-gated."""
    if not appl:
        frappe.throw("Missing applicant parameter")
    _authorize_offer(appl, token, "read")

    original_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        jo_id = frappe.db.get_value("Job Offer", {
            "job_applicant": appl,
            "docstatus": ["!=", 2],
            "status": ["in", ["Awaiting Response", "Accepted", "Rejected"]]
        })
        if not jo_id:
            frappe.throw("No active Job Offer found")

        jo_doc = frappe.get_doc("Job Offer", jo_id)

        pf = get_job_offer_print_format(jo_doc)

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
def preview_job_offer_html(appl, token=None):
    """Return rendered print-format HTML for a given applicant — guest, token-gated."""
    if not appl:
        frappe.throw("Missing applicant parameter")
    _authorize_offer(appl, token, "read")

    original_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        jo_id = frappe.db.get_value("Job Offer", {
            "job_applicant": appl,
            "docstatus": ["!=", 2],
            "status": ["in", ["Awaiting Response", "Accepted", "Rejected"]]
        })
        if not jo_id:
            frappe.throw("No active Job Offer found")

        pf = get_job_offer_print_format(jo_id)

        # Exact same call your Jinja route makes on line 37 — just no as_pdf.
        html = frappe.get_print("Job Offer", jo_id, print_format=pf)
        return {"html": html, "jo_id": jo_id}
    finally:
        frappe.set_user(original_user)

@frappe.whitelist(allow_guest=True)
def get_job_offer_status(appl, token=None):
    _authorize_offer(appl, token, "read")
    jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
    if not jo_id:
        return {"status": None}
    status = frappe.db.get_value("Job Offer", jo_id, "status")
    return {"status": status}

@frappe.whitelist(allow_guest=True)
def job_offer_update(status, appl, token=None, reason=None, message=None):
    _authorize_offer(appl, token, "write")
    original_ignore = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
        if status == "Accepted":
            offer_doc = frappe.get_doc("Job Offer", jo_id)
            offer_doc.status = "Accepted"
            offer_doc.save(ignore_permissions=True)
            appl_doc = frappe.get_doc("Job Applicant", appl)
            appl_doc.status = "Accepted"
            appl_doc.save(ignore_permissions=True)

        if status == "Rejected":
            frappe.db.set_value("Job Offer", jo_id, "status", "Rejected")
            frappe.db.set_value("Job Applicant", appl, "status", "Rejected")
            # Store rejection feedback
            if reason:
                frappe.db.set_value("Job Offer", jo_id, "custom_rejection_reason", reason)
            if message:
                frappe.db.set_value("Job Offer", jo_id, "custom_rejection_message", message)
        frappe.db.set_value("Job Offer", jo_id, "docstatus", 1)

        if status in ("Accepted", "Rejected"):
            from recruitment.api.action_center import mark_item_completed
            mark_item_completed(
                reference_doctype="Job Offer",
                reference_docname=jo_id,
                candidate_id=appl,
                commit=True,
            )

        webform = frappe.db.get_single_value("Recruitment Settings", "employee_onboarding_webform") or ""

        # On acceptance, tell the portal whether the DPDP consent page must be
        # shown before onboarding. False (default) => behaves exactly as before.
        dpdp_consent_required = is_dpdp_consent_enabled() if status == "Accepted" else False

        return {
            "jo_id": jo_id,
            "webform": webform,
            "dpdp_consent_required": dpdp_consent_required,
        }
    finally:
        frappe.flags.ignore_permissions = original_ignore


@frappe.whitelist(allow_guest=True)
def get_job_offer_summary(appl, token=None):
    _authorize_offer(appl, token, "read")
    original_ignore = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        jo_id = frappe.db.get_value("Job Offer", {"job_applicant": appl})
        if not jo_id:
            return {}

        jo = frappe.get_doc("Job Offer", jo_id)

        duration = jo.get("custom_duration")
        expected_doj = jo.get("custom_expected_doj")
        stipend = jo.get("custom_stipend")
        expiry_date = jo.get("custom_jo_expiry_date")

        expiry_display = None
        if expiry_date:
            try:
                hours_remaining = int(time_diff_in_hours(
                    str(expiry_date) + " 23:59:59",
                    now_datetime(),
                ))
                if hours_remaining <= 0:
                    expiry_display = "Expired"
                elif hours_remaining > 24:
                    days = hours_remaining // 24
                    expiry_display = f"{days} day{'s' if days != 1 else ''}"
                else:
                    expiry_display = f"{hours_remaining} hour{'s' if hours_remaining != 1 else ''}"
            except Exception:
                pass

        # Resolve the Designation link to its title (falls back to the id).
        designation_name = None
        if jo.designation:
            designation_name = frappe.db.get_value("Designation", jo.designation, "custom_designation_title") or jo.designation

        # --- Compensation: dynamic by Employment Type -----------------------
        # The Employment Type lives on the Job Applicant as a Link
        # (custom_employment_type -> Employment Type). Resolve it to its title
        # ("Intern", "Employee", ...). Only Intern carries a single Stipend; every
        # other type carries Fixed (Base) + Variable (Variable Incentive) + Total.
        # Raw numeric amounts are returned as-is — formatting is done on the UI.
        employment_type = None
        if jo.get("job_applicant"):
            et_id = frappe.db.get_value("Job Applicant", jo.job_applicant, "custom_employment_type")
            if et_id:
                employment_type = frappe.db.get_value("Employment Type", et_id, "employee_type_name") or et_id

        is_intern = (employment_type or "").strip().lower() == "intern"

        def num(value):
            """Raw amount with no trailing .0 — whole numbers become int
            (38000.0 -> 38000), real decimals are kept (2000.5 -> 2000.5)."""
            v = flt(value)
            return int(v) if v == int(v) else v

        def fmt(value):
            """Comma-grouped string matching how the document displays the amount
            (uses the site Number Format setting, e.g. "3,500,000"). No currency
            symbol; no decimals for whole numbers."""
            v = flt(value)
            precision = 0 if v == int(v) else 2
            return fmt_money(v, precision=precision)

        compensation = {
            "compensation_type": "stipend" if is_intern else "fixed_variable",
            "stipend": None,
            "fixed": None,
            "variable": None,
            "total": None,
            # Comma-grouped display strings (match the doc); UI may use these directly.
            "stipend_formatted": None,
            "fixed_formatted": None,
            "variable_formatted": None,
            "total_formatted": None,
        }

        if is_intern:
            compensation["stipend"] = num(stipend)
            compensation["stipend_formatted"] = fmt(stipend)
        else:
            fixed = flt(jo.get("custom_base_salary"))
            variable = flt(jo.get("custom_variable_incentive"))
            compensation["fixed"] = num(fixed)
            compensation["variable"] = num(variable)
            compensation["total"] = num(fixed + variable)
            compensation["fixed_formatted"] = fmt(fixed)
            compensation["variable_formatted"] = fmt(variable)
            compensation["total_formatted"] = fmt(fixed + variable)

        return {
            "applicant_name": f"{jo.get('applicant_name') or ''} {jo.get('applicant_last_name') or ''}".strip(),
            "designation": designation_name or "Intern",
            "duration_display": f"{duration} Month{'s' if int(duration) != 1 else ''}" if duration else None,
            "expected_doj_display": formatdate(expected_doj) if expected_doj else None,
            "expiry_display": expiry_display,
            "employment_type": employment_type,
            **compensation,
        }
    finally:
        frappe.flags.ignore_permissions = original_ignore

@frappe.whitelist(allow_guest=True)
def get_company_logo():
    logo = frappe.db.get_single_value("Website Settings", "app_logo")

    return {
        "logo_url": logo
    }

@frappe.whitelist(allow_guest=True)
def get_rejection_reasons():
    return frappe.get_all(
        "Rejection Reason",
        fields=["name", "reason"]
    )

@frappe.whitelist()
def request_for_offer(jo_id):
    from nextai.funnel.custom_trigger import trigger_event
    doc_data = frappe.get_doc("Job Applicant",jo_id)
    trigger_event(doc=doc_data, event_name="send_mail_to_group_admin")

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

    pf = get_job_offer_print_format(jo_doc)

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
    frappe.db.set_value("Job Applicant",mail_id,"status","Open")



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
        