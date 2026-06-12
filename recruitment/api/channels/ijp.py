"""Internal Job Posting (IJP) channel — openings visible to existing employees.

Endpoints
---------
GET  recruitment.api.channels.ijp.list_openings(employee=...)
GET  recruitment.api.channels.ijp.get_application_fields(opening)
POST recruitment.api.channels.ijp.submit_application(opening, employee, data)

Eligibility
-----------
A Job Opening's IJP section carries:
  - custom_ijp_assignment_applicability (All / Department / Division / Custom)
  - custom_ijp_min_tenure + custom_ijp_min_tenure_unit (years/months/days)
  - custom_ijp_reapplication_days
  - custom_allow_employee_in_notice_period
  - custom_allow_employee_in_probation
  - custom_allow_employee_not_accepted_offer
We honour the simple ones inline; complex assignment rules (Custom Applicability)
are deferred to the existing IJP assignment framework if present.
"""

import frappe
from frappe.utils import cint, date_diff, getdate, nowdate

from . import _common


CHANNEL = "ijp"
SOURCE_FALLBACK_NAME = "IJP"

# Fixed 5-stage pipeline shown on "My Applied Internal Jobs". The applicant's
# Job Applicant status maps onto a single current stage; earlier stages are
# "done", later stages "upcoming".
IJP_STAGES = ["Applied", "Screening", "Technical Round", "Manager Round", "Decision"]
STATUS_TO_STAGE = {
	"Draft": 0,
	"Open": 0,
	"Shortlisted": 1,
	"Interview": 2,
	"Hold": 2,
	"Approvals": 3,
	"Accepted": 4,
	"Rejected": 4,
}
TERMINAL_STATUSES = ("Accepted", "Rejected")


def _employee_doc(employee=None):
	"""Resolve the current employee (or a passed-in one) and return the Doc."""
	if not employee:
		user = frappe.session.user
		if not user or user == "Guest":
			frappe.throw(frappe._("Sign in to view IJP openings"), frappe.PermissionError)
		employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
		if not employee:
			frappe.throw(frappe._("No Employee record linked to your user"), frappe.PermissionError)
	return frappe.get_doc("Employee", employee)


def _tenure_days(employee_doc):
	if not employee_doc.date_of_joining:
		return 0
	return max(0, date_diff(nowdate(), employee_doc.date_of_joining))


def _meets_min_tenure(opening_doc, employee_doc):
	min_tenure = cint(opening_doc.get("custom_ijp_min_tenure") or 0)
	if not min_tenure:
		return True
	unit = (opening_doc.get("custom_ijp_min_tenure_unit") or "years").lower()
	days = _tenure_days(employee_doc)
	if unit.startswith("year"):
		needed = min_tenure * 365
	elif unit.startswith("month"):
		needed = min_tenure * 30
	else:
		needed = min_tenure
	return days >= needed


def _passes_status_gates(opening_doc, employee_doc):
	status = (employee_doc.status or "").strip().lower()
	# Notice period
	if status == "notice period" and not cint(opening_doc.get("custom_allow_employee_in_notice_period") or 0):
		return False
	# Probation period
	if status == "probation" and not cint(opening_doc.get("custom_allow_employee_in_probation") or 1):
		return False
	return True


def _meets_assignment_rule(opening_doc, employee_doc):
	rule = (opening_doc.get("custom_ijp_assignment_applicability") or "All Employees").strip()
	if rule == "All Employees":
		return True
	if rule == "Department Employees":
		return bool(opening_doc.department) and opening_doc.department == employee_doc.department
	if rule == "Division Employees":
		op_div = opening_doc.get("custom_division")
		emp_div = employee_doc.get("custom_division")
		return bool(op_div) and op_div == emp_div
	# "Custom" or anything else — defer to assignment framework rather than blocking.
	return True


def _is_eligible(opening_name, employee_doc):
	opening_doc = frappe.get_doc("Job Opening", opening_name)
	if not _meets_min_tenure(opening_doc, employee_doc):
		return False, "minimum tenure not met"
	if not _passes_status_gates(opening_doc, employee_doc):
		return False, "employee status excluded by this opening"
	if not _meets_assignment_rule(opening_doc, employee_doc):
		return False, "outside assignment scope"
	return True, None


# ---------------------------------------------------------------------------
# Employee → application prefill
# ---------------------------------------------------------------------------

# Job Applicant field → ordered Employee field candidates, for the identity
# fields whose names differ. Everything else is matched by identical fieldname:
# Job Applicant mirrors the Employee field structure, so the bulk of the form
# can be sourced straight from the employee's record.
_EMPLOYEE_PREFILL_ALIASES = {
	"applicant_name": ("employee_name",),
	"email_id": ("personal_email", "company_email", "prefered_email"),
	"phone_number": ("cell_number",),
}

# Shared fieldnames that must NOT be carried over from the Employee — they mean
# something different on a Job Applicant, or are framework/naming fields.
_EMPLOYEE_PREFILL_SKIP = {"name", "naming_series", "status", "docstatus", "source"}


def _employee_prefill_values(emp, fields):
	"""Map each configured application field to the employee's current value.

	Returns ``{reference_name: value}`` for the fields the employee actually has
	a value for. Identity fields are mapped via ``_EMPLOYEE_PREFILL_ALIASES``;
	child tables fall back to matching by child doctype when their fieldname
	differs; everything else is matched by identical fieldname against the
	Employee record (Job Applicant mirrors the Employee field structure).
	"""
	emp_meta = frappe.get_meta("Employee")
	ja_lookup = {
		df.fieldname: df
		for df in frappe.get_meta("Job Applicant").fields
		if df.fieldname
	}
	emp_fields = {df.fieldname for df in emp_meta.fields if df.fieldname}

	# Child tables are frequently mirrored onto Job Applicant under a *different*
	# fieldname while pointing at the same child doctype (e.g. JA
	# `custom_educational_qualification` ↔ Employee `education`, both "Employee
	# Education"; JA `custom_previous_work_experience` ↔ Employee
	# `external_work_history`). Map child doctype → the Employee field(s) using
	# it so such tables prefill by matching child doctype when the name differs —
	# but only when it's unambiguous (exactly one Employee field uses it).
	emp_child_by_doctype = {}
	for df in emp_meta.fields:
		if df.fieldtype in ("Table", "Table MultiSelect") and df.options and df.fieldname:
			emp_child_by_doctype.setdefault(df.options, []).append(df.fieldname)

	values = {}
	for f in fields:
		ref = f.get("reference_name")
		if not ref or ref in _EMPLOYEE_PREFILL_SKIP:
			continue
		df = ja_lookup.get(ref)
		if not df:
			continue
		candidates = _EMPLOYEE_PREFILL_ALIASES.get(ref, ()) + (ref,)
		if df.fieldtype in ("Table", "Table MultiSelect"):
			same = emp_child_by_doctype.get(df.options or "", [])
			if len(same) == 1:
				candidates += tuple(s for s in same if s not in candidates)
		for src in candidates:
			if src not in emp_fields:
				continue
			val = _common._serialize_field_value(emp, src, df.fieldtype)
			if df.fieldtype in ("Table", "Table MultiSelect") and isinstance(val, list):
				# Drop the source row identity: the child doctype (e.g. "Employee
				# Education") is shared with Employee, so reusing its `name` on a
				# new Job Applicant would collide on insert. Strip it so the rows
				# are created fresh under the applicant.
				val = [{k: v for k, v in row.items() if k != "name"} for row in val]
			if val not in (None, "", []):
				values[ref] = val
				break
	return values


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist()
def list_openings(employee=None, search_term=None):
	"""Openings posted on IJP that the (current or passed-in) employee can apply to.

	`search_term` optionally filters by job code / title.
	"""
	emp = _employee_doc(employee)
	candidate_names = _common.get_openings_active_on_channel(CHANNEL)
	result = []
	for name in candidate_names:
		eligible, _reason = _is_eligible(name, emp)
		if not eligible:
			continue
		card = _common.get_opening_card(name)
		if card and _common.card_matches_search(card, search_term):
			result.append(card)
	return result


@frappe.whitelist()
def get_application_fields(opening):
	"""Field list shown to the employee filling out an IJP application."""
	if not opening:
		frappe.throw(frappe._("opening is required"))
	emp = _employee_doc()
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not posted on IJP."))
	eligible, reason = _is_eligible(opening, emp)
	if not eligible:
		frappe.throw(frappe._("You're not eligible for this opening: {}").format(reason))

	fields = _common.get_application_fields_for_channel(opening, CHANNEL)

	# Pre-fill from the employee's record so the form arrives ready to submit.
	prefill = _employee_prefill_values(emp, fields)
	for f in fields:
		ref = f.get("reference_name")
		if ref in prefill:
			f["value"] = prefill[ref]
			f["prefilled"] = True
	return fields


@frappe.whitelist()
def submit_application(opening, data, employee=None):
	"""Create a Job Applicant from an IJP submission.

	`data` accepts only the fields configured for IJP on the opening.
	The resulting Job Applicant is stamped with source = IJP and prefilled
	with the employee's identity (name / email / phone) where the candidate
	hasn't supplied a value.
	"""
	if isinstance(data, str):
		import json as _json
		data = _json.loads(data or "{}")

	emp = _employee_doc(employee)
	if not opening:
		frappe.throw(frappe._("opening is required"))
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not posted on IJP."))
	eligible, reason = _is_eligible(opening, emp)
	if not eligible:
		frappe.throw(frappe._("You're not eligible for this opening: {}").format(reason))

	# Fill every configured field the submission left out from the employee's
	# record, so an eligible employee can apply with a single click. Submitted
	# values always win, and this runs before validation so prefilled mandatory
	# fields don't block the submit.
	fields = _common.get_application_fields_for_channel(opening, CHANNEL)
	merged = _employee_prefill_values(emp, fields)
	merged.update(data)

	cleaned = _common.assert_field_set_for_channel(opening, CHANNEL, merged)
	source = _common.source_value_for(CHANNEL) or SOURCE_FALLBACK_NAME
	_common.ensure_source_master(source)

	applicant = frappe.new_doc("Job Applicant")
	applicant.job_title = opening
	applicant.source = source
	applicant.custom_applied_employee = emp.name

	# Identity safety net — covers channels where these aren't in the field set.
	cleaned.setdefault("applicant_name", emp.employee_name)
	cleaned.setdefault("email_id", emp.personal_email or emp.company_email or emp.prefered_email)
	cleaned.setdefault("phone_number", emp.cell_number)

	for k, v in cleaned.items():
		applicant.set(k, v)
	applicant.insert(ignore_permissions=True)

	return {"status": "ok", "name": applicant.name, "source": source, "employee": emp.name}


def _build_pipeline(status):
	"""Return the 5-stage pipeline with done/current/upcoming state for a status."""
	current = STATUS_TO_STAGE.get(status, 0)
	stages = []
	for idx, label in enumerate(IJP_STAGES):
		if idx < current:
			state = "done"
		elif idx == current:
			state = "current"
		else:
			state = "upcoming"
		stages.append({"label": label, "state": state})
	return stages, current


WITHDRAWN_SUBSTATUS = "Withdrawn by Candidate"


def _application_card(row):
	"""Serialise one IJP Job Applicant into the My-Applied table-row shape."""
	opening = frappe.db.get_value(
		"Job Opening",
		row.job_title,
		["name", "job_title", "designation", "department", "location", "custom_opening_code", "status"],
		as_dict=True,
	) or frappe._dict()

	stages, current = _build_pipeline(row.status)
	is_withdrawn = (row.custom_substatus or "") == WITHDRAWN_SUBSTATUS

	# Offer lookup — drives the "View Offer Letter" affordance (built later).
	offer = frappe.db.get_value(
		"Job Offer", {"job_applicant": row.name, "docstatus": ["!=", 2]}, "name"
	)

	if row.status == "Rejected":
		badge = "Rejected"
	elif row.status in ("Accepted", "Approvals") or offer:
		badge = "Offered"
	else:
		badge = IJP_STAGES[current]

	# Display status for the table's Status column: a withdrawal / explicit
	# sub-status wins, otherwise fall back to the pipeline stage (e.g. "Screening").
	if is_withdrawn:
		status_display = WITHDRAWN_SUBSTATUS
	else:
		status_display = row.custom_substatus or IJP_STAGES[current]

	designation = row.designation or opening.designation
	return {
		"name": row.name,
		"opening": opening.name,
		"job_title": opening.job_title or row.job_title,
		"opening_code": opening.custom_opening_code,
		"job_status": opening.status,                 # opening's OPEN/CLOSED status
		"email": row.email_id,
		"phone": row.phone_number,
		"applied_on": row.creation,
		"status": status_display,                     # value shown in the Status column
		"sub_status": row.custom_substatus,
		"application_status": row.status,             # raw Job Applicant status
		"is_withdrawn": is_withdrawn,
		"can_withdraw": (not is_withdrawn) and row.status not in TERMINAL_STATUSES,
		"designation": designation,
		"designation_label": _common._link_label("Designation", designation) if designation else None,
		"department": opening.department,
		"department_label": _common._link_label("Department", opening.department) if opening.department else None,
		"location": opening.location,
		"location_label": _common._link_label("Branch", opening.location) if opening.location else None,
		"status_badge": badge,
		"current_stage": IJP_STAGES[current],
		"pipeline": stages,
		"experience_declared": row.custom_total_experience,
		"resume": row.resume_attachment or row.resume_link,
		"has_offer": bool(offer),
		"offer": offer,
	}


@frappe.whitelist()
def my_applications(employee=None, search_term=None):
	"""The current (or passed-in) employee's IJP applications.

	`search_term` optionally filters by job code (opening_code) or job title.
	"""
	emp = _employee_doc(employee)
	rows = frappe.get_list(
		"Job Applicant",
		filters={"custom_applied_employee": emp.name},
		fields=[
			"name", "job_title", "designation", "status", "custom_substatus",
			"email_id", "phone_number", "custom_total_experience",
			"resume_attachment", "resume_link", "creation",
		],
		order_by="creation desc",
		limit_page_length=0,
	) or []

	applications = [_application_card(r) for r in rows]

	if search_term:
		needle = search_term.strip().lower()
		applications = [
			a for a in applications
			if needle in (a["job_title"] or "").lower()
			or needle in (a["opening_code"] or "").lower()
			or needle in (a["opening"] or "").lower()
		]

	active_count = sum(1 for a in applications if not a["is_withdrawn"] and a["application_status"] != "Rejected")
	return {"active_count": active_count, "applications": applications}


@frappe.whitelist()
def withdraw_application(job_applicant, reason):
	"""Candidate withdraws their own IJP application.

	Sets the sub-status to "Withdrawn by Candidate" and records the reason on the
	applicant's timeline. Only the employee who applied may withdraw.
	"""
	emp = _employee_doc()

	if not job_applicant:
		frappe.throw(frappe._("job_applicant is required"))
	reason = (reason or "").strip()
	if not reason:
		frappe.throw(frappe._("Please provide a reason for withdrawal."))

	applicant = frappe.db.get_value(
		"Job Applicant", job_applicant,
		["name", "custom_applied_employee", "custom_substatus", "status"], as_dict=True,
	)
	if not applicant:
		frappe.throw(frappe._("Application not found."))
	if applicant.custom_applied_employee != emp.name:
		frappe.throw(frappe._("You can only withdraw your own application."), frappe.PermissionError)
	if (applicant.custom_substatus or "") == WITHDRAWN_SUBSTATUS:
		return {"status": "ok", "already_withdrawn": True}
	if applicant.status in TERMINAL_STATUSES:
		frappe.throw(frappe._("This application can no longer be withdrawn."))

	frappe.db.set_value(
		"Job Applicant", job_applicant,
		{"custom_substatus": WITHDRAWN_SUBSTATUS, "custom_withdrawal_reason": reason},
		update_modified=True,
	)
	# Timeline note too, for an audit trail.
	frappe.get_doc("Job Applicant", job_applicant).add_comment(
		"Comment", frappe._("Application withdrawn by candidate. Reason: {0}").format(reason)
	)
	frappe.db.commit()
	return {"status": "ok", "sub_status": WITHDRAWN_SUBSTATUS}
