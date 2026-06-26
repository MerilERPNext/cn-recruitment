"""Hiring Lead permission gates — Recruitment Settings → Hiring Lead Permission Settings.

A "Hiring Lead" is a user configured in a **Company Wise** Hiring Lead Configuration
for the document's company (see hiring_lead_configuration.is_hiring_lead_for_company).

Each gate:
  - acts ONLY on edits to an EXISTING document (creation is never blocked),
  - applies ONLY to configured hiring leads for the doc's company (everyone else
    and every company without a config is unaffected),
  - exempts System Managers / Administrator,
  - enforces on every save path (Desk, API, scripted) via the `validate` doc_event.

Settings are "Allow …" flags — when a flag is OFF, the matching edit is blocked.

Implemented gates:
  #1  allow_hiring_lead_edit_external_recruiter   → Job Opening.custom_external_recruiters
  #2  allow_hiring_lead_edit_application_fields    → Job Opening.custom_application_fields
  #3  allow_hiring_lead_edit_pre_offer_fields      → Job Opening.custom_application_fields
                                                     (Pre-Offer columns only)
  #4  allow_hiring_lead_update_candidate_source    → Job Applicant.source
  #6  allow_hiring_lead_add_employee_from_offer    → Job Offer "Create Employee"
                                                     (see customizations/job_offer.make_employee)
  #13 allow_hiring_lead_change_designation_at_offer→ Job Offer.designation
"""

import frappe
from frappe import _

from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
	is_hiring_lead_for_company,
)

# Child-row keys that aren't business data — ignored when detecting table changes.
_ROW_META_KEYS = {
	"name", "idx", "creation", "modified", "owner", "modified_by",
	"parent", "parentfield", "parenttype", "docstatus", "doctype",
}


def _exempt():
	"""System Managers / Administrator are never gated by hiring-lead rules."""
	return frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles()


def _settings():
	return frappe.get_cached_doc("Recruitment Settings")


def _scalar_changed(doc, fieldname):
	"""True only on an UPDATE where `fieldname` actually changed (str-normalised so
	type differences don't read as a change). New docs return False."""
	before = doc.get_doc_before_save()
	if not before:
		return False
	return str(before.get(fieldname) or "") != str(doc.get(fieldname) or "")


def _table_changed(doc, fieldname):
	"""True only on an UPDATE where the child table `fieldname` changed (business
	fields only, str-normalised). New docs return False."""
	before = doc.get_doc_before_save()
	if not before:
		return False

	def snapshot(d):
		rows = d.get(fieldname) or []
		out = []
		for r in rows:
			rd = r.as_dict() if hasattr(r, "as_dict") else dict(r)
			out.append({k: str(v) for k, v in rd.items() if k not in _ROW_META_KEYS})
		return out

	return snapshot(before) != snapshot(doc)


def _table_subfields_changed(doc, fieldname, subfields):
	"""True only on an UPDATE where any of `subfields` changed within the rows of
	child table `fieldname` (rows matched by their row name). Row add/remove and
	changes to OTHER columns are ignored — those belong to the full-table gate.
	Used so the Pre-Offer columns can be gated independently of the rest of the
	Application Fields table. New docs return False."""
	before = doc.get_doc_before_save()
	if not before:
		return False

	def index(d):
		out = {}
		for r in d.get(fieldname) or []:
			rd = r.as_dict() if hasattr(r, "as_dict") else dict(r)
			rid = rd.get("name")
			if rid:
				out[rid] = {k: str(rd.get(k) or "") for k in subfields}
		return out

	before_idx, after_idx = index(before), index(doc)
	for rid, after_vals in after_idx.items():
		if rid in before_idx and before_idx[rid] != after_vals:
			return True
	return False


# Per-row columns on Job Opening.custom_application_fields that configure the
# Pre-Offer form. Gated separately from the rest of the Application Fields table.
_PREOFFER_SUBFIELDS = (
	"view_preoffer", "mandatory_preoffer", "preoffer_visibility", "preoffer_edit_approve",
)


def _company_from_job_title(job_title):
	return frappe.db.get_value("Job Opening", job_title, "company") if job_title else None


# ---------------------------------------------------------------------------
# Gates (registered on the `validate` doc_event in hooks.py)
# ---------------------------------------------------------------------------


def validate_job_opening_hiring_lead_edits(doc, method=None):
	if _exempt() or not is_hiring_lead_for_company(doc.get("company")):
		return
	s = _settings()
	if not s.get("allow_hiring_lead_edit_external_recruiter") and _table_changed(doc, "custom_external_recruiters"):
		frappe.throw(_("Hiring leads are not allowed to edit the External Recruiter assignment on a Job Opening. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))
	if not s.get("allow_hiring_lead_edit_application_fields") and _table_changed(doc, "custom_application_fields"):
		frappe.throw(_("Hiring leads are not allowed to edit Application Fields on a Job Opening. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))
	if not s.get("allow_hiring_lead_edit_pre_offer_fields") and _table_subfields_changed(doc, "custom_application_fields", _PREOFFER_SUBFIELDS):
		frappe.throw(_("Hiring leads are not allowed to edit the Pre-Offer field settings on a Job Opening. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))


def validate_job_applicant_hiring_lead_edits(doc, method=None):
	if _exempt():
		return
	if not is_hiring_lead_for_company(_company_from_job_title(doc.get("job_title"))):
		return
	s = _settings()
	if not s.get("allow_hiring_lead_update_candidate_source") and _scalar_changed(doc, "source"):
		frappe.throw(_("Hiring leads are not allowed to update the Candidate Source. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))


@frappe.whitelist()
def can_hiring_lead_add_employee_from_offer(company=None):
	"""Desk UI helper for the Job Offer "Create Employee" button.

	Returns False only when the current user IS a configured hiring lead for
	`company` AND 'Allow Hiring lead to Add Employee From Offer' is OFF — i.e. the
	button should be hidden. True for everyone else, so the button shows as normal.
	(The server-side gate in recruitment.customizations.job_offer.make_employee is
	the real enforcement; this only drives button visibility.)"""
	if _exempt() or not is_hiring_lead_for_company(company):
		return True
	return bool(_settings().get("allow_hiring_lead_add_employee_from_offer"))


def validate_job_offer_hiring_lead_edits(doc, method=None):
	if _exempt() or not is_hiring_lead_for_company(doc.get("company")):
		return
	s = _settings()
	if not s.get("allow_hiring_lead_change_designation_at_offer") and _scalar_changed(doc, "designation"):
		frappe.throw(_("Hiring leads are not allowed to change the Designation at the Offer stage. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))
