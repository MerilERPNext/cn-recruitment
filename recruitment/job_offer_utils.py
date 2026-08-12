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


def _resolve_offer_employment_type(job_offer):
    """Employment Type (Link id) driving the offer print-format / document-template
    / compensation logic.

    Prefers the value stored on the Job Offer itself, falling back to the linked
    Job Applicant. This makes the mapping work even when the Employment Type was
    set directly on the Job Offer (or is missing on the Job Applicant).

    Accepts a Job Offer name (str), a dict, or a doc. Returns None when neither
    carries a value. Never raises — callers degrade to their safe default.
    """
    try:
        if isinstance(job_offer, str):
            jo_et, job_applicant = (
                frappe.db.get_value(
                    "Job Offer", job_offer, ["custom_employment_type", "job_applicant"]
                )
                or (None, None)
            )
        else:
            jo_et = job_offer.get("custom_employment_type")
            job_applicant = job_offer.get("job_applicant")

        if jo_et:
            return jo_et
        if job_applicant:
            return frappe.db.get_value(
                "Job Applicant", job_applicant, "custom_employment_type"
            )
    except Exception:
        pass
    return None


def get_job_offer_print_format(job_offer=None):
    """Resolve which Job Offer Print Format to use.

    Picks the print format mapped to the offer's Employment Type in
    Recruitment Settings (`job_offer_print_format_mapping`) — read from the Job
    Offer, falling back to the linked Job Applicant. Falls back to the single
    `job_offer_print_format` default when there is no matching row.

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
        employment_type = _resolve_offer_employment_type(job_offer)
        if not employment_type:
            return default_pf

        for row in (settings.get("job_offer_print_format_mapping") or []):
            if row.employment_type == employment_type and row.print_format:
                return row.print_format
    except Exception:
        # Any unexpected issue -> safe default, never break rendering.
        pass

    return default_pf


def get_job_offer_document_template(job_offer=None):
    """Resolve which Document Template to use for a Job Offer, or None.

    Returns a Document Template name ONLY when the master toggle
    ``send_offer_via_document_template`` is ON in Recruitment Settings and a
    template is configured. Selection mirrors ``get_job_offer_print_format``:
    the template mapped to the applicant's Employment Type
    (``job_offer_document_template_mapping``) wins, otherwise the single
    ``job_offer_document_template`` default is used.

    Returns None whenever the toggle is off or nothing is configured, so every
    caller cleanly falls back to the existing Print Format path. Never raises —
    any unexpected error degrades to None (Print Format path).

    ``job_offer`` may be a Job Offer name (str) or a Job Offer doc.
    """
    # A template explicitly picked on the Job Offer form wins over everything.
    try:
        if job_offer:
            picked = (
                job_offer.get("custom_offer_letter_template")
                if not isinstance(job_offer, str)
                else frappe.db.get_value("Job Offer", job_offer, "custom_offer_letter_template")
            )
            if picked:
                return picked
    except Exception:
        pass

    try:
        settings = frappe.get_cached_doc("Recruitment Settings")
    except Exception:
        return None

    if not settings or not settings.get("send_offer_via_document_template"):
        return None

    default_tmpl = settings.get("job_offer_document_template") or None

    if not job_offer:
        return default_tmpl

    try:
        employment_type = _resolve_offer_employment_type(job_offer)
        if not employment_type:
            return default_tmpl

        for row in (settings.get("job_offer_document_template_mapping") or []):
            if row.employment_type == employment_type and row.document_template:
                return row.document_template
    except Exception:
        pass

    return default_tmpl


def render_job_offer_via_document_template(job_offer, template_name):
    """Render a Job Offer to PDF using a nextai Document Template.

    Returns ``(pdf_bytes, filename)``, or ``(None, None)`` on any failure so
    callers can fall back to the Print Format path. Reuses nextai's proven
    render + DOCX/HTML -> PDF conversion pipeline (LibreOffice with a
    mammoth/wkhtmltopdf fallback), honouring the template's PDF password
    protection. No Employee Documents row is created — we only need the bytes.

    ``job_offer`` may be a Job Offer name (str) or doc.
    """
    try:
        from nextai.funnel.doctype.funnel_task.actions.create_template_document import (
            generate_docx_document,
            generate_html_document,
            ensure_pdf_file,
        )
    except Exception:
        frappe.log_error(
            title="Job Offer Document Template: nextai pipeline unavailable",
            message=frappe.get_traceback(),
        )
        return None, None

    jo_name = job_offer if isinstance(job_offer, str) else job_offer.get("name")

    try:
        template = frappe.get_doc("Document Template", template_name)

        if template.template_type == "Docx":
            file_info = generate_docx_document(template, jo_name)
        else:
            file_info = generate_html_document(template, jo_name)

        pdf_password = None
        if getattr(template, "enable_pdf_password_protection", 0):
            try:
                pdf_password = template.get_pdf_password(
                    template.doctype_name or "Job Offer", jo_name
                )
            except Exception:
                pass

        file_to_attach = ensure_pdf_file(file_info, pdf_password=pdf_password)
        if not file_to_attach or not file_to_attach.get("file_url"):
            frappe.log_error(
                title="Job Offer Document Template: render produced no PDF",
                message=f"Job Offer: {jo_name}, Template: {template_name}",
            )
            return None, None

        src_file = frappe.get_doc("File", {"file_url": file_to_attach["file_url"]})
        pdf_bytes = src_file.get_content()
        filename = file_to_attach.get("file_name") or f"{jo_name}.pdf"

        # The nextai pipeline persists the rendered PDF as a standalone private
        # File doc. We only need the bytes (for email / inline preview / download),
        # so delete the temp File to avoid accumulating orphans — the portal
        # preview re-renders on every page view.
        try:
            src_file.delete(ignore_permissions=True)
        except Exception:
            pass

        return pdf_bytes, filename
    except Exception:
        frappe.log_error(
            title="Job Offer Document Template render failed",
            message=f"Job Offer: {jo_name}, Template: {template_name}\n{frappe.get_traceback()}",
        )
        return None, None


def get_job_offer_pdf(job_offer):
    """Return ``(pdf_bytes, filename)`` for a Job Offer using the configured
    source: a Document Template when the toggle is on and one resolves,
    otherwise the Print Format (existing behaviour).

    Central helper so the email / download / bulk flows share one decision.
    ``job_offer`` may be a Job Offer name (str) or doc.
    """
    jo_name = job_offer if isinstance(job_offer, str) else job_offer.get("name")
    jo_doc = job_offer if not isinstance(job_offer, str) else None

    template_name = get_job_offer_document_template(job_offer)
    if template_name:
        pdf_bytes, filename = render_job_offer_via_document_template(job_offer, template_name)
        if pdf_bytes:
            return pdf_bytes, filename
        # Render failed — fall through to the Print Format path (already logged).

    pf = get_job_offer_print_format(job_offer)
    pdf_bytes = frappe.get_print(
        "Job Offer", jo_name, doc=jo_doc, print_format=pf, as_pdf=True
    )
    return pdf_bytes, f"{jo_name}.pdf"


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

        # Document Template (when enabled) or Print Format (default).
        pdf_content, filename = get_job_offer_pdf(jo_doc)

        frappe.local.response.filename = filename
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

        # Document Template (when enabled) is returned as an embedded PDF;
        # otherwise the Print Format HTML (unchanged).
        template_name = get_job_offer_document_template(jo_id)
        if template_name:
            pdf_bytes, _fname = render_job_offer_via_document_template(jo_id, template_name)
            if pdf_bytes:
                import base64
                data_uri = "data:application/pdf;base64," + base64.b64encode(pdf_bytes).decode()
                html = (
                    f'<iframe src="{data_uri}" style="width:100%; height:85vh; '
                    f'border:1px solid #ddd;" title="Offer Letter"></iframe>'
                )
                return {"html": html, "jo_id": jo_id}

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
        # Employment Type (custom_employment_type -> Employment Type Link) is read
        # from the Job Offer, falling back to the linked Job Applicant. Resolve it
        # to its title ("Intern", "Employee", ...). Only Intern carries a single
        # Stipend; every
        # other type carries Fixed (Base) + Variable (Variable Incentive) + Total.
        # Raw numeric amounts are returned as-is — formatting is done on the UI.
        employment_type = None
        et_id = _resolve_offer_employment_type(jo)
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


def _read_template_file_bytes(file_url):
    """Read a template file's bytes robustly — by File record first, then by the
    file-manager path (handles public/private, missing File docs)."""
    if not file_url:
        return None
    try:
        fname = frappe.db.get_value("File", {"file_url": file_url}, "name")
        if fname:
            return frappe.get_doc("File", fname).get_content()
    except Exception:
        pass
    try:
        from frappe.utils.file_manager import get_file
        return get_file(file_url)[1]
    except Exception:
        return None


@frappe.whitelist()
def get_offer_template_raw_html(template=None, job_offer=None):
    """Raw offer-letter template as HTML — placeholders intact, no data — for the
    'Template' tab on the Job Offer form. Docx templates are converted with
    mammoth; Html templates are returned as-is.
    """
    if not template and job_offer:
        template = get_job_offer_document_template(job_offer)
    if not template:
        return {"html": "<div style='padding:32px;text-align:center;color:#888;'>No offer letter template selected. Pick one in <b>Offer Letter Template</b>, or configure a default in Recruitment Settings.</div>"}
    try:
        tdoc = frappe.get_doc("Document Template", template)
        if not tdoc.template_file:
            return {"html": "<div style='padding:32px;text-align:center;color:#888;'>This template has no file attached.</div>"}
        content = _read_template_file_bytes(tdoc.template_file)
        if content is None:
            return {"html": "<div style='padding:32px;text-align:center;color:#c0392b;'>The template file <code>" + frappe.utils.escape_html(tdoc.template_file or "") + "</code> was not found on this site.</div>"}
        if (tdoc.template_type or "").lower() == "docx":
            import io
            import mammoth
            body = mammoth.convert_to_html(io.BytesIO(content)).value
        else:
            body = content.decode("utf-8", errors="ignore") if isinstance(content, bytes) else content
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Offer template raw render failed")
        return {"html": "<div style='padding:32px;text-align:center;color:#c0392b;'>Could not render this template.</div>"}
    html = (
        "<div style='padding:28px 36px;max-width:850px;margin:0 auto;background:#fff;color:#222;"
        "font-family:Georgia,serif;line-height:1.6;'>" + body + "</div>"
    )
    return {"html": html, "template": template}


@frappe.whitelist()
def get_offer_letter_preview_html(job_offer):
    """Offer letter rendered with THIS Job Offer's data — for the 'Preview' tab.
    Uses the resolved Document Template (embedded PDF) or the Print Format.
    """
    frappe.has_permission("Job Offer", "read", doc=job_offer, throw=True)
    template_name = get_job_offer_document_template(job_offer)
    if template_name:
        pdf_bytes, _fn = render_job_offer_via_document_template(job_offer, template_name)
        if pdf_bytes:
            import base64
            data_uri = "data:application/pdf;base64," + base64.b64encode(pdf_bytes).decode()
            return {
                "html": f'<iframe src="{data_uri}" style="width:100%;height:78vh;border:1px solid #e0e0e0;border-radius:6px;" title="Offer Letter Preview"></iframe>',
                "source": "template",
            }
    # Fall back to the Print Format preview.
    from urllib.parse import urlencode
    params = {"doctype": "Job Offer", "name": job_offer, "trigger_print": 0, "no_letterhead": 0}
    pf = get_job_offer_print_format(job_offer)
    if pf:
        params["format"] = pf
    url = "/printview?" + urlencode(params)
    return {
        "html": f'<iframe src="{url}" style="width:100%;height:78vh;border:1px solid #e0e0e0;border-radius:6px;" title="Offer Letter Preview"></iframe>',
        "source": "print_format",
    }


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

    # Document Template (when enabled) or Print Format (default).
    output_pdf, filename = get_job_offer_pdf(jo_doc)
    pdf_attachment = {
        "fname": filename,  # Name of the file
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
        