"""Backend for the TPO Campus Drives block on the TPO Space workspace.

The block lists the campus drives the logged-in TPO was invited to. Its
"Add Candidates" button opens the ordinary Candidate Registration form with the
drive's Campus Invite pre-selected — so registering is the standard form (whose
Candidates grid already offers Download / Upload for bulk entry), and this module
only has to answer "which drives are mine, and how are they doing?".

Its "View Candidates" button asks ``get_drive_candidates`` the follow-up question:
not how many were registered, but where each of them has actually got to — still a
draft, registered and yet to apply, or applied and sitting somewhere in the hiring
pipeline.

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
				"applied_count": stats.get("applied", 0),
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


# ---------------------------------------------------------------------------
# "Where has each of my candidates got to?"
#
# A TPO submits a Candidate Registration; the candidates on it are then emailed and
# apply themselves, which is what creates the Job Applicant. So a candidate sits in
# one of three places, and the card only ever showed the first:
#
#   Draft       the registration has not been submitted — nobody has been emailed
#   Registered  submitted, but this candidate has not applied yet
#   Applied     a Job Applicant exists, and carries its own status and stage
#
# Everything below is scoped to what the caller may already see: the registrations
# come through frappe.get_list (candidate_registration_query narrows a TPO to their
# own), and the Job Applicants are looked up BY THOSE candidates' email addresses.
# ---------------------------------------------------------------------------

# What a candidate's row says when there is no Job Applicant for them yet.
STATE_DRAFT = "Draft"
STATE_REGISTERED = "Registered"
STATE_APPLIED = "Applied"


def _full_name(row):
	return " ".join(
		part for part in (row.get("first_name"), row.get("middle_name"), row.get("last_name"))
		if part and part.strip()
	).strip()


def _opening_titles(openings):
	"""``{Job Opening: job_title}`` — a TPO has no read access to Job Opening, and a
	raw HR-OPN id on their screen means nothing to them."""
	openings = [o for o in dict.fromkeys(openings) if o]
	if not openings:
		return {}
	return {
		r.name: r.job_title or r.name
		for r in frappe.get_all(
			"Job Opening", filters={"name": ["in", openings]}, fields=["name", "job_title"],
			ignore_permissions=True,
		)
	}


def _applications_by_candidate(invites, emails):
	"""``{(invite, email): [application, ...]}`` for the given candidates.

	ignore_permissions on purpose, and safe because of what is passed in: the emails
	are the caller's OWN registered candidates (resolved through a permission-checked
	read), and the invites are the ones they can already see. A TPO has no access to
	Job Applicant itself — without this their candidates would all read "Registered"
	forever, which is precisely the thing they are asking about.
	"""
	emails = [e for e in dict.fromkeys(emails) if e]
	if not (invites and emails):
		return {}
	rows = frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", list(invites)], "email_id": ["in", emails]},
		fields=["name", "email_id", "custom_campus_invite", "status", "custom_current_stage",
		        "custom_spot_registered", "job_title", "creation"],
		order_by="creation asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	titles = _opening_titles([r.job_title for r in rows])
	out = {}
	for r in rows:
		key = (r.custom_campus_invite, (r.email_id or "").strip().lower())
		# One candidate may apply to more than one opening on the same invite, so this
		# is a list — collapsing it would silently hide an application.
		out.setdefault(key, []).append({
			"job_applicant": r.name,
			"job_title": titles.get(r.job_title) or r.job_title,
			"status": r.status,
			"stage": r.custom_current_stage,
			"spot_registered": bool(r.custom_spot_registered),
		})
	return out


def _registration_stats(invites):
	"""Per-invite counts of the caller's own registrations and candidates.

	Goes through ``frappe.get_list`` (permission-checked), so
	``candidate_registration_query`` scopes a TPO to the registrations they own —
	the numbers on a drive card are always "what I have submitted", never another
	college's.

	Candidates who registered at the venue on the day carry no Candidate Registration
	at all, but they are still this college's candidates on this drive — and the
	candidate list dialog already lists them. They are counted here too, so the card
	and the dialog never disagree about how many candidates a drive has.
	"""
	registrations = frappe.get_list(
		"Candidate Registration",
		filters={"campus_invite": ["in", invites], "docstatus": ["<", 2]},
		fields=["name", "campus_invite", "docstatus"],
		limit_page_length=0,
	)
	if not registrations:
		# No registrations does not mean no candidates: a drive can be made up
		# entirely of walk-ins.
		return _spot_stats(invites, {})

	# Child table, already fenced to the parents resolved above. The email comes along
	# so the same rows can say who has since applied, without a second read.
	#
	# Counting in Python rather than with a SQL COUNT/GROUP BY on purpose: v16
	# rejects SQL functions written as field strings ("SQL functions are not
	# allowed as strings in SELECT"), and its dict form ({"COUNT": "*"}) does not
	# exist on v15. Plucking one column and tallying works identically on both,
	# and the payload is a single short column.
	rows = frappe.get_all(
		"Candidate Registration Detail",
		filters={
			"parenttype": "Candidate Registration",
			"parentfield": "candidates",
			"parent": ["in", [r.name for r in registrations]],
		},
		fields=["parent", "email_id"],
		limit_page_length=0,
	)
	rows_by_parent = Counter(r.parent for r in rows)

	invite_of = {r.name: r.campus_invite for r in registrations}
	submitted = {r.name for r in registrations if r.docstatus != 0}
	# Only submitted registrations can have applied — a draft has not been emailed.
	applications = _applications_by_candidate(
		invites, [r.email_id for r in rows if r.parent in submitted]
	)

	stats = {}
	for reg in registrations:
		bucket = stats.setdefault(reg.campus_invite,
		                          {"registrations": 0, "candidates": 0, "drafts": 0, "applied": 0})
		bucket["registrations"] += 1
		if reg.docstatus == 0:
			bucket["drafts"] += 1
		else:
			# Only submitted rows count as registered — a draft has not been
			# emailed and cannot be applied against yet.
			bucket["candidates"] += rows_by_parent.get(reg.name, 0)

	# How many of those registered candidates have actually applied. Counted per
	# candidate, not per application: someone who applied to two openings on the same
	# invite is still one candidate who has applied.
	for row in rows:
		if row.parent not in submitted:
			continue
		invite = invite_of.get(row.parent)
		key = (invite, (row.email_id or "").strip().lower())
		if applications.get(key):
			stats[invite]["applied"] += 1

	# Everyone the TPO typed in is now counted; add the ones who turned up at the
	# venue instead. Emails already on a registration are excluded, exactly as the
	# dialog does, so a candidate who was both registered and scanned in at the desk
	# is one candidate, not two.
	seen = {}
	for row in rows:
		invite = invite_of.get(row.parent)
		seen.setdefault(invite, set()).add((row.email_id or "").strip().lower())
	return _spot_stats(invites, seen, stats)


def _spot_stats(invites, seen_by_invite, stats=None):
	"""Fold the venue registrations of each invite into ``stats``.

	A walk-in has applied by definition — the Job Applicant is what the desk creates —
	so each one counts once as a candidate and once as applied.
	"""
	stats = stats if stats is not None else {}
	counted = {}
	for row in _spot_rows(invites, ["custom_campus_invite", "email_id"]):
		invite = row.custom_campus_invite
		email = (row.email_id or "").strip().lower()
		if email in (seen_by_invite.get(invite) or set()):
			continue
		# One walk-in can be put up for two openings on the same drive; that is still
		# one candidate, the same way it is for a registered one.
		if email in counted.setdefault(invite, set()):
			continue
		counted[invite].add(email)
		bucket = stats.setdefault(invite,
		                          {"registrations": 0, "candidates": 0, "drafts": 0, "applied": 0})
		bucket["candidates"] += 1
		bucket["applied"] += 1
	return stats


@frappe.whitelist()
def get_drive_candidates(campus_invite):
	"""Every candidate the caller has on `campus_invite`, and where each has got to.

	The drive card could only ever say how many candidates were registered, which is
	the least interesting half of the question: a TPO wants to know who has actually
	applied and what has happened to them since. Each row therefore carries its own
	state — Draft / Registered / Applied — and, once applied, the Job Applicant's
	status and current hiring stage.

	Candidates who registered at the venue on the day (the drive's QR code) have no
	Candidate Registration behind them at all. They are listed too, marked
	``spot_registered``, so the list is every candidate of this college on the drive
	rather than only the ones the TPO typed in.
	"""
	invite = (campus_invite or "").strip()
	if not invite:
		frappe.throw(frappe._("campus_invite is required."))
	# Permission-checked read: campus_invite_query narrows a TPO to their own invites,
	# so an id they were not invited to simply is not found.
	invite_row = frappe.get_list(
		"Campus Invite",
		filters={"name": invite},
		fields=["name", "campus_invite_name", "registration_expiry_date"],
		limit_page_length=1,
	)
	if not invite_row:
		frappe.throw(frappe._("You do not have access to this campus drive."),
		             frappe.PermissionError)
	invite_row = invite_row[0]

	registrations = frappe.get_list(
		"Candidate Registration",
		filters={"campus_invite": invite, "docstatus": ["<", 2]},
		fields=["name", "docstatus", "institute", "institute_name"],
		order_by="creation asc",
		limit_page_length=0,
	)
	detail = []
	if registrations:
		detail = frappe.get_all(
			"Candidate Registration Detail",
			filters={
				"parenttype": "Candidate Registration",
				"parentfield": "candidates",
				"parent": ["in", [r.name for r in registrations]],
			},
			fields=["parent", "idx", "first_name", "middle_name", "last_name",
			        "email_id", "mobile_number"],
			order_by="parent asc, idx asc",
			limit_page_length=0,
		)

	by_name = {r.name: r for r in registrations}
	applications = _applications_by_candidate([invite], [r.email_id for r in detail])

	candidates = []
	seen_emails = set()
	for row in detail:
		registration = by_name[row.parent]
		email = (row.email_id or "").strip().lower()
		seen_emails.add(email)
		# A draft registration has not been emailed, so its candidates cannot have
		# applied — they are not waiting on the candidate, they are waiting on the TPO.
		apps = applications.get((invite, email)) or [] if registration.docstatus != 0 else []
		candidates.append({
			"full_name": _full_name(row) or row.email_id,
			"email_id": row.email_id,
			"mobile_number": row.mobile_number,
			"institute": registration.institute_name or registration.institute,
			"registration": registration.name,
			"submitted": registration.docstatus != 0,
			"spot_registered": False,
			"state": (STATE_APPLIED if apps
			          else STATE_REGISTERED if registration.docstatus != 0
			          else STATE_DRAFT),
			"applications": apps,
		})

	# Walk-ins: on this invite, with no registration behind them. Scoped to the
	# caller's own colleges so a TPO never sees another college's candidates.
	for extra in _spot_candidates(invite, seen_emails):
		candidates.append(extra)

	summary = Counter(c["state"] for c in candidates)
	return {
		"campus_invite": invite_row.name,
		"campus_invite_name": invite_row.campus_invite_name or invite_row.name,
		"candidates": candidates,
		"summary": {
			"total": len(candidates),
			"draft": summary.get(STATE_DRAFT, 0),
			"registered": summary.get(STATE_REGISTERED, 0),
			"applied": summary.get(STATE_APPLIED, 0),
		},
	}


def _spot_candidates(invite, exclude_emails):
	"""Candidates who registered at the venue on this invite, with no Candidate
	Registration behind them.

	Scoped to the caller's own colleges when they are a TPO: the walk-in carries the
	institute they picked at the desk, and a TPO must only ever see their own.
	"""
	rows = _spot_rows(
		[invite],
		["name", "custom_full_name", "applicant_name", "email_id", "phone_number",
		 "custom_institute", "status", "custom_current_stage", "job_title"],
	)
	titles = _opening_titles([r.job_title for r in rows])
	out = []
	by_email = {}
	for r in rows:
		email = (r.email_id or "").strip().lower()
		if email in exclude_emails:
			continue
		application = {
			"job_applicant": r.name,
			"job_title": titles.get(r.job_title) or r.job_title,
			"status": r.status,
			"stage": r.custom_current_stage,
			"spot_registered": True,
		}
		# A walk-in put up for two openings is one candidate with two applications,
		# the same as a registered one — not two people on the list.
		if email and email in by_email:
			by_email[email]["applications"].append(application)
			continue
		candidate = {
			"full_name": r.custom_full_name or r.applicant_name or r.email_id,
			"email_id": r.email_id,
			"mobile_number": r.phone_number,
			"institute": r.custom_institute,
			"registration": None,
			"submitted": True,
			"spot_registered": True,
			"state": STATE_APPLIED,
			"applications": [application],
		}
		if email:
			by_email[email] = candidate
		out.append(candidate)
	return out


def _spot_rows(invites, fields):
	"""Job Applicants created at the venue desk on these invites.

	Scoped to the caller's own colleges when they are a TPO: the walk-in carries the
	institute they picked at the desk, and a TPO must only ever see their own.

	ignore_permissions for the same reason as ``_applications_by_candidate``: a TPO
	has no read access to Job Applicant, and the filters below are what fence this
	to their own drives and their own college.
	"""
	invites = [i for i in dict.fromkeys(invites) if i]
	if not invites:
		return []
	filters = {"custom_campus_invite": ["in", invites], "custom_spot_registered": 1}
	if is_tpo_only():
		mine = _primary_institutes(frappe.session.user)
		if not mine:
			return []
		filters["custom_institute"] = ["in", mine]
	return frappe.get_all(
		"Job Applicant",
		filters=filters,
		fields=fields,
		order_by="creation asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
