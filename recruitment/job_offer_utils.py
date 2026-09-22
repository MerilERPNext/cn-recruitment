import frappe
import json

from frappe import _
from  hrms.payroll.doctype.salary_slip import salary_slip
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint
from frappe.utils import escape_html, formatdate, now_datetime, time_diff_in_hours, flt

from recruitment.recruitment.link_token import OFFER_SCOPE, offer_token, require_token
from recruitment.recruitment.offer_document_template import (
    get_offer_document_template,
    is_document_template_offer_enabled,
    template_unavailable_html,
)
from recruitment.recruitment.utils import as_administrator


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


def _candidate_owns_applicant(appl):
    """True when the current Candidate Portal session owns Job Applicant ``appl``.

    Resolves the candidate straight from their portal session cookie (endpoints that
    are not wrapped by ``@candidate_required`` don't have ``frappe.local.candidate``
    populated) and checks ownership the same way ``enforce_candidate_identity`` does:
    the session email equals ``appl`` or the Job Applicant's ``email_id``.

    Non-throwing — returns False for guests / non-candidate sessions, so callers can
    safely fall back to the existing token / permission gate.
    """
    try:
        from recruitment.api.candidate_auth import _get_session_cookie, _get_active_session

        cookie = _get_session_cookie()
        if not cookie:
            return False
        session = _get_active_session(cookie)
        email = ((session.candidate if session else "") or "").strip().lower()
        if not email:
            return False
        if (appl or "").strip().lower() == email:
            return True
        applicant_email = frappe.db.get_value("Job Applicant", appl, "email_id")
        return bool(applicant_email and applicant_email.strip().lower() == email)
    except Exception:
        return False


def _resolve_offer_employment_type(job_offer):
    """Employment Type (Link id) driving the offer print-format / document-template
    / compensation logic.

    Read from the Job Offer, then the linked Job Applicant, then the Job Opening
    the candidate applied to — the same order
    `recruitment.customizations.job_offer.set_employment_type` writes it in at
    submit. The opening matters most for a DRAFT: the offer's own value is
    fetched from the applicant and `set_employment_type` only runs at submit, so
    an offer being previewed has nothing on it yet and the letters would resolve
    to none — leaving the preview to fall back to the doctype's default format
    and show the candidate's offer as an unrelated letter.

    Accepts a Job Offer name (str), a dict, or a doc. Returns None when nothing
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
        if not job_applicant:
            return None

        applicant_et, opening = frappe.db.get_value(
            "Job Applicant", job_applicant, ["custom_employment_type", "job_title"]
        ) or (None, None)
        if applicant_et:
            return applicant_et
        if opening:
            return frappe.db.get_value("Job Opening", opening, "employment_type")
    except Exception:
        pass
    return None


def get_job_offer_print_formats(job_offer=None):
    """Resolve every Job Offer Print Format an offer should be sent with, in order.

    Recruitment Settings' `job_offer_print_format_mapping` may carry more than
    one row for the same Employment Type, and all of them apply: a Management
    Trainee, for instance, is sent both the trainee letter and the permanent
    offer letter. Rows are returned in table order, so the row order in the
    settings decides the order of the attachments.

    The Employment Type is read from the Job Offer, falling back to the linked
    Job Applicant. Falls back to the single `job_offer_print_format` default
    when no row matches.

    Backward compatible by design: a mapping table with at most one row per
    Employment Type resolves to exactly what it did before. Never raises — on
    any error it degrades to the default so render / download paths keep
    working.

    `job_offer` may be a Job Offer name (str) or a Job Offer doc; if omitted,
    only the default is returned.
    """
    try:
        settings = frappe.get_cached_doc("Recruitment Settings")
    except Exception:
        settings = None

    default_pf = (getattr(settings, "job_offer_print_format", None) or None) if settings else None
    fallback = [default_pf] if default_pf else []

    if not job_offer or not settings:
        return fallback

    try:
        employment_type = _resolve_offer_employment_type(job_offer)
        if not employment_type:
            return fallback

        formats = []
        for row in (settings.get("job_offer_print_format_mapping") or []):
            if row.employment_type == employment_type and row.print_format:
                if row.print_format not in formats:
                    formats.append(row.print_format)
        if formats:
            return formats
    except Exception:
        # Any unexpected issue -> safe default, never break rendering.
        pass

    return fallback


def get_job_offer_print_format(job_offer=None):
    """The offer's primary Job Offer Print Format, or None.

    The single-format view of ``get_job_offer_print_formats`` — the first
    mapped row. Used where only one document can be shown, such as the
    print-view URL behind the desk 'Preview Offer Letter' button.
    """
    formats = get_job_offer_print_formats(job_offer)
    return formats[0] if formats else None


def get_job_offer_document_template(job_offer=None):
    """Resolve which Document Template to use for a Job Offer, or None.

    Returns a Document Template name ONLY when the master toggle
    ``send_offer_via_document_template`` is ON in Recruitment Settings and a
    template admits this offer.

    Selection is *attribute-driven* and lives on the Document Template itself —
    its Company, or the attributes on the Dynamic User Assignments in its User
    Assignment table. See :mod:`recruitment.recruitment.offer_document_template`
    for the full contract. The old Recruitment Settings pair (a single default
    plus a per-Employment-Type mapping table) is gone: an Employment Type is now
    just one attribute among the many a template can be scoped by.

    Returns None when the toggle is off, or when nothing admits this offer. The
    second case is deliberate and is **not** a fallback to the Print Format path
    for the offer letter — the callers that show or send a letter surface
    ``no_template_message()`` instead, and ``validate_offer_document_template``
    blocks the send at submit. Never raises.

    ``job_offer`` may be a Job Offer name (str) or a Job Offer doc.
    """
    # The toggle is checked FIRST, before anything else, and it is the only gate
    # that matters: off means this whole path does not exist and every caller
    # renders from a Print Format exactly as it did before the feature shipped.
    #
    # It used to be checked *after* the hand-picked template below, which let a
    # value on one Job Offer form switch that offer onto the Document Template
    # path while the site-wide toggle said Print Format. That is not what the
    # toggle reads as, so the order is now the other way round.
    if not is_document_template_offer_enabled():
        return None

    # With the path on, a template picked by hand on the form wins over the
    # attribute match: the picker already offered only templates that admit this
    # offer, so a value there is HR choosing between them on purpose.
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
        return get_offer_document_template(job_offer)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "Job Offer Document Template: resolution failed"
        )
        return None


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


# How long a rendered offer PDF is reused for. Short, because it only exists to
# stop repeat views re-spawning wkhtmltopdf; correctness comes from the key.
OFFER_PDF_CACHE_TTL = 5 * 60


def get_job_offer_pdfs(job_offer):
    """Return ``[(pdf_bytes, filename), ...]`` — every letter this offer is sent with.

    The source is the configured one: a Document Template when the toggle is on
    and one resolves (always a single document, since a template is an explicit
    override of the print-format path), otherwise the Print Formats mapped to
    the offer's Employment Type. That mapping is what makes a Management Trainee
    receive two letters — the trainee letter and the permanent offer letter.

    Central helper so the email / download / preview flows share one decision.
    ``job_offer`` may be a Job Offer name (str) or doc.
    """
    jo_name = job_offer if isinstance(job_offer, str) else job_offer.get("name")
    jo_doc = job_offer if not isinstance(job_offer, str) else None

    template_name = get_job_offer_document_template(job_offer)
    if template_name:
        pdf_bytes, filename = render_job_offer_via_document_template(job_offer, template_name)
        if pdf_bytes:
            return [(pdf_bytes, filename)]
        # Render failed — fall through to the Print Format path (already logged).

    formats = get_job_offer_print_formats(job_offer) or [None]
    single = len(formats) == 1

    documents = []
    for pf in formats:
        pdf_bytes = frappe.get_print(
            "Job Offer", jo_name, doc=jo_doc, print_format=pf, as_pdf=True
        )
        # One letter keeps the plain filename it has always had; several are
        # named after their format so the candidate can tell them apart.
        filename = f"{jo_name}.pdf" if single or not pf else f"{jo_name} - {pf}.pdf"
        documents.append((pdf_bytes, filename))

    return documents


def get_job_offer_pdf(job_offer):
    """Return ``(pdf_bytes, filename)`` for a Job Offer as a single document.

    Every configured letter, merged into one PDF when there is more than one, so
    callers that can only hand over a single file (the candidate's download, the
    preview panes) still give the candidate everything that was sent.

    Rendering costs one wkhtmltopdf subprocess per letter, and the preview and
    portal paths that call this are repeatable — ``preview_job_offer_html`` is a
    guest endpoint — so the result is cached briefly. The cache key carries the
    Job Offer's and every print format's ``modified`` stamp, so editing either
    the offer or a letter invalidates it instead of serving a stale document.
    Only a saved name is cached; passing a doc renders fresh, which is what the
    send path does.
    """
    cache_key = _offer_pdf_cache_key(job_offer) if isinstance(job_offer, str) else None
    if cache_key:
        cached = frappe.cache.get_value(cache_key)
        if cached:
            return cached["pdf"], cached["filename"]

    documents = get_job_offer_pdfs(job_offer)
    if not documents:
        return None, None

    jo_name = job_offer if isinstance(job_offer, str) else job_offer.get("name")
    if len(documents) == 1:
        pdf_bytes, filename = documents[0]
    else:
        pdf_bytes, filename = merge_pdfs(documents), f"{jo_name}.pdf"

    if cache_key and pdf_bytes:
        frappe.cache.set_value(
            cache_key,
            {"pdf": pdf_bytes, "filename": filename},
            expires_in_sec=OFFER_PDF_CACHE_TTL,
        )

    return pdf_bytes, filename


def _offer_pdf_cache_key(jo_name):
    """Cache key for a Job Offer's merged PDF, versioned on everything that can
    change what the PDF looks like. Returns None if the version cannot be read,
    which simply disables caching for that call."""
    import hashlib

    try:
        stamps = [str(frappe.db.get_value("Job Offer", jo_name, "modified"))]
        for pf in get_job_offer_print_formats(jo_name):
            stamps.append(str(frappe.get_cached_value("Print Format", pf, "modified")))
    except Exception:
        return None

    digest = hashlib.sha1("|".join([jo_name] + stamps).encode()).hexdigest()
    return f"job_offer_pdf::{digest}"


def render_job_offer_html(job_offer, print_format=None):
    """Render an offer letter as HTML for a browser rather than for a PDF.

    ``frappe.get_print`` stamps ``form_dict.pdf_generator`` whether or not a PDF
    is actually being produced, and a print format cannot tell the difference at
    render time. Formats that compensate for a PDF engine's quirks — the
    HomeFirst letters scale themselves up for an unpatched-Qt wkhtmltopdf — would
    therefore apply that compensation to on-screen HTML too. Pre-setting the
    marker to something that is not a PDF generator tells them this render is
    screen-bound.
    """
    previous = frappe.local.form_dict.get("pdf_generator")
    frappe.local.form_dict.pdf_generator = "screen"
    try:
        return frappe.get_print("Job Offer", job_offer, print_format=print_format)
    finally:
        if previous is None:
            frappe.local.form_dict.pop("pdf_generator", None)
        else:
            frappe.local.form_dict.pdf_generator = previous


def merge_pdfs(documents):
    """Concatenate ``[(pdf_bytes, filename), ...]`` into one PDF's bytes.

    Falls back to the first document if merging fails, so a download can never
    break on a malformed page tree.
    """
    import io

    try:
        from pypdf import PdfReader, PdfWriter

        writer = PdfWriter()
        for pdf_bytes, _filename in documents:
            for page in PdfReader(io.BytesIO(pdf_bytes)).pages:
                writer.add_page(page)
        merged = io.BytesIO()
        writer.write(merged)
        return merged.getvalue()
    except Exception:
        frappe.log_error(
            title="Job Offer PDF merge failed",
            message=frappe.get_traceback(),
        )
        return documents[0][0]


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
def download_job_offer_pdf(appl, token=None, separate=None):
    """Download Job Offer PDF for a given applicant — guest, token-gated.

    Default (``separate`` omitted / falsy): unchanged — streams ONE PDF file (all
    configured letters merged into a single document when there is more than one),
    exactly as before. Existing callers are unaffected.

    Opt-in (``separate`` truthy, e.g. ``&separate=1``): returns JSON instead, with
    each letter as its own base64 PDF, so the portal can show / download the letters
    individually (e.g. a trainee letter AND a permanent offer letter mapped to the
    same Employment Type)::

        {"jo_id": "...", "count": 2, "letters": [
            {"index": 0, "print_format": "Intern Offer Letter",
             "filename": "HR-OFF-... - Intern Offer Letter.pdf", "pdf_base64": "..."},
            ...
        ]}
    """
    if not appl:
        frappe.throw("Missing applicant parameter")
    # Desk/HR and the token-gated offer accept/reject page keep working exactly as
    # before. Additionally, a logged-in candidate downloading THEIR OWN offer is
    # allowed WITHOUT a link token — the candidate dashboard fetches this PDF after
    # login and has no offer token to pass. Any other caller still needs the token
    # (or Job Offer permission), so this does not open the endpoint up.
    if not _candidate_owns_applicant(appl):
        _authorize_offer(appl, token, "read")

    want_separate = cint(separate) if separate is not None else 0

    with as_administrator():
        # Newest first: once an offer has been resent, the older versions must
        # not be the letter the candidate is shown.
        jo_id = frappe.db.get_value("Job Offer", {
            "job_applicant": appl,
            "docstatus": ["!=", 2],
            "status": ["in", ["Draft", "Awaiting Response", "Accepted", "Rejected"]]
        }, order_by="creation desc")
        if not jo_id:
            frappe.throw("No active Job Offer found")

        jo_doc = frappe.get_doc("Job Offer", jo_id)

        # Opt-in: return every letter separately as base64 JSON.
        if want_separate:
            import base64

            # Same source of truth as the merged/email paths, so the letters here are
            # exactly the ones the candidate is sent — just kept separate.
            documents = get_job_offer_pdfs(jo_doc) or []
            # Print-format names in the same order, to label each letter (best-effort;
            # a Document-Template render collapses to a single doc with no format name).
            formats = get_job_offer_print_formats(jo_doc)

            letters = []
            for idx, (pdf_bytes, filename) in enumerate(documents):
                if not pdf_bytes:
                    continue
                letters.append({
                    "index": idx,
                    "print_format": formats[idx] if idx < len(formats) else None,
                    "filename": filename,
                    "pdf_base64": base64.b64encode(pdf_bytes).decode(),
                })

            return {"jo_id": jo_id, "count": len(letters), "letters": letters}

        # Default (unchanged): single merged PDF streamed as a file.
        pdf_content, filename = get_job_offer_pdf(jo_doc)

        frappe.local.response.filename = filename
        frappe.local.response.filecontent = pdf_content
        frappe.local.response.type = "pdf"


@frappe.whitelist(allow_guest=True)
def preview_job_offer_html(appl, token=None):
    """Return rendered print-format HTML for a given applicant — guest, token-gated."""
    if not appl:
        frappe.throw("Missing applicant parameter")
    _authorize_offer(appl, token, "read")

    with as_administrator():
        # Newest first: once an offer has been resent, the older versions must
        # not be the letter the candidate is shown.
        jo_id = frappe.db.get_value("Job Offer", {
            "job_applicant": appl,
            "docstatus": ["!=", 2],
            "status": ["in", ["Draft", "Awaiting Response", "Accepted", "Rejected"]]
        }, order_by="creation desc")
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
        elif is_document_template_offer_enabled():
            # Same call as the desk preview: no template admits this offer, so
            # there is no letter to show the candidate either.
            return {"html": template_unavailable_html(), "jo_id": jo_id, "available": False}

        formats = get_job_offer_print_formats(jo_id)

        # More than one letter cannot be shown as raw HTML without their
        # stylesheets colliding, so the candidate is shown the same merged PDF
        # the download gives them.
        if len(formats) > 1:
            import base64
            pdf_bytes, _fname = get_job_offer_pdf(jo_id)
            data_uri = "data:application/pdf;base64," + base64.b64encode(pdf_bytes).decode()
            html = (
                f'<iframe src="{data_uri}" style="width:100%; height:85vh; '
                f'border:1px solid #ddd;" title="Offer Letter"></iframe>'
            )
            return {"html": html, "jo_id": jo_id}

        html = render_job_offer_html(jo_id, formats[0] if formats else None)
        return {"html": html, "jo_id": jo_id}

# ---------------------------------------------------------------------------
# Culture Book — an optional company PDF, attached to every offer email and
# previewable from the candidate portal.
#
# Entirely driven by one setting (Recruitment Settings -> `culture_book`). With
# it blank the feature does not exist: the endpoint reports it as unavailable
# and the email attaches nothing. Every helper here is non-throwing for exactly
# that reason — a missing, deleted or unreadable file must never break an offer
# email or a portal page.
# ---------------------------------------------------------------------------

def get_culture_book_file_url():
    """The configured Culture Book's file URL, or None when not set up.

    Never raises — a site that has not migrated the field yet simply has no
    Culture Book.
    """
    try:
        return frappe.db.get_single_value("Recruitment Settings", "culture_book") or None
    except Exception:
        return None


def get_culture_book():
    """Return ``(pdf_bytes, filename)`` for the configured Culture Book.

    ``(None, None)`` when nothing is configured, or when the file it points at
    can no longer be read (deleted from disk, File doc removed). Callers treat
    that as "no culture book" and carry on.
    """
    file_url = get_culture_book_file_url()
    if not file_url:
        return None, None

    try:
        # The attachment is usually private, and the candidate reading it is a
        # guest — same reason every other candidate-facing read in this module
        # runs elevated.
        with as_administrator():
            content = _read_template_file_bytes(file_url)
        if not content:
            frappe.log_error(
                f"Culture Book file not readable: {file_url}", "Culture Book unavailable"
            )
            return None, None

        filename = (
            frappe.db.get_value("File", {"file_url": file_url}, "file_name")
            or file_url.rsplit("/", 1)[-1]
            or "Culture Book.pdf"
        )
        return content, filename
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Culture Book read failed")
        return None, None


def get_culture_book_attachment():
    """The Culture Book as a ``frappe.sendmail`` attachment dict, or None.

    Used to append the document to offer emails. None whenever there is nothing
    to attach, so callers can simply skip it.
    """
    content, filename = get_culture_book()
    if not content:
        return None
    return {
        "fname": filename,
        "fcontent": content,
        "content_type": "application/pdf",
    }


@frappe.whitelist(allow_guest=True)
def preview_culture_book(appl, token=None):
    """Stream the Culture Book PDF to the candidate — guest, token-gated.

    Mirrors `download_job_offer_pdf`: a logged-in candidate viewing THEIR OWN
    applicant needs no link token, anyone else needs the token (or Job Offer
    permission). Streams the file rather than returning base64, since the
    document can be large.

    When no Culture Book is configured (or its file cannot be read) this returns
    ``{"available": False}`` as JSON instead of throwing, so a portal that calls
    it unconditionally simply gets "nothing to show" and can hide the button.
    """
    if not appl:
        frappe.throw("Missing applicant parameter")
    if not _candidate_owns_applicant(appl):
        _authorize_offer(appl, token, "read")

    content, filename = get_culture_book()
    if not content:
        return {"available": False}

    frappe.local.response.filename = filename
    frappe.local.response.filecontent = content
    frappe.local.response.type = "pdf"


@frappe.whitelist(allow_guest=True)
def has_culture_book(appl=None, token=None):
    """Whether a Culture Book is configured — for showing/hiding the portal button
    without downloading the document.

    ``appl``/``token`` are accepted and honoured when given, so the portal can call
    it with the same arguments as the preview. Only ever reports the presence of a
    site-wide setting, never candidate data.
    """
    if appl and not _candidate_owns_applicant(appl):
        _authorize_offer(appl, token, "read")
    return {"available": bool(get_culture_book_file_url())}


@frappe.whitelist(allow_guest=True)
def get_job_offer_status(appl, token=None):
    _authorize_offer(appl, token, "read")
    from recruitment.api.offer_lifecycle import current_offer_name
    jo_id = current_offer_name(appl)
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
        # The version in play, not an older withdrawn / declined one.
        from recruitment.api.offer_lifecycle import current_offer_name
        jo_id = current_offer_name(appl)
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

            # The raw status write above fires no doc_events, so the requisition
            # position this offer was holding would stay Filled. Reopen it now —
            # same routine the hooks run. Best-effort: must never block the rejection.
            try:
                from recruitment.api.offer_position import sync_offer_position
                from recruitment.api.hiring_stage import record_offer_event
                offer_doc = frappe.get_doc("Job Offer", jo_id)
                sync_offer_position(offer_doc)
                # Same history row advance_on_job_offer_outcome writes for a
                # rejection saved on the form, which this raw write bypasses.
                record_offer_event(offer_doc, "Rejected", notes="Job Offer declined")
            except Exception:
                frappe.log_error(frappe.get_traceback(), "job_offer_update: position release failed")
        frappe.db.set_value("Job Offer", jo_id, "docstatus", 1)

        if status in ("Accepted", "Rejected"):
            from recruitment.api.action_center import mark_item_completed
            mark_item_completed(
                reference_doctype="Job Offer",
                reference_docname=jo_id,
                candidate_id=appl,
                commit=True,
            )

        # Guarantee the Employee Onboarding is materialized on acceptance,
        # independently of the Job Offer's docstatus. sync_job_offer_action_item
        # (which normally creates the EO) is wired only to after_insert / on_submit /
        # on_update_after_submit, so an offer still in draft (docstatus 0) when the
        # candidate accepts never triggers it — the raw docstatus flip above fires no
        # hooks either. Calling the same routine here mirrors exactly what the hook
        # does; it is idempotent (re-uses an existing EO) and DPDP-aware (defers when
        # consent is enforced), so it is safe even when the hook also runs. When DPDP
        # consent is enabled the dedicated consent-submission flow creates the EO, so
        # we skip here to avoid the pre-consent side effects.
        if status == "Accepted" and not is_dpdp_consent_enabled():
            try:
                from recruitment.api.action_center import _sync_onboarding_action_for_applicant
                candidate_email = frappe.db.get_value("Job Applicant", appl, "email_id")
                if candidate_email:
                    _sync_onboarding_action_for_applicant(appl, candidate_email)
                    frappe.db.commit()
            except Exception:
                frappe.log_error(
                    frappe.get_traceback(),
                    "job_offer_update: ensure onboarding on accept failed",
                )

        webform = frappe.db.get_single_value("Recruitment Settings", "employee_onboarding_webform") or ""

        # On acceptance, tell the portal whether the DPDP consent page must be
        # shown before onboarding. False (default) => behaves exactly as before.
        dpdp_consent_required = is_dpdp_consent_enabled() if status == "Accepted" else False

        result = {
            "jo_id": jo_id,
            "webform": webform,
            "dpdp_consent_required": dpdp_consent_required,
        }

        # External consent mode: the notices live on a partner portal, so acceptance
        # is also where we start the consent session and hand the frontend the link
        # to redirect the candidate to. Internal-form sites get nothing extra here
        # and keep using their own consent page. Best-effort — a partner outage must
        # not undo an acceptance the candidate has already made; the candidate can be
        # re-issued a link from the action center (start_consent_session).
        if dpdp_consent_required:
            from recruitment.dpdp_external_consent import (
                get_or_start_session,
                is_external_consent_mode,
            )

            if is_external_consent_mode():
                result["dpdp_consent_mode"] = "External Portal"
                try:
                    session = get_or_start_session(appl)
                    result["dpdp_consent_url"] = session["short_url"]
                    result["dpdp_consent_session"] = session["session_id"]
                except Exception:
                    frappe.log_error(
                        frappe.get_traceback(),
                        "job_offer_update: DPDP consent session start failed",
                    )
                    # The acceptance itself stands. Drop the queued failure message so
                    # the candidate is not shown an error for a step that runs behind
                    # the scenes — the null URL tells the frontend to retry via
                    # start_consent_session instead.
                    frappe.clear_messages()
                    result["dpdp_consent_url"] = None
            else:
                result["dpdp_consent_mode"] = "Internal Form"

        return result
    finally:
        frappe.flags.ignore_permissions = original_ignore


@frappe.whitelist(allow_guest=True)
def get_job_offer_summary(appl, token=None):
    _authorize_offer(appl, token, "read")
    original_ignore = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        from recruitment.api.offer_lifecycle import current_offer_name
        jo_id = current_offer_name(appl)
        if not jo_id:
            return {}

        jo = frappe.get_doc("Job Offer", jo_id)

        duration = jo.get("custom_duration")
        expected_doj = jo.get("custom_expected_doj")
        # A Trainee is sent two letters that start on different days: the traineeship
        # begins on this date, the permanent role on Expected DOJ. Only Trainee offers
        # carry it, so it stays None everywhere else rather than repeating the other
        # date and implying the two are the same
        # (recruitment.patches.add_trainee_joining_date).
        trainee_doj = jo.get("custom_trainee_doj")
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
            designation_name = frappe.get_cached_value("Designation", jo.designation, "custom_designation_title") or jo.designation

        # --- Compensation: dynamic by Employment Type -----------------------
        # Employment Type (custom_employment_type -> Employment Type Link) is read
        # from the Job Offer, then the Job Applicant, then the Job Opening (see
        # _resolve_offer_employment_type). Resolve it to its title ("Intern",
        # "Employee", ...). Only Intern carries a single Stipend; every other type
        # carries Fixed (Base) + Variable (Variable Incentive) + Total. Raw numeric
        # amounts are returned as-is — formatting is done on the UI.
        employment_type = None
        et_id = _resolve_offer_employment_type(jo)
        if et_id:
            employment_type = frappe.get_cached_value("Employment Type", et_id, "employee_type_name") or et_id

        is_intern = (employment_type or "").strip().lower() == "intern"

        def num(value):
            """Raw amount with no trailing .0 — whole numbers become int
            (38000.0 -> 38000), real decimals are kept (2000.5 -> 2000.5)."""
            v = flt(value)
            return int(v) if v == int(v) else v

        # --- Compensation: driven by what's actually on the offer ---------------
        # Populate the stipend and/or the fixed/variable/total fields based on which
        # amounts are present, independent of role. Normally only one set is filled
        # (a stipend for a trainee, or fixed pay for an employee); a Trainee sent BOTH
        # a stipend letter and a fixed-pay letter simply has both filled, so the UI
        # shows whichever section(s) are non-null. When nothing is filled the role
        # default keeps the original shape (stipend for Intern, else fixed).
        stipend_val = flt(stipend)
        fixed_val = flt(jo.get("custom_total_fixed_pay") or jo.get("custom_base_salary"))
        variable_val = flt(jo.get("custom_variable_incentive"))
        # Location Allowance defaults from the offer's Location master and is
        # editable per offer; it is part of CTC (Total Fixed Pay + Incentive +
        # Location Allowance) but was missing here, so the total came out short
        # whenever it was filled.
        location_val = flt(jo.get("custom_location_allowance"))
        # The offer's own stored CTC. Preferred for the total so the portal shows
        # exactly the figure on the letter rather than re-deriving it. Blank on
        # offers that never went through the CTC computation, hence the fallback.
        ctc_val = flt(jo.get("custom_ctc"))
        has_stipend = stipend_val > 0
        has_fixed = fixed_val > 0 or variable_val > 0 or location_val > 0 or ctc_val > 0

        total_val = ctc_val if ctc_val > 0 else (fixed_val + variable_val + location_val)

        compensation = {
            "compensation_type": None,
            "stipend": None,
            "fixed": None,
            "variable": None,
            # Null when the offer carries no location allowance, so the UI can
            # simply skip the row — same convention as every other field here.
            "location_allowance": None,
            # Fixed pay with the location allowance folded in — the single
            # "Total Fixed Pay" line the portal shows. `fixed` and
            # `location_allowance` stay as they were for any other consumer.
            "total_fixed": None,
            "total": None,
        }

        # Raw amounts only — the portal formats them itself.
        if has_stipend:
            compensation["stipend"] = num(stipend_val)
        if has_fixed:
            compensation["fixed"] = num(fixed_val)
            compensation["variable"] = num(variable_val)
            compensation["total"] = num(total_val)
        if location_val > 0:
            compensation["location_allowance"] = num(location_val)

        # Nothing filled -> fall back to the original role-based default so the
        # response shape and values are unchanged for those offers.
        if not has_stipend and not has_fixed:
            if is_intern:
                compensation["stipend"] = num(stipend_val)
            else:
                compensation["fixed"] = num(fixed_val)
                compensation["variable"] = num(variable_val)
                compensation["total"] = num(total_val)

        # Filled wherever `fixed` is, so the UI can rely on one field for the row.
        if compensation["fixed"] is not None:
            compensation["total_fixed"] = num(fixed_val + location_val)

        # Hint for the UI: "both" when a stipend AND fixed pay are present (the
        # trainee dual-letter case), else the single kind as before.
        if has_stipend and has_fixed:
            compensation["compensation_type"] = "both"
        elif has_stipend:
            compensation["compensation_type"] = "stipend"
        elif has_fixed:
            compensation["compensation_type"] = "fixed_variable"
        else:
            compensation["compensation_type"] = "stipend" if is_intern else "fixed_variable"

        duration_display = (
            f"{duration} Month{'s' if int(duration) != 1 else ''}" if duration else None
        )

        return {
            "applicant_name": f"{jo.get('applicant_name') or ''} {jo.get('applicant_last_name') or ''}".strip(),
            "designation": designation_name or "Intern",
            "duration_display": duration_display,
            "expected_doj_display": formatdate(expected_doj) if expected_doj else None,
            # Always present, null when the offer has no traineeship date, so the
            # response shape does not change between offers.
            "trainee_doj_display": formatdate(trainee_doj) if trainee_doj else None,
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
        # With the Document Template path switched on, "nothing resolved" means no
        # template's assignment admits this offer — a configuration gap HR has to
        # close, not something the recruiter can fix on the form. Say so in the
        # same words every other surface uses. Off, the old hint still applies:
        # the letter comes from a Print Format and the picker is optional.
        if is_document_template_offer_enabled():
            return {"html": template_unavailable_html(), "available": False}
        # The path is switched off site-wide, so this tab has nothing to show and
        # the Offer Letter Template field is inert — the letter comes from a Print
        # Format, which the Preview tab beside this one renders. Say which of the
        # two is in force rather than implying a template is missing.
        return {
            "html": (
                "<div style='padding:40px 32px;text-align:center;color:#8d99a6;"
                "font-size:13px;line-height:1.7;'>"
                + frappe.utils.escape_html(
                    _("Job Offers are rendered from a Print Format on this site.")
                )
                + "<br>"
                + frappe.utils.escape_html(
                    _("Turn on 'Send Job Offer via Document Template' in Recruitment "
                      "Settings to use offer letter templates.")
                )
                + "</div>"
            ),
            "enabled": False,
        }
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

    Uses the resolved Document Template (embedded PDF), or the Print Format when
    the Document Template path is switched off. With it ON and no template
    admitting this offer there is no preview at all — see the branch below.
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
    elif is_document_template_offer_enabled():
        # The letter is meant to come from a Document Template and none admits
        # this offer. Falling through to a Print Format here would show a letter
        # the candidate will never be sent, which is worse than showing nothing —
        # so the preview is withheld and the gap is named instead. The send is
        # blocked at submit by validate_offer_document_template.
        return {"html": template_unavailable_html(), "source": "unavailable", "available": False}
    # Fall back to the Print Format preview.  An Employment Type mapped to several
    # letters gets one pane per letter rather than a single merged document: a
    # Management Trainee is sent the trainee letter AND the permanent offer letter
    # as two separate attachments, and a preview that glues them into one PDF
    # misrepresents that — you cannot see where one ends, and saving from the
    # viewer hands you both stapled together under one name.  One PDF per pane
    # keeps the preview honest and lets each be read, printed and saved alone.
    formats = get_job_offer_print_formats(job_offer)
    if len(formats) > 1:
        import base64

        panes = []
        for idx, (pdf_bytes, filename) in enumerate(get_job_offer_pdfs(job_offer) or []):
            if not pdf_bytes:
                continue
            label = formats[idx] if idx < len(formats) else filename
            data_uri = "data:application/pdf;base64," + base64.b64encode(pdf_bytes).decode()
            panes.append(
                f'<div class="ol-letter">'
                f'<div class="ol-letter-head">'
                f'<span class="ol-letter-no">{idx + 1} / {len(formats)}</span>'
                f'<span class="ol-letter-name">{escape_html(label)}</span>'
                f'</div>'
                f'<iframe src="{data_uri}" style="width:100%;height:78vh;border:1px solid #e0e0e0;'
                f'border-top:none;border-radius:0 0 6px 6px;" title="{escape_html(label)}"></iframe>'
                f'</div>'
            )

        if panes:
            return {
                "html": (
                    '<div class="ol-letters">'
                    f'<div class="ol-letters-note">{_("This offer is sent as {0} separate letters.").format(len(panes))}</div>'
                    + "".join(panes)
                    + "</div>"
                ),
                "source": "print_format",
            }

    from urllib.parse import urlencode
    params = {"doctype": "Job Offer", "name": job_offer, "trigger_print": 0, "no_letterhead": 0}
    pf = formats[0] if formats else None
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

    # Document Template (when enabled) or Print Format(s). An Employment Type
    # mapped to more than one print format is sent one attachment per letter —
    # Management Trainees get the trainee letter and the permanent offer letter.
    pdf_attachments = [
        {
            "fname": filename,  # Name of the file
            "fcontent": output_pdf,  # Byte content of the file
            "content_type": "application/pdf",  # Content type of the file
        }
        for output_pdf, filename in get_job_offer_pdfs(jo_doc)
    ]
    frappe.sendmail(
        attachments=pdf_attachments,
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
        return doc
        