"""Mandatory "Pendo" popup shown to employees after login.

An admin configures one or more ``Pendo Popup`` records (image, message, an
optional "Act" deep-link, a validity window, and a reappearance frequency).
``get_active_pendo`` below is what the frontend calls once per session to
find the single popup (if any) currently due for the logged-in employee;
``respond_to_pendo`` is what all three buttons (Act / Decline / the X close)
call to log the interaction, which is what the frequency check reads back.

The popup is dismissable, not blocking -- there is no "you must Act before
you can use ESS" gate anywhere here. What brings it back is purely the
`frequency` rule against the employee's own last response.
"""

import calendar

import frappe
from frappe.utils import getdate, today

_WEEKDAY_NAMES = (
	"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
)


def _current_employee():
	return frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")


def _within_validity(popup, today_date):
	start = getdate(popup.start_date)
	end = frappe.utils.add_days(start, int(popup.validity_days or 0))
	return start <= today_date <= end


def _last_response_date(popup_name, employee):
	row = frappe.db.get_value(
		"Pendo Popup Response",
		{"pendo_popup": popup_name, "employee": employee},
		"responded_on",
		order_by="responded_on desc",
	)
	return getdate(row) if row else None


def _is_due(popup, employee, today_date):
	"""Whether `popup` should show for `employee` today, per its frequency and
	the employee's own last response to it (see the field's own description
	in pendo_popup.json for the semantics of each option)."""
	last = _last_response_date(popup.name, employee)

	if popup.frequency == "Once":
		return last is None

	if popup.frequency == "Daily":
		return last is None or last < today_date

	if popup.frequency == "Weekly":
		if _WEEKDAY_NAMES[today_date.weekday()] != popup.day_of_week:
			return False
		return last is None or last < today_date

	if popup.frequency == "Monthly":
		days_in_month = calendar.monthrange(today_date.year, today_date.month)[1]
		target_day = min(int(popup.day_of_month or 1), days_in_month)
		if today_date.day != target_day:
			return False
		return last is None or last < today_date

	return False


@frappe.whitelist()
def get_active_pendo() -> dict:
	"""The single highest-priority Pendo Popup due for the logged-in employee
	right now, or None. See `_is_due` for the per-frequency resolution and
	`_within_validity` for the validity-window check. When more than one
	popup is simultaneously due, the highest `priority` wins (ties broken by
	most recently created) -- only one is ever returned, so popups never
	stack on top of each other.
	"""
	employee = _current_employee()
	if not employee:
		return {"success": True, "pendo": None}

	today_date = getdate(today())
	candidates = frappe.get_all(
		"Pendo Popup",
		filters={"is_active": 1},
		fields=[
			"name", "title", "image", "message",
			"act_button_label", "act_url", "decline_button_label",
			"start_date", "validity_days",
			"frequency", "day_of_week", "day_of_month",
			"priority", "creation",
		],
		order_by="priority desc, creation desc",
	)

	for popup in candidates:
		if not _within_validity(popup, today_date):
			continue
		if not _is_due(popup, employee, today_date):
			continue
		return {
			"success": True,
			"pendo": {
				"name": popup.name,
				"title": popup.title,
				"image": popup.image,
				"message": popup.message,
				"act_button_label": popup.act_button_label,
				"act_url": popup.act_url,
				"decline_button_label": popup.decline_button_label,
			},
		}

	return {"success": True, "pendo": None}


@frappe.whitelist(methods=["POST"])
def respond_to_pendo(pendo_popup: str, action: str) -> dict:
	"""Log the employee's interaction with a Pendo Popup. `action`: "Acted" |
	"Declined" | "Closed" -- called by all three buttons alike, they only
	differ in which value they send."""
	if action not in ("Acted", "Declined", "Closed"):
		frappe.throw(frappe._("Invalid action."))

	employee = _current_employee()
	if not employee:
		frappe.local.response["http_status_code"] = 403
		frappe.throw(frappe._("No employee record is linked to your account."))

	if not frappe.db.exists("Pendo Popup", pendo_popup):
		frappe.local.response["http_status_code"] = 404
		frappe.throw(frappe._("Pendo Popup {0} was not found.").format(pendo_popup))

	frappe.get_doc({
		"doctype": "Pendo Popup Response",
		"pendo_popup": pendo_popup,
		"employee": employee,
		"action": action,
	}).insert(ignore_permissions=True)
	frappe.db.commit()

	return {"success": True}
