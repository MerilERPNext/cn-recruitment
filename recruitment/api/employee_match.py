"""Employee Record panel — is this candidate already one of ours?

Read side of the employee-pool check. The matching and the verdicts live in
``customizations.ta_rehire_check``, and the OUTCOME attached to each verdict
comes from TA Duplicity Check Settings — the same source the Job Offer gate in
``customizations.ta_duplicity_job_offer`` reads, so what the form shows and what
the gate decides can never disagree.

Note the panel is informational at application time: since the employee-pool
rules moved to the offer, a match no longer refuses the application. "enforced"
therefore means "this would affect a Job Offer", not "this blocks the form".

Returns the panel's whole payload, counts included, so the UI does no business
logic of its own.
"""

import frappe
from frappe import _

from recruitment.customizations.ta_duplicity_check import allows_hiring, get_settings, _setting
from recruitment.customizations.ta_rehire_check import ALLOW, find_matches

JOB_APPLICANT = "Job Applicant"

# Verdicts that mean "stop and look at this", whether or not the company has
# configured an outcome. `clean` is a former employee with nothing against them.
ATTENTION = frozenset({"active_employee", "do_not_rehire", "too_soon"})

# Settings fields that decide an employee-pool outcome.
_DECIDING_FIELDS = (
	"active_employee_non_ijp_action",
	"do_not_rehire_action",
	"days_before_reapplication_post_exit",
)


@frappe.whitelist()
def get_employee_match(job_applicant):
	"""Past and present Employee records this candidate resolves to."""
	if not job_applicant:
		frappe.throw(_("Job Applicant is required."))

	frappe.has_permission(JOB_APPLICANT, "read", doc=job_applicant, throw=True)
	doc = frappe.get_doc(JOB_APPLICANT, job_applicant)

	result = find_matches(doc)
	matches = result["matches"]

	settings = get_settings(result.get("company"))
	enforced = bool(settings) and any(
		_setting(settings, f, ALLOW) not in (ALLOW, None, "", 0)
		for f in _DECIDING_FIELDS
	)

	return {
		"job_applicant": doc.name,
		"company": result.get("company"),
		"settings": result.get("settings"),
		# False when the company has no Duplicity Check Settings record: the panel
		# then says "not configured" rather than "nobody found", which are very
		# different answers.
		"configured": bool(result.get("settings")),
		# Whether any of these matches would affect a Job Offer today.
		"enforced": enforced,
		# Under Allow Hiring a block does not refuse the offer — it routes it to
		# the setting's exceptional approval, and the panel must not say otherwise.
		"allow_hiring": bool(settings) and allows_hiring(settings),
		"match_fields": result.get("match_fields") or [],
		"total": len(matches),
		"attention_count": sum(1 for m in matches if m["verdict"] in ATTENTION),
		"blocking_count": sum(1 for m in matches if m["blocking"] and not m["is_linked"]),
		"exception_count": sum(
			1 for m in matches if m.get("needs_exception") and not m["is_linked"]
		),
		"matches": matches,
	}
