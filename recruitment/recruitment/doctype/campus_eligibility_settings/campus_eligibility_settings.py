"""Campus Eligibility Settings — the eligibility conditions every campus opening
starts from.

The conditions are written once here and COPIED onto a Job Opening the first time
it is posted to the Campus channel (see
``recruitment.recruitment.eligibility_engine.apply_default_eligibility_rules``).
A copy, not a reference: the recruiter can then tune the conditions for that one
opening, and changing the defaults here never rewrites openings already running.
"""

import frappe
from frappe.model.document import Document


class CampusEligibilitySettings(Document):
	pass


@frappe.whitelist()
def get_default_eligibility_rules():
	"""The default conditions, as plain rule dicts the Job Opening form can append.

	Whitelisted for the "Load defaults" button in the eligibility builder.
	"""
	if not frappe.db.exists("DocType", "Campus Eligibility Settings"):
		return []

	settings = frappe.get_single("Campus Eligibility Settings")
	return [
		{
			"field_name": row.field_name,
			"match_field": row.match_field or "",
			"match_operator": row.match_operator or "=",
			"match_value": row.match_value or "",
			"operator": row.operator or "=",
			"value": row.value or "",
			"action": row.action or "Knock out",
		}
		for row in (settings.eligibility_rules or [])
		if row.field_name
	]
