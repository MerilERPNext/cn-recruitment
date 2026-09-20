"""The email a campus panelist gets when candidates are assigned to them.

ONE mail per interviewer, listing every candidate they were just given — not one
mail per interview. A drive deals a panelist five candidates in a single click
(`schedule_round_interviews`), and five separate "you have an interview" mails
about the same round is noise nobody reads.

Driven entirely by configuration, like the other campus mailers:

    Campus Settings -> Send Interview Panel Email
                    -> Interview Panel Email Template

Off by default. With it off nothing here runs and campus scheduling behaves
exactly as it did before this file existed.

WHERE IT IS CALLED FROM
-----------------------
Every campus path that puts a panelist on an interview, each of which already
holds the whole batch when it finishes:

    schedule_round_interviews   the bulk deal (and the self-schedule wrapper)
    reassign_round_interview    a candidate moved to another panelist
    create_extra_interview      an additional round

Always after the caller's own `frappe.db.commit()`, and always best-effort: an
SMTP outage or a panelist with no email must never undo interviews that are
already scheduled.

SENT ONCE PER PERSON PER INTERVIEW
----------------------------------
`Interview Detail.custom_panel_notified` is stamped on the row, only after the
mail has gone. Re-running a schedule, saving the interview again, or switching
only the mode therefore mails nobody. A reassignment replaces the row, so the new
panelist is told and the old one is not written to again.
"""

import frappe
from frappe import _
from frappe.utils import format_date, format_time, get_url, cint, validate_email_address

from recruitment.recruitment.communication_log import sendmail_with_log

SETTINGS = "Campus Settings"
ENABLED_FIELD = "send_interview_panel_email"
TEMPLATE_FIELD = "interview_panel_email_template"

TEMPLATE = "Campus Interview Panel Assignment"
NOTIFIED_FIELD = "custom_panel_notified"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def notifications_enabled():
	"""Campus Settings -> Send Interview Panel Email.

	Read as a plain single value: this ships switched OFF, so an unsaved / absent
	row reading as 0 is the intended answer, not a fresh-site accident.
	"""
	return bool(cint(frappe.db.get_single_value(SETTINGS, ENABLED_FIELD)))


def _template_name():
	return frappe.db.get_single_value(SETTINGS, TEMPLATE_FIELD) or TEMPLATE


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def notify_panel(interviews):
	"""Mail each interviewer once about the interviews they were just assigned.

	`interviews` is a list of Interview names — whatever the caller just created or
	changed. Returns `{mailed, interviewers, skipped}` for the caller's result
	payload; never raises, whatever goes wrong.
	"""
	result = {"mailed": 0, "interviewers": 0, "skipped": 0}
	try:
		names = [n for n in (interviews or []) if n]
		if not names or not notifications_enabled():
			return result

		assignments = _pending_assignments(names)
		if not assignments:
			return result

		details = _interview_details(list({row.parent for row in assignments}))
		recipients = _recipients({row.interviewer for row in assignments if row.interviewer})

		by_interviewer = {}
		for row in assignments:
			if not row.interviewer or row.parent not in details:
				continue
			by_interviewer.setdefault(row.interviewer, []).append(row)

		for interviewer, rows in by_interviewer.items():
			contact = recipients.get(interviewer)
			if not contact:
				# No login, disabled, or no usable address — nothing to send to. The
				# rows stay un-notified so a later fix still reaches them.
				result["skipped"] += len(rows)
				continue
			if _send_one(contact, rows, details):
				for row in rows:
					frappe.db.set_value("Interview Detail", row.name, NOTIFIED_FIELD, 1,
					                    update_modified=False)
				result["mailed"] += len(rows)
				result["interviewers"] += 1
			else:
				result["skipped"] += len(rows)

		frappe.db.commit()

	except Exception:
		frappe.log_error(frappe.get_traceback(), "Campus interview panel mail failed")

	return result


# ---------------------------------------------------------------------------
# What has to go out
# ---------------------------------------------------------------------------

def _pending_assignments(names):
	"""The panel rows on these interviews that have not been mailed about yet."""
	return frappe.get_all(
		"Interview Detail",
		filters={"parent": ["in", names], "parenttype": "Interview", NOTIFIED_FIELD: 0},
		fields=["name", "parent", "interviewer"],
		order_by="parent asc, idx asc",
	)


def _interview_details(names):
	"""`{interview: {...}}` — everything the mail says about each interview.

	Three queries for the whole batch, not three per interview: a round of sixty
	candidates goes through here in one click.
	"""
	from recruitment.api.hiring_stage import get_interview_round_field

	round_field = get_interview_round_field() or "interview_round"
	fields = ["name", "job_applicant", "designation", "scheduled_on", "from_time", "to_time",
	          "custom_campus_drive", "custom_campus_round_code"]
	if frappe.get_meta("Interview").has_field(round_field):
		fields.append(round_field)

	interviews = frappe.get_all(
		"Interview",
		filters={"name": ["in", names], "docstatus": ["<", 2]},
		fields=fields,
		order_by="scheduled_on asc, from_time asc",
	)
	if not interviews:
		return {}

	applicants = {
		row.name: row.applicant_name
		for row in frappe.get_all(
			"Job Applicant",
			filters={"name": ["in", [i.job_applicant for i in interviews if i.job_applicant]]},
			fields=["name", "applicant_name"],
		)
	} if any(i.job_applicant for i in interviews) else {}

	details = {}
	for iv in interviews:
		details[iv.name] = {
			"interview": iv.name,
			"job_applicant": iv.job_applicant,
			"candidate": applicants.get(iv.job_applicant) or iv.job_applicant or "",
			"designation": iv.designation or "",
			"round": iv.get(round_field) or "",
			"scheduled_on": format_date(iv.scheduled_on) if iv.scheduled_on else "",
			"from_time": format_time(iv.from_time) if iv.from_time else "",
			"to_time": format_time(iv.to_time) if iv.to_time else "",
			"campus_drive": iv.custom_campus_drive or "",
			"round_code": iv.custom_campus_round_code or "",
			"url": get_url(f"/app/interview/{iv.name}"),
		}
	return details


def _recipients(users):
	"""`{user: (email, full_name)}` for the enabled users among `users`."""
	users = [u for u in users if u]
	if not users:
		return {}

	out = {}
	for row in frappe.get_all(
		"User",
		filters={"name": ["in", users], "enabled": 1},
		fields=["name", "email", "full_name"],
	):
		email = (row.email or row.name or "").strip()
		if email and validate_email_address(email, throw=False):
			out[row.name] = (email, row.full_name or email)
	return out


# ---------------------------------------------------------------------------
# The mail
# ---------------------------------------------------------------------------

def _send_one(contact, rows, details):
	"""One interviewer's mail. True when it went out."""
	email, full_name = contact
	assigned = [details[row.parent] for row in rows if row.parent in details]
	if not assigned:
		return False

	context = _context(full_name, assigned)
	subject, message = _render(context)
	if not message:
		return False

	# Referenced to the drive when the batch is one drive's (the usual case), else
	# to the single interview — so the mail lands on a timeline someone will look at.
	drives = {row["campus_drive"] for row in assigned if row["campus_drive"]}
	if len(drives) == 1:
		reference = ("Campus Drive", drives.pop())
	elif len(assigned) == 1:
		reference = ("Interview", assigned[0]["interview"])
	else:
		reference = (None, None)

	sendmail_with_log(
		recipients=[email],
		subject=subject,
		message=message,
		reference_doctype=reference[0],
		reference_name=reference[1],
	)
	return True


def _context(full_name, assigned):
	rounds = {row["round"] for row in assigned if row["round"]}
	dates = {row["scheduled_on"] for row in assigned if row["scheduled_on"]}
	return {
		"interviewer_name": full_name,
		"count": len(assigned),
		"interviews": assigned,
		# Ready-made table, so the shipped template stays readable and a site that
		# rewrites it can still just drop {{ interview_table }} in.
		"interview_table": _table(assigned),
		# Only when the whole batch agrees on one — a mixed batch leaves them blank
		# rather than claiming a round or date that is true of some rows only.
		"round": rounds.pop() if len(rounds) == 1 else "",
		"scheduled_on": dates.pop() if len(dates) == 1 else "",
		"portal_url": get_url("/app/interview"),
	}


def _table(assigned):
	head = (
		"<table border='1' cellpadding='6' cellspacing='0' "
		"style='border-collapse:collapse;font-size:13px'>"
		f"<tr><th>{_('Candidate')}</th><th>{_('Designation')}</th><th>{_('Round')}</th>"
		f"<th>{_('Date')}</th><th>{_('Time')}</th><th>{_('Interview')}</th></tr>"
	)
	body = []
	for row in assigned:
		timing = " - ".join([t for t in (row["from_time"], row["to_time"]) if t])
		body.append(
			"<tr>"
			f"<td>{frappe.utils.escape_html(row['candidate'])}</td>"
			f"<td>{frappe.utils.escape_html(row['designation'])}</td>"
			f"<td>{frappe.utils.escape_html(row['round'])}</td>"
			f"<td>{frappe.utils.escape_html(row['scheduled_on'])}</td>"
			f"<td>{frappe.utils.escape_html(timing)}</td>"
			f"<td><a href=\"{row['url']}\">{frappe.utils.escape_html(row['interview'])}</a></td>"
			"</tr>"
		)
	return head + "".join(body) + "</table>"


DEFAULT_TEMPLATE = {
	"subject": "Interview Panel Assignment | {{ count }} candidate(s) assigned to you",
	"response": """<p>Dear {{ interviewer_name }},</p>

<p>
You have been assigned as an interviewer for the following candidate(s).
{% if scheduled_on %}The interviews are scheduled on <b>{{ scheduled_on }}</b>.{% endif %}
</p>

{{ interview_table }}

<p>
Please click on the Interview ID above to open the interview, and
<b>submit your feedback</b> once the interview is done. The candidate cannot move
ahead in the process until your feedback is in.
</p>

<p>
Regards,<br>
Talent Acquisition Team
</p>""",
}


def _render(context):
	"""`(subject, message)` from the configured Email Template.

	Falls back to the built-in wording when the template has been deleted, so a
	missing record costs the panel its formatting, never the notification itself.
	"""
	name = _template_name()
	if name and frappe.db.exists("Email Template", name):
		from frappe.email.doctype.email_template.email_template import get_email_template

		rendered = get_email_template(name, context)
		message = rendered.get("message")
		if message:
			return rendered.get("subject") or _("Interview Panel Assignment"), message

	frappe.log_error(
		f"Email Template {name!r} is not set up (Campus Settings -> Interview Panel Email "
		"Template), so the built-in wording was used.",
		"Campus panel mailer: template missing",
	)
	return (
		frappe.render_template(DEFAULT_TEMPLATE["subject"], context),
		frappe.render_template(DEFAULT_TEMPLATE["response"], context),
	)


def ensure_default_email_template():
	"""Create the template if it isn't there. Idempotent, and it never rewrites one
	that exists — the wording is yours once it has shipped."""
	if frappe.db.exists("Email Template", TEMPLATE):
		return None

	doc = frappe.get_doc({
		"doctype": "Email Template",
		"name": TEMPLATE,
		"subject": DEFAULT_TEMPLATE["subject"],
		# `response` (Text Editor) with use_html 0: with use_html ticked Frappe
		# renders response_html and ignores this, which is an email with no body.
		"response": DEFAULT_TEMPLATE["response"],
		"use_html": 0,
	})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	return TEMPLATE
