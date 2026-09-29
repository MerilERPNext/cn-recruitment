"""Direct Applicant Onboarding — Phase 2: the form a direct applicant fills.

HR picks a Direct Applicant Form (a template of Job Applicant fields) and sends
it. Each send is a Direct Applicant Form Request carrying:

  * a random link token — only its SHA-256 is stored, so the link cannot be
    rebuilt from the database; it expires after Recruitment Settings ->
    "Form Link Validity (Days)" and dies when HR revokes or re-sends;
  * a snapshot of the form's fields as sent, so editing the template later never
    changes an open link.

The candidate opens /direct-applicant-form?t=<token> without logging in, fills
the fields, and the values land on the Job Applicant. There is no per-field
approval: once every mandatory field is filled HR may move on (the CTC
proposal), or ask the candidate to resubmit chosen fields with a note — that
reopens the same link for just those fields.

After a submission the full Duplicity Check runs again with everything the
candidate supplied (PAN etc. — see direct_applicant.defers_missing_match_keys).
A match does not lose the candidate's data: it is saved, and the applicant is
flagged for HR instead.

HR endpoints (desk):
    get_form_state(job_applicant)
    get_forms_for_applicant(job_applicant)
    send_form(job_applicant, form)
    request_resubmission(job_applicant, fields, note)
    revoke_form(job_applicant)
    clear_duplicity_flag(job_applicant)
Candidate endpoints (guest, token-guarded) live in direct_applicant_portal.py.
"""

import hashlib
import json
import secrets

import frappe
from frappe import _
from frappe.utils import add_days, cint, get_url, get_datetime, now_datetime

from recruitment.api.direct_applicant import (
	CATEGORY_FIELD,
	DIRECT_FLAG,
	SETTINGS,
	is_direct,
	is_enabled,
)

FORM = "Direct Applicant Form"
REQUEST = "Direct Applicant Form Request"
ACTION_ITEM = "Candidate Action Center Item"
PAGE_ROUTE = "direct-applicant-form"

SENT = "Sent"
SUBMITTED = "Submitted"
RESUBMIT = "Resubmission Requested"
REVOKED = "Revoked"
# The candidate can fill / refill the form in these states.
OPEN_STATES = (SENT, RESUBMIT)

STATUS_FIELD = "custom_da_form_status"
DUPLICITY_FLAG = "custom_da_duplicity_flag"
DUPLICITY_NOTE = "custom_da_duplicity_note"

DEFAULT_EXPIRY_DAYS = 7


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #
def hash_token(token):
	return hashlib.sha256((token or "").encode()).hexdigest()


def form_link(token):
	"""The emailed link. Opens the candidate portal's page when Campus Settings ->
	Candidate Portal URL is set, else this site's own /direct-applicant-form page
	(same path, same token endpoints)."""
	return portal_url(f"/{PAGE_ROUTE}?t={token}")


def expiry_days():
	return cint(frappe.db.get_single_value(SETTINGS, "da_form_link_expiry_days")) or DEFAULT_EXPIRY_DAYS


# --------------------------------------------------------------------------- #
# Guards
# --------------------------------------------------------------------------- #
def _require_hr(job_applicant, ptype="write"):
	"""Feature on, caller may edit the applicant, and the applicant is direct."""
	if not is_enabled():
		frappe.throw(_("Direct Applicant Onboarding is not enabled in Recruitment Settings."))
	applicant = frappe.get_doc("Job Applicant", job_applicant)
	applicant.check_permission(ptype)
	if not is_direct(applicant):
		frappe.throw(_("{0} is not a direct applicant.").format(frappe.bold(applicant.name)))
	return applicant


def latest_request(job_applicant):
	"""The newest request for the applicant (any status), or None."""
	name = frappe.db.get_value(
		REQUEST, {"job_applicant": job_applicant}, "name", order_by="creation desc"
	)
	return frappe.get_doc(REQUEST, name) if name else None


def snapshot_fields(request):
	return json.loads(request.field_snapshot or "[]")


# --------------------------------------------------------------------------- #
# HR: state
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def get_form_state(job_applicant):
	"""What the Job Applicant form shows for the direct-applicant form flow."""
	if not is_enabled():
		return {"enabled": False}
	applicant = frappe.get_doc("Job Applicant", job_applicant)
	applicant.check_permission("read")
	if not is_direct(applicant):
		return {"enabled": True, "direct": False}

	request = latest_request(applicant.name)
	state = {
		"enabled": True,
		"direct": True,
		"can_write": bool(applicant.has_permission("write")),
		"duplicity_flag": cint(applicant.get(DUPLICITY_FLAG)),
		"duplicity_note": applicant.get(DUPLICITY_NOTE) or "",
		"request": None,
	}
	from recruitment.api import ctc_proposal as cp

	state["proposal"] = frappe.db.get_value(
		cp.DOCTYPE, {"job_applicant": applicant.name}, ["name", "status", "version"],
		order_by="creation desc", as_dict=True,
	)
	ok, reason = cp.can_raise(applicant.name, applicant=applicant, request=request)
	state["can_propose"] = ok and bool(frappe.has_permission(cp.DOCTYPE, "create"))
	state["propose_reason"] = reason
	if request:
		fields = snapshot_fields(request)
		state["request"] = {
			"name": request.name,
			"form": request.form,
			"status": request.status,
			"sent_on": request.sent_on,
			"expires_on": request.expires_on,
			"expired": _is_expired(request),
			"submitted_on": request.submitted_on,
			"resubmit_fields": json.loads(request.resubmit_fields or "[]"),
			"resubmit_note": request.resubmit_note or "",
			"fields": [{"fieldname": f["fieldname"], "label": f["label"], "reqd": f["reqd"]} for f in fields],
			"missing_mandatory": missing_mandatory(applicant, fields),
		}
	return state


@frappe.whitelist()
def get_forms_for_applicant(job_applicant):
	"""Enabled forms that apply to the applicant's company and category. When
	none does, the Default Form (if any) — so every applicant has a form."""
	applicant = _require_hr(job_applicant, "read")
	company = applicant.get("custom_company_finalized")
	category = applicant.get(CATEGORY_FIELD)
	forms = frappe.get_all(
		FORM, filters={"disabled": 0}, fields=["name", "company", "category", "is_default"], order_by="name asc"
	)
	applies = [
		f for f in forms
		if (not f.company or f.company == company) and (not f.category or f.category == category)
	]
	return [f.name for f in applies if not f.is_default] or [f.name for f in applies if f.is_default]


def _is_expired(request):
	return bool(request.expires_on) and get_datetime(request.expires_on) < now_datetime()


# --------------------------------------------------------------------------- #
# HR: send / resubmit / revoke
# --------------------------------------------------------------------------- #
@frappe.whitelist(methods=["POST"])
def send_form(job_applicant, form):
	"""Send ``form`` to the applicant. Revokes any earlier open link first."""
	applicant = _require_hr(job_applicant)
	_block_while_proposal(applicant.name)
	if form not in get_forms_for_applicant(applicant.name):
		frappe.throw(_("Form {0} is not available for this applicant.").format(frappe.bold(form)))
	if not applicant.email_id:
		frappe.throw(_("The applicant has no email address to send the form to."))

	from recruitment.api.direct_applicant_fields import build_field_snapshot

	fields = build_field_snapshot(frappe.get_doc(FORM, form), applicant)
	if not fields:
		frappe.throw(_("Form {0} has no field that can be asked for.").format(frappe.bold(form)))

	previous = latest_request(applicant.name)
	_revoke_open_requests(applicant.name)

	token = secrets.token_urlsafe(32)
	request = frappe.get_doc({
		# A match HR already reviewed and cleared is not flagged again on a re-send.
		"duplicity_cleared": cint(previous.duplicity_cleared) if previous else 0,
		"doctype": REQUEST,
		"job_applicant": applicant.name,
		"form": form,
		"status": SENT,
		"sent_by": frappe.session.user,
		"sent_on": now_datetime(),
		"expires_on": add_days(now_datetime(), expiry_days()),
		"token_hash": hash_token(token),
		"field_snapshot": json.dumps(fields),
	})
	request.insert(ignore_permissions=True)

	_set_applicant_status(applicant.name, SENT)
	ensure_portal_account(applicant)
	_sync_action_item(request, token, _("Please fill in your details to proceed with your application."))
	_email_candidate(request, token)
	return {"request": request.name, "expires_on": request.expires_on}


@frappe.whitelist(methods=["POST"])
def request_resubmission(job_applicant, fields, note=None):
	"""Reopen the submitted form for just ``fields`` (JSON list), with ``note``.

	A new token is issued (the old link stops working), the expiry restarts, and
	the candidate is emailed the new link.
	"""
	applicant = _require_hr(job_applicant)
	_block_while_proposal(applicant.name)
	request = latest_request(applicant.name)
	if not request or request.status != SUBMITTED:
		frappe.throw(_("Resubmission can only be requested after the candidate has submitted the form."))

	if isinstance(fields, str):
		fields = json.loads(fields or "[]")
	known = {f["fieldname"] for f in snapshot_fields(request)}
	fields = [f for f in (fields or []) if f in known]
	if not fields:
		frappe.throw(_("Select at least one field the candidate should resubmit."))

	token = secrets.token_urlsafe(32)
	request.update({
		"status": RESUBMIT,
		"resubmit_fields": json.dumps(fields),
		"resubmit_note": (note or "").strip(),
		"resubmission_count": cint(request.resubmission_count) + 1,
		"token_hash": hash_token(token),
		"expires_on": add_days(now_datetime(), expiry_days()),
	})
	request.save(ignore_permissions=True)

	_set_applicant_status(applicant.name, RESUBMIT)
	_sync_action_item(request, token, _("Some of your details need to be corrected. Please resubmit them."))
	_email_candidate(request, token, resubmission=True)
	return {"request": request.name, "expires_on": request.expires_on}


@frappe.whitelist(methods=["POST"])
def revoke_form(job_applicant):
	"""Kill the open link (if any). The candidate can no longer open it."""
	applicant = _require_hr(job_applicant)
	_block_while_proposal(applicant.name)
	revoked = _revoke_open_requests(applicant.name)
	if not revoked:
		frappe.throw(_("There is no open form link to revoke."))
	_set_applicant_status(applicant.name, REVOKED)
	return {"revoked": revoked}


def _block_while_proposal(job_applicant):
	"""The CTC Proposal was made on the details the candidate submitted: while one
	is in play the form cannot be reopened, re-sent or revoked underneath it."""
	from recruitment.api import ctc_proposal as cp

	live = frappe.db.get_value(cp.DOCTYPE, {"job_applicant": job_applicant, "status": ["in", cp.LIVE]}, "name")
	if live:
		frappe.throw(
			_("CTC Proposal {0} is in progress for this applicant. Withdraw it (or delete the draft) before changing the form.").format(
				frappe.bold(live)
			),
			title=_("CTC Proposal in Progress"),
		)


def _revoke_open_requests(job_applicant):
	names = frappe.get_all(
		REQUEST, filters={"job_applicant": job_applicant, "status": ["in", OPEN_STATES]}, pluck="name"
	)
	for name in names:
		request = frappe.get_doc(REQUEST, name)
		request.status = REVOKED
		request.token_hash = None
		request.save(ignore_permissions=True)
		_close_action_item(request)
	return names


@frappe.whitelist(methods=["POST"])
def clear_duplicity_flag(job_applicant):
	"""HR has looked at the duplicity match and lets the candidate proceed."""
	applicant = _require_hr(job_applicant)
	if not cint(applicant.get(DUPLICITY_FLAG)):
		return {"cleared": False}
	note = applicant.get(DUPLICITY_NOTE) or ""
	applicant.db_set({DUPLICITY_FLAG: 0, DUPLICITY_NOTE: None})
	# Resubmissions on this link are not flagged again for the match HR accepted.
	request = latest_request(applicant.name)
	if request:
		request.db_set("duplicity_cleared", 1)
	applicant.add_comment(
		"Info", _("Duplicity match cleared by {0}. Match was: {1}").format(frappe.session.user, note)
	)
	return {"cleared": True}


# --------------------------------------------------------------------------- #
# Completeness
# --------------------------------------------------------------------------- #
def missing_mandatory(applicant, fields):
	"""Labels of mandatory form fields still blank on the applicant."""
	from recruitment.api.direct_applicant_fields import is_blank_value

	return [f["label"] for f in fields if f.get("reqd") and is_blank_value(applicant, f)]


def form_ready_for_proposal(job_applicant, applicant=None, request=None):
	"""(ok, reason) — the gate the CTC proposal checks (when raised and when sent).
	Pass ``applicant`` / ``request`` when already loaded, to skip re-reading them."""
	applicant = applicant or frappe.get_doc("Job Applicant", job_applicant)
	request = request or latest_request(job_applicant)
	if not request or request.status != SUBMITTED:
		return False, _("The candidate has not submitted the form yet.")
	missing = missing_mandatory(applicant, snapshot_fields(request))
	if missing:
		return False, _("Mandatory details are still missing: {0}").format(", ".join(missing))
	if cint(applicant.get(DUPLICITY_FLAG)):
		return False, _("A duplicity match was found. Review and clear it first.")
	return True, ""


# --------------------------------------------------------------------------- #
# Applicant status / action center / email
# --------------------------------------------------------------------------- #
def _set_applicant_status(job_applicant, status):
	# db_set: a status stamp must not run the applicant's whole save chain.
	frappe.db.set_value("Job Applicant", job_applicant, STATUS_FIELD, status, update_modified=False)


# Candidate Portal page the Action Center card opens (the portal's own route).
PORTAL_ROUTE = "/direct_applicant_form"


def _sync_action_item(request, token, description):
	"""The candidate's Action Center card for the form.

	It links to the Candidate Portal page by request name only — no token. The
	Action Center item endpoints return items to anyone who names the
	candidate's email, so the link must be useless on its own: the portal page's
	endpoints (direct_applicant_portal.get_my_form ...) serve the request only to
	the logged-in candidate it was sent to. ``token`` stays out of it.
	"""
	from recruitment.api.action_center import _upsert_minimal_item

	item = _upsert_minimal_item(
		candidate_email=request.email,
		reference_doctype=REQUEST,
		reference_docname=request.name,
		redirect_url=f"{PORTAL_ROUTE}?request={request.name}",
		description=description,
		commit=False,
	)
	frappe.db.set_value(ACTION_ITEM, item.name, "status", "Action Required", update_modified=False)
	request.db_set("action_item", item.name, update_modified=False)


def _close_action_item(request, status=None):
	"""Complete (``status``) or remove (revoked / superseded link) the request's item."""
	if not request.action_item or not frappe.db.exists(ACTION_ITEM, request.action_item):
		return
	if status:
		frappe.db.set_value(ACTION_ITEM, request.action_item, "status", status, update_modified=False)
	else:
		frappe.delete_doc(ACTION_ITEM, request.action_item, ignore_permissions=True, force=True)
		# Deleted item names ("<email> - 0001") are reused by the next card: drop the pointer.
		request.db_set("action_item", None, update_modified=False)


def ensure_portal_account(applicant):
	"""Give the candidate a Candidate Portal account (Pending Verification, linked
	to the applicant) if they have none, so the Action Center cards can be opened
	after they activate it with an email OTP — as New Hire does. Never raises: the
	emailed link works without an account."""
	try:
		from recruitment.api.candidate_auth import ensure_candidate_for_invite

		ensure_candidate_for_invite(
			applicant.email_id,
			full_name=applicant.get("custom_full_name") or applicant.applicant_name,
			mobile_no=applicant.phone_number,
			job_applicant=applicant.name,
			candidate_source="Direct Applicant",
		)
	except Exception:
		frappe.log_error(title="Direct Applicant: candidate portal account not created")


def portal_url(path):
	"""A page of the candidate portal (Campus Settings -> Candidate Portal URL)."""
	try:
		base = frappe.db.get_single_value("Campus Settings", "candidate_portal_url")
	except Exception:
		base = None
	return (base or get_url()).rstrip("/") + path


def _email_candidate(request, token, resubmission=False):
	context = {
		"applicant_name": request.applicant_name,
		"form_link": form_link(token),
		"expires_on": frappe.utils.format_datetime(request.expires_on),
		"company": frappe.db.get_value("Job Applicant", request.job_applicant, "custom_company_finalized"),
		"resubmission": resubmission,
		"note": request.resubmit_note or "",
		"portal_link": portal_url(f"{PORTAL_ROUTE}?request={request.name}"),
	}
	context = safe_context(context)
	subject, message = _render_template(
		frappe.db.get_single_value(SETTINGS, "da_form_email_template"), context
	)
	if not subject:
		subject = (
			_("Please correct your details") if resubmission else _("Please complete your details")
		)
		message = frappe.render_template(DEFAULT_CANDIDATE_EMAIL, context)
	send_candidate_email(
		request.email, subject, message, form_link(token),
		job_applicant=request.job_applicant,
		reference_doctype="Job Applicant", reference_name=request.job_applicant,
	)


def send_candidate_email(recipient, subject, message, link, job_applicant, reference_doctype, reference_name):
	"""Email the candidate and record it as a Communication on the applicant's
	timeline. The logged copy carries no link: the timeline is visible to every
	user who can read the applicant, and the link opens the candidate's data."""
	comm = frappe.get_doc({
		"doctype": "Communication",
		"communication_type": "Communication",
		"communication_medium": "Email",
		"sent_or_received": "Sent",
		"subject": subject,
		"content": message.replace(link, "#")
		+ "<p><i>" + _("The secure link was sent by email and is not stored here.") + "</i></p>",
		"recipients": recipient,
		"reference_doctype": reference_doctype,
		"reference_name": reference_name,
	})
	if reference_doctype != "Job Applicant":
		comm.append("timeline_links", {"link_doctype": "Job Applicant", "link_name": job_applicant})
	comm.insert(ignore_permissions=True)
	frappe.sendmail(
		recipients=[recipient],
		subject=subject,
		message=message,
		reference_doctype=reference_doctype,
		reference_name=reference_name,
		communication=comm.name,
	)


def email_hr_on_submit(request):
	"""Tell whoever sent the form that the candidate submitted it."""
	if not request.sent_by or request.sent_by in ("Administrator", "Guest"):
		return
	context = {
		"applicant_name": request.applicant_name,
		"job_applicant": request.job_applicant,
		"event": _("submitted the form"),
		"link": get_url(f"/app/job-applicant/{request.job_applicant}"),
	}
	context = safe_context(context)
	subject, message = _render_template(
		frappe.db.get_single_value(SETTINGS, "da_hr_alert_email_template"), context
	)
	if not subject:
		subject = _("{0} submitted the form").format(request.applicant_name)
		message = frappe.render_template(DEFAULT_HR_EMAIL, context)
	frappe.sendmail(
		recipients=[request.sent_by],
		subject=subject,
		message=message,
		reference_doctype="Job Applicant",
		reference_name=request.job_applicant,
	)


def safe_context(context):
	"""Email context with text values HTML-escaped. Names and notes are typed by
	candidates or HR and Jinja does not autoescape here, so a name like
	``<a href=...>`` would become a live link in the mail. ``*_link`` values are
	URLs this module built and stay as they are."""
	return {
		key: frappe.utils.escape_html(value) if isinstance(value, str) and not key.endswith("link") else value
		for key, value in context.items()
	}


def _render_template(template_name, context):
	if not template_name:
		return None, None
	template = frappe.get_cached_doc("Email Template", template_name)
	return (
		frappe.render_template(template.subject, context),
		frappe.render_template(template.response_html if template.use_html else template.response, context),
	)


DEFAULT_CANDIDATE_EMAIL = """
<p>{{ _("Dear") }} {{ applicant_name }},</p>
{% if resubmission %}
<p>{{ _("Some of the details you submitted need to be corrected.") }}</p>
{% if note %}<p><b>{{ _("Note from HR") }}:</b> {{ note }}</p>{% endif %}
{% else %}
<p>{{ _("Please fill in your details using the link below.") }}</p>
{% endif %}
<p><a href="{{ form_link }}">{{ _("Open the form") }}</a></p>
<p>{{ _("This link is valid till {0}.").format(expires_on) }}</p>
{% if portal_link %}<p>{{ _("You can also sign in to the candidate portal with this email address and open the task from your Action Center:") }}
<a href="{{ portal_link }}">{{ _("Candidate portal") }}</a>. {{ _("First time? Choose Activate account and verify the code we email you.") }}</p>{% endif %}
"""

DEFAULT_HR_EMAIL = """
<p>{{ applicant_name }} {{ event }}.</p>
<p><a href="{{ link }}">{{ _("Open {0}").format(job_applicant) }}</a></p>
"""
