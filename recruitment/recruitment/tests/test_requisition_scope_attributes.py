# Copyright (c) 2026, Recruitment and contributors
# See license.txt

"""Raise Requisition Scope ⇄ Assignment Attributes wiring.

These exercise the gate's own logic — ``_scope_satisfied``, ``_attribute_context``
and ``allowed_requisition_values`` — against real Dynamic User Assignments
carrying real attributes.

Configs are built by hand in the shape ``_query_configs`` returns rather than by
creating Raise Requisition Scope records. That is deliberate: raising is
deny-by-default and the built-in "Default - System Managers" record admits any
System Manager with no scope at all, so a test running as Administrator would be
allowed by that record before ever reaching the one under test. Driving
``_scope_satisfied`` directly tests the wiring without needing a throwaway
restricted user, and without leaving scope records on a shared dev site.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	AttributeIndex,
	clear_attribute_cache,
)
from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
	REQUISITION_DOCTYPE,
	SCOPE_DIMENSIONS,
	_attribute_context,
	_query_configs,
	_scope_satisfied,
	allowed_requisition_values,
	check_can_raise_requisition,
	clear_config_cache,
)

NO_MATCH = "__no_such_value__"


class _NoMembership:
	"""Stands in for ``_AssignmentMembership`` where the People axis is not
	what is under test. Never consulted unless a config ticks a basis."""

	def covers(self, names, employee):
		return True


class TestRequisitionScopeAttributes(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.branches = frappe.get_all("Branch", pluck="name", limit=2, order_by="name")
		cls.departments = frappe.get_all("Department", pluck="name", limit=2, order_by="name")

	def setUp(self):
		clear_attribute_cache()
		self._created = []

	def tearDown(self):
		for name in self._created:
			frappe.delete_doc(
				"Dynamic User Assignment", name, force=True, ignore_permissions=True
			)
		clear_attribute_cache()

	def _dua(self, rows):
		doc = frappe.new_doc("Dynamic User Assignment")
		doc.assignment_name = f"Test Scope {frappe.generate_hash(length=8)}"
		doc.assignment_code = doc.assignment_name
		doc.target_type = "Employee"
		doc.assignment_purpose = "Attributes"
		doc.validate_attribute_hierarchy = 0
		for scope_field, value in rows:
			doc.append(
				"assignment_attributes",
				{
					"scope_doctype": REQUISITION_DOCTYPE,
					"scope_field": scope_field,
					"attribute_value": value,
				},
			)
		doc.insert(ignore_permissions=True)
		self._created.append(doc.name)
		return doc

	def _config(self, assignment_names, dims_enabled=None, scope=None):
		"""A config in the shape ``_query_configs`` produces."""
		base_scope = {"User Assignment": assignment_names, "Department": [], "Designation": [], "Company": []}
		base_scope.update(scope or {})
		return {
			"name": "test-config",
			"dims_enabled": set(dims_enabled or []),
			"allowed_names": [],
			"allowed_roles": [],
			"scope": base_scope,
		}

	# -- attributes reaching the gate -------------------------------------

	def test_attribute_admits_matching_requisition(self):
		dua = self._dua([("department", self.departments[0])])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"department": self.departments[0]}, _NoMembership(), index
			),
			True,
		)

	def test_attribute_blocks_non_matching_requisition(self):
		dua = self._dua([("department", self.departments[0])])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(config, "EMP-X", {"department": NO_MATCH}, _NoMembership(), index),
			False,
		)

	def test_early_check_defers_instead_of_blocking(self):
		"""Before the form is filled there is no department to judge, so the gate
		must defer — the authoritative check runs again at insert. Blocking here
		would bounce every user off the form they are entitled to open."""
		dua = self._dua([("department", self.departments[0])])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		self.assertIsNone(_scope_satisfied(config, "EMP-X", None, _NoMembership(), index))

	def test_custom_field_scoping_needs_no_gate_change(self):
		"""The payoff: a field the gate has never heard of. ``custom_location``
		is not named anywhere in raise_requisition_scope.py."""
		dua = self._dua([("custom_location", self.branches[0])])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"custom_location": self.branches[0]}, _NoMembership(), index
			),
			True,
		)
		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"custom_location": self.branches[1]}, _NoMembership(), index
			),
			False,
		)

	def test_assignment_without_attributes_does_not_restrict(self):
		"""An assignment used purely to scope people must not narrow values."""
		dua = self._dua([])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(config, "EMP-X", {"department": NO_MATCH}, _NoMembership(), index),
			True,
		)

	def test_field_based_bases_are_gone(self):
		"""Company / Department / Designation are no longer bases on this doctype.

		They were three checkboxes, three child doctypes, a cascade validator and
		a client script; all of it is replaced by attributes on the assignments
		the remaining basis names. If any of it comes back, the two mechanisms
		would restrict the same thing in two places.
		"""
		self.assertEqual(set(SCOPE_DIMENSIONS), {"User Assignment"})

		meta = frappe.get_meta("Raise Requisition Scope")
		for fieldname in (
			"scope_by_company", "scope_companies",
			"scope_by_department", "scope_departments",
			"scope_by_designation", "scope_designations",
		):
			self.assertIsNone(meta.get_field(fieldname), f"{fieldname} should be removed")

	def test_attributes_are_the_only_value_restriction(self):
		"""With the field bases gone, a record's scope narrows values only through
		the attributes its assignments carry."""
		dua = self._dua([("department", self.departments[0])])
		config = self._config([dua.name], dims_enabled=["User Assignment"])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"department": self.departments[0]}, _NoMembership(), index
			),
			True,
		)
		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"department": self.departments[1]}, _NoMembership(), index
			),
			False,
		)

	# -- context adaptation ------------------------------------------------

	def test_attribute_context_from_a_real_requisition(self):
		doc = frappe.new_doc(REQUISITION_DOCTYPE)
		doc.department = self.departments[0]
		self.assertIs(_attribute_context(doc), doc)

	def test_attribute_context_from_a_dict_gets_a_doctype(self):
		context = _attribute_context({"department": self.departments[0]})
		self.assertEqual(context["doctype"], REQUISITION_DOCTYPE)
		self.assertEqual(context["department"], self.departments[0])

	def test_attribute_context_from_none_is_an_empty_requisition(self):
		context = _attribute_context(None)
		self.assertEqual(context, {"doctype": REQUISITION_DOCTYPE})

	def test_scope_assignments_are_not_membership_tested(self):
		"""The scope basis must not ask whether the requester is *in* its
		assignments.

		It used to, back when the field meant "the employees these assignments
		resolve to define the scope". It now names Attributes assignments, which
		resolve to nobody by design — so a membership test can never pass, and
		every scoped record turns into a blanket denial. That is what blocked a
		Hiring Manager who should have been allowed.
		"""

		class _NeverAMember:
			def covers(self, names, employee):
				return False

		dua = self._dua([("department", self.departments[0])])
		config = self._config([dua.name], dims_enabled=["User Assignment"])
		index = AttributeIndex([dua.name])

		# Membership says no to everything; the attribute still decides.
		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"department": self.departments[0]}, _NeverAMember(), index
			),
			True,
		)
		self.assertIs(
			_scope_satisfied(
				config, "EMP-X", {"department": self.departments[1]}, _NeverAMember(), index
			),
			False,
		)

	def test_config_loading_survives_the_real_schema(self):
		"""Load the configuration the way a request does, from the database.

		Every other test here hands ``_scope_satisfied`` a config built by hand,
		and both whitelisted entry points short-circuit for Administrator — so a
		``dim[4]`` left over from when SCOPE_DIMENSIONS held five-element tuples
		went unnoticed until it 500'd the requisition gate in the browser. This
		exercises the path that broke: read the records, read the child tables,
		build the configs.
		"""
		frappe.local.cache = {}
		clear_config_cache()

		configs = _query_configs()
		self.assertIsInstance(configs, list)
		for config in configs:
			self.assertIn("dims_enabled", config)
			self.assertIn("scope", config)
			self.assertLessEqual(config["dims_enabled"], set(SCOPE_DIMENSIONS))

	def test_gate_entry_points_run_for_a_non_administrator(self):
		"""The whitelisted API, as a real user rather than Administrator.

		Administrator returns early from both entry points, so a smoke test run
		as Administrator proves nothing about the code underneath. Running as an
		ordinary user is what actually reaches ``_cached_gate_data``.
		"""
		user = frappe.get_all(
			"User",
			filters={"enabled": 1, "name": ["not in", ("Administrator", "Guest")]},
			pluck="name",
			limit=1,
		)
		if not user:
			self.skipTest("no ordinary User on this site")

		clear_config_cache()
		original = frappe.session.user
		try:
			frappe.set_user(user[0])
			result = check_can_raise_requisition()
			self.assertIn("allowed", result)
			self.assertIn("reason", result)

			allowance = allowed_requisition_values()
			self.assertIsInstance(allowance, dict)
			for detail in allowance.values():
				self.assertIn("unrestricted", detail)
				self.assertIn("values", detail)
		finally:
			frappe.set_user(original)
			clear_config_cache()

	def test_scope_dimension_fields_are_named_not_positional(self):
		"""Positional access is what broke the gate; keep it unavailable."""
		dim = SCOPE_DIMENSIONS["User Assignment"]
		self.assertEqual(dim.check_field, "scope_by_user_assignment")
		self.assertEqual(dim.parentfield, "scope_of_raising_requisitions")
		self.assertEqual(dim.valuefield, "user_assignment")
		self.assertEqual(dim.child_doctype, "Raise Requisition Scope Assignment")

	def test_gate_reads_a_requisition_document_directly(self):
		"""enforce_can_raise passes the requisition itself, not an extract, so a
		custom field resolves without the gate knowing it exists."""
		dua = self._dua([("custom_location", self.branches[0])])
		config = self._config([dua.name])
		index = AttributeIndex([dua.name])

		doc = frappe.new_doc(REQUISITION_DOCTYPE)
		doc.custom_location = self.branches[0]
		self.assertIs(_scope_satisfied(config, "EMP-X", doc, _NoMembership(), index), True)

		doc.custom_location = self.branches[1]
		self.assertIs(_scope_satisfied(config, "EMP-X", doc, _NoMembership(), index), False)
