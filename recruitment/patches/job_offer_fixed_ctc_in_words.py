"""Fill the salary "(In Words)" fields on offers raised before they existed.

New and edited offers are worded on save
(recruitment.customizations.job_offer.set_salary_in_words); this covers the rest,
submitted ones included, so every offer letter can print the words. Idempotent:
a field whose words already match is left alone.
"""

import frappe

from recruitment.customizations.job_offer import SALARY_WORDS_FIELDS, salary_words


def execute():
	meta = frappe.get_meta("Job Offer")
	pairs = {s: w for s, w in SALARY_WORDS_FIELDS.items() if meta.has_field(s) and meta.has_field(w)}
	if not pairs:
		return
	for offer in frappe.get_all(
		"Job Offer", fields=["name", "company", *pairs.keys(), *pairs.values()]
	):
		updates = {}
		for source, words_field in pairs.items():
			words = salary_words(offer.get(source), offer.company)
			if words != (offer.get(words_field) or ""):
				updates[words_field] = words
		if updates:
			frappe.db.set_value("Job Offer", offer.name, updates, update_modified=False)
