# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class HiringLeadConfiguration(Document):
	pass


def _resolve_config_users(parents):
	"""Return ``(hiring_lead_users, recruiter_users)`` for the given Hiring Lead
	Configuration ``parents`` (a list of config names).

	Hiring leads / recruiters are selected as Employees; each is resolved to its
	linked system User (``user_id``) so callers keep working in terms of Users.
	Employees without a linked User simply drop out (they can't act in Desk).
	Shared by the Company Wise and Assignment Framework resolvers.
	"""
	if not parents:
		return set(), set()

	def _users(parentfield):
		employees = frappe.get_all(
			"Hiring Lead Configuration Employee",
			filters={
				"parenttype": "Hiring Lead Configuration",
				"parentfield": parentfield,
				"parent": ["in", parents],
			},
			pluck="employee",
		)
		if not employees:
			return set()
		return set(frappe.get_all(
			"Employee",
			filters={"name": ["in", employees], "user_id": ["is", "set"]},
			pluck="user_id",
		))

	return _users("hiring_leads"), _users("recruiters")


def get_config_users_for_company(company):
	"""Return ``(hiring_lead_users, recruiter_users)`` — the union of Users (resolved
	from the configured Employees' linked ``user_id``) across every **Company Wise**
	Hiring Lead Configuration whose Applicable Companies include ``company``.

	Returns two empty sets when ``company`` is falsy or nothing matches, so callers
	can fall back to unrestricted behaviour (the requisition flow is never blocked).

	Assignment Framework configurations are matched separately via
	:func:`get_config_users_for_assignment`.
	"""
	if not company:
		return set(), set()

	# Company Wise configs that list this company in `applicable_companies`.
	parents = list(set(frappe.get_all(
		"Hiring Lead Configuration Company",
		filters={
			"parenttype": "Hiring Lead Configuration",
			"parentfield": "applicable_companies",
			"company": company,
		},
		pluck="parent",
	)))
	if not parents:
		return set(), set()

	# Defensive: keep only configs that are actually Company Wise.
	parents = frappe.get_all(
		"Hiring Lead Configuration",
		filters={"name": ["in", parents], "assignment_type": "Company Wise"},
		pluck="name",
	)
	return _resolve_config_users(parents)


def get_config_users_for_assignment(employee):
	"""Return ``(hiring_lead_users, recruiter_users)`` — the union of Users across
	every **Assignment Framework** Hiring Lead Configuration that applies to
	``employee`` (an Employee ID).

	A config applies when one of its Applicable ``Dynamic User Assignment``\\ s lists
	``employee`` among its resolved ``assigned_users``. Returns two empty sets when
	``employee`` is falsy or nothing matches, so callers fall back to unrestricted
	behaviour (the requisition flow is never blocked).
	"""
	if not employee:
		return set(), set()

	# Dynamic User Assignments whose materialised `assigned_users` include this
	# employee. `fetch_employees_and_users` keeps that child table in sync.
	duas = list(set(frappe.get_all(
		"Assigned Users",
		filters={
			"parenttype": "Dynamic User Assignment",
			"parentfield": "assigned_users",
			"employee_id": employee,
		},
		pluck="parent",
	)))
	if not duas:
		return set(), set()

	# Assignment Framework configs that reference any of those assignments.
	parents = list(set(frappe.get_all(
		"Hiring Lead Configuration Assignment",
		filters={
			"parenttype": "Hiring Lead Configuration",
			"parentfield": "applicable_assignments",
			"dynamic_user_assignment": ["in", duas],
		},
		pluck="parent",
	)))
	if not parents:
		return set(), set()

	# Defensive: keep only configs that are actually Assignment Framework.
	parents = frappe.get_all(
		"Hiring Lead Configuration",
		filters={"name": ["in", parents], "assignment_type": "Assignment Framework"},
		pluck="name",
	)
	return _resolve_config_users(parents)


def get_config_users(company=None, employee=None):
	"""Return ``(hiring_lead_users, recruiter_users)`` combining both matching modes:
	Company Wise (by ``company``) and Assignment Framework (by ``employee``).

	The two result sets are unioned, so a caller that supplies both keys sees every
	configured user that applies through either path. Empty sets when nothing
	matches, preserving the unrestricted fallback."""
	leads_c, recruiters_c = get_config_users_for_company(company)
	leads_a, recruiters_a = get_config_users_for_assignment(employee)
	return leads_c | leads_a, recruiters_c | recruiters_a


def is_hiring_lead_for_company(company, user=None):
	"""True when `user` (default: current session user) is a configured Hiring Lead
	for `company` via a Company Wise Hiring Lead Configuration. Returns False when
	`company` is empty or no config matches — so permission gates impose NO
	restriction in that case (never blocking users outside the configuration)."""
	if not company:
		return False
	user = user or frappe.session.user
	leads, _ = get_config_users_for_company(company)
	return user in leads


@frappe.whitelist()
def get_hiring_lead_config_users(company=None, employee=None):
	"""Form-script friendly view of get_config_users:
	``{"hiring_leads": [user, ...], "recruiters": [user, ...]}``.

	Matches Company Wise configs by `company` and Assignment Framework configs by
	`employee` (the requisition's Hiring Manager / Requested By). Empty lists when
	no configuration matches either key."""
	leads, recruiters = get_config_users(company, employee)
	return {"hiring_leads": sorted(leads), "recruiters": sorted(recruiters)}
