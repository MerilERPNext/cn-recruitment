import frappe
from frappe.model.document import Document
from frappe.utils import cstr, now_datetime

EXTERNAL_SOURCE = "External Portal"

# Terminal states the external consent portal can report. Anything outside these
# two sets (PENDING, IN_PROGRESS, ...) is not a decision yet, so it never grants
# consent and never marks the log declined.
COMPLETED_STATUSES = {"COMPLETED", "COMPLETE", "SUCCESS", "SUCCESSFUL", "ACCEPTED", "CONSENTED"}
DECLINED_STATUSES = {"DECLINED", "REJECTED", "CANCELLED", "CANCELED", "DENIED"}


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
        """Derive consent_given / status from the responses and the consent source.

        Internal form — this system presented the statements, so consent is given
        only when every mandatory statement was ticked (and at least one statement
        was presented).

        External portal — the partner portal presented the notices, enforced its own
        mandatory rules and verified the candidate by OTP before completing. Its
        reported status is therefore authoritative; the response rows are the audit
        detail of what was shown and ticked. Mandatory flags are still honoured when
        the callback sends them, so a payload claiming COMPLETED while a required
        section was refused is caught rather than trusted."""
        responses = self.consent_responses or []
        mandatory = [r for r in responses if r.is_mandatory]
        all_mandatory_accepted = all(r.accepted for r in mandatory)
        external_status = cstr(self.external_status).strip().upper()

        if self.consent_source == EXTERNAL_SOURCE:
            self.consent_given = (
                1 if (external_status in COMPLETED_STATUSES and all_mandatory_accepted) else 0
            )
        else:
            self.consent_given = 1 if (bool(responses) and all_mandatory_accepted) else 0

        if self.consent_given:
            self.status = "Accepted"
            if not self.accepted_on:
                self.accepted_on = now_datetime()
        elif self.consent_source == EXTERNAL_SOURCE and external_status in DECLINED_STATUSES:
            self.status = "Declined"
        elif self.status == "Accepted":
            # was marked accepted but no longer qualifies
            self.status = "Pending"

    def on_submit(self):
        if not self.consent_given:
            frappe.throw(
                "Consent cannot be submitted until all mandatory statements are accepted."
            )
