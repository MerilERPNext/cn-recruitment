import frappe
from frappe import _
from frappe.utils import validate_email_address


@frappe.whitelist(allow_guest=True)
def verify_applicant_email(email, first_name=None, last_name=None, phone_number=None, drive=None):
	"""Public endpoint for the email-verification web page.

	Email is the only checked field. If it is an existing Job Applicant the record is
	flagged verified (and linked to the originating Campus Drive when the `drive`
	param resolves to a real drive). If it isn't, we return "not found" and the page
	offers spot registration on that drive — see
	recruitment.api.channels.campus_drive_spot. The name / mobile fields the page also
	collects are accepted but not matched against the record; they only pre-fill the
	spot-registration form.
	"""
	email = (email or "").strip()
	if not email:
		frappe.throw(_("Email is required."), title=_("Missing Email"))

	if not validate_email_address(email):
		frappe.throw(_("Please enter a valid email address."), title=_("Invalid Email"))

	applicant = frappe.db.get_value(
		"Job Applicant",
		{"email_id": email},
		["name", "applicant_name"],
		as_dict=True,
	)

	# Email is the core identity — if it isn't on file, the page offers spot
	# registration. That only exists in the context of a drive, so tell the page
	# whether the scanned drive can actually take a walk-in right now.
	if not applicant:
		from recruitment.api.channels.campus_drive_spot import _get_open_drive

		can_register = bool(_get_open_drive(drive))
		return {
			"verified": False,
			"status": "not_found",
			"can_register": can_register,
			"drive": (drive or "").strip() if can_register else None,
			"message": (
				_("We could not find your email in our system yet.")
				if can_register
				else _(
					"We could not find your email in our system, and registration is not "
					"open for this campus drive. Please contact the HR desk."
				)
			),
		}

	# Email is on file — mark verified.
	drive = (drive or "").strip()
	updates = {"custom_email_verified": 1}
	if drive and frappe.db.exists("Campus Drive", drive):
		updates["custom_campus_drive"] = drive

	# set_value bypasses record-level permissions, required here for a Guest caller.
	frappe.db.set_value("Job Applicant", applicant.name, updates, update_modified=False)
	frappe.db.commit()

	return {
		"verified": True,
		"status": "verified",
		"message": _("Your email is verified. You can leave this page."),
		"applicant": applicant.name,
	}
