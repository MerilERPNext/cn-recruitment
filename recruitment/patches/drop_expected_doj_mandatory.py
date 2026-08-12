"""Job Applicant's Expected DOJ is no longer mandatory at any stage.

A Property Setter made it ``mandatory_depends_on: eval:doc.status != "Draft"``.
Job Applicant status is almost never Draft, so in practice the field was required on
every save — blocking recruiters at every stage over a date nobody knows until the
offer is agreed.

It is only ever an early indication. The date that matters is the one on the Job
Offer, which is what Employee Onboarding now takes its joining date from (see
``recruitment.api.candidate_portal.create_employee_onboarding``).

The rule lives in a Property Setter created through Customize Form rather than in
any fixture, so it has to be deleted rather than edited out of a JSON file.
Idempotent.
"""

import frappe

PROPERTY_SETTER = "Job Applicant-custom_expected_doj-mandatory_depends_on"


def execute():
	if frappe.db.exists("Property Setter", PROPERTY_SETTER):
		frappe.delete_doc("Property Setter", PROPERTY_SETTER, force=True,
		                  ignore_permissions=True)
		print(f"Removed {PROPERTY_SETTER}")

	# Belt and braces: the same rule could have been set on the Custom Field itself.
	custom_field = frappe.db.exists("Custom Field", "Job Applicant-custom_expected_doj")
	if custom_field:
		frappe.db.set_value("Custom Field", custom_field,
		                    {"mandatory_depends_on": None, "reqd": 0})

	frappe.clear_cache(doctype="Job Applicant")
	frappe.db.commit()
