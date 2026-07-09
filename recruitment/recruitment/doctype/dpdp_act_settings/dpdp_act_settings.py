import frappe
from frappe.model.document import Document
from frappe.utils import cstr


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
