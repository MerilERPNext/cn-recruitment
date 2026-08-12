"""The two emails a TPO gets, both driven entirely by configuration.

  Welcome       — when an institute's Primary TPO is recorded (on creation, and on
                  any later edit that adds one). Once per contact, ever.
  Campus invite — when a Campus Invite is submitted, to every TPO contact of the
                  invited institutes. The Primary TPO also gets their existing
                  "set your password" mail (recruitment.recruitment.tpo_access);
                  the two say different things and are sent independently.

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
	enabled = frappe.db.get_single_value("Campus Settings", enabled_field)
	# A site that predates the field (None) keeps the shipped default: on.
	enabled = True if enabled is None else bool(enabled)
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
			rendered = _render(template, _welcome_context(doc, row),
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


def _welcome_context(institute, contact):
	from frappe.utils import get_url

	return {
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

		recipients = list(dict.fromkeys(
			row.email for row in (invite.get("tpo_contacts") or []) if row.get("email")
		))
		if not recipients:
			return 0

		rendered = _render(template, _invite_context(invite),
		                   _("Campus drive — {0}").format(invite.get("campus_invite_name") or invite.name))
		if not rendered:
			return 0
		_send(recipients, rendered, "Campus Invite", invite.name)
		return len(recipients)
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
		"subject": "Welcome to our campus hiring programme — {{ institute }}",
		"response": """<p>Dear {{ tpo_name }},</p>

<p>Thank you for partnering with us on campus hiring. <b>{{ institute }}</b> is now
registered with our recruitment team{% if city %}, {{ city }}{% endif %}.</p>

<p>You are recorded as the {{ role }} for your institute. When we run a drive at
your campus you will receive an invite by email, along with access to the TPO Desk
where you can track candidates, share the registration link with students and
follow the drive as it progresses.</p>

<p>Nothing is needed from you right now — we will be in touch with drive dates.</p>

<p>Warm regards,<br>Campus Recruitment Team</p>""",
	},
	INVITE_TEMPLATE: {
		"subject": "Campus drive invitation — {{ invite }}",
		"response": """<p>Dear TPO,</p>

<p>We would like to invite <b>{{ institute_list }}</b> to participate in our campus
drive: <b>{{ invite }}</b>.</p>

{% if opening_list %}<p><b>Roles we are hiring for:</b> {{ opening_list }}</p>{% endif %}
{% if region %}<p><b>Region:</b> {{ region }}</p>{% endif %}

<p>Please share this with your eligible students. Your TPO Desk login gives you the
student registration link and lets you follow the drive — candidates registered,
shortlists and results — as it runs. If this is your first drive with us, you will
receive a separate email to set your password.</p>

<p>Do let us know your preferred dates and any support you need from our side.</p>

<p>Warm regards,<br>Campus Recruitment Team</p>""",
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
