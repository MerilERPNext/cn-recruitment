"""Fill `custom_position_location` on requisitions raised before the field existed.

`recruitment.customizations.job_requisition_region.set_location_from_position_details`
copies the Position Details location onto the parent on every save — but a save is
exactly what an already raised (often approved) requisition will not get, so without
this the Position Location column stays empty and the new list filter and any email
template reading it find nothing.

`custom_location` is seeded from the same value where it is still BLANK. That
mirrors what the hook does on creation, and stays out of the way of a location
anyone actually chose. It is a real business field, so the hook cannot write it
on a later save of an approved requisition without tripping
`_enforce_edit_after_approval` — a direct UPDATE here is the only way an existing
requisition gets it, and it involves no doc save, no approval / initiation lock,
and no `modified` bump.

Separate from `backfill_requisition_region` on purpose: that patch has already
shipped and run, so a site with it in its Patch Log would never execute new work
added inside it.
"""

import frappe

FRESHER = "Fresher"
JOB_REQUISITION = "Job Requisition"


def execute():
	# Custom fields ship in `custom/*.json` and are created by
	# sync_customizations(), which runs AFTER patches during a migrate. On a site
	# where that has not happened yet the column is simply absent — nothing to
	# backfill, and the next save fills it in anyway.
	if not frappe.db.has_column(JOB_REQUISITION, "custom_position_location"):
		return

	_backfill_position_location()
	if frappe.db.has_column(JOB_REQUISITION, "custom_location"):
		_seed_blank_custom_location()

	frappe.db.commit()
	frappe.clear_cache(doctype=JOB_REQUISITION)


def _backfill_position_location():
	"""Everything that isn't Fresher <- its lowest-idx Position Details row.

	"Not Fresher" rather than "= Lateral" for the same reason the hook uses it:
	requisitions raised before the hiring-type switch existed carry no hiring
	type, and they are the lateral ones.
	"""
	frappe.db.sql(
		"""
		update `tabJob Requisition` jr
		join (
			select pos.parent, min(pos.idx) as idx
			from `tabPosition Details` pos
			where pos.parenttype = 'Job Requisition'
			  and coalesce(pos.location, '') != ''
			group by pos.parent
		) first_row on first_row.parent = jr.name
		join `tabPosition Details` pos
			on pos.parent = first_row.parent and pos.idx = first_row.idx
		set jr.custom_position_location = pos.location
		where coalesce(jr.custom_hiring_type, '') != %(fresher)s
		  and coalesce(jr.custom_position_location, '') = ''
		""",
		{"fresher": FRESHER},
	)


def _seed_blank_custom_location():
	"""`custom_location` <- the position location, only where it is still blank."""
	frappe.db.sql(
		"""
		update `tabJob Requisition` jr
		set jr.custom_location = jr.custom_position_location
		where coalesce(jr.custom_location, '') = ''
		  and coalesce(jr.custom_position_location, '') != ''
		"""
	)
