"""Direct Applicant Onboarding: give the new Recruitment Settings numbers their
defaults (form / proposal link validity 7 days, 3 negotiation rounds).

Fields added to a Single get no default on an existing site: saving the form
before this patch stored 0, which would mean "no negotiation" and links that
fall back to 7 days only by code. The feature is new, so a 0 here was never an
HR choice; a one-time patch, it does not run again. Values other than 0 are
left alone.

Dry run:
    bench --site <site> execute \
        recruitment.patches.seed_direct_applicant_settings_defaults.execute --kwargs "{'dry_run': 1}"
"""

import frappe
from frappe.utils import cint

SETTINGS = "Recruitment Settings"
DEFAULTS = {
	"da_form_link_expiry_days": 7,
	"da_proposal_link_expiry_days": 7,
	"da_max_negotiation_rounds": 3,
}


def execute(dry_run=False):
	meta = frappe.get_meta(SETTINGS)
	for field, default in DEFAULTS.items():
		if not meta.has_field(field) or cint(frappe.db.get_single_value(SETTINGS, field)):
			continue
		if dry_run:
			print(f"Would set {field} = {default}")
			continue
		frappe.db.set_single_value(SETTINGS, field, default)
