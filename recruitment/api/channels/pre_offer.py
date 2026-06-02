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
	# Pass the applicant so each field carries its current value (pre-fill).
	return _common.get_application_fields_for_channel(opening, CHANNEL, job_applicant=job_applicant)


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

	# Build the field-level approval rows so HR can approve/reject each submitted
	# field on the Job Applicant (see recruitment.api.pre_offer_field_approval).
	_sync_approval_rows(doc, cleaned, fields)

	# Mark every form-less pre-offer row as Filled — HR may have sent several
	# rounds, but the field set is identical, so one submission satisfies them all.
	# Collect each row's referenced action-center item so we can complete it.
	filled_any = False
	action_items = []
	for row in (doc.get("custom_pre_offer_forms") or []):
		if not row.portal_form:
			row.status = "Filled"
			row.filled_at = now_datetime()
			filled_any = True
			if row.action_item:
				action_items.append(row.action_item)

	pre_offer_rows = doc.get("custom_pre_offer_forms") or []
	if pre_offer_rows and all((r.status or "") == "Filled" for r in pre_offer_rows):
		doc.custom_substatus = FILLED_SUBSTATUS

	doc.save(ignore_permissions=True)
	frappe.db.commit()

	# Complete the referenced pre-offer action-center item(s) for each filled row.
	for action_item in action_items:
		if frappe.db.exists("Candidate Action Center Item", action_item):
			frappe.db.set_value("Candidate Action Center Item", action_item, "status", "Completed")
	if action_items:
		frappe.db.commit()

	return {
		"status": "ok",
		"name": job_applicant,
		"updated_fields": list(cleaned.keys()),
		"message": frappe._("Pre Offer Form submitted successfully."),
	}


def _serialize_for_approval(value, fieldtype):
	"""Snapshot a submitted value as a string for the approval row's current_value.
	Table values are stored as a JSON array; everything else as plain text."""
	if fieldtype in ("Table", "Table MultiSelect"):
		return json.dumps(value if isinstance(value, list) else [], ensure_ascii=False, default=str)
	return "" if value is None else str(value)


def _sync_approval_rows(doc, cleaned, fields):
	"""Upsert one `custom_pre_offer_field_approvals` row per submitted field.

	Newly submitted / changed values land in "Filled" (awaiting HR review). A
	field the candidate left unchanged that HR already "Approved" stays Approved,
	so a re-submission (after some rejections) only re-opens what actually changed.
	"""
	field_defs = {f["reference_name"]: f for f in fields}
	existing = {r.fieldname: r for r in (doc.get("custom_pre_offer_field_approvals") or [])}

	for fieldname, value in cleaned.items():
		fdef = field_defs.get(fieldname)
		if not fdef:
			continue
		fieldtype = fdef.get("fieldtype") or "Data"
		serialized = _serialize_for_approval(value, fieldtype)

		row = existing.get(fieldname)
		# Keep an already-approved, unchanged field approved; otherwise it's Filled.
		if row and (row.approval_status or "") == "Approved" and (row.current_value or "") == serialized:
			status = "Approved"
		else:
			status = "Filled"

		if row is None:
			row = doc.append("custom_pre_offer_field_approvals", {"fieldname": fieldname})
			existing[fieldname] = row

		row.label = fdef.get("display_name") or fieldname
		row.fieldtype = fieldtype
		row.section_label = fdef.get("section") or "General"
		row.options = fdef.get("options") or ""
		row.current_value = serialized
		row.approval_status = status
		if status == "Filled":
			# Reset prior review metadata — this value awaits a fresh decision.
			row.hr_comment = ""
			row.reviewed_by = None
			row.reviewed_on = None
