"""Job Requisition — mirror the Regions child table onto a parent Region field.

A Fresher requisition budgets its headcount per region on the `custom_regions`
child table (one requisition per region: see `_build_region_requisition_doc`).
`custom_region` on the parent mirrors that row so the region can be filtered,
listed and reported on straight from the Job Requisition — child-table values
are invisible to list views, filters and report columns.

Same rule as the Job Opening side (`job_opening_region.py`), so a requisition
and the openings raised from it always agree on their region.

Registered on the Job Requisition `validate` doc_event (see hooks.py) so it runs
on every save path: Desk UI, the React/ESS API, scripted writes and imports.
The field is listed in `_EDIT_AFTER_APPROVAL_IGNORE`
(recruitment.api.job_requisition) so writing it here is never mistaken for a
business edit of an approved requisition.
"""

import frappe

HIRING_TYPE_FRESHER = "Fresher"


def set_region_from_regions_table(doc, method=None):
	"""Set `custom_region` from the first Region row, Fresher only.

	The regions table only applies to Fresher hiring, so any other hiring type
	clears the field rather than leaving a stale region behind. A requisition
	that still holds several region rows (before the per-region split) reports
	its first one, which is also the one its openings inherit.
	"""
	if not doc.meta.has_field("custom_region"):
		return

	if doc.get("custom_hiring_type") != HIRING_TYPE_FRESHER:
		doc.custom_region = None
		return

	regions = [row.region for row in (doc.get("custom_regions") or []) if row.region]
	doc.custom_region = regions[0] if regions else None
