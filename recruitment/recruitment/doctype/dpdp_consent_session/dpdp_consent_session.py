# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DPDPConsentSession(Document):
    """One handover of a candidate to the external consent portal.

    The portal's callback identifies the candidate only by ``session_id``, so this
    record is the mapping that makes the callback trustworthy — without it a
    callback could not be attributed to anyone. It also keeps the raw request /
    response / callback bodies, which is the only way to support a consent that
    went wrong on the partner's side.
    """

    def validate(self):
        self.set_applicant_full_name()

    def set_applicant_full_name(self):
        """Store the applicant's FULL name (see the consent log for why this is
        read through the shared helper rather than joined locally)."""
        if not self.job_applicant:
            return
        from recruitment.api.applicant_name import get_full_name

        full = get_full_name(self.job_applicant)
        if full:
            self.applicant_name = full
