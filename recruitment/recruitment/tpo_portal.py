"""Backend for the TPO Campus Drives block on the TPO Space workspace.

The block lists the campus drives the logged-in TPO was invited to. Its
"Add Candidates" button opens the ordinary Candidate Registration form with the
drive's Campus Invite pre-selected — so registering is the standard form (whose
Candidates grid already offers Download / Upload for bulk entry), and this module
only has to answer "which drives are mine, and how are they doing?".

Scoping is done by the permission system, not by hand: Campus Invite and
Candidate Registration are read with ``frappe.get_list``, so ``campus_invite_query``
narrows a TPO to the invites carrying their email and ``candidate_registration_query``
to the registrations they own. HR sees every live drive.
"""

from collections import Counter

import frappe

from recruitment.recruitment.campus_helpers import live_drive_institutes
from recruitment.recruitment.doctype.candidate_registration.candidate_registration import (
	is_tpo_only,
)


@frappe.whitelist()
def get_my_campus_drives():
	"""Live campus drives the caller may register candidates against.

	For a TPO these are the submitted, not-yet-finished Campus Invites carrying
	their email. Each drive carries the openings it is hiring for and how many
	candidates the caller has put on it so far.

	An invite stays on the list once the caller's college has been scheduled — the
	registered counts are still theirs to look at — but comes back flagged
	``registration_closed`` so the card drops its "Add Candidates" button.
	"""
	# get_list, not get_all: get_all sets ignore_permissions and would hand every
	# TPO every college's drives. The scoping lives in campus_invite_query, which
	# only runs on a permission-checked read.
	invites = frappe.get_list(
		"Campus Invite",
		filters={"docstatus": 1, "status": ["not in", ["Completed", "Closed"]]},
		fields=["name", "campus_invite_name", "region", "status", "modified",
		        "registration_expiry_date"],
		order_by="modified desc",
		limit_page_length=0,
	)
	if not invites:
		return []

	from frappe.utils import getdate, nowdate

	tpo_only = is_tpo_only()
	names = [i.name for i in invites]
	openings = _openings_by_invite(names)
	registered = _registration_stats(names)
	institutes_by_invite = _institutes_by_invite(names)
	# A college stops registering when its own campus drive goes live, which happens at
	# a different time for each college on the invite. Resolved here so the card can say
	# so up front, rather than the TPO meeting it as an error on save.
	locked_by_invite = {n: live_drive_institutes([n]) for n in names}
	# The colleges this TPO is Primary at don't change per invite — resolve them once
	# and intersect in memory, rather than asking the same question per drive.
	my_institutes = set(_primary_institutes(frappe.session.user)) if tpo_only else set()
	today = getdate(nowdate())

	drives = []
	for invite in invites:
		stats = registered.get(invite.name) or {}
		# Shown on the card so a TPO sees the deadline coming, rather than meeting it
		# as an error when they try to save a registration.
		expiry = invite.registration_expiry_date
		invited = institutes_by_invite.get(invite.name) or []
		locked = locked_by_invite.get(invite.name) or {}
		# Which of the TPO's own colleges this drive resolves to (they can be Primary
		# at more than one). Same answer get_tpo_institute gives, without a query
		# per drive.
		mine = [i for i in invited if i in my_institutes] if tpo_only else []
		# The colleges this caller can still register for. A TPO is closed only when
		# EVERY college of theirs on this invite has a live drive — one live drive must
		# not silence a second college that is still waiting for one.
		scope = mine if tpo_only else invited
		still_open = [i for i in scope if i not in locked]
		past_deadline = bool(expiry and getdate(expiry) < today)
		drive_live = bool(scope) and not still_open
		drives.append(
			{
				"name": invite.name,
				"campus_invite_name": invite.campus_invite_name or invite.name,
				"region": invite.region,
				"status": invite.status,
				"registration_expiry_date": str(expiry) if expiry else None,
				"registration_closed": past_deadline or drive_live,
				# Which of the two gates closed it, so the card can explain itself: a
				# deadline is something HR can extend, a live drive is not.
				"closed_reason": "drive_live" if drive_live else ("deadline" if past_deadline else None),
				# Not shown on the card, but kept so the caller can tell which
				# college a drive resolves to for them.
				"institute": (still_open or mine or [None])[0] if tpo_only else None,
				"institutes": invited,
				"open_institutes": still_open,
				"locked_institutes": [{"institute": i, "campus_drive": locked[i]}
				                      for i in scope if i in locked],
				"openings": openings.get(invite.name) or [],
				"candidate_count": stats.get("candidates", 0),
				"registration_count": stats.get("registrations", 0),
				"draft_count": stats.get("drafts", 0),
			}
		)
	return drives


def _institutes_by_invite(invites):
	"""``{invite: [institute, ...]}`` for every invite in one query."""
	if not invites:
		return {}
	out = {}
	for row in frappe.get_all(
		"Campus Invite Institute",
		filters={"parenttype": "Campus Invite", "parent": ["in", invites]},
		fields=["parent", "institute"], order_by="idx asc",
	):
		if row.institute:
			out.setdefault(row.parent, []).append(row.institute)
	return out


def _primary_institutes(user):
	"""The colleges this user is Primary TPO at — one query, no invite involved."""
	from recruitment.recruitment.tpo_access import PRIMARY_TPO_ROLE

	if not user or user in ("Administrator", "Guest"):
		return []
	return list(dict.fromkeys(frappe.get_all(
		"Institute TPO Contact",
		filters={"parenttype": "Institute", "email": user, "role": PRIMARY_TPO_ROLE},
		pluck="parent",
	)))


def _openings_by_invite(invites):
	"""Job openings per invite, read off the child table.

	`job_title` / `region` / `opening_status` are stored on the row (fetched when
	HR built the invite), so a TPO never needs read access to Job Opening itself.
	"""
	rows = frappe.get_all(
		"Campus Invite Job Opening",
		filters={"parenttype": "Campus Invite", "parentfield": "job_openings", "parent": ["in", invites]},
		fields=["parent", "job_opening", "job_title", "region", "opening_status"],
		order_by="parent asc, idx asc",
	)
	grouped = {}
	for row in rows:
		grouped.setdefault(row.parent, []).append(
			{
				"job_opening": row.job_opening,
				"job_title": row.job_title or row.job_opening,
				"region": row.region,
				"status": row.opening_status,
			}
		)
	return grouped


def _registration_stats(invites):
	"""Per-invite counts of the caller's own registrations and candidates.

	Goes through ``frappe.get_list`` (permission-checked), so
	``candidate_registration_query`` scopes a TPO to the registrations they own —
	the numbers on a drive card are always "what I have submitted", never another
	college's.
	"""
	registrations = frappe.get_list(
		"Candidate Registration",
		filters={"campus_invite": ["in", invites], "docstatus": ["<", 2]},
		fields=["name", "campus_invite", "docstatus"],
		limit_page_length=0,
	)
	if not registrations:
		return {}

	# Child table, already fenced to the parents resolved above.
	#
	# Counting in Python rather than with a SQL COUNT/GROUP BY on purpose: v16
	# rejects SQL functions written as field strings ("SQL functions are not
	# allowed as strings in SELECT"), and its dict form ({"COUNT": "*"}) does not
	# exist on v15. Plucking one column and tallying works identically on both,
	# and the payload is a single short column.
	parents = frappe.get_all(
		"Candidate Registration Detail",
		filters={
			"parenttype": "Candidate Registration",
			"parentfield": "candidates",
			"parent": ["in", [r.name for r in registrations]],
		},
		pluck="parent",
		limit_page_length=0,
	)
	rows_by_parent = Counter(parents)

	stats = {}
	for reg in registrations:
		bucket = stats.setdefault(reg.campus_invite, {"registrations": 0, "candidates": 0, "drafts": 0})
		bucket["registrations"] += 1
		if reg.docstatus == 0:
			bucket["drafts"] += 1
		else:
			# Only submitted rows count as registered — a draft has not been
			# emailed and cannot be applied against yet.
			bucket["candidates"] += rows_by_parent.get(reg.name, 0)
	return stats
