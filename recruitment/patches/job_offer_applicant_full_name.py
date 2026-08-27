"""Point the Job Offer's Applicant Name at the candidate's FULL name.

`Job Offer.applicant_name` fetches from `job_applicant.applicant_name`. That field
used to hold the candidate's whole name, so the offer letter printed correctly by
accident. Now that the Job Applicant keeps the name in clean parts — applicant_name
is the first name and nothing else, with the whole name derived into
`custom_full_name` (see recruitment.api.applicant_name) — the same fetch would put
"Yaswanth" on an offer letter addressed to Yaswanth Kumar Dasari.

So the fetch is repointed at the derived field, and the offers already raised are
rewritten from it. Idempotent: an offer whose name already matches is left alone.
"""

import frappe

from recruitment.api.applicant_name import FULL_FIELD, full_name

JOB_OFFER = "Job Offer"
APPLICANT = "Job Applicant"


def _repoint_fetch():
	frappe.make_property_setter(
		{
			"doctype": JOB_OFFER,
			"fieldname": "applicant_name",
			"doctype_or_field": "DocField",
			"property": "fetch_from",
			"value": f"job_applicant.{FULL_FIELD}",
			"property_type": "Small Text",
		},
		is_system_generated=False,
	)
	frappe.clear_cache(doctype=JOB_OFFER)


def _rewrite_offers():
	"""Restate the name on existing offers from the applicant's derived full name.

	db.set_value: a submitted Job Offer must not be re-validated to correct a display
	name, and this is the same value the fetch would have written.
	"""
	names = {}
	for row in frappe.get_all(
		APPLICANT,
		fields=["name", "applicant_name", "custom_applicant_middle_name",
		        "custom_applicant_last_name", FULL_FIELD],
		limit_page_length=0,
	):
		names[row.name] = row.get(FULL_FIELD) or full_name(
			row.get("applicant_name"), row.get("custom_applicant_middle_name"),
			row.get("custom_applicant_last_name"))

	updated = 0
	for offer in frappe.get_all(
		JOB_OFFER, fields=["name", "job_applicant", "applicant_name"], limit_page_length=0
	):
		wanted = names.get(offer.job_applicant)
		if wanted and wanted != offer.applicant_name:
			frappe.db.set_value(JOB_OFFER, offer.name, "applicant_name", wanted,
			                    update_modified=False)
			updated += 1
	return updated


def execute():
	if not frappe.get_meta(APPLICANT).has_field(FULL_FIELD):
		# split_applicant_name_parts has not run yet — it will, and this patch runs
		# after it. Nothing to point at in the meantime.
		return
	_repoint_fetch()
	updated = _rewrite_offers()
	frappe.db.commit()
	print(f"Job Offer applicant names: {updated} rewritten to the candidate's full name")
