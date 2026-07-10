import re

import frappe
from frappe import _
from frappe.utils import validate_email_address

# Dummy immediate-registration link shown when the email is NOT already an applicant.
# TODO: replace with the real self-registration / application route.
IMMEDIATE_REGISTRATION_LINK = "/jobs"


def _norm(value):
	"""Case/space-insensitive text for name comparisons."""
	return (value or "").strip().casefold()


def _digits(value):
	"""Digits only, for phone-number comparison."""
	return re.sub(r"\D", "", value or "")


def _phone_matches(entered, stored):
	a, b = _digits(entered), _digits(stored)
	if not a or not b:
		return False
	# Exact, or matching last 10 digits (tolerates country-code prefixes like +91).
	return a == b or a[-10:] == b[-10:]


@frappe.whitelist(allow_guest=True)
def verify_applicant_email(email, first_name=None, last_name=None, phone_number=None, drive=None):
	"""Public endpoint for the email-verification web page.

	Core identity is the email: if it isn't an existing Job Applicant we return a
	"not found" response with the immediate-registration link. If the email IS
	found, we compare the entered First Name / Last Name / Mobile Number against
	that applicant's `applicant_name` / `custom_applicant_last_name` /
	`phone_number` and return a field-level "mismatch" response if any differ.
	Only when all four line up do we flag the applicant as verified (and link the
	originating Campus Drive when the `drive` param resolves to a real drive).
	"""
	email = (email or "").strip()
	if not email:
		frappe.throw(_("Email is required."), title=_("Missing Email"))

	if not validate_email_address(email):
		frappe.throw(_("Please enter a valid email address."), title=_("Invalid Email"))

	phone_number = (phone_number or "").strip()
	if not phone_number:
		frappe.throw(_("Mobile number is required."), title=_("Missing Mobile Number"))

	applicant = frappe.db.get_value(
		"Job Applicant",
		{"email_id": email},
		["name", "applicant_name", "custom_applicant_last_name", "phone_number"],
		as_dict=True,
	)

	# Email is the core identity — if it isn't on file, offer registration.
	if not applicant:
		return {
			"verified": False,
			"status": "not_found",
			"message": _("We could not find your email in our system yet."),
			"registration_link": IMMEDIATE_REGISTRATION_LINK,
		}

	# Field-by-field validation against the matched applicant.
	mismatches = []
	if _norm(first_name) != _norm(applicant.applicant_name):
		mismatches.append(_("First Name"))
	if _norm(last_name) != _norm(applicant.custom_applicant_last_name):
		mismatches.append(_("Last Name"))
	if not _phone_matches(phone_number, applicant.phone_number):
		mismatches.append(_("Mobile Number"))

	if mismatches:
		return {
			"verified": False,
			"status": "mismatch",
			"fields": mismatches,
			"message": _("These details do not match our records: {0}.").format(
				", ".join(mismatches)
			),
		}

	# All four fields matched — mark verified.
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
		"message": _("Your details are verified. You can leave this page."),
		"applicant": applicant.name,
	}
