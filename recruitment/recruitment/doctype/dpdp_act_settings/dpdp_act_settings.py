import frappe
from frappe.model.document import Document
from frappe.utils import cint, cstr

LOG_DOCTYPE = "Job Applicant DPDP Consent Log"


class DPDPActSettings(Document):
    def onload(self):
        self.show_callback_url()

    def validate(self):
        self.backfill_consent_keys()
        self.show_callback_url()
        self.validate_external_config()

    def show_callback_url(self):
        """Surface the URL the partner portal must POST completed consents to.

        Read-only and derived, so it can never drift from the actual route and the
        HR/integration user can copy it straight out of Settings."""
        try:
            from recruitment.dpdp_external_consent import callback_url

            self.callback_url_display = callback_url()
        except Exception:
            pass

    def validate_external_config(self):
        """Fail loudly at save time rather than silently at handover time.

        A half-configured external mode only shows up when a real candidate accepts
        an offer, which is the worst possible moment to discover it."""
        from recruitment.dpdp_external_consent import EXTERNAL_MODE

        if not cint(self.enabled) or self.consent_mode != EXTERNAL_MODE:
            return

        missing = [
            label
            for field, label in (
                ("consent_start_url", "Consent Start URL"),
                ("partner_username", "Partner Username"),
                ("partner_password", "Partner Password"),
            )
            if not cstr(self.get(field)).strip()
        ]
        if missing:
            frappe.throw(
                frappe._("External Portal mode needs these fields: {0}").format(", ".join(missing))
            )

        # The callback is guest-reachable; without a secret it would accept an
        # anonymous POST, so it refuses to run at all — better to block the save.
        # A Password field reads back as a mask once loaded, so the stored value is
        # checked too rather than trusting the in-document one.
        stored = self.get_password("callback_secret", raise_exception=False)
        if not cstr(self.get("callback_secret")).strip() and not cstr(stored).strip():
            frappe.throw(
                frappe._(
                    "Set a Callback Secret before enabling External Portal mode — "
                    "use <b>Generate Callback Secret</b> and share it with the consent portal team."
                )
            )

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
        if cint(self.capture_date):
            acknowledgement.append({
                "fieldname": "acceptance_date",
                "label": "Acceptance Date",
                "fieldtype": "Date",
                "is_mandatory": 0,
            })

        form = {
            "enabled": True,
            "consent_mode": self.consent_mode or "Internal Form",
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

    from recruitment.dpdp_external_consent import EXTERNAL_MODE, is_external_consent_mode

    # External mode: there is no form to render here — the notices live on the
    # partner portal. Tell the caller to hand the candidate over instead, so a page
    # that still calls this endpoint routes correctly rather than showing a blank
    # form built from unused settings.
    if is_external_consent_mode():
        from recruitment.dpdp_external_consent import get_or_start_session

        settings = frappe.get_cached_doc("DPDP Act Settings")
        payload = {
            "enabled": True,
            "consent_mode": EXTERNAL_MODE,
            "enforce_before_onboarding": cint(settings.enforce_before_onboarding),
            "header": {"title": settings.form_title, "subtitle": settings.form_subtitle},
        }
        existing = frappe.db.get_value(
            LOG_DOCTYPE, {"job_applicant": appl, "docstatus": 1, "consent_given": 1}, "name"
        )
        payload["already_consented"] = bool(existing)
        payload["consent_log"] = existing
        if not existing:
            session = get_or_start_session(appl)
            payload["consent_url"] = session["short_url"]
            payload["session_id"] = session["session_id"]
        return payload

    settings = frappe.get_cached_doc("DPDP Act Settings")
    return settings.as_consent_form(appl=appl)
