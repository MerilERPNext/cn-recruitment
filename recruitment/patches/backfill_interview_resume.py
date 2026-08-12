"""Mirror candidate resumes onto interviews that were scheduled before we did it.

Two groups need fixing, and the second is the one that looked "broken" to panels:

* interviews with no resume whose candidate has one — fill the field;
* interviews that already carry a resume URL but no File row of their own — the
  link was there and refused to open, because the only File row was attached to the
  Job Applicant.

See ``recruitment.api.interview_resume`` for why a second File row is what makes the
download work. Idempotent: re-running skips whatever is already in place.
"""

import frappe

from recruitment.api.interview_resume import RESUME_FIELD, apply_resume


def execute():
	rows = frappe.db.sql(
		f"""
		select i.name, i.`{RESUME_FIELD}` as own_resume, ja.resume_attachment
		from `tabInterview` i
		join `tabJob Applicant` ja on ja.name = i.job_applicant
		where i.docstatus < 2
		  and (i.`{RESUME_FIELD}` is not null and i.`{RESUME_FIELD}` != ''
		       or ja.resume_attachment is not null and ja.resume_attachment != '')
		""",
		as_dict=True,
	)

	fixed = 0
	for row in rows:
		# The interview's own attachment wins — it may be a role-specific CV that HR
		# put there deliberately.
		if apply_resume(row.name, row.own_resume or row.resume_attachment):
			fixed += 1

	frappe.db.commit()
	print(f"Interview resume mirror: {fixed} interview(s) checked/updated")
