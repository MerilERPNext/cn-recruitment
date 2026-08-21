import frappe

ROLE = "External Recruiter"
EMAIL_TEMPLATE = "External Recruiter Set Password"


def execute():
	"""Create the two things external-recruiter access needs in code:
	  - the 'External Recruiter' role
	  - the editable external-recruiter welcome Email Template
	Everything else (doctype permissions, workspace) is configured in Desk."""
	_ensure_role()
	_ensure_set_password_template()
	frappe.db.commit()


def _ensure_role():
	from recruitment.recruitment.doctype.ta_external_recruiter.ta_external_recruiter import (
		ensure_external_recruiter_role,
	)

	ensure_external_recruiter_role()


def _ensure_set_password_template():
	"""Seed the editable welcome Email Template (idempotent). HR can edit it in
	Desk → Email Template. Jinja vars: recruiter_name, link, login_url, email."""
	if frappe.db.exists("Email Template", EMAIL_TEMPLATE):
		return
	from recruitment.recruitment.doctype.ta_external_recruiter.ta_external_recruiter import (
		WELCOME_EMAIL_HTML,
		WELCOME_EMAIL_SUBJECT,
	)

	frappe.get_doc({
		"doctype": "Email Template",
		"name": EMAIL_TEMPLATE,
		"subject": WELCOME_EMAIL_SUBJECT,
		"use_html": 1,
		"response_html": WELCOME_EMAIL_HTML,
	}).insert(ignore_permissions=True)
