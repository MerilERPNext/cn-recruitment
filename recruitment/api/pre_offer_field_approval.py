"""Field-level / section-level approval for the Pre Offer form.

Mirrors recruitment.api.field_level_approval (Employee Onboarding) but the data
lives on the Job Applicant's `custom_pre_offer_field_approvals` child table
(rows of "Job Applicant Pre Offer Field"). The rows are populated when the
candidate submits the pre-offer form
(recruitment.api.channels.pre_offer.submit_application).

Status lifecycle per field:
    Pending  → not yet filled by the candidate
    Filled   → candidate submitted; awaiting HR review
    Approved → HR approved; locked
    Rejected → HR rejected with a comment; candidate can re-fill

A rejection re-opens the candidate's pre-offer action-center item so they can
correct and resubmit; once nothing is rejected the item is completed again
(see recruitment.api.action_center.sync_pre_offer_field_rejection_action).
"""

import json

import frappe
from frappe import _

from recruitment.api.action_center import sync_pre_offer_field_rejection_action
from recruitment.api.hiring_stage import advance_on_pre_offer_approved


VALID_STATUSES = frozenset({"Pending", "Filled", "Approved", "Rejected"})

# Layout / framework fields we never want to surface as child-table columns.
_LAYOUT_FIELDTYPES = frozenset({
	"Section Break", "Column Break", "Tab Break", "HTML", "HTML Editor",
	"Button", "Fold", "Heading", "Break", "Image",
})
_SKIP_CHILD_FIELDNAMES = frozenset({
	"name", "idx", "parent", "parentfield", "parenttype",
	"docstatus", "owner", "creation", "modified", "modified_by",
})


# ─── meta / value helpers ───────────────────────────────────────────────────

def _get_child_meta_fields(child_doctype):
	"""User-facing column defs for a child (Table) doctype."""
	if not child_doctype or not frappe.db.exists("DocType", child_doctype):
		return []
	try:
		meta = frappe.get_meta(child_doctype)
	except Exception:
		return []
	fields = []
	for df in meta.fields:
		if df.fieldtype in _LAYOUT_FIELDTYPES:
			continue
		if df.fieldname in _SKIP_CHILD_FIELDNAMES or df.get("hidden"):
			continue
		fields.append({
			"fieldname": df.fieldname,
			"label": (df.label or df.fieldname).strip(),
			"fieldtype": df.fieldtype,
		})
	return fields


def _deserialize_value(raw, fieldtype):
	if fieldtype in ("Table", "Table MultiSelect"):
		try:
			return json.loads(raw) if raw else []
		except Exception:
			return []
	return raw or ""


def _get_doc(job_applicant):
	try:
		return frappe.get_doc("Job Applicant", job_applicant)
	except frappe.DoesNotExistError:
		return None


def _save_doc(doc):
	doc.save(ignore_permissions=True)
	frappe.db.commit()


# ─── child table → approval list ────────────────────────────────────────────

def _load_approval_list(doc):
	"""Build the panel data from `custom_pre_offer_field_approvals` rows."""
	result = []
	for row in (doc.get("custom_pre_offer_field_approvals") or []):
		fn = row.get("fieldname") or ""
		if not fn:
			continue
		fieldtype = row.get("fieldtype") or "Data"
		section = (row.get("section_label") or "General").strip()
		status = row.get("approval_status") or "Pending"
		entry = {
			"fieldname": fn,
			"label": (row.get("label") or fn).strip(),
			"fieldtype": fieldtype,
			"section": section,
			"status": status,
			"approval_status": status,
			"current_value": _deserialize_value(row.get("current_value") or "", fieldtype),
			"hr_comment": row.get("hr_comment") or "",
			"reviewed_by": row.get("reviewed_by") or None,
			"reviewed_on": row.get("reviewed_on") or None,
		}
		if fieldtype in ("Table", "Table MultiSelect"):
			cd = row.get("options") or ""
			entry["child_doctype"] = cd
			entry["child_fields"] = _get_child_meta_fields(cd) if cd else []
		result.append(entry)
	return result


def _compute_counts(approval_list):
	counts = {"Pending": 0, "Filled": 0, "Approved": 0, "Rejected": 0}
	for e in approval_list:
		st = e.get("status") or "Pending"
		counts[st] = counts.get(st, 0) + 1
	return counts


# ─── endpoints ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_pre_offer_fields_for_approval(job_applicant):
	"""All pre-offer fields with values + statuses, grouped by section."""
	frappe.has_permission("Job Applicant", "read", throw=True)
	doc = _get_doc(job_applicant)
	if not doc:
		frappe.local.response["http_status_code"] = 404
		return {"status": "error",
				"message": _("Job Applicant not found: {0}").format(job_applicant),
				"data": []}

	enriched = _load_approval_list(doc)
	counts = _compute_counts(enriched)

	sections = {}
	for e in enriched:
		sec = e.get("section", "General")
		if sec not in sections:
			sections[sec] = {"Pending": 0, "Filled": 0, "Approved": 0, "Rejected": 0, "total": 0}
		st = e.get("status", "Pending")
		sections[sec][st] = sections[sec].get(st, 0) + 1
		sections[sec]["total"] += 1

	return {
		"status": "success",
		"job_applicant": doc.name,
		"total": len(enriched),
		"counts": counts,
		"sections": sections,
		"data": enriched,
	}


@frappe.whitelist()
def update_field_approval_status(job_applicant, fieldname, new_status, comment=None):
	"""Approve / Reject / reset a single pre-offer field."""
	if new_status not in VALID_STATUSES:
		frappe.local.response["http_status_code"] = 400
		return {"status": "error", "message": _("Invalid status '{0}'.").format(new_status)}

	frappe.has_permission("Job Applicant", "write", throw=True)
	doc = _get_doc(job_applicant)
	if not doc:
		frappe.local.response["http_status_code"] = 404
		return {"status": "error", "message": _("Job Applicant not found: {0}").format(job_applicant)}

	reviewer = frappe.session.user
	now = frappe.utils.now()
	updated = False

	for row in (doc.get("custom_pre_offer_field_approvals") or []):
		if row.get("fieldname") != fieldname:
			continue
		row.approval_status = new_status
		if new_status == "Rejected":
			row.hr_comment = comment or ""
			row.reviewed_by = reviewer
			row.reviewed_on = now
		elif new_status == "Approved":
			row.hr_comment = ""
			row.reviewed_by = reviewer
			row.reviewed_on = now
		elif new_status == "Pending":
			row.hr_comment = ""
			row.reviewed_by = None
			row.reviewed_on = None
		# "Filled" is set only by candidate submit — HR cannot set it directly.
		updated = True
		break

	if not updated:
		frappe.local.response["http_status_code"] = 400
		return {"status": "error", "message": _("Field '{0}' not found in pre-offer fields.").format(fieldname)}

	_save_doc(doc)
	doc.reload()
	sync_pre_offer_field_rejection_action(doc)
	advance_on_pre_offer_approved(job_applicant)  # auto-advance to Job Offer when all fields approved

	return {"status": "success", "message": _("Updated"), "data": _load_approval_list(doc)}


@frappe.whitelist()
def update_section_approval_status(job_applicant, section_name, new_status, comment=None):
	"""Approve / Reject every reviewable field in a section."""
	if new_status not in VALID_STATUSES:
		frappe.local.response["http_status_code"] = 400
		return {"status": "error", "message": _("Invalid status '{0}'.").format(new_status)}

	frappe.has_permission("Job Applicant", "write", throw=True)
	doc = _get_doc(job_applicant)
	if not doc:
		frappe.local.response["http_status_code"] = 404
		return {"status": "error", "message": _("Job Applicant not found: {0}").format(job_applicant)}

	reviewer = frappe.session.user
	now = frappe.utils.now()
	updated = 0

	for row in (doc.get("custom_pre_offer_field_approvals") or []):
		row_section = (row.get("section_label") or "General").strip()
		if row_section != section_name:
			continue
		row.approval_status = new_status
		if new_status == "Rejected":
			row.hr_comment = comment or ""
			row.reviewed_by = reviewer
			row.reviewed_on = now
		elif new_status == "Approved":
			row.hr_comment = ""
			row.reviewed_by = reviewer
			row.reviewed_on = now
		elif new_status == "Pending":
			row.hr_comment = ""
			row.reviewed_by = None
			row.reviewed_on = None
		updated += 1

	if not updated:
		frappe.local.response["http_status_code"] = 400
		return {"status": "error", "message": _("No reviewable fields found for section '{0}'.").format(section_name)}

	_save_doc(doc)
	doc.reload()
	sync_pre_offer_field_rejection_action(doc)
	advance_on_pre_offer_approved(job_applicant)  # auto-advance to Job Offer when all fields approved

	approval_list = _load_approval_list(doc)
	section_data = [r for r in approval_list if r.get("section") == section_name]
	return {
		"status": "success",
		"message": _("{0} field(s) in '{1}' set to {2}").format(updated, section_name, new_status),
		"counts": _compute_counts(approval_list),
		"data": section_data,
	}


@frappe.whitelist()
def bulk_update_approval_status(job_applicant, new_status, comment=None):
	"""Approve / Reject every Pending or Filled pre-offer field at once."""
	if new_status not in {"Approved", "Rejected"}:
		frappe.local.response["http_status_code"] = 400
		return {"status": "error", "message": _("Only 'Approved' or 'Rejected' allowed for bulk update.")}

	frappe.has_permission("Job Applicant", "write", throw=True)
	doc = _get_doc(job_applicant)
	if not doc:
		frappe.local.response["http_status_code"] = 404
		return {"status": "error", "message": _("Job Applicant not found: {0}").format(job_applicant)}

	reviewer = frappe.session.user
	now = frappe.utils.now()

	for row in (doc.get("custom_pre_offer_field_approvals") or []):
		if (row.get("approval_status") or "Pending") not in ("Pending", "Filled"):
			continue
		row.approval_status = new_status
		row.reviewed_by = reviewer
		row.reviewed_on = now
		row.hr_comment = "" if new_status == "Approved" else (comment or "")

	_save_doc(doc)
	doc.reload()
	sync_pre_offer_field_rejection_action(doc)
	advance_on_pre_offer_approved(job_applicant)  # auto-advance to Job Offer when all fields approved

	approval_list = _load_approval_list(doc)
	return {"status": "success", "message": _("Done"), "counts": _compute_counts(approval_list), "data": approval_list}
