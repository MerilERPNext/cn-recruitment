"""Campus Hiring channel — openings posted for campus drives.

Endpoints
---------
Candidate-portal (cookie-auth) channel flow:
GET  recruitment.api.channels.campus.list_openings
GET  recruitment.api.channels.campus.get_application_fields(opening)
POST recruitment.api.channels.campus.submit_application(job_applicant_email, job_opening, form_data, status)
GET  recruitment.api.channels.campus.get_draft(job_applicant_email, job_opening=None)
POST recruitment.api.channels.campus.delete_draft(job_applicant_email, job_opening)
GET  recruitment.api.channels.campus.get_applied_jobs(email)

Campus-Invite (TPO drive) flow — invite id carried in the email link (no token):
GET  recruitment.api.channels.campus.get_invite_openings(campus_invite, email=None)
GET  recruitment.api.channels.campus.get_application_fields(opening)      [campus-enabled fields]
POST recruitment.api.channels.campus.submit_invite_application(campus_invite, job_opening, email, form_data)

The candidate NEVER chooses an invite. Each TPO registration email is tied to one
Campus Invite and its link carries that invite id (built by
recruitment.link_token.campus_registration_link). The candidate clicks -> signup ->
signin; the frontend keeps campus_invite from the URL and passes it to the calls
above. Form fields come from the shared get_application_fields(opening), which returns
the opening's campus-enabled fields. Access is gated by the TPO registration
(is_email_registered_for_invite), so there is no per-candidate token that could fail.
submit stamps the invite + its institute onto the created Job Applicant
(custom_campus_invite / custom_institute).

Auth
----
The channel endpoints (list_openings, submit_application, …) require a valid
candidate portal session (same cookie-based auth as the Careers channel).

The Campus-Invite endpoints (`*_invite_*`) are guest-accessible because campus
candidates are registered by their TPO and have no portal login. They are instead
gated by the TPO registration: a Job Applicant is only created when the candidate's
email was registered (via a submitted Candidate Registration) against that exact
Campus Invite. An unregistered email is rejected with "not registered".

Application lifecycle
---------------------
Draft → candidate saves partial progress; status "draft" (not a real application).
Submit → status "open", mandatory campus fields validated, duplicate blocked.
"""

import frappe
from frappe.utils import cint, getdate

from recruitment.api.candidate_auth import (
    candidate_required,
    enforce_candidate_identity,
    get_current_candidate,
)
from recruitment.recruitment.doctype.candidate_registration.candidate_registration import (
    is_email_registered_for_invite,
)

from . import _common


CHANNEL = "campus"
APPLICANT_DOCTYPE = "Job Applicant"
DRAFT_STATUS = "Draft"
SUBMIT_STATUS = "Open"

_STATUS_ALIASES = {
    "draft": DRAFT_STATUS,
    "submit": SUBMIT_STATUS,
    "submitted": SUBMIT_STATUS,
    "open": SUBMIT_STATUS,
}


def _ok(message, data, http=200):
    frappe.local.response["http_status_code"] = http
    return {"success": True, "message": message, "data": data}


def _err(message, http=400):
    frappe.local.response["http_status_code"] = http
    return {"success": False, "message": message, "data": None}


def _resolve_status(status):
    resolved = _STATUS_ALIASES.get((status or "draft").strip().lower())
    if not resolved:
        frappe.throw(frappe._("status must be one of: draft, submit, open"))
    return resolved


def _coerce_form_data(form_data):
    if form_data in (None, ""):
        return {}
    if isinstance(form_data, str):
        try:
            parsed = frappe.parse_json(form_data)
        except Exception:
            frappe.throw(frappe._("form_data must be valid JSON."))
        if not isinstance(parsed, dict):
            frappe.throw(frappe._("form_data must be a JSON object."))
        return parsed
    if isinstance(form_data, dict):
        return form_data
    frappe.throw(frappe._("form_data must be a JSON object or JSON string."))


_TEXTUAL_FIELDTYPES = {
    "Data", "Small Text", "Text", "Long Text", "Text Editor", "Code",
    "HTML Editor", "Markdown Editor", "Select", "Link", "Dynamic Link",
    "Attach", "Attach Image", "Read Only", "Password", "Phone", "Signature",
    "Barcode", "Color", "JSON", "Geolocation",
}


def _clean_value_for_field(df, value):
    if df.fieldtype in ("Table", "Table MultiSelect"):
        return value if isinstance(value, list) else []
    if value == "" and df.fieldtype not in _TEXTUAL_FIELDTYPES:
        return None
    return value


def _apply_form_data(doc, payload):
    meta = doc.meta
    for fieldname, value in payload.items():
        df = meta.get_field(fieldname)
        if not df:
            continue
        if df.fieldtype in ("Table", "Table MultiSelect"):
            doc.set(fieldname, [])
            if not isinstance(value, list):
                continue
            child_meta = frappe.get_meta(df.options)
            for row in value:
                if not isinstance(row, dict):
                    continue
                clean = {}
                for k, v in row.items():
                    cdf = child_meta.get_field(k)
                    if not cdf:
                        continue
                    clean[k] = _clean_value_for_field(cdf, v)
                doc.append(fieldname, clean)
        else:
            doc.set(fieldname, _clean_value_for_field(df, value))


def _find_draft(email, opening):
    return frappe.db.get_value(
        APPLICANT_DOCTYPE,
        {"email_id": email, "job_title": opening, "status": DRAFT_STATUS},
        "name",
        order_by="modified desc",
    )


def _applied_openings(email, opening_names):
    if not email or not opening_names:
        return set()
    return set(
        frappe.get_all(
            APPLICANT_DOCTYPE,
            filters={
                "email_id": email,
                "job_title": ["in", list(opening_names)],
                "status": ["!=", DRAFT_STATUS],
            },
            pluck="job_title",
        )
    )


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@candidate_required
def list_openings(search_term=None, filters=None, email=None, page=None, limit=None):
    """List openings active on the Campus Hiring channel for the authenticated candidate.

    Returns ``{"columns": [...], "openings": [...], "pagination": {...}}``
    Each opening carries ``"applied": true/false``.
    """
    columns = _common.get_configured_columns(CHANNEL)
    extra_fields = [c["fieldname"] for c in columns]
    selected = _common.parse_filter_values(filters)
    names = _common.get_openings_active_on_channel(CHANNEL)
    cards = (_common.get_opening_card(n, extra_fields=extra_fields) for n in names)
    openings = [
        c for c in cards
        if c and _common.card_matches_search(c, search_term)
        and (not selected or _common.card_matches_filters(c, selected, []))
    ]

    total = len(openings)
    page = max(cint(page), 1)
    limit = cint(limit)
    if limit > 0:
        start = (page - 1) * limit
        openings = openings[start:start + limit]
        total_pages = -(-total // limit)
        has_more = page < total_pages
    else:
        total_pages = 1
        has_more = False
    pagination = {"total": total, "page": page, "limit": limit,
                  "total_pages": total_pages, "has_more": has_more}

    check_email = (email or get_current_candidate() or "").strip().lower()
    if email and check_email:
        enforce_candidate_identity(email=check_email)
    page_names = [c["name"] for c in openings]
    applied = _applied_openings(check_email, page_names)
    for c in openings:
        c["applied"] = c["name"] in applied

    return {"columns": columns, "openings": openings, "pagination": pagination}


@candidate_required
def get_application_fields(opening):
    """Campus application fields for `opening` — the fields configured as campus-enabled
    (view_campus) on that Job Opening — pre-filled from any existing Draft for this
    candidate. Used by both the campus channel and the Campus Invite (TPO drive) flow;
    the opening is accepted as-is, so an invite's opening works without being separately
    posted on the campus channel."""
    if not opening:
        frappe.throw(frappe._("opening is required"))
    if not frappe.db.exists("Job Opening", opening):
        frappe.throw(frappe._("Invalid job opening."))

    candidate_email = (get_current_candidate() or "").strip().lower()
    job_applicant = None
    if candidate_email:
        job_applicant = frappe.db.get_value(
            APPLICANT_DOCTYPE,
            {"email_id": candidate_email, "job_title": opening, "status": DRAFT_STATUS},
            "name",
            order_by="modified desc",
        ) or frappe.db.get_value(
            APPLICANT_DOCTYPE,
            {"email_id": candidate_email, "job_title": opening},
            "name",
            order_by="modified desc",
        )
    return _common.get_application_fields_for_channel(opening, CHANNEL, job_applicant=job_applicant)


@candidate_required
def submit_application(job_applicant_email, job_opening, form_data=None, status="draft"):
    """Create or update the campus candidate's Job Applicant.

    status "draft"  → partial save, mandatory fields not enforced.
    status "submit" → full validation, duplicate blocked.
    """
    if not job_opening:
        return _err("job_opening is required.", 400)
    opening = job_opening.strip()
    if opening not in _common.get_openings_active_on_channel(CHANNEL):
        return _err("This opening is not currently posted on the campus channel.", 400)

    target_status = _resolve_status(status)

    email = (job_applicant_email or get_current_candidate() or "").strip().lower()
    if not email:
        return _err("job_applicant_email is required.", 400)
    enforce_candidate_identity(email=email)

    payload = _coerce_form_data(form_data)
    existing_draft = _find_draft(email, opening)

    if target_status == SUBMIT_STATUS:
        existing = frappe.db.get_value(
            APPLICANT_DOCTYPE,
            {"email_id": email, "job_title": opening, "status": ["!=", DRAFT_STATUS]},
            "name",
        )
        if existing:
            return _err(f"You have already applied to this opening ({existing}).", 409)
        payload = _common.assert_field_set_for_channel(opening, CHANNEL, payload)

    try:
        if existing_draft:
            doc = frappe.get_doc(APPLICANT_DOCTYPE, existing_draft)
            created = False
        else:
            doc = frappe.new_doc(APPLICANT_DOCTYPE)
            created = True

        _apply_form_data(doc, payload)
        doc.email_id = email
        doc.job_title = opening
        doc.status = target_status

        if target_status == SUBMIT_STATUS:
            source = _common.source_value_for(CHANNEL)
            if source and not doc.get("source"):
                doc.source = source

        if created:
            doc.insert(ignore_permissions=True)
        else:
            doc.save(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "campus.submit_application failed")
        return _err(f"Unable to save application: {type(e).__name__}: {e}", 500)

    # On a real submission, score the candidate against the opening's eligibility
    # rules → Shortlisted (pass) or Hold + "Eligibility Not Met" (knock-out fail).
    if target_status == SUBMIT_STATUS:
        from recruitment.recruitment.eligibility_engine import evaluate_eligibility
        evaluate_eligibility(doc)

    if target_status == DRAFT_STATUS:
        message = "Application draft created." if created else "Application draft updated."
    else:
        message = "Application submitted." if created else "Application submitted from draft."

    return _ok(
        message,
        {"name": doc.name, "job_opening": opening, "status": doc.status, "created": created},
        http=201 if created else 200,
    )


@candidate_required
def get_draft(job_applicant_email, job_opening=None):
    """This candidate's Draft campus applications, optionally scoped to one opening."""
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    email = job_applicant_email.strip().lower()
    enforce_candidate_identity(email=email)

    filters = {"email_id": email, "status": DRAFT_STATUS}
    if job_opening:
        filters["job_title"] = job_opening.strip()

    names = frappe.get_all(
        APPLICANT_DOCTYPE, filters=filters, pluck="name", order_by="modified desc"
    )
    drafts = [
        {
            "name": n,
            "job_opening": frappe.db.get_value(APPLICANT_DOCTYPE, n, "job_title"),
            "modified": frappe.db.get_value(APPLICANT_DOCTYPE, n, "modified"),
        }
        for n in names
    ]
    return _ok(f"Fetched {len(drafts)} draft(s).", drafts)


@candidate_required
def delete_draft(job_applicant_email, job_opening):
    """Delete this candidate's Draft campus application for `job_opening`."""
    if not job_applicant_email:
        return _err("job_applicant_email is required.", 400)
    if not job_opening:
        return _err("job_opening is required.", 400)
    email = job_applicant_email.strip().lower()
    enforce_candidate_identity(email=email)

    name = _find_draft(email, job_opening.strip())
    if not name:
        return _err("No draft application found for this opening.", 404)

    try:
        frappe.delete_doc(APPLICANT_DOCTYPE, name, ignore_permissions=True, force=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "campus.delete_draft failed")
        return _err(f"Unable to delete draft: {type(e).__name__}: {e}", 500)

    return _ok("Draft deleted.", {"job_opening": job_opening, "deleted_draft": name})


@candidate_required
def get_applied_jobs(email):
    """All submitted (non-Draft) campus applications for this candidate."""
    enforce_candidate_identity(email=email)

    rows = frappe.get_all(
        APPLICANT_DOCTYPE,
        filters={"email_id": email, "source": _common.SOURCE_NAME[CHANNEL], "status": ["!=", DRAFT_STATUS]},
        fields=["name", "job_title", "status", "creation"],
        order_by="creation desc",
    )

    applications = []
    for r in rows:
        opening = frappe.db.get_value(
            "Job Opening", r.job_title,
            ["job_title", "designation", "department", "company", "location", "status"],
            as_dict=True,
        ) or {}
        applications.append({
            "name": r.name,
            "job_opening": r.job_title,
            "job_title": opening.get("job_title") or r.job_title,
            "designation": opening.get("designation"),
            "department": opening.get("department"),
            "company": opening.get("company"),
            "location": opening.get("location"),
            "opening_status": opening.get("status"),
            "application_status": r.status,
            "applied_on": r.creation,
        })

    return _ok(f"Fetched {len(applications)} application(s).", applications)


# ---------------------------------------------------------------------------
# Campus-Invite (TPO drive) flow — guest-accessible, gated by TPO registration
# ---------------------------------------------------------------------------

def _get_submitted_invite(campus_invite):
    """Return {name, campus_invite_name, status} for a *live* Campus Invite, or None.

    Openings are only exposed for an invite that has actually been sent (submitted)
    and is not yet Completed. Institutes live in the `institutes` child table (an
    invite can carry several) — read them with `_invite_institutes`.
    """
    if not campus_invite:
        return None
    row = frappe.db.get_value(
        "Campus Invite",
        campus_invite,
        ["name", "campus_invite_name", "status", "docstatus"],
        as_dict=True,
    )
    if not row or row.docstatus != 1 or row.status == "Completed":
        return None
    return row


def _invite_institutes(campus_invite):
    """Institutes invited on this Campus Invite."""
    from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

    return get_invite_institutes(campus_invite)


def _candidate_institute(email, campus_invite):
    """The institute this candidate was registered under for the invite.

    With several institutes per invite the candidate's own institute comes from the
    Candidate Registration a TPO submitted them on, never from the invite itself.
    """
    from recruitment.recruitment.doctype.candidate_registration.candidate_registration import (
        get_registered_institute,
    )

    return get_registered_institute(email, campus_invite)


def _invite_opening_names(campus_invite):
    """Ordered Job Opening names listed on the Campus Invite's `job_openings` table."""
    return frappe.get_all(
        "Campus Invite Job Opening",
        filters={
            "parenttype": "Campus Invite",
            "parentfield": "job_openings",
            "parent": campus_invite,
        },
        pluck="job_opening",
        order_by="idx asc",
    )


@frappe.whitelist(allow_guest=True)
def get_invite_openings(campus_invite, email=None):
    """Job Openings offered on a Campus Invite, for the frontend to show the candidate.

    The invite id comes straight from the URL the candidate arrived on (no token).
    Returns ``{"campus_invite", "campus_invite_name", "institutes", "institute",
    "openings": [...]}``. ``institutes`` is every institute invited; ``institute`` is
    this candidate's own (resolved from their Candidate Registration, and only when
    `email` is supplied). Each opening includes ``job_opening`` (id to pass to the
    next calls), ``job_title`` (for display) plus designation/department/location/
    status, and ``applied`` (true/false when `email` is supplied)."""
    invite = _get_submitted_invite(campus_invite)
    if not invite:
        return _err("Invalid or unsent campus invite.", 404)

    names = _invite_opening_names(invite.name)
    cards = [c for c in (_common.get_opening_card(n) for n in names) if c]

    check_email = (email or "").strip().lower()
    applied = _applied_openings(check_email, [c["name"] for c in cards]) if check_email else set()
    for c in cards:
        # Explicit id alias so the frontend passes `job_opening` to fields/submit,
        # and keep `job_title` front-and-centre for the opening list display.
        c["job_opening"] = c["name"]
        c["job_title"] = c.get("job_title") or c["name"]
        c["applied"] = c["name"] in applied

    return _ok(f"Fetched {len(cards)} opening(s).", {
        "campus_invite": invite.name,
        "campus_invite_name": invite.campus_invite_name,
        "institutes": _invite_institutes(invite.name),
        "institute": _candidate_institute(check_email, invite.name) if check_email else None,
        "openings": cards,
    })


@frappe.whitelist(allow_guest=True)
def submit_invite_application(campus_invite, job_opening, email, form_data=None):
    """Create a campus Job Applicant for a candidate applying via a Campus Invite.

    The candidate is created ONLY when their email was registered by a TPO (a
    submitted Candidate Registration) against this exact Campus Invite. Otherwise
    nothing is created and a "not registered" response is returned. The invite id
    comes from the URL the candidate arrived on — no per-candidate token to fail.
    """
    invite = _get_submitted_invite(campus_invite)
    if not invite:
        return _err("Invalid or unsent campus invite.", 404)

    opening = (job_opening or "").strip()
    if not opening or opening not in _invite_opening_names(invite.name):
        return _err("This opening is not part of this campus invite.", 400)

    candidate_email = (email or "").strip().lower()
    if not candidate_email:
        return _err("email is required.", 400)

    # The gate: the candidate must have been registered by their TPO against THIS
    # campus invite, else no Job Applicant is created.
    if not is_email_registered_for_invite(candidate_email, invite.name):
        return _err(
            "You are not registered for this campus drive. Please contact your TPO to get registered.",
            403,
        )

    # Block a second application to the same opening.
    existing = frappe.db.get_value(
        APPLICANT_DOCTYPE,
        {"email_id": candidate_email, "job_title": opening, "status": ["!=", DRAFT_STATUS]},
        "name",
    )
    if existing:
        return _err(f"You have already applied to this opening ({existing}).", 409)

    payload = _coerce_form_data(form_data)
    payload = _common.assert_field_set_for_channel(opening, CHANNEL, payload)

    try:
        doc = frappe.new_doc(APPLICANT_DOCTYPE)
        _apply_form_data(doc, payload)
        doc.email_id = candidate_email
        doc.job_title = opening
        doc.status = SUBMIT_STATUS
        source = _common.source_value_for(CHANNEL)
        if source and not doc.get("source"):
            doc.source = source
        # Campus provenance so HR can filter these candidates by institute / drive.
        # The invite may carry several institutes, so the candidate's own institute
        # comes from the Candidate Registration they were registered on.
        candidate_institute = _candidate_institute(candidate_email, invite.name)
        if candidate_institute and doc.meta.has_field("custom_institute"):
            doc.custom_institute = candidate_institute
        if doc.meta.has_field("custom_campus_invite"):
            doc.custom_campus_invite = invite.name
        doc.insert(ignore_permissions=True)
        _link_portal_user(candidate_email, doc.name)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "campus.submit_invite_application failed")
        return _err(f"Unable to submit application: {type(e).__name__}: {e}", 500)

    # Score the candidate against the opening's eligibility rules → Shortlisted
    # (pass) or Hold + "Eligibility Not Met" (knock-out fail).
    from recruitment.recruitment.eligibility_engine import evaluate_eligibility
    evaluate_eligibility(doc)

    return _ok(
        "Application submitted.",
        {
            "name": doc.name,
            "job_opening": opening,
            "campus_invite": invite.name,
            "institute": candidate_institute,
            "status": doc.status,
        },
        http=201,
    )


def _link_portal_user(email, job_applicant):
    """Point the candidate's Portal User at the Job Applicant they just created, so
    their portal resolves a primary applicant. We store ONLY this convenience link —
    never a specific invite: a candidate can apply through several invites, so the
    per-application invite/institute live on the Job Applicant, and the full set of
    invites is derived on demand (see get_my_invites)."""
    cpu = frappe.db.get_value("Candidate Portal User", {"email": email}, "name")
    if not cpu:
        return
    if not frappe.db.get_value("Candidate Portal User", cpu, "job_applicant"):
        frappe.db.set_value("Candidate Portal User", cpu, "job_applicant", job_applicant)
