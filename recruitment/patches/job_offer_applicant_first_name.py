"""Put the candidate's FIRST name back on the Job Offer's Applicant Name.

`recruitment.patches.job_offer_applicant_full_name` repointed
`Job Offer.applicant_name` at `job_applicant.custom_full_name` so an offer letter
would not greet Yaswanth Kumar Dasari as "Yaswanth". That fixed the letter by
redefining the field, and the field is a first name everywhere else:

  * `Job Offer.applicant_last_name` holds the surname right beside it, and the
    same fieldset labels this one "Applicant First Name";
  * `job_offer_utils.get_job_offer_summary` renders
    `applicant_name + " " + applicant_last_name` — with a full name in the first
    half the candidate reads their surname twice;
  * `candidate_portal` maps the offer's `applicant_name` onto the onboarding
    form's `custom_first_name`, which then arrives holding the whole name.

So it goes back to the first name. Anything needing the whole name joins the two
halves rather than expecting one field to be both.

Restored by DELETING the property setter the earlier patch created, not by
writing a new one: `Job Offer.applicant_name` already ships with
`fetch_from = job_applicant.applicant_name`.

Runs after `job_offer_applicant_full_name` in patches.txt, so a fresh site
applies that repoint and then undoes it, landing where an existing site does.
"""

import frappe

JOB_OFFER = "Job Offer"
APPLICANT = "Job Applicant"


def execute():
	_drop_full_name_fetch()
	count = _rewrite_offers()
	frappe.db.commit()
	frappe.clear_cache(doctype=JOB_OFFER)
	print(f"Job Offer applicant names: {count} reset to the candidate's first name")


def _drop_full_name_fetch():
	"""Remove the `fetch_from` override so the doctype's own one applies again."""
	name = frappe.db.exists(
		"Property Setter",
		{"doc_type": JOB_OFFER, "field_name": "applicant_name", "property": "fetch_from"},
	)
	if name:
		frappe.delete_doc("Property Setter", name, ignore_permissions=True, force=True)


def _rewrite_offers():
	"""Restate the first name on offers already raised, and fill a BLANK surname.

	The surname is only ever filled in, never corrected: `applicant_last_name`
	fetches on save, so a populated one is already right, and an offer raised
	before that field existed would otherwise be left showing a first name alone
	on the candidate's offer screen — a regression on today's behaviour.

	`db.set_value`: a submitted Job Offer must not be re-validated to correct a
	display name, and these are the values the fetches would have written. Only
	differences are written, so re-running does nothing.
	"""
	has_last = frappe.get_meta(JOB_OFFER).has_field("applicant_last_name")
	applicant_has_last = frappe.get_meta(APPLICANT).has_field("custom_applicant_last_name")
	fill_last = has_last and applicant_has_last

	fields = ["name", "applicant_name"] + (["custom_applicant_last_name"] if applicant_has_last else [])
	people = {row.name: row for row in frappe.get_all(APPLICANT, fields=fields, limit_page_length=0)}

	offer_fields = ["name", "job_applicant", "applicant_name"] + (["applicant_last_name"] if has_last else [])
	changed = 0

	for offer in frappe.get_all(JOB_OFFER, fields=offer_fields, limit_page_length=0):
		person = people.get(offer.job_applicant)
		if not person:
			# Nothing behind this offer to restate the name from; what it holds is
			# the only record of it.
			continue

		updates = {}
		first = person.get("applicant_name")
		if first and first != offer.get("applicant_name"):
			updates["applicant_name"] = first

		if fill_last and not offer.get("applicant_last_name"):
			last = person.get("custom_applicant_last_name")
			if last:
				updates["applicant_last_name"] = last

		if updates:
			frappe.db.set_value(JOB_OFFER, offer.name, updates, update_modified=False)
			changed += 1

	return changed
