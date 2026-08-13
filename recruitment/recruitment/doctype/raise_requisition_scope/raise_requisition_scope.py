# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Raise Requisition Scope
=========================

A (multi-record) settings doctype that governs **who** may raise Job
Requisitions and, optionally, **for what** they may raise them. Each record
mirrors one Darwin "row".

Per record:

* **Who may raise** — two OR-combined populations; a requester in *either* is
  admitted by this record:

    - ``allowed_roles`` — Roles held by the acting User.
    - ``employees_allowed_to_raise_requisitions`` — *User Assignments*
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

Gate (first-match across records): a requester may raise if **any** record
admits them (Role or User Assignment) **and** they satisfy that same record's
scope.

**Deny by default.** There is no "unconfigured ⇒ everyone allowed" fallback: a
requester with no matching record is blocked. What keeps that from locking the
system out is the built-in :data:`DEFAULT_SCOPE_NAME` record — ``is_default``,
role ``System Manager``, no scope bases ticked ⇒ System Managers may raise for
all companies, departments and designations. It is created once — by
``patches.create_default_requisition_scope`` on existing sites and by
``install.after_install`` on new ones — cannot be deleted, and cannot
have the System Manager role removed. Every other population needs its own
record.

Two evaluation contexts:

* **Authoritative** (``before_insert`` on Job Requisition) — the requisition's
  Department / Designation / Company are known, so field-based scopes are fully
  enforced.
* **Early / client** (``check_can_raise_requisition`` before the form opens) —
  those values aren't known yet, so a field-based scope that the user could
  still satisfy is *deferred* (treated as allowed) and re-checked at submit. The
  Role check, the User-Assignment scope and the allowed-population gate are
  always evaluable, so a user with no path at all is still blocked early.

Roles are matched on the **acting User** (an actor property) while assignments
are matched on the requester **Employee** — a Job Requisition's ``requested_by``
is an Employee link and ``Assigned Users`` stores ``employee_id``, so no
User⇄Employee round-trip is needed on the hot path. The split is what lets a
System Manager raise *on behalf of* another employee.

Cost
----
The gate sits on the Job Requisition insert path, so its query count is **flat
in the number of configured records** — adding scope records does not make
raising slower:

* 1 — the scope records themselves
* 2 — the two allowed-population child tables (roles, assignments)
* 0–4 — one per *ticked* scope basis; an un-ticked basis is never read
* 0–1 — all Dynamic User Assignments resolved in one batch, lazily

Measured on a real site: 3 queries when only the built-in default record exists
(allow *and* deny), 4 for a System Manager once an assignment-based record is
added (the role match short-circuits before any assignment lookup), and 5 for an
assignment-based grant. Configuration and membership are both memoised per
request, so ten sequential evaluations cost 5 queries in total rather than 50.

All reads go through ``frappe.qb`` rather than ``frappe.get_all`` — see
:func:`_grouped_child` for the two reasons, both of which are correctness
issues, not style.
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.model.document import Document

SCOPE_DOCTYPE = "Raise Requisition Scope"
ALLOWED_CHILD = "Raise Requisition Allowed Assignment"
ALLOWED_ROLE_CHILD = "Raise Requisition Allowed Role"
ASSIGNED_USERS = "Assigned Users"
ALLOWED_FIELD = "employees_allowed_to_raise_requisitions"
ALLOWED_ROLES_FIELD = "allowed_roles"

# The built-in configuration that keeps administrators from locking themselves
# out once raising became deny-by-default. Created by :func:`ensure_default_scope`.
DEFAULT_SCOPE_NAME = "Default - System Managers"
DEFAULT_SCOPE_ROLE = "System Manager"

# Attribute on frappe.local holding the request-scoped (configs, membership) pair.
_REQUEST_CACHE_KEY = "_raise_requisition_scope_gate_data"
# Redis key for the cross-request config cache, and the ceiling on how stale it
# can get if a record is edited outside the document hooks.
_CONFIG_CACHE_KEY = "raise_requisition_scope:configs"
_CONFIG_CACHE_TTL = 300

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
	def validate(self):
		"""A record that admits nobody is a no-op that silently misleads whoever
		created it — raising is deny-by-default, so an empty population grants
		nothing rather than everything."""
		if not self.get(ALLOWED_ROLES_FIELD) and not self.get(ALLOWED_FIELD):
			frappe.throw(
				_(
					"Add at least one Role or one User Assignment under <b>Who May Raise "
					"Requisitions</b>. A configuration with neither allows nobody to raise."
				),
				title=_("Nobody Configured"),
			)
		self._protect_default()
		self._validate_ticked_bases_have_values()
		self._validate_cascade()

	def _validate_ticked_bases_have_values(self):
		"""A ticked basis with an empty selector restricts nothing, so it reads as
		"scoped" while behaving as organization-wide — the most dangerous kind of
		misconfiguration in a deny-by-default gate. ``mandatory_depends_on`` covers
		the Desk form; this covers API writes and imports."""
		for key, (_c, parentfield, _vf, _rf, check_field) in SCOPE_DIMENSIONS.items():
			if self.get(check_field) and not self.get(parentfield):
				frappe.throw(
					_("Select at least one value for <b>{0}</b>, or untick <i>Scope by {0}</i>.").format(key),
					title=_("Scope Basis Has No Values"),
				)

	def _validate_cascade(self):
		"""Company → Department → Designation must be internally consistent.

		A Department from a company outside the Company scope (or a Designation
		outside the Department scope) can never match a real requisition, so the
		record would silently block everything it was meant to allow. Rejected up
		front instead.

		Deliberately lenient where the master data is silent: a Department or
		Designation whose own company/department link is unset is not evidence of
		a conflict, so it passes. Only a *contradicting* value is an error."""
		companies = [r.company for r in self.get("scope_companies") or [] if r.company]
		departments = [r.department for r in self.get("scope_departments") or [] if r.department]
		designations = [r.designation for r in self.get("scope_designations") or [] if r.designation]

		if self.get("scope_by_company") and self.get("scope_by_department") and companies and departments:
			self._reject_conflicts("Department", departments, "company", companies, "Company")

		if self.get("scope_by_designation") and designations:
			if self.get("scope_by_department") and departments:
				self._reject_conflicts("Designation", designations, "custom_department", departments, "Department")
			elif self.get("scope_by_company") and companies:
				self._reject_conflicts("Designation", designations, "custom_company", companies, "Company")

	def _reject_conflicts(self, doctype, names, link_field, allowed, parent_label):
		"""Throw when any of ``names`` links to something outside ``allowed``."""
		table = frappe.qb.DocType(doctype)
		link_col = table[link_field]
		bad = (
			frappe.qb.from_(table)
			.select(table.name)
			.where(
				table.name.isin(names)
				& link_col.notnull()
				& (link_col != "")
				& link_col.notin(allowed)
			)
		).run(pluck=True)
		if bad:
			frappe.throw(
				_("{0} {1} does not belong to the selected {2}. Remove it, or widen the {2} scope.").format(
					_(doctype), frappe.bold(", ".join(bad[:5]) + (" …" if len(bad) > 5 else "")), _(parent_label)
				),
				title=_("Scope Selections Conflict"),
			)

	def _protect_default(self):
		"""The default record must keep its System Manager grant — otherwise a
		single careless edit leaves nobody able to raise a requisition."""
		if not self.get("is_default"):
			return
		roles = [row.role for row in self.get(ALLOWED_ROLES_FIELD) or []]
		if DEFAULT_SCOPE_ROLE not in roles:
			frappe.throw(
				_("The {0} role cannot be removed from the default configuration {1}.").format(
					frappe.bold(DEFAULT_SCOPE_ROLE), frappe.bold(self.name)
				),
				title=_("Not Allowed"),
			)

	def on_update(self):
		clear_config_cache()

	def on_trash(self):
		if self.get("is_default"):
			frappe.throw(
				_(
					"{0} is the built-in configuration that lets System Managers raise "
					"requisitions and cannot be deleted. Edit its scope instead."
				).format(frappe.bold(self.name)),
				title=_("Not Allowed"),
			)
		clear_config_cache()


# ── Default record ────────────────────────────────────────────────────────────


def ensure_default_scope():
	"""Create (or repair) the built-in :data:`DEFAULT_SCOPE_NAME` record.

	Raising a requisition is deny-by-default: a user may raise only if some
	record admits them. This record is what stops that from locking the system
	out — role System Manager, no scope bases ticked, so System Managers may
	raise for all companies, departments and designations. Everyone else needs
	their own record.

	Called from two places, and it needs both:

	* ``recruitment.patches.create_default_requisition_scope`` — for sites that
	  already have the app installed.
	* ``install.after_install`` — because ``frappe.installer.install_app``
	  defaults to ``set_as_patched=True``, which writes a Patch Log row for every
	  patch *without running it*. A fresh install would otherwise never get the
	  record, and no one but Administrator could raise a requisition.

	Idempotent: it only fills in what is absent and never overwrites an
	administrator's edits to the record's scope.
	"""
	if not frappe.db.exists("DocType", SCOPE_DOCTYPE):
		return
	if not frappe.db.exists("Role", DEFAULT_SCOPE_ROLE):
		return

	if frappe.db.exists(SCOPE_DOCTYPE, DEFAULT_SCOPE_NAME):
		doc = frappe.get_doc(SCOPE_DOCTYPE, DEFAULT_SCOPE_NAME)
		# Repair only the two invariants the gate depends on; the scope selectors
		# are the administrator's to change.
		changed = False
		if not doc.is_default:
			doc.is_default = 1
			changed = True
		if DEFAULT_SCOPE_ROLE not in [row.role for row in doc.get(ALLOWED_ROLES_FIELD) or []]:
			doc.append(ALLOWED_ROLES_FIELD, {"role": DEFAULT_SCOPE_ROLE})
			changed = True
		if changed:
			doc.save(ignore_permissions=True)
		return

	doc = frappe.new_doc(SCOPE_DOCTYPE)
	doc.configuration_name = DEFAULT_SCOPE_NAME
	doc.is_default = 1
	doc.append(ALLOWED_ROLES_FIELD, {"role": DEFAULT_SCOPE_ROLE})
	# No basis ticked ⇒ organization-wide: all companies, all departments, all
	# designations. `scope_by_user_assignment` defaults to 1 on the doctype, so
	# clear it explicitly.
	for _key, (_c, _pf, _vf, _rf, check_field) in SCOPE_DIMENSIONS.items():
		doc.set(check_field, 0)
	doc.insert(ignore_permissions=True)


# ── Resolution helpers ────────────────────────────────────────────────────────


def _grouped_child(child_dt, parentfield, valuefield, parents):
	"""``{parent: [value, ...]}`` for the given child table rows of ``parents``.

	Deliberately uses the query builder rather than ``frappe.get_all``, for two
	independent reasons — do not convert it back:

	1. ``DatabaseQuery.set_optional_columns`` strips "optional" meta columns from
	   the SELECT using a naive *substring* test against
	   ``("_user_tags", "_comments", "_assign", "_liked_by", "_seen")`` — and
	   ``user_assignment`` contains ``_assign``. Child tables have no ``_assign``
	   column, so ``get_all`` silently drops the value column and every row comes
	   back with the field missing (``None``), which reads as "nobody is
	   configured" and blocks every requester.
	2. Reading child doctypes directly through ``get_all`` without a
	   ``parent_doctype`` is increasingly restricted across Frappe versions. The
	   query builder is stable on v15 and v16 and bypasses the permission layer
	   outright — which is what a security gate wants: a user must not be able to
	   hide a configuration from the gate by lacking read access to it.
	"""
	table = frappe.qb.DocType(child_dt)
	value_col = table[valuefield]
	rows = (
		frappe.qb.from_(table)
		.select(table.parent, value_col)
		.where(
			(table.parenttype == SCOPE_DOCTYPE)
			& (table.parentfield == parentfield)
			& (table.parent.isin(parents))
			& value_col.notnull()
			& (value_col != "")
		)
	).run(as_dict=True)

	grouped = defaultdict(list)
	for r in rows:
		grouped[r["parent"]].append(r[valuefield])
	return grouped


def _load_configs():
	""":func:`_query_configs`, cached in Redis across requests.

	The gate is no longer only on the save path: the link-field pickers on the
	Raise Requisition form re-evaluate scope on **every keystroke**, so the
	configuration was being re-read from the database several times per
	character typed. It changes only when an administrator edits a Raise
	Requisition Scope record, and :meth:`RaiseRequisitionScope.on_update` /
	``on_trash`` invalidate it precisely, so caching is safe.

	``_CONFIG_CACHE_TTL`` is a safety net, not the invalidation mechanism — it
	bounds staleness if a record is ever changed by something that bypasses the
	document hooks (a direct SQL edit, a restore).

	Sets are converted to lists for storage and rebuilt on read, so the cached
	payload stays plainly serialisable rather than depending on the cache
	backend's pickling behaviour.
	"""
	# `expires=True` because this key is written with a TTL. Without it,
	# RedisWrapper.get_value memoises the *miss* into frappe.local.cache, while
	# set_value with an expiry deliberately does not update that local copy — so
	# every later read in the same process keeps returning the stale None.
	cached = frappe.cache.get_value(_CONFIG_CACHE_KEY, expires=True)
	if cached is not None:
		return [{**c, "dims_enabled": set(c["dims_enabled"])} for c in cached]

	configs = _query_configs()
	frappe.cache.set_value(
		_CONFIG_CACHE_KEY,
		[{**c, "dims_enabled": sorted(c["dims_enabled"])} for c in configs],
		expires_in_sec=_CONFIG_CACHE_TTL,
	)
	return configs


def _query_configs():
	"""Every Raise Requisition Scope record (creation order — first-match wins) as
	a dict of its allowed populations and its scope selector values.

	Reads each child table in bulk rather than loading parent docs, so the gate
	stays cheap on the save path. Cost is **flat in the number of configured
	records**: one query for the records, one each for the two allowed-population
	tables, and one per *ticked* scope basis — an un-ticked basis is never
	queried, since its values could not affect the outcome. Assignment membership
	is resolved separately and lazily (see :class:`_AssignmentMembership`).
	"""
	check_fields = [dim[4] for dim in SCOPE_DIMENSIONS.values()]

	# The parent table is read with the query builder too. `get_all` would work
	# here only by accident: `scope_by_user_assignment` also contains `_assign`,
	# and survives the substring strip purely because parent tables *do* have an
	# `_assign` column. Not a property worth depending on.
	scope_table = frappe.qb.DocType(SCOPE_DOCTYPE)
	records = (
		frappe.qb.from_(scope_table)
		.select(scope_table.name, *[scope_table[f] for f in check_fields])
		.orderby(scope_table.creation)
	).run(as_dict=True)
	if not records:
		return []

	parents = [r["name"] for r in records]
	allowed_by = _grouped_child(ALLOWED_CHILD, ALLOWED_FIELD, "user_assignment", parents)
	roles_by = _grouped_child(ALLOWED_ROLE_CHILD, ALLOWED_ROLES_FIELD, "role", parents)

	# Only read the child table of a basis some record actually ticks. A basis
	# nobody ticked imposes no restriction anywhere, so its values are dead
	# weight — this is what keeps the common single-basis setup at one query
	# instead of four.
	scope_values = {}
	for key, (child_dt, parentfield, valuefield, _reqfield, check_field) in SCOPE_DIMENSIONS.items():
		if any(rec.get(check_field) for rec in records):
			scope_values[key] = _grouped_child(child_dt, parentfield, valuefield, parents)
		else:
			scope_values[key] = {}

	configs = []
	for rec in records:
		# The bases ticked on this record (AND-combined at evaluation time).
		enabled = {
			key
			for key, (_c, _pf, _vf, _rf, check_field) in SCOPE_DIMENSIONS.items()
			if rec.get(check_field)
		}
		name = rec["name"]
		configs.append(
			{
				"name": name,
				"dims_enabled": enabled,
				"allowed_names": allowed_by.get(name, []),
				"allowed_roles": roles_by.get(name, []),
				# Per-dimension selector values, keyed by dimension.
				"scope": {key: grouped.get(name, []) for key, grouped in scope_values.items()},
			}
		)
	return configs


def _cached_gate_data():
	"""``(configs, membership)`` memoised for the life of the request.

	``evaluate`` is normally called once per request, but a bulk insert (a data
	import, a scripted loop creating many requisitions) runs the gate once per
	document — without this the same unchanging configuration, and the same
	assignment membership, would be re-read for every row. Caching both together
	makes a bulk insert cost one lookup in total rather than one per document.

	Invalidated by :meth:`RaiseRequisitionScope.on_update` / ``on_trash`` so an
	administrator editing a record in one request still sees the change take
	effect immediately. Membership is a snapshot taken on first use within the
	request; a Dynamic User Assignment changing mid-request is not picked up
	until the next one, which is the same guarantee any single evaluation
	already had."""
	data = getattr(frappe.local, _REQUEST_CACHE_KEY, None)
	if data is None:
		configs = _load_configs()
		data = (configs, _AssignmentMembership(configs))
		setattr(frappe.local, _REQUEST_CACHE_KEY, data)
	return data


def clear_config_cache():
	"""Drop both cache layers — the request-scoped ``(configs, membership)`` pair
	and the cross-request Redis copy of the configuration."""
	if hasattr(frappe.local, _REQUEST_CACHE_KEY):
		delattr(frappe.local, _REQUEST_CACHE_KEY)
	frappe.cache.delete_value(_CONFIG_CACHE_KEY)


class _AssignmentMembership:
	"""Batched, lazy Employee membership for Dynamic User Assignments.

	Every assignment referenced anywhere in the loaded configs is resolved in a
	**single** query, on first use. This matters because the same assignment is
	consulted twice per record — once for the allowed population and again for
	the User-Assignment scope basis — so the naive form issued up to two queries
	per configured record on the requisition save path. Resolution is skipped
	entirely when nothing needs it, which is the common role-only case (a System
	Manager hitting the built-in default record never touches this table)."""

	def __init__(self, configs):
		names = set()
		for c in configs:
			names.update(c["allowed_names"])
			names.update(c["scope"].get("User Assignment") or [])
		self._names = names
		self._by_assignment = None

	def _load(self):
		self._by_assignment = defaultdict(set)
		if not self._names:
			return
		table = frappe.qb.DocType(ASSIGNED_USERS)
		rows = (
			frappe.qb.from_(table)
			.select(table.parent, table.employee_id)
			.where(
				(table.parenttype == "Dynamic User Assignment")
				& (table.parentfield == "assigned_users")
				& (table.parent.isin(list(self._names)))
				& table.employee_id.notnull()
				& (table.employee_id != "")
			)
		).run(as_dict=True)
		for r in rows:
			self._by_assignment[r["parent"]].add(r["employee_id"])

	def covers(self, assignment_names, employee):
		"""Whether ``employee`` is resolved by any of ``assignment_names``."""
		if not employee or not assignment_names:
			return False
		if self._by_assignment is None:
			self._load()
		return any(employee in self._by_assignment.get(n, ()) for n in assignment_names)


def _employee_for_user(user):
	"""Employee ID linked to ``user`` (an Active Employee's ``user_id``), or None."""
	if not user or user == "Administrator":
		return None
	return frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")


def _admits(config, employee, user_roles, membership):
	"""Whether ``config``'s *who may raise* population covers this requester.

	Role (on the acting User) OR User Assignment (on the requester Employee).
	The role test is checked first because it costs nothing — it never touches
	the database, so a role-only grant short-circuits before any assignment
	membership is resolved."""
	if config["allowed_roles"] and user_roles.intersection(config["allowed_roles"]):
		return True
	return membership.covers(config["allowed_names"], employee)


# ── Scope evaluation ──────────────────────────────────────────────────────────


def _dimension_satisfied(dimension, values, employee, context, membership):
	"""Single-basis check → ``True`` / ``False`` / ``None`` (deferred).

	An empty selector ⇒ organization-wide for that basis (no restriction)."""
	if not values:
		return True

	if dimension == "User Assignment":
		return membership.covers(values, employee)

	# Department / Designation / Company — match the requisition's own value.
	_child, _pf, _vf, reqfield, _check = SCOPE_DIMENSIONS[dimension]
	if context is None:
		return None  # not evaluable without the requisition context
	return context.get(reqfield) in values


def _scope_satisfied(config, employee, context, membership):
	"""Whether ``config``'s scope admits this requester, AND-combining every
	ticked basis.

	Returns ``True`` when all ticked bases pass, ``False`` when any ticked basis
	fails, or ``None`` when no basis fails but at least one field-based basis
	can't be evaluated yet (no ``context``) — the caller treats ``None`` as
	"defer to submit". No bases ticked ⇒ organization-wide ⇒ ``True``."""
	results = [
		_dimension_satisfied(dim, config["scope"].get(dim, []), employee, context, membership)
		for dim in config["dims_enabled"]
	]
	if any(r is False for r in results):
		return False
	if any(r is None for r in results):
		return None
	return True


def evaluate(employee, context=None, user=None):
	"""Return ``(allowed: bool, reason: str)`` for whether this requester may
	raise a requisition under the current Raise Requisition Scope configuration.

	``employee`` is the requester (a Job Requisition's ``requested_by``) and is
	matched against User Assignment populations; ``user`` (defaulting to the
	session user) is the actor whose Roles are matched. Either may admit.

	``context`` (a dict with ``department`` / ``designation`` / ``company``) is
	supplied at submit for full field-based scope enforcement; omit it for the
	early client check, where field-based scopes are deferred.

	Denies when nothing matches — there is no unconfigured-means-allowed
	fallback. ``reason`` is a user-facing message when blocked, empty when
	allowed."""
	user_roles = set(frappe.get_roles(user or frappe.session.user))
	configs, membership = _cached_gate_data()

	matched_allowed = False
	deferred = False
	for c in configs:
		if not _admits(c, employee, user_roles, membership):
			continue
		matched_allowed = True
		satisfied = _scope_satisfied(c, employee, context, membership)
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

	if not employee:
		return False, _(
			"Raising requisitions is restricted to configured roles and employees, and "
			"your account isn't linked to an eligible Employee. Contact your HR "
			"administrator."
		)

	return False, _(
		"You are not permitted to raise requisitions. This is restricted to the roles "
		"and employees configured under Raise Requisition Scope. Contact your HR "
		"administrator to be added."
	)


def can_employee_raise(employee, context=None, user=None):
	"""Boolean convenience wrapper over :func:`evaluate`."""
	allowed, _reason = evaluate(employee, context, user)
	return allowed


def enforce_can_raise(doc, method=None):
	"""``before_insert`` hook on Job Requisition — the authoritative gate.

	Resolves the requester Employee from ``requested_by`` (falling back to the
	session user's Employee) and enforces both the allowed population and the
	field-based scope (using the requisition's own Department / Designation /
	Company). Throws a clear message when disallowed.

	Only Administrator bypasses outright. System Managers pass through the
	regular gate via the built-in :data:`DEFAULT_SCOPE_NAME` record, so the
	configuration stays the single source of truth."""
	if frappe.flags.in_install or frappe.flags.in_migrate or frappe.flags.in_test:
		return
	if frappe.session.user == "Administrator":
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
def allowed_requisition_values(employee=None, user=None, company=None, department=None, designation=None):
	"""Which Company / Department / Designation this requester may actually pick.

	Drives the link-field filters on the Raise Requisition form so the pickers
	only offer values that will pass the gate, instead of letting someone fill in
	a requisition and be rejected at save.

	The answer is **context-aware**, not a flat union. A requester may be admitted
	by several records, and each record AND-combines its own bases — so offering
	the union of all records would let them pair Company A (from record 1) with
	Department X (from record 2) and hit a dead end no record allows. Instead a
	record only contributes values for a field when every *other* field basis it
	ticks is compatible with what has already been chosen. Pass the current form
	values in and re-call as they change.

	Returns, per field::

	    {"company": {"unrestricted": bool, "values": [...]}, "department": ..., ...}

	``unrestricted`` means some admitting record imposes no limit on that field,
	so the picker should show everything. An empty ``values`` with
	``unrestricted`` false means the requester may pick nothing — they cannot
	raise at all, which :func:`check_can_raise_requisition` reports properly.
	"""
	# field name on Job Requisition -> scope dimension key
	field_dim = {
		reqfield: key
		for key, (_c, _pf, _vf, reqfield, _ck) in SCOPE_DIMENSIONS.items()
		if reqfield
	}

	if frappe.session.user == "Administrator":
		return {f: {"unrestricted": True, "values": []} for f in field_dim}

	if not employee:
		employee = _employee_for_user(user or frappe.session.user)
	user_roles = set(frappe.get_roles(user or frappe.session.user))
	configs, membership = _cached_gate_data()

	chosen = {"company": company, "department": department, "designation": designation}
	out = {f: {"unrestricted": False, "values": set()} for f in field_dim}

	for c in configs:
		if not _admits(c, employee, user_roles, membership):
			continue
		# The User-Assignment basis is fully evaluable now, so a record it rules
		# out must not contribute values.
		if "User Assignment" in c["dims_enabled"]:
			ua_values = c["scope"].get("User Assignment") or []
			if ua_values and not membership.covers(ua_values, employee):
				continue

		for field, dim in field_dim.items():
			if not _other_bases_compatible(c, field, field_dim, chosen):
				continue
			values = c["scope"].get(dim) or []
			if dim not in c["dims_enabled"] or not values:
				out[field]["unrestricted"] = True
			else:
				out[field]["values"].update(values)

	return {
		f: {"unrestricted": v["unrestricted"], "values": sorted(v["values"])}
		for f, v in out.items()
	}


def _other_bases_compatible(config, field, field_dim, chosen):
	"""Whether ``config`` can still apply given the values already chosen for the
	fields *other* than ``field`` — a record whose Company basis excludes the
	company already picked must not offer its Departments."""
	for other_field, other_dim in field_dim.items():
		if other_field == field or other_dim not in config["dims_enabled"]:
			continue
		values = config["scope"].get(other_dim) or []
		picked = chosen.get(other_field)
		if values and picked and picked not in values:
			return False
	return True


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
	if frappe.session.user == "Administrator":
		return {"allowed": True, "reason": "", "employee": employee}

	if not employee:
		employee = _employee_for_user(user or frappe.session.user)

	context = None
	if department or designation or company:
		context = {"department": department, "designation": designation, "company": company}

	allowed, reason = evaluate(employee, context)
	return {"allowed": allowed, "reason": reason, "employee": employee}
