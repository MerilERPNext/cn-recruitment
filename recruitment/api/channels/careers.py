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
from frappe.utils import cint

from recruitment.api.candidate_auth import (
	candidate_required,
	enforce_candidate_identity,
	get_current_candidate,
)

from . import _common


CHANNEL = "careers"


def _applied_openings(email, opening_names):
	"""Set of opening names this candidate (by email) has already applied to.

	One query for the whole page. `job_title` on Job Applicant is the Link to
	Job Opening, so it holds the opening name."""
	if not email or not opening_names:
		return set()
	return set(
		frappe.get_all(
			"Job Applicant",
			filters={"email_id": email, "job_title": ["in", list(opening_names)]},
			pluck="job_title",
		)
	)


def _saved_openings(email, opening_names):
	"""Set of opening names this candidate (by email) has saved.

	`Saved Job Opening` holds one doc per `candidate_email`; the saved openings
	live in its `job_openings` child table (Saved Job Opening Item.job_opening)."""
	if not email or not opening_names:
		return set()
	parent = frappe.db.get_value("Saved Job Opening", {"candidate_email": email}, "name")
	if not parent:
		return set()
	return set(
		frappe.get_all(
			"Saved Job Opening Item",
			filters={"parent": parent, "job_opening": ["in", list(opening_names)]},
			pluck="job_opening",
		)
	)


@candidate_required
def list_openings(search_term=None, filters=None, email=None, page=None, limit=None):
	"""List openings active on the Careers Page for the authenticated candidate.

	`search_term` optionally does a free-text match on job code / title / labels.
	`filters` is an optional dict (or JSON string) of {fieldname: value | [values]}
	keyed by the configured Career Page Search Filter fields; only those fields are
	honoured. `email` optionally scopes the "already applied" check — it must be the
	authenticated candidate's own email (enforced), otherwise the session email is
	used. Authentication is enforced via the `candidate_portal_session` cookie
	(see `recruitment.api.candidate_auth.candidate_required`).

	`page` (1-based) and `limit` optionally paginate the result. Search/filters are
	applied first, then the matching set is sliced — so paging is consistent with the
	visible list. When `limit` is omitted the full matching list is returned (unchanged
	behaviour); the `pagination` block is always present so the frontend can rely on it.

	Returns ``{"columns": [...], "search_filters": [...], "openings": [...],
	"pagination": {"total", "page", "limit", "total_pages", "has_more"}}`` so the
	frontend can render the card, the search bar and the filter section from a single
	call. Each opening carries ``"applied": true/false`` — true when this candidate
	already created a Job Applicant for that opening, so the frontend can disable
	re-applying — and ``"saved": true/false`` — true when this candidate has this
	opening in their Saved Job Opening list.
	"""
	columns = _common.get_configured_columns(CHANNEL)
	search_filters = _common.get_configured_search_filters()
	# The configured search-filter fields widen what the search box matches; they
	# must also be present on the card so the match can see them.
	search_keys = [f["fieldname"] for f in search_filters]
	extra_fields = [c["fieldname"] for c in columns] + search_keys
	selected = _common.parse_filter_values(filters)
	names = _common.get_openings_active_on_channel(CHANNEL)
	cards = (_common.get_opening_card(n, extra_fields=extra_fields) for n in names)
	openings = [
		c for c in cards
		if c
		and _common.card_matches_search(c, search_term, extra_keys=search_keys)
		and _common.card_matches_filters(c, selected, search_filters)
	]

	# Paginate the matched set. `limit` omitted (or <= 0) -> return everything, so
	# existing callers that don't pass paging keep the full list.
	total = len(openings)
	page = max(cint(page), 1)
	limit = cint(limit)
	if limit > 0:
		start = (page - 1) * limit
		openings = openings[start:start + limit]
		total_pages = -(-total // limit)  # ceil division
		has_more = page < total_pages
	else:
		total_pages = 1
		has_more = False
	pagination = {
		"total": total,
		"page": page,
		"limit": limit,
		"total_pages": total_pages,
		"has_more": has_more,
	}

	# "Already applied" status, for the current page only. Use the candidate's own
	# email — if the frontend passes one, it must match the authenticated session
	# (no querying another candidate's application status).
	check_email = (email or get_current_candidate() or "").strip().lower()
	if email and check_email:
		enforce_candidate_identity(email=check_email)
	page_names = [c["name"] for c in openings]
	applied = _applied_openings(check_email, page_names)
	saved = _saved_openings(check_email, page_names)
	for c in openings:
		c["applied"] = c["name"] in applied
		c["saved"] = c["name"] in saved

	return {
		"columns": columns,
		"search_filters": search_filters,
		"openings": openings,
		"pagination": pagination,
	}


@candidate_required
def list_columns():
	"""Careers list UI config in a single call: the ordered card columns plus the
	search-filter fields, both from Recruitment Settings.

	Returns ``{"columns": [...], "search_filters": [...]}`` where
	  - ``columns`` (Career Page Card Columns, default set when unconfigured):
	    {"fieldname", "label", "value_key"} — values present on every list_openings card.
	  - ``search_filters`` (Career Page Search Filters; [] when unconfigured):
	    {"fieldname", "label", "fieldtype", "options"} — describes each filter control."""
	return {
		"columns": _common.get_configured_columns(CHANNEL),
		"search_filters": _common.get_configured_search_filters(),
	}


@candidate_required
def get_application_fields(opening):
	"""Return the field list the authenticated candidate sees when filling
	out the careers application for `opening`, pre-filled with any values the
	candidate has already saved for it (a Draft Job Applicant preferred), so
	resuming a draft surfaces the previously entered values instead of blanks."""
	if not opening:
		frappe.throw(frappe._("opening is required"))
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not currently posted on the careers page."))

	# Pre-fill from the authenticated candidate's own Job Applicant for this
	# opening (Draft preferred, else the most recent one). Scoped strictly to
	# the session email so one candidate can never read another's values.
	candidate_email = (get_current_candidate() or "").strip().lower()
	job_applicant = None
	if candidate_email:
		job_applicant = frappe.db.get_value(
			"Job Applicant",
			{"email_id": candidate_email, "job_title": opening, "status": "Draft"},
			"name",
			order_by="modified desc",
		) or frappe.db.get_value(
			"Job Applicant",
			{"email_id": candidate_email, "job_title": opening},
			"name",
			order_by="modified desc",
		)
	return _common.get_application_fields_for_channel(opening, CHANNEL, job_applicant=job_applicant)


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
