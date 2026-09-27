"""Job Opening fields that are read off its Job Requisition.

* Job Title — the title of the requisition's Job Description; without one, the
  Designation's readable name. Never the Designation id (e.g. ``ANM_AC_ANM``),
  which is what the opening used to be titled with.
* Experience (``custom_experience``) — the requisition's experience range as
  text, e.g. "1 - 2 years". The opening's own "Work experience" dropdown has
  different buckets from the requisition's, so a range copied into it was often
  dropped; a text field carries it across as written.

Runs on `before_validate` so every creation path gets it — the Desk "Create Job
Opening" mapper, the web app's Resource API call, the per-region Fresher
openings — and so it lands before HRMS builds the web route from `job_title`.
"""

import frappe

EXPERIENCE_FIELD = "custom_experience"


def set_fields_from_requisition(doc, method=None):
	if not doc.get("job_requisition"):
		return

	requisition = frappe.db.get_value(
		"Job Requisition",
		doc.job_requisition,
		[
			"designation",
			"custom_job_description_template",
			"custom_work_experience_range",
			"custom_experience_range_from",
			"custom_experience_range_to",
			"custom_experience_unit",
		],
		as_dict=True,
	)
	if not requisition:
		return

	# Title on creation only — once the opening exists it is the recruiter's to
	# edit. A title that is just the Designation id counts as unset.
	if doc.is_new() and (not doc.get("job_title") or doc.job_title == doc.get("designation")):
		title = job_title_for_requisition(requisition, doc.get("designation"))
		if title:
			doc.job_title = title

	# Read-only mirror of the requisition, so kept in step on every save.
	if doc.meta.has_field(EXPERIENCE_FIELD):
		doc.set(EXPERIENCE_FIELD, experience_for_requisition(requisition))


def job_title_for_requisition(requisition, designation=None):
	"""The Job Description's title, else the Designation's name (not its id)."""
	job_description = requisition.get("custom_job_description_template")
	if job_description:
		title = frappe.db.get_value("Job Description", job_description, "job_description_title")
		if title:
			return title.strip()

	designation = designation or requisition.get("designation")
	if not designation:
		return None
	names = frappe.db.get_value(
		"Designation", designation, ["custom_designation_title", "designation_name"], as_dict=True
	) or {}
	return names.get("custom_designation_title") or names.get("designation_name") or designation


def experience_for_requisition(requisition):
	"""The requisition's From/To range as text; its Work Experience dropdown when
	no range was entered."""
	low = str(requisition.get("custom_experience_range_from") or "").strip()
	high = str(requisition.get("custom_experience_range_to") or "").strip()
	unit = requisition.get("custom_experience_unit") or "years"

	if low and high:
		return f"{low} {unit}" if low == high else f"{low} - {high} {unit}"
	if low:
		return f"{low}+ {unit}"
	if high:
		return f"Up to {high} {unit}"
	return requisition.get("custom_work_experience_range") or None
