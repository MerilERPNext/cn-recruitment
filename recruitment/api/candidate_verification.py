import frappe
from frappe import _
from frappe.utils import validate_email_address

# Dummy immediate-registration link shown when the email is NOT already an applicant.
# TODO: replace with the real self-registration / application route.
IMMEDIATE_REGISTRATION_LINK = "/jobs"


@frappe.whitelist(allow_guest=True)
def verify_applicant_email(email, first_name=None, last_name=None, drive=None):
	"""Public endpoint for the email-verification web page.

	Checks whether the supplied email matches an existing Job Applicant
	(`email_id`). If it does, flags every matching applicant as
	`custom_email_verified`, links them to the originating Campus Drive (when the
	`drive` param resolves to a real drive), and returns a "verified" response.
	Otherwise returns "not verified" along with a (currently dummy) immediate
	registration link.
	"""
	email = (email or "").strip()
	if not email:
		frappe.throw(_("Email is required."), title=_("Missing Email"))

	if not validate_email_address(email):
		frappe.throw(_("Please enter a valid email address."), title=_("Invalid Email"))

	applicants = frappe.get_all(
		"Job Applicant",
		filters={"email_id": email},
		pluck="name",
	)

	if not applicants:
		return {
			"verified": False,
			"message": _("We could not find your email in our system yet."),
			"registration_link": IMMEDIATE_REGISTRATION_LINK,
		}

	# Only trust the drive param if it resolves to a real Campus Drive.
	drive = (drive or "").strip()
	campus_drive = drive if drive and frappe.db.exists("Campus Drive", drive) else None

	updates = {"custom_email_verified": 1}
	if campus_drive:
		updates["custom_campus_drive"] = campus_drive

	for name in applicants:
		# set_value bypasses record-level permissions, which is required here
		# because the caller is a Guest.
		frappe.db.set_value("Job Applicant", name, updates, update_modified=False)

	frappe.db.commit()

	return {
		"verified": True,
		"message": _("Your email is verified. You can leave this page."),
		"applicants": applicants,
	}
