from urllib.parse import urlencode

import frappe
from frappe import _

ACTION_DOCTYPE = "Candidate Action Center Item"


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

    if existing_name:
        doc = frappe.get_doc(ACTION_DOCTYPE, existing_name)
        doc.description = description or ""
        doc.attachment = attachment or ""
        doc.redirect_url = redirect_url or ""
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": ACTION_DOCTYPE,
                "candidate_email": candidate_email,
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


def build_onboarding_redirect(job_applicant_id, onboarding_name=None, section_name=None):
    params = {"appl": job_applicant_id}
    if onboarding_name:
        params["onboarding_name"] = onboarding_name
    if section_name:
        params["section"] = section_name
    return "/onboarding?{0}".format(urlencode(params))


def build_job_offer_redirect(candidate_email):
    return "/job_offer?{0}".format(urlencode({"appl": candidate_email}))


def build_pre_offer_redirect(job_applicant_id):
    return "/pre_offer_form?{0}".format(urlencode({"appl": job_applicant_id}))


@frappe.whitelist()
def send_pre_offer_form(job_applicant_id, form_name):
    frappe.only_for(("System Manager", "HR Manager"))

    if not job_applicant_id:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Job Applicant ID is required.")}

    if not form_name:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Please select a Pre Offer Portal Form before sending.")}

    if not frappe.db.exists("Job Applicant", job_applicant_id):
        frappe.local.response["http_status_code"] = 404
        return {"status": "error", "message": _(f"Job Applicant '{job_applicant_id}' not found.")}

    candidate_email = frappe.db.get_value("Job Applicant", job_applicant_id, "email_id")
    if not candidate_email:
        frappe.local.response["http_status_code"] = 400
        return {"status": "error", "message": _("Candidate email not found on the Job Applicant record.")}

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Job Applicant",
        reference_docname=job_applicant_id,
        redirect_url=build_pre_offer_redirect(job_applicant_id),
        description="Pre Offer Form is ready. Please fill and submit the required details.",
        commit=False,
    )

    frappe.db.set_value("Job Applicant", job_applicant_id, {
        "custom_pre_offer_portal_form": form_name,
        "custom_pre_offer_form_status": "Sent",
    })
    frappe.db.commit()

    return {"status": "success", "message": _("Pre Offer Form sent to candidate.")}


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
        _delete_minimal_item(candidate_email, doc.doctype, doc.name, commit=False)
        return

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype=doc.doctype,
        reference_docname=doc.name,
        redirect_url=build_job_offer_redirect(candidate_email),
        description="Job offer released. Open details from the action center.",
        attachment="",
        commit=False,
    )


def sync_onboarding_field_rejection_action(onboarding_doc, approval_list=None):
    if not onboarding_doc or not getattr(onboarding_doc, "job_applicant", None):
        return

    candidate_email = frappe.db.get_value("Job Applicant", onboarding_doc.job_applicant, "email_id")
    if not candidate_email:
        return

    # Read rejection count from child table rows (approval_list param ignored — source of truth is child table)
    rejected_count = 0
    for row in (onboarding_doc.get("custom_candidate_portal_fields") or []):
        if (row.get("approval_status") or "") == "Rejected":
            rejected_count += 1

    if rejected_count <= 0:
        from recruitment.api.action_center import mark_item_completed
        mark_item_completed(
            reference_doctype="Employee Onboarding",
            reference_docname=onboarding_doc.name,
            candidate_email=candidate_email,
            commit=False
        )
        return

    _upsert_minimal_item(
        candidate_email=candidate_email,
        reference_doctype="Employee Onboarding",
        reference_docname=onboarding_doc.name,
        redirect_url=build_onboarding_redirect(onboarding_doc.job_applicant, onboarding_doc.name),
        description="{0} field(s) rejected. Please correct and resubmit from candidate portal.".format(rejected_count),
        attachment="",
        commit=False,
    )


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
