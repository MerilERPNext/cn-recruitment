import frappe
from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity
from recruitment.api.candidate_portal import (
    _compute_candidate_field_counts,
    _dpdp_consent_pending,
    _get_active_pre_release,
    _get_onboarding_portal_rows,
    _iter_onboarding_contact_users,
)

DOCTYPENAME = "Employee Onboarding"


def _success_response(message, data):
    frappe.local.response["http_status_code"] = 200
    return {"success": True, "message": message, "data": data}


def _error_response(message, status_code=400):
    frappe.local.response["http_status_code"] = status_code
    return {"success": False, "message": message, "data": {}}


def _dpdp_consent_flags(email):
    """(required, submitted) for DPDP consent — a safe NO-OP when the feature is off.

    required  : DPDP consent is enabled AND enforced for this site, so the candidate
                must give it before onboarding. False for every non-DPDP site.
    submitted : the candidate has an accepted DPDP consent log (consent given).

    The UI should show a "complete consent" action only when required and not
    submitted. Never raises — any missing setting / doctype degrades to
    (False, False), so sites that don't use DPDP behave exactly as today.
    """
    try:
        from frappe.utils import cint
        from recruitment.job_offer_utils import is_dpdp_consent_enabled

        if not is_dpdp_consent_enabled():
            return False, False
        required = bool(cint(frappe.db.get_single_value("DPDP Act Settings", "enforce_before_onboarding")))
        given = frappe.db.get_value(
            "Job Applicant DPDP Consent Log",
            {"job_applicant": email, "docstatus": 1, "consent_given": 1},
            "name",
        )
        return required, bool(given)
    except Exception:
        return False, False




@candidate_required
def get_dashboard(email):
    try:
        if not email:
            return _error_response("email is required.", 400)
        enforce_candidate_identity(email=email)

        # Project-specific gate — a NO-OP for every other site. `_dpdp_consent_pending`
        # returns False unless DPDP consent is BOTH enabled AND enforced for this site
        # (DPDP Act Settings) and the candidate has not yet given it. In that one case
        # onboarding hasn't effectively started, so onboarding_status is reported False.
        consent_pending = _dpdp_consent_pending(email)
        # Flags for the UI: whether DPDP consent applies to this candidate and whether
        # they have submitted it. Both False for non-DPDP sites (see helper). Used to
        # show a "complete DPDP consent" action when required and not yet submitted.
        dpdp_required, dpdp_submitted = _dpdp_consent_flags(email)
        # Consent page URL for the UI's "complete DPDP consent" action — reuses the
        # same token-gated URL the post-login router builds. Only when DPDP applies;
        # None everywhere else. Guarded so it can never break the dashboard.
        dpdp_consent_url = None
        if dpdp_required:
            try:
                from recruitment.api.candidate_portal_survey import _dpdp_consent_url
                dpdp_consent_url = _dpdp_consent_url(email)
            except Exception:
                dpdp_consent_url = None

        row = frappe.db.get_value(
            DOCTYPENAME,
            {"job_applicant": email, "docstatus": ("<", 2)},
            ["name", "date_of_joining", "designation", "department", "custom_work_location"],
            as_dict=True,
            order_by="creation desc",
        )

        if not row:
            # No Employee Onboarding record – fall back to Job Applicant status
            ja_status = frappe.db.get_value("Job Applicant", email, "status") or ""
            if ja_status == "Accepted":
                return _success_response(
                    "Onboarding dashboard fetched successfully.",
                    {
                        "name": None,
                        "date_of_joining": None,
                        "designation": None,
                        "department": None,
                        "work_location": None,
                        "work_location_details": None,
                        "key_contacts": [],
                        "onboarding_status": (False if consent_pending else True),
                        "dpdp_consent_required": dpdp_required,
                        "dpdp_consent_submitted": dpdp_submitted,
                        "dpdp_consent_url": dpdp_consent_url,
                        "form_completion": {
                            "total_fields": 0,
                            "filled_fields": 0,
                            "percentage": 0.0,
                        },
                        "onboarding_stage": "Onboarding Pending",
                    },
                )
            # Neither condition satisfied
            return _success_response(
                "Onboarding dashboard fetched successfully.",
                {
                    "name": None,
                    "date_of_joining": None,
                    "designation": None,
                    "department": None,
                    "work_location": None,
                    "work_location_details": None,
                    "key_contacts": [],
                    "onboarding_status": False,
                    "dpdp_consent_required": dpdp_required,
                    "dpdp_consent_submitted": dpdp_submitted,
                    "dpdp_consent_url": dpdp_consent_url,
                    "form_completion": {
                        "total_fields": 0,
                        "filled_fields": 0,
                        "percentage": 0.0,
                        "fields": [],
                    },
                    "onboarding_stage": "Onboarding Pending",
                },
            )

        # ── Onboarding Status ──────────────────────────────────────────────────
        # true  : Employee Onboarding record exists
        # true  : No record yet but Job Applicant status is "Accepted"
        # false : Neither condition is met
        # false : DPDP consent is required for this site but not yet given (no-op
        #         elsewhere — see consent_pending above).
        onboarding_status = not consent_pending  # record exists, but a pending DPDP
        #         consent means onboarding hasn't effectively started.

        # ── Form Completion (live, value-aware) ───────────────────────────────
        # Use the SAME source of truth as the candidate form page instead of the
        # `current_value` snapshot column: resolve each visible portal field's
        # live value (Employee Onboarding -> Job Applicant fallback). This makes
        # the percentage update the instant a save commits and keeps it in sync
        # with the form's own tab counts (prefilled/auto-mapped values count too).
        onboarding_doc = frappe.get_doc(DOCTYPENAME, row.name)
        applicant_doc = frappe.get_doc("Job Applicant", email)
        pre_release = _get_active_pre_release(email)
        portal_rows, _ = _get_onboarding_portal_rows(onboarding_doc, pre_release)
        counts = _compute_candidate_field_counts(portal_rows, onboarding_doc, applicant_doc)

        # "filled" = field holds a value (saved, prefilled, approved or rejected).
        # "pending" = empty field still awaiting the candidate. So filled = total - pending.
        total_fields = int(counts.get("total", 0))
        filled_fields = total_fields - int(counts.get("pending", 0))
        percentage = round((filled_fields / total_fields) * 100, 2) if total_fields else 0.0
        form_completion = {
            "total_fields": total_fields,
            "filled_fields": filled_fields,
            "percentage": percentage,
            # Per-status breakdown so the UI can render filled vs. approved vs.
            # rejected vs. pending if needed (mutually exclusive, sums to total).
            "status_counts": counts,
        }

        # ── Onboarding Stage ──────────────────────────────────────────────────
        if form_completion["percentage"] == 100.0 and form_completion["total_fields"] > 0:
            onboarding_stage = "Onboarding Complete"
        else:
            onboarding_stage = "Onboarding Pending"

        # ── Key Contacts ──────────────────────────────────────────────────────
        # Sourced from the Onboarding Setup fields (Onboarding Buddy / Teammates /
        # Manager) instead of a dedicated child table. Response shape is unchanged
        # so the UI keeps rendering the same cards.
        key_contacts = []
        seen_contacts = set()
        for user_id, role_label in _iter_onboarding_contact_users(onboarding_doc):
            employee = frappe.db.get_value("Employee", {"user_id": user_id}, "name")
            if not employee or (employee, role_label) in seen_contacts:
                continue
            seen_contacts.add((employee, role_label))
            emp = frappe.db.get_value(
                "Employee", employee,
                ["employee_name", "company_email", "custom_office_mobile_no"],
                as_dict=True,
            ) or {}
            key_contacts.append({
                "name": f"{role_label}-{employee}",
                "employee": employee,
                "role": role_label,
                "email": emp.get("company_email"),
                "phone_number": emp.get("custom_office_mobile_no"),
                "idx": len(key_contacts) + 1,
                "employee_name": emp.get("employee_name"),
            })

        # ── Work Location ─────────────────────────────────────────────────────
        work_location_details = None
        if row.custom_work_location:
            work_location_details = frappe.db.get_value(
                "Branch",
                row.custom_work_location,
                [
                    "name",
                    "branch",
                    "custom_location_code",
                    "custom_address",
                    "custom_location_area",
                    "custom_office_area",
                    "custom_office_city",
                    "custom_city",
                    "custom_state",
                    "custom_country",
                    "custom_pin_code",
                    "custom_office_email",
                    "custom_mobile_no",
                    "custom_telephone_no",
                    "custom_google_map_link",
                    "custom_location_url",
                ],
                as_dict=True,
            )

        data = {
            "name": row.name,
            "date_of_joining": row.date_of_joining,
            "designation": row.designation,
            "department": row.department,
            "work_location": row.custom_work_location,
            "work_location_details": work_location_details,
            "key_contacts": key_contacts,
            # ── New fields ──────────────────────────────────────────────────
            "onboarding_status": onboarding_status,
            "dpdp_consent_required": dpdp_required,
            "dpdp_consent_submitted": dpdp_submitted,
            "dpdp_consent_url": dpdp_consent_url,
            "form_completion": form_completion,
            "onboarding_stage": onboarding_stage,
        }

        return _success_response("Onboarding dashboard fetched successfully.", data)

    except frappe.PermissionError:
        return _error_response("You are not permitted to access this onboarding record.", 403)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Onboarding Dashboard API Error")
        return _error_response("Unable to fetch onboarding dashboard right now.", 500)
