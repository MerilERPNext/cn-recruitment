# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class DPDPConsentSession(Document):
    """One handover of a candidate to the external consent portal.

    The portal's callback identifies the candidate only by ``session_id``, so this
    record is the mapping that makes the callback trustworthy — without it a
    callback could not be attributed to anyone. It also keeps the raw request /
    response / callback bodies, which is the only way to support a consent that
    went wrong on the partner's side.
    """

    def autoname(self):
        """Name the row without touching the ``tabSeries`` counter.

        A naming series takes ``SELECT ... FOR UPDATE`` on the shared tabSeries row,
        and this record is created on a path that is both retried and concurrent —
        a candidate re-requesting a link, a frontend retry loop, several candidates
        accepting at once. That contention surfaced as
        "(1020, Record has changed since last read in table 'tabSeries')" and failed
        the handover for a purely cosmetic reason: the row's name.

        A random suffix needs no counter, so there is no shared row to lock and no
        way for two concurrent starts to block each other. The date prefix keeps the
        names sortable and recognisable in the list view.
        """
        self.name = "DPDP-SESS-{0}-{1}".format(
            now_datetime().strftime("%Y%m%d"), frappe.generate_hash(length=6).upper()
        )

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
