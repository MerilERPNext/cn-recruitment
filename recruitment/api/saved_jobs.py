import frappe
from frappe import _
from frappe.utils import now_datetime

from recruitment.api.candidate_auth import (
    candidate_required,
    enforce_candidate_identity,
)


@candidate_required
def toggle_saved_job_opening(candidate_email, job_opening):
    candidate_email = _clean_email(candidate_email)
    session_email = enforce_candidate_identity(email=candidate_email)
    return _toggle_saved_job_opening_impl(session_email, job_opening)


@candidate_required
def get_saved_job_openings(candidate_email):
    candidate_email = _clean_email(candidate_email)
    session_email = enforce_candidate_identity(email=candidate_email)
    return _get_saved_job_openings_impl(session_email)


def _toggle_saved_job_opening_impl(candidate_email, job_opening):
    job_opening = (job_opening or "").strip()
    if not job_opening:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("job_opening is required."))

    if not frappe.db.exists("Job Opening", job_opening):
        frappe.local.response["http_status_code"] = 404
        frappe.throw(_("Job Opening {0} not found.").format(job_opening), frappe.DoesNotExistError)

    existing_name = frappe.db.get_value(
        "Saved Job Opening", {"candidate_email": candidate_email}, "name"
    )

    if not existing_name:
        doc = frappe.new_doc("Saved Job Opening")
        doc.candidate_email = candidate_email
        doc.append("job_openings", {"job_opening": job_opening})
        doc.saved_on = now_datetime()
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return {
            "action": "saved",
            "is_saved": True,
            "name": doc.name,
            "deleted": False,
            "saved_job_openings": [r.job_opening for r in doc.job_openings],
        }

    doc = frappe.get_doc("Saved Job Opening", existing_name)
    already_saved = any(row.job_opening == job_opening for row in (doc.job_openings or []))

    if already_saved:
        remaining = [row for row in doc.job_openings if row.job_opening != job_opening]
        if not remaining:
            frappe.delete_doc("Saved Job Opening", doc.name, ignore_permissions=True)
            frappe.db.commit()
            return {
                "action": "unsaved",
                "is_saved": False,
                "name": None,
                "deleted": True,
                "saved_job_openings": [],
            }

        doc.job_openings = remaining
        doc.saved_on = now_datetime()
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {
            "action": "unsaved",
            "is_saved": False,
            "name": doc.name,
            "deleted": False,
            "saved_job_openings": [r.job_opening for r in doc.job_openings],
        }

    doc.append("job_openings", {"job_opening": job_opening})
    doc.saved_on = now_datetime()
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {
        "action": "saved",
        "is_saved": True,
        "name": doc.name,
        "deleted": False,
        "saved_job_openings": [r.job_opening for r in doc.job_openings],
    }


def _get_saved_job_openings_impl(candidate_email):
    existing_name = frappe.db.get_value(
        "Saved Job Opening", {"candidate_email": candidate_email}, "name"
    )
    if not existing_name:
        return {
            "status": "success",
            "total": 0,
            "saved_job_openings": [],
        }

    doc = frappe.get_doc("Saved Job Opening", existing_name)
    ids = [r.job_opening for r in (doc.job_openings or []) if r.job_opening]
    return {
        "status": "success",
        "total": len(ids),
        "saved_job_openings": ids,
    }


def _clean_email(email):
    email = (email or "").strip().lower()
    if not email:
        frappe.local.response["http_status_code"] = 400
        frappe.throw(_("candidate_email is required."))
    return email
