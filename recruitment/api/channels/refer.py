"""Refer channel — employees referring external candidates.

Endpoints
---------
GET  recruitment.api.channels.refer.list_openings(employee=...)
GET  recruitment.api.channels.refer.get_application_fields(opening)
POST recruitment.api.channels.refer.submit_referral(opening, candidate_data, referrer_employee=...)

Behaviour
---------
1. `list_openings` returns openings whose Posting Options have an active "Refer"
   row, within the configured date window.
2. The form fields are exactly the ones flagged `view_refer=1` on the opening's
   `custom_application_fields` (with mandatory_refer driving reqd).
3. `submit_referral` creates a Job Applicant with source = "Employee Referral",
   sets `employee_referral` on the applicant when the doctype field exists, and
   records the referrer's name on `custom_referred_by` / `custom_referred_employee_name`.
"""

import frappe

from . import _common


CHANNEL = "refer"

# Job Applicant status -> referral status group shown on the My Referrals page.
STATUS_GROUP = {
	"Draft": "pending",
	"Open": "pending",
	"Shortlisted": "pending",
	"Hold": "pending",
	"Interview": "interview",
	"Approvals": "accepted",
	"Accepted": "accepted",
	"Rejected": "rejected",
}


def _resolve_referrer(referrer_employee=None):
	"""Resolve the referring employee — defaults to the current user's Employee."""
	if referrer_employee:
		return frappe.get_doc("Employee", referrer_employee)
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Sign in to refer a candidate"), frappe.PermissionError)
	name = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if not name:
		frappe.throw(frappe._("No Employee record linked to your user"), frappe.PermissionError)
	return frappe.get_doc("Employee", name)


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist()
def list_openings(employee=None):
	"""Openings open for referral. employee arg is accepted for parity with the
	other channels but currently doesn't gate the list (referrers can refer
	for any open Refer-active opening)."""
	# Resolve the referrer so an unauthenticated call still 401s consistently.
	_resolve_referrer(employee)
	names = _common.get_openings_active_on_channel(CHANNEL)
	return [card for card in (_common.get_opening_card(n) for n in names) if card]


@frappe.whitelist()
def get_application_fields(opening):
	"""Field list the referrer fills in on behalf of the candidate."""
	if not opening:
		frappe.throw(frappe._("opening is required"))
	_resolve_referrer()
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not currently open for referrals."))
	return _common.get_application_fields_for_channel(opening, CHANNEL)


@frappe.whitelist()
def submit_referral(opening, data, referrer_employee=None):
	"""Create a Job Applicant from a referral submission.

	`data` is the candidate's profile keyed by Job Applicant field references.
	Source = Employee Referral; referrer details are stamped on the resulting
	applicant for credit attribution.
	"""
	if isinstance(data, str):
		import json as _json
		data = _json.loads(data or "{}")

	if not opening:
		frappe.throw(frappe._("opening is required"))
	referrer = _resolve_referrer(referrer_employee)
	if opening not in _common.get_openings_active_on_channel(CHANNEL):
		frappe.throw(frappe._("This opening is not currently open for referrals."))

	cleaned = _common.assert_field_set_for_channel(opening, CHANNEL, data)
	source = _common.source_value_for(CHANNEL) or "Employee Referral"
	_common.ensure_source_master(source)

	applicant = frappe.new_doc("Job Applicant")
	applicant.job_title = opening
	applicant.source = source

	# Stamp referrer attribution on whichever standard / custom fields exist.
	meta = frappe.get_meta("Job Applicant")
	field_map = {df.fieldname: df for df in meta.fields}

	# `employee_referral` is the standard HRMS field, but it Links to the
	# "Employee Referral" doctype (a referral record) — NOT to Employee. Assigning
	# the referrer's Employee id there raises LinkValidationError. Only set it when
	# a setup has customised the field to Link → Employee; otherwise leave it unset
	# (attribution is captured on the custom_referred_* fields below).
	emp_ref = field_map.get("employee_referral")
	if emp_ref and emp_ref.fieldtype == "Link" and emp_ref.options == "Employee":
		applicant.employee_referral = referrer.name
	if "custom_referred_by" in field_map:
		applicant.custom_referred_by = referrer.name
	if "custom_referred_employee_name" in field_map:
		applicant.custom_referred_employee_name = referrer.employee_name

	for k, v in cleaned.items():
		applicant.set(k, v)
	applicant.insert(ignore_permissions=True)

	return {
		"status": "ok",
		"name": applicant.name,
		"source": source,
		"referrer": referrer.name,
	}


@frappe.whitelist()
def my_referrals(employee=None, status=None, search=None):
	"""Candidates referred by the current (or passed-in) employee, with stat
	groups for the My Referrals dashboard.

	`status` optionally filters to one group (pending / interview / accepted /
	rejected); `search` matches candidate name / email / designation. Stats are
	always computed over the full (unfiltered) referral set.
	"""
	referrer = _resolve_referrer(employee)

	rows = frappe.get_list(
		"Job Applicant",
		filters={"custom_referred_by": referrer.name},
		fields=["name", "applicant_name", "email_id", "designation", "job_title", "status", "creation"],
		order_by="creation desc",
		limit_page_length=0,
	) or []

	stats = {"total": len(rows), "pending": 0, "interview": 0, "accepted": 0, "rejected": 0}
	referrals = []
	for r in rows:
		group = STATUS_GROUP.get(r.status, "pending")
		stats[group] += 1
		referrals.append({
			"name": r.name,
			"candidate_name": r.applicant_name,
			"email": r.email_id,
			"designation": r.designation,
			"designation_label": _common._link_label("Designation", r.designation) if r.designation else None,
			"opening": r.job_title,
			"opening_label": _common._link_label("Job Opening", r.job_title) if r.job_title else None,
			"status": r.status,
			"status_group": group,
			"applied_on": r.creation,
		})

	# Optional server-side filtering (the page can also filter client-side).
	if status and status != "all":
		referrals = [x for x in referrals if x["status_group"] == status]
	if search:
		needle = search.strip().lower()
		referrals = [
			x for x in referrals
			if needle in (x["candidate_name"] or "").lower()
			or needle in (x["email"] or "").lower()
			or needle in (x["designation_label"] or x["designation"] or "").lower()
		]

	return {"stats": stats, "referrals": referrals}
