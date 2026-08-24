"""The email an external recruiter gets when a job opening is assigned to them.

A Job Opening carries its channels in ``custom_posting_options``; a row with
``post_to`` of "External Recruiter" or "External Recruiter Group" is what grants
a recruiter sight of that opening (see
``recruitment.permissions.doc_type_permissions``). Being granted access is not
the same as being told, so this mails them: which role, where to log in, how to
submit candidates, and by when.

Wired to Job Opening after_insert AND on_update — a recruiter added to an opening
that already exists is assigned just as much as one named at creation.

Nobody is mailed twice. Each posting row records the recruiter names it has
already written to in ``notified_recruiters``, and only the difference is mailed.
That is per-recruiter rather than a single "sent" flag on purpose: a group row
expands to its current members, and a member who joins the group next week is
newly assigned and gets their own mail, while the ones already told stay quiet.

Configuration lives in Recruitment Settings → Job Posting Settings:

    Send External Recruiter Assignment Email  / External Recruiter Assignment Email Template

Sending is best-effort throughout: a wrong address or an SMTP outage must never
roll back the opening that triggered it.
"""

import frappe
from frappe import _

ASSIGNMENT_TEMPLATE = "External Recruiter Job Opening Assigned"

ENABLED_FIELD = "send_external_recruiter_assignment_email"
TEMPLATE_FIELD = "external_recruiter_assignment_email_template"

POSTING_FIELD = "custom_posting_options"
CHANNEL_DIRECT = "External Recruiter"
CHANNEL_GROUP = "External Recruiter Group"
EXTERNAL_CHANNELS = (CHANNEL_DIRECT, CHANNEL_GROUP)

ROW_DT = "Job Opening Posting Channel"
RECRUITER_DT = "TA External Recruiter"


def _split(value):
	if not value:
		return []
	return [v.strip() for v in str(value).split(",") if v.strip()]


def _settings():
	"""``(enabled, template)`` read off Recruitment Settings.

	single_value_or_default, not get_single_value: a site that has not saved the
	settings form since this field appeared has no row for it, and get_single_value
	casts that to 0 — which would read as "switched off" and silence the mail
	everywhere. See recruitment.recruitment.settings_helpers.
	"""
	from recruitment.recruitment.settings_helpers import single_value_or_default

	enabled = bool(single_value_or_default("Recruitment Settings", ENABLED_FIELD, True))
	template = (
		frappe.db.get_single_value("Recruitment Settings", TEMPLATE_FIELD)
		or ASSIGNMENT_TEMPLATE
	)
	return enabled, template


def _row_recruiters(row):
	"""The TA External Recruiter names a posting row assigns, in row order.

	A direct row names one; a group row expands to the group's current members.
	"""
	post_to = row.get("post_to")
	if post_to == CHANNEL_DIRECT:
		return [row.get("external_recruiter")] if row.get("external_recruiter") else []
	if post_to == CHANNEL_GROUP and row.get("external_recruiter_group"):
		return frappe.get_all(
			"TA External Recruiter Group Member",
			filters={
				"parenttype": "TA External Recruiter Group",
				"parent": row.get("external_recruiter_group"),
			},
			pluck="external_recruiter",
			order_by="idx",
		)
	return []


def _window_has_closed(row):
	"""True when this row's posting window ended before today.

	The mail asks them to go and upload candidates; against an opening they can no
	longer see, that is an instruction they cannot follow. A window that has not
	opened yet is still worth telling them about — it carries its own deadline.
	"""
	from frappe.utils import getdate, today

	return bool(row.get("display_to")) and getdate(row.get("display_to")) < getdate(today())


def notify_assigned_recruiters(doc, method=None):
	"""Mail every external recruiter newly assigned to this opening."""
	try:
		# Answered from the document in hand before anything is read: this runs on
		# every Job Opening save, and the settled case must cost nothing.
		rows = [
			row for row in (doc.get(POSTING_FIELD) or [])
			if row.get("post_to") in EXTERNAL_CHANNELS
		]
		if not rows:
			return 0

		enabled, template = _settings()
		if not enabled:
			return 0

		sent = 0
		for row in rows:
			if _window_has_closed(row):
				continue
			already = set(_split(row.get("notified_recruiters")))
			fresh = [r for r in _row_recruiters(row) if r and r not in already]
			if not fresh:
				continue

			mailed = _notify_row(doc, row, fresh, template)
			if not mailed:
				continue

			# Written straight to the child row: this runs inside the opening's own
			# save, so touching the parent again would recurse.
			value = ", ".join(sorted(already | set(mailed)))
			frappe.db.set_value(ROW_DT, row.name, "notified_recruiters", value,
			                    update_modified=False)
			row.notified_recruiters = value
			sent += len(mailed)
		return sent
	except Exception:
		frappe.log_error(frappe.get_traceback(),
		                 "External recruiter assignment email failed")
		return 0


def _notify_row(opening, row, recruiters, template):
	"""Mail each recruiter of one posting row. Returns those actually written to."""
	details = frappe.get_all(
		RECRUITER_DT,
		filters={"name": ["in", recruiters]},
		fields=["name", "external_recruiter_name", "external_recruiter_email"],
	)
	by_name = {d.name: d for d in details}

	base = _assignment_context(opening, row)
	fallback = _("Upload candidate profiles — {0}").format(
		opening.get("job_title") or opening.name)

	mailed = []
	for recruiter in recruiters:
		info = by_name.get(recruiter)
		email = (info.get("external_recruiter_email") or "").strip() if info else ""
		if not email:
			# No address to write to. Recorded as notified anyway would be a lie, so
			# they stay pending and are picked up once an email is filled in.
			continue

		context = dict(
			base,
			recruiter=recruiter,
			recruiter_name=info.get("external_recruiter_name") or email,
			email=email,
		)
		rendered = _render(template, context, fallback)
		if not rendered:
			return mailed  # template gone: logged once, don't retry per recruiter

		subject, message = rendered
		frappe.sendmail(
			recipients=[email],
			subject=subject,
			message=message,
			reference_doctype="Job Opening",
			reference_name=opening.name,
		)
		mailed.append(recruiter)
	return mailed


def _render(template, context, subject_fallback):
	"""``(subject, message)`` from an Email Template, or None when it isn't there."""
	if not (template and frappe.db.exists("Email Template", template)):
		frappe.log_error(
			f"Email Template {template!r} is not set up (Recruitment Settings -> Job "
			f"Posting Settings), so no mail was sent.",
			"External recruiter mailer: template missing",
		)
		return None
	from frappe.email.doctype.email_template.email_template import get_email_template

	rendered = get_email_template(template, context)
	return rendered.get("subject") or subject_fallback, rendered.get("message")


def _assignment_context(opening, row):
	from frappe.utils import get_url

	return {
		"job_title": opening.get("job_title") or opening.get("designation") or opening.name,
		"designation": opening.get("designation"),
		"department": opening.get("department"),
		"location": opening.get("location"),
		"company": opening.get("company"),
		"vacancies": opening.get("vacancies"),
		"opening": opening.name,
		# The Desk workspace an external recruiter lands on — the only one their
		# user can see (ta_external_recruiter._restrict_user_modules).
		"portal_url": get_url("/app/external-recruiter"),
		"opening_url": get_url(f"/app/job-opening/{opening.name}"),
		# The posting window's end is the date they are being asked to work to.
		"deadline": (
			frappe.utils.formatdate(row.get("display_to")) if row.get("display_to") else None
		),
		"doc": opening,
	}


# The template's wording is HomeFirst's and lives in
# ``homefirst_customs.email_templates``, installed by
# ``homefirst_customs.patches.seed_recruitment_email_templates``. When the record
# is absent _render logs it and sends nothing, rather than inventing a body.
