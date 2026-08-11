"""Make the Interview's Resume Attachment actually openable by the panel.

``Interview.custom_resume_attachment`` already mirrors the candidate: the field
carries ``fetch_from: job_applicant.resume_attachment`` with ``fetch_if_empty: 0``,
so every save copies the candidate's current resume onto the interview. The URL was
therefore usually right — and the link still did not open.

The reason is permissions, not data. A resume is a **private** file attached to the
**Job Applicant**, and a panel member has no Job Applicant permission, so Frappe
refused the download and the field looked broken.

The fix is a second ``File`` row for the same URL, attached to the Interview.
``frappe.core.doctype.file.utils.find_file_by_url`` walks every File row sharing a
URL and allows the download if *any* of the documents it hangs off is readable by
the user — so a panel member who can read the Interview can open the resume, without
being handed the candidate's record. Nothing is copied on disk; both rows point at
the same blob.

Two gaps in the mirroring are closed here as well, because fetch_from only fires on
save: an interview scheduled before the CV was uploaded stayed blank until someone
happened to re-save it, and an interview saved before the candidate replaced their
CV kept the old one. Uploading a resume now pushes it to their open interviews.
"""

import frappe

RESUME_FIELD = "custom_resume_attachment"


def _already_attached(interview, file_url):
	return frappe.db.exists("File", {
		"file_url": file_url,
		"attached_to_doctype": "Interview",
		"attached_to_name": interview,
	})


def _attach_to_interview(interview, file_url):
	"""Give the Interview its own File row for the candidate's resume.

	Never allowed to break the save that triggered it. The one way this throws is
	``File.validate_private_file_access``, which refuses when the *session user*
	cannot already read the file — a panel member saving an interview whose resume
	was never mirrored. The attachment is a convenience; losing it is far better than
	blocking an interview from being saved, and the next save by HR (or the backfill
	patch) creates it.
	"""
	if _already_attached(interview, file_url):
		return

	source = frappe.db.get_value("File", {"file_url": file_url},
	                             ["file_name", "is_private"], as_dict=True)
	try:
		frappe.get_doc({
			"doctype": "File",
			"file_url": file_url,
			"file_name": (source or {}).get("file_name"),
			"is_private": (source or {}).get("is_private", 1),
			"attached_to_doctype": "Interview",
			"attached_to_name": interview,
			"attached_to_field": RESUME_FIELD,
		}).insert(ignore_permissions=True)
	except frappe.PermissionError:
		frappe.clear_last_message()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Interview resume mirror failed")


def apply_resume(interview, file_url):
	"""Point one Interview at ``file_url`` and make it openable from there."""
	if not file_url:
		return False

	if frappe.db.get_value("Interview", interview, RESUME_FIELD) != file_url:
		frappe.db.set_value("Interview", interview, RESUME_FIELD, file_url,
		                    update_modified=False)
	_attach_to_interview(interview, file_url)
	return True


def pull_resume_from_applicant(doc, method=None):
	"""Interview hook: whatever resume this save landed on, make it openable.

	By the time this runs the field has already been fetched from the candidate, so
	the value is normally correct and this only has to create the File row. The
	db_set is a fallback for interviews whose value was written at the row level and
	so never went through a fetch.
	"""
	file_url = doc.get(RESUME_FIELD) or frappe.db.get_value(
		"Job Applicant", doc.job_applicant, "resume_attachment")
	if not file_url:
		return

	if doc.get(RESUME_FIELD) != file_url:
		doc.db_set(RESUME_FIELD, file_url, update_modified=False)
	_attach_to_interview(doc.name, file_url)


def push_resume_to_interviews(doc, method=None):
	"""Job Applicant hook: a new or replaced resume reaches interviews already set up.

	fetch_from only fires when the *interview* is saved, so without this the panel
	keeps seeing nothing (CV uploaded after scheduling) or the previous CV (candidate
	sent a new one). Overwriting matches the field's own contract — it is declared
	``fetch_if_empty: 0``, i.e. always mirror the candidate. Cancelled interviews are
	left alone.
	"""
	if not doc.has_value_changed("resume_attachment") or not doc.resume_attachment:
		return

	for interview in frappe.get_all("Interview",
	                                filters={"job_applicant": doc.name,
	                                         "docstatus": ("<", 2)},
	                                pluck="name"):
		apply_resume(interview, doc.resume_attachment)
