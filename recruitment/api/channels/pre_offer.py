"""Pre-offer channel — fields surfaced after a candidate clears interviews
and a pre-offer is sent. Pre-offer is NOT a posting channel (no openings are
listed against it); it's a per-applicant phase.

The actual form rendering + save flow already lives in
`recruitment.api.candidate_portal.get_pre_offer_form` /
`save_pre_offer_form_data`. This module's role is just to surface the
"which fields are pre-offer fields for this applicant?" view, sourced from
the applicant's Job Opening rather than the legacy Job Applicant Portal Form.

Endpoints
---------
GET  recruitment.api.channels.pre_offer.get_application_fields(job_applicant)
POST recruitment.api.channels.pre_offer.submit_application(job_applicant, data)
"""

import json

import frappe
from frappe.utils import now_datetime

from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity

from . import _common


CHANNEL = "preoffer"
FILLED_SUBSTATUS = "Pre Offer Form Filled"


@candidate_required
def get_application_fields(job_applicant):
	"""Field list to render on the pre-offer form for the given applicant.

	Looks up the applicant's Job Opening (`job_title`) and returns its
	`view_preoffer = 1` rows. If the applicant has no linked opening, returns
	the fallback list from Job Applicant Profile Settings.
	"""
	if not job_applicant:
		frappe.throw(frappe._("job_applicant is required"))

	# Pre-offer is per-applicant — ensure the authenticated candidate matches
	# the applicant the request is about.
	enforce_candidate_identity(job_applicant_id=job_applicant)

	opening = frappe.db.get_value("Job Applicant", job_applicant, "job_title")
	if not opening:
		# No opening — fall through with a None opening (template will use settings defaults).
		opening = None
	return _common.get_application_fields_for_channel(opening, CHANNEL)


@candidate_required
def submit_application(job_applicant, data):
	"""Candidate submits their filled pre-offer form.

	The fields come from the applicant's Job Opening pre-offer config (form-less).
	Validates `data` against that field set, saves the values onto the Job
	Applicant, marks the pre-offer row Filled and completes its action-center item.

	`data` is a dict (or JSON string) keyed by Job Applicant field references.
	"""
	if not job_applicant:
		frappe.throw(frappe._("job_applicant is required"))

	# Per-applicant — the authenticated candidate must own this applicant.
	enforce_candidate_identity(job_applicant_id=job_applicant)

	if isinstance(data, str):
		data = json.loads(data or "{}")
	if not isinstance(data, dict):
		frappe.throw(frappe._("Data must be a JSON object."))

	opening = frappe.db.get_value("Job Applicant", job_applicant, "job_title")

	# Validate against the pre-offer field set (rejects unknown fields, enforces
	# mandatory_preoffer) and return only the configured fields.
	cleaned = _common.assert_field_set_for_channel(opening, CHANNEL, data)

	fields = _common.get_application_fields_for_channel(opening, CHANNEL)
	table_fields = {f["reference_name"] for f in fields if f["fieldtype"] in ("Table", "Table MultiSelect")}

	doc = frappe.get_doc("Job Applicant", job_applicant)
	for fieldname, value in cleaned.items():
		if fieldname in table_fields and isinstance(value, list):
			doc.set(fieldname, [])
			for row in value:
				doc.append(fieldname, row)
		else:
			doc.set(fieldname, value)

	# Mark the form-less pre-offer row (empty portal_form) as Filled.
	filled_row = None
	for row in (doc.get("custom_pre_offer_forms") or []):
		if not row.portal_form:
			row.status = "Filled"
			row.filled_at = now_datetime()
			filled_row = row
			break

	pre_offer_rows = doc.get("custom_pre_offer_forms") or []
	if pre_offer_rows and all((r.status or "") == "Filled" for r in pre_offer_rows):
		doc.custom_substatus = FILLED_SUBSTATUS

	doc.save(ignore_permissions=True)
	frappe.db.commit()

	# Complete the candidate's pre-offer action-center item.
	if filled_row and doc.email_id:
		from recruitment.api.action_center import mark_item_completed
		mark_item_completed(
			reference_doctype="Job Applicant Pre Offer Form",
			reference_docname=filled_row.name,
			candidate_email=doc.email_id,
			commit=True,
		)

	return {
		"status": "ok",
		"name": job_applicant,
		"updated_fields": list(cleaned.keys()),
		"message": frappe._("Pre Offer Form submitted successfully."),
	}
