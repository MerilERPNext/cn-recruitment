"""Employee-pool detection — "have we employed this person before?"

The candidate who applies from a personal address is the case this exists for.
They are already on the payroll, or they left last quarter, or they left under a
Do Not Rehire flag — and none of that is visible on the Job Applicant, because
the application carries a gmail address and nothing else ties it to the Employee
record.

This module DETECTS and CLASSIFIES. It no longer decides anything and no longer
refuses an application: the decision belongs to TA Duplicity Check Settings
("Duplicity Check with Employee Pool") and is taken at the Job Offer by
``ta_duplicity_job_offer``. TA Rehire Check Settings is no longer read — every
threshold and outcome below comes from the duplicity settings, so the Employee
Record tab and the offer gate can never disagree.

The four outcomes, in the order they are decided:

    ACTIVE      currently employed here                 per settings
    DO NOT      left, flagged on their Employee          per settings
      REHIRE    record, or on their Employee Separation
    TOO SOON    left more recently than the configured   blocks
                "# of Days Before Reapplication Post Exit" allows
    CLEAN       left long enough ago, no flag           allowed

Matching
--------
Match keys are the duplicity check fields configured for the candidate's company
— Job Applicant fieldnames, stored bare by the picker (see
``applicant_field_picker.js``). They are translated to the Employee columns that
hold the same fact by ``EMPLOYEE_FIELDS``; a key with no translation falls back
to the same fieldname on Employee when one exists, so a custom field added to
both sides works without touching this file.

``email_id`` deliberately matches Employee's PERSONAL address as well as the
company one. That is the whole point: an employee applying from their personal
mailbox is invisible on company_email alone.
"""

import frappe
from frappe import _
from frappe.utils import cint, date_diff, getdate, nowdate

from recruitment.customizations.ta_duplicity_check import (
	get_settings,
	is_ijp,
	match_fields as duplicity_match_fields,
	resolve_company,
	_setting,
)

EMPLOYEE = "Employee"
EMPLOYEE_SEPARATION = "Employee Separation"

# Do Not Rehire is carried in two places. HR ticks it on the Employee for someone
# who never had a separation processed; the exit process records it on the
# separation. Either one counts — see ``_do_not_rehire``.
EMPLOYEE_FLAG = "custom_do_not_rehire"
EMPLOYEE_FLAG_COMMENT = "custom_do_not_rehire_comment"
SEPARATION_FLAG = "custom_mark_do_not_rehire"
SEPARATION_FLAG_COMMENT = "custom_not_to_be_rehired_comment"

# Job Applicant fieldname -> the Employee columns holding the same fact. The
# first column that exists AND matches wins; all are tried.
EMPLOYEE_FIELDS = {
	"email_id": ("personal_email", "company_email", "prefered_email"),
	"phone_number": ("cell_number",),
	# Employee.pan_number only exists where HRMS's India regional setup has run —
	# resolved through the meta check in _employee_columns, never assumed.
	"custom_pan_number": ("pan_number",),
}

# Fallback keys when a site has configured no duplicity match fields at all.
FALLBACK_MATCH_FIELDS = ("email_id", "phone_number")

# Verdict codes.
ACTIVE = "active_employee"
DO_NOT_REHIRE = "do_not_rehire"
TOO_SOON = "too_soon"
CLEAN = "clean"

ACTIVE_STATUS = "Active"

# Outcomes configurable on TA Duplicity Check Settings.
BLOCK = "Block Job Offer"
EXCEPTIONAL = "Exceptional Approval"
ALLOW = "Allow Job Offer"

# Employee columns read for the card on the Job Applicant form. Optional ones are
# filtered against the meta so an older site does not fail the whole lookup.
_CORE_COLUMNS = ("name", "employee_name", "status")
_OPTIONAL_COLUMNS = (
	"designation", "department", "company", "branch", "date_of_joining",
	"relieving_date", "company_email", "personal_email", "cell_number",
	"image", "reports_to", "employee_number", "pan_number",
	EMPLOYEE_FLAG, EMPLOYEE_FLAG_COMMENT,
)


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def _match_fields(settings):
	"""Job Applicant fieldnames this company matches candidates on.

	The duplicity check fields are the identity keys for the whole feature; the
	email/phone fallback keeps detection working on a company with no settings
	record, where the panel is informational only.
	"""
	meta = frappe.get_meta("Job Applicant")
	configured = duplicity_match_fields(settings) if settings else []
	fields = [f for f in configured if meta.has_field(f)]
	return fields or [f for f in FALLBACK_MATCH_FIELDS if meta.has_field(f)]


def _employee_columns(applicant_field):
	"""Employee columns that can hold *applicant_field*'s value, filtered to the
	ones this site actually has."""
	meta = frappe.get_meta(EMPLOYEE)
	candidates = EMPLOYEE_FIELDS.get(applicant_field) or (applicant_field,)
	return [c for c in candidates if meta.has_field(c)]


def _or_filters(applicant, match_fields):
	"""``([[column, "=", value], ...], keys_used)`` — one condition per Employee
	column that could hold one of the candidate's values."""
	conditions, used = [], []
	for applicant_field in match_fields:
		value = applicant.get(applicant_field)
		if not value:
			continue
		columns = _employee_columns(applicant_field)
		if not columns:
			continue
		for column in columns:
			conditions.append([column, "=", value])
		used.append(applicant_field)
	return conditions, used


def _read_columns():
	meta = frappe.get_meta(EMPLOYEE)
	return list(_CORE_COLUMNS) + [c for c in _OPTIONAL_COLUMNS if meta.has_field(c)]


def _do_not_rehire(row, separations):
	"""``(flagged, comment)`` for one matched Employee row.

	The Employee's own flag is checked first and costs nothing — it is read with
	the match query. It is the only place a person with no separation record can
	be flagged, and the separation is still consulted after it so a flag set
	before the Employee field existed (or on a draft separation) is never missed.
	"""
	if cint(row.get(EMPLOYEE_FLAG)):
		return True, (row.get(EMPLOYEE_FLAG_COMMENT) or "")
	return separations.get(row.get("name")) or (False, "")


def _separation_flags(employees):
	"""``{employee: (flagged, comment)}`` for *employees*, in ONE query.

	Only each employee's LATEST separation counts — a flag that was lifted by a
	later exit is not a flag — so the rows are read newest first and the first one
	seen per employee wins. Read in a batch because this sits on the Job Applicant
	form load and the Job Offer save, where a query per matched employee is a
	query too many.
	"""
	meta = frappe.get_meta(EMPLOYEE_SEPARATION)
	if not employees or not meta.has_field(SEPARATION_FLAG):
		return {}

	fields = ["employee", SEPARATION_FLAG]
	if meta.has_field(SEPARATION_FLAG_COMMENT):
		fields.append(SEPARATION_FLAG_COMMENT)

	rows = frappe.get_all(
		EMPLOYEE_SEPARATION,
		filters={"employee": ["in", list(employees)], "docstatus": ["<", 2]},
		fields=fields,
		order_by="modified desc",
		ignore_permissions=True,
	)

	latest = {}
	for row in rows:
		if row.employee in latest:
			continue
		latest[row.employee] = (
			bool(cint(row.get(SEPARATION_FLAG))),
			row.get(SEPARATION_FLAG_COMMENT) or "",
		)
	return latest


def _days_since(value):
	if not value:
		return None
	try:
		return date_diff(nowdate(), getdate(value))
	except (ValueError, TypeError):
		return None


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def _action(settings, fieldname):
	"""The configured outcome, defaulting to Allow.

	Allow is the default on purpose: a company that has not configured an outcome
	must not start refusing offers it accepts today.
	"""
	value = _setting(settings, fieldname, ALLOW) or ALLOW
	return value if value in (BLOCK, EXCEPTIONAL, ALLOW) else ALLOW


def _verdict(row, settings, applicant_is_ijp, separations):
	"""Classify one matched Employee. Order matters — the strongest reason wins."""
	if (row.get("status") or "") == ACTIVE_STATUS:
		# The rule is scoped to non-IJP applications: an employee applying through
		# IJP is *expected* to match an active employee — that is the whole flow.
		action = ALLOW if applicant_is_ijp else _action(settings, "active_employee_non_ijp_action")
		return {
			"code": ACTIVE,
			"action": action,
			"label": _("Currently employed"),
			"detail": _("This person is an Active employee ({0}).").format(row.get("name")),
		}

	flagged, comment = _do_not_rehire(row, separations)
	if flagged:
		return {
			"code": DO_NOT_REHIRE,
			"action": _action(settings, "do_not_rehire_action"),
			"label": _("Do Not Rehire"),
			"detail": (
				_("Flagged Do Not Rehire: {0}").format(comment)
				if comment else _("Flagged Do Not Rehire.")
			),
		}

	minimum = cint(_setting(settings, "days_before_reapplication_post_exit"))
	days = _days_since(row.get("relieving_date"))
	if minimum and days is not None and days < minimum:
		return {
			"code": TOO_SOON,
			# A day count, not a three-way choice — configuring it IS the decision.
			"action": BLOCK,
			"label": _("Left too recently"),
			"detail": _("Left {0} day(s) ago; this company requires {1}.").format(
				days, minimum
			),
		}

	return {
		"code": CLEAN,
		"action": ALLOW,
		"label": _("Former employee"),
		"detail": (
			_("Left {0} day(s) ago. No rehire restriction applies.").format(days)
			if days is not None else _("A former employee. No rehire restriction applies.")
		),
	}


def find_matches(applicant, settings=None):
	"""``{"matches": [...], "match_fields": [...], "settings": name|None}``.

	Every past or present Employee this candidate resolves to, each carrying its
	own verdict and the outcome configured for it. Read with
	``ignore_permissions`` deliberately: this is a compliance check, and a
	recruiter without Employee read rights must still be told that the person in
	front of them is on the payroll. Only the columns in ``_read_columns`` are
	ever exposed, never the Employee document.
	"""
	company = resolve_company(applicant)
	settings = settings if settings is not None else get_settings(company)

	match_fields = _match_fields(settings)
	conditions, used = _or_filters(applicant, match_fields)

	empty = {
		"matches": [],
		"match_fields": used,
		"settings": settings.name if settings else None,
		"company": company,
	}
	if not conditions:
		return empty

	rows = frappe.get_all(
		EMPLOYEE,
		or_filters=conditions,
		fields=_read_columns(),
		order_by="status asc, relieving_date desc",
		ignore_permissions=True,
		limit_page_length=10,
	)
	if not rows:
		return empty

	# An employee already linked to this application is not a discovery — the
	# IJP flow puts them there on purpose.
	applied_employee = applicant.get("custom_applied_employee")
	applicant_is_ijp = is_ijp(applicant)

	# One read for every matched employee, before the per-row classification.
	separations = _separation_flags([r.get("name") for r in rows if r.get("name")])

	matches = []
	for row in rows:
		verdict = _verdict(row, settings, applicant_is_ijp, separations)
		matches.append({
			**row,
			"verdict": verdict["code"],
			"verdict_label": verdict["label"],
			"verdict_detail": verdict["detail"],
			"action": verdict["action"],
			"blocking": verdict["action"] == BLOCK,
			"needs_exception": verdict["action"] == EXCEPTIONAL,
			"is_linked": bool(applied_employee and row.get("name") == applied_employee),
			"matched_on": _matched_on(applicant, row, match_fields),
		})

	# Strongest first, so the card that decides the outcome is the one on top.
	rank = {ACTIVE: 0, DO_NOT_REHIRE: 1, TOO_SOON: 2, CLEAN: 3}
	matches.sort(key=lambda m: rank.get(m["verdict"], 9))

	return {**empty, "matches": matches}


def controlled_pool_matches(applicant, settings):
	"""Matches whose configured outcome is Block Job Offer or Exceptional Approval.

	These are the matches the settings act on — refused, routed to an approval, or
	(under Allow Hiring) let through with the candidate flagged. The employee an IJP
	application was raised from is left out: the flow linked them on purpose. When
	no outcome is configured to act on, the Employee read is skipped entirely.
	"""
	configured = [
		_setting(settings, f, ALLOW)
		for f in ("active_employee_non_ijp_action", "do_not_rehire_action")
	]
	if not cint(_setting(settings, "days_before_reapplication_post_exit")) and all(
		a in (ALLOW, None, "") for a in configured
	):
		return []

	return [
		m for m in find_matches(applicant, settings=settings)["matches"]
		if not m.get("is_linked") and m.get("action") in (BLOCK, EXCEPTIONAL)
	]


def match_reason(match):
	"""One line naming the employee a candidate matched and why it matters."""
	return _("{0} ({1} — {2}): {3}").format(
		match.get("verdict_label"),
		match.get("name"),
		match.get("employee_name") or "",
		match.get("verdict_detail") or "",
	)


def _matched_on(applicant, row, match_fields):
	"""Which keys actually tied this candidate to this employee — HR's first
	question is always "how do you know it's the same person?"."""
	hits = []
	for applicant_field in match_fields:
		value = applicant.get(applicant_field)
		if not value:
			continue
		for column in _employee_columns(applicant_field):
			if row.get(column) == value:
				hits.append(column)
				break
	return hits


# ---------------------------------------------------------------------------
# Hook (hooks.py -> Employee Separation -> on_submit)
# ---------------------------------------------------------------------------

def mirror_do_not_rehire_to_employee(doc, method=None):
	"""Copy a submitted separation's Do Not Rehire flag onto the Employee.

	Set-only, and one way. It never clears the Employee flag: HR may have set it
	for something this exit knows nothing about, and unticking it there is a
	decision, not a side effect of someone's last day. The check reads both
	anyway — this only keeps the Employee form telling the truth.
	"""
	try:
		if not cint(doc.get(SEPARATION_FLAG)) or not doc.get("employee"):
			return
		meta = frappe.get_meta(EMPLOYEE)
		if not meta.has_field(EMPLOYEE_FLAG):
			return

		values = {EMPLOYEE_FLAG: 1}
		comment = doc.get(SEPARATION_FLAG_COMMENT)
		if comment and meta.has_field(EMPLOYEE_FLAG_COMMENT):
			values[EMPLOYEE_FLAG_COMMENT] = comment
		frappe.db.set_value(EMPLOYEE, doc.employee, values, update_modified=False)
	except Exception:
		# A separation must never fail to submit because of the mirror.
		frappe.log_error(frappe.get_traceback(), "Do Not Rehire mirror failed")
