"""Direct Applicant Onboarding — which Job Applicant fields a form may carry, and
how the candidate's values are checked and written.

The catalog is Job Applicant Profile Settings (the same field list careers /
refer / pre-offer draw from — standard, custom and nextai virtual fields, with
their child-table setup), plus the direct-applicant Aadhaar fields. With no Job
Opening behind a direct applicant, the profile rows' Company / Assignment rules
are matched against a stand-in opening built from the applicant's own company,
designation and department.

Reused unchanged: api/channels/_common (_child_table_fields,
_serialize_field_value) and recruitment.field_applicability.
"""

import json

import frappe
from frappe import _
from frappe.utils.caching import request_cache
from frappe.utils import cint, flt, getdate

from recruitment.api.direct_applicant import AADHAAR_FIELD, FIELD_MAP, SYSTEM_SET_FIELDS

DA_OWN_FIELDS = (AADHAAR_FIELD, "custom_da_aadhaar_card")

# What the candidate page can render and this module can check.
SIMPLE_TYPES = frozenset({
	"Data", "Phone", "Small Text", "Text", "Long Text", "Select", "Link", "Date",
	"Int", "Float", "Currency", "Percent", "Check", "Attach", "Attach Image",
})
TABLE_TYPE = "Table"
ATTACH_TYPES = frozenset({"Attach", "Attach Image"})

# HR sets these (position, identity used for matching, workflow state); the
# candidate never edits them. First/middle/last name and phone stay editable.
HR_OWNED = (
	(set(FIELD_MAP.values()) - {"applicant_name", "custom_applicant_middle_name", "custom_applicant_last_name", "phone_number"})
	| SYSTEM_SET_FIELDS
	| {"custom_da_category", "custom_da_form_status", "custom_da_duplicity_flag", "custom_da_duplicity_note",
	   "custom_blacklist", "custom_company_finalized"}
	# Workflow / HR record fields that Profile Settings also lists.
	| {"custom_shortlisted_by_hiring_manager", "custom_pre_offer_forms", "custom_pre_offer_field_approvals",
	   "custom_onboarding_portal_form", "source", "source_name", "custom_location",
	   # "Final Interview Record": what HR agreed, not what the candidate states.
	   "custom_previous_salary", "custom_special_hra", "custom_car_allowance", "custom_ctc_finalized",
	   "custom_bond_if_any", "custom_hike", "custom_incentive", "custom_remark_to_be_added_in__ol",
	   "custom_recruiter_remark"}
)

# A Link field lets the guest page search the target doctype. Records about
# people / money are never listed to a guest, whatever a form is set up with.
GUEST_LINK_DENYLIST = frozenset({
	"User", "Employee", "Job Applicant", "Job Offer", "Employee Onboarding", "Contact",
	"Address", "Customer", "Supplier", "Lead", "Salary Structure", "Salary Structure Assignment",
	"Direct Applicant Form Request", "Candidate Portal User",
	# Hiring / workflow records and system logs — never listed to a guest.
	"Job Opening", "Job Requisition", "Interview", "Interview Feedback", "CTC Proposal",
	"Candidate Portal Session", "Candidate Action Center Item", "Employee Referral",
	"Salary Slip", "Bank Account", "File", "Communication", "Comment", "ToDo", "Version",
	"Error Log", "Email Queue", "Access Log", "Activity Log", "Role", "Has Role", "DocType",
})


def link_denied(doctype):
	"""Whether a guest may search / pick records of ``doctype``. Only plain
	masters qualify: not the denylist, and never a submittable document, a child
	table or a single (settings) — those are transactions or configuration."""
	if not doctype or doctype in GUEST_LINK_DENYLIST or not frappe.db.exists("DocType", doctype):
		return True
	meta = frappe.get_meta(doctype)
	return bool(meta.is_submittable or meta.istable or meta.issingle)

MAX_TEXT = 5000
MAX_ROWS = 50


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #
def _profile_rows():
	from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
		get_job_applicant_profile_template,
	)

	return get_job_applicant_profile_template(opening=None).get("rows") or []


def field_problem(df):
	"""Why ``df`` cannot be on a direct applicant form, or None."""
	if not df:
		return _("is not a Job Applicant field")
	if df.fieldname in HR_OWNED:
		return _("is set by HR or the system")
	if df.fieldtype not in SIMPLE_TYPES and df.fieldtype != TABLE_TYPE:
		return _("is a {0} field, which the form cannot show").format(df.fieldtype)
	if df.fieldtype == "Link" and link_denied(df.options):
		return _("links to {0}, which a candidate may not search").format(df.options or "-")
	return None


@request_cache
def catalog():
	"""{fieldname: {label, fieldtype, section, row}} of every field a form may use."""
	meta = frappe.get_meta("Job Applicant")
	out = {}
	for row in _profile_rows():
		df = meta.get_field(row.get("reference_name"))
		if df and not field_problem(df):
			out[df.fieldname] = {
				"label": row.get("display_name") or df.label,
				"fieldtype": df.fieldtype,
				"section": row.get("section") or "",
				"row": row,
			}
	for fieldname in DA_OWN_FIELDS:
		df = meta.get_field(fieldname)
		if df and fieldname not in out:
			out[fieldname] = {"label": df.label, "fieldtype": df.fieldtype, "section": _("Identity"), "row": {}}
	return out


@frappe.whitelist()
def get_catalog_options():
	"""Picker options for the Direct Applicant Form's Field column."""
	frappe.has_permission("Direct Applicant Form", "write", throw=True)
	return [
		{"value": name, "label": entry["label"], "description": entry["fieldtype"],
		 "section": entry["section"], "child_fields": _child_columns(name)}
		for name, entry in catalog().items()
	]


def _child_columns(fieldname):
	"""Child-table columns a form may show, as [{fieldname, label}] ([] for non-tables)."""
	df = frappe.get_meta("Job Applicant").get_field(fieldname)
	if not df or df.fieldtype != TABLE_TYPE:
		return []
	from recruitment.api.channels._common import _child_table_fields

	return [
		{"fieldname": c["fieldname"], "label": c["label"]}
		for c in _child_table_fields(df.options)
		if c["fieldtype"] in SIMPLE_TYPES and not c.get("read_only") and not _link_denied(c)
	]


def _link_denied(column):
	return column["fieldtype"] == "Link" and link_denied(column.get("options"))


def _split(value):
	return [v.strip() for v in (value or "").replace("\n", ",").split(",") if v.strip()]


def validate_form_template(form):
	"""Direct Applicant Form ``validate``: every row usable, no duplicates; fills
	label / type / default section; child column names must exist. Only one
	form is the default: ticking it here unticks the others."""
	if form.is_default:
		for other in frappe.get_all(
			"Direct Applicant Form", filters={"is_default": 1, "name": ["!=", form.name or ""]}, pluck="name"
		):
			frappe.db.set_value("Direct Applicant Form", other, "is_default", 0)
	cat = catalog()
	seen = set()
	if not form.get("fields"):
		frappe.throw(_("Add at least one field to the form."))
	for row in form.get("fields") or []:
		entry = cat.get(row.fieldname)
		if not entry:
			problem = field_problem(frappe.get_meta("Job Applicant").get_field(row.fieldname)) or _(
				"is not in Job Applicant Profile Settings"
			)
			frappe.throw(_("Row #{0}: {1} {2}.").format(row.idx, frappe.bold(row.fieldname), problem))
		if row.fieldname in seen:
			frappe.throw(_("Row #{0}: {1} is listed twice.").format(row.idx, frappe.bold(entry["label"])))
		seen.add(row.fieldname)
		row.label = entry["label"]
		row.fieldtype = entry["fieldtype"]
		row.section = row.section or entry["section"]
		if entry["fieldtype"] != TABLE_TYPE:
			row.child_fields = row.mandatory_child_fields = None
			continue
		allowed = {c["fieldname"] for c in _child_columns(row.fieldname)}
		bad = [c for c in _split(row.child_fields) + _split(row.mandatory_child_fields) if c not in allowed]
		if bad:
			frappe.throw(
				_("Row #{0}: {1} has no usable column(s) {2}.").format(row.idx, frappe.bold(entry["label"]), ", ".join(bad))
			)


# --------------------------------------------------------------------------- #
# Snapshot (what a sent link shows)
# --------------------------------------------------------------------------- #
def _stand_in_opening(applicant):
	"""Applicant values under Job Opening fieldnames, for the profile rows'
	Company / Assignment rules (field_applicability.opening_admits)."""
	return {
		"doctype": "Job Opening",
		"name": None,
		"company": applicant.get("custom_company_finalized"),
		"designation": applicant.get("designation"),
		"department": applicant.get("custom_department"),
		"employment_type": applicant.get("custom_employment_type"),
		"custom_region": applicant.get("custom_region"),
	}


def _admitted(row, applicant, excluded, index):
	from recruitment.recruitment.field_applicability import opening_admits, parse_config, row_is_restricted

	if not row or not row_is_restricted(row, excluded):
		return True
	return opening_admits(parse_config(row.get("applicability_config")), _stand_in_opening(applicant), index)


def _virtual_options():
	"""Select choices of managed (virtual) fields — kept on Custom Doctype Field
	Item, never on the docfield (see _common.get_application_fields_for_channel)."""
	rows = frappe.get_all(
		"Custom Doctype Field Item",
		filters={"parent": "Job Applicant", "parenttype": "Custom Doctype Fields", "child_table": ["is", "not set"]},
		fields=["field", "options"],
	)
	return {r.field: r.options for r in rows if r.field}


def build_field_snapshot(form, applicant):
	"""The form's fields as the candidate will see them, applicability applied.
	Stored on the request so later template edits never change an open link."""
	from nextai.nextai.doctype.dynamic_user_assignment.attributes import AttributeIndex

	from recruitment.api.channels._common import _child_table_fields
	from recruitment.recruitment.doctype.job_applicant_applicability_configuration.job_applicant_applicability_configuration import (
		excluded_field_refs,
	)

	meta = frappe.get_meta("Job Applicant")
	cat = catalog()
	excluded, index = excluded_field_refs(), AttributeIndex()
	virtual_options = None
	out = []
	for row in form.get("fields") or []:
		entry = cat.get(row.fieldname)
		if not entry or not _admitted(entry["row"], applicant, excluded, index):
			continue
		df = meta.get_field(row.fieldname)
		options = df.options or ""
		if df.is_virtual:
			virtual_options = virtual_options if virtual_options is not None else _virtual_options()
			options = virtual_options.get(df.fieldname) or ""
		field = {
			"fieldname": df.fieldname,
			"label": row.label or entry["label"],
			"fieldtype": df.fieldtype,
			"options": options,
			"reqd": cint(row.mandatory),
			"section": row.section or entry["section"] or _("Details"),
		}
		if df.fieldtype == TABLE_TYPE:
			wanted = set(_split(row.child_fields))
			mandatory = set(_split(row.mandatory_child_fields))
			usable = {c["fieldname"] for c in _child_columns(df.fieldname)}
			field["child"] = [
				{"fieldname": c["fieldname"], "label": c["label"], "fieldtype": c["fieldtype"],
				 "options": c.get("options") or "", "reqd": 1 if c["fieldname"] in mandatory else 0}
				for c in _child_table_fields(df.options)
				if c["fieldname"] in usable and (not wanted or c["fieldname"] in wanted)
			]
			if not field["child"]:
				continue
		out.append(field)
	return out


# --------------------------------------------------------------------------- #
# Values
# --------------------------------------------------------------------------- #
def current_value(applicant, field):
	from recruitment.api.channels._common import _serialize_field_value

	value = _serialize_field_value(applicant, field["fieldname"], field["fieldtype"])
	if field["fieldtype"] == TABLE_TYPE:
		keep = {c["fieldname"] for c in field.get("child") or []}
		return [{k: v for k, v in (r or {}).items() if k in keep} for r in (value or [])]
	return value


def is_blank_value(applicant, field):
	value = applicant.get(field["fieldname"])
	if field["fieldtype"] == TABLE_TYPE:
		return not value
	if field["fieldtype"] == "Check":
		return not cint(value)
	return value in (None, "")


def clean_submission(applicant, fields, payload, editable):
	"""Check ``payload`` against ``fields`` (only ``editable`` ones may be sent)
	and return the values to write. Throws a readable message on any problem."""
	if not isinstance(payload, dict):
		frappe.throw(_("Invalid submission."))
	by_name = {f["fieldname"]: f for f in fields}
	unknown = [k for k in payload if k not in by_name or k not in editable]
	if unknown:
		frappe.throw(_("These fields cannot be submitted: {0}").format(", ".join(unknown)))

	cleaned, missing = {}, []
	for fieldname in editable:
		field = by_name[fieldname]
		value = payload.get(fieldname)
		if field["fieldtype"] == TABLE_TYPE:
			value = _clean_rows(applicant, field, value)
			blank = not value
		else:
			value = _clean_value(applicant, field, value)
			blank = value in (None, "") or (field["fieldtype"] == "Check" and not value)
		if blank and field["reqd"]:
			missing.append(field["label"])
		cleaned[fieldname] = value
	if missing:
		frappe.throw(_("Please fill: {0}").format(", ".join(missing)), title=_("Missing Details"))
	return cleaned


def _clean_rows(applicant, field, rows):
	if rows in (None, ""):
		return []
	if not isinstance(rows, list) or len(rows) > MAX_ROWS:
		frappe.throw(_("{0}: invalid rows.").format(field["label"]))
	columns = {c["fieldname"]: c for c in field["child"]}
	out = []
	for i, row in enumerate(rows, 1):
		if not isinstance(row, dict):
			frappe.throw(_("{0}: invalid row {1}.").format(field["label"], i))
		clean = {k: _clean_value(applicant, columns[k], row.get(k)) for k in columns}
		if all(v in (None, "", 0) for v in clean.values()):
			continue
		missing = [c["label"] for c in columns.values() if c["reqd"] and clean[c["fieldname"]] in (None, "")]
		if missing:
			frappe.throw(_("{0}, row {1}: please fill {2}.").format(field["label"], i, ", ".join(missing)))
		out.append(clean)
	return out


def _clean_value(applicant, field, value):
	"""One value, coerced to its fieldtype. Blank -> None."""
	fieldtype, label = field["fieldtype"], field["label"]
	if isinstance(value, str):
		value = value.strip()
	if value in (None, ""):
		return 0 if fieldtype == "Check" else None
	if isinstance(value, (dict, list)):
		frappe.throw(_("{0}: invalid value.").format(label))

	try:
		if fieldtype == "Check":
			return 1 if cint(value) else 0
		if fieldtype in ("Int", "Float", "Currency", "Percent"):
			# float() rejects "abc" (cint/flt would quietly store 0).
			number = float(str(value).replace(",", ""))
			if fieldtype == "Int":
				if number != int(number):
					raise ValueError
				return int(number)
			return flt(number)
		if fieldtype == "Date":
			return str(getdate(value))
	except Exception:
		frappe.throw(_("{0}: {1} is not a valid value.").format(label, frappe.bold(str(value)[:50])))

	value = str(value)
	if len(value) > MAX_TEXT:
		frappe.throw(_("{0} is too long.").format(label))
	if fieldtype == "Select":
		choices = [c.strip() for c in (field.get("options") or "").split("\n") if c.strip()]
		if value not in choices:
			frappe.throw(_("{0}: choose one of the listed options.").format(label))
	elif fieldtype == "Link":
		if link_denied(field.get("options")) or not frappe.db.exists(field["options"], value):
			frappe.throw(_("{0}: {1} was not found.").format(label, frappe.bold(value[:50])))
	elif fieldtype in ATTACH_TYPES:
		# The file already on the applicant (unchanged), or one the candidate
		# uploaded through their own form — never another file of this applicant
		# (e.g. an internal document HR attached) whose URL they happen to know.
		if value not in _existing_files(applicant) and not frappe.db.exists(
			"File",
			{"file_url": value, "attached_to_doctype": "Job Applicant", "attached_to_name": applicant.name,
			 "owner": "Guest"},
		):
			frappe.throw(_("{0}: please upload the file again.").format(label))
	return value


def _existing_files(applicant):
	"""Every Attach value already on the applicant (fields and table cells)."""
	if applicant.flags.get("da_existing_files") is None:
		files = set()
		for df in applicant.meta.fields:
			if df.fieldtype in ATTACH_TYPES and applicant.get(df.fieldname):
				files.add(applicant.get(df.fieldname))
			elif df.fieldtype == TABLE_TYPE:
				child = frappe.get_meta(df.options)
				attach = [c.fieldname for c in child.fields if c.fieldtype in ATTACH_TYPES]
				for row in applicant.get(df.fieldname) or []:
					files.update(row.get(f) for f in attach if row.get(f))
		applicant.flags.da_existing_files = files
	return applicant.flags.da_existing_files


def apply_values(applicant, cleaned, fields):
	"""Write cleaned values onto the applicant document (not saved here).

	Table rows are merged onto the existing rows by position: the candidate only
	sends the form's columns, and the other columns (filled by HR or another
	channel) and the row names must survive.
	"""
	by_name = {f["fieldname"]: f for f in fields}
	for fieldname, value in cleaned.items():
		if by_name[fieldname]["fieldtype"] != TABLE_TYPE:
			applicant.set(fieldname, value)
			continue
		existing = list(applicant.get(fieldname) or [])
		for i, row in enumerate(value):
			if i < len(existing):
				existing[i].update(row)
			else:
				existing.append(applicant.append(fieldname, row))
		applicant.set(fieldname, existing[: len(value)])


def snapshot_json(fields):
	return json.dumps(fields)
