# Copyright (c) 2026, Recruitment and contributors
# See license.txt

"""Raise Requisition Scope ⇄ Assignment Attributes wiring.

These exercise the gate's own logic — ``_scope_satisfied``, ``_attribute_context``
and ``allowed_requisition_values`` — against real Dynamic User Assignments
carrying real attributes.

Most configs are built by hand in the shape ``_query_configs`` returns rather than
by creating Raise Requisition Scope records: raising is deny-by-default and the
built-in "Default - System Managers" record admits any System Manager with no
scope at all, so a test running as Administrator would be allowed by that record
before ever reaching the one under test.

``TestGateEntryPoints`` deliberately does *not* take that shortcut — it loads the
configuration from the database and runs the whitelisted endpoints as an ordinary
user, because both of those paths hid real bugs that the hand-built configs could
not see.
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
	"""Stands in for ``_AssignmentMembership`` where the People axis is not what
	is under test."""

	def covers(self, names, employee):
		return True


class ScopeTestBase(FrappeTestCase):
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

	def _config(self, assignment_names, dims_enabled=None):
		"""A config in the shape ``_query_configs`` produces."""
		return {
			"name": "test-config",
			"dims_enabled": set(dims_enabled or []),
			"allowed_names": [],
			"allowed_roles": [],
			"scope": {"User Assignment": assignment_names},
		}


class TestAttributesReachTheGate(ScopeTestBase):
	def test_attribute_admits_matching_requisition(self):
		dua = self._dua([("department", self.departments[0])])
		index = AttributeIndex([dua.name])
		self.assertIs(
			_scope_satisfied(
				self._config([dua.name]), "EMP-X",
				{"department": self.departments[0]}, _NoMembership(), index,
			),
			True,
		)

	def test_attribute_blocks_non_matching_requisition(self):
		dua = self._dua([("department", self.departments[0])])
		index = AttributeIndex([dua.name])
		self.assertIs(
			_scope_satisfied(
				self._config([dua.name]), "EMP-X",
				{"department": NO_MATCH}, _NoMembership(), index,
			),
			False,
		)

	def test_early_check_defers_instead_of_blocking(self):
		"""Before the form is filled there is no department to judge, so the gate
		must defer — the authoritative check runs again at insert. Blocking here
		would bounce every user off a form they are entitled to open."""
		dua = self._dua([("department", self.departments[0])])
		index = AttributeIndex([dua.name])
		self.assertIsNone(
			_scope_satisfied(self._config([dua.name]), "EMP-X", None, _NoMembership(), index)
		)

	def test_custom_field_scoping_needs_no_gate_change(self):
		"""The payoff: ``custom_location`` is not named anywhere in the gate."""
		dua = self._dua([("custom_location", self.branches[0])])
		index = AttributeIndex([dua.name])
		cfg = self._config([dua.name])
		self.assertIs(
			_scope_satisfied(cfg, "EMP-X", {"custom_location": self.branches[0]}, _NoMembership(), index),
			True,
		)
		self.assertIs(
			_scope_satisfied(cfg, "EMP-X", {"custom_location": self.branches[1]}, _NoMembership(), index),
			False,
		)

	def test_assignment_without_attributes_does_not_restrict(self):
		dua = self._dua([])
		index = AttributeIndex([dua.name])
		self.assertIs(
			_scope_satisfied(
				self._config([dua.name]), "EMP-X", {"department": NO_MATCH}, _NoMembership(), index
			),
			True,
		)

	def test_gate_reads_a_requisition_document_directly(self):
		"""enforce_can_raise passes the requisition itself, not an extract, so a
		custom field resolves without the gate knowing it exists."""
		dua = self._dua([("custom_location", self.branches[0])])
		index = AttributeIndex([dua.name])
		cfg = self._config([dua.name])

		doc = frappe.new_doc(REQUISITION_DOCTYPE)
		doc.custom_location = self.branches[0]
		self.assertIs(_scope_satisfied(cfg, "EMP-X", doc, _NoMembership(), index), True)

		doc.custom_location = self.branches[1]
		self.assertIs(_scope_satisfied(cfg, "EMP-X", doc, _NoMembership(), index), False)

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
		cfg = self._config([dua.name], dims_enabled=["User Assignment"])
		index = AttributeIndex([dua.name])

		self.assertIs(
			_scope_satisfied(cfg, "EMP-X", {"department": self.departments[0]}, _NeverAMember(), index),
			True,
		)
		self.assertIs(
			_scope_satisfied(cfg, "EMP-X", {"department": self.departments[1]}, _NeverAMember(), index),
			False,
		)


class TestFieldBasesRemoved(FrappeTestCase):
	def test_field_based_bases_are_gone(self):
		"""Company / Department / Designation are no longer bases on this doctype.

		They were three checkboxes, three child doctypes, a cascade validator and
		a client script; all of it is replaced by attributes on the assignments
		the remaining basis names. If any of it returns, the two mechanisms would
		restrict the same thing in two places.
		"""
		self.assertEqual(set(SCOPE_DIMENSIONS), {"User Assignment"})

		meta = frappe.get_meta("Raise Requisition Scope")
		for fieldname in (
			"scope_by_company", "scope_companies",
			"scope_by_department", "scope_departments",
			"scope_by_designation", "scope_designations",
		):
			self.assertIsNone(meta.get_field(fieldname), f"{fieldname} should be removed")

	def test_scope_dimension_fields_are_named_not_positional(self):
		"""Positional access is what 500'd the gate; keep it unavailable."""
		dim = SCOPE_DIMENSIONS["User Assignment"]
		self.assertEqual(dim.check_field, "scope_by_user_assignment")
		self.assertEqual(dim.parentfield, "scope_of_raising_requisitions")
		self.assertEqual(dim.valuefield, "user_assignment")
		self.assertEqual(dim.child_doctype, "Raise Requisition Scope Assignment")


class TestAttributeContext(ScopeTestBase):
	def test_from_a_real_requisition(self):
		doc = frappe.new_doc(REQUISITION_DOCTYPE)
		doc.department = self.departments[0]
		self.assertIs(_attribute_context(doc), doc)

	def test_from_a_dict_gets_a_doctype(self):
		context = _attribute_context({"department": self.departments[0]})
		self.assertEqual(context["doctype"], REQUISITION_DOCTYPE)
		self.assertEqual(context["department"], self.departments[0])

	def test_from_none_is_an_empty_requisition(self):
		self.assertEqual(_attribute_context(None), {"doctype": REQUISITION_DOCTYPE})


class TestGateEntryPoints(FrappeTestCase):
	"""The paths the hand-built configs above cannot reach.

	Both of these caught real bugs: a stale positional index in ``_query_configs``
	that 500'd the gate, and an early return for Administrator that made every
	smoke test pass while an ordinary user was blocked.
	"""

	def test_config_loading_survives_the_real_schema(self):
		clear_config_cache()
		configs = _query_configs()
		self.assertIsInstance(configs, list)
		for config in configs:
			self.assertIn("dims_enabled", config)
			self.assertIn("scope", config)
			self.assertLessEqual(config["dims_enabled"], set(SCOPE_DIMENSIONS))

	def test_entry_points_run_for_a_non_administrator(self):
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

	def test_unadmitted_requester_gets_closed_pickers_not_open_ones(self):
		"""Deny-by-default has to hold in the allowance too.

		When no record admits the requester, an empty result would read as "no
		field is restricted" and open every picker — the inversion of the rule the
		whole gate rests on. The refusal itself is reported by
		check_can_raise_requisition; this stops the form offering values the
		insert would certainly reject.
		"""
		users = frappe.get_all(
			"User",
			filters={"enabled": 1, "name": ["not in", ("Administrator", "Guest")]},
			pluck="name",
			limit=50,
		)
		original = frappe.session.user
		blocked = None
		try:
			for user in users:
				clear_config_cache()
				frappe.set_user(user)
				if not check_can_raise_requisition()["allowed"]:
					blocked = (user, allowed_requisition_values())
					break
		finally:
			frappe.set_user(original)
			clear_config_cache()

		if not blocked:
			self.skipTest("every user on this site can raise; nothing to assert")

		_user, allowance = blocked
		for fieldname, detail in allowance.items():
			self.assertFalse(
				detail["unrestricted"],
				f"{fieldname} left unrestricted for a requester who cannot raise",
			)
			self.assertEqual(
				detail["values"], [],
				f"{fieldname} offered values to a requester who cannot raise",
			)

	def test_link_queries_offer_the_right_kind_of_assignment(self):
		"""A People assignment in the scope table restricts no values; an
		Attributes assignment in the population table resolves to nobody. The
		pickers must not offer either mistake."""
		from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
			population_assignment_query,
			scope_assignment_query,
		)

		scope = {r[0] for r in scope_assignment_query("Dynamic User Assignment", "", "name", 0, 50, None)}
		people = {r[0] for r in population_assignment_query("Dynamic User Assignment", "", "name", 0, 50, None)}

		self.assertFalse(scope & people, "an assignment cannot be valid for both tables")
		for name in scope:
			self.assertEqual(
				frappe.db.get_value("Dynamic User Assignment", name, "assignment_purpose"),
				"Attributes",
			)
