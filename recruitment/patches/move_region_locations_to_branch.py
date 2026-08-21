"""Move the region↔location mapping onto the Work Location.

A location belongs to exactly one region. That is a property of the location, so it
is stored on the Work Location (``Branch.custom_region``) and read from there — see
``recruitment.api.interview_work_location.get_region_branches``, which no longer
unions in ``Region.locations``.

``Region.locations`` (a Table MultiSelect of Branch on the Region master) said the
same thing from the other side. Any site that maintained it there would silently lose
its mapping the moment the filter stopped reading it, so this copies those rows onto
the branches first.

Rules:
  * a branch that already names a region keeps it — an explicitly-set field is not
    overwritten by a list;
  * a branch listed under more than one region is left alone and reported, because a
    single Link cannot hold both and only the business can say which is right;
  * the Region.locations rows are NOT deleted. They are harmless once nothing reads
    them, and keeping them means this patch can be re-run and the old mapping is
    still there to inspect if a branch needs sorting out by hand.

Idempotent.
"""

import frappe

REGION = "Region"
BRANCH = "Branch"
LOCATION_TABLE = "Location Table"
REGION_FIELD = "custom_region"


def execute():
	if not frappe.db.has_column(BRANCH, REGION_FIELD):
		print("Branch has no custom_region field — nothing to move")
		return

	rows = frappe.get_all(
		LOCATION_TABLE,
		filters={"parenttype": REGION},
		fields=["parent as region", "location"],
	)
	rows = [r for r in rows if r.location and r.region]
	if not rows:
		print("Region.locations is empty — nothing to move")
		return

	# location -> the regions it is listed under
	by_location = {}
	for row in rows:
		by_location.setdefault(row.location, set()).add(row.region)

	current = {
		b.name: b.get(REGION_FIELD)
		for b in frappe.get_all(BRANCH, filters={"name": ["in", list(by_location)]},
		                        fields=["name", REGION_FIELD])
	}

	moved, kept, ambiguous, missing = 0, 0, [], []
	for location, regions in by_location.items():
		if location not in current:
			missing.append(location)          # listed under a region but no such Branch
			continue
		if len(regions) > 1:
			ambiguous.append((location, sorted(regions)))
			continue
		if current[location]:
			kept += 1                          # already set on the Branch; leave it
			continue
		frappe.db.set_value(BRANCH, location, REGION_FIELD, next(iter(regions)),
		                    update_modified=False)
		moved += 1

	frappe.db.commit()
	print(f"Region locations -> Branch.{REGION_FIELD}: {moved} moved, {kept} already set")
	if ambiguous:
		print("  NOT moved — listed under several regions, set these by hand:")
		for location, regions in ambiguous:
			print(f"    {location}: {', '.join(regions)}")
	if missing:
		print(f"  {len(missing)} listed location(s) have no Branch record: "
		      f"{', '.join(missing[:10])}")
