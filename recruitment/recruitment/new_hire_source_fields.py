# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Carry source-mandatory applicant fields onto every New Hire Form.

A field ticked Mandatory for any source in Job Applicant Profile Settings
(Careers, IJP, Refer, Campus, Pre-offer) is data the company has decided every
hire must have. A direct hire skips those forms, so without this the New Hire
form could raise an Employee without it.

Settings rows name Job Applicant fields; the New Hire form places Employee
fields. A Job Applicant field reaches its Employee counterpart by:

* a Field Flow (nextai Data Flow Attachment) that targets both doctypes — the
  "Map Existing Fields" case, where the two fieldnames may differ
* a native pair whose names differ (``_NATIVE_PAIRS``)
* the same fieldname — how ``employee_field_sync`` mirrors Employee onto Job
  Applicant, and how a "Create New Field" flow names its fields

A field with no Employee counterpart is skipped: there is nowhere on the
Employee to hold it.

On the form, each such field gets a row forced to Show / Required and marked
``source_mandatory``, so the builder shows it locked. When the field stops being
mandatory at every source, the mark is cleared and Mandatory drops back to
Default — the field stays on the form for the admin to keep or remove.
"""

import frappe
from frappe import _
from frappe.utils import cint

SETTINGS_DOCTYPE = "Job Applicant Profile Settings"
SETTINGS_ROW_DOCTYPE = "Job Opening Application Field"
FORM_DOCTYPE = "New Hire Form"
JOB_APPLICANT = "Job Applicant"
EMPLOYEE = "Employee"

SOURCE_FLAG = "source_mandatory"

# column -> source label shown to the admin
SOURCE_COLUMNS = {
	"mandatory_careers": "Careers",
	"mandatory_ijp": "IJP",
	"mandatory_refer": "Refer",
	"mandatory_campus": "Campus",
	"mandatory_preoffer": "Pre-offer",
}

# Job Applicant -> Employee fields that hold the same value under another name.
# The reverse of what `new_hire._create_job_applicant` copies.
_NATIVE_PAIRS = {
	"email_id": "personal_email",
	"phone_number": "cell_number",
}


# --------------------------------------------------------------------- mapping --

def _flow_pairs():
	"""``{job_applicant_field: employee_field}`` from Field Flows that target both.
	A blank target fieldname means the Data Element's own (which names it)."""
	if not frappe.db.table_exists("Data Flow Attachment Target"):
		return {}
	by_attachment = {}
	for row in frappe.get_all(
		"Data Flow Attachment Target",
		filters={"parenttype": "Data Flow Attachment", "target_doctype": ["in", [JOB_APPLICANT, EMPLOYEE]]},
		fields=["parent", "target_doctype", "fieldname"],
		limit_page_length=0,
	):
		by_attachment.setdefault(row.parent, {})[row.target_doctype] = row.fieldname
	if not by_attachment:
		return {}

	elements = dict(frappe.get_all(
		"Data Flow Attachment",
		filters={"name": ["in", list(by_attachment)]},
		fields=["name", "data_element"],
		as_list=True,
	))
	pairs = {}
	for attachment, targets in by_attachment.items():
		if JOB_APPLICANT not in targets or EMPLOYEE not in targets:
			continue
		element = elements.get(attachment)
		source = targets[JOB_APPLICANT] or element
		target = targets[EMPLOYEE] or element
		if source and target:
			pairs[source] = target
	return pairs


def _employee_field(employee_meta, fieldname):
	"""The Employee docfield a New Hire form can collect into, or None."""
	from recruitment.api.new_hire import _FRAPPE_MANAGED, _LAYOUT_TYPES, _SKIP_FIELDNAMES

	df = employee_meta.get_field(fieldname)
	if not df or df.fieldtype in _LAYOUT_TYPES:
		return None
	if fieldname in _SKIP_FIELDNAMES or fieldname in _FRAPPE_MANAGED:
		return None
	# Read-only and virtual fields render but can never be filled, so "Required"
	# on one would only be a field nobody can satisfy.
	if df.read_only or df.get("is_virtual"):
		return None
	return df


def source_mandatory_fields(unmapped=None):
	"""``{employee_field: {"sources", "applicant_field", "rules"}}`` for every settings
	row ticked Mandatory for at least one source and reaching an Employee field.
	Pass a list as ``unmapped`` to collect the Job Applicant fields that don't."""
	rows = frappe.get_all(
		SETTINGS_ROW_DOCTYPE,
		filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE},
		fields=["reference_name", "applicable_enabled", "applicability_config", *SOURCE_COLUMNS],
		order_by="idx asc",
		limit_page_length=0,
	)
	rows = [r for r in rows if r.reference_name and any(cint(r.get(c)) for c in SOURCE_COLUMNS)]
	if not rows:
		return {}

	applicant_meta = frappe.get_meta(JOB_APPLICANT)
	employee_meta = frappe.get_meta(EMPLOYEE)
	flows = _flow_pairs()

	out = {}
	for row in rows:
		ref = row.reference_name
		if not applicant_meta.get_field(ref):
			continue  # a stale settings row; _auto_sync prunes it on the next load
		# First candidate Employee can actually hold. A flow's Employee field is
		# often virtual (it fetches from the applicant), which a direct hire —
		# with no applicant behind it — can never fill.
		target = next(
			(fn for fn in (flows.get(ref), _NATIVE_PAIRS.get(ref), ref)
			 if fn and _employee_field(employee_meta, fn)),
			None,
		)
		if not target:
			if unmapped is not None:
				unmapped.append(ref)
			continue
		entry = out.setdefault(target, {"sources": [], "applicant_field": ref, "rules": []})
		for col, label in SOURCE_COLUMNS.items():
			if cint(row.get(col)) and label not in entry["sources"]:
				entry["sources"].append(label)
		entry["rules"].append(row)
	return out


def _admits_form(entry, form_doc):
	"""Whether the field's Company / Assignment rule reaches ``form_doc``.

	Only a Company-restricted form can be excluded, and only by a rule made of
	Companies alone: an Assignment matches opening attributes a New Hire form does
	not have, and a form with no company serves every company — both admit, the
	same way field_applicability admits what it cannot evaluate.
	"""
	company = form_doc.get("company")
	if not company:
		return True

	from recruitment.recruitment.field_applicability import parse_config, row_is_restricted, split_config

	for rule in entry["rules"]:
		if not row_is_restricted(rule):
			return True
		companies, assignments = split_config(parse_config(rule.get("applicability_config")))
		if assignments or company in companies:
			return True
	return False


# ------------------------------------------------------------------------ apply --

def apply_to_form(form_doc, fields=None):
	"""Bring ``form_doc``'s rows in line with the source-mandatory fields, in memory.
	Returns ``{"added", "enforced", "released"}`` fieldname lists."""
	if fields is None:
		fields = source_mandatory_fields()
	wanted = {fn: e for fn, e in fields.items() if _admits_form(e, form_doc)}

	added, enforced, released = [], [], []
	present = set()
	for row in form_doc.get("field_overrides") or []:
		fieldname = (row.fieldname or "").strip()
		present.add(fieldname)
		if fieldname in wanted:
			if (
				not cint(row.get(SOURCE_FLAG))
				or row.mandatory_override != "Required"
				or row.expose == "Hide"
				or row.read_only_override == "Read Only"
			):
				row.set(SOURCE_FLAG, 1)
				row.mandatory_override = "Required"
				if row.expose == "Hide":
					row.expose = "Show"
				if row.read_only_override == "Read Only":
					row.read_only_override = "Default"
				enforced.append(fieldname)
		elif cint(row.get(SOURCE_FLAG)):
			row.set(SOURCE_FLAG, 0)
			if row.mandatory_override == "Required":
				row.mandatory_override = "Default"
			released.append(fieldname)

	order = max((cint(r.order) for r in form_doc.get("field_overrides") or []), default=0)
	for fieldname in wanted:
		if fieldname in present:
			continue
		order += 1
		# No tab/section override: it lands where Employee's own layout puts it.
		form_doc.append("field_overrides", {
			"fieldname": fieldname,
			"applies_to": "Parent",
			"expose": "Show",
			"mandatory_override": "Required",
			"read_only_override": "Default",
			"employment_type": "All",
			"order": order,
			SOURCE_FLAG: 1,
		})
		added.append(fieldname)

	return {"added": added, "enforced": enforced, "released": released}


def describe(changes):
	"""One line for the admin, or "" when nothing changed."""
	parts = []
	if changes["added"]:
		parts.append(_("added {0}").format(", ".join(changes["added"])))
	if changes["enforced"]:
		parts.append(_("made required {0}").format(", ".join(changes["enforced"])))
	if changes["released"]:
		parts.append(_("no longer forced required {0}").format(", ".join(changes["released"])))
	return "; ".join(parts)


def sync_all_forms(doc=None, method=None):
	"""``Job Applicant Profile Settings.on_update``: re-apply to every New Hire Form.
	Only a form that changes is saved, so an unrelated settings edit bumps nothing."""
	names = frappe.get_all(FORM_DOCTYPE, pluck="name", limit_page_length=0)
	if not names:
		return

	unmapped = []
	fields = source_mandatory_fields(unmapped)
	notes = []
	for name in names:
		form = frappe.get_doc(FORM_DOCTYPE, name)
		changes = apply_to_form(form, fields)
		line = describe(changes)
		if not line:
			continue
		# validate re-applies (a no-op now); the flag keeps it from messaging too.
		form.flags.source_fields_synced = True
		form.save(ignore_permissions=True)
		notes.append(f"{name}: {line}")

	if notes:
		frappe.msgprint(
			_("New Hire Form fields updated from source-mandatory settings — {0}").format(" | ".join(notes)),
			alert=True,
		)
	if unmapped:
		# Said, not thrown: the settings save is about the applicant forms, and a
		# field Employee can't hold is still a valid thing to require there.
		frappe.msgprint(
			_("Mandatory at a source but not on the New Hire form, as Employee has no matching field: {0}. "
			  "Map it to an Employee field with Add Custom Field → Map Existing Fields.").format(
				", ".join(unmapped)),
			alert=True,
			indicator="orange",
		)
