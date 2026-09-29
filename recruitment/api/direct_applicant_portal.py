"""Direct Applicant Onboarding — the candidate side of the form.

Two ways in, same rules behind them:

* The emailed link (no login): every endpoint takes the link token ``t``; the
  request found by the token's hash is the only identity.

      GET  get_form(t)
      POST upload_file(t, fieldname, child_fieldname=None)   (multipart "file")
      GET  search_link(t, fieldname, txt="", child_fieldname=None)
      POST submit_form(t, data)

* The Candidate Portal (logged in): the Action Center card opens
  /direct_applicant_form?request=<name>. These take the request name and
  serve it only to the logged-in candidate whose email it was sent to.

      GET  get_my_form(request)
      POST upload_my_file(request, fieldname, child_fieldname=None)
      GET  search_my_link(request, fieldname, txt="", child_fieldname=None)
      POST submit_my_form(request, data)

Either way a request is usable only while open (Sent / Resubmission Requested)
and unexpired. Nothing trusts an applicant id or email from the caller.
"""

import json
import os

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import get_datetime, now_datetime

from recruitment.api import direct_applicant_fields as daf
from recruitment.api import direct_applicant_form as dform
from recruitment.api.candidate_auth import candidate_required
from recruitment.api.direct_applicant import FULL_DUPLICITY_FLAG, is_enabled

HOUR = 60 * 60
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
LINK_RESULTS = 20


class LinkUnavailable(frappe.PermissionError):
	pass


def _unavailable(message):
	frappe.throw(message, LinkUnavailable, title=_("Link unavailable"))


def _check_open(request, for_submit):
	if request.status == dform.REVOKED:
		_unavailable(_("This link has been withdrawn. Please contact HR."))
	if request.expires_on and get_datetime(request.expires_on) < now_datetime():
		_unavailable(_("This link has expired. Please contact HR for a new one."))
	if for_submit and request.status not in dform.OPEN_STATES:
		_unavailable(_("This form has already been submitted."))
	return request


def _request_for(token, for_submit=False):
	"""The request behind ``token``. Throws a candidate-readable message when the
	link is unknown, revoked, expired, or (for_submit) already submitted."""
	if not is_enabled() or not token or len(token) > 100:
		_unavailable(_("This link is not valid."))
	name = frappe.db.get_value(dform.REQUEST, {"token_hash": dform.hash_token(token)}, "name")
	if not name:
		_unavailable(_("This link is not valid or has been replaced by a newer one."))
	return _check_open(frappe.get_doc(dform.REQUEST, name), for_submit)


def _request_for_candidate(name, for_submit=False):
	"""The request ``name`` — only for the logged-in candidate it was sent to.
	A newer request for the same applicant replaces it, as a re-send does the link."""
	from recruitment.api.candidate_auth import get_current_candidate

	candidate = (get_current_candidate() or "").strip().lower()
	if not is_enabled() or not name or not frappe.db.exists(dform.REQUEST, name):
		_unavailable(_("This form is not available."))
	request = frappe.get_doc(dform.REQUEST, name)
	if not candidate or (request.email or "").strip().lower() != candidate:
		# Same answer as a missing request: never confirm whose form it is.
		_unavailable(_("This form is not available."))
	latest = dform.latest_request(request.job_applicant)
	if latest and latest.name != request.name:
		_unavailable(_("This form has been replaced by a newer one. Please use the latest task."))
	return _check_open(request, for_submit)


def _editable(request, fields):
	"""All fields on a first fill; only the flagged ones on a resubmission."""
	if request.status == dform.RESUBMIT:
		flagged = set(json.loads(request.resubmit_fields or "[]"))
		return [f["fieldname"] for f in fields if f["fieldname"] in flagged]
	if request.status == dform.SENT:
		return [f["fieldname"] for f in fields]
	return []


def _field(fields, fieldname, child_fieldname=None):
	field = next((f for f in fields if f["fieldname"] == fieldname), None)
	if field and child_fieldname:
		field = next((c for c in field.get("child") or [] if c["fieldname"] == child_fieldname), None)
	return field


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=120, seconds=HOUR)
def get_form(t):
	return _form_payload(_request_for(t))


def _form_payload(request):
	fields = dform.snapshot_fields(request)
	applicant = frappe.get_doc("Job Applicant", request.job_applicant)
	editable = set(_editable(request, fields))
	form = frappe.db.get_value(dform.FORM, request.form, ["form_name", "instructions"], as_dict=True) or {}
	return {
		"applicant_name": request.applicant_name,
		"company": applicant.get("custom_company_finalized"),
		"form_title": form.get("form_name") or request.form,
		"instructions": form.get("instructions") or "",
		"status": request.status,
		"expires_on": request.expires_on,
		"resubmit_note": request.resubmit_note if request.status == dform.RESUBMIT else "",
		# Values only for fields the candidate may fill now: a submitted form's link
		# (still alive for the thank-you page) or a resubmission must not hand back
		# the rest of what is on file — PAN, address and so on.
		"fields": [
			dict(
				f,
				value=daf.current_value(applicant, f) if f["fieldname"] in editable else None,
				editable=f["fieldname"] in editable,
			)
			for f in fields
		],
	}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=60, seconds=HOUR)
def upload_file(t, fieldname, child_fieldname=None):
	return _upload(_request_for(t, for_submit=True), fieldname, child_fieldname)


def _upload(request, fieldname, child_fieldname=None):
	"""Store one file for an Attach field (or table column) of this form, attached
	privately to the applicant. Returns its file_url to put in the submission."""
	fields = dform.snapshot_fields(request)
	if fieldname not in _editable(request, fields):
		frappe.throw(_("This field cannot be changed now."))
	field = _field(fields, fieldname, child_fieldname)
	if not field or field["fieldtype"] not in daf.ATTACH_TYPES:
		frappe.throw(_("This field does not take a file."))

	upload = frappe.request.files.get("file") if frappe.request and frappe.request.files else None
	if not upload or not upload.filename:
		frappe.throw(_("No file received."))
	extension = os.path.splitext(upload.filename)[1].lower()
	if extension not in ALLOWED_UPLOAD_EXTENSIONS:
		frappe.throw(_("Only {0} files can be uploaded.").format(", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))))
	content = upload.stream.read(MAX_UPLOAD_BYTES + 1)
	if len(content) > MAX_UPLOAD_BYTES:
		frappe.throw(_("The file is larger than 5 MB."))

	file = frappe.get_doc({
		"doctype": "File",
		"file_name": os.path.basename(upload.filename),
		"content": content,
		"is_private": 1,
		"attached_to_doctype": "Job Applicant",
		"attached_to_name": request.job_applicant,
		# Only a top-level field owns the file; a table cell's file just belongs to the applicant.
		"attached_to_field": None if child_fieldname else fieldname,
	})
	try:
		file.insert(ignore_permissions=True)
	except frappe.ValidationError:
		raise
	except Exception:
		# e.g. a damaged PDF that Frappe's content check cannot parse.
		frappe.log_error(title="Direct Applicant: file upload could not be read")
		frappe.throw(_("This file could not be read. Please upload a different copy."))
	return {"file_url": file.file_url, "file_name": file.file_name}


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=600, seconds=HOUR)
def search_link(t, fieldname, txt="", child_fieldname=None):
	return _search(_request_for(t), fieldname, txt, child_fieldname)


def _search(request, fieldname, txt="", child_fieldname=None):
	"""Options for a Link field (or table column) of this form — names and titles only."""
	field = _field(dform.snapshot_fields(request), fieldname, child_fieldname)
	if not field or field["fieldtype"] != "Link" or daf.link_denied(field["options"]):
		frappe.throw(_("This field has no options to search."))
	doctype = field["options"]
	meta = frappe.get_meta(doctype)
	title = meta.title_field if meta.title_field and meta.has_field(meta.title_field) else None
	filters = {"disabled": 0} if meta.has_field("disabled") else {}
	txt = (txt or "")[:100]
	or_filters = {"name": ["like", f"%{txt}%"]}
	if title:
		or_filters[title] = ["like", f"%{txt}%"]
	rows = frappe.get_all(
		doctype,
		filters=filters,
		or_filters=or_filters if txt else None,
		fields=["name"] + ([title] if title else []),
		limit_page_length=LINK_RESULTS,
		order_by="name asc",
		ignore_permissions=True,
	)
	return [{"value": r.name, "label": (r.get(title) if title else None) or r.name} for r in rows]


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=30, seconds=HOUR)
def submit_form(t, data):
	return _submit(_request_for(t, for_submit=True), data)


def _submit(request, data):
	if isinstance(data, str):
		data = json.loads(data or "{}")
	fields = dform.snapshot_fields(request)
	applicant = frappe.get_doc("Job Applicant", request.job_applicant)
	cleaned = daf.clean_submission(applicant, fields, data, _editable(request, fields))
	daf.apply_values(applicant, cleaned, fields)

	if not request.duplicity_cleared:
		_full_duplicity_check(applicant)
	applicant.set(dform.STATUS_FIELD, dform.SUBMITTED)
	applicant.save(ignore_permissions=True)

	request.update({"status": dform.SUBMITTED, "submitted_on": now_datetime()})
	request.save(ignore_permissions=True)
	dform._close_action_item(request, status="Completed")
	try:
		dform.email_hr_on_submit(request)
	except Exception:
		# The submission is saved; a mail failure must not bounce it back.
		frappe.log_error(title="Direct Applicant: HR alert email failed")
	return {"status": "ok", "message": _("Thank you. Your details have been submitted.")}


# --------------------------------------------------------------------------- #
# Candidate Portal (logged-in candidate)
# --------------------------------------------------------------------------- #
@candidate_required(methods=["GET"])
@rate_limit(limit=120, seconds=HOUR)
def get_my_form(request):
	return _form_payload(_request_for_candidate(request))


@candidate_required(methods=["POST"])
@rate_limit(limit=60, seconds=HOUR)
def upload_my_file(request, fieldname, child_fieldname=None):
	return _upload(_request_for_candidate(request, for_submit=True), fieldname, child_fieldname)


@candidate_required(methods=["GET"])
@rate_limit(limit=600, seconds=HOUR)
def search_my_link(request, fieldname, txt="", child_fieldname=None):
	return _search(_request_for_candidate(request), fieldname, txt, child_fieldname)


@candidate_required(methods=["POST"])
@rate_limit(limit=30, seconds=HOUR)
def submit_my_form(request, data):
	return _submit(_request_for_candidate(request, for_submit=True), data)


def _full_duplicity_check(applicant):
	"""Re-run the Duplicity Check with everything the candidate supplied. A match
	does not reject the submission: the data is kept and HR sees the flag."""
	from recruitment.customizations.ta_duplicity_check import check_duplicity

	applicant.flags[FULL_DUPLICITY_FLAG] = True
	messages = len(frappe.local.message_log or [])
	try:
		check_duplicity(applicant)
		# A corrected resubmission that no longer matches clears the flag.
		applicant.set(dform.DUPLICITY_FLAG, 0)
		applicant.set(dform.DUPLICITY_NOTE, None)
	except frappe.ValidationError as e:
		# The throw also queued a message for the response; the candidate must
		# not see HR's duplicity details.
		del frappe.local.message_log[messages:]
		applicant.set(dform.DUPLICITY_FLAG, 1)
		applicant.set(dform.DUPLICITY_NOTE, frappe.utils.strip_html(str(e))[:1000])
	finally:
		applicant.flags.pop(FULL_DUPLICITY_FLAG, None)
