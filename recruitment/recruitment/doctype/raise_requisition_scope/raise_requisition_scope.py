# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Raise Requisition Scope
=========================

A (multi-record) settings doctype that governs **who** may raise Job
Requisitions. Each record mirrors one Darwin "row": it pairs a group of
Employees with a scope, both expressed through *User Assignments*
(``Dynamic User Assignment``) whose ``assigned_users`` child table materialises
the concrete Employees / Users each assignment resolves to.

Per record:

* ``employees_allowed_to_raise_requisitions`` — the population allowed to raise
  requisitions under this record.
* ``scope_of_raising_requisitions`` — the department / hierarchy scope within
  which those users may raise. Empty ⇒ organization-wide for that record.

Across records the gate is a first-match: an Employee may raise if **any** record
allows them (they are in that record's allowed population) **and** they satisfy
that same record's scope (or the record has no scope ⇒ org-wide).

Feature switch: when **no record configures any allowed population** (no records,
or none list any Employees Allowed assignment), the gate imposes NO restriction —
everyone may raise — so enabling the feature is an explicit act and no existing
flow breaks.

The gate keys on the **Employee** because a Job Requisition's ``requested_by``
is an Employee link and ``Assigned Users`` stores ``employee_id`` — so no
User⇄Employee round-trip is needed on the hot path.
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.model.document import Document

SCOPE_DOCTYPE = "Raise Requisition Scope"
ALLOWED_CHILD = "Raise Requisition Allowed Assignment"
SCOPE_CHILD = "Raise Requisition Scope Assignment"
ASSIGNED_USERS = "Assigned Users"
ALLOWED_FIELD = "employees_allowed_to_raise_requisitions"
SCOPE_FIELD = "scope_of_raising_requisitions"


class RaiseRequisitionScope(Document):
	pass


# ── Resolution helpers ────────────────────────────────────────────────────────


def _load_configs():
	"""Return every Raise Requisition Scope record (creation order — first-match
	wins) as ``{"name", "allowed_names": [...], "scope_names": [...]}``.

	Reads the two Table MultiSelect child tables in bulk (one query each) rather
	than loading each parent doc, so the gate stays cheap on the save path."""
	records = frappe.get_all(SCOPE_DOCTYPE, pluck="name", order_by="creation asc")
	if not records:
		return []

	def _grouped(child_dt, parentfield):
		rows = frappe.get_all(
			child_dt,
			filters={
				"parenttype": SCOPE_DOCTYPE,
				"parentfield": parentfield,
				"parent": ["in", records],
				"user_assignment": ["is", "set"],
			},
			fields=["parent", "user_assignment"],
		)
		grouped = defaultdict(list)
		for r in rows:
			grouped[r.parent].append(r.user_assignment)
		return grouped

	allowed_by = _grouped(ALLOWED_CHILD, ALLOWED_FIELD)
	scope_by = _grouped(SCOPE_CHILD, SCOPE_FIELD)

	return [
		{
			"name": name,
			"allowed_names": allowed_by.get(name, []),
			"scope_names": scope_by.get(name, []),
		}
		for name in records
	]


def _resolve_assignment_employees(assignment_names):
	"""Set of Employee IDs resolved by the given Dynamic User Assignments, read
	from their materialised ``assigned_users`` child rows. Empty set when the
	input is empty or nothing resolves."""
	if not assignment_names:
		return set()
	return set(
		frappe.get_all(
			ASSIGNED_USERS,
			filters={
				"parenttype": "Dynamic User Assignment",
				"parentfield": "assigned_users",
				"parent": ["in", list(assignment_names)],
				"employee_id": ["is", "set"],
			},
			pluck="employee_id",
		)
	)


def _employee_for_user(user):
	"""Employee ID linked to ``user`` (an Active Employee's ``user_id``), or None."""
	if not user or user == "Administrator":
		return None
	return frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")


# ── Gate ──────────────────────────────────────────────────────────────────────


def evaluate(employee):
	"""Return ``(allowed: bool, reason: str)`` for whether ``employee`` may raise
	a requisition under the current Raise Requisition Scope configuration.

	``reason`` is a user-facing message when blocked, empty when allowed."""
	configs = _load_configs()

	# Feature off — no record configures an allowed population ⇒ everyone allowed.
	if not any(c["allowed_names"] for c in configs):
		return True, ""

	if not employee:
		return False, _(
			"Raising requisitions is restricted to configured employees, and your "
			"account isn't linked to an eligible Employee. Contact your HR administrator."
		)

	matched_allowed = False
	for c in configs:
		if not c["allowed_names"]:
			continue
		if employee not in _resolve_assignment_employees(c["allowed_names"]):
			continue
		matched_allowed = True
		# This record allows the employee — now check its scope (first match wins).
		if not c["scope_names"]:
			return True, ""  # org-wide scope for this record
		if employee in _resolve_assignment_employees(c["scope_names"]):
			return True, ""
		# Allowed here but outside this record's scope — keep trying other records.

	if matched_allowed:
		return False, _(
			"You are outside the configured scope for raising requisitions. Contact "
			"your HR administrator to extend the Scope of Raising Requisitions."
		)

	return False, _(
		"You are not permitted to raise requisitions. This is restricted to "
		"employees configured under Raise Requisition Scope. Contact your HR "
		"administrator to be added."
	)


def can_employee_raise(employee):
	"""Boolean convenience wrapper over :func:`evaluate`."""
	allowed, _reason = evaluate(employee)
	return allowed


def enforce_can_raise(doc, method=None):
	"""``before_insert`` hook on Job Requisition — the authoritative gate.

	Resolves the requester Employee from ``requested_by`` (falling back to the
	session user's Employee) and throws a clear message when the scope disallows
	them. System Managers / Administrator bypass the gate so setup is never
	self-locked."""
	if frappe.flags.in_install or frappe.flags.in_migrate or frappe.flags.in_test:
		return
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return

	employee = getattr(doc, "requested_by", None) or _employee_for_user(frappe.session.user)
	allowed, reason = evaluate(employee)
	if not allowed:
		frappe.throw(reason, title=_("Not Allowed to Raise Requisition"))


# ── Client-facing API ─────────────────────────────────────────────────────────


@frappe.whitelist()
def check_can_raise_requisition(employee=None, user=None):
	"""Whitelisted gate check for Desk JS / React / ESS to call *before* opening
	the Raise Requisition form, so users see a clean popup instead of being
	blocked only at save.

	Resolves the Employee from ``employee`` → ``user``'s Employee → the session
	user's Employee, then returns::

	    {"allowed": bool, "reason": str, "employee": str | None}
	"""
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return {"allowed": True, "reason": "", "employee": employee}

	if not employee:
		employee = _employee_for_user(user or frappe.session.user)

	allowed, reason = evaluate(employee)
	return {"allowed": allowed, "reason": reason, "employee": employee}
