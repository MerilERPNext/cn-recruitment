"""Shared validators for the campus doctypes."""

import frappe
from frappe import _

APPLICANT_DRIVE_FIELD = "custom_campus_drive"
APPLICANT_INVITE_FIELD = "custom_campus_invite"


def validate_unique_job_openings(doc, table_fieldname="job_openings", link_fieldname="job_opening"):
	"""Block the same Job Opening appearing twice in a child table.

	Used by Campus Invite (`job_openings`) and Campus Drive (`linked_job_openings`);
	both child rows carry the opening in a `job_opening` link field.
	"""
	seen = {}
	for row in (doc.get(table_fieldname) or []):
		value = row.get(link_fieldname)
		if not value:
			continue
		if value in seen:
			frappe.throw(
				_("Job Opening {0} is already added in row {1}. Each opening can be listed only once.").format(
					frappe.bold(value), seen[value]
				),
				title=_("Duplicate Job Opening"),
			)
		seen[value] = row.idx


# ---------------------------------------------------------------------------
# Campus Drive <-> Job Applicant link
#
# A campus candidate applies through a Campus Invite, so the invite is what lands
# on the Job Applicant (`custom_campus_invite`). The Campus Drive is assembled
# afterwards by selecting those invites — which is why the applicant's
# `custom_campus_drive` stayed empty: nothing ever bridged the two. These helpers
# close the gap from both directions:
#
#   drive saved     -> stamp the drive on every applicant of its invites
#   applicant saved -> resolve the drive from the applicant's own invite
# ---------------------------------------------------------------------------


def drive_for_invite(campus_invite):
	"""The Campus Drive that selected this Campus Invite, or None.

	If several drives selected the same invite we take the most recently created —
	the drive currently being run for that campus.
	"""
	if not campus_invite:
		return None
	rows = frappe.get_all(
		"Campus Drive Invite",
		filters={"parenttype": "Campus Drive", "campus_invite": campus_invite},
		fields=["parent"],
		order_by="creation desc",
		limit=1,
		# A candidate applying through the campus portal is a Guest — provenance must
		# still resolve, so this lookup doesn't run under the caller's permissions.
		ignore_permissions=True,
	)
	return rows[0].parent if rows else None


def set_applicant_drive_from_invite(doc, method=None):
	"""Job Applicant hook: fill `custom_campus_drive` from the applicant's Campus
	Invite whenever it is still empty.

	Runs on every save, so it also catches an invite set by hand on an existing
	applicant. An already-linked drive is never overwritten — a drive save (see
	`sync_drive_applicant_links`) is what moves candidates between drives.
	"""
	if not (doc.meta.has_field(APPLICANT_DRIVE_FIELD) and doc.meta.has_field(APPLICANT_INVITE_FIELD)):
		return
	if doc.get(APPLICANT_DRIVE_FIELD) or not doc.get(APPLICANT_INVITE_FIELD):
		return
	drive = drive_for_invite(doc.get(APPLICANT_INVITE_FIELD))
	if drive:
		doc.set(APPLICANT_DRIVE_FIELD, drive)


def sync_drive_applicant_links(drive_name, invites):
	"""Stamp `custom_campus_drive` = `drive_name` on every Job Applicant that applied
	through one of this drive's `invites`, and release the ones whose invite is no
	longer on the drive. Returns ``{"linked": n, "released": n}``.

	Only applicants with an EMPTY drive are claimed, so a candidate already tied to
	another drive is never silently moved. Releasing is just as narrow: an applicant is
	cleared only when they carry an invite this drive no longer lists — candidates
	stamped straight from the registration QR (drive, no invite) are left alone.

	Writes with db.set_value per row: the row set is one drive's campus cohort, and
	`update_modified=False` keeps a drive save off the applicants' timestamps.
	"""
	invites = [i for i in dict.fromkeys(invites or []) if i]

	# Filters are given as a LIST so the invite field can carry two conditions: it must
	# be set AND not one of this drive's invites. ("not in" alone would also sweep up
	# applicants with no invite at all — the QR-registered ones.)
	release_filters = [
		[APPLICANT_DRIVE_FIELD, "=", drive_name],
		[APPLICANT_INVITE_FIELD, "is", "set"],
	]
	if invites:
		release_filters.append([APPLICANT_INVITE_FIELD, "not in", invites])
	# ignore_permissions on both scans: the link must cover the drive's whole cohort,
	# not just the applicants the user saving the drive happens to be able to read.
	released = frappe.get_all("Job Applicant", filters=release_filters, pluck="name",
	                          ignore_permissions=True)
	for name in released:
		frappe.db.set_value("Job Applicant", name, APPLICANT_DRIVE_FIELD, None,
		                    update_modified=False)

	linked = []
	if invites:
		linked = frappe.get_all(
			"Job Applicant",
			# "is not set" covers NULL and "" together — an `in (NULL, "")` filter would
			# silently miss the NULL rows, which is most of them.
			filters=[
				[APPLICANT_INVITE_FIELD, "in", invites],
				[APPLICANT_DRIVE_FIELD, "is", "not set"],
			],
			pluck="name",
			ignore_permissions=True,
		)
		for name in linked:
			frappe.db.set_value("Job Applicant", name, APPLICANT_DRIVE_FIELD, drive_name,
			                    update_modified=False)

	return {"linked": len(linked), "released": len(released)}
