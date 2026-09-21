"""Other applications by the same candidate — "has this person applied elsewhere?"

Powers the *Other Applications* panel on the candidate detail screen. One call
returns every OTHER Job Applicant record belonging to the same person, already
sorted and classified, so the UI renders cards without doing any business logic
of its own.

What counts as "the same person"
--------------------------------
Exactly what the duplicity gate counts as the same person. The match keys come
from ``TA Duplicity Check Settings.select_duplicity_check_fields`` for the
candidate's company, resolved through the very helpers
``customizations.ta_duplicity_check`` uses at ``before_insert``. Reading and
blocking must never disagree: a panel that says "no other applications" while
the gate refuses the next application as a duplicate is worse than no panel.

Sites with no settings row fall back to email + phone.

IJP applications match on ``custom_applied_employee`` instead — an employee's
colleagues can share a switchboard number or a generic mailbox, and matching on
those would attribute their applications to this person. This mirrors
``ta_duplicity_check._check_ijp``.

What is excluded
----------------
- The applicant being viewed.
- ``Draft`` applications — a careers-page form that was opened and never
  submitted is not an application. ``channels.careers.get_applied_jobs`` draws
  the same line, so "applied" means one thing across the product.

Permissions
-----------
Rows come from ``frappe.get_list``, so a recruiter only sees applications their
own permissions already allow (Job Applicant carries a permission query
condition — see ``permissions.doc_type_permissions.ja_query``). The TOTAL is
counted without that scope and returned as ``hidden_count``, so the panel can
say "2 more, not visible to you" instead of implying there are none. Nothing
about the hidden rows is disclosed — only how many there are.
"""

import frappe
from frappe import _
from frappe.utils import cint, date_diff, getdate, nowdate

# The two helpers below decide what "the same candidate" means. Imported rather
# than reimplemented so this panel and the before_insert gate can never drift
# apart — see the module docstring.
from recruitment.customizations.ta_duplicity_check import get_settings, resolve_company

JOB_APPLICANT = "Job Applicant"
JOB_OPENING = "Job Opening"

# Used when no TA Duplicity Check Settings record covers the candidate's company.
FALLBACK_MATCH_FIELDS = ("email_id", "phone_number")

# Never an application in its own right — see "What is excluded" above.
DRAFT_STATUS = "Draft"

# Statuses that close an application outright.
CLOSED_STATUSES = frozenset({"Rejected"})

# Sub-statuses are a configurable master (`Sub Status`), so there is no fixed
# list to compare against. Every withdrawal wording the product ships or the
# screens show contains this word — "Withdrawn by Candidate" (the constant in
# ta_duplicity_check and channels.ijp) and "Offer Withdrawn" — and so does any
# variant a site adds later ("Withdrawn - Counter Offer"). Matching the word
# keeps a newly configured wording from silently reading as still-active.
WITHDRAWN_MARKER = "withdraw"

# Tone drives the card's colour rail. The frontend maps these to colours; it
# does not re-derive them from status.
TONE_CLOSED = "closed"
TONE_OFFER = "offer"
TONE_HOLD = "hold"
TONE_ACTIVE = "active"

OFFER_STATUSES = frozenset({"Approvals", "Accepted"})
HOLD_STATUSES = frozenset({"Hold"})

# A candidate who has been through many openings should not produce an unbounded
# response; the panel collapses past the first few anyway.
MAX_ROWS = 20


# ---------------------------------------------------------------------------
# Match keys
# ---------------------------------------------------------------------------

def _configured_match_fields(company):
	"""Fieldnames the site uses to recognise the same candidate.

	The picker stores bare fieldnames (see ``applicant_field_picker.js``), so the
	values are usable as filters directly. Fields that no longer exist on Job
	Applicant are dropped — one stale configuration row must not decide whether
	the whole panel works.
	"""
	settings = get_settings(company)
	rows = (settings.select_duplicity_check_fields or []) if settings else []
	configured = [row.applicant_field for row in rows if row.applicant_field]

	meta = frappe.get_meta(JOB_APPLICANT)
	fields = [f for f in (configured or FALLBACK_MATCH_FIELDS) if meta.has_field(f)]

	# Everything configured has since been renamed away — fall back rather than
	# return "no other applications", which would read as a cleared candidate.
	return fields or [f for f in FALLBACK_MATCH_FIELDS if meta.has_field(f)]


def _identity_filters(doc, match_fields):
	"""``(filters, or_filters, match_fields_used)`` locating this person's records.

	An IJP application is anchored on the employee; everyone else is matched on
	whichever configured keys the applicant actually carries a value for.
	"""
	employee = doc.get("custom_applied_employee")
	if employee:
		return [["custom_applied_employee", "=", employee]], [], ["custom_applied_employee"]

	or_filters = []
	used = []
	for fieldname in match_fields:
		value = doc.get(fieldname)
		if value:
			or_filters.append([fieldname, "=", value])
			used.append(fieldname)
	return [], or_filters, used


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def _is_withdrawn(sub_status):
	return WITHDRAWN_MARKER in (sub_status or "").lower()


def _tone(status, sub_status):
	"""Which bucket a card falls in. `closed` is the only one that is not live."""
	if status in CLOSED_STATUSES or _is_withdrawn(sub_status):
		return TONE_CLOSED
	if status in OFFER_STATUSES:
		return TONE_OFFER
	if status in HOLD_STATUSES:
		return TONE_HOLD
	return TONE_ACTIVE


def _state_label(status, sub_status):
	"""The one line a recruiter reads to know where this application stands."""
	if sub_status and sub_status != status:
		return "{0} · {1}".format(status or _("Unknown"), sub_status)
	return status or _("Unknown")


def _days_ago(value):
	if not value:
		return None
	try:
		return max(date_diff(nowdate(), getdate(value)), 0)
	except (ValueError, TypeError):
		return None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

def _row_fields():
	"""Row columns, skipping any this site has not migrated yet."""
	meta = frappe.get_meta(JOB_APPLICANT)
	fields = ["name", "job_title", "designation", "status", "source", "creation"]
	for optional in (
		"custom_substatus",
		"custom_current_stage",
		"custom_recruiter",
		"custom_recruiter_name",
	):
		if meta.has_field(optional):
			fields.append(optional)
	return fields


def _opening_details(opening_names):
	"""``{opening: {code, location, designation}}`` in one query."""
	if not opening_names:
		return {}

	meta = frappe.get_meta(JOB_OPENING)
	fields = ["name", "job_title", "designation", "location"]
	if meta.has_field("custom_opening_code"):
		fields.append("custom_opening_code")

	rows = frappe.get_all(
		JOB_OPENING,
		filters={"name": ["in", list(opening_names)]},
		fields=fields,
		ignore_permissions=True,
	)
	return {row["name"]: row for row in rows}


@frappe.whitelist()
def get_other_applications(job_applicant, limit=None):
	"""Every other application by this candidate, classified and sorted.

	Active applications come first (that is the answer the recruiter is looking
	for), then most recently applied. Returns the panel's whole payload —
	including the counts it puts in its header — so the UI does no tallying.
	"""
	if not job_applicant:
		frappe.throw(_("Job Applicant is required."))

	frappe.has_permission(JOB_APPLICANT, "read", doc=job_applicant, throw=True)
	doc = frappe.get_doc(JOB_APPLICANT, job_applicant)

	match_fields = _configured_match_fields(resolve_company(doc))
	base_filters, or_filters, used_fields = _identity_filters(doc, match_fields)

	empty = {
		"job_applicant": doc.name,
		"current_opening": doc.get("job_title"),
		"match_fields": used_fields,
		"total": 0,
		"active_count": 0,
		"hidden_count": 0,
		"truncated_count": 0,
		"applications": [],
	}

	# Nothing identifying on the record yet (a bare resume shell, say) — there is
	# no honest way to look this person up.
	if not base_filters and not or_filters:
		return empty

	filters = base_filters + [
		["name", "!=", doc.name],
		["status", "!=", DRAFT_STATUS],
	]

	# Fetched unbounded and capped only after sorting: capping first would order
	# by date and could drop the one ACTIVE application behind twenty old
	# rejections — the single row the panel exists to surface.
	rows = frappe.get_list(
		JOB_APPLICANT,
		filters=filters,
		or_filters=or_filters,
		fields=_row_fields(),
		order_by="creation desc",
		limit_page_length=0,
	)

	# Counted without the caller's permission scope, so the panel can report what
	# it cannot show instead of implying there is nothing there.
	total = len(
		frappe.get_all(
			JOB_APPLICANT,
			filters=filters,
			or_filters=or_filters,
			pluck="name",
			ignore_permissions=True,
			limit_page_length=0,
		)
	)

	openings = _opening_details({r.get("job_title") for r in rows if r.get("job_title")})
	current_opening = doc.get("job_title")

	applications = []
	for row in rows:
		opening = openings.get(row.get("job_title")) or {}
		status = row.get("status")
		sub_status = row.get("custom_substatus")
		tone = _tone(status, sub_status)
		applied_on = getdate(row.get("creation")) if row.get("creation") else None

		applications.append({
			"name": row.get("name"),
			"job_opening": row.get("job_title"),
			# The opening's own title, falling back to the applicant's copy of it.
			"opening_title": opening.get("job_title") or row.get("job_title"),
			"opening_code": opening.get("custom_opening_code"),
			"location": opening.get("location"),
			"designation": row.get("designation") or opening.get("designation"),
			"status": status,
			"sub_status": sub_status,
			"state_label": _state_label(status, sub_status),
			"stage": row.get("custom_current_stage"),
			"tone": tone,
			"is_active": tone != TONE_CLOSED,
			# The recruiter should not have to compare job codes to notice this.
			"is_same_opening": bool(
				current_opening and row.get("job_title") == current_opening
			),
			"source": row.get("source"),
			"recruiter": row.get("custom_recruiter"),
			"recruiter_name": row.get("custom_recruiter_name"),
			"applied_on": applied_on,
			"days_ago": _days_ago(applied_on),
		})

	# Active first — the whole reason the panel exists — then most recent.
	applications.sort(
		key=lambda a: (not a["is_active"], a["days_ago"] if a["days_ago"] is not None else 10**6)
	)

	visible_total = len(applications)
	active_count = sum(1 for a in applications if a["is_active"])
	capped = applications[: cint(limit) or MAX_ROWS]

	return {
		"job_applicant": doc.name,
		"current_opening": current_opening,
		"match_fields": used_fields,
		# Every application this candidate has, whoever can see it.
		"total": total,
		"active_count": active_count,
		# Records this candidate has that the caller may not read. Count only —
		# nothing else about them is disclosed.
		"hidden_count": max(total - visible_total, 0),
		# Visible, but beyond the row cap. Distinct from hidden_count: these are
		# readable, just not returned in this call.
		"truncated_count": max(visible_total - len(capped), 0),
		"applications": capped,
	}
