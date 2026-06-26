# Copyright (c) 2026, Recruitment and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class HiringLeadConfiguration(Document):
	pass


def get_config_users_for_company(company):
	"""Return ``(hiring_lead_users, recruiter_users)`` — the union of Users (resolved
	from the configured Employees' linked ``user_id``) across every **Company Wise**
	Hiring Lead Configuration whose Applicable Companies include ``company``.

	Returns two empty sets when ``company`` is falsy or nothing matches, so callers
	can fall back to unrestricted behaviour (the requisition flow is never blocked).

	Assignment Framework configurations are intentionally NOT resolved here —
	matching a requisition to a Dynamic User Assignment needs its own rules.
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
	if not parents:
		return set(), set()

	def _users(parentfield):
		# Hiring leads / recruiters are selected as Employees; resolve each to its
		# linked system User (`user_id`) so callers keep working in terms of Users.
		# Employees without a linked User simply drop out (they can't act in Desk).
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
def get_hiring_lead_config_users(company=None):
	"""Form-script friendly view of get_config_users_for_company:
	``{"hiring_leads": [user, ...], "recruiters": [user, ...]}``.
	Empty lists when no Company Wise configuration matches `company`."""
	leads, recruiters = get_config_users_for_company(company)
	return {"hiring_leads": sorted(leads), "recruiters": sorted(recruiters)}
