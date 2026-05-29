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
GET recruitment.api.channels.pre_offer.get_application_fields(job_applicant)
"""

import frappe

from recruitment.api.candidate_auth import candidate_required, enforce_candidate_identity

from . import _common


CHANNEL = "preoffer"


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
