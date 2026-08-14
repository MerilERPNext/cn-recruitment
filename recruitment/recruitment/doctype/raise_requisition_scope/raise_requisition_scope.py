# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

"""Raise Requisition Scope
=========================

A (multi-record) settings doctype that governs **who** may raise Job
Requisitions and, optionally, **for what** they may raise them.

Per record:

* **Who may raise** — two OR-combined populations; a requester in *either* is
  admitted by this record:

    - ``allowed_roles`` — Roles held by the acting User.
    - ``employees_allowed_to_raise_requisitions`` — *User Assignments* of
      purpose ``People``, whose ``assigned_users`` child table materialises the
      concrete Employees each one resolves to.

* **Scope** — ``scope_of_raising_requisitions`` names User Assignments of
  purpose ``Attributes``. Each carries the values it permits for named fields of
  a Job Requisition — Company, Department, Designation, Location, or any other
  Link field. A requisition must satisfy them all.

  Company / Department / Designation used to be three further bases here, each
  with its own child doctype, "Scope by" checkbox, cascade validation and
  client-side JS. They are gone: the same restriction is now an attribute on an
  assignment, which is what makes scoping by a fourth field a configuration
  change rather than a release. See
  ``nextai.nextai.doctype.dynamic_user_assignment.attributes``.

Gate (first-match across records): a requester may raise if **any** record
admits them (Role or User Assignment) **and** they satisfy that same record's
scope.

**Deny by default.** There is no "unconfigured ⇒ everyone allowed" fallback: a
requester with no matching record is blocked. What keeps that from locking the
system out is the built-in :data:`DEFAULT_SCOPE_NAME` record — ``is_default``,
role ``System Manager``, no scope ⇒ System Managers may raise for anything. It is
created once — by ``patches.create_default_requisition_scope`` on existing sites
and by ``install.after_install`` on new ones — cannot be deleted, and cannot have
the System Manager role removed. Every other population needs its own record.

Two evaluation contexts:

* **Authoritative** (``before_insert`` on Job Requisition) — the requisition
  itself is passed in, so every attribute is evaluable and fully enforced.
* **Early / client** (``check_can_raise_requisition`` before the form opens) —
  the requisition's fields aren't filled yet, so an attribute the user could
  still satisfy is *deferred* (treated as allowed) and re-checked at insert. The
  Role check, the assignment membership and the allowed-population gate are
  always evaluable, so a user with no path at all is still blocked early.

Roles are matched on the **acting User** (an actor property) while assignments
are matched on the requester **Employee** — a Job Requisition's ``requested_by``
is an Employee link and ``Assigned Users`` stores ``employee_id``, so no
User⇄Employee round-trip is needed on the hot path. The split is what lets a
System Manager raise *on behalf of* another employee.

Cost
----
The gate sits on the Job Requisition insert path, so its query count is **flat
in the number of configured records**:

* 1 — the scope records themselves
* 2 — the two allowed-population child tables (roles, assignments)
* 0–1 — the scope's assignment child table, read only when some record ticks it
* 0–1 — Employee membership, resolved in one batch, lazily, and only for
  assignments in the *allowed population* — a role-only configuration never
  touches it
* 0–1 — every referenced assignment's attributes and match mode, in one batch,
  lazily

Measured on this site, counting only the gate's own queries (Frappe's session
and role cache primed, as in a real request):

===============================================  =======  =======
Scenario                                         Queries  Time
===============================================  =======  =======
Cold — first request after a config is edited          7  4.9 ms
Warm — every subsequent request                        2  1.2 ms
Ten requisitions inserted in **one** request           2  1.0 ms
Eight keystrokes = eight separate HTTP requests       16  11 ms
===============================================  =======  =======

The two warm queries are the requester's Employee lookup and the assignment
membership batch; both are skipped entirely on a role-only grant, which is the
path a System Manager on the built-in default record takes.

The configuration is cached in Redis across requests and invalidated precisely on
save. Configuration, membership, attributes *and* the Employee lookup are all
memoised per request, which is why ten sequential evaluations cost the same two
queries as one rather than twenty.

All reads go through ``frappe.qb`` rather than ``frappe.get_all`` — see
:func:`_grouped_child` for the two reasons, both of which are correctness
issues, not style.
"""

from collections import defaultdict, namedtuple

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.caching import request_cache

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	PURPOSE_ATTRIBUTES,
	PURPOSE_PEOPLE,
	AttributeIndex,
)

SCOPE_DOCTYPE = "Raise Requisition Scope"
# The document the scope's attributes are matched against. Attributes name
# fields on this doctype, so an administrator adding "Location" scoping is a
# configuration change here — no code ships.
REQUISITION_DOCTYPE = "Job Requisition"
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

# dimension key -> (child doctype, parentfield, link fieldname, "Scope by"
# checkbox fieldname).
#
# One basis remains. Company / Department / Designation used to be three more
# entries here, each with its own child doctype, checkbox, cascade rules and
# client-side JS; they are now expressed as *attributes* on the User Assignments
# this basis names, which is what makes scoping by a fourth field (Location,
# Branch, Grade) a configuration change instead of a release.
#
# A namedtuple rather than a bare tuple on purpose: this collapsed from five
# fields to four when the field-based bases were removed, and a positional
# ``dim[4]`` elsewhere kept parsing fine while raising IndexError at runtime —
# a 500 on the requisition gate. Named access cannot fail that way.
ScopeDimension = namedtuple(
	"ScopeDimension", ["child_doctype", "parentfield", "valuefield", "check_field"]
)

SCOPE_DIMENSIONS = {
	"User Assignment": ScopeDimension(
		child_doctype="Raise Requisition Scope Assignment",
		parentfield="scope_of_raising_requisitions",
		valuefield="user_assignment",
		check_field="scope_by_user_assignment",
	),
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

	def _validate_ticked_bases_have_values(self):
		"""A ticked basis with an empty selector restricts nothing, so it reads as
		"scoped" while behaving as organization-wide — the most dangerous kind of
		misconfiguration in a deny-by-default gate. ``mandatory_depends_on`` covers
		the Desk form; this covers API writes and imports."""
		for key, dim in SCOPE_DIMENSIONS.items():
			if self.get(dim.check_field) and not self.get(dim.parentfield):
				frappe.throw(
					_("Select at least one value for <b>{0}</b>, or untick <i>Scope by {0}</i>.").format(key),
					title=_("Scope Basis Has No Values"),
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
	for _key, dim in SCOPE_DIMENSIONS.items():
		doc.set(dim.check_field, 0)
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
	check_fields = [dim.check_field for dim in SCOPE_DIMENSIONS.values()]

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
	for key, dim in SCOPE_DIMENSIONS.items():
		if any(rec.get(dim.check_field) for rec in records):
			scope_values[key] = _grouped_child(dim.child_doctype, dim.parentfield, dim.valuefield, parents)
		else:
			scope_values[key] = {}

	configs = []
	for rec in records:
		# The bases ticked on this record (AND-combined at evaluation time).
		enabled = {
			key for key, dim in SCOPE_DIMENSIONS.items() if rec.get(dim.check_field)
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
		# The attribute index is lazy in the same way membership is: constructing
		# it reads nothing, so a role-only grant still resolves without ever
		# touching the attribute table.
		attributes = AttributeIndex(_scope_assignment_names(configs))
		data = (configs, _AssignmentMembership(configs), attributes)
		setattr(frappe.local, _REQUEST_CACHE_KEY, data)
	return data


def _scope_assignment_names(configs):
	"""Every User Assignment named by a *scope* selector across ``configs``.

	Only the scope selector — an assignment in the allowed-population table says
	who may raise, not what they may raise for, so its attributes are none of the
	scope's business.
	"""
	names = set()
	for c in configs:
		names.update(c["scope"].get("User Assignment") or [])
	return names


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
		# Only the *allowed population* assignments. The scope selector names
		# Attributes assignments, which resolve to nobody by design and are no
		# longer membership-tested (see _dimension_satisfied) — including them
		# here widened the IN list and, on a configuration whose populations are
		# all role-based, forced a query that could return nothing useful.
		names = set()
		for c in configs:
			names.update(c["allowed_names"])
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


@request_cache
def _employee_for_user(user):
	"""Employee ID linked to ``user`` (an Active Employee's ``user_id``), or None.

	Memoised for the request: the link pickers call the gate once per field per
	keystroke and a bulk insert calls it once per document, so without this the
	same lookup ran on every call — it was the single most repeated query on the
	whole path. Config and attributes were already memoised; this was the one
	that wasn't.

	Request scope is the right lifetime. Caching across requests would mean a
	newly linked Employee stays invisible to a security gate until a TTL expires,
	which is not a trade worth making for one indexed lookup.
	"""
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

	The one remaining basis, ``User Assignment``, no longer asks whether the
	requester is *in* those assignments. It used to: the field meant "the
	employees these assignments resolve to define the scope", so it ran a
	membership test.

	It now names **Attributes** assignments, which resolve to nobody on purpose
	(see ``_resolves_people`` in dynamic_user_assignment.py). Keeping the
	membership test turned every scoped record into a blanket denial — the
	requester could never be a member, so the basis always failed. What the
	assignments contribute is their attributes, checked separately in
	:func:`_scope_satisfied`.

	Who may raise is still gated, by ``employees_allowed_to_raise_requisitions``
	and ``allowed_roles``; that is the population question, and it belongs there.
	"""
	if not values:
		return True

	if dimension == "User Assignment":
		return True

	return True


def _scope_satisfied(config, employee, context, membership, attributes=None):
	"""Whether ``config``'s scope admits this requester.

	Two things are AND-combined:

	* the **people** side — the requester must be resolved by the scope's User
	  Assignments, when that basis is ticked;
	* the **value** side — the requisition's own fields must satisfy the
	  *attributes* those same assignments carry.

	Returns ``True`` when everything passes, ``False`` when anything fails, or
	``None`` when nothing fails but at least one attribute can't be evaluated yet
	(the requisition's field is still empty) — the caller treats ``None`` as
	"defer to submit". Nothing ticked ⇒ organization-wide ⇒ ``True``.
	"""
	results = [
		_dimension_satisfied(dim, config["scope"].get(dim, []), employee, context, membership)
		for dim in config["dims_enabled"]
	]

	if attributes is not None:
		scope_names = config["scope"].get("User Assignment") or []
		if scope_names:
			results.append(attributes.satisfied(scope_names, _attribute_context(context)))

	if any(r is False for r in results):
		return False
	if any(r is None for r in results):
		return None
	return True


def _attribute_context(context):
	"""Adapt the gate's context into something the attribute engine can read.

	The engine reads ``doc.get(fieldname)`` for whatever fields an assignment
	names, so it needs the requisition itself (or a dict standing in for it) plus
	a doctype to match rows against. ``None`` — the early check, before the form
	is filled — becomes an empty requisition, so every attribute defers instead
	of failing. That is what keeps the "check before opening the form" path from
	blocking someone who would pass once they choose a department."""
	if context is None:
		return {"doctype": REQUISITION_DOCTYPE}
	if getattr(context, "doctype", None):
		return context  # a real Job Requisition document
	return {"doctype": REQUISITION_DOCTYPE, **context}


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
	configs, membership, attributes = _cached_gate_data()

	matched_allowed = False
	deferred = False
	for c in configs:
		if not _admits(c, employee, user_roles, membership):
			continue
		matched_allowed = True
		satisfied = _scope_satisfied(c, employee, context, membership, attributes)
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
	# The requisition itself, not a three-key extract of it. The legacy bases
	# read `department` / `designation` / `company` off it exactly as before,
	# while an attribute naming any other field — a custom Location, Branch,
	# Grade — resolves without this function having to know it exists.
	allowed, reason = evaluate(employee, doc)
	if not allowed:
		frappe.throw(reason, title=_("Not Allowed to Raise Requisition"))


# ── Client-facing API ─────────────────────────────────────────────────────────


@frappe.whitelist()
def allowed_requisition_values(employee=None, user=None, company=None, department=None, designation=None, **chosen):
	"""Which values this requester may actually pick, per requisition field.

	Drives the link-field filters on the Raise Requisition form so the pickers
	only offer values that will pass the gate, instead of letting someone fill in
	a requisition and be rejected at save.

	Keyed by **fieldname on Job Requisition** — ``company``, ``department``,
	``designation``, and whatever else the tagged assignments restrict. The three
	named parameters are kept because existing callers pass them by name; any
	other field arrives through ``**chosen`` without a signature change here,
	which is the point of the attribute model.

	The answer is **context-aware**, not a flat union. A requester may be admitted
	by several records, and each assignment AND-combines its own fields — so
	offering the union would let them pair Company A (from one) with Department X
	(from another) and hit a dead end neither allows. Pass the form's current
	values in and re-call as they change.

	Returns, per field::

	    {"company": {"unrestricted": bool, "values": [...]}, "department": ...}

	A field absent from the result is restricted by nobody, so its picker stays
	open. ``unrestricted`` means some admitting record imposes no limit on that
	field. An empty ``values`` with ``unrestricted`` false means the requester may
	pick nothing, which :func:`check_can_raise_requisition` reports properly.
	"""
	if frappe.session.user == "Administrator":
		return {}  # unrestricted everywhere; no field needs a filter

	if not employee:
		employee = _employee_for_user(user or frappe.session.user)
	user_roles = set(frappe.get_roles(user or frappe.session.user))
	configs, membership, attributes = _cached_gate_data()

	chosen = {k: v for k, v in chosen.items() if v}
	chosen.update({"company": company, "department": department, "designation": designation})

	out = {}
	unrestricted_record = False

	for c in configs:
		if not _admits(c, employee, user_roles, membership):
			continue

		scope_names = c["scope"].get("User Assignment") or []

		# No membership test here, for the reason in _dimension_satisfied: these
		# are Attributes assignments and resolve to nobody, so testing membership
		# would drop every record and offer the requester nothing.
		allowance = attributes.allowed_values(scope_names, REQUISITION_DOCTYPE, chosen)
		if not allowance:
			# This record restricts no field at all, so it admits the requester
			# for every field. Applied below, once every field another record
			# restricts is known.
			unrestricted_record = True
			continue

		for field, detail in allowance.items():
			entry = out.setdefault(field, {"unrestricted": False, "values": set()})
			if detail["unrestricted"]:
				entry["unrestricted"] = True
			else:
				entry["values"].update(detail["values"])

	if unrestricted_record:
		for entry in out.values():
			entry["unrestricted"] = True

	return {
		f: {"unrestricted": v["unrestricted"], "values": sorted(v["values"])}
		for f, v in out.items()
	}


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


# ── Link queries for the two assignment pickers ───────────────────────────────
#
# The two child tables want *different* kinds of assignment, and offering the
# wrong kind is not a cosmetic slip. A People assignment in the scope table
# restricts no values; an Attributes assignment in the allowed-population table
# resolves to nobody, so it would grant nothing while looking like a grant.
# Filtering the pickers is what stops both mistakes being made in the first
# place, rather than explained afterwards in a validation message.


def _assignment_query(purpose, applicable_to, txt, start, page_len):
	"""Dynamic User Assignments of ``purpose``, optionally tagged for a process.

	``applicable_to`` matches against ``applicable_for_process``; assignments
	tagged for nothing are also returned, since an untagged assignment is
	conventionally "applies anywhere" and excluding it would hide legitimate
	configuration.
	"""
	like = f"%{txt or ''}%"
	params = {"purpose": purpose, "txt": like, "start": start, "page_len": page_len}

	process_clause = ""
	if applicable_to:
		params["process"] = applicable_to
		process_clause = """
			AND (
				NOT EXISTS (
					SELECT 1 FROM `tabGlobal Search DocType` any_gsd
					WHERE any_gsd.parent = dua.name
					  AND any_gsd.parenttype = 'Dynamic User Assignment'
				)
				OR EXISTS (
					SELECT 1 FROM `tabGlobal Search DocType` gsd
					WHERE gsd.parent = dua.name
					  AND gsd.parenttype = 'Dynamic User Assignment'
					  AND gsd.document_type = %(process)s
				)
			)
		"""

	return frappe.db.sql(
		f"""
		SELECT dua.name, dua.assignment_name
		FROM `tabDynamic User Assignment` dua
		WHERE IFNULL(dua.assignment_purpose, 'People') = %(purpose)s
		  AND (dua.name LIKE %(txt)s OR IFNULL(dua.assignment_name, '') LIKE %(txt)s)
		  {process_clause}
		ORDER BY dua.modified DESC
		LIMIT %(start)s, %(page_len)s
		""",
		params,
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def scope_assignment_query(doctype, txt, searchfield, start, page_len, filters):
	"""Picker for ``scope_of_raising_requisitions`` — Attributes assignments that
	are applicable to Job Requisition."""
	return _assignment_query(PURPOSE_ATTRIBUTES, REQUISITION_DOCTYPE, txt, start, page_len)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def population_assignment_query(doctype, txt, searchfield, start, page_len, filters):
	"""Picker for ``employees_allowed_to_raise_requisitions`` — People assignments,
	the only kind that resolves to anybody."""
	return _assignment_query(PURPOSE_PEOPLE, None, txt, start, page_len)
