"""Job Requisition — mirror the child table it hires on onto a parent field.

A requisition states WHERE it hires in a child table, and which table depends on
the hiring type: `custom_regions` for Fresher, `custom_position_details` for
Lateral. Neither is visible to list views, filters, report columns or email
templates, all of which read parent columns only — so the key is copied up:

    custom_region            <- custom_regions[0].region            (Fresher)
    custom_position_location <- custom_position_details[0].location (Lateral)

Each clears the other, so exactly one is ever set and "region if set, else
location" always describes the requisition as it stands.

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


def set_location_from_position_details(doc, method=None):
	"""Set `custom_position_location` from the first Position Details row, and
	seed an empty `custom_location` with it. Lateral only.

	"Lateral" is read as "not Fresher" on purpose: requisitions raised before the
	hiring-type switch existed carry no hiring type at all, and they are the
	lateral ones — matching the literal string would leave every one of them
	empty. A Fresher requisition holds no position rows anyway.
	"""
	if not doc.meta.has_field("custom_position_location"):
		return

	if doc.get("custom_hiring_type") == HIRING_TYPE_FRESHER:
		doc.custom_position_location = None
		return

	locations = [row.location for row in (doc.get("custom_position_details") or []) if row.location]
	doc.custom_position_location = locations[0] if locations else None

	_seed_custom_location(doc)


def _seed_custom_location(doc):
	"""Copy the position location onto `custom_location` when that is still empty.

	`custom_location` ("Work Location") is a field the requester fills in and the
	one the Job Opening's `location` is mapped from — so it is only ever SEEDED,
	never overwritten: a location someone chose by hand stays exactly as chosen,
	even when it disagrees with the position rows.

	Creation only. `custom_location` is a real business field, NOT in
	`_EDIT_AFTER_APPROVAL_IGNORE` (and it must not be — it is user-entered), so
	writing it on a later save of an approved requisition would read as an
	illegal edit and `_enforce_edit_after_approval` would refuse the save. The
	first save is always allowed, and already-raised requisitions are handled by
	`recruitment.patches.backfill_requisition_position_location` instead.
	"""
	if not doc.is_new():
		return
	if doc.get("custom_location") or not doc.get("custom_position_location"):
		return
	if not doc.meta.has_field("custom_location"):
		return

	doc.custom_location = doc.custom_position_location
