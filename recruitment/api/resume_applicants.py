"""
Job Opening — bulk-create Job Applicants from attached resumes.
================================================================

The recruiter attaches one or more resume files on the Job Opening form (via the
"Attach Resumes" button — ``public/js/job_opening_attach_resumes.js``). On the
next save of the opening, the client hands the uploaded file URLs to this
endpoint, which creates one **Draft** Job Applicant per resume.

Each applicant is intentionally minimal:
  - ``status = "Draft"``  → keeps applicant_name / email_id / resume_attachment
    non-mandatory (see the Job Applicant ``mandatory_depends_on`` property
    setters), so an otherwise-empty record saves cleanly.
  - ``job_title``         → the opening (drives the linked designation/department).
  - ``designation``       → carried over from the opening explicitly, so it is
    populated even though nothing else is.
  - ``resume_attachment`` → the uploaded file, ready to view/download.
  - ``applicant_name``    → a readable placeholder derived from the file name, so
    the records don't show up hash-named in the list.

A future resume-parsing API will read ``resume_attachment`` and fill in the rest
(name, email, phone, …); these records are the empty shells it will enrich.
"""

import os
import re

import frappe
from frappe import _


@frappe.whitelist()
def create_applicants_from_resumes(job_opening, resumes):
	"""Create one Draft Job Applicant per uploaded resume.

	:param job_opening: name of the Job Opening the applicants belong to.
	:param resumes: JSON list of ``{"file_url": ..., "file_name": ...}`` objects.
	:returns: ``{"created": [names...], "skipped": [labels...]}``.
	"""
	if not job_opening:
		frappe.throw(_("Job Opening is required"))

	resumes = frappe.parse_json(resumes) or []
	if not resumes:
		return {"created": [], "skipped": []}

	opening = frappe.db.get_value(
		"Job Opening",
		job_opening,
		["name", "status", "designation"],
		as_dict=True,
	)
	if not opening:
		frappe.throw(_("Job Opening {0} not found").format(job_opening))
	if opening.status == "Closed":
		frappe.throw(
			_("Cannot create Job Applicants against a closed Job Opening"),
			title=_("Not Allowed"),
		)

	created, skipped = [], []
	for resume in resumes:
		resume = resume or {}
		file_url = resume.get("file_url")
		file_name = resume.get("file_name")
		if not file_url:
			continue

		try:
			applicant = frappe.new_doc("Job Applicant")
			applicant.status = "Draft"
			applicant.job_title = opening.name
			applicant.designation = opening.designation
			applicant.resume_attachment = file_url

			placeholder = _name_from_filename(file_name)
			if placeholder:
				applicant.applicant_name = placeholder

			applicant.insert()
			created.append(applicant.name)
		except Exception:
			frappe.log_error(
				title="Resume → Job Applicant creation failed",
				message=frappe.get_traceback(with_context=True),
			)
			skipped.append(file_name or file_url)

	return {"created": created, "skipped": skipped}


def _name_from_filename(file_name):
	"""Turn ``"John_Doe-Resume (1).pdf"`` into ``"John Doe Resume (1)"``.

	Best-effort only — a readable stand-in until the parser supplies the real
	name. Returns ``None`` when nothing usable is left.
	"""
	if not file_name:
		return None

	stem = os.path.splitext(file_name)[0]
	cleaned = re.sub(r"[_\-]+", " ", stem)
	cleaned = re.sub(r"\s+", " ", cleaned).strip()
	return cleaned or None
