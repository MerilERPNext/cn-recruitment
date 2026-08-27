"""Backfill the Job Offer's Region on offers that already exist.

The field itself is declared in `recruitment/custom/job_offer.json` (with the
`field_order` entry that places it beside Work Location), so it is created and
kept in step by frappe's own customization sync — this patch does not define it.

What a customization file cannot do is move data, which is all that is left here:
an offer raised before the field existed has no region on it, and nothing would
ever fill one in, because `fetch_from` runs on save and these offers are not
going to be saved again.

The chain matches `recruitment.customizations.job_offer.set_offer_region`: the
candidate's interview region, the region they applied under, then the opening's.

Ordered against migrate: patches run BEFORE `sync_customizations`, so the file is
synced here first — otherwise the column would not exist yet and the backfill
would be a no-op that never gets another chance.
"""

import json
import os

import frappe

CUSTOM_FILE = "job_offer.json"


def execute():
	_sync_customization()
	if not frappe.db.has_column("Job Offer", "custom_region"):
		# The field could not be created (older site, file missing). Leave the data
		# alone rather than failing the migrate; the next sync will bring it in.
		return

	_backfill()
	frappe.db.commit()
	frappe.clear_cache(doctype="Job Offer")


def _sync_customization():
	"""Apply recruitment/custom/job_offer.json now, ahead of migrate's own pass."""
	from frappe.modules.utils import sync_customizations_for_doctype

	folder = frappe.get_app_path("recruitment", "recruitment", "custom")
	path = os.path.join(folder, CUSTOM_FILE)
	if not os.path.exists(path):
		return

	try:
		with open(path) as f:
			data = json.load(f)
		sync_customizations_for_doctype(data, folder, CUSTOM_FILE)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "add_job_offer_region: customization sync failed")


def _backfill():
	"""Fill blank regions from the candidate, then from their opening.

	Submitted offers are included deliberately: `fetch_from` is skipped once a
	document is submitted, so a direct write is the only way an already-sent offer
	ever gets one. Only blanks are written — nothing chosen by hand is touched.
	"""
	for source in ("custom_interview_region", "custom_region"):
		frappe.db.sql(
			"""
			update `tabJob Offer` jo
			join `tabJob Applicant` ja on ja.name = jo.job_applicant
			set jo.custom_region = ja.`{0}`
			where coalesce(jo.custom_region, '') = ''
			  and coalesce(ja.`{0}`, '') != ''
			""".format(source)
		)

	frappe.db.sql(
		"""
		update `tabJob Offer` jo
		join `tabJob Applicant` ja on ja.name = jo.job_applicant
		join `tabJob Opening` jop on jop.name = ja.job_title
		set jo.custom_region = jop.custom_region
		where coalesce(jo.custom_region, '') = ''
		  and coalesce(jop.custom_region, '') != ''
		"""
	)
