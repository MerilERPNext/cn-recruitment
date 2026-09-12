# Copyright (c) 2026, ChatNext and contributors
# For license information, please see license.txt

"""Role-list permissions for Job Applicant profile fields.

Stored as a JSON list of Roles in a Small Text column:

* ``profile_view_roles`` — Job Applicant Profile Settings only: who may see the
  field; written to Employee's DocType Permission by profile_permission_sync.
* ``visibility`` / ``editability`` (GENERAL) and ``preoffer_visibility`` /
  ``preoffer_edit_approve`` (PRE-OFFER RULES) — Job Opening only.

``["All"]`` (or an empty column) means everyone; ``[]`` means nobody. Real roles
replace the old Select words ("Hiring Team", "Recruiter Only"), which named no
role and so could never be checked. The old words are still understood here for
sites where ``migrate_application_field_role_permissions`` has not run yet.
"""

import json

import frappe
from frappe import _

# "Everyone" sentinel — deliberately not a real Role, so it can't be granted.
ALL = "All"

# Old Select word → equivalent role list. The two audience words had no role
# behind them and were never enforced, so they widen to everyone.
_LEGACY = {
	"All": [ALL],
	"Editable": [ALL],
	"Same as visibility": [ALL],
	"Approval Required": [ALL],
	"Hiring Team": [ALL],
	"Recruiter Only": [ALL],
	"Read Only": [],
	"Hidden": [],
}

PROFILE_PERMISSION_COLS = ("profile_view_roles",)
OPENING_RULE_COLS = (
	"visibility",
	"editability",
	"preoffer_visibility",
	"preoffer_edit_approve",
)
ROLE_LIST_COLS = PROFILE_PERMISSION_COLS + OPENING_RULE_COLS

# Roles every user holds implicitly — offering them would mean "everyone" under
# another name.
_IMPLICIT_ROLES = {"All", "Guest", "Administrator"}


def parse_roles(raw):
	"""Stored value → ``list[str]``. Never raises. Blank or unreadable means everyone:
	a blank is far likelier to predate the column than to mean "nobody"."""
	if raw is None or raw == "":
		return [ALL]
	if isinstance(raw, (list, tuple)):
		return [str(r) for r in raw if r]
	raw = str(raw).strip()
	if not raw:
		return [ALL]
	if raw in _LEGACY:
		return list(_LEGACY[raw])
	try:
		parsed = json.loads(raw)
	except (ValueError, TypeError):
		return [ALL]
	if not isinstance(parsed, list):
		return [ALL]
	return [str(r) for r in parsed if r]


def serialize_roles(roles):
	"""``list[str]`` → stored JSON. "All" absorbs any other role in the list."""
	if roles is None:
		roles = [ALL]
	if isinstance(roles, str):
		roles = parse_roles(roles)
	cleaned = []
	for r in roles:
		r = str(r).strip()
		if r and r not in cleaned:
			cleaned.append(r)
	if ALL in cleaned:
		return json.dumps([ALL])
	return json.dumps(cleaned)


def is_everyone(raw):
	return ALL in parse_roles(raw)


@frappe.whitelist()
def get_role_options():
	"""Enabled roles for the permission picker, alphabetical."""
	if not (
		frappe.has_permission("Job Opening", "write")
		or frappe.has_permission("Job Applicant Profile Settings", "write")
	):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	return [
		{"value": name, "label": name}
		for name in frappe.get_all(
			"Role", filters={"disabled": 0}, order_by="name asc", pluck="name", limit_page_length=0
		)
		if name not in _IMPLICIT_ROLES
	]
