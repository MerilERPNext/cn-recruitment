import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class JobApplicantDPDPConsentLog(Document):
    def validate(self):
        self.set_applicant_full_name()
        self.evaluate_consent()

    def set_applicant_full_name(self):
        """Store the applicant's FULL name (first + last).

        Job Applicant keeps the first name in ``applicant_name`` and the surname in
        ``custom_applicant_last_name``; fetch_from can only pull one field, so we
        combine them here. Falls back to whatever is present."""
        if not self.job_applicant:
            return
        row = frappe.db.get_value(
            "Job Applicant",
            self.job_applicant,
            ["applicant_name", "custom_applicant_last_name"],
            as_dict=True,
        ) or {}
        full = " ".join(
            p for p in [row.get("applicant_name"), row.get("custom_applicant_last_name")] if p
        ).strip()
        if full:
            self.applicant_name = full

    def evaluate_consent(self):
        """Derive consent_given / status from the individual statement responses.

        Consent is considered given only when every mandatory statement has been
        accepted (and at least one statement was presented)."""
        responses = self.consent_responses or []
        mandatory = [r for r in responses if r.is_mandatory]
        all_mandatory_accepted = bool(responses) and all(r.accepted for r in mandatory)

        self.consent_given = 1 if all_mandatory_accepted else 0

        if self.consent_given:
            self.status = "Accepted"
            if not self.accepted_on:
                self.accepted_on = now_datetime()
        elif self.status == "Accepted":
            # was marked accepted but no longer qualifies
            self.status = "Pending"

    def on_submit(self):
        if not self.consent_given:
            frappe.throw(
                "Consent cannot be submitted until all mandatory statements are accepted."
            )
