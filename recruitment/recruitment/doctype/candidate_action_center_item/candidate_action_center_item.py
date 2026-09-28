import frappe
from frappe.utils import cint
from frappe.model.document import Document


class CandidateActionCenterItem(Document):
    def autoname(self):
        if not self.candidate_email:
            frappe.throw("Candidate Email is required for naming.")

        email = self.candidate_email.strip().lower()
        prefix = f"{email} - "
        # Next after the highest suffix in use, not count + 1: items get deleted
        # (withdrawn offers, completed onboardings), and a count then lands on a
        # name that still exists, failing the insert and the hook that raised it.
        # `like` treats _ and % in the email as wildcards, so re-check the prefix.
        suffixes = [
            cint(name[len(prefix):])
            for name in frappe.get_all(
                "Candidate Action Center Item",
                filters={"name": ["like", f"{prefix}%"]},
                pluck="name",
            )
            if name.startswith(prefix)
        ]
        self.name = f"{prefix}{str(max(suffixes, default=0) + 1).zfill(4)}"

    def validate(self):
        if self.candidate_email:
            self.candidate_email = self.candidate_email.strip().lower()
