"""Backfill `custom_campus_drive` on existing campus Job Applicants.

Campus candidates carry the Campus Invite they applied through; the Campus Drive is
assembled afterwards by selecting those invites, and until now nothing wrote the
drive back onto the applicant — so the Campus Drive field on every candidate created
before this sat empty.

Saving a drive now links its candidates (Campus Drive.on_update), and new campus
applicants resolve their drive from their invite on save. This patch does the same
for the drives that already exist, so HR doesn't have to re-save each one.
"""

import frappe

from recruitment.recruitment.campus_helpers import sync_drive_applicant_links


def execute():
	if not frappe.db.has_column("Job Applicant", "custom_campus_drive"):
		return

	for drive in frappe.get_all("Campus Drive", pluck="name"):
		invites = frappe.get_all(
			"Campus Drive Invite",
			filters={"parenttype": "Campus Drive", "parent": drive},
			pluck="campus_invite",
		)
		if not invites:
			continue
		result = sync_drive_applicant_links(drive, invites)
		if result["linked"]:
			print(f"Campus Drive {drive}: linked {result['linked']} candidate(s)")
