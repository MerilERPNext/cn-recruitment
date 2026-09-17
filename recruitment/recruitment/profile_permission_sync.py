# Copyright (c) 2026, ChatNext and contributors
# For license information, please see license.txt

"""Write Profile View Permissions into nextai's DocType Permission for **Employee**;
nextai then enforces them server-side.

A settings row names a Job Applicant field; it maps to every Employee field holding
the same data, resolved like the New Hire sync (new_hire_source_fields.py): its Field
Flow target (``applicant_name`` → ``first_name``), a known native pair
(``phone_number`` → ``cell_number``), and the same-named field when the Job Applicant
field is custom — Employee fields mirrored by employee_field_sync.py. A built-in
field's namesake is not used: Job Applicant ``status`` is not Employee ``status``.
Fields with no Employee counterpart are skipped.

* everyone       → no rows
* specific roles → those roles may view (and edit, where their Employee permission
                   already allows it); every other role with Employee access gets no
                   access — a row only restricts the role it names
* nobody         → no access for every role with Employee access

Only rows this module wrote (tracked in ``profile_permission_sync``) are ever
changed; hand-made rows are left alone and win on conflict. System Managers bypass
nextai field permissions, so get no rows.
"""

import json

import frappe
from frappe.utils.caching import request_cache

from recruitment.recruitment.field_role_permissions import ALL, parse_roles
from recruitment.recruitment.new_hire_source_fields import _NATIVE_PAIRS, _flow_pairs

SOURCE_DOCTYPE = "Job Applicant"
TARGET_DOCTYPE = "Employee"
PERMISSION_DOCTYPE = "DocType Permission"
RECORD_TITLE = "Employee - Permissions"
STATE_FIELD = "profile_permission_sync"

# Bypass nextai (System Manager, Administrator) or must never be affected (Guest).
_SKIP_ROLES = {"System Manager", "Administrator", "Guest"}
_NON_DATA = {"Section Break", "Column Break", "Tab Break", "HTML", "Heading", "Button", "Fold", "Image"}


def _access():
	"""``{role: can_write}`` for roles that can read Employee (from cached meta)."""
	out = {}
	for p in frappe.get_meta(TARGET_DOCTYPE).permissions:
		if p.read and not p.permlevel and p.role not in _SKIP_ROLES:
			out[p.role] = max(out.get(p.role, 0), 1 if p.write else 0)
	return out


@request_cache
def _flows():
	return _flow_pairs()  # a settings save computes the rows twice


def _employee_fields(ref, source, target):
	"""Employee fields holding the same data as Job Applicant field ``ref``."""
	src = source.get_field(ref)
	candidates = [_flows().get(ref), _NATIVE_PAIRS.get(ref), ref if src and src.get("is_custom_field") else None]
	out = []
	for fn in candidates:
		df = target.get_field(fn) if fn else None
		if df and df.fieldtype not in _NON_DATA and fn not in out:
			out.append(fn)
	return out


def desired_rows(settings_rows, with_status=False):
	"""``{(role, field): (read, write)}`` the settings call for on Employee."""
	restricted = [r for r in settings_rows if r.get("reference_name") and ALL not in parse_roles(r.get("profile_view_roles"))]
	if not restricted:
		return {}  # the usual case: no queries at all

	source, target = frappe.get_meta(SOURCE_DOCTYPE), frappe.get_meta(TARGET_DOCTYPE)
	access = _access()

	# Several settings rows can map to one Employee field; their roles combine.
	# "Everyone" is the untouched default, so it never cancels a restriction.
	allowed_by_field = {}
	for row in restricted:
		roles = {r for r in parse_roles(row.get("profile_view_roles")) if r not in _SKIP_ROLES}
		for field in _employee_fields(row.get("reference_name"), source, target):
			allowed_by_field.setdefault(field, set()).update(roles)

	rows = {}
	for field, allowed in allowed_by_field.items():
		for role in allowed:
			rows[(role, field)] = (1, access.get(role, 0))
		for role in access:
			if role not in allowed:
				rows[(role, field)] = (0, 0)

	# nextai makes `status` read-only on a managed doctype unless a row grants it.
	# Only for a record we created — an existing one already decides status.
	if rows and with_status and not any(f == "status" for _r, f in rows):
		for role, can_write in access.items():
			rows[(role, "status")] = (1, can_write)
	return rows


def _load_state(settings):
	try:
		state = json.loads(settings.get(STATE_FIELD) or "{}")
	except ValueError:
		state = {}
	rows = {(r, f): (rd, wr) for r, f, rd, wr in state.get("rows", [])}
	return state.get("record"), bool(state.get("created")), rows


def _submitted_record(name=None):
	filters = {"ref_doctype": TARGET_DOCTYPE, "docstatus": 1}
	if name:
		filters["name"] = name
	return frappe.db.get_value(PERMISSION_DOCTYPE, filters, "name")


def _get_record(name):
	"""(doc, is_new): the record synced last time, else an existing submitted one for
	Employee, else a new one."""
	existing = (name and _submitted_record(name)) or _submitted_record()
	if existing:
		return frappe.get_doc(PERMISSION_DOCTYPE, existing), False

	doc = frappe.new_doc(PERMISSION_DOCTYPE)
	doc.title = RECORD_TITLE
	if frappe.db.exists(PERMISSION_DOCTYPE, RECORD_TITLE):  # a draft / cancelled one holds the name
		doc.title = f"{RECORD_TITLE} (Profile View)"
	doc.ref_doctype = TARGET_DOCTYPE
	doc.description = "Maintained from Job Applicant Profile Settings → Profile View Permissions."
	return doc, True


def sync(settings):
	"""Bring the Employee DocType Permission rows in line with ``settings``.
	No queries and no writes when nothing changed."""
	fields = settings.get("default_application_fields") or []
	record_name, created, had = _load_state(settings)
	if record_name:
		want = desired_rows(fields, with_status=created)
		if want == had:
			return
	else:
		want = desired_rows(fields)
		if not want and not had:
			return

	record, is_new = _get_record(record_name)
	same_record = record.name == record_name
	created = is_new or (created and same_record)
	want = desired_rows(fields, with_status=created)
	owned = dict(had) if same_record else {}

	kept = []
	for row in record.get("field_permissions") or []:
		key = (row.role, row.field)
		if key in owned:
			if (row.read, row.write) != owned[key]:
				owned.pop(key)  # edited by hand since we wrote it — no longer ours
			elif key in want:
				row.read, row.write = want[key]
				owned[key] = want[key]
			else:
				owned.pop(key)
				continue
		kept.append(row)
	record.set("field_permissions", kept)

	present = {(r.role, r.field) for r in kept}
	for key, (read, write) in want.items():
		if key not in present:  # a hand-made row for the same role + field wins
			record.append("field_permissions", {"role": key[0], "field": key[1], "read": read, "write": write})
			owned[key] = (read, write)

	if is_new:
		if not want:
			return
		record.insert(ignore_permissions=True)
		record.submit()
	elif created and not record.field_permissions and not record.get("conditions"):
		# Our own record, now empty: any submitted record makes nextai lock `status`.
		record.flags.ignore_permissions = True
		record.cancel()
		frappe.delete_doc(PERMISSION_DOCTYPE, record.name, ignore_permissions=True, force=True)
		settings.db_set(STATE_FIELD, "", update_modified=False)
		return
	else:
		record.flags.ignore_validate_update_after_submit = True
		record.save(ignore_permissions=True)

	# Kept even with no rows owned, so a record we created is still known as ours.
	settings.db_set(
		STATE_FIELD,
		json.dumps({
			"record": record.name,
			"created": created,
			"rows": sorted([r, f, rd, wr] for (r, f), (rd, wr) in owned.items()),
		}),
		update_modified=False,
	)
