import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class JobApplicantDPDPConsentLog(Document):
    def validate(self):
        self.set_applicant_full_name()
        self.evaluate_consent()

    def set_applicant_full_name(self):
        """Store the applicant's FULL name.

        Job Applicant keeps the name in parts (first / middle / surname) and derives
        ``custom_full_name`` from them; fetch_from can only pull one field, so the
        derived name is read here through the shared helper rather than being joined
        again locally — joining it here is how "Neha Iyer Iyer" used to happen."""
        if not self.job_applicant:
            return
        from recruitment.api.applicant_name import get_full_name

        full = get_full_name(self.job_applicant)
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
