"""Recruitment Settings rules around sending a Job Offer.

  offer_action_item_trigger       when the offer shows in the candidate's Action Center
  disable_send_offer_after_sent   no second "Send Job Offer" once the email is out
  withdraw_offer_only_after_sent  Withdraw only on a submitted offer that was sent

The defaults reproduce the behaviour from before these settings existed, so a site
that never touches them sees no change.
"""

import frappe
from frappe import _
from frappe.utils import cint

SETTINGS = "Recruitment Settings"

ON_CREATION = "On Offer Creation"
ON_SUBMIT = "On Offer Submit"
ON_EMAIL_SENT = "On Offer Email Sent"

EMAIL_SENT = "Sent"


def _setting(fieldname):
	return frappe.db.get_single_value(SETTINGS, fieldname)


def is_offer_sent(doc):
	"""Submitted, and its offer email has gone out."""
	return doc.docstatus == 1 and doc.get("email_status") == EMAIL_SENT


def action_item_due(doc):
	"""Whether the candidate should see this offer in their Action Center yet."""
	trigger = _setting("offer_action_item_trigger") or ON_CREATION
	if trigger == ON_SUBMIT:
		return doc.docstatus == 1
	if trigger == ON_EMAIL_SENT:
		return is_offer_sent(doc)
	return True


def send_locked(doc):
	"""Whether another "Send Job Offer" must be refused for this offer."""
	return bool(cint(_setting("disable_send_offer_after_sent"))) and doc.get("email_status") == EMAIL_SENT


def reset_send_status_on_amend(doc, method=None):
	"""An amended offer is a new letter that has not been sent yet.

	Frappe's Amend copies every field, no_copy or not, so without this the
	amendment would arrive already marked Sent. (Duplicate is covered by no_copy.)
	"""
	if doc.get("amended_from"):
		doc.email_status = "Pending"
		doc.email_sent_on = None
		doc.email_error = None


def validate_withdraw(doc):
	if cint(_setting("withdraw_offer_only_after_sent")) and not is_offer_sent(doc):
		frappe.throw(
			_("This offer can only be withdrawn after it has been submitted and its offer email sent.")
		)
