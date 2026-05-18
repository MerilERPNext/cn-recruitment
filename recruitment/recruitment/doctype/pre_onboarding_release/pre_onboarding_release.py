from urllib.parse import urlencode

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from recruitment.recruitment.doctype.onboarding_buddy_assignment_rule.onboarding_buddy_assignment_rule import (
    resolve_buddies,
)


_BUDDY_FIELD_BY_ROLE = {
    "Onboarding Buddy": "onboarding_buddy",
    "Joining Buddy": "joining_buddy",
    "Manager": "manager",
}


class PreOnboardingRelease(Document):
    def before_insert(self):
        self._autofill_job_offer()
        self._apply_buddy_rules_to_blanks()

    def validate(self):
        if self.status not in {"Draft", "Released", "Onboarding Created"}:
            frappe.throw(_("Invalid status."))

    def after_insert(self):
        self._sync_action_center_item()

    def on_update(self):
        if self.employee_onboarding:
            return
        self._sync_action_center_item()

    def materialize_onboarding(self):
        """Creates the Employee Onboarding doc from this release, stamps the
        release fields onto it, links back, and clears the release-side action
        item. Idempotent: if the EO already exists, returns its name."""
        if self.employee_onboarding:
            return self.employee_onboarding

        doc = frappe.new_doc("Employee Onboarding")
        doc.job_applicant = self.job_applicant
        if self.job_offer:
            doc.job_offer = self.job_offer
        doc.custom_onboarding_portal_form = self.onboarding_portal_form
        doc.custom_pre_onboarding_release = self.name
        doc.custom_bgv_vendor = self.bgv_vendor
        doc.custom_onboarding_buddy = self.onboarding_buddy
        doc.custom_joining_buddy = self.joining_buddy
        doc.custom_manager = self.manager
        doc.insert(ignore_permissions=True)

        self.db_set("employee_onboarding", doc.name, update_modified=False)
        self.db_set("released_at", now_datetime(), update_modified=False)
        self.db_set("status", "Onboarding Created", update_modified=False)

        candidate_email = frappe.db.get_value("Job Applicant", self.job_applicant, "email_id")
        if candidate_email:
            from recruitment.api.action_center import _delete_minimal_item
            _delete_minimal_item(candidate_email, "Pre Onboarding Release", self.name, commit=False)

        return doc.name

    def _sync_action_center_item(self):
        if not self.job_applicant or not self.onboarding_portal_form:
            return
        candidate_email = frappe.db.get_value("Job Applicant", self.job_applicant, "email_id")
        if not candidate_email:
            return

        from recruitment.api.action_center import _upsert_minimal_item
        redirect_url = "/onboarding?" + urlencode({"appl": self.job_applicant, "release": self.name})
        _upsert_minimal_item(
            candidate_email=candidate_email,
            reference_doctype="Pre Onboarding Release",
            reference_docname=self.name,
            redirect_url=redirect_url,
            description="Onboarding form pending. Open portal to complete required details.",
            attachment="",
            commit=False,
        )
        if self.status == "Draft":
            self.db_set("status", "Released", update_modified=False)

    def _autofill_job_offer(self):
        if self.job_offer or not self.job_applicant:
            return
        self.job_offer = frappe.db.get_value(
            "Job Offer",
            {"job_applicant": self.job_applicant, "status": "Accepted", "docstatus": ("<", 2)},
            "name",
            order_by="creation desc",
        )

    def _apply_buddy_rules_to_blanks(self):
        if not self.job_applicant:
            return
        suggested = resolve_buddies(self.job_applicant)
        for role, fieldname in _BUDDY_FIELD_BY_ROLE.items():
            if not self.get(fieldname) and suggested.get(role):
                self.set(fieldname, suggested[role])
