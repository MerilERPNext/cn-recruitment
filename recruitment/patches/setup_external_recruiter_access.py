import frappe

ROLE = "External Recruiter"
EMAIL_TEMPLATE = "External Recruiter Set Password"


def execute():
	"""Create the two things external-recruiter access needs in code:
	  - the 'External Recruiter' role
	  - the editable 'Set your password' Email Template
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
	"""Seed the editable 'set your password' Email Template (idempotent). HR can
	edit it in Desk → Email Template. Jinja vars: recruiter_name, link,
	login_url, email."""
	if frappe.db.exists("Email Template", EMAIL_TEMPLATE):
		return
	from recruitment.recruitment.doctype.ta_external_recruiter.ta_external_recruiter import (
		SET_PASSWORD_EMAIL_HTML,
	)

	frappe.get_doc({
		"doctype": "Email Template",
		"name": EMAIL_TEMPLATE,
		"subject": "Set your password to access your job openings",
		"use_html": 1,
		"response_html": SET_PASSWORD_EMAIL_HTML,
	}).insert(ignore_permissions=True)
