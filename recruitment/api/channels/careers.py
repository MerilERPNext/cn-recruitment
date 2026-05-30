"""Careers Page channel — public-facing job listings + the application form.

Endpoints
---------
GET  recruitment.api.channels.careers.list_openings
GET  recruitment.api.channels.careers.get_application_fields(opening)
POST recruitment.api.channels.careers.submit_application(opening, data)

The form-rendering / pre-fill endpoints already live in
`recruitment.api.candidate_portal`; this module focuses on the channel-specific
listing and submit so the frontend has a single place to call for Careers Page.
"""

import frappe

from recruitment.api.candidate_auth import candidate_required, get_current_candidate

from . import _common


CHANNEL = "careers"


@candidate_required
def list_openings(search_term=None):
	"""List openings active on the Careers Page for the authenticated candidate.

	`search_term` optionally filters by job code / title. Authentication is enforced
	via the `candidate_portal_session` cookie
	(see `recruitment.api.candidate_auth.candidate_required`).
	"""
	names = _common.get_openings_active_on_channel(CHANNEL)
	cards = (_common.get_opening_card(n) for n in names)
	return [c for c in cards if c and _common.card_matches_search(c, search_term)]


@candidate_required
def get_application_fields(opening):
	"""Return the field list the authenticated candidate sees when filling
	out the careers application for `opening`."""
	if not opening:
		frappe.throw(frappe._("opening is required"))
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not currently posted on the careers page."))
	return _common.get_application_fields_for_channel(opening, CHANNEL)


@candidate_required
def submit_application(opening, data):
	"""Create a Job Applicant from a careers-page submission for the
	currently authenticated candidate.

	`data` is a dict keyed by Job Applicant field references. Only fields
	configured for the careers channel are accepted; mandatory_careers
	fields must be present. The candidate's session email is stamped onto
	`email_id` if the payload doesn't supply one — so the resulting Job
	Applicant is always linked back to the logged-in candidate.
	"""
	if isinstance(data, str):
		import json as _json
		data = _json.loads(data or "{}")

	if not opening:
		frappe.throw(frappe._("opening is required"))
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not currently posted on the careers page."))

	cleaned = _common.assert_field_set_for_channel(opening, CHANNEL, data)
	source = _common.source_value_for(CHANNEL)
	candidate_email = (get_current_candidate() or "").strip().lower()

	applicant = frappe.new_doc("Job Applicant")
	applicant.job_title = opening
	if source:
		applicant.source = source
	# Always anchor the applicant to the authenticated candidate's email.
	if candidate_email and not cleaned.get("email_id"):
		applicant.email_id = candidate_email
	for k, v in cleaned.items():
		applicant.set(k, v)
	applicant.insert(ignore_permissions=True)

	return {"status": "ok", "name": applicant.name, "source": source}
