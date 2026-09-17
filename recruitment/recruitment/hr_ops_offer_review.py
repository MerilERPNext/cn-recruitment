"""HR Ops verification step between raising a Job Offer and sending it out.

Recruitment Settings -> Job Offer Rules -> "Require HR Ops Verification Before
Sending Offer" (`enable_hr_ops_offer_verification`).

OFF — the default, and what every existing site keeps — means nothing in this
module runs: no extra button, no extra guard, the offer flow is exactly what it
was before this file existed.

ON adds one step. The recruiter saves the offer and clicks "Notify HR Ops",
which emails everyone holding the **HR Ops** role a link to the offer in Desk,
and gives each of those same users a ToDo on the offer. The ToDos close by
themselves once the offer is sent or cancelled.
"Send Job Offer" (form button, list bulk action and the server call behind both)
stays out of reach until that notification has gone out; HR Ops then reviews,
submits and sends.

The notification is stamped on the offer itself (`custom_hr_ops_notified`), so
the gate survives a reload and a re-notify is a no-op rather than a second mail.
"""

import frappe
from frappe import _
from frappe.utils import cint, get_url, validate_email_address

SETTINGS = "Recruitment Settings"
SETTING_FIELD = "enable_hr_ops_offer_verification"

HR_OPS_ROLE = "HR Ops"
EMAIL_TEMPLATE = "HR Ops Offer Verification"

# Every HR Ops ToDo starts with this, which is how they are found again to close.
TODO_PREFIX = "Verify & release Job Offer"


# --- the setting -------------------------------------------------------------

def verification_enabled():
	"""Whether this site runs offers through HR Ops before sending."""
	return bool(cint(frappe.db.get_single_value(SETTINGS, SETTING_FIELD)))


def is_notified(doc):
	return bool(cint(doc.get("custom_hr_ops_notified")))


def send_blocked(doc, enabled=None):
	"""Whether "Send Job Offer" must be refused because HR Ops has not been told.

	`enabled` is there so a bulk loop reads the setting once instead of per offer;
	leave it out and it is read here.
	"""
	if enabled is None:
		enabled = verification_enabled()
	return bool(enabled) and not is_notified(doc)


# --- recipients --------------------------------------------------------------

def hr_ops_users():
	"""`(user, email)` for each enabled System User holding the HR Ops role.

	One list feeds both the mail and the ToDos, so the same people get both.
	"""
	users = frappe.get_all(
		"Has Role",
		filters={"role": HR_OPS_ROLE, "parenttype": "User"},
		pluck="parent",
	)
	if not users:
		return []

	rows = frappe.get_all(
		"User",
		filters={"name": ["in", users], "enabled": 1, "user_type": "System User"},
		fields=["name", "email"],
	)

	out = []
	seen = set()
	for row in rows:
		email = (row.email or row.name or "").strip()
		if not email or email in seen:
			continue
		if not validate_email_address(email, throw=False):
			continue
		seen.add(email)
		out.append((row.name, email))
	return out


def hr_ops_recipients():
	"""Email addresses of the enabled users holding the HR Ops role."""
	return [email for _user, email in hr_ops_users()]


# --- the ToDos ---------------------------------------------------------------

def _open_todo_filters(doc, user=None):
	filters = {
		"reference_type": doc.doctype,
		"reference_name": doc.name,
		"status": "Open",
		"description": ["like", f"{TODO_PREFIX}%"],
	}
	if user:
		filters["allocated_to"] = user
	return filters


def raise_hr_ops_todos(doc, users):
	"""One open "verify & release" ToDo per HR Ops user on this offer.

	Created directly rather than through `assign_to.add`, which skips a user who
	already has any open ToDo on the record and so could quietly drop this one.
	Returns how many were created.
	"""
	detail = doc.get("applicant_name") or doc.get("job_applicant") or doc.name
	created = 0
	for user in users:
		if frappe.db.exists("ToDo", _open_todo_filters(doc, user)):
			continue
		frappe.get_doc({
			"doctype": "ToDo",
			"allocated_to": user,
			"reference_type": doc.doctype,
			"reference_name": doc.name,
			"description": f"{TODO_PREFIX}: {detail} ({doc.name})",
			"priority": "Medium",
		}).insert(ignore_permissions=True)
		created += 1
	return created


def close_hr_ops_todos(doc, method=None):
	"""Job Offer on_change / on_cancel: the HR Ops task is done once the offer
	has been sent, and moot once it is cancelled. Never raises."""
	try:
		if not (doc.docstatus == 2 or doc.get("email_status") == "Sent"):
			return
		for name in frappe.get_all("ToDo", filters=_open_todo_filters(doc), pluck="name"):
			todo = frappe.get_doc("ToDo", name)
			todo.status = "Closed"
			todo.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(frappe.get_traceback(), f"HR Ops ToDo close failed: {doc.name}")


# --- the email ---------------------------------------------------------------

DEFAULT_TEMPLATE = {
	"subject": "Action Required | Verify & Release Job Offer - {{ applicant_name }}",
	"response": """<p>Hi Team,</p>

<p>
A Job Offer has been raised by the Talent Acquisition team and is now with you for
verification. Please review the details and release the offer to the candidate.
</p>

<table cellpadding="6" cellspacing="0" border="0">
  <tr><td><b>Candidate</b></td><td>{{ applicant_name }}</td></tr>
  <tr><td><b>Offer ID</b></td><td>{{ offer_name }}</td></tr>
  {% if designation %}<tr><td><b>Designation</b></td><td>{{ designation }}</td></tr>{% endif %}
  {% if company %}<tr><td><b>Company</b></td><td>{{ company }}</td></tr>{% endif %}
  {% if offer_date %}<tr><td><b>Offer Date</b></td><td>{{ offer_date }}</td></tr>{% endif %}
  <tr><td><b>Raised By</b></td><td>{{ notified_by }}</td></tr>
</table>

<p>
<a href="{{ offer_url }}">Open the Job Offer</a>
</p>

<p><b>What we need from you:</b></p>
<ol>
  <li>Review the offer details and the compensation breakup.</li>
  <li>Submit the offer once everything checks out.</li>
  <li>Click <b>Send Job Offer</b> to release it to the candidate.</li>
</ol>

<p>
Any discrepancy, please write back to the recruiter before releasing the offer.
</p>

<p>
Regards,<br>
Talent Acquisition Team
</p>""",
}


def ensure_default_email_template():
	"""Create the HR Ops notification template if it isn't there.

	Idempotent, and it never rewrites an existing one — the wording belongs to
	whoever edits it in Desk once it has shipped.
	"""
	if frappe.db.exists("Email Template", EMAIL_TEMPLATE):
		return None

	doc = frappe.get_doc({
		"doctype": "Email Template",
		"name": EMAIL_TEMPLATE,
		"subject": DEFAULT_TEMPLATE["subject"],
		# `response` (Text Editor) with use_html 0: with use_html ticked Frappe
		# renders response_html and ignores this, which is an email with no body.
		"response": DEFAULT_TEMPLATE["response"],
		"use_html": 0,
	})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	return EMAIL_TEMPLATE


def email_context(doc):
	"""Variables available to the HR Ops template."""
	return {
		"doc": doc,
		"offer_name": doc.name,
		"offer_url": get_url(f"/app/job-offer/{doc.name}"),
		"applicant_name": doc.get("applicant_name") or doc.get("job_applicant") or "",
		"job_applicant": doc.get("job_applicant") or "",
		"designation": doc.get("designation") or "",
		"company": doc.get("company") or "",
		"offer_date": frappe.utils.formatdate(doc.get("offer_date")) if doc.get("offer_date") else "",
		"notified_by": frappe.utils.get_fullname(frappe.session.user),
	}


def render_email(doc):
	"""`(subject, message)` for one offer.

	Read from the Email Template when it is there — that is the editable copy —
	and from the built-in default when it has been deleted, so a missing template
	never silently swallows the notification.
	"""
	context = email_context(doc)

	template = frappe.db.get_value(
		"Email Template",
		EMAIL_TEMPLATE,
		["subject", "response", "response_html", "use_html"],
		as_dict=True,
	)
	if template:
		subject = template.subject or DEFAULT_TEMPLATE["subject"]
		body = (template.response_html if cint(template.use_html) else template.response) or ""
		if not body.strip():
			body = DEFAULT_TEMPLATE["response"]
	else:
		subject = DEFAULT_TEMPLATE["subject"]
		body = DEFAULT_TEMPLATE["response"]

	return (
		frappe.render_template(subject, context),
		frappe.render_template(body, context),
	)


def pending_message():
	"""Why a send was refused — same wording everywhere it is shown."""
	return _(
		"HR Ops has not been notified for this offer yet. Click 'Notify HR Ops' first."
	)
