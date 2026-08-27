"""Shared validators for the campus doctypes."""

import frappe
from frappe import _

APPLICANT_DRIVE_FIELD = "custom_campus_drive"
APPLICANT_INVITE_FIELD = "custom_campus_invite"
APPLICANT_SPOT_FIELD = "custom_spot_registered"


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


def invite_for_drive_institute(campus_drive, institute, job_opening=None):
	"""The Campus Invite on `campus_drive` that covers `institute`, or None.

	A walk-in registers straight from the drive's QR, so there is no invite in the
	URL to carry the way the portal flow does — yet the invite is what the rest of
	campus reads a candidate's provenance from (`custom_region` is fetched off it,
	and the drive board's pools were built from it). It therefore has to be resolved
	backwards from what the candidate DID pick: their institute, and the opening they
	applied to when that narrows the choice further.

	Drive order decides ties — the invites are read in the order HR put them on the
	drive, so the answer is stable rather than dependent on insertion timestamps. A
	drive running no invites at all (a pure spot-registration drive) simply has no
	invite to give, and the candidate stays linked by `custom_campus_drive` alone.
	"""
	if not (campus_drive and institute):
		return None

	# ignore_permissions throughout: a walk-in submitting the registration form is a
	# Guest, and their provenance must still resolve.
	invites = frappe.get_all(
		"Campus Drive Invite",
		filters={"parenttype": "Campus Drive", "parentfield": "campus_invites",
		         "parent": campus_drive},
		pluck="campus_invite",
		order_by="idx asc",
		ignore_permissions=True,
	)
	invites = [i for i in dict.fromkeys(invites) if i]
	if not invites:
		return None

	covering = {
		r.parent for r in frappe.get_all(
			"Campus Invite Institute",
			filters={"parenttype": "Campus Invite", "parent": ["in", invites],
			         "institute": institute},
			fields=["parent"],
			ignore_permissions=True,
		)
	}
	# Filtered through `invites` rather than used as-is, so drive order is kept.
	candidates = [i for i in invites if i in covering]
	if not candidates:
		return None

	if job_opening and len(candidates) > 1:
		with_opening = {
			r.parent for r in frappe.get_all(
				"Campus Invite Job Opening",
				filters={"parenttype": "Campus Invite", "parent": ["in", candidates],
				         "job_opening": job_opening},
				fields=["parent"],
				ignore_permissions=True,
			)
		}
		narrowed = [i for i in candidates if i in with_opening]
		# Only narrow when something survives: an opening added to the drive but not
		# to any invite must not lose the institute match we already have.
		if narrowed:
			candidates = narrowed

	return candidates[0]


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
	# A walk-in now carries an invite too (resolved from the institute they picked at
	# the venue — see `invite_for_drive_institute`), so dropping that invite from the
	# drive would otherwise release someone who physically registered AT this drive.
	# Their tie is the drive itself; the invite is only provenance.
	if frappe.get_meta("Job Applicant").has_field(APPLICANT_SPOT_FIELD):
		release_filters.append([APPLICANT_SPOT_FIELD, "!=", 1])
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


# ---------------------------------------------------------------------------
# Institute lock: a drive going live closes that college's registrations
#
# An invite carries several institutes, and HR schedules them into drives sized by
# candidate count (one big college on its own, two small ones merged). So
# "registration is closed" is never a fact about the invite as a whole — it is a
# fact about one college on it. The moment a college's drive leaves Draft its list
# is frozen; the colleges still waiting for a drive carry on registering.
#
# The invite's Registration Expiry Date remains the deadline for the colleges that
# have NOT been scheduled yet, which is why HR can keep extending it after submit.
# ---------------------------------------------------------------------------

# Statuses a Campus Drive has once it has been scheduled and gone live. A Draft
# drive is still being planned — HR may still add colleges to it or drop them, so
# it must not freeze anyone.
DRIVE_LIVE_STATUSES = ("Live", "In Progress", "Completed", "Closed")


def drives_on_invites(campus_invites, exclude_drive=None):
	"""Names of the Campus Drives that selected any of `campus_invites`."""
	campus_invites = [i for i in dict.fromkeys(campus_invites or []) if i]
	if not campus_invites:
		return []
	names = frappe.get_all(
		"Campus Drive Invite",
		filters={"parenttype": "Campus Drive", "campus_invite": ["in", campus_invites]},
		pluck="parent",
	)
	return [n for n in dict.fromkeys(names) if n and n != exclude_drive]


def drive_institutes_by_status(campus_invites, statuses, exclude_drive=None):
	"""``{institute: campus_drive}`` for the institutes carried by drives on any of
	`campus_invites` whose `drive_status` is one of `statuses`.

	`exclude_drive` leaves a drive out of the reckoning so it never sees itself.

	Read with `frappe.get_all` (permissions off) on purpose: a TPO has no access to
	Campus Drive at all, yet the answer has to be the same for them as for HR.
	"""
	drives = drives_on_invites(campus_invites, exclude_drive=exclude_drive)
	if not drives:
		return {}

	matching = frappe.get_all(
		"Campus Drive",
		filters={"name": ["in", drives], "drive_status": ["in", list(statuses)]},
		pluck="name",
	)
	if not matching:
		return {}

	found = {}
	for row in frappe.get_all(
		"Campus Drive Institute",
		filters={"parenttype": "Campus Drive", "parentfield": "participating_institutes",
		         "parent": ["in", matching]},
		fields=["parent", "institute"],
		order_by="parent asc, idx asc",
	):
		# First drive wins the attribution — the message only needs to name one.
		if row.institute and row.institute not in found:
			found[row.institute] = row.parent
	return found


def live_drive_institutes(campus_invites, exclude_drive=None):
	"""``{institute: campus_drive}`` for the institutes already claimed by a live drive.

	These are the colleges whose registration window has closed, and the ones HR may
	no longer put on a new drive.
	"""
	return drive_institutes_by_status(campus_invites, DRIVE_LIVE_STATUSES,
	                                 exclude_drive=exclude_drive)


def draft_drive_institutes(campus_invites, exclude_drive=None):
	"""``{institute: campus_drive}`` for the institutes sitting on a DRAFT drive.

	Not a lock — HR moves colleges between draft drives while sizing the batches, and
	must be free to. It is only worth saying out loud, because both drafts go live by
	the calendar (see `update_drive_statuses`) rather than by a save, and nothing
	validates them at that moment: two drafts holding the same college would both turn
	live and each claim it.
	"""
	return drive_institutes_by_status(campus_invites, ("Draft",),
	                                 exclude_drive=exclude_drive)


def locked_institutes_for_invite(campus_invite):
	"""``{institute: campus_drive}`` for one invite. See `live_drive_institutes`."""
	return live_drive_institutes([campus_invite])


def open_institutes_for_invite(campus_invite, institutes=None):
	"""The invited institutes on `campus_invite` that may still register candidates.

	`institutes` narrows the answer to a subset (a TPO's own colleges); omit it to
	ask about every college on the invite.
	"""
	from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

	invited = institutes if institutes is not None else get_invite_institutes(campus_invite)
	locked = locked_institutes_for_invite(campus_invite)
	return [i for i in invited if i not in locked]
