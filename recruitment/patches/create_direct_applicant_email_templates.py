"""Direct Applicant Onboarding: create editable Email Templates for the emails
the feature sends, and select them in Recruitment Settings, so HR changes the
wording from the UI instead of it living only in code.

    Direct Applicant - Form          -> Form Email Template
    Direct Applicant - CTC Proposal  -> CTC Proposal Email Template
    Direct Applicant - HR Alert      -> HR Alert Email Template

A template that already exists is left as it is, and a setting HR has already
filled is not changed. Idempotent.

Variables — Form: applicant_name, form_link, expires_on, company, resubmission,
note. CTC Proposal: applicant_name, proposal_link, ctc, designation, company,
expires_on, version. HR Alert: applicant_name, job_applicant, event, link.

Dry run:
    bench --site <site> execute \
        recruitment.patches.create_direct_applicant_email_templates.execute --kwargs "{'dry_run': 1}"
"""

import frappe

from recruitment.api.ctc_proposal import DEFAULT_CANDIDATE_EMAIL as PROPOSAL_BODY
from recruitment.api.direct_applicant_form import DEFAULT_CANDIDATE_EMAIL as FORM_BODY
from recruitment.api.direct_applicant_form import DEFAULT_HR_EMAIL as HR_BODY

SETTINGS = "Recruitment Settings"
TEMPLATES = (
	(
		"Direct Applicant - Form",
		"{% if resubmission %}Please correct your details{% else %}Please complete your details{% endif %}",
		FORM_BODY,
		"da_form_email_template",
	),
	("Direct Applicant - CTC Proposal", "Your CTC proposal from {{ company }}", PROPOSAL_BODY, "da_proposal_email_template"),
	("Direct Applicant - HR Alert", "{{ applicant_name }} {{ event }}", HR_BODY, "da_hr_alert_email_template"),
)


def execute(dry_run=False):
	meta = frappe.get_meta(SETTINGS)
	for name, subject, body, setting in TEMPLATES:
		if not meta.has_field(setting):
			continue
		exists = frappe.db.exists("Email Template", name)
		if dry_run:
			print(f"{name}: {'exists' if exists else 'would create'}; setting {setting} = "
				f"{frappe.db.get_single_value(SETTINGS, setting) or '(empty -> would set)'}")
			continue
		if not exists:
			frappe.get_doc({
				"doctype": "Email Template",
				"name": name,
				"subject": subject,
				"use_html": 1,
				"response_html": body.strip(),
			}).insert(ignore_permissions=True)
		if not frappe.db.get_single_value(SETTINGS, setting):
			frappe.db.set_single_value(SETTINGS, setting, name)
