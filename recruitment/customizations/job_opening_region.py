"""Job Opening — mirror the Regions child table onto a parent Region field.

Fresher openings carry their regions in the `custom_regions` child table (Job
Requisition Region). `custom_region` on the parent mirrors that so the region is
searchable/filterable straight from the Job Opening — it is part of the doctype's
`search_fields`, which only reads parent fields.

Registered on the Job Opening `validate` doc_event (see hooks.py) so it runs on
every save path: Desk UI, APIs, scripted writes and imports.
"""

import frappe


def set_region_from_regions_table(doc, method=None):
	"""Set `custom_region` (+ its title) from the first Region row, Fresher only.

	The regions table only applies to Fresher hiring, so any other hiring type
	clears the fields rather than leaving a stale region behind.

	`custom_region_name` carries Region.location_region ("North") because
	`search_fields` selects raw parent columns — the Link alone would surface the
	Region ID ("REGION_0001") in link dropdowns.
	"""
	if doc.get("custom_hiring_type") != "Fresher":
		doc.custom_region = None
		doc.custom_region_name = None
		return

	regions = [row.region for row in (doc.get("custom_regions") or []) if row.region]
	doc.custom_region = regions[0] if regions else None
	doc.custom_region_name = (
		frappe.db.get_value("Region", doc.custom_region, "location_region")
		if doc.custom_region
		else None
	)
