"""Carry the Management Trainee joining date onto Employee Onboarding.

A Trainee's offer holds two dates — `custom_expected_doj`, the day the permanent
role starts and the one onboarding already plans around, and
`custom_trainee_doj`, the day the traineeship itself starts
(`recruitment.patches.add_trainee_joining_date`). Only the first reached
Employee Onboarding, so for a campus hire the date the candidate actually turns
up was nowhere on the onboarding record.

New onboardings are covered by the auto-map that runs at creation
(`recruitment.api.candidate_portal._auto_map_offer_applicant_fields`): it copies
any Employee Onboarding field sharing its fieldname and type with the Job Offer,
Job Offer first. Every creation path — the pre-onboarding release in
`action_center`, the candidate portal, the onboarding API — funnels through the
one `materialize_onboarding_from_applicant`, campus hires included, so none of
them needs changing.

That covers creation and nothing else, which is why the field also carries
`fetch_from`: an onboarding whose Job Offer is linked or swapped after the fact
would otherwise keep a blank date with no way to fill it but by hand.

`custom_employment_type_name` mirrors the offer's Employment Type by its readable
name, purely so the date can be shown for Trainees and hidden for everyone else.
Employment Type is autonamed, so its link value is an opaque id that would differ
site to site — the same reason the field exists on Job Offer.

Existing draft onboardings are backfilled from their offer; submitted ones are
left exactly as they were recorded.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"
TRAINEE = "Trainee"

CUSTOM_FIELDS = {
	"Employee Onboarding": [
		{
			"fieldname": "custom_employment_type_name",
			"fieldtype": "Data",
			"label": "Employment Type Name",
			"insert_after": "job_offer",
			"fetch_from": "job_offer.custom_employment_type_name",
			"read_only": 1,
			"hidden": 1,
			"description": (
				"Mirrors the offer's Employment Type by name so form rules can test it. "
				"Employment Type is autonamed, so its link value is an opaque id."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_trainee_doj",
			"fieldtype": "Date",
			"label": "Management Trainee Joining Date",
			"insert_after": "date_of_joining",
			"depends_on": 'eval:doc.custom_employment_type_name=="{0}"'.format(TRAINEE),
			# The auto-map fills this at creation, but only at creation. `fetch_from`
			# covers the rest: an onboarding whose Job Offer is linked or changed
			# afterwards picks the date up on the form instead of staying blank.
			# `fetch_if_empty` is what keeps the two from fighting — without it every
			# save would pull the offer's date back over a date HR revised here.
			"fetch_from": "job_offer.custom_trainee_doj",
			"fetch_if_empty": 1,
			"description": (
				"The day the traineeship starts, carried from the Job Offer. Date of "
				"Joining stays the date the permanent role begins."
			),
			"module": MODULE,
		},
	]
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	_backfill_type_name()
	_backfill_trainee_doj()
	frappe.db.commit()
	frappe.clear_cache(doctype="Employee Onboarding")


def _backfill_type_name():
	"""Fill the mirror on onboardings that already exist.

	`fetch_from` only runs on save, and a submitted onboarding will not be saved
	again — without this its Trainee joining date would stay hidden on the form.
	"""
	frappe.db.sql(
		"""
		update `tabEmployee Onboarding` eo
		join `tabJob Offer` jo on jo.name = eo.job_offer
		set eo.custom_employment_type_name = jo.custom_employment_type_name
		where coalesce(eo.custom_employment_type_name, '') = ''
		  and coalesce(jo.custom_employment_type_name, '') != ''
		"""
	)


def _backfill_trainee_doj():
	"""Seed existing DRAFT onboardings from the offer they were raised against.

	Drafts only. A submitted onboarding is a record of what was agreed at the
	time, and writing a date into it after the fact would rewrite that.
	"""
	frappe.db.sql(
		"""
		update `tabEmployee Onboarding` eo
		join `tabJob Offer` jo on jo.name = eo.job_offer
		set eo.custom_trainee_doj = jo.custom_trainee_doj
		where eo.docstatus = 0
		  and eo.custom_trainee_doj is null
		  and jo.custom_trainee_doj is not null
		"""
	)
