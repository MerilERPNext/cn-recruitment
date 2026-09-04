"""Backfill Group Discussions for the drives that already have GD groups.

Before this, a GD lived only inside the Campus Drive form and an interviewer needed
the whole drive to mark one group. Existing drives keep their groups exactly as they
are; this just gives every group that already has a panel its own document, so the
panel can reach it.

Groups with no panel are skipped on purpose — there is nobody the document would be
for. Assigning a panel later creates it (campus_gd_sync.reconcile, called from the
drive's own save and from Assign Panels).
"""

import frappe

from recruitment.recruitment.campus_gd_sync import reconcile


def execute():
	if not frappe.db.exists("DocType", "Group Discussion"):
		return

	drives = frappe.get_all(
		"Campus Drive GD Group",
		filters={"parenttype": "Campus Drive"},
		distinct=True,
		pluck="parent",
	)
	made = kept = 0
	for drive in drives:
		if not frappe.db.exists("Campus Drive", drive):
			continue
		try:
			result = reconcile(drive)
		except Exception:
			# One broken drive must not stop the migration for the rest.
			frappe.log_error(frappe.get_traceback(),
			                 f"Group Discussion backfill failed for {drive}")
			continue
		made += result["created"]
		kept += result["updated"]
		frappe.db.commit()

	if made or kept:
		print(f"Group Discussion backfill: {made} created, {kept} updated "
		      f"across {len(drives)} drive(s)")
