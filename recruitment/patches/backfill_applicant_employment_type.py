"""Fill in the Employment Type that existing candidates and offers never got.

`recruitment.patches.merge_job_opening_employment_type` pointed Job Applicant's
Employment Type at the opening the candidate applied to, but `fetch_from` only
runs when a document is saved — so every applicant created before that patch
still has nothing on it, and neither does the offer that fetches from them.

The visible symptom is on the Job Offer's Offer Letter tab. Recruitment
Settings maps letters per Employment Type; with no type to look up, nothing
matches and the preview falls back to the doctype's default print format,
showing the candidate an unrelated letter (a Trainee being previewed the old
generic internship one).

So the chain is filled in where it is already decided: applicants from their
opening, then offers from their applicant, then the readable-name mirror that
the Trainee joining date is shown by. Only blanks are written — a value anyone
chose by hand is left exactly as it is.
"""

import frappe


def execute():
	_backfill_applicants()
	_backfill_offers()
	_refresh_type_name_mirror()
	frappe.db.commit()
	for doctype in ("Job Applicant", "Job Offer"):
		frappe.clear_cache(doctype=doctype)


def _has_columns(doctype, *columns):
	"""Whether every one of `columns` exists on `doctype`'s table.

	These backfills are raw SQL over Custom Field columns, and custom fields
	shipped in an app's `custom/*.json` are created by `sync_customizations()` —
	which runs AFTER patches in a migrate (see frappe/migrate.py). On a site that
	has not had those fields created yet the column is simply absent and the
	UPDATE dies with "Unknown column".

	Skipping loses nothing: a column that does not exist holds no data to carry
	across, and `fetch_from` fills the field from the next save onward.
	"""
	return all(frappe.db.has_column(doctype, column) for column in columns)


def _backfill_applicants():
	"""Job Applicant <- the Job Opening they applied to."""
	if not _has_columns("Job Applicant", "custom_employment_type"):
		return

	frappe.db.sql(
		"""
		update `tabJob Applicant` ja
		join `tabJob Opening` jop on jop.name = ja.job_title
		set ja.custom_employment_type = jop.employment_type
		where coalesce(ja.custom_employment_type, '') = ''
		  and coalesce(jop.employment_type, '') != ''
		"""
	)


def _backfill_offers():
	"""Job Offer <- its Job Applicant.

	Submitted offers are included deliberately: `fetch_from` is skipped once a
	document is submitted, so a direct write is the only way an already-sent
	offer ever gets the type its letters are chosen by.
	"""
	if not _has_columns("Job Offer", "custom_employment_type") or not _has_columns(
		"Job Applicant", "custom_employment_type"
	):
		return

	frappe.db.sql(
		"""
		update `tabJob Offer` jo
		join `tabJob Applicant` ja on ja.name = jo.job_applicant
		set jo.custom_employment_type = ja.custom_employment_type
		where coalesce(jo.custom_employment_type, '') = ''
		  and coalesce(ja.custom_employment_type, '') != ''
		"""
	)


def _refresh_type_name_mirror():
	"""Job Offer's readable Employment Type name <- the type just filled in.

	`custom_employment_type_name` is what the Management Trainee Joining Date is
	shown by, so an offer that only now got its type would otherwise keep the
	field hidden.
	"""
	if not _has_columns("Job Offer", "custom_employment_type_name", "custom_employment_type"):
		return

	frappe.db.sql(
		"""
		update `tabJob Offer` jo
		join `tabEmployment Type` et on et.name = jo.custom_employment_type
		set jo.custom_employment_type_name = et.employee_type_name
		where coalesce(jo.custom_employment_type_name, '') = ''
		"""
	)
