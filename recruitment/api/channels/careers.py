"""Careers Page channel — the single place the Careers Page frontend calls.

Listing / form
--------------
GET  recruitment.api.channels.careers.list_openings
GET  recruitment.api.channels.careers.list_columns
GET  recruitment.api.channels.careers.get_application_fields(opening)

Application (one endpoint, status-driven: draft vs submit)
----------------------------------------------------------
POST recruitment.api.channels.careers.submit_application(job_applicant_email, job_opening, form_data, status)
GET  recruitment.api.channels.careers.get_draft(job_applicant_email, job_opening=None)
POST recruitment.api.channels.careers.delete_draft(job_applicant_email, job_opening)
GET  recruitment.api.channels.careers.get_applied_jobs(email)

Saved openings
--------------
POST recruitment.api.channels.careers.toggle_saved_job_opening(candidate_email, job_opening)
GET  recruitment.api.channels.careers.get_saved_job_openings(candidate_email)

A candidate application is a single Job Applicant whose `status` decides the
stage: "Draft" while being filled (partial data allowed), "Open" once really
submitted (full validation). Only non-Draft applications count as "applied".
"""

import json as _json

import frappe
from frappe.utils import cint, getdate, now_datetime

from recruitment.api.candidate_auth import (
	candidate_required,
	enforce_candidate_identity,
	get_current_candidate,
)

from . import _common


CHANNEL = "careers"

APPLICANT_DOCTYPE = "Job Applicant"
DRAFT_STATUS = "Draft"
SUBMIT_STATUS = "Open"
APPLICANT_STATUS_TERMINAL = "Rejected"

# What the frontend may send as `status` -> the Job Applicant status we store.
_STATUS_ALIASES = {
	"draft": DRAFT_STATUS,
	"submit": SUBMIT_STATUS,
	"submitted": SUBMIT_STATUS,
	"open": SUBMIT_STATUS,
}


def _ok(message, data, http=200):
	frappe.local.response["http_status_code"] = http
	return {"success": True, "message": message, "data": data}


def _err(message, http=400):
	frappe.local.response["http_status_code"] = http
	return {"success": False, "message": message, "data": None}


def _resolve_status(status):
	"""Map the frontend `status` ("draft" / "submit" / "open") to the stored
	Job Applicant status. draft => partial save, submit/open => real application."""
	resolved = _STATUS_ALIASES.get((status or "draft").strip().lower())
	if not resolved:
		frappe.throw(frappe._("status must be one of: draft, submit, open"))
	return resolved


def _coerce_form_data(form_data):
	"""Accept form_data as a dict or a JSON string; always return a dict."""
	if form_data in (None, ""):
		return {}
	if isinstance(form_data, str):
		try:
			parsed = frappe.parse_json(form_data)
		except Exception:
			frappe.throw(frappe._("form_data must be valid JSON."))
		if not isinstance(parsed, dict):
			frappe.throw(frappe._("form_data must be a JSON object."))
		return parsed
	if isinstance(form_data, dict):
		return form_data
	frappe.throw(frappe._("form_data must be a JSON object or JSON string."))


# Field types whose value is textual — an empty string "" is a valid value for
# these. For every other type (Date, Int, Float, Currency, Check, Table, ...) an
# empty string is meaningless and, worse, makes Frappe raise TypeError at save
# (e.g. iterating "" as a child table). Those get normalised to None / [].
_TEXTUAL_FIELDTYPES = {
	"Data", "Small Text", "Text", "Long Text", "Text Editor", "Code",
	"HTML Editor", "Markdown Editor", "Select", "Link", "Dynamic Link",
	"Attach", "Attach Image", "Read Only", "Password", "Phone", "Signature",
	"Barcode", "Color", "JSON", "Geolocation",
}


def _clean_value_for_field(df, value):
	"""Normalise a raw form value for its target field so typed columns don't
	choke on empty strings. Table fields must be a list (else emptied); other
	non-text fields turn "" into None."""
	if df.fieldtype in ("Table", "Table MultiSelect"):
		return value if isinstance(value, list) else []
	if value == "" and df.fieldtype not in _TEXTUAL_FIELDTYPES:
		return None
	return value


def _apply_form_data(doc, payload):
	"""Set each payload key onto the Job Applicant. Child tables are reset then
	reappended — each row cleaned against the child doctype's own fields, dropping
	keys that aren't real child fields. Typed fields are protected from empty-string
	values that would otherwise raise TypeError at save."""
	meta = doc.meta
	for fieldname, value in payload.items():
		df = meta.get_field(fieldname)
		if not df:
			continue
		if df.fieldtype in ("Table", "Table MultiSelect"):
			doc.set(fieldname, [])
			if not isinstance(value, list):
				continue
			child_meta = frappe.get_meta(df.options)
			for row in value:
				if not isinstance(row, dict):
					continue
				clean = {}
				for k, v in row.items():
					cdf = child_meta.get_field(k)
					if not cdf:
						continue  # not a real child field — drop it
					clean[k] = _clean_value_for_field(cdf, v)
				doc.append(fieldname, clean)
		else:
			doc.set(fieldname, _clean_value_for_field(df, value))


def _find_draft(email, opening):
	"""Name of this candidate's existing Draft Job Applicant for `opening`, if any."""
	return frappe.db.get_value(
		APPLICANT_DOCTYPE,
		{"email_id": email, "job_title": opening, "status": DRAFT_STATUS},
		"name",
		order_by="modified desc",
	)


def _applied_openings(email, opening_names):
	"""Set of opening names this candidate (by email) has actually applied to.

	One query for the whole page. `job_title` on Job Applicant is the Link to
	Job Opening, so it holds the opening name. Draft applications are excluded —
	a draft-in-progress must not read as "applied" or the candidate can't resume it."""
	if not email or not opening_names:
		return set()
	return set(
		frappe.get_all(
			"Job Applicant",
			filters={
				"email_id": email,
				"job_title": ["in", list(opening_names)],
				"status": ["!=", DRAFT_STATUS],
			},
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
def submit_application(job_applicant_email, job_opening, form_data=None, status="draft"):
	"""Single entry point for careers-page applications — create or update the
	candidate's Job Applicant for `job_opening`, driven by `status`:

	  - status "draft"           -> stored as Draft. Partial data is allowed and
	                                mandatory fields are NOT enforced, so the
	                                candidate can save and resume later.
	  - status "submit" / "open" -> stored as Open (a real application): the full
	                                configured careers field set is validated
	                                (mandatory fields required, unknown fields
	                                rejected) and a duplicate application is blocked.

	Saving a draft then submitting reuses the same Job Applicant (the draft is
	promoted to Open). The record is always anchored to the authenticated
	candidate; `job_applicant_email` must match the session email.
	"""
	if not job_opening:
		return _err("job_opening is required.", 400)
	opening = job_opening.strip()
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		return _err("This opening is not currently posted on the careers page.", 400)

	target_status = _resolve_status(status)

	email = (job_applicant_email or get_current_candidate() or "").strip().lower()
	if not email:
		return _err("job_applicant_email is required.", 400)
	enforce_candidate_identity(email=email)

	payload = _coerce_form_data(form_data)
	existing_draft = _find_draft(email, opening)

	if target_status == SUBMIT_STATUS:
		# One real application per candidate + opening (drafts don't count).
		existing = frappe.db.get_value(
			APPLICANT_DOCTYPE,
			{"email_id": email, "job_title": opening, "status": ["!=", DRAFT_STATUS]},
			"name",
		)
		if existing:
			return _err(f"You have already applied to this opening ({existing}).", 409)
		# Enforce the configured careers field set only on real submission.
		payload = _common.assert_field_set_for_channel(opening, CHANNEL, payload)

	try:
		if existing_draft:
			doc = frappe.get_doc(APPLICANT_DOCTYPE, existing_draft)
			created = False
		else:
			doc = frappe.new_doc(APPLICANT_DOCTYPE)
			created = True

		_apply_form_data(doc, payload)
		doc.email_id = email
		doc.job_title = opening
		doc.status = target_status

		if target_status == SUBMIT_STATUS:
			source = _common.source_value_for(CHANNEL)
			if source and not doc.get("source"):
				doc.source = source

		if created:
			doc.insert(ignore_permissions=True)
		else:
			doc.save(ignore_permissions=True)
		frappe.db.commit()
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "careers.submit_application failed")
		return _err(f"Unable to save application: {type(e).__name__}: {e}", 500)

	if target_status == DRAFT_STATUS:
		message = "Application draft created." if created else "Application draft updated."
	else:
		message = "Application submitted." if created else "Application submitted from draft."

	return _ok(
		message,
		{"name": doc.name, "job_opening": opening, "status": doc.status, "created": created},
		http=201 if created else 200,
	)


def _opening_context(opening_name):
	"""Display fields for a Job Opening (title/company/location/experience/type)."""
	if not opening_name:
		return {"job_title": None, "company": None, "location": None, "experience": None, "employment_type": None}

	opening = frappe.db.get_value(
		"Job Opening",
		opening_name,
		["designation", "company", "location", "employment_type", "job_requisition"],
		as_dict=True,
	) or {}

	experience = None
	req = opening.get("job_requisition")
	if req:
		req_row = frappe.db.get_value(
			"Job Requisition",
			req,
			["custom_experience_range_from", "custom_experience_range_to", "custom_experience_unit"],
			as_dict=True,
		) or {}
		lo, hi, unit = req_row.get("custom_experience_range_from"), req_row.get("custom_experience_range_to"), req_row.get("custom_experience_unit")
		if lo and hi:
			experience = f"{lo}-{hi} {unit or ''}".strip()
		elif lo:
			experience = f"{lo}+ {unit or ''}".strip()

	return {
		"job_title": opening.get("designation"),
		"company": opening.get("company"),
		"location": opening.get("location"),
		"experience": experience,
		"employment_type": opening.get("employment_type"),
	}


def _draft_progress(doc):
	"""How complete a draft is, measured against the careers fields configured
	for its opening: ``total`` = number of configured careers fields, ``filled``
	= how many of them the candidate has a value for, ``percentage`` = filled/total."""
	fields = _common.get_application_fields_for_channel(doc.job_title, CHANNEL)
	total = len(fields)
	if not total:
		return {"total": 0, "filled": 0, "percentage": 0}
	filled = sum(
		1 for f in fields
		if doc.get(f.get("reference_name")) not in (None, "", [], {})
	)
	return {"total": total, "filled": filled, "percentage": round(filled * 100 / total)}


def _serialize_draft(doc):
	opening = doc.job_title
	display = _opening_context(opening)
	return {
		"name": doc.name,
		"job_applicant_email": doc.email_id,
		"job_opening": opening,
		"job_title": display["job_title"],
		"company": display["company"],
		"location": display["location"],
		"experience": display["experience"],
		"employment_type": display["employment_type"],
		"status": doc.status,
		"progress": _draft_progress(doc),
		"creation": doc.creation,
		"modified": doc.modified,
	}


@candidate_required
def get_draft(job_applicant_email, job_opening=None):
	"""This candidate's Draft applications (status == Draft only), optionally
	scoped to a single `job_opening`. Submitted (Open) applications never appear."""
	if not job_applicant_email:
		return _err("job_applicant_email is required.", 400)
	email = job_applicant_email.strip().lower()
	enforce_candidate_identity(email=email)

	filters = {"email_id": email, "status": DRAFT_STATUS}
	if job_opening:
		filters["job_title"] = job_opening.strip()

	names = frappe.get_all(
		APPLICANT_DOCTYPE, filters=filters, pluck="name", order_by="modified desc"
	)
	drafts = [_serialize_draft(frappe.get_doc(APPLICANT_DOCTYPE, n)) for n in names]
	return _ok(f"Fetched {len(drafts)} Draft application(s).", drafts)


@candidate_required
def delete_draft(job_applicant_email, job_opening):
	"""Delete this candidate's Draft application for `job_opening`."""
	if not job_applicant_email:
		return _err("job_applicant_email is required.", 400)
	if not job_opening:
		return _err("job_opening is required.", 400)
	email = job_applicant_email.strip().lower()
	opening = job_opening.strip()
	enforce_candidate_identity(email=email)

	name = _find_draft(email, opening)
	if not name:
		return _err("No Draft application exists for this opening.", 200)

	try:
		frappe.delete_doc(APPLICANT_DOCTYPE, name, ignore_permissions=True, force=True)
		frappe.db.commit()
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "careers.delete_draft failed")
		return _err(f"Unable to delete draft: {type(e).__name__}: {e}", 500)

	return _ok("Draft application deleted.", {"job_opening": opening, "deleted_draft": name})


# ---------------------------------------------------------------------------
# Saved openings — one Saved Job Opening doc per candidate, openings in its
# `job_openings` child table.
# ---------------------------------------------------------------------------

@candidate_required
def toggle_saved_job_opening(candidate_email, job_opening):
	"""Add the opening to this candidate's saved list, or remove it if already
	saved. Returns the resulting saved state and the full saved-openings list."""
	email = (candidate_email or "").strip().lower()
	if not email:
		return _err("candidate_email is required.", 400)
	enforce_candidate_identity(email=email)

	opening = (job_opening or "").strip()
	if not opening:
		return _err("job_opening is required.", 400)
	if not frappe.db.exists("Job Opening", opening):
		return _err(f"Job Opening {opening} not found.", 404)

	existing_name = frappe.db.get_value("Saved Job Opening", {"candidate_email": email}, "name")

	if not existing_name:
		doc = frappe.new_doc("Saved Job Opening")
		doc.candidate_email = email
		doc.append("job_openings", {"job_opening": opening})
		doc.saved_on = now_datetime()
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		return {"action": "saved", "is_saved": True, "name": doc.name,
			"saved_job_openings": [r.job_opening for r in doc.job_openings]}

	doc = frappe.get_doc("Saved Job Opening", existing_name)
	already_saved = any(row.job_opening == opening for row in (doc.job_openings or []))

	if already_saved:
		remaining = [row for row in doc.job_openings if row.job_opening != opening]
		if not remaining:
			frappe.delete_doc("Saved Job Opening", doc.name, ignore_permissions=True)
			frappe.db.commit()
			return {"action": "unsaved", "is_saved": False, "name": None, "saved_job_openings": []}
		doc.job_openings = remaining
	else:
		doc.append("job_openings", {"job_opening": opening})

	doc.saved_on = now_datetime()
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {
		"action": "unsaved" if already_saved else "saved",
		"is_saved": not already_saved,
		"name": doc.name,
		"saved_job_openings": [r.job_opening for r in doc.job_openings],
	}


@candidate_required
def get_saved_job_openings(candidate_email):
	"""The Job Openings this candidate has saved, as full cards (same shape as
	`list_openings`). Each card carries ``"saved": true`` and an ``"applied"``
	flag (true only for a real, non-Draft application)."""
	email = (candidate_email or "").strip().lower()
	if not email:
		return _err("candidate_email is required.", 400)
	enforce_candidate_identity(email=email)

	existing_name = frappe.db.get_value("Saved Job Opening", {"candidate_email": email}, "name")
	if not existing_name:
		return {"status": "success", "total": 0, "saved_job_openings": []}

	doc = frappe.get_doc("Saved Job Opening", existing_name)
	ids = [r.job_opening for r in (doc.job_openings or []) if r.job_opening]

	applied = _applied_openings(email, ids)
	openings = []
	for name in ids:
		card = _common.get_opening_card(name)
		if not card:
			# Saved opening was since deleted — skip it rather than ship a null.
			continue
		card["applied"] = name in applied
		card["saved"] = True
		openings.append(card)

	return {"status": "success", "total": len(openings), "saved_job_openings": openings}


# ---------------------------------------------------------------------------
# Applied-jobs journey — only non-Draft (Open+) applications count as applied.
# ---------------------------------------------------------------------------

def _get_applicant_status_options():
	"""Ordered status options from the Job Applicant doctype's `status` field."""
	meta = frappe.get_meta(APPLICANT_DOCTYPE)
	field = meta.get_field("status")
	return [o.strip() for o in (field.options or "").split("\n") if o.strip()]


@candidate_required
def get_applied_jobs(email):
	"""Full journey for a candidate: each application (Job Applicant) they have
	actually submitted under `email`, with a per-job status timeline.

	Draft applications are excluded — only submitted (non-Draft) applications
	count as "applied", so an in-progress draft never shows up here.
	"""
	enforce_candidate_identity(email=email)

	applicants = frappe.db.get_all(
		APPLICANT_DOCTYPE,
		filters={"email_id": email, "status": ["!=", DRAFT_STATUS]},
		fields=[
			"name", "applicant_name", "status", "job_title",
			"designation", "custom_company_finalized", "custom_location",
			"custom_employment_type", "custom_experience_range",
			"creation",
		],
		order_by="creation asc",
	)

	if not applicants:
		return {"success": False, "message": "Applicant not found"}

	all_statuses = _get_applicant_status_options()
	lifecycle = [s for s in all_statuses if s != APPLICANT_STATUS_TERMINAL]
	candidate_name = applicants[0].applicant_name

	def _iso_date(value):
		return getdate(value).isoformat() if value else None

	applications = []
	for app in applicants:
		versions = frappe.db.get_all(
			"Version",
			filters={"ref_doctype": APPLICANT_DOCTYPE, "docname": app.name},
			fields=["data", "creation"],
			order_by="creation asc",
		)

		status_dates = {}
		for v in versions:
			try:
				payload = _json.loads(v.data or "{}")
			except Exception:
				continue
			for change in payload.get("changed") or []:
				if not isinstance(change, list) or len(change) < 3:
					continue
				if change[0] != "status":
					continue
				new_val = change[2]
				if new_val and new_val not in status_dates:
					status_dates[new_val] = _iso_date(v.creation)

		creation_date = _iso_date(app.creation)

		active = set()
		if app.status == APPLICANT_STATUS_TERMINAL and app.status in all_statuses:
			active.add(APPLICANT_STATUS_TERMINAL)
		elif app.status in lifecycle:
			current_index = lifecycle.index(app.status)
			active.update(lifecycle[: current_index + 1])

		flags = []
		for stage in all_statuses:
			date = status_dates.get(stage)
			if not date and stage in active and stage in lifecycle and lifecycle.index(stage) == 0:
				date = creation_date
			flags.append({"status": stage, "flag": stage in active, "date": date})

		# The Job Applicant's own custom fields are often blank; the linked Job
		# Opening (`job_title`) is the reliable source for company/location/etc.
		# Prefer any finalized value on the applicant, fall back to the opening.
		job_ctx = _opening_context(app.job_title)
		applications.append({
			"id": app.name,
			"applied_on": creation_date,
			"job": {
				"designation": app.designation or job_ctx["job_title"],
				"company": app.custom_company_finalized or job_ctx["company"],
				"location": app.custom_location or job_ctx["location"],
				"experience_range": app.custom_experience_range or job_ctx["experience"],
				"employment_type": app.custom_employment_type or job_ctx["employment_type"],
			},
			"status": app.status,
			"flags": flags,
		})

	return {
		"success": True,
		"data": {"email": email, "name": candidate_name, "applications": applications},
	}
