"""Direct Applicant Onboarding — Phase 1: adding a candidate directly.

HR adds an experienced / management / referral candidate straight onto a Job
Applicant, with no Job Opening behind it. What a Job Opening would normally
fetch onto the applicant (designation, department, employment type, applicant
type, division, recruiter) is entered by HR instead; Frappe only fetches those
while ``job_title`` is set, so the entered values stay.

Everything here is gated by Recruitment Settings -> "Enable Direct Applicant
Onboarding" and by the applicant's own ``custom_da_is_direct`` flag, so no
existing applicant, opening or offer flow sees any difference.

Endpoints
---------
GET  recruitment.api.direct_applicant.get_config()
POST recruitment.api.direct_applicant.create_direct_applicant(data)
"""

import json
import re

import frappe
from frappe import _
from frappe.utils import cint

SETTINGS = "Recruitment Settings"
ENABLE_FIELD = "enable_direct_applicant_onboarding"

DIRECT_FLAG = "custom_da_is_direct"
CATEGORY_FIELD = "custom_da_category"
AADHAAR_FIELD = "custom_da_aadhaar_masked"
CATEGORIES = ("Experienced", "Management", "Referral")
REFERRAL = "Referral"

# Set on an applicant to run the Duplicity Check on every match key, including
# the ones HR could not enter at creation (see defers_missing_match_keys).
FULL_DUPLICITY_FLAG = "da_full_duplicity_check"

# Dialog key -> Job Applicant field.
FIELD_MAP = {
	"first_name": "applicant_name",
	"middle_name": "custom_applicant_middle_name",
	"last_name": "custom_applicant_last_name",
	"email_id": "email_id",
	"phone_number": "phone_number",
	"company": "custom_company_finalized",
	"designation": "designation",
	"department": "custom_department",
	"employment_type": "custom_employment_type",
	"category": CATEGORY_FIELD,
	"referred_by": "custom_referred_by",
	"division": "custom_division_finalized",
	"recruiter": "custom_recruiter",
	"region": "custom_region",
}
# Always asked and always mandatory: the Job Offer, the Duplicity Check and the
# form email cannot work without them.
LOCKED_FIELDS = ("first_name", "email_id", "company", "designation")

# Recruitment Settings -> "Add Direct Applicant — Standard Fields": each of these
# can be hidden or made mandatory. key -> (label, shown by default, mandatory by default).
# "Referred By" is not listed: it follows Category (shown and required for Referral).
STANDARD_FIELDS_TABLE = "da_standard_fields"
CONFIGURABLE_FIELDS = {
	"middle_name": ("Middle Name", 1, 0),
	"last_name": ("Last Name", 1, 1),
	"phone_number": ("Phone", 1, 1),
	"category": ("Direct Hire Category", 1, 1),
	"division": ("Division", 1, 0),
	"department": ("Department", 1, 1),
	"employment_type": ("Employment Type", 1, 1),
	"recruiter": ("Recruiter", 1, 0),
	"region": ("Region", 1, 0),
}

# A direct hire is always an experienced (lateral) hire, never a campus fresher.
APPLICANT_TYPE = "Lateral"

# Recruitment Settings -> "Add Direct Applicant — Extra Fields": further Job
# Applicant fields HR is asked for in the dialog, beyond the fixed ones above.
EXTRA_FIELDS_TABLE = "da_creation_fields"
EXTRA_FIELD_TYPES = frozenset({
	"Data", "Phone", "Select", "Link", "Date", "Datetime", "Int", "Float",
	"Currency", "Percent", "Check", "Small Text", "Text", "Long Text",
	"Attach", "Attach Image",
})
# Set by the system on every direct applicant, so never asked for.
SYSTEM_SET_FIELDS = frozenset({
	"status", "job_title", "custom_applicant_type", "custom_full_name",
	"custom_current_stage", "custom_substatus", DIRECT_FLAG,
})


def is_enabled():
	return bool(frappe.db.get_single_value(SETTINGS, ENABLE_FIELD))


def is_direct(applicant):
	"""True for an applicant added through Direct Applicant Onboarding."""
	return bool(applicant and applicant.get(DIRECT_FLAG))


@frappe.whitelist()
def get_config():
	"""What the Job Applicant list needs to show the "Add Direct Applicant" button."""
	enabled = is_enabled()
	return {
		"enabled": enabled,
		"can_create": bool(frappe.has_permission("Job Applicant", "create")),
		"categories": list(CATEGORIES),
		"standard_fields": get_standard_field_config() if enabled else {},
		"extra_fields": get_extra_fields() if enabled else [],
	}


@frappe.whitelist(methods=["POST"])
def create_direct_applicant(data):
	"""Create a Job Applicant with no Job Opening from HR's entry. Returns its name."""
	if not is_enabled():
		frappe.throw(_("Direct Applicant Onboarding is not enabled in Recruitment Settings."))
	frappe.has_permission("Job Applicant", "create", throw=True)

	data = _parse(data)
	values = {key: (str(data.get(key) or "")).strip() for key in FIELD_MAP}
	_validate_input(values)
	extras = _extra_values(data)

	doc = frappe.new_doc("Job Applicant")
	for key, fieldname in FIELD_MAP.items():
		if values.get(key):
			doc.set(fieldname, values[key])
	doc.update(extras)
	doc.set(DIRECT_FLAG, 1)
	doc.set("custom_applicant_type", APPLICANT_TYPE)
	# An uploaded file (e.g. the resume) is linked to the applicant by Frappe's own
	# on_update hook (attach_files_to_document).
	doc.insert()
	return {"name": doc.name}


def _parse(data):
	if isinstance(data, str):
		data = json.loads(data or "{}")
	if not isinstance(data, dict):
		frappe.throw(_("Data must be a JSON object."))
	return data


def get_standard_field_config():
	"""{key: {"show", "reqd"}} for every configurable dialog field. A key missing
	from the settings table keeps its default; a hidden field is never required."""
	rows = {r.field_key: r for r in frappe.get_cached_doc(SETTINGS).get(STANDARD_FIELDS_TABLE) or []}
	config = {}
	for key, (_label, show, reqd) in CONFIGURABLE_FIELDS.items():
		row = rows.get(key)
		if row:
			show, reqd = cint(row.show), cint(row.mandatory)
		config[key] = {"show": show, "reqd": reqd if show else 0}
	# Division only narrows the Department list: without Department it means nothing.
	if not config["department"]["show"]:
		config["division"] = {"show": 0, "reqd": 0}
	return config


def validate_standard_fields(settings):
	"""Recruitment Settings ``validate``: keep one row per configurable field, in
	order, with its label; a hidden field cannot be mandatory."""
	existing = {r.field_key: r for r in settings.get(STANDARD_FIELDS_TABLE) or [] if r.field_key}
	settings.set(STANDARD_FIELDS_TABLE, [])
	for key, (label, show, reqd) in CONFIGURABLE_FIELDS.items():
		row = existing.get(key)
		show = cint(row.show) if row else show
		reqd = cint(row.mandatory) if row else reqd
		settings.append(STANDARD_FIELDS_TABLE, {
			"field_key": key, "label": label, "show": show, "mandatory": reqd if show else 0,
		})


def _validate_input(values):
	config = get_standard_field_config()
	# A hidden field's value is ignored, whatever the caller sends.
	for key, rule in config.items():
		if not rule["show"]:
			values[key] = ""
	if not config["category"]["show"]:
		values["referred_by"] = ""

	meta = frappe.get_meta("Job Applicant")
	required = list(LOCKED_FIELDS) + [key for key, rule in config.items() if rule["reqd"]]
	missing = [meta.get_label(FIELD_MAP[key]) for key in required if not values.get(key)]
	if values.get("category") == REFERRAL and not values.get("referred_by"):
		missing.append(meta.get_label(FIELD_MAP["referred_by"]))
	if missing:
		frappe.throw(
			_("Please fill: {0}").format(", ".join(missing)),
			title=_("Missing Details"),
		)
	if values.get("category") and values["category"] not in CATEGORIES:
		frappe.throw(_("Direct Hire Category must be one of {0}.").format(", ".join(CATEGORIES)))
	if values.get("category") != REFERRAL:
		values["referred_by"] = ""
	_validate_hierarchy(values)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def division_query(doctype, txt, searchfield, start, page_len, filters):
	"""Divisions (group Departments) of the company that have at least one active
	department under them — so picking one never leaves the Department list empty."""
	frappe.has_permission("Department", "read", throw=True)
	return frappe.db.sql(
		"""select d.name from `tabDepartment` d
		where d.company = %(company)s and d.is_group = 1 and d.disabled = 0
			and d.name like %(txt)s
			and exists (
				select 1 from `tabDepartment` c
				where c.lft between d.lft + 1 and d.rgt - 1
					and c.company = %(company)s and c.disabled = 0
			)
		order by d.name
		limit %(start)s, %(page_len)s""",
		{
			"company": (filters or {}).get("company"),
			"txt": f"%{txt}%",
			"start": start,
			"page_len": page_len,
		},
	)


def _validate_hierarchy(values):
	"""Company -> Division -> Department -> Designation must hang together — the
	same rules the dialog filters by, enforced here for any caller."""
	company, division = values["company"], values.get("division")
	department, designation = values.get("department"), values["designation"]

	if division:
		div = frappe.db.get_value("Department", division, ["company", "is_group"], as_dict=True)
		if not div or div.company != company or not div.is_group:
			frappe.throw(_("Division {0} is not a division of {1}.").format(frappe.bold(division), frappe.bold(company)))

	dept_company = frappe.db.get_value("Department", department, "company") if department else company
	if dept_company != company:
		frappe.throw(_("Department {0} does not belong to {1}.").format(frappe.bold(department), frappe.bold(company)))
	if division and department and department not in frappe.get_all(
		"Department", filters={"name": ["descendants of", division]}, pluck="name"
	):
		frappe.throw(_("Department {0} is not under Division {1}.").format(frappe.bold(department), frappe.bold(division)))

	# Designations carry their own department / company / status. A designation
	# with none set (a handful of legacy ones) is not refused for it.
	meta = frappe.get_meta("Designation")
	columns = [f for f in ("custom_department", "custom_company", "custom_status") if meta.has_field(f)]
	desig = frappe._dict(
		(columns and frappe.db.get_value("Designation", designation, columns, as_dict=True)) or {}
	)
	if desig.custom_company and desig.custom_company != company:
		frappe.throw(_("Designation {0} does not belong to {1}.").format(frappe.bold(designation), frappe.bold(company)))
	# With Department hidden in the dialog, the designation only has to match the company.
	if department and desig.custom_department and desig.custom_department != department:
		frappe.throw(_("Designation {0} does not belong to Department {1}.").format(frappe.bold(designation), frappe.bold(department)))
	if desig.custom_status and desig.custom_status != "Active":
		frappe.throw(_("Designation {0} is not active.").format(frappe.bold(designation)))


# --------------------------------------------------------------------------- #
# Extra fields in the "Add Direct Applicant" dialog
# --------------------------------------------------------------------------- #
def _reserved_fields():
	return set(FIELD_MAP.values()) | SYSTEM_SET_FIELDS


def extra_field_problem(df):
	"""Why ``df`` cannot be an extra dialog field, or None when it can."""
	if not df:
		return _("is not a Job Applicant field")
	if df.fieldname in _reserved_fields():
		return _("is already in the dialog or set by the system")
	if df.fieldtype not in EXTRA_FIELD_TYPES:
		return _("is a {0} field, which the dialog cannot ask for").format(df.fieldtype)
	if df.read_only or df.hidden or df.fetch_from or df.is_virtual:
		return _("is read-only, hidden or filled automatically")
	return None


@frappe.whitelist()
def get_creation_field_options():
	"""Job Applicant fields that may be added to the dialog (Recruitment Settings picker)."""
	frappe.has_permission("Recruitment Settings", "write", throw=True)
	return [
		{"value": df.fieldname, "label": _(df.label or df.fieldname), "description": df.fieldtype}
		for df in frappe.get_meta("Job Applicant").fields
		if df.fieldname and not extra_field_problem(df)
	]


def validate_creation_fields(settings):
	"""Recruitment Settings ``validate``: every extra field row must be usable.
	Also refreshes each row's label and type from the doctype."""
	meta = frappe.get_meta("Job Applicant")
	before = settings.get_doc_before_save()
	saved = {r.fieldname for r in (before.get(EXTRA_FIELDS_TABLE) or [])} if before else set()
	seen = set()
	dropped = []
	for row in list(settings.get(EXTRA_FIELDS_TABLE) or []):
		df = meta.get_field(row.fieldname)
		problem = extra_field_problem(df)
		if problem and row.fieldname in saved:
			# Configured earlier and since removed or changed: drop it rather than
			# block every Recruitment Settings save until someone notices.
			settings.remove(row)
			dropped.append(row.fieldname)
			continue
		if problem:
			frappe.throw(
				_("Add Direct Applicant — Extra Fields, row #{0}: {1} {2}.").format(
					row.idx, frappe.bold(row.fieldname), problem
				)
			)
		if row.fieldname in seen:
			frappe.throw(
				_("Add Direct Applicant — Extra Fields, row #{0}: {1} is listed twice.").format(
					row.idx, frappe.bold(df.label or row.fieldname)
				)
			)
		seen.add(row.fieldname)
		row.label = df.label
		row.fieldtype = df.fieldtype
	if dropped:
		frappe.msgprint(
			_("Removed from Add Direct Applicant — Extra Fields (no longer usable): {0}").format(", ".join(dropped)),
			indicator="orange",
		)


def get_extra_fields():
	"""The configured extra fields, as the dialog renders them. A field that has
	since been removed or changed into something unusable is left out."""
	rows = frappe.get_cached_doc(SETTINGS).get(EXTRA_FIELDS_TABLE) or []
	meta = frappe.get_meta("Job Applicant")
	out = []
	for row in rows:
		df = meta.get_field(row.fieldname)
		if extra_field_problem(df):
			continue
		out.append({
			"fieldname": df.fieldname,
			"label": _(df.label or df.fieldname),
			"fieldtype": df.fieldtype,
			"options": df.options or "",
			"reqd": 1 if row.mandatory else 0,
		})
	return out


def _extra_values(data):
	"""The configured extra fields' values from ``data``; mandatory ones enforced."""
	values, missing = {}, []
	for field in get_extra_fields():
		value = data.get(field["fieldname"])
		if isinstance(value, str):
			value = value.strip()
		if value in (None, "") or (field["fieldtype"] == "Check" and not frappe.utils.cint(value)):
			if field["reqd"]:
				missing.append(field["label"])
			continue
		values[field["fieldname"]] = value
	if missing:
		frappe.throw(_("Please fill: {0}").format(", ".join(missing)), title=_("Missing Details"))
	return values


# --------------------------------------------------------------------------- #
# Duplicity Check — first step for direct applicants
# --------------------------------------------------------------------------- #
def defers_missing_match_keys(applicant):
	"""Whether the Duplicity Check may skip match keys this applicant lacks.

	HR creates a direct applicant before the candidate has supplied every key
	(PAN arrives with the form), so at creation it is checked on the keys it
	carries; the full check is re-run once the form is submitted, with
	``FULL_DUPLICITY_FLAG`` set. Every other applicant: False, i.e. unchanged.
	"""
	return is_direct(applicant) and not applicant.flags.get(FULL_DUPLICITY_FLAG)


# --------------------------------------------------------------------------- #
# Aadhaar — only the last 4 digits are ever stored
# --------------------------------------------------------------------------- #
_SEPARATORS = re.compile(r"[\s-]")

# Verhoeff checksum tables (UIDAI uses Verhoeff for the 12th digit).
_D = (
	(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
	(2, 3, 4, 0, 1, 7, 8, 9, 5, 6), (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
	(4, 0, 1, 2, 3, 9, 5, 6, 7, 8), (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
	(6, 5, 9, 8, 7, 1, 0, 4, 3, 2), (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
	(8, 7, 6, 5, 9, 3, 2, 1, 0, 4), (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
_P = (
	(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
	(5, 8, 0, 3, 7, 9, 6, 1, 4, 2), (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
	(9, 4, 5, 3, 1, 2, 6, 8, 7, 0), (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
	(2, 7, 9, 3, 8, 0, 6, 4, 1, 5), (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)


def is_valid_aadhaar(number):
	"""12 digits, not starting with 0 or 1, passing the Verhoeff checksum."""
	if not re.fullmatch(r"[2-9]\d{11}", number or ""):
		return False
	check = 0
	for i, digit in enumerate(reversed(number)):
		check = _D[check][_P[i % 8][int(digit)]]
	return check == 0


def mask_aadhaar(number):
	return f"XXXX-XXXX-{number[-4:]}"


def normalize_aadhaar(doc, method=None):
	"""``validate`` on Job Applicant: never let a full Aadhaar number be stored.

	A full number is checked and replaced by its masked form; an already-masked
	value is kept; anything else is rejected. No-op while the field is empty —
	which is every applicant outside Direct Applicant Onboarding.
	"""
	value = (doc.get(AADHAAR_FIELD) or "").strip()
	if not value:
		return
	compact = _SEPARATORS.sub("", value.upper())
	if re.fullmatch(r"XXXXXXXX\d{4}", compact):
		# Already masked (however it was spaced): store the canonical form.
		doc.set(AADHAAR_FIELD, mask_aadhaar(compact))
		return
	digits = _SEPARATORS.sub("", value)
	if not is_valid_aadhaar(digits):
		# The number itself is not echoed back: it must not reach logs or tracebacks.
		if not re.fullmatch(r"\d{12}", digits):
			message = _("Aadhaar Number must be 12 digits.")
		elif digits[0] in "01":
			message = _("An Aadhaar Number cannot start with 0 or 1. Please check the number.")
		else:
			# 12 digits, but the last (check) digit does not match the other 11.
			message = _("This is not a valid Aadhaar Number. Please check the digits and enter it exactly as on your Aadhaar card.")
		frappe.throw(message, title=_("Invalid Aadhaar"))
	doc.set(AADHAAR_FIELD, mask_aadhaar(digits))
