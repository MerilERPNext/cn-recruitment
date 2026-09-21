"""Move the agreed package from the Campus Drive onto the Job Openings it hires for.

Fixed / Variable Pay used to be named once per Campus Drive, which cannot describe a
drive running several openings that pay differently. They now live on the Job Opening
— the one thing every offer has behind it, campus or not — and reach the drive
through its `linked_job_openings` rows and the offer through
`recruitment.customizations.job_offer._job_opening_pay`.

So each drive's package is copied onto the openings it lists, before the drive's own
fields disappear from `campus_drive.json`.

Openings that already state a package are left alone — theirs is the more specific
number, and it is the one the new flow reads. Where two drives list the same opening
with different packages the first drive by creation wins, which is the rule the old
flow applied anyway when a candidate's drive decided their offer.

TWO ORDERING FACTS THIS PATCH IS BUILT AROUND
---------------------------------------------
1. `sync_customizations()` runs AFTER patches in a migrate, so the Job Opening's
   `fixed_pay` / `variable_pay` custom fields do not exist yet the first time this
   runs. It creates them itself rather than deferring — a patch that skipped its work
   would still be written to the Patch Log and never run again, stranding the figures.
2. The model sync that removes the fields from `campus_drive.json` has already run by
   then, so the columns are no longer in the doctype's meta. They ARE still in the
   table (Frappe does not drop a column when a field is removed), so they are read
   with raw SQL rather than through the ORM.

The columns are deliberately NOT dropped. The figures they hold are the only record
of what a past drive agreed, they cost nothing where they sit, and `_campus_drive_pay`
still reads them as a fallback for a drive whose openings were never given a package.
Dropping them is a separate, irreversible decision.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CAMPUS_DRIVE = "Campus Drive"
JOB_OPENING = "Job Opening"
PAY_FIELDS = ("fixed_pay", "variable_pay")

# Minimal definitions, only so the carry-across below has somewhere to write on the
# first migrate. `custom/job_opening.json` is the authority and sync_customizations
# reconciles these to it moments later.
JOB_OPENING_FIELDS = {
	JOB_OPENING: [
		{
			"fieldname": "custom_pay_column_break",
			"fieldtype": "Column Break",
			"insert_after": "custom_reason_for_requesting",
		},
		{
			"fieldname": "fixed_pay",
			"fieldtype": "Currency",
			"label": "Fixed Pay",
			"non_negative": 1,
			"insert_after": "custom_pay_column_break",
		},
		{
			"fieldname": "variable_pay",
			"fieldtype": "Currency",
			"label": "Variable Pay",
			"non_negative": 1,
			"insert_after": "fixed_pay",
		},
	]
}


def execute():
	if not _has_columns(CAMPUS_DRIVE):
		return  # already migrated, or a site that never had them

	create_custom_fields(JOB_OPENING_FIELDS, update=True)
	if not _has_columns(JOB_OPENING):
		# Nothing to carry to and no way to make one — leave the drive figures where
		# they are rather than reporting a move that did not happen.
		print("Campus Drive pay: Job Opening pay fields unavailable — nothing carried")
		return

	carried = _carry_pay_to_openings()
	frappe.db.commit()
	frappe.clear_cache(doctype=JOB_OPENING)
	print(f"Campus Drive pay: carried onto {carried} Job Opening(s)")


def _has_columns(doctype):
	return all(frappe.db.has_column(doctype, f) for f in PAY_FIELDS)


def _drive_packages():
	"""``[(drive, {field: value})]`` oldest first, drives with a package only.

	Raw SQL: by the time this runs the fields are gone from the Campus Drive meta,
	so the ORM would refuse to select them even though the columns are still there.
	"""
	rows = frappe.db.sql(
		"""
		select name, fixed_pay, variable_pay
		from `tabCampus Drive`
		where coalesce(fixed_pay, 0) != 0 or coalesce(variable_pay, 0) != 0
		order by creation asc
		""",
		as_dict=True,
	)
	return [(r.name, {f: r.get(f) for f in PAY_FIELDS if r.get(f)}) for r in rows]


def _carry_pay_to_openings():
	"""Copy each drive's package onto the openings it lists, where they have none.

	`db.set_value` on the opening rather than a doc save: a Job Opening runs a long
	`validate` chain (route uniqueness, posting settings, eligibility defaults) and
	none of it needs to run to record a number that was agreed long ago.
	"""
	carried = 0
	seen = set()

	for drive, package in _drive_packages():
		openings = frappe.get_all(
			"Campus Drive Job Opening",
			filters={"parent": drive, "parenttype": CAMPUS_DRIVE},
			pluck="job_opening",
		)
		for opening in openings:
			# First drive by creation wins an opening that several drives list.
			if not opening or opening in seen:
				continue
			seen.add(opening)

			current = frappe.db.get_value(JOB_OPENING, opening, list(PAY_FIELDS),
			                              as_dict=True) or {}
			updates = {f: v for f, v in package.items() if not current.get(f)}
			if not updates:
				continue
			frappe.db.set_value(JOB_OPENING, opening, updates, update_modified=False)
			carried += 1

	return carried
