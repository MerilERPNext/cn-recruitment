"""Candidates who are ready for onboarding but have none yet.

Two sources, each with an "Initiate" button (see
`recruitment.api.onboarding_retrigger.initiate_pending`):

  * Job Applicant — an Accepted Job Offer and no live Employee Onboarding. The
    automatic creation on acceptance is best-effort and skips silently (DPDP
    consent pending, no Onboarding Portal Form), so these are otherwise lost.
  * New Hire — a pending Employee whose intake is submitted, or whose onboarding
    was cancelled, and no live Employee Onboarding.

A row whose initiation would fail says why in Blocker, and gets no button.
"""

import frappe
from frappe import _

from recruitment.api.new_hire import INITIABLE_STAGES, STAGE_FIELD

SOURCE_JOB_APPLICANT = "Job Applicant"
SOURCE_NEW_HIRE = "New Hire"


def execute(filters=None):
	filters = frappe._dict(filters or {})
	rows = []
	if filters.get("source") in (None, "", SOURCE_JOB_APPLICANT):
		rows += _accepted_applicants(filters)
	if filters.get("source") in (None, "", SOURCE_NEW_HIRE):
		rows += _pending_new_hires(filters)
	return _columns(), rows


def _columns():
	return [
		{"fieldname": "source", "label": _("Source"), "fieldtype": "Data", "width": 110},
		{"fieldname": "reference_doctype", "label": _("Reference Type"), "fieldtype": "Data", "hidden": 1},
		{
			"fieldname": "reference",
			"label": _("Reference"),
			"fieldtype": "Dynamic Link",
			"options": "reference_doctype",
			"width": 190,
		},
		{"fieldname": "candidate_name", "label": _("Candidate"), "fieldtype": "Data", "width": 170},
		{"fieldname": "email", "label": _("Email"), "fieldtype": "Data", "width": 200},
		{"fieldname": "designation", "label": _("Designation"), "fieldtype": "Link", "options": "Designation", "width": 150},
		{"fieldname": "company", "label": _("Company"), "fieldtype": "Link", "options": "Company", "width": 150},
		{"fieldname": "job_offer", "label": _("Job Offer"), "fieldtype": "Link", "options": "Job Offer", "width": 150},
		{"fieldname": "date_of_joining", "label": _("Date of Joining"), "fieldtype": "Date", "width": 110},
		{"fieldname": "blocker", "label": _("Blocker"), "fieldtype": "Data", "width": 260},
		{"fieldname": "action", "label": _("Action"), "fieldtype": "Data", "width": 100},
	]


def _accepted_applicants(filters):
	from recruitment.api.candidate_portal import _dpdp_consent_pending, resolve_onboarding_portal_form

	conditions, values = "", {}
	if filters.get("company"):
		conditions = "and jo.company = %(company)s"
		values["company"] = filters.company

	offers = frappe.db.sql(
		f"""
		select jo.job_applicant, jo.name as job_offer, jo.applicant_name, jo.designation,
			jo.company,
			coalesce(jo.custom_expected_doj, ja.custom_expected_doj) as date_of_joining,
			ja.email_id, ja.custom_onboarding_portal_form
		from `tabJob Offer` jo
		join `tabJob Applicant` ja on ja.name = jo.job_applicant
		where jo.status = 'Accepted' and jo.docstatus < 2
			and not exists (
				select 1 from `tabEmployee Onboarding` eo
				where eo.job_applicant = jo.job_applicant and eo.docstatus < 2
			)
			{conditions}
		order by jo.creation desc
		""",
		values,
		as_dict=True,
	)

	rows, seen = [], set()
	for offer in offers:
		# Newest accepted offer per applicant.
		if offer.job_applicant in seen:
			continue
		seen.add(offer.job_applicant)

		blocker = None
		if _dpdp_consent_pending(offer.job_applicant):
			blocker = _("Waiting for the candidate's DPDP consent")
		elif not offer.custom_onboarding_portal_form and not resolve_onboarding_portal_form(offer.job_applicant):
			blocker = _("No Onboarding Portal Form matches, and none is marked Default")
		elif not offer.date_of_joining:
			# Employee Onboarding requires one, and takes it from the offer.
			blocker = _("No Expected Date of Joining on the Job Offer")

		rows.append(
			{
				"source": SOURCE_JOB_APPLICANT,
				"reference_doctype": "Job Applicant",
				"reference": offer.job_applicant,
				"candidate_name": offer.applicant_name,
				"email": offer.email_id,
				"designation": offer.designation,
				"company": offer.company,
				"job_offer": offer.job_offer,
				"date_of_joining": offer.date_of_joining,
				"blocker": blocker,
			}
		)
	return rows


def _pending_new_hires(filters):
	conditions, values = "", {"stages": tuple(INITIABLE_STAGES)}
	if filters.get("company"):
		conditions = "and e.company = %(company)s"
		values["company"] = filters.company

	employees = frappe.db.sql(
		f"""
		select e.name, e.employee_name, e.designation, e.company, e.date_of_joining,
			coalesce(nullif(e.personal_email, ''), e.company_email) as email
		from `tabEmployee` e
		where e.status = 'Pending'
			and (
				e.`{STAGE_FIELD}` in %(stages)s
				or (
					e.`{STAGE_FIELD}` = 'Onboarding Initiated'
					and exists (
						select 1 from `tabEmployee Onboarding` c
						where c.employee = e.name and c.docstatus = 2
					)
				)
			)
			and not exists (
				select 1 from `tabEmployee Onboarding` eo
				where eo.employee = e.name and eo.docstatus < 2
			)
			{conditions}
		order by e.creation desc
		""",
		values,
		as_dict=True,
	)

	return [
		{
			"source": SOURCE_NEW_HIRE,
			"reference_doctype": "Employee",
			"reference": emp.name,
			"candidate_name": emp.employee_name,
			"email": emp.email,
			"designation": emp.designation,
			"company": emp.company,
			"date_of_joining": emp.date_of_joining,
			"blocker": None if emp.email else _("No email on the new hire"),
		}
		for emp in employees
	]
