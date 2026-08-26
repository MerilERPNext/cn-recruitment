"""Fill `custom_region` on requisitions raised before the field existed.

`recruitment.customizations.job_requisition_region` mirrors the Regions child
table onto the parent on every save — but a save is exactly what an already
raised (often approved) requisition will not get, so without this its Region
column stays empty and the new list filter finds nothing.

Written as a direct UPDATE: no doc save, so none of the requisition's approval /
initiation locks are involved and no `modified` timestamp moves.
"""

import frappe

FRESHER = "Fresher"


def execute():
	# Custom fields ship in `custom/*.json` and are created by
	# sync_customizations(), which runs AFTER patches during a migrate. On a site
	# where that has not happened yet the column is simply absent — nothing to
	# backfill, and the next save fills it in anyway.
	if not frappe.db.has_column("Job Requisition", "custom_region"):
		return

	# The lowest-idx region row is the one the mirror reports.
	frappe.db.sql(
		"""
		update `tabJob Requisition` jr
		join (
			select rgn.parent, min(rgn.idx) as idx
			from `tabJob Requisition Region` rgn
			where rgn.parenttype = 'Job Requisition'
			  and coalesce(rgn.region, '') != ''
			group by rgn.parent
		) first_row on first_row.parent = jr.name
		join `tabJob Requisition Region` rgn
			on rgn.parent = first_row.parent and rgn.idx = first_row.idx
		set jr.custom_region = rgn.region
		where jr.custom_hiring_type = %(fresher)s
		  and coalesce(jr.custom_region, '') = ''
		""",
		{"fresher": FRESHER},
	)
	frappe.db.commit()
	frappe.clear_cache(doctype="Job Requisition")
