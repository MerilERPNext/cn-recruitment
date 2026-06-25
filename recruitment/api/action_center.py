from urllib.parse import urlencode

import frappe
from frappe import _
from frappe.utils import now_datetime

ACTION_DOCTYPE = "Candidate Action Center Item"
SETTINGS_DOCTYPE = "Action Center Settings"


def _resolve_action_item_title(reference_doctype):
    """Configurable, per-DocType card title shown on the candidate Action Center.

    Reads the `Title by DocType` table on the `Action Center Settings` single and
    returns the title mapped to `reference_doctype`. Returns "" when there is no
    mapping (or on any error) so action-item creation is never blocked — the card
    then simply shows no title (UI falls back to its previous behaviour)."""
    if not reference_doctype:
        return ""
    try:
        settings = frappe.get_cached_doc(SETTINGS_DOCTYPE)
    except Exception:
        return ""
    for row in (settings.get("title_mappings") or []):
        if row.reference_doctype == reference_doctype:
            return (row.title or "").strip()
    return ""


def _resolve_candidate_email(candidate_id=None, candidate_email=None):
    if candidate_email:
        return candidate_email.strip().lower()

    if candidate_id:
        if not frappe.db.exists("Job Applicant", candidate_id):
            frappe.throw(_("Job Applicant not found: {0}").format(candidate_id))
        email = frappe.db.get_value("Job Applicant", candidate_id, "email_id")
        if email:
            return email.strip().lower()

    frappe.throw(_("Candidate email is required."))


def _upsert_minimal_item(
    candidate_email,
    reference_doctype,
    reference_docname,
    description="",
    attachment="",
    redirect_url="",
    commit=False,
):
    candidate_email = _resolve_candidate_email(candidate_email=candidate_email)
    if not reference_doctype or not reference_docname:
        frappe.throw(_("reference_doctype and reference_docname are required."))

    existing_name = frappe.db.get_value(
        ACTION_DOCTYPE,
        {
            "candidate_email": candidate_email,
            "reference_doctype": reference_doctype,
            "reference_docname": reference_docname,
        },
        "name",
    )

    # Configurable per-DocType title (Action Center Settings -> Title by DocType).
    title = _resolve_action_item_title(reference_doctype)

    if existing_name:
        doc = frappe.get_doc(ACTION_DOCTYPE, existing_name)
        doc.title = title
        doc.description = description or ""
        doc.attachment = attachment or ""
        doc.redirect_url = redirect_url or ""
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": ACTION_DOCTYPE,
                "candidate_email": candidate_email,
                "title": title,
                "reference_doctype": reference_doctype,
                "reference_docname": reference_docname,
                "redirect_url": redirect_url or "",
                "description": description or "",
                "attachment": attachment or "",
                "status": "Action Required",
            }
        )
        doc.insert(ignore_permissions=True)

    if commit:
        frappe.db.commit()

    return doc


def _delete_minimal_item(candidate_email, reference_doctype, reference_docname, commit=False):
    candidate_email = _resolve_candidate_email(candidate_email=candidate_email)

    names = frappe.get_all(
        ACTION_DOCTYPE,
        filters={
            "candidate_email": candidate_email,
            "reference_doctype": reference_doctype,
            "reference_docname": reference_docname,
        },
        pluck="name",
    )

    for name in names:
        frappe.delete_doc(ACTION_DOCTYPE, name, ignore_permissions=True, force=True)

    if commit and names:
        frappe.db.commit()

    return names


def mark_item_completed(
    reference_doctype,
    reference_docname,
    candidate_id=None,
    candidate_email=None,
    commit=False,
):
    resolved_email = _resolve_candidate_email(candidate_id=candidate_id, candidate_email=candidate_email)

    names = frappe.get_all(
        ACTION_DOCTYPE,
        filters={
            "candidate_email": resolved_email,
            "reference_doctype": reference_doctype,
            "reference_docname": reference_docname,
        },
        pluck="name",
    )

    for name in names:
        frappe.db.set_value(ACTION_DOCTYPE, name, "status", "Completed")

    if commit and names:
        frappe.db.commit()

    return names


def mark_all_items_completed(
    reference_doctype,
    candidate_id=None,
    candidate_email=None,
    commit=False,
):
    """Mark every not-yet-completed action-center item of `reference_doctype`
    for a candidate as Completed.

    Used when a single submission satisfies all outstanding items of a kind —
    e.g. submitting the pre-offer form once completes every pre-offer round HR
    has sent to the candidate.
    """
    resolved_email = _resolve_candidate_email(candidate_id=candidate_id, candidate_email=candidate_email)

    names = frappe.get_all(
        ACTION_DOCTYPE,
        filters={
            "candidate_email": resolved_email,
            "reference_doctype": reference_doctype,
            "status": ["!=", "Completed"],
        },
        pluck="name",
    )

    for name in names:
        frappe.db.set_value(ACTION_DOCTYPE, name, "status", "Completed")

    if commit and names:
        frappe.db.commit()

    return names


def build_onboarding_redirect(job_applicant_id, onboarding_name=None, section_name=None):
    params = {"appl": job_applicant_id}
    if onboarding_name:
        params["onboarding_name"] = onboarding_name
    if section_name:
        params["section"] = section_name
    return "/onboarding?{0}".format(urlencode(params))


def build_job_offer_redirect(job_applicant_id):
    # The /job_offer portal page resolves the offer by `appl` == Job Applicant ID
    # (job_offer.py filters Job Offer.job_applicant == appl, and job_offer_update /
    # get_job_offer_status / get_job_offer_summary / the PDF endpoints all do the same).
    # When one candidate has several applications the Job Applicant names are versioned
    # (email, email-1, …) while the email stays the same — so the redirect MUST carry the
    # specific Job Applicant ID, not the email, or every offer would resolve to the same
    # (first) application and the others would be unreachable.
    return "/job_offer?{0}".format(urlencode({"appl": job_applicant_id}))


def build_pre_offer_redirect(job_applicant_id, form_name=None):
    params = {"appl": job_applicant_id}
    if form_name:
        params["form"] = form_name
    return "/pre_offer_form?{0}".format(urlencode(params))


def _coerce_form_names(form_name):
    """Accepts a string, comma-separated string, or JSON list; returns a de-duped list preserving order."""
    if form_name is None:
        return []
    if isinstance(form_name, list):
        items = form_name
    elif isinstance(form_name, str):
        s = form_name.strip()
        if s.startswith("["):
            try:
                items = frappe.parse_json(s) or []
            except Exception:
                items = []
        else:
            items = [p.strip() for p in s.split(",")]
    else:
        items = [form_name]

    seen, out = set(), []
    for item in items:
        item = (item or "").strip()
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


@frappe.whitelist()
def send_pre_offer_form(job_applicant_id, form_name):
    """HR sends one or more Pre Offer Portal Forms to a candidate.

    `form_name` accepts a single form name, a comma-separated string, or a JSON list of names.
    Each new form is appended to Job Applicant.custom_pre_offer_forms with status=Sent and gets
    its own Candidate Action Center Item. Forms already in Sent/Filled state are skipped.
    """
    frappe.only_for(("System Manager", "HR Manager"))

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    form_names = _coerce_form_names(form_name)
    if not form_names:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Please select at least one Pre Offer Portal Form before sending.")}

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    candidate_email = frappe.db.get_value("Job Applicant", job_applicant_id, "email_id")
    if not candidate_email:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Candidate email not found on the Job Applicant record.")}

    applicant = frappe.get_doc("Job Applicant", job_applicant_id)
    existing_rows = {row.portal_form: row for row in (applicant.get("custom_pre_offer_forms") or [])}

    added, skipped = [], []
    for fn in form_names:
        if fn in existing_rows and existing_rows[fn].status in ("Sent", "Filled"):
            skipped.append(fn)
            continue

        if fn in existing_rows:
            row = existing_rows[fn]
            row.status = "Sent"
            row.sent_at = now_datetime()
            row.filled_at = None
        else:
            row = applicant.append("custom_pre_offer_forms", {
                "portal_form": fn,
                "status": "Sent",
                "sent_at": now_datetime(),
            })
        added.append(row)

    applicant.save(ignore_permissions=True)
    applicant.reload()

    row_by_form = {row.portal_form: row for row in (applicant.get("custom_pre_offer_forms") or [])}

    created_items = []
    for fn in [r.portal_form for r in added]:
        row = row_by_form.get(fn)
        if not row:
            continue
        item = _upsert_minimal_item(
            candidate_email=candidate_email,
            reference_doctype="Job Applicant Pre Offer Form",
            reference_docname=row.name,
            redirect_url=build_pre_offer_redirect(job_applicant_id, fn),
            description=_("Pre Offer Form '{0}' is ready. Please fill and submit the required details.").format(fn),
            commit=False,
        )
        if row.get("action_item") != item.name:
            row.db_set("action_item", item.name, update_modified=False)
        created_items.append({"form": fn, "action_item": item.name})

    if added:
        applicant.db_set("status", "Approvals", update_modified=False)
        applicant.db_set("custom_substatus", "Pre Offer Form Sent", update_modified=False)

    frappe.db.commit()

    return {
        "status": "success",
        "message": _("Pre Offer Form(s) sent to candidate."),
        "sent": [r.portal_form for r in added],
        "skipped": skipped,
        "action_items": created_items,
    }


def _send_pre_offer_for_applicant(applicant, allow_resend=True):
    """Form-less pre-offer send for one applicant (no commit).

    Pre-offer fields come from the applicant's Job Opening, so no Portal Form is
    selected. Each send appends a fresh form-less row (empty portal_form) to
    custom_pre_offer_forms and raises its own Candidate Action Center Item — so
    HR can send the pre-offer to the same candidate multiple times (re-send /
    new round). Previously-sent rows are left untouched as history.

    `allow_resend` lets callers opt out of re-sending: when False (bulk send), an
    applicant who already has an open / filled form-less pre-offer is skipped so a
    batch click doesn't spam everyone with a duplicate round.

    Returns {"created": bool, "reason": str|None, "action_item": str|None}.
    """
    candidate_email = applicant.email_id
    if not candidate_email:
        return {"created": False, "reason": "missing email", "action_item": None}

    if not allow_resend:
        # Skip if a form-less pre-offer already exists in any non-terminal state.
        existing = next(
            (r for r in (applicant.get("custom_pre_offer_forms") or []) if not r.portal_form),
            None,
        )
        if existing and existing.status in ("Sent", "Filled", "Reviewed"):
            return {"created": False, "reason": "already sent", "action_item": existing.get("action_item")}

    # Always anchor a fresh form-less row for this send (a re-send is a new round).
    row = applicant.append("custom_pre_offer_forms", {})
    row.portal_form = None
    row.status = "Sent"
    row.sent_at = now_datetime()
    row.filled_at = None
    applicant.save(ignore_permissions=True)

    item = _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Job Applicant Pre Offer Form",
        reference_docname=row.name,
        redirect_url=build_pre_offer_redirect(applicant.name),
        description=_("Pre Offer Form is ready. Please fill and submit the required details."),
        commit=False,
    )
    row.db_set("action_item", item.name, update_modified=False)

    applicant.db_set("status", "Approvals", update_modified=False)
    applicant.db_set("custom_substatus", "Pre Offer Form Sent", update_modified=False)
    return {"created": True, "reason": None, "action_item": item.name}


@frappe.whitelist()
def send_pre_offer(job_applicant_id):
    """HR sends the (form-less) pre-offer to a single candidate.

    The form is rendered from the candidate's Job Opening pre-offer config, so no
    Portal Form is selected — the caller just confirms. Idempotent: re-sending an
    already-sent pre-offer is a no-op.
    """
    frappe.only_for(("System Manager", "HR Manager"))

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}
    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    applicant = frappe.get_doc("Job Applicant", job_applicant_id)
    result = _send_pre_offer_for_applicant(applicant)
    frappe.db.commit()

    if not result["created"] and result["reason"] == "missing email":
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Candidate email not found on the Job Applicant record.")}

    return {
        "status": "success",
        "created": result["created"],
        "already_sent": (not result["created"] and result["reason"] == "already sent"),
        "action_item": result["action_item"],
        "message": (
            _("Pre Offer Form sent to candidate.")
            if result["created"]
            else _("Pre Offer Form already sent — no change.")
        ),
    }


@frappe.whitelist()
def send_bulk_pre_offer(applicants):
    """HR sends the (form-less) pre-offer to many candidates at once.

    `applicants` is a JSON list (or list) of Job Applicant names. Each candidate
    gets a fresh pre-offer round (re-send), even if one was sent before. Returns
    created / skipped / failed tallies (skipped only ever covers missing-email).
    """
    frappe.only_for(("System Manager", "HR Manager"))

    if isinstance(applicants, str):
        applicants = frappe.parse_json(applicants or "[]")
    applicants = applicants or []

    created = skipped = failed = 0
    for app in applicants:
        try:
            if not frappe.db.exists("Job Applicant", app):
                failed += 1
                continue
            applicant = frappe.get_doc("Job Applicant", app)
            res = _send_pre_offer_for_applicant(applicant, allow_resend=True)
            if res["created"]:
                created += 1
            elif res["reason"] == "missing email":
                failed += 1
            else:
                skipped += 1
        except Exception:
            failed += 1
            frappe.log_error(frappe.get_traceback(), "Bulk Send Pre Offer")

    frappe.db.commit()
    return {"created": created, "skipped": skipped, "failed": failed}


def build_pre_onboarding_redirect(job_applicant_id):
    return "/onboarding?{0}".format(urlencode({"appl": job_applicant_id}))


@frappe.whitelist()
def release_pre_onboarding(job_applicant_id, data):
    """HR releases the pre-onboarding form for an applicant.

    `data` is a JSON object containing any of:
      - onboarding_portal_form (required to release)
      - bgv_vendor
      - onboarding_buddy, joining_buddy, manager

    Persists to Job Applicant.custom_* fields, flips custom_pre_onboarding_status to 'Released',
    stamps custom_pre_onboarding_released_at, and creates a candidate Action Center Item that
    redirects to /onboarding. Idempotent — repeating refreshes the same row + action item.
    """
    frappe.only_for(("System Manager", "HR Manager"))

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    if isinstance(data, str):
        try:
            data = frappe.parse_json(data)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"status": "error", "message": _("Invalid JSON data.")}

    if not isinstance(data, dict):
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Data must be a JSON object.")}

    portal_form = (data.get("onboarding_portal_form") or "").strip()
    if not portal_form:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Please select an Onboarding Portal Form before releasing.")}

    if not frappe.db.exists("Onboarding Portal Forms", portal_form):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Onboarding Portal Form '{0}' not found.").format(portal_form)}

    applicant = frappe.get_doc("Job Applicant", job_applicant_id)

    # Block re-release only if a submitted/cancelled Employee Onboarding already exists.
    # A draft EO created by the previous release can be updated below.
    existing_eo = applicant.get("custom_pre_onboarding_employee_onboarding")
    if existing_eo:
        eo_docstatus = frappe.db.get_value("Employee Onboarding", existing_eo, "docstatus")
        if eo_docstatus and int(eo_docstatus) > 0:
            frappe.local.response["http_status_code"] = 409
            return {
                "status": "error",
                "message": _("Employee Onboarding already submitted for this applicant; pre-onboarding is locked."),
                "employee_onboarding": existing_eo,
            }

    applicant.custom_onboarding_portal_form = portal_form
    if "bgv_vendor" in data:
        applicant.custom_bgv_vendor = data.get("bgv_vendor") or None
    if "onboarding_buddy" in data:
        applicant.custom_onboarding_buddy = data.get("onboarding_buddy") or None
    if "joining_buddy" in data:
        applicant.custom_joining_buddy = data.get("joining_buddy") or None
    if "manager" in data:
        applicant.custom_manager = data.get("manager") or None

    try:
        from recruitment.recruitment.doctype.onboarding_buddy_assignment_rule.onboarding_buddy_assignment_rule import (
            resolve_buddies,
        )
        suggested = resolve_buddies(job_applicant_id) or {}
        if not applicant.custom_onboarding_buddy and suggested.get("Onboarding Buddy"):
            applicant.custom_onboarding_buddy = suggested["Onboarding Buddy"]
        if not applicant.custom_joining_buddy and suggested.get("Joining Buddy"):
            applicant.custom_joining_buddy = suggested["Joining Buddy"]
        if not applicant.custom_manager and suggested.get("Manager"):
            applicant.custom_manager = suggested["Manager"]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "release_pre_onboarding: resolve_buddies failed")

    applicant.custom_pre_onboarding_status = "Released"
    if not applicant.get("custom_pre_onboarding_released_at"):
        applicant.custom_pre_onboarding_released_at = now_datetime()

    applicant.status = "Accepted"
    applicant.custom_substatus = "Pre Onboarding Released"

    applicant.save(ignore_permissions=True)

    # Create the draft Employee Onboarding immediately so the candidate's submissions
    # land on a pre-existing draft instead of materializing one lazily on first save.
    # The EO's after_insert hook (sync_onboarding_action_item) creates the candidate's
    # Action Center Item referencing the Employee Onboarding — we don't add a second
    # item against Job Applicant here. If materialization fails, fall back to a JA-tied
    # item so the candidate still has an entry point.
    employee_onboarding_name = None
    try:
        from recruitment.api.candidate_portal import materialize_onboarding_from_applicant
        employee_onboarding_name = materialize_onboarding_from_applicant(job_applicant_id)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "release_pre_onboarding: materialize_onboarding failed")

    if not employee_onboarding_name and applicant.email_id:
        _upsert_minimal_item(
            candidate_email=applicant.email_id,
            reference_doctype="Job Applicant",
            reference_docname=job_applicant_id,
            redirect_url=build_pre_onboarding_redirect(job_applicant_id),
            description=_("Onboarding form pending. Open portal to complete required details."),
            attachment="",
            commit=False,
        )

    frappe.db.commit()

    return {
        "status": "success",
        "message": _("Pre Onboarding released to candidate."),
        "job_applicant": job_applicant_id,
        "onboarding_portal_form": portal_form,
        "onboarding_buddy": applicant.custom_onboarding_buddy,
        "joining_buddy": applicant.custom_joining_buddy,
        "manager": applicant.custom_manager,
        "bgv_vendor": applicant.custom_bgv_vendor,
        "pre_onboarding_status": applicant.custom_pre_onboarding_status,
        "released_at": applicant.custom_pre_onboarding_released_at,
        "employee_onboarding": employee_onboarding_name,
    }


@frappe.whitelist()
def get_pre_onboarding_buddy_suggestions(job_applicant_id):
    """Returns Onboarding/Joining buddy + Manager suggestions for the dialog prefill."""
    frappe.only_for(("System Manager", "HR Manager"))
    if not job_applicant_id or not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _("Job Applicant not found.")}

    try:
        from recruitment.recruitment.doctype.onboarding_buddy_assignment_rule.onboarding_buddy_assignment_rule import (
            resolve_buddies,
        )
        suggested = resolve_buddies(job_applicant_id) or {}
    except Exception:
        suggested = {}

    return {
        "status": "success",
        "suggestions": {
            "onboarding_buddy": suggested.get("Onboarding Buddy"),
            "joining_buddy": suggested.get("Joining Buddy"),
            "manager": suggested.get("Manager"),
        },
    }


def sync_onboarding_action_item(doc, method=None):
    if not getattr(doc, "job_applicant", None):
        return

    candidate_email = frappe.db.get_value("Job Applicant", doc.job_applicant, "email_id")
    if not candidate_email:
        return

    is_completed = (doc.docstatus == 2) or ((doc.boarding_status or "").strip().lower() == "completed")

    if is_completed:
        _delete_minimal_item(candidate_email, "Employee Onboarding", doc.name, commit=False)
        return

    try:
        approval_list = frappe.parse_json(doc.custom_field_approval_json) or []
    except Exception:
        approval_list = []
    if any((row.get("status") or "") == "Rejected" for row in approval_list):
        return

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Employee Onboarding",
        reference_docname=doc.name,
        redirect_url=build_onboarding_redirect(doc.job_applicant, doc.name),
        description="Onboarding pending. Open portal to complete required details.",
        attachment="",
        commit=False,
    )


def sync_job_offer_action_item(doc, method=None):
    candidate_id = getattr(doc, "job_applicant", None)
    candidate_email = getattr(doc, "applicant_email", None)

    if candidate_id and not candidate_email:
        candidate_email = frappe.db.get_value("Job Applicant", candidate_id, "email_id")

    if not candidate_email:
        return

    offer_status = (getattr(doc, "status", "") or "").strip().lower()
    is_closed = doc.docstatus == 2 or offer_status in {"accepted", "cancelled", "rejected"}

    if is_closed:
        mark_item_completed(
            reference_doctype=doc.doctype,
            reference_docname=doc.name,
            candidate_email=candidate_email,
            commit=False,
        )
        if offer_status == "accepted" and candidate_id:
            _sync_onboarding_action_for_applicant(candidate_id, candidate_email)
        return

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype=doc.doctype,
        reference_docname=doc.name,
        redirect_url=build_job_offer_redirect(candidate_id or candidate_email),
        description="Job offer released. Open details from the action center.",
        attachment="",
        commit=False,
    )


def _sync_onboarding_action_for_applicant(job_applicant_id, candidate_email):
    # On Job Offer Accepted, guarantee the candidate has a working Employee
    # Onboarding to land on, then upsert the action item against it.
    #   1. EO already exists for this applicant -> use it.
    #   2. No EO -> auto-run the same flow as the HR "Release Pre Onboarding"
    #      button (default portal form + resolve buddies) and materialize a draft EO.
    eo_name = frappe.db.get_value(
        "Employee Onboarding",
        {"job_applicant": job_applicant_id, "docstatus": ["<", 2]},
        "name",
        order_by="modified desc",
    )

    if not eo_name:
        eo_name = _auto_release_and_materialize_onboarding(job_applicant_id)

    # Never let a missing/stale EO name break the Job Offer save — action-item
    # bookkeeping is best-effort here (same contract as _auto_release_... below).
    if not eo_name or not frappe.db.exists("Employee Onboarding", eo_name):
        return

    eo = frappe.get_doc("Employee Onboarding", eo_name)
    is_completed = (eo.docstatus == 2) or ((eo.boarding_status or "").strip().lower() == "completed")
    if is_completed:
        return

    try:
        approval_list = frappe.parse_json(eo.custom_field_approval_json) or []
    except Exception:
        approval_list = []
    if any((row.get("status") or "") == "Rejected" for row in approval_list):
        return

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Employee Onboarding",
        reference_docname=eo.name,
        redirect_url=build_onboarding_redirect(job_applicant_id, eo.name),
        description="Onboarding pending. Open portal to complete required details.",
        attachment="",
        commit=False,
    )


def _auto_release_and_materialize_onboarding(job_applicant_id):
    """Mirror the HR 'Release Pre Onboarding' flow, triggered automatically from
    Job Offer acceptance. Reuses the applicant's already-selected Onboarding
    Portal Form when present; otherwise picks the form flagged `default=1`.
    Returns the materialized Employee Onboarding name, or None if no default form
    is configured or the flow fails (the failure is logged, never raised — a
    Job Offer save must not break because of action-item bookkeeping)."""
    try:
        applicant = frappe.get_doc("Job Applicant", job_applicant_id)

        portal_form = applicant.get("custom_onboarding_portal_form")
        if not portal_form:
            portal_form = frappe.db.get_value(
                "Onboarding Portal Forms",
                {"default": 1},
                "name",
                order_by="modified desc",
            )
            if not portal_form:
                frappe.log_error(
                    "No default Onboarding Portal Form configured; cannot auto-release pre-onboarding on Job Offer Accepted.",
                    "sync_job_offer_action_item: auto-release skipped",
                )
                return None
            applicant.custom_onboarding_portal_form = portal_form

        try:
            from recruitment.recruitment.doctype.onboarding_buddy_assignment_rule.onboarding_buddy_assignment_rule import (
                resolve_buddies,
            )
            suggested = resolve_buddies(job_applicant_id) or {}
            if not applicant.custom_onboarding_buddy and suggested.get("Onboarding Buddy"):
                applicant.custom_onboarding_buddy = suggested["Onboarding Buddy"]
            if not applicant.custom_joining_buddy and suggested.get("Joining Buddy"):
                applicant.custom_joining_buddy = suggested["Joining Buddy"]
            if not applicant.custom_manager and suggested.get("Manager"):
                applicant.custom_manager = suggested["Manager"]
        except Exception:
            frappe.log_error(frappe.get_traceback(), "auto_release_pre_onboarding: resolve_buddies failed")

        applicant.custom_pre_onboarding_status = "Released"
        if not applicant.get("custom_pre_onboarding_released_at"):
            applicant.custom_pre_onboarding_released_at = now_datetime()
        if not applicant.get("custom_substatus"):
            applicant.custom_substatus = "Pre Onboarding Released"

        applicant.save(ignore_permissions=True)

        from recruitment.api.candidate_portal import materialize_onboarding_from_applicant
        return materialize_onboarding_from_applicant(job_applicant_id)

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "sync_job_offer_action_item: auto-release + materialize onboarding failed",
        )
        return None


def sync_onboarding_field_rejection_action(onboarding_doc, approval_list=None):
    if not onboarding_doc or not getattr(onboarding_doc, "job_applicant", None):
        return

    candidate_email = frappe.db.get_value("Job Applicant", onboarding_doc.job_applicant, "email_id")
    if not candidate_email:
        return

    # Tally approval states from child table rows (approval_list param ignored — source of
    # truth is the child table). Hidden rows are excluded: they are never set to "Approved"
    # by the FLA endpoints, so counting them would block completion forever.
    total = approved = rejected_count = 0
    for row in (onboarding_doc.get("custom_candidate_portal_fields") or []):
        if row.get("hidden"):
            continue
        total += 1
        status = row.get("approval_status") or "Pending"
        if status == "Approved":
            approved += 1
        elif status == "Rejected":
            rejected_count += 1

    # Complete the action item ONLY when there is at least one field and every field is
    # Approved. Any field still Pending/Filled/Rejected keeps the item as "Action Required".
    if total > 0 and approved == total:
        mark_item_completed(
            reference_doctype="Employee Onboarding",
            reference_docname=onboarding_doc.name,
            candidate_email=candidate_email,
            commit=False
        )
        return

    if rejected_count > 0:
        description = "{0} field(s) rejected. Please correct and resubmit from candidate portal.".format(rejected_count)
    else:
        description = "Onboarding under review. {0} of {1} field(s) approved.".format(approved, total)

    item = _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Employee Onboarding",
        reference_docname=onboarding_doc.name,
        redirect_url=build_onboarding_redirect(onboarding_doc.job_applicant, onboarding_doc.name),
        description=description,
        attachment="",
        commit=False,
    )
    # _upsert_minimal_item leaves status untouched on an existing row, so force it back to
    # "Action Required" in case this item was already Completed on an earlier full-approval
    # pass and HR has since rejected (or reset) a field.
    frappe.db.set_value(ACTION_DOCTYPE, item.name, "status", "Action Required")


def sync_pre_offer_field_rejection_action(applicant_doc):
    """Re-open (or clear) the candidate's pre-offer task based on field rejections.

    Mirrors sync_onboarding_field_rejection_action for the pre-offer flow: when
    any field in `custom_pre_offer_field_approvals` is Rejected, the candidate's
    pre-offer action-center item is re-opened (status → "Action Required") and the
    form-less pre-offer row is set back to "Sent" so they can correct & resubmit.
    Once nothing is rejected, every pre-offer action item is completed again.
    """
    if not applicant_doc or not getattr(applicant_doc, "email_id", None):
        return
    candidate_email = applicant_doc.email_id

    # The form-less pre-offer row anchors the candidate's pre-offer action item.
    formless = next(
        (r for r in (applicant_doc.get("custom_pre_offer_forms") or []) if not r.portal_form),
        None,
    )
    if not formless:
        return

    rejected_count = sum(
        1 for r in (applicant_doc.get("custom_pre_offer_field_approvals") or [])
        if (r.get("approval_status") or "") == "Rejected"
    )

    if rejected_count <= 0:
        mark_all_items_completed(
            reference_doctype="Job Applicant Pre Offer Form",
            candidate_email=candidate_email,
            commit=True,
        )
        return

    item = _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Job Applicant Pre Offer Form",
        reference_docname=formless.name,
        redirect_url=build_pre_offer_redirect(applicant_doc.name),
        description=_("{0} pre-offer field(s) rejected. Please correct and resubmit from the candidate portal.").format(rejected_count),
        commit=False,
    )
    # _upsert_minimal_item doesn't touch status on an existing row, so force it
    # back to "Action Required" in case this item was completed on an earlier submit.
    frappe.db.set_value(ACTION_DOCTYPE, item.name, "status", "Action Required")

    # Re-open the form-less row so the candidate can edit it again.
    if (formless.status or "") != "Sent":
        formless.db_set("status", "Sent", update_modified=False)
    if formless.get("action_item") != item.name:
        formless.db_set("action_item", item.name, update_modified=False)
    frappe.db.commit()


@frappe.whitelist()
def upsert_action_center_item(data):
    frappe.only_for(("System Manager", "HR Manager"))

    if isinstance(data, str):
        data = frappe.parse_json(data)

    if not isinstance(data, dict):
        frappe.throw(_("Data must be a JSON object."))

    doc = _upsert_minimal_item(
        candidate_email=data.get("candidate_email"),
        reference_doctype=data.get("reference_doctype"),
        reference_docname=data.get("reference_docname"),
        redirect_url=data.get("redirect_url") or "",
        description=data.get("description") or "",
        attachment=data.get("attachment") or "",
        commit=True,
    )

    return {"status": "success", "name": doc.name}


@frappe.whitelist(allow_guest=True)
def get_action_center_items(candidate_id=None, candidate_email=None, limit=100):
    resolved_email = _resolve_candidate_email(candidate_id=candidate_id, candidate_email=candidate_email)

    if isinstance(limit, str):
        try:
            limit = int(limit)
        except Exception:
            limit = 100

    rows = frappe.get_all(
        ACTION_DOCTYPE,
        filters={"candidate_email": resolved_email},
        fields=[
            "name",
            "candidate_email",
            "title",
            "reference_doctype",
            "reference_docname",
            "redirect_url",
            "attachment",
            "description",
            "modified",
            "status",
        ],
        order_by="modified desc",
        limit_page_length=max(1, min(limit, 500)),
    )

    return {
        "status": "success",
        "candidate_email": resolved_email,
        "total": len(rows),
        "items": rows,
    }


@frappe.whitelist(allow_guest=True)
def complete_action_center_item(item_name, candidate_id=None, candidate_email=None):
    doc = frappe.get_doc(ACTION_DOCTYPE, item_name)
    resolved_email = _resolve_candidate_email(candidate_id=candidate_id, candidate_email=candidate_email)

    if doc.candidate_email != resolved_email:
        frappe.throw(_("You are not allowed to update this action item."))

    frappe.delete_doc(ACTION_DOCTYPE, doc.name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"status": "success", "name": item_name, "new_status": "Deleted"}


@frappe.whitelist(allow_guest=True)
def archive_action_center_item(item_name, candidate_id=None, candidate_email=None):
    return complete_action_center_item(item_name, candidate_id=candidate_id, candidate_email=candidate_email)
