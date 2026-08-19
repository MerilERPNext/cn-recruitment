import frappe
from frappe.utils import add_days, getdate, date_diff, now_datetime, time_diff_in_hours, formatdate, fmt_money

no_cache = 1
allow_guest = True

def get_context(context):
    original_user = frappe.session.user

    # Authorize as the REAL requester BEFORE elevating to Administrator below —
    # otherwise the set_user would make _authorize_offer always pass as admin and
    # defeat the token gate. Internal users with Job Offer read pass without a
    # token; candidates use the signed token in the link. This stops the
    # sequential applicant id from being enumerated to read others' offers.
    pre_args = frappe.request.args
    pre_appl = pre_args.get("appl")
    if not pre_appl:
        frappe.throw("Missing or invalid 'appl' parameter")
    from recruitment.job_offer_utils import _authorize_offer
    _authorize_offer(pre_appl, pre_args.get("token"), "read")

    frappe.set_user("Administrator")
    try:
        query_params = frappe.request.args
        appl = query_params.get("appl")

        if not appl:
            frappe.throw("Missing or invalid 'appl' parameter")

        job_offers = frappe.db.get_all(
            'Job Offer',
            fields=['name', 'status'],
            filters=[
                ["Job Offer", "job_applicant", "=", appl],
                ["Job Offer", "docstatus", "!=", 2],
                ["Job Offer", "status", "=", "Awaiting Response"]],
            order_by='modified desc',
            limit=1
        )

        if job_offers:
            context.doc = job_offers[0]["name"]

            # Render source: Document Template (when enabled + resolvable) shown
            # as an embedded PDF, otherwise the Print Format HTML (unchanged).
            import base64
            from recruitment.job_offer_utils import (
                get_job_offer_pdf,
                get_job_offer_print_formats,
                get_job_offer_document_template,
                render_job_offer_html,
                render_job_offer_via_document_template,
            )

            context.use_document_template = 0
            context.offer_pdf_data_uri = ''
            context.print = ''

            template_name = get_job_offer_document_template(context.doc)
            if template_name:
                pdf_bytes, _fname = render_job_offer_via_document_template(
                    context.doc, template_name
                )
                if pdf_bytes:
                    context.use_document_template = 1
                    context.offer_pdf_data_uri = (
                        'data:application/pdf;base64,'
                        + base64.b64encode(pdf_bytes).decode()
                    )

            # Fall back to the Print Format HTML if the template is off or the
            # render failed (already logged inside the helper).
            if not context.use_document_template:
                formats = get_job_offer_print_formats(context.doc)
                if len(formats) > 1:
                    # An Employment Type mapped to several letters (a Management
                    # Trainee gets the trainee letter and the permanent offer
                    # letter) cannot be shown as raw HTML without their
                    # stylesheets colliding, so the candidate reads the same
                    # merged PDF they are sent.
                    pdf_bytes, _fname = get_job_offer_pdf(context.doc)
                    if pdf_bytes:
                        context.use_document_template = 1
                        context.offer_pdf_data_uri = (
                            'data:application/pdf;base64,'
                            + base64.b64encode(pdf_bytes).decode()
                        )

            if not context.use_document_template:
                context.print = render_job_offer_html(
                    context.doc, formats[0] if formats else None
                )

            # Fetch Job Offer fields for sidebar (only fields that exist)
            jo_meta = frappe.get_meta('Job Offer')
            # custom_ctc_per_annum used to be read here for a CTC line, but no
            # template ever rendered it and the field went with the Salary
            # Breakup section (recruitment.patches.delete_job_offer_salary_breakup).
            jo_wanted = ['designation', 'company', 'applicant_name', 'offer_date',
                         'custom_jo_expiry_date', 'job_applicant', 'custom_stipend',
                         'custom_duration', 'custom_expected_doj']
            jo_existing = [f for f in jo_wanted if jo_meta.has_field(f)]
            jo_fields = frappe.db.get_value('Job Offer', context.doc, jo_existing, as_dict=True) or {}

            context.expiry_date = jo_fields.get('custom_jo_expiry_date')
            context.designation = jo_fields.get('designation') or ''
            context.company = jo_fields.get('company') or ''
            context.applicant_name = jo_fields.get('applicant_name') or ''
            context.offer_date = jo_fields.get('offer_date')

            # Company logo — try Company doctype first, fall back to Website Settings
            context.company_logo = ''
            if context.company:
                context.company_logo = frappe.db.get_value('Company', context.company, 'company_logo') or ''
            if not context.company_logo:
                context.company_logo = frappe.db.get_single_value('Website Settings', 'app_logo') or ''
            if not context.company_logo:
                context.company_logo = frappe.db.get_single_value('Website Settings', 'banner_image') or ''

            # Job Applicant fields (sidebar: duration, stipend, expected_doj, region)
            ja_id = jo_fields.get('job_applicant') or appl
            ja_meta = frappe.get_meta('Job Applicant')
            ja_wanted = ['custom_expected_doj', 'duration', 'stipend', 'region', 'manager_name', 'custom_applicant_last_name']
            ja_existing = [f for f in ja_wanted if ja_meta.has_field(f)]
            ja_fields = {}
            if ja_existing:
                ja_fields = frappe.db.get_value('Job Applicant', ja_id, ja_existing, as_dict=True) or {}

            # Stipend, duration and expected DOJ each live on the Job Offer too
            # (seeded from the applicant but editable there), so the offer's
            # figure wins over the applicant's whenever HR has set one --
            # otherwise the portal would show the candidate different terms than
            # the letter they are signing, which renders the Job Offer's values.
            context.expected_doj = jo_fields.get('custom_expected_doj') or ja_fields.get('custom_expected_doj')
            context.expected_doj_display = formatdate(context.expected_doj) if context.expected_doj else ''
            context.duration = jo_fields.get('custom_duration') or ja_fields.get('duration') or ''
            stipend = jo_fields.get('custom_stipend') or ja_fields.get('stipend')
            context.stipend = stipend
            context.stipend_display = fmt_money(stipend, currency='INR') if stipend else ''
            context.region = ja_fields.get('region') or ''
            context.manager_name = ja_fields.get('manager_name') or ''

            # Build full name with last name from Job Applicant
            last_name = ja_fields.get('custom_applicant_last_name') or ''
            if last_name:
                context.full_name = (context.applicant_name + ' ' + last_name).strip()
            else:
                context.full_name = context.applicant_name

            # Calculate hours remaining until expiry and is_expired flag
            context.hours_remaining = 0
            context.is_expired = False
            if context.expiry_date:
                try:
                    today = getdate(frappe.utils.today())
                    context.is_expired = getdate(context.expiry_date) < today
                    hours = time_diff_in_hours(
                        str(context.expiry_date) + ' 23:59:59',
                        now_datetime()
                    )
                    context.hours_remaining = max(0, int(hours))
                except Exception:
                    context.hours_remaining = 0

            # Fetch rejection reasons for dropdown
            context.rejection_reasons = frappe.db.get_all(
                'Rejection Reason',
                fields=['name', 'reason'],
                order_by='creation asc'
            )

        context.full_width = 1
        context.no_cache = 1
    except (frappe.DoesNotExistError, frappe.ValidationError):
        raise
    except Exception as e:
        frappe.throw(f"An error occurred: {str(e)}")
    finally:
        frappe.set_user(original_user)
    return context


# this function is used to get the nearest working day based on holiday list
@frappe.whitelist()
def get_next_working_day(date, employee):
    """Finds the nearest working day before the given date"""
    date = getdate(date)
    holiday_list = frappe.db.get_value("Employee", employee, "holiday_list")
    if not holiday_list:
        return str(add_days(date, 0))

    while frappe.db.exists("Holiday", {"parent": holiday_list, "holiday_date": date}):
        date = add_days(date, -1)
    return str(date)

@frappe.whitelist()
def custom_manual_relieving_date(doc):
    doc = frappe.parse_json(doc)

    notice_period_days = frappe.db.get_value("Employment Type", {"name": doc.get("custom_employment_type")}, "custom_notice_period_days") or 0

    relieving_date = getdate(doc.get("custom_manual_relieving_date"))
    resignation_date = getdate(doc.get("custom_resignation_date"))

    days_served = date_diff(relieving_date, resignation_date)
    if relieving_date == resignation_date:
        days_served = 1

    days_exceeded = max(0, days_served - notice_period_days)
    custom_notice_period_served = 1 if days_served >= notice_period_days else 0

    return {
        "relieving_date": str(relieving_date),
        "days_served": days_served,
        "days_exceeded": days_exceeded,
        "custom_notice_period_served": custom_notice_period_served
    }