# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Raise Requisition Scope
=========================

A (multi-record) settings doctype that governs **who** may raise Job
Requisitions and, optionally, **for what** they may raise them. Each record
mirrors one Darwin "row".

Per record:

* ``employees_allowed_to_raise_requisitions`` — the population allowed to raise
  requisitions under this record, via *User Assignments*
  (``Dynamic User Assignment``) whose ``assigned_users`` child table
  materialises the concrete Employees each assignment resolves to.

* **Scope By** — one *checkbox per basis* (``scope_by_user_assignment`` /
  ``scope_by_department`` / ``scope_by_designation`` / ``scope_by_company``).
  Tick one or more; each ticked basis reveals its selector, which supplies the
  allowed values:

    - User Assignment → ``scope_of_raising_requisitions`` (Employees in the
      resolved assignment population).
    - Department      → ``scope_departments`` (requisition's Department).
    - Designation     → ``scope_designations`` (requisition's Designation).
    - Company         → ``scope_companies`` (requisition's Company).

  A requisition must satisfy **all** ticked bases (AND). A ticked basis with an
  empty selector, or a basis left un-ticked, imposes no restriction. Tick nothing
  ⇒ *organization-wide* for that record.

Gate (first-match across records): an Employee may raise if **any** record
allows them (they are in that record's allowed population) **and** they satisfy
that same record's scope.

Feature switch: when **no record configures any allowed population**, the gate
imposes NO restriction — everyone may raise — so enabling the feature is an
explicit act and no existing flow breaks.

Two evaluation contexts:

* **Authoritative** (``before_insert`` on Job Requisition) — the requisition's
  Department / Designation / Company are known, so field-based scopes are fully
  enforced.
* **Early / client** (``check_can_raise_requisition`` before the form opens) —
  those values aren't known yet, so a field-based scope that the user could
  still satisfy is *deferred* (treated as allowed) and re-checked at submit. The
  User-Assignment scope and the allowed-population gate are always evaluable, so
  a user with no path at all is still blocked early.

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
ASSIGNED_USERS = "Assigned Users"
ALLOWED_FIELD = "employees_allowed_to_raise_requisitions"

# dimension key -> (child doctype, parentfield, link fieldname, requisition
# field, "Scope by" checkbox fieldname). requisition field is None for the
# User Assignment dimension (matched on the requester Employee, not a doc field).
SCOPE_DIMENSIONS = {
	"User Assignment": ("Raise Requisition Scope Assignment", "scope_of_raising_requisitions", "user_assignment", None, "scope_by_user_assignment"),
	"Department": ("Raise Requisition Scope Department", "scope_departments", "department", "department", "scope_by_department"),
	"Designation": ("Raise Requisition Scope Designation", "scope_designations", "designation", "designation", "scope_by_designation"),
	"Company": ("Raise Requisition Scope Company", "scope_companies", "company", "company", "scope_by_company"),
}


class RaiseRequisitionScope(Document):
	pass


# ── Resolution helpers ────────────────────────────────────────────────────────


def _grouped_child(child_dt, parentfield, valuefield, parents):
	"""``{parent: [value, ...]}`` for the given child table rows of ``parents``."""
	rows = frappe.get_all(
		child_dt,
		filters={
			"parenttype": SCOPE_DOCTYPE,
			"parentfield": parentfield,
			"parent": ["in", parents],
			valuefield: ["is", "set"],
		},
		fields=["parent", valuefield],
	)
	grouped = defaultdict(list)
	for r in rows:
		grouped[r.parent].append(r.get(valuefield))
	return grouped


def _load_configs():
	"""Every Raise Requisition Scope record (creation order — first-match wins) as
	a dict of its allowed population and its scope selector values.

	Reads each child table in bulk (one query each) rather than loading parent
	docs, so the gate stays cheap on the save path."""
	check_fields = [dim[4] for dim in SCOPE_DIMENSIONS.values()]
	records = frappe.get_all(
		SCOPE_DOCTYPE, fields=["name", *check_fields], order_by="creation asc"
	)
	if not records:
		return []

	parents = [r.name for r in records]
	allowed_by = _grouped_child(ALLOWED_CHILD, ALLOWED_FIELD, "user_assignment", parents)
	scope_values = {
		key: _grouped_child(child_dt, parentfield, valuefield, parents)
		for key, (child_dt, parentfield, valuefield, _reqfield, _check) in SCOPE_DIMENSIONS.items()
	}

	configs = []
	for rec in records:
		# The bases ticked on this record (AND-combined at evaluation time).
		enabled = {
			key
			for key, (_c, _pf, _vf, _rf, check_field) in SCOPE_DIMENSIONS.items()
			if rec.get(check_field)
		}
		configs.append(
			{
				"name": rec.name,
				"dims_enabled": enabled,
				"allowed_names": allowed_by.get(rec.name, []),
				# Per-dimension selector values, keyed by dimension.
				"scope": {key: grouped.get(rec.name, []) for key, grouped in scope_values.items()},
			}
		)
	return configs


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


# ── Scope evaluation ──────────────────────────────────────────────────────────


def _dimension_satisfied(dimension, values, employee, context):
	"""Single-basis check → ``True`` / ``False`` / ``None`` (deferred).

	An empty selector ⇒ organization-wide for that basis (no restriction)."""
	if not values:
		return True

	if dimension == "User Assignment":
		return employee in _resolve_assignment_employees(values)

	# Department / Designation / Company — match the requisition's own value.
	_child, _pf, _vf, reqfield, _check = SCOPE_DIMENSIONS[dimension]
	if context is None:
		return None  # not evaluable without the requisition context
	return context.get(reqfield) in values


def _scope_satisfied(config, employee, context):
	"""Whether ``config``'s scope admits this requester, AND-combining every
	ticked basis.

	Returns ``True`` when all ticked bases pass, ``False`` when any ticked basis
	fails, or ``None`` when no basis fails but at least one field-based basis
	can't be evaluated yet (no ``context``) — the caller treats ``None`` as
	"defer to submit". No bases ticked ⇒ organization-wide ⇒ ``True``."""
	results = [
		_dimension_satisfied(dim, config["scope"].get(dim, []), employee, context)
		for dim in config["dims_enabled"]
	]
	if any(r is False for r in results):
		return False
	if any(r is None for r in results):
		return None
	return True


def evaluate(employee, context=None):
	"""Return ``(allowed: bool, reason: str)`` for whether ``employee`` may raise
	a requisition under the current Raise Requisition Scope configuration.

	``context`` (a dict with ``department`` / ``designation`` / ``company``) is
	supplied at submit for full field-based scope enforcement; omit it for the
	early client check, where field-based scopes are deferred.

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
	deferred = False
	for c in configs:
		if not c["allowed_names"]:
			continue
		if employee not in _resolve_assignment_employees(c["allowed_names"]):
			continue
		matched_allowed = True
		satisfied = _scope_satisfied(c, employee, context)
		if satisfied is True:
			return True, ""
		if satisfied is None:
			# Field-based scope that could still pass once the requisition's
			# department/designation/company are known — allow the early check
			# through; the before_insert gate re-checks with full context.
			deferred = True

	if matched_allowed:
		if deferred:
			return True, ""
		return False, _(
			"You are outside the configured scope for raising requisitions. Contact "
			"your HR administrator to extend the Scope of Raising Requisitions."
		)

	return False, _(
		"You are not permitted to raise requisitions. This is restricted to "
		"employees configured under Raise Requisition Scope. Contact your HR "
		"administrator to be added."
	)


def can_employee_raise(employee, context=None):
	"""Boolean convenience wrapper over :func:`evaluate`."""
	allowed, _reason = evaluate(employee, context)
	return allowed


def enforce_can_raise(doc, method=None):
	"""``before_insert`` hook on Job Requisition — the authoritative gate.

	Resolves the requester Employee from ``requested_by`` (falling back to the
	session user's Employee) and enforces both the allowed population and the
	field-based scope (using the requisition's own Department / Designation /
	Company). Throws a clear message when disallowed. System Managers /
	Administrator bypass the gate so setup is never self-locked."""
	if frappe.flags.in_install or frappe.flags.in_migrate or frappe.flags.in_test:
		return
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return

	employee = getattr(doc, "requested_by", None) or _employee_for_user(frappe.session.user)
	context = {
		"department": getattr(doc, "department", None),
		"designation": getattr(doc, "designation", None),
		"company": getattr(doc, "company", None),
	}
	allowed, reason = evaluate(employee, context)
	if not allowed:
		frappe.throw(reason, title=_("Not Allowed to Raise Requisition"))


# ── Client-facing API ─────────────────────────────────────────────────────────


@frappe.whitelist()
def check_can_raise_requisition(employee=None, user=None, department=None, designation=None, company=None):
	"""Whitelisted gate check for Desk JS / React / ESS to call *before* opening
	the Raise Requisition form, so users see a clean popup instead of being
	blocked only at save.

	Resolves the Employee from ``employee`` → ``user``'s Employee → the session
	user's Employee. Requisition context (``department`` / ``designation`` /
	``company``) is optional — pass it if known for a stricter check; when
	omitted, field-based scopes are deferred to the authoritative submit gate.
	Returns::

	    {"allowed": bool, "reason": str, "employee": str | None}
	"""
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return {"allowed": True, "reason": "", "employee": employee}

	if not employee:
		employee = _employee_for_user(user or frappe.session.user)

	context = None
	if department or designation or company:
		context = {"department": department, "designation": designation, "company": company}

	allowed, reason = evaluate(employee, context)
	return {"allowed": allowed, "reason": reason, "employee": employee}
