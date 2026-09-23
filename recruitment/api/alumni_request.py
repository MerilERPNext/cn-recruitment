"""Guest-facing API for the Alumni Employee Request feature (Recruitment app).

Exposes a single whitelisted, Guest-accessible endpoint that lets a former
employee ask — from the Alumni Portal, without logging in — to be granted Alumni
Portal access. The request is persisted as an `Alumni Employee Request` and routed
through the Frappe Workflow; final approval flags the Employee via the existing
``custom_is_alumni_employee`` gate (see ``alumni_employee_request_service``).

This module is a thin transport layer only: it sanitises inputs, rate-limits, logs
and shapes a structured JSON response. All business rules live in the service layer.

Endpoints:
    POST /api/method/recruitment.api.alumni_request.create_alumni_employee_request
    POST /api/method/recruitment.api.alumni_request.update_employee_personal_email
    GET  /api/method/recruitment.api.alumni_request.get_alumni_request_status
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit

from recruitment.recruitment.alumni_employee_request_service import (
    AlumniRequestError,
    create_alumni_employee_request as _create_request,
    get_request_status as _get_request_status,
    update_employee_personal_email as _update_personal_email,
)

_logger = frappe.logger("recruitment", allow_site=True)


def _bad_request(message: str, status: int = 400, error_code: str | None = None) -> dict:
    frappe.local.response["http_status_code"] = status
    body: dict = {"success": False, "message": message}
    # Only set for the handful of rules a caller needs to branch on (currently
    # just PERSONAL_EMAIL_REQUIRED) — omitted for everything else, so this adds
    # a field rather than changing the existing error shape.
    if error_code:
        body["error_code"] = error_code
    return body


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="employee", limit=20, seconds=60 * 60)
def create_alumni_employee_request(
    employee: str | None = None,
    email: str | None = None,
    mobile_number: str | None = None,
    date_of_birth: str | None = None,
    remarks: str | None = None,
    company: str | None = None,
) -> dict:
    """Create an Alumni Employee Request from the (Guest) Alumni Portal.

    Accepts the employee's identifying details, validates them through the service
    layer (employee exists, is Active, is not already an alumnus, has a linked User,
    the email matches, and no duplicate pending request), then persists a request
    that enters the approval workflow at ``Pending Approval``.

    Rate limited to 5 submissions per employee id per hour to deter spam. Returns a
    structured response; a validation failure yields ``{"success": false, ...}``
    with an appropriate HTTP status and never leaks sensitive employee data.
    """
    employee = (employee or "").strip()
    email = (email or "").strip()
    if not employee:
        return _bad_request(_("Employee is required."))
    # Guest boundary: require Employee ID + Email together as the identity check.
    if not email:
        return _bad_request(_("Email is required to verify your request."))

    remote = getattr(getattr(frappe.local, "request", None), "remote_addr", None)
    _logger.info(f"Alumni Employee Request (guest) received for employee={employee} ip={remote}")

    try:
        doc = _create_request(
            employee=employee,
            email=(email or "").strip(),
            mobile_number=(mobile_number or "").strip(),
            date_of_birth=(date_of_birth or "").strip(),
            remarks=(remarks or "").strip(),
            company=(company or "").strip(),
            created_from="Portal",
        )
    except AlumniRequestError as e:
        # Expected, user-safe validation error. `error_code` is unset for most
        # rules and only present (e.g. "PERSONAL_EMAIL_REQUIRED") when the
        # frontend has a specific recovery flow for that failure.
        return _bad_request(str(e), error_code=getattr(e, "error_code", None))
    except frappe.DuplicateEntryError:
        return _bad_request(
            _("A pending Alumni Employee Request already exists for this employee."), 409
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "create_alumni_employee_request failed")
        return _bad_request(_("Unable to submit your request right now. Please try again later."), 500)

    frappe.local.response["http_status_code"] = 201
    return {
        "success": True,
        "message": _("Request submitted successfully."),
        "request_id": doc.name,
        "status": doc.status,
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="employee", limit=10, seconds=60 * 60)
def update_employee_personal_email(
    employee: str | None = None,
    personal_email: str | None = None,
    email: str | None = None,
) -> dict:
    """Save a missing Personal Email on the Employee so the request can be retried.

    The recovery step for a ``create_alumni_employee_request`` that came back with
    ``error_code = "PERSONAL_EMAIL_REQUIRED"``: the portal collects the address,
    posts it here, and re-submits the request once this returns success.

    ``employee`` + ``email`` are the same identity pair the create endpoint takes —
    ``email`` must already be on the Employee record — unless the caller is signed
    in as that Employee's own User or as HR. Writes only ``Employee.personal_email``:
    no User is created, no alumni flag is set, and the Employee's status (Inactive
    very much included) is left exactly as it was.

    Failures carry an ``error_code`` the portal can branch on —
    ``INVALID_PERSONAL_EMAIL``, ``PERSONAL_EMAIL_ALREADY_SET`` or ``NOT_AUTHORIZED``.
    """
    employee = (employee or "").strip()
    personal_email = (personal_email or "").strip()
    email = (email or "").strip()

    if not employee:
        return _bad_request(_("Employee is required."))
    if not personal_email:
        return _bad_request(
            _("Personal Email is required."), error_code="INVALID_PERSONAL_EMAIL"
        )

    remote = getattr(getattr(frappe.local, "request", None), "remote_addr", None)
    _logger.info(
        f"Alumni Personal Email update received for employee={employee} ip={remote}"
    )

    try:
        emp = _update_personal_email(employee, personal_email, identity_email=email)
    except AlumniRequestError as e:
        return _bad_request(str(e), error_code=getattr(e, "error_code", None))
    except Exception:
        frappe.log_error(frappe.get_traceback(), "update_employee_personal_email failed")
        return _bad_request(
            _("Unable to save the Personal Email right now. Please try again later."), 500
        )

    frappe.local.response["http_status_code"] = 200
    return {
        "success": True,
        "message": _("Personal Email saved successfully."),
        "employee": emp.name,
        "personal_email": emp.personal_email,
    }


@frappe.whitelist(allow_guest=True, methods=["GET", "POST"])
@rate_limit(key="email", limit=60, seconds=60 * 60)
def get_alumni_request_status(
    request_id: str | None = None,
    email: str | None = None,
    employee: str | None = None,
) -> dict:
    """Return the approval-workflow progress of an Alumni Employee Request (no login).

    Look up by ``request_id`` (e.g. ``AER-2026-00005``) and/or ``employee`` (the
    Employee id, e.g. ``PW-00006`` — resolves to that employee's most recent
    request). ``email`` is always required and acts as an identity check. Returns
    the overall status plus every approval stage with its state (Approved / Pending
    / Rejected …), approver and timestamp — so a former employee can track their
    request from the Alumni Portal without signing in.

    A mismatch or unknown lookup returns a uniform "not found" so requests can't be
    enumerated. Read-only; never exposes another person's request.
    """
    request_id = (request_id or "").strip()
    email = (email or "").strip()
    employee = (employee or "").strip()
    if not email:
        return _bad_request(_("Email is required to view this request."))
    if not request_id and not employee:
        return _bad_request(_("A Request ID or Employee is required."))

    try:
        result = _get_request_status(request_id, email, employee, require_identity=True)
    except AlumniRequestError as e:
        return _bad_request(str(e), 404)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_alumni_request_status failed")
        return _bad_request(_("Unable to fetch the request status right now."), 500)

    frappe.local.response["http_status_code"] = 200
    return result
