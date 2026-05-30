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
# Public endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist()
def list_openings(employee=None):
	"""Openings posted on IJP that the (current or passed-in) employee can apply to."""
	emp = _employee_doc(employee)
	candidate_names = _common.get_openings_active_on_channel(CHANNEL)
	result = []
	for name in candidate_names:
		eligible, _reason = _is_eligible(name, emp)
		if not eligible:
			continue
		card = _common.get_opening_card(name)
		if card:
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
	return _common.get_application_fields_for_channel(opening, CHANNEL)


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

	cleaned = _common.assert_field_set_for_channel(opening, CHANNEL, data)
	source = _common.source_value_for(CHANNEL) or SOURCE_FALLBACK_NAME
	_common.ensure_source_master(source)

	applicant = frappe.new_doc("Job Applicant")
	applicant.job_title = opening
	applicant.source = source
	applicant.custom_applied_employee = emp.name

	# Sensible defaults from the employee record — only if not supplied.
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


def _application_card(row):
	"""Serialise one IJP Job Applicant into the My-Applied card shape."""
	opening = frappe.db.get_value(
		"Job Opening",
		row.job_title,
		["name", "job_title", "designation", "department", "location", "custom_opening_code"],
		as_dict=True,
	) or frappe._dict()

	stages, current = _build_pipeline(row.status)

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

	designation = row.designation or opening.designation
	return {
		"name": row.name,
		"opening": opening.name,
		"job_title": opening.job_title or row.job_title,
		"opening_code": opening.custom_opening_code,
		"designation": designation,
		"designation_label": _common._link_label("Designation", designation) if designation else None,
		"department": opening.department,
		"department_label": _common._link_label("Department", opening.department) if opening.department else None,
		"location": opening.location,
		"location_label": _common._link_label("Branch", opening.location) if opening.location else None,
		"status": row.status,
		"status_badge": badge,
		"current_stage": IJP_STAGES[current],
		"pipeline": stages,
		"experience_declared": row.custom_total_experience,
		"resume": row.resume_attachment or row.resume_link,
		"applied_on": row.creation,
		"can_withdraw": row.status not in TERMINAL_STATUSES,
		"has_offer": bool(offer),
		"offer": offer,
	}


@frappe.whitelist()
def my_applications(employee=None):
	"""The current (or passed-in) employee's IJP applications, with pipeline state."""
	emp = _employee_doc(employee)
	rows = frappe.get_list(
		"Job Applicant",
		filters={"custom_applied_employee": emp.name},
		fields=[
			"name", "job_title", "designation", "status",
			"custom_total_experience", "resume_attachment", "resume_link", "creation",
		],
		order_by="creation desc",
		limit_page_length=0,
	) or []

	applications = [_application_card(r) for r in rows]
	active_count = sum(1 for a in applications if a["status"] != "Rejected")
	return {"active_count": active_count, "applications": applications}
