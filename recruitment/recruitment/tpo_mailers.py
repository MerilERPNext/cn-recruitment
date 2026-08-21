"""The two emails a TPO gets, both driven entirely by configuration.

  Welcome       — when an institute's Primary TPO is recorded (on creation, and on
                  any later edit that adds one). Once per contact, ever. This is
                  the TPO's ONLY account mail: it provisions their Desk user and
                  carries the set-password link in its own body. It used to be one
                  of two — a welcome here and a separate "set your password" mail
                  at Campus Invite — which meant the same person was written to
                  twice about the same account.
  Campus invite — when a Campus Invite is submitted, to every TPO contact of the
                  invited institutes. About the drive, not about their login.

Nothing about either is hardcoded: whether they go out at all, and every word in
them, comes from Campus Settings —

    Send TPO Welcome Email        / TPO Welcome Email Template
    Send Campus Invite Email      / Campus Invite Email Template

Both templates ship as ordinary Email Template records so this works out of the
box; edit them there and the change is live. Delete a template or untick a toggle
and that email simply stops, with a line in the Error Log saying so.

Sending is best-effort throughout: a college with a wrong address or an SMTP
outage must never roll back the institute or the invite that triggered it.
"""

import frappe
from frappe import _

WELCOME_TEMPLATE = "TPO Welcome"
INVITE_TEMPLATE = "Campus Invite"
PRIMARY_TPO_ROLE = "Primary TPO"

WELCOME_ENABLED_FIELD = "send_tpo_welcome_email"
WELCOME_TEMPLATE_FIELD = "tpo_welcome_email_template"
INVITE_ENABLED_FIELD = "send_campus_invite_email"
INVITE_TEMPLATE_FIELD = "campus_invite_email_template"

CONTACT_DT = "Institute TPO Contact"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _settings(enabled_field, template_field, fallback):
	"""``(enabled, template)`` for one mailer, read off Campus Settings."""
	# single_value_or_default, not get_single_value: a site that has not saved
	# Campus Settings since these fields appeared has no row for them, and
	# get_single_value casts that to 0 — which reads as "switched off" and would
	# silence the mail on a fresh site. See recruitment.recruitment.settings_helpers.
	from recruitment.recruitment.settings_helpers import single_value_or_default

	enabled = bool(single_value_or_default("Campus Settings", enabled_field, True))
	template = frappe.db.get_single_value("Campus Settings", template_field) or fallback
	return enabled, template


def _render(template, context, subject_fallback):
	"""``(subject, message)`` from an Email Template, or None when it isn't there."""
	if not (template and frappe.db.exists("Email Template", template)):
		frappe.log_error(
			f"Email Template {template!r} is not set up (Campus Settings), so no mail was sent.",
			"TPO mailer: template missing",
		)
		return None
	from frappe.email.doctype.email_template.email_template import get_email_template

	rendered = get_email_template(template, context)
	return rendered.get("subject") or subject_fallback, rendered.get("message")


def _send(recipients, rendered, reference_doctype, reference_name):
	subject, message = rendered
	frappe.sendmail(
		recipients=recipients,
		subject=subject,
		message=message,
		reference_doctype=reference_doctype,
		reference_name=reference_name,
	)


# ---------------------------------------------------------------------------
# Welcome — Institute after_insert / on_update
# ---------------------------------------------------------------------------

def send_tpo_welcome(doc, method=None):
	"""Welcome the institute's Primary TPO, once.

	Wired to both after_insert and on_update so a Primary TPO added to an existing
	institute is welcomed too — `welcome_sent` on the contact row is what stops
	anyone being mailed twice, on any number of saves.
	"""
	try:
		# Who is owed one is answered from the document in hand, before anything is
		# read: this runs on every institute save, and the settled case (everyone
		# already welcomed) must cost nothing.
		pending = [
			row for row in (doc.get("tpo_contacts") or [])
			if row.get("email") and row.get("role") == PRIMARY_TPO_ROLE
			and not row.get("welcome_sent")
		]
		if not pending:
			return 0

		enabled, template = _settings(WELCOME_ENABLED_FIELD, WELCOME_TEMPLATE_FIELD,
		                              WELCOME_TEMPLATE)
		if not enabled:
			return 0

		sent = 0
		for row in pending:
			link = _provision_and_link(row)
			rendered = _render(template, _welcome_context(doc, row, link),
			                   _("Welcome — {0}").format(doc.get("institute_name") or doc.name))
			if not rendered:
				return sent  # template gone: say so once, don't mark anyone as done
			_send([row.email], rendered, "Institute", doc.name)
			# Marked straight on the row: this runs inside the institute's own save,
			# so touching the parent document again would recurse.
			frappe.db.set_value(CONTACT_DT, row.name, "welcome_sent", 1,
			                    update_modified=False)
			row.welcome_sent = 1
			sent += 1
		return sent
	except Exception:
		frappe.log_error(frappe.get_traceback(), "TPO welcome email failed")
		return 0


def _provision_and_link(contact):
	"""Create the TPO's Desk user and return a set-password link for the welcome mail.

	The welcome email is the only account mail a TPO gets, so the account has to
	exist by the time it is written. Provisioning used to happen at Campus Invite
	submit, which is what made the second mail necessary.

	Best effort, and deliberately so: a provisioning or link-generation failure
	costs the TPO their password link, not their welcome — the template falls back
	to Forgot Password, and the error is in the log for someone to fix.
	"""
	from recruitment.recruitment.tpo_access import (
		generate_set_password_link,
		provision_tpo_user,
	)

	try:
		name = provision_tpo_user(
			email=contact.get("email"),
			full_name=contact.get("contact_name"),
			enabled=True,
			send_email=False,
		)
		if not name:
			return None
		return generate_set_password_link(frappe.get_doc("User", name))
	except Exception:
		frappe.log_error(frappe.get_traceback(), "TPO welcome: user provisioning failed")
		return None


def _welcome_context(institute, contact, set_password_link=None):
	from frappe.utils import get_url

	return {
		"set_password_link": set_password_link,
		"tpo_name": contact.get("contact_name") or contact.get("email"),
		"email": contact.get("email"),
		"role": contact.get("role"),
		"institute": institute.get("institute_name") or institute.name,
		"institute_id": institute.name,
		"city": institute.get("city"),
		"state": institute.get("state"),
		"tier": institute.get("tier"),
		"login_url": get_url("/login"),
		"doc": institute,
	}


# ---------------------------------------------------------------------------
# Campus invite — Campus Invite on_submit
# ---------------------------------------------------------------------------

def send_campus_invite(invite):
	"""Tell every TPO contact of the invited institutes that the drive is on.

	Separate from the Primary TPO's set-password mail: this one is about the drive
	and goes to all the contacts, that one is about their login.
	"""
	try:
		enabled, template = _settings(INVITE_ENABLED_FIELD, INVITE_TEMPLATE_FIELD,
		                              INVITE_TEMPLATE)
		if not enabled:
			return 0

		# One mail per contact rather than one mail addressed to all of them: the
		# template greets the TPO by name, and a single render shared across
		# recipients could only ever say "Dear TPO". Deduped by email, first name
		# wins — the same person can sit on two invited institutes.
		contacts = {}
		for row in (invite.get("tpo_contacts") or []):
			email = (row.get("email") or "").strip().lower()
			if email and email not in contacts:
				contacts[email] = row.get("contact_name") or email
		if not contacts:
			return 0

		# Built once: it runs a query for the opening titles, and none of it varies
		# by recipient.
		base = _invite_context(invite)
		fallback = _("Campus drive — {0}").format(
			invite.get("campus_invite_name") or invite.name)

		sent = 0
		for email, name in contacts.items():
			rendered = _render(template, dict(base, tpo_name=name, email=email), fallback)
			if not rendered:
				return sent  # template gone: logged once, don't retry per contact
			_send([email], rendered, "Campus Invite", invite.name)
			sent += 1
		return sent
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Campus invite email failed")
		return 0


def _invite_context(invite):
	from frappe.utils import get_url

	names = [row.job_opening for row in (invite.get("job_openings") or []) if row.get("job_opening")]
	# One query for the titles, not one per opening.
	titles = {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", names]},
		                        fields=["name", "job_title"])
	} if names else {}
	openings = [{"job_opening": n, "job_title": titles.get(n) or n} for n in names]
	institutes = [row.institute for row in (invite.get("institutes") or []) if row.get("institute")]
	return {
		# The Desk workspace a TPO lands on — the only one their user can see
		# (recruitment.recruitment.tpo_access._restrict_user_modules).
		"tpo_portal_url": get_url("/app/tpo-space"),
		"deadline": (
			frappe.utils.formatdate(invite.get("registration_expiry_date"))
			if invite.get("registration_expiry_date") else None
		),
		"invite": invite.get("campus_invite_name") or invite.name,
		"invite_id": invite.name,
		"region": invite.get("region"),
		"institutes": institutes,
		"institute_list": ", ".join(institutes),
		"openings": openings,
		"opening_list": ", ".join(o["job_title"] for o in openings),
		"login_url": get_url("/login"),
		"doc": invite,
	}


# ---------------------------------------------------------------------------
# The shipped templates — created once, yours to edit thereafter
# ---------------------------------------------------------------------------

DEFAULT_TEMPLATES = {
	WELCOME_TEMPLATE: {
		"subject": "Welcome to the HomeFirst ATS Portal - NOVA Recruitment",
		# `set_password_link` is a one-time reset URL minted per send. The {% if %}
		# is not decoration: provisioning is best-effort, and an email that shows a
		# blank "Set Your Password:" is worse than one that points at Forgot Password.
		"response": """<p>Dear {{ tpo_name }},</p>

<p>Greetings from HomeFirst Finance Company India Limited.</p>

<p>Thank you for partnering with us for campus hiring. Your institute,
<b>{{ institute }}</b>{% if city %}, {{ city }}{% endif %}, is now registered with our
recruitment team, and you have been added as the {{ role }}.</p>

<p>Your TPO account has been created on the Campus Recruitment Portal, where you can
view campus drives, share student registration links, track candidates, and monitor
recruitment progress.</p>

{% if set_password_link %}
<p><b>Set Your Password:</b> <a href="{{ set_password_link }}">{{ set_password_link }}</a></p>
{% else %}
<p><b>Set Your Password:</b> open <a href="{{ login_url }}">{{ login_url }}</a> and use
<b>Forgot Password</b>.</p>
{% endif %}
<p><b>Login Email:</b> {{ email }}<br>
<b>Portal:</b> <a href="{{ login_url }}">Campus Recruitment Portal</a></p>

<p>The password setup link is unique to you and will expire after use or after a short
period.</p>

<p>You will receive an email when the Campus Recruitment Team sends a campus invitation
for student registrations.</p>

<p>Warm regards,<br>
Talent Team<br>
HomeFirst Finance Company India Limited</p>""",
	},
	INVITE_TEMPLATE: {
		"subject": "Invitation to Participate in the HomeFirst Campus Recruitment Drive",
		# `deadline` is the invite's Registration Expiry Date, which is optional —
		# hence the {% else %}. "by None" in a mail to a college is not recoverable.
		"response": """<p>Dear {{ tpo_name }},</p>

<p>Greetings from HomeFirst Finance Company India Limited.</p>

<p>We are delighted to welcome your students to participate in our Campus Recruitment
Drive.</p>

<p>To initiate the registration process, kindly upload the list of eligible students by
logging in to the TPO portal using the link mentioned below:</p>

<p><b>TPO Portal Link:</b> <a href="{{ tpo_portal_url }}">{{ tpo_portal_url }}</a></p>

{% if opening_list %}<p><b>Roles we are hiring for:</b> {{ opening_list }}</p>{% endif %}

<p>Once the student details are uploaded by your institute, an automated notification
will be sent to the respective students with a link to complete their application and
register for the campus drive. Students will be required to fill in the application form
and submit their details to confirm their participation.</p>

{% if deadline %}
<p>We request you to upload the candidate details by <b>{{ deadline }}</b> to ensure
timely completion of the registration process.</p>
{% else %}
<p>We request you to upload the candidate details at the earliest to ensure timely
completion of the registration process.</p>
{% endif %}

<p>Please feel free to reach out in case of any queries or assistance.</p>

<p>We look forward to partnering with your institute and welcoming your students to
HomeFirst.</p>

<p>Warm regards,<br>
Talent Team<br>
HomeFirst Finance Company India Limited</p>""",
	},
}


def ensure_default_email_templates():
	"""Create the two templates if they aren't there. Idempotent, and it never
	rewrites one that exists — the wording is yours once it has shipped."""
	created = []
	for name, body in DEFAULT_TEMPLATES.items():
		if frappe.db.exists("Email Template", name):
			continue
		# `response` (Text Editor), not `response_html`: with use_html ticked Frappe
		# renders response_html and ignores this, which is an email with no body.
		doc = frappe.get_doc({
			"doctype": "Email Template", "name": name,
			"subject": body["subject"], "response": body["response"], "use_html": 0,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		created.append(name)
	return created
