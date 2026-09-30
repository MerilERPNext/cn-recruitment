"""Duplicity check — "have we seen this person already?"

Reads the TA Duplicity Check Settings record covering the applicant's company and
enforces, at Job Applicant ``before_insert``:

  * Match keys are present. Every field selected as a duplicity check field is
    mandatory, because a blank key matches nothing and would let the duplicate
    through unnoticed.
  * Rejection cooldown. A candidate rejected in a job may not reapply to it for
    N days — from ANY source, so switching source does not bypass it.
  * Multi-position restriction. An active application at another opening blocks a
    new one, with a separate switch for applications that arrive through an
    external recruiter.
  * The same two rules for IJP, off the member's own employee record.

The offer-time rules from the same settings record (active-offer block, and the
employee-pool outcomes) live in ``ta_duplicity_job_offer`` — they are decided at
the Job Offer, not here.

Allow Hiring
------------
With "Allow Hiring Even Though It Matches Duplicity Check Settings" ticked, no
rule here refuses the application. Each refusal is recorded instead (see
``Gate``), the employee-pool outcomes are checked here too, and a candidate with
any reason is flagged: the setting and its Hiring Workflow are copied onto the
application, which the stage engine then follows in place of the opening's
stages (``hiring_stage.get_applicant_stages``). Their Job Offer goes through the
setting's Exceptional Approval Workflow. Missing match keys still refuse — that
is missing data, not a match.

Matching
--------
Match keys are Job Applicant fieldnames stored bare by the picker (see
``applicant_field_picker.js``); an existing application is a match when ANY key
holds the same value. Candidate rules match on those keys. IJP rules match on
``custom_applied_employee`` instead — an employee's own record is a stronger key
than an email two people might share.

Company scoping
---------------
An applicant is compared only against applications for the same company. The
company is RESOLVED (``custom_company_finalized``, else the opening's company)
on both sides rather than read off the raw field: ``custom_company_finalized`` is
filled later in the pipeline, so a brand-new applicant has it blank and a raw
comparison would only ever match other blank rows.
"""

import frappe
from frappe import _
from frappe.utils import add_days, cint, escape_html, getdate, nowdate, strip_html

ALL_COMPANIES = "All Group Companies"

_ADMIN_ROLES = frozenset({"Administrator", "System Manager"})
_WITHDRAWN_SUBSTATUS = "Withdrawn by Candidate"
_REJECTED = "Rejected"
IJP_SOURCE = "IJP"

# Job Applicant fields stamped when Allow Hiring lets a match through.
FLAGGED_FIELD = "custom_duplicity_flagged"
FLAG_SETTING_FIELD = "custom_duplicity_check_setting"
FLAG_WORKFLOW_FIELD = "custom_duplicity_hiring_workflow"
FLAG_REASON_FIELD = "custom_duplicity_match_reason"

# Columns read off candidate applications for the in-Python rule evaluation.
# The custom ones are resolved against the meta before every read: this runs
# inside before_insert, so naming a column the site does not have would fail
# every application rather than just skipping one rule.
_CORE_ROW_FIELDS = ("name", "job_title", "status", "creation", "modified")
_OPTIONAL_ROW_FIELDS = (
	"source", "custom_company_finalized", "custom_substatus", "custom_applied_employee",
)


def _row_fields():
	meta = frappe.get_meta("Job Applicant")
	return list(_CORE_ROW_FIELDS) + [
		f for f in _OPTIONAL_ROW_FIELDS if meta.has_field(f)
	]

# A person's application history is small; this ceiling only stops a runaway
# read if a match key is something pathological like a shared placeholder email.
_SCAN_LIMIT = 100


# ---------------------------------------------------------------------------
# Settings lookup
# ---------------------------------------------------------------------------

def get_settings(company):
	"""The TA Duplicity Check Settings doc covering *company*, or None.

	A company-specific record wins; a record scoped to All Group Companies is the
	fallback, so a group-wide default can be set once and overridden per company.
	"""
	name = None

	if company:
		name = frappe.db.get_value(
			"TA Duplicity Check Company",
			{"company": company, "parenttype": "TA Duplicity Check Settings"},
			"parent",
		)

	if not name:
		name = frappe.db.get_value(
			"TA Duplicity Check Settings",
			{"applicable_to_scope": ALL_COMPANIES},
			"name",
		)

	if not name:
		return None

	try:
		return frappe.get_doc("TA Duplicity Check Settings", name)
	except frappe.DoesNotExistError:
		return None



def _setting(settings, fieldname, default=0):
	"""Read a settings field that may not exist yet on an un-migrated site."""
	if not settings:
		return default
	if not settings.meta.has_field(fieldname):
		return default
	value = settings.get(fieldname)
	return default if value is None else value


# ---------------------------------------------------------------------------
# Override permission
# ---------------------------------------------------------------------------

def user_can_override(settings):
	"""True if the current user may skip enforcement for this setting.

	The master switch gates EVERYONE, Administrator included. That is what the
	setting says on the form, and a company that switches overriding off means
	the rules to hold — an unconditional admin bypass would quietly exempt the
	very accounts that create applications in bulk, and would make the rules
	untestable from an admin login.

	With the switch on, Administrator and System Manager may override without
	being listed; everyone else needs one of the configured roles.
	"""
	if not _setting(settings, "allow_override_by_admins_and_roles"):
		return False

	roles = set(frappe.get_roles())
	if roles & _ADMIN_ROLES:
		return True

	allowed = {
		row.role
		for row in (_setting(settings, "override_roles", []) or [])
		if getattr(row, "role", None)
	}
	return bool(roles & allowed)



# ---------------------------------------------------------------------------
# Allow Hiring
# ---------------------------------------------------------------------------

def allows_hiring(settings):
	"""True when a match lets the candidate through instead of refusing them."""
	return bool(cint(_setting(settings, "allow_hiring_on_duplicity_match")))


class Gate:
	"""Where a rule's refusal goes.

	Without Allow Hiring it is raised, exactly as before. With it the refusal is
	recorded instead, and the reasons are what the candidate is flagged with — and,
	at the offer, what the approver is shown.
	"""

	def __init__(self, settings):
		self.allow_hiring = allows_hiring(settings)
		self.reasons = []

	def refuse(self, message, title):
		if not self.allow_hiring:
			frappe.throw(message, title=title)
		self.add(_("{0}: {1}").format(title, strip_html(message)))

	def add(self, reason):
		if reason and reason not in self.reasons:
			self.reasons.append(reason)

	def extend(self, reasons):
		for reason in reasons or []:
			self.add(reason)


def flag_applicant(applicant, settings, reasons):
	"""Stamp a new Job Applicant that Allow Hiring let through a match.

	The Hiring Workflow is copied onto the application rather than read off the
	settings each time, so the candidate stays on the workflow they started on even
	if the setting is edited mid-pipeline.
	"""
	if not reasons:
		return

	meta = frappe.get_meta("Job Applicant")
	if not meta.has_field(FLAGGED_FIELD):
		frappe.log_error(
			"Allow Hiring let {0} through {1}, but the Job Applicant duplicity fields are "
			"missing — run bench migrate.".format(applicant.get("applicant_name") or "", settings.name),
			"Duplicity Check: Allow Hiring fields missing",
		)
		return

	workflow = _setting(settings, "hiring_workflow", None)
	values = {
		FLAGGED_FIELD: 1,
		FLAG_SETTING_FIELD: settings.name,
		FLAG_WORKFLOW_FIELD: workflow,
		FLAG_REASON_FIELD: "\n".join(reasons),
	}
	for fieldname, value in values.items():
		if meta.has_field(fieldname):
			applicant.set(fieldname, value)

	# Said to HR only: a candidate applying through a portal must not be shown the
	# internal reasons their application was flagged for.
	if frappe.db.get_value("User", frappe.session.user, "user_type") == "System User":
		frappe.msgprint(
			_("This candidate matches {0}, and hiring is allowed under it. They will follow "
			  "hiring workflow {1}, and their Job Offer will need exceptional approval.<br><br>{2}").format(
				frappe.bold(settings.name),
				frappe.bold(workflow or _("of the Job Opening")),
				"<br>".join(escape_html(r) for r in reasons),
			),
			title=_("Duplicity Match — Hiring Allowed"),
			indicator="orange",
		)


# ---------------------------------------------------------------------------
# Company / source resolution
# ---------------------------------------------------------------------------

def resolve_company(applicant):
	"""The finalised company, else the company on the opening applied to."""
	return applicant.get("custom_company_finalized") or (
		frappe.db.get_value("Job Opening", applicant.get("job_title"), "company")
		if applicant.get("job_title") else None
	)



def _opening_companies(job_titles):
	"""{opening: company} for the openings named, in one read."""
	names = list({t for t in job_titles if t})
	if not names:
		return {}
	rows = frappe.get_all(
		"Job Opening",
		filters={"name": ["in", names]},
		fields=["name", "company"],
		ignore_permissions=True,
	)
	return {r["name"]: r["company"] for r in rows}


def is_ijp(applicant):
	"""IJP applications carry the employee they were raised from."""
	return bool(applicant.get("custom_applied_employee")) or (
		(applicant.get("source") or "") == IJP_SOURCE
	)


def is_external_recruiter_application(applicant):
	"""True when this application was created by an active external recruiter.

	Nothing on Job Applicant names the agency, so the owner is the key: an
	external recruiter works through their own User, and TA External Recruiter
	links to it. Falls back to False on a site with no recruiters configured,
	which is what makes the "Other Sources" switch the effective one there.
	"""
	owner = applicant.get("owner") or frappe.session.user
	if not owner or owner == "Administrator":
		return False

	if not frappe.get_meta("TA External Recruiter").has_field("user"):
		return False

	return bool(
		frappe.db.exists(
			"TA External Recruiter", {"user": owner, "status": "Active"}
		)
	)


# ---------------------------------------------------------------------------
# Match keys
# ---------------------------------------------------------------------------

def match_fields(settings):
	"""Job Applicant fieldnames configured as duplicity keys, that still exist."""
	rows = _setting(settings, "select_duplicity_check_fields", []) or []
	configured = [row.applicant_field for row in rows if getattr(row, "applicant_field", None)]
	if not configured:
		return []
	meta = frappe.get_meta("Job Applicant")
	# A key stored as "table::field" targets a child row — not usable as an
	# identity key for a document-level match, so it is skipped here.
	return [f for f in configured if "::" not in f and meta.has_field(f)]


def validate_match_keys_present(applicant, settings):
	"""Selecting a field as a duplicity key makes it mandatory.

	Straight from the specification: "selection of any of the fields in this
	setting automatically makes the field mandatory for the process applicable to
	this Duplicity check". Enforced before the lookup, because a blank key is
	precisely the case that would slip past it.
	"""
	fields = match_fields(settings)
	if not fields:
		return

	meta = frappe.get_meta("Job Applicant")
	missing = [f for f in fields if not applicant.get(f)]
	if not missing:
		return

	# Direct Applicant Onboarding: the candidate supplies the rest (e.g. PAN) on
	# the form, and the full check runs again then. Only direct applicants.
	from recruitment.api.direct_applicant import defers_missing_match_keys

	if defers_missing_match_keys(applicant):
		return

	labels = [(meta.get_field(f).label or f) for f in missing]
	frappe.throw(
		_("{0} {1} required — {2} uses {3} to detect duplicate applications.").format(
			frappe.bold(", ".join(labels)),
			_("is") if len(labels) == 1 else _("are"),
			frappe.bold(settings.name),
			_("this field") if len(labels) == 1 else _("these fields"),
		),
		title=_("Duplicity Check Fields Required"),
	)


def _or_filters(applicant, fields):
	"""One ``[field, "=", value]`` per key the applicant actually carries."""
	return [[f, "=", applicant.get(f)] for f in fields if applicant.get(f)]


# ---------------------------------------------------------------------------
# History read
# ---------------------------------------------------------------------------

def _history(applicant, company, or_filters=None, employee=None):
	"""Prior applications for the same person at the same company.

	One read plus one openings read, then the rules are evaluated in Python —
	which is what lets the company be resolved consistently on both sides.
	"""
	filters = [["name", "!=", applicant.get("name") or ""]]
	if employee:
		filters.append(["custom_applied_employee", "=", employee])

	rows = frappe.get_all(
		"Job Applicant",
		filters=filters,
		or_filters=or_filters or None,
		fields=_row_fields(),
		order_by="creation desc",
		ignore_permissions=True,
		limit_page_length=_SCAN_LIMIT,
	)
	if not rows:
		return []

	companies = _opening_companies([r.get("job_title") for r in rows])
	out = []
	for row in rows:
		row_company = row.get("custom_company_finalized") or companies.get(row.get("job_title"))
		# With no company resolvable on either side, scoping cannot be applied;
		# the row is kept so the rule still sees it rather than silently passing.
		if company and row_company and row_company != company:
			continue
		out.append(row)
	return out


def _is_active(row):
	"""An application still in play — not rejected, not withdrawn."""
	if (row.get("status") or "") == _REJECTED:
		return False
	return (row.get("custom_substatus") or "") != _WITHDRAWN_SUBSTATUS


def _rejected_on(row):
	"""When the application was rejected.

	Job Applicant records no rejection timestamp, so ``modified`` is the closest
	available signal — the rejection is what moved the record to Rejected.
	"""
	return getdate(row.get("modified") or row.get("creation"))


# ---------------------------------------------------------------------------
# Main hook (hooks.py -> Job Applicant -> before_insert)
# ---------------------------------------------------------------------------

def check_duplicity(applicant, method=None):
	"""Enforce TA Duplicity Check Settings on every new Job Applicant."""
	company = resolve_company(applicant)
	settings = get_settings(company)
	if not settings:
		return

	if user_can_override(settings):
		return

	# Not waived by Allow Hiring: without the keys nothing could be checked at all.
	validate_match_keys_present(applicant, settings)

	gate = Gate(settings)
	if is_ijp(applicant):
		_check_ijp(applicant, settings, company, gate)
	else:
		_check_candidate(applicant, settings, company, gate)

	if not gate.allow_hiring:
		return

	# The employee-pool outcomes are otherwise decided at the offer. Under Allow
	# Hiring they are checked here as well, so a matching candidate is on the
	# controlled workflow from their first stage, not switched onto it at the offer.
	from recruitment.customizations.ta_rehire_check import controlled_pool_matches, match_reason

	gate.extend(match_reason(m) for m in controlled_pool_matches(applicant, settings))
	flag_applicant(applicant, settings, gate.reasons)


# ---------------------------------------------------------------------------
# Candidate (external pool) rules
# ---------------------------------------------------------------------------

def _check_candidate(applicant, settings, company, gate):
	or_filters = _or_filters(applicant, match_fields(settings))
	if not or_filters:
		return  # No matchable values — nothing this rule set can compare.

	rows = _history(applicant, company, or_filters=or_filters)
	if not rows:
		return

	_enforce_rejection_cooldown(
		gate,
		applicant,
		rows,
		cint(_setting(settings, "days_before_candidate_reapplication")),
		title=_("Duplicate Application"),
		message=_(
			"This candidate's application for {0} was rejected. Reapplication to "
			"this job is allowed only from {1} — from any source."
		),
	)

	# Which multi-position switch applies depends on how the application arrived.
	via_recruiter = is_external_recruiter_application(applicant)
	allow_multi = bool(_setting(
		settings,
		"allow_candidate_multi_positions_external_recruiter"
		if via_recruiter else
		"allow_candidate_multi_positions_other_sources",
	))
	if allow_multi:
		return

	other = [
		r for r in rows
		if r.get("job_title") != applicant.job_title and _is_active(r)
	]
	if not other:
		return

	gate.refuse(
		_("This candidate already has an active application ({0}) for {1}. "
		  "Applying to multiple positions simultaneously is not permitted{2}.").format(
			frappe.bold(other[0]["name"]),
			frappe.bold(other[0].get("job_title") or _("another position")),
			_(" for applications through an external recruiter") if via_recruiter else "",
		),
		title=_("Multiple Position Application Not Allowed"),
	)


# ---------------------------------------------------------------------------
# IJP (employee applying internally) rules
# ---------------------------------------------------------------------------

def _check_ijp(applicant, settings, company, gate):
	employee = applicant.get("custom_applied_employee")
	if not employee:
		# Source says IJP but no employee is linked — the employee-keyed rules
		# below have nothing to match on, so fall back to the candidate keys.
		_check_candidate(applicant, settings, company, gate)
		return

	rows = _history(applicant, company, employee=employee)
	if not rows:
		return

	_enforce_rejection_cooldown(
		gate,
		applicant,
		rows,
		cint(_setting(settings, "days_before_ijp_reapplication_if_rejected")),
		title=_("Duplicate IJP Application"),
		message=_(
			"Your IJP application for {0} was rejected. Reapplication to this job "
			"is allowed only from {1}."
		),
	)

	# Cooldown between IJP applications to DIFFERENT openings — the number of
	# days after which a 2nd application elsewhere is allowed.
	gap = cint(_setting(settings, "days_before_employee_ijp_reapplication"))
	if gap:
		elsewhere = [r for r in rows if r.get("job_title") != applicant.job_title]
		if elsewhere:
			last = max(getdate(r.get("creation")) for r in elsewhere)
			allowed_from = add_days(last, gap)
			if getdate(nowdate()) < getdate(allowed_from):
				gate.refuse(
					_("You applied via IJP on {0}. A further IJP application to a "
					  "different job opening is allowed only from {1}.").format(
						frappe.bold(frappe.utils.formatdate(last)),
						frappe.bold(frappe.utils.formatdate(allowed_from)),
					),
					title=_("IJP Reapplication Not Yet Allowed"),
				)

	if _setting(settings, "allow_employee_multi_positions_ijp"):
		return

	other = [
		r for r in rows
		if r.get("job_title") != applicant.job_title and _is_active(r)
	]
	if not other:
		return

	gate.refuse(
		_("You already have an active IJP application ({0}) for {1}. Applying to "
		  "multiple positions via IJP simultaneously is not permitted.").format(
			frappe.bold(other[0]["name"]),
			frappe.bold(other[0].get("job_title") or _("another position")),
		),
		title=_("Multiple IJP Position Application Not Allowed"),
	)


# ---------------------------------------------------------------------------
# Shared rule
# ---------------------------------------------------------------------------

def _enforce_rejection_cooldown(gate, applicant, rows, days, title, message):
	"""Block reapplication to a job the person was rejected in, for *days* days."""
	if not days or not applicant.job_title:
		return

	rejected = [
		r for r in rows
		if r.get("job_title") == applicant.job_title
		and (r.get("status") or "") == _REJECTED
	]
	if not rejected:
		return

	last = max(_rejected_on(r) for r in rejected)
	allowed_from = add_days(last, days)
	if getdate(nowdate()) >= getdate(allowed_from):
		return

	gate.refuse(
		message.format(
			frappe.bold(applicant.job_title),
			frappe.bold(frappe.utils.formatdate(allowed_from)),
		),
		title=title,
	)
