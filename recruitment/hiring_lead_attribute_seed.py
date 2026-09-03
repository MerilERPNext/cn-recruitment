"""TEMPORARY Hiring Lead Configuration attribute seeder (safe to delete).

Builds **two** Assignment Framework Hiring Lead Configurations so the attribute
path can be tested by hand:

    Config A ── User Assignment A (Attributes, Job Requisition, <axis>=<value A>)
             └─ hiring lead / recruiter: employee A

    Config B ── User Assignment B (Attributes, Job Requisition, <axis>=<value B>)
             └─ hiring lead / recruiter: employee B

``<axis>`` is whichever Job Requisition Link field this site can actually tell two
values apart on — Department first, then Designation, then Company. The seed does
not invent masters: a configuration pointing at a Department nobody uses proves
nothing on the screens it appears on.

What is being tested
--------------------
Open a Job Requisition and set the axis field to value A. "Hiring lead" and
"Assign to Recruiter" must narrow to employee A. Switch it to value B and they
must narrow to employee B. Clear it and both must go back to the full list —
an unfilled attribute *defers*, it does not close the picker.

Also worth checking, on the Hiring Lead Configuration form itself: the
"Applicable To" picker offers only *Attributes* assignments tagged for Job
Requisition (or tagged for nothing). A People assignment must not appear.

Everything is marked so cleanup() can remove it:
    Assignments    assignment_name starts   HL Seed -
    Configurations name starts              HL Seed Config

Run:
    bench --site <site> execute recruitment.hiring_lead_attribute_seed.run
Report what exists and what each config should resolve to:
    bench --site <site> execute recruitment.hiring_lead_attribute_seed.report
Cleanup:
    bench --site <site> execute recruitment.hiring_lead_attribute_seed.cleanup
"""

import frappe

from nextai.nextai.doctype.dynamic_user_assignment.attributes import PURPOSE_ATTRIBUTES

ASSIGNMENT_PREFIX = "HL Seed -"
CONFIG_PREFIX = "HL Seed Config"
REQUISITION_DOCTYPE = "Job Requisition"

# Job Requisition Link fields to scope by, best first. Department is the axis a
# hiring lead is most often decided on; Company last because a Company Wise
# configuration already covers that case without any of this machinery.
AXES = (
	("department", "Department"),
	("designation", "Designation"),
	("company", "Company"),
)


def _log(msg):
	print(f"  {msg}")


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #

def _axis():
	"""``(scope_field, value_a, value_b)`` — the first axis with two usable values.

	Ordered by name so a second run scopes on the same two values as the first,
	rather than building two configurations that quietly stopped disagreeing.
	"""
	for fieldname, doctype in AXES:
		values = frappe.get_all(doctype, pluck="name", order_by="name asc", limit_page_length=2)
		if len(values) >= 2:
			return fieldname, values[0], values[1]

	frappe.throw(
		"This site has fewer than two Departments, Designations and Companies — "
		"there is no axis on which two configurations could disagree."
	)


def _employees():
	"""Two Active Employees **with a linked User**.

	The linked User is not optional decoration: ``_resolve_config_users`` resolves
	every configured Employee to its ``user_id`` and drops the ones without, so a
	configuration seeded with user-less employees would resolve to nobody and look
	exactly like a configuration that did not match.
	"""
	rows = frappe.get_all(
		"Employee",
		filters={"status": "Active", "user_id": ["is", "set"]},
		fields=["name", "employee_name", "user_id"],
		order_by="name asc",
		limit_page_length=2,
	)
	if len(rows) < 2:
		frappe.throw(
			"This site has fewer than two Active Employees with a linked User. "
			"A hiring lead without a User cannot be resolved, so the seed would "
			"build two configurations that both resolve to nobody."
		)
	return rows[0], rows[1]


# --------------------------------------------------------------------------- #
# Records
# --------------------------------------------------------------------------- #

def _assignment(label, scope_field, value):
	"""An Attributes assignment permitting one value of one Job Requisition field.

	Purpose *Attributes*, never *People*: this basis asks "does this requisition
	fall in scope", not "who is this assignment about". A People assignment
	resolves to employees and carries no attribute values, so it would restrict
	nothing here — which is why the picker filters it out.

	Tagged via ``applicable_for_process`` so it shows up in the Hiring Lead
	Configuration picker (and stays out of pickers for other processes).
	"""
	name = f"{ASSIGNMENT_PREFIX} {label}"
	if frappe.db.exists("Dynamic User Assignment", name):
		_log(f"assignment {name} already exists")
		return name

	doc = frappe.new_doc("Dynamic User Assignment")
	doc.assignment_name = name
	doc.assignment_code = name
	doc.assignment_purpose = PURPOSE_ATTRIBUTES
	doc.target_type = "Employee"
	doc.description = f"Seed: requisitions where {scope_field} = {value}"
	doc.attribute_match = "All fields must match (AND)"
	# The seed picks its two values off one axis independently of the site's
	# hierarchy; a hierarchy check could reject a Department that is not under
	# whichever Company happens to be first.
	doc.validate_attribute_hierarchy = 0
	doc.append("applicable_for_process", {"document_type": REQUISITION_DOCTYPE})
	doc.append("assignment_attributes", {
		"scope_doctype": REQUISITION_DOCTYPE,
		"scope_field": scope_field,
		"attribute_value": value,
	})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"assignment {name} -> {REQUISITION_DOCTYPE}.{scope_field} = {value}")
	return doc.name


def _configuration(label, assignment, employee):
	"""An Assignment Framework configuration naming one assignment and one lead.

	Hiring lead and recruiter are the same employee on purpose: the point under
	test is *when* a configuration applies, and using one person for both makes a
	wrong match obvious in either dropdown.
	"""
	name = f"{CONFIG_PREFIX} {label}"
	existing = frappe.db.get_value(
		"Hiring Lead Configuration", {"hiring_lead_configuration_name": name}, "name"
	)
	if existing:
		_log(f"configuration {name} already exists ({existing})")
		return existing

	doc = frappe.new_doc("Hiring Lead Configuration")
	doc.hiring_lead_configuration_name = name
	doc.assignment_type = "Assignment Framework"
	doc.append("applicable_assignments", {"dynamic_user_assignment": assignment})
	doc.append("hiring_leads", {"employee": employee["name"]})
	doc.append("recruiters", {"employee": employee["name"]})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"configuration {name} ({doc.name}) -> {assignment} -> "
	     f"{employee['employee_name']} ({employee['user_id']})")
	return doc.name


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #

def run():
	scope_field, value_a, value_b = _axis()
	employee_a, employee_b = _employees()

	_log(f"scoping on {REQUISITION_DOCTYPE}.{scope_field}")
	assignment_a = _assignment("A", scope_field, value_a)
	assignment_b = _assignment("B", scope_field, value_b)
	_configuration("A", assignment_a, employee_a)
	_configuration("B", assignment_b, employee_b)

	frappe.db.commit()
	print(
		f"\nSeeded. On a Job Requisition, set {scope_field} = {value_a} and the "
		f"Hiring lead list should narrow to {employee_a['employee_name']}; set it "
		f"to {value_b} and it should narrow to {employee_b['employee_name']}. "
		f"Clear it and the full list should come back."
	)


def report():
	"""What exists, and what each configuration resolves to right now."""
	from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
		get_config_users,
	)

	configs = frappe.get_all(
		"Hiring Lead Configuration",
		filters={"hiring_lead_configuration_name": ["like", f"{CONFIG_PREFIX}%"]},
		fields=["name", "hiring_lead_configuration_name"],
		order_by="hiring_lead_configuration_name asc",
	)
	if not configs:
		print("Nothing seeded — run() first.")
		return

	for config in configs:
		doc = frappe.get_doc("Hiring Lead Configuration", config["name"])
		print(f"\n{doc.hiring_lead_configuration_name} ({doc.name})")
		for row in doc.applicable_assignments:
			attributes = frappe.get_all(
				"Assignment Attribute",
				filters={"parent": row.dynamic_user_assignment},
				fields=["scope_doctype", "scope_field", "attribute_value"],
			)
			for a in attributes:
				print(f"    scope: {a['scope_doctype']}.{a['scope_field']} = {a['attribute_value']}")
				leads, recruiters = get_config_users(
					context={a["scope_field"]: a["attribute_value"]}
				)
				print(f"      -> hiring leads: {sorted(leads) or '(none)'}")
				print(f"      -> recruiters:   {sorted(recruiters) or '(none)'}")


def cleanup():
	configs = frappe.get_all(
		"Hiring Lead Configuration",
		filters={"hiring_lead_configuration_name": ["like", f"{CONFIG_PREFIX}%"]},
		pluck="name",
	)
	for name in configs:
		frappe.delete_doc("Hiring Lead Configuration", name, force=True, ignore_permissions=True)
		_log(f"removed configuration {name}")

	# Configurations first: an assignment still cited by one cannot be deleted.
	assignments = frappe.get_all(
		"Dynamic User Assignment",
		filters={"assignment_name": ["like", f"{ASSIGNMENT_PREFIX}%"]},
		pluck="name",
	)
	for name in assignments:
		frappe.delete_doc("Dynamic User Assignment", name, force=True, ignore_permissions=True)
		_log(f"removed assignment {name}")

	frappe.db.commit()
	print(f"\nRemoved {len(configs)} configuration(s) and {len(assignments)} assignment(s).")
