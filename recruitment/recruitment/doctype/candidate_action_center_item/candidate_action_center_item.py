import frappe
from frappe.model.document import Document


class CandidateActionCenterItem(Document):
    def autoname(self):
        if not self.candidate_email:
            frappe.throw("Candidate Email is required for naming.")

        email = self.candidate_email.strip().lower()
        count = (
            frappe.db.count(
                "Candidate Action Center Item",
                {"name": ["like", f"{email} - %"]},
            )
            + 1
        )
        self.name = f"{email} - {str(count).zfill(4)}"

    def validate(self):
        if self.candidate_email:
            self.candidate_email = self.candidate_email.strip().lower()
