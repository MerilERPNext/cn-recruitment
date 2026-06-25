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
  #4  allow_hiring_lead_update_candidate_source    → Job Applicant.source
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


def validate_job_applicant_hiring_lead_edits(doc, method=None):
	if _exempt():
		return
	if not is_hiring_lead_for_company(_company_from_job_title(doc.get("job_title"))):
		return
	s = _settings()
	if not s.get("allow_hiring_lead_update_candidate_source") and _scalar_changed(doc, "source"):
		frappe.throw(_("Hiring leads are not allowed to update the Candidate Source. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))


def validate_job_offer_hiring_lead_edits(doc, method=None):
	if _exempt() or not is_hiring_lead_for_company(doc.get("company")):
		return
	s = _settings()
	if not s.get("allow_hiring_lead_change_designation_at_offer") and _scalar_changed(doc, "designation"):
		frappe.throw(_("Hiring leads are not allowed to change the Designation at the Offer stage. Enable it in Recruitment Settings → Hiring Lead Permission Settings."))
