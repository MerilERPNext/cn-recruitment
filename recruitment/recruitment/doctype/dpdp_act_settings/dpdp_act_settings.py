import frappe
from frappe.model.document import Document
from frappe.utils import cint, cstr

LOG_DOCTYPE = "Job Applicant DPDP Consent Log"


class DPDPActSettings(Document):
    def validate(self):
        self.backfill_consent_keys()

    def backfill_consent_keys(self):
        """Give every consent statement a stable key so acceptance can be logged
        reliably even if the wording is later edited."""
        used = set()
        for row in self.consent_statements or []:
            key = frappe.scrub(cstr(row.consent_key).strip())
            if not key:
                key = frappe.scrub(cstr(row.statement).strip())[:60].strip("_")
            if not key:
                key = f"statement_{row.idx}"
            base, n = key, 1
            while key in used:
                n += 1
                key = f"{base}_{n}"
            used.add(key)
            row.consent_key = key

    def as_consent_form(self, appl=None):
        """Build the render-ready consent-page config from this configuration.

        Everything the candidate portal shows is derived here — titles, column
        labels, the information table and the consent checkboxes all come from
        the values configured on this Single. The UI renders only what is present,
        so adding/removing a clause or a checkbox in Settings changes the page
        with no frontend change. When ``appl`` is given, applicant prefill and
        prior-consent status are included too.
        """
        # Information table -> a plain list of rows keyed by the configured column
        # labels, so the UI can render columns straight from the keys.
        info_label = self.information_column_label or "Information Collected"
        purpose_label = self.purpose_column_label or "Purpose of Collection and Use"
        information = [
            {info_label: row.information_collected, purpose_label: row.purpose}
            for row in (self.information_clauses or [])
            if row.is_active
        ]

        # Consent checkboxes — each carries its input type so the UI can render it.
        consent_statements = [
            {
                "consent_key": row.consent_key,
                "statement": row.statement,
                "fieldtype": "Check",
                "is_mandatory": cint(row.is_mandatory),
            }
            for row in (self.consent_statements or [])
            if row.is_active
        ]

        # Acknowledgement inputs -> a list of field objects (fieldname, type,
        # mandatory). Only the ones enabled in Settings are included.
        acknowledgement = []
        if cint(self.capture_employee_name):
            acknowledgement.append({
                "fieldname": "employee_name",
                "label": "Employee Name",
                "fieldtype": "Data",
                "is_mandatory": 1,
            })
        acknowledgement.append({
            "fieldname": "signature",
            "label": "Signature",
            "fieldtype": "Signature",
            "is_mandatory": 1,
        })
        if cint(self.capture_date):
            acknowledgement.append({
                "fieldname": "acceptance_date",
                "label": "Acceptance Date",
                "fieldtype": "Date",
                "is_mandatory": 0,
            })

        form = {
            "enabled": True,
            "enforce_before_onboarding": cint(self.enforce_before_onboarding),
            "header": {
                "title": self.form_title,
                "subtitle": self.form_subtitle,
            },
            "intro_content": self.intro_content,
            "information": information,
            "closing_content": self.closing_content,
            "declaration": {
                "heading": self.declaration_heading,
                "require_all_mandatory": cint(self.require_all_mandatory),
                "statements": consent_statements,
            },
            "acknowledgement": acknowledgement,
            "confirmation_note": self.confirmation_note,
        }

        if appl:
            applicant = frappe.db.get_value(
                "Job Applicant", appl, ["applicant_name", "email_id"], as_dict=True
            ) or {}
            existing = frappe.db.get_value(
                LOG_DOCTYPE,
                {"job_applicant": appl, "docstatus": 1, "consent_given": 1},
                "name",
            )
            form["applicant"] = {
                "name": applicant.get("applicant_name"),
                "email": applicant.get("email_id"),
            }
            form["already_consented"] = bool(existing)
            form["consent_log"] = existing

        return form


@frappe.whitelist(allow_guest=True)
def get_consent_form(appl, token=None):
    """Guest endpoint that returns the DPDP consent page configuration.

    Gated with the same signed offer token the candidate already holds (the page
    is reached right after Job Offer acceptance). ``enabled: False`` means the
    feature is off and the page should be skipped entirely — the caller then
    behaves exactly as before.
    """
    from recruitment.job_offer_utils import _authorize_offer, is_dpdp_consent_enabled

    if not appl:
        frappe.throw(frappe._("Missing applicant parameter"))
    _authorize_offer(appl, token, "read")

    if not is_dpdp_consent_enabled():
        return {"enabled": False}

    settings = frappe.get_cached_doc("DPDP Act Settings")
    return settings.as_consent_form(appl=appl)
