"""
Job Requisition API
===================

Endpoints used by the React-based "Raise a Requisition" UI.

create_job_requisition(payload)
    Accepts a single nested payload. Positions are grouped by `location`
    on the backend; one Job Requisition document is created per unique
    location, and all positions for that location land in the
    `custom_position_details` child table of that requisition.

get_job_requisition(name)
    Returns the full nested view of a single Job Requisition, in the
    same shape the create endpoint accepts (round-trip friendly).

Response envelope (consistent with other api/ modules in this app):
    {"success": bool, "message": str, "data": <payload> | None}
HTTP status code is set on frappe.local.response.

Field-name reference for UI devs
--------------------------------
The keys in the payload are flat, snake_case, grouped into logical
sections. The mapping to DocType fields is handled by this module —
the UI never needs to know the `custom_*` field names.

Sections expected in the create payload:
    basic_details, job_details, positions[], requirement,
    job_description, other_details, pre_screened_candidates[],
    assign_to_recruiter

See _build_requisition_doc() for the full mapping if you need it.
"""

import json

import frappe
from frappe import _

JOB_REQUISITION = "Job Requisition"

# ---------------------------------------------------------------------------
# Response helpers (project convention)
# ---------------------------------------------------------------------------


def _ok(message, data, http=200):
	frappe.local.response["http_status_code"] = http
	return {"success": True, "message": message, "data": data}


def _err(message, http=400, data=None):
	frappe.local.response["http_status_code"] = http
	return {"success": False, "message": message, "data": data}


# ---------------------------------------------------------------------------
# Payload normalisation
# ---------------------------------------------------------------------------


def _coerce_payload(payload):
	"""Accept either a dict or a JSON string (Frappe's whitelist passes strings)."""
	if payload is None:
		frappe.throw(_("Request body is required."))
	if isinstance(payload, str):
		try:
			payload = json.loads(payload)
		except json.JSONDecodeError as exc:
			frappe.throw(_("Invalid JSON in request body: {0}").format(str(exc)))
	if not isinstance(payload, dict):
		frappe.throw(_("Payload must be an object."))
	return payload


def _section(payload, key):
	"""Return a dict section, treating missing/None as empty."""
	value = payload.get(key) or {}
	if not isinstance(value, dict):
		frappe.throw(_("`{0}` must be an object.").format(key))
	return value


def _list(payload, key):
	value = payload.get(key) or []
	if not isinstance(value, list):
		frappe.throw(_("`{0}` must be a list.").format(key))
	return value


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

REQUIRED_BASIC_KEYS = ("hiring_manager", "company", "department", "designation")


def _validate(payload):
	basic = _section(payload, "basic_details")
	missing = [k for k in REQUIRED_BASIC_KEYS if not basic.get(k)]
	if missing:
		frappe.throw(_("Missing required basic_details fields: {0}").format(", ".join(missing)))

	positions = _list(payload, "positions")
	if not positions:
		frappe.throw(_("At least one position is required."))

	for idx, p in enumerate(positions, start=1):
		if not isinstance(p, dict):
			frappe.throw(_("positions[{0}] must be an object.").format(idx))
		if not p.get("location"):
			frappe.throw(_("positions[{0}].location is required (used to group requisitions).").format(idx))
		if not p.get("reporting_manager"):
			frappe.throw(_("positions[{0}].reporting_manager is required.").format(idx))
		vacancy = (p.get("vacancy_type") or "New").strip()
		if vacancy not in ("New", "Replacement"):
			frappe.throw(_("positions[{0}].vacancy_type must be 'New' or 'Replacement'.").format(idx))
		if vacancy == "Replacement" and not p.get("employee_being_replaced"):
			frappe.throw(_("positions[{0}].employee_being_replaced is required for Replacement positions.").format(idx))


# ---------------------------------------------------------------------------
# Build / persist
# ---------------------------------------------------------------------------


def _group_positions_by_location(positions):
	"""Stable group: preserves first-seen location order from the payload."""
	groups = {}
	order = []
	for p in positions:
		loc = p["location"]
		if loc not in groups:
			groups[loc] = []
			order.append(loc)
		groups[loc].append(p)
	return [(loc, groups[loc]) for loc in order]


def _find_existing_requisition(designation, department, requested_by, location):
	"""Return the name of an open Job Requisition for this (designation, department,
	requested_by) that already has at least one position at this `location`, or None."""
	rows = frappe.db.sql(
		"""
		SELECT jr.name
		FROM `tabJob Requisition` jr
		JOIN `tabPosition Details` pd ON pd.parent = jr.name
		WHERE jr.designation = %s
		  AND jr.department = %s
		  AND jr.requested_by = %s
		  AND COALESCE(jr.status, '') NOT IN ('Cancelled', 'Filled')
		  AND pd.location = %s
		LIMIT 1
		""",
		(designation, department, requested_by, location),
	)
	return rows[0][0] if rows else None


def _bypass_hrms_duplicate_check(doc):
	"""HRMS's stock validate_duplicates allows only one open JR per
	(designation, department, requested_by). Our flow uses `location` as an
	additional differentiator, so we shadow the method on this instance."""
	doc.validate_duplicates = lambda: None


def _build_requisition_doc(payload, location, positions_for_location):
	"""Construct an unsaved Job Requisition document for one location."""
	basic = _section(payload, "basic_details")
	job = _section(payload, "job_details")
	req = _section(payload, "requirement")
	jd = _section(payload, "job_description")
	other = _section(payload, "other_details")

	doc = frappe.new_doc(JOB_REQUISITION)
	_bypass_hrms_duplicate_check(doc)

	# --- Basic ---
	doc.requested_by = basic.get("hiring_manager")
	doc.company = basic.get("company")
	doc.department = basic.get("department")
	doc.designation = basic.get("designation")
	doc.custom_division = basic.get("division")
	doc.custom_functional_area = basic.get("functional_area")
	doc.no_of_positions = len(positions_for_location)
	if basic.get("expected_compensation") is not None:
		doc.expected_compensation = basic.get("expected_compensation")
	if basic.get("status"):
		doc.status = basic.get("status")

	# --- Job details ---
	doc.custom_experience_range_from = job.get("experience_range_from")
	doc.custom_experience_range_to = job.get("experience_range_to")
	doc.custom_experience_unit = job.get("experience_unit")
	doc.custom_salary_range_currency = job.get("salary_range_currency")
	doc.custom_salary_range_min = job.get("salary_range_min")
	doc.custom_salary_range_max = job.get("salary_range_max")
	doc.custom_salary_timeframe = job.get("salary_timeframe")
	if job.get("posting_date"):
		doc.posting_date = job.get("posting_date")
	if job.get("expected_by"):
		doc.expected_by = job.get("expected_by")
	doc.custom_hiring_lead = job.get("hiring_lead") or basic.get("hiring_manager")
	doc.custom_additional_roles__responsibilities = job.get("additional_roles_responsibilities")

	# --- Requirement tab ---
	doc.custom_employment_type = req.get("employment_type")
	doc.custom_employment_type_link = req.get("employment_type_link")
	# custom_location is a Link to the Location doctype; do NOT fall back to
	# the grouping `location` (which is a Branch name) — they're different masters.
	if req.get("location"):
		doc.custom_location = req.get("location")
	doc.custom_work_experience_range = req.get("work_experience_range")
	doc.custom_preferred_notice_period = req.get("preferred_notice_period")
	doc.custom_preferred_company = req.get("preferred_company")
	doc.custom_other_preferred_companies = req.get("other_preferred_companies")

	for q in req.get("qualifications") or []:
		if not isinstance(q, dict) or not q.get("qualification"):
			continue
		doc.append(
			"custom_qualifications",
			{
				"qualification": q.get("qualification"),
				"mandatory": q.get("mandatory") or "Required",
			},
		)

	# --- Job description tab ---
	doc.custom_job_description_template = jd.get("template")
	doc.description = jd.get("description")
	doc.reason_for_requesting = jd.get("reason_for_requesting")
	for skill in jd.get("skills") or []:
		if not skill:
			continue
		doc.append("custom_skills", {"skill": skill})

	# --- Other details ---
	doc.custom_comments__instructions = other.get("comments_instructions")
	doc.custom_cost_centre = other.get("cost_centre")
	doc.custom_designation_change = other.get("designation_change")

	# --- Assign to recruiter ---
	if payload.get("assign_to_recruiter"):
		doc.custom_assign_to_recruiter = payload["assign_to_recruiter"]

	# --- Pre screened candidates (replicated on every per-location requisition) ---
	for cand in _list(payload, "pre_screened_candidates"):
		if not isinstance(cand, dict) or not cand.get("name") and not cand.get("candidate_name"):
			continue
		doc.append(
			"custom_pre_screened_candidates",
			{
				"candidate_name": cand.get("candidate_name") or cand.get("name"),
				"email": cand.get("email"),
				"phone": cand.get("phone"),
				"cv": cand.get("cv"),
				"offer_directly": 1 if cand.get("offer_directly") else 0,
			},
		)

	# --- Positions (Vacancy Details child table) ---
	for index, p in enumerate(positions_for_location, start=1):
		doc.append(
			"custom_position_details",
			{
				"position_no": index,
				"vacancy_type": p.get("vacancy_type") or "New",
				"replacement_for": p.get("employee_being_replaced"),
				"reporting_manager": p.get("reporting_manager"),
				"location": p.get("location"),
				"functional_area": p.get("functional_area") or basic.get("functional_area"),
				"employee_type": p.get("employee_type"),
			},
		)

	return doc


# ---------------------------------------------------------------------------
# Whitelisted endpoints
# ---------------------------------------------------------------------------


@frappe.whitelist()
def create_job_requisition(payload=None):
	"""
	Create one Job Requisition per unique location found in `payload.positions`.

	Returns:
	    {
	      "success": true,
	      "message": "Created N requisition(s)",
	      "data": {
	        "requisitions": [
	          {"name": "HR-HIREQ-...", "location": "Bengaluru", "positions_count": 2},
	          ...
	        ]
	      }
	    }
	"""
	try:
		payload = _coerce_payload(payload)
		_validate(payload)

		results = []
		groups = _group_positions_by_location(_list(payload, "positions"))
		basic = _section(payload, "basic_details")

		# All-or-nothing: wrap in a savepoint so partial failures don't leave orphans.
		savepoint = "create_job_requisition"
		frappe.db.savepoint(savepoint)
		try:
			for location, positions in groups:
				existing_name = _find_existing_requisition(
					basic.get("designation"),
					basic.get("department"),
					basic.get("hiring_manager"),
					location,
				)

				if existing_name:
					# UPSERT: append new positions to the existing open JR
					doc = frappe.get_doc(JOB_REQUISITION, existing_name)
					_bypass_hrms_duplicate_check(doc)
					start_idx = len(doc.get("custom_position_details") or [])
					for offset, p in enumerate(positions, start=1):
						doc.append(
							"custom_position_details",
							{
								"position_no": start_idx + offset,
								"vacancy_type": p.get("vacancy_type") or "New",
								"replacement_for": p.get("employee_being_replaced"),
								"reporting_manager": p.get("reporting_manager"),
								"location": p.get("location"),
								"functional_area": p.get("functional_area") or basic.get("functional_area"),
								"employee_type": p.get("employee_type"),
							},
						)
					doc.no_of_positions = (doc.no_of_positions or 0) + len(positions)
					doc.save(ignore_permissions=False)
					action = "updated"
				else:
					# Brand-new JR for this location
					doc = _build_requisition_doc(payload, location, positions)
					doc.insert(ignore_permissions=False)
					action = "created"

				results.append(
					{
						"name": doc.name,
						"location": location,
						"positions_count": len(positions),
						"action": action,
					}
				)
		except Exception:
			frappe.db.rollback(save_point=savepoint)
			raise

		frappe.db.commit()

		created_count = sum(1 for r in results if r["action"] == "created")
		updated_count = sum(1 for r in results if r["action"] == "updated")
		return _ok(
			message=_("Created {0}, updated {1} requisition(s).").format(created_count, updated_count),
			data={"requisitions": results},
			http=201 if created_count else 200,
		)

	except frappe.ValidationError as exc:
		return _err(str(exc), http=400)
	except frappe.PermissionError as exc:
		return _err(str(exc) or _("Not permitted."), http=403)
	except Exception as exc:
		frappe.log_error(frappe.get_traceback(), "create_job_requisition failed")
		return _err(_("Failed to create job requisition: {0}").format(str(exc)), http=500)


@frappe.whitelist()
def get_job_requisition(name=None):
	"""
	Return a single Job Requisition in the same nested shape the create
	endpoint accepts, plus metadata (`name`, `creation`, `modified`,
	`workflow_state`, `status`).
	"""
	try:
		if not name:
			frappe.throw(_("`name` is required."))

		if not frappe.db.exists(JOB_REQUISITION, name):
			return _err(_("Job Requisition not found: {0}").format(name), http=404)

		doc = frappe.get_doc(JOB_REQUISITION, name)
		doc.check_permission("read")

		data = {
			"name": doc.name,
			"status": doc.get("status"),
			"workflow_state": doc.get("workflow_state"),
			"creation": doc.get("creation"),
			"modified": doc.get("modified"),
			"basic_details": {
				"hiring_manager": doc.get("requested_by"),
				"hiring_manager_name": doc.get("requested_by_name"),
				"company": doc.get("company"),
				"department": doc.get("department"),
				"designation": doc.get("designation"),
				"division": doc.get("custom_division"),
				"functional_area": doc.get("custom_functional_area"),
				"no_of_positions": doc.get("no_of_positions"),
				"expected_compensation": doc.get("expected_compensation"),
				"status": doc.get("status"),
			},
			"job_details": {
				"experience_range_from": doc.get("custom_experience_range_from"),
				"experience_range_to": doc.get("custom_experience_range_to"),
				"experience_unit": doc.get("custom_experience_unit"),
				"salary_range_currency": doc.get("custom_salary_range_currency"),
				"salary_range_min": doc.get("custom_salary_range_min"),
				"salary_range_max": doc.get("custom_salary_range_max"),
				"salary_timeframe": doc.get("custom_salary_timeframe"),
				"posting_date": doc.get("posting_date"),
				"expected_by": doc.get("expected_by"),
				"completed_on": doc.get("completed_on"),
				"hiring_lead": doc.get("custom_hiring_lead"),
				"additional_roles_responsibilities": doc.get("custom_additional_roles__responsibilities"),
			},
			"positions": [
				{
					"position_no": row.get("position_no"),
					"vacancy_type": row.get("vacancy_type"),
					"location": row.get("location"),
					"reporting_manager": row.get("reporting_manager"),
					"employee_being_replaced": row.get("replacement_for"),
					"employee_type": row.get("employee_type"),
					"functional_area": row.get("functional_area"),
				}
				for row in doc.get("custom_position_details") or []
			],
			"position_summary": [
				{
					"position_no": row.get("position_no"),
					"status": row.get("status"),
					"job_id": row.get("job_id"),
					"functional_area": row.get("functional_area"),
					"designation_alias": row.get("designation_alias"),
					"location": row.get("location"),
					"candidate": row.get("candidate"),
					"candidate_status": row.get("candidate_status"),
					"hiring_lead": row.get("hiring_lead"),
					"recruiter": row.get("recruiter"),
					"tat_days": row.get("tat_days"),
				}
				for row in doc.get("custom_position_summary") or []
			],
			"requirement": {
				"employment_type": doc.get("custom_employment_type"),
				"employment_type_link": doc.get("custom_employment_type_link"),
				"location": doc.get("custom_location"),
				"work_experience_range": doc.get("custom_work_experience_range"),
				"preferred_notice_period": doc.get("custom_preferred_notice_period"),
				"preferred_company": doc.get("custom_preferred_company"),
				"other_preferred_companies": doc.get("custom_other_preferred_companies"),
				"salary_range_display": doc.get("custom_salary_range_display"),
				"qualifications": [
					{
						"qualification": row.get("qualification"),
						"mandatory": row.get("mandatory"),
					}
					for row in doc.get("custom_qualifications") or []
				],
			},
			"job_description": {
				"template": doc.get("custom_job_description_template"),
				"description": doc.get("description"),
				"reason_for_requesting": doc.get("reason_for_requesting"),
				"skills": [row.get("skill") for row in doc.get("custom_skills") or [] if row.get("skill")],
			},
			"other_details": {
				"comments_instructions": doc.get("custom_comments__instructions"),
				"cost_centre": doc.get("custom_cost_centre"),
				"designation_change": doc.get("custom_designation_change"),
			},
			"assign_to_recruiter": doc.get("custom_assign_to_recruiter"),
			"pre_screened_candidates": [
				{
					"candidate_name": row.get("candidate_name"),
					"email": row.get("email"),
					"phone": row.get("phone"),
					"cv": row.get("cv"),
					"offer_directly": bool(row.get("offer_directly")),
				}
				for row in doc.get("custom_pre_screened_candidates") or []
			],
		}

		return _ok(message=_("Job Requisition fetched."), data=data, http=200)

	except frappe.PermissionError as exc:
		return _err(str(exc) or _("Not permitted."), http=403)
	except frappe.ValidationError as exc:
		return _err(str(exc), http=400)
	except Exception as exc:
		frappe.log_error(frappe.get_traceback(), "get_job_requisition failed")
		return _err(_("Failed to fetch job requisition: {0}").format(str(exc)), http=500)
