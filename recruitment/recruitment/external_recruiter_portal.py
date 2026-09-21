"""Backend for the External Recruiter Openings block on the External Recruiter workspace.

The block lists the Job Openings the logged-in external recruiter may submit
candidates against, and — for each — how the candidates already on it are doing.
Its "Submit Candidate" button opens the ordinary Job Applicant form with the
opening pre-selected, so submitting stays the standard form and this module only
has to answer "which openings are mine, and how are they doing?".

Deliberately read-only. Nothing here creates, edits or deletes a document, and
nothing widens what the caller can already see:

* Scoping is done by the permission system, not by hand. Job Opening and Job
  Applicant are read with ``frappe.get_list``, so ``job_opening_query`` narrows an
  external recruiter to the openings assigned to them (directly or via a group,
  and only while the posting window is live) and ``ja_query`` to the applicants
  under those openings. A privileged HR user sees everything, exactly as they do
  in the list view.
* Every read is guarded by ``frappe.has_permission`` first. The External Recruiter
  role's doctype permissions are configured per site in Desk (see
  ``recruitment/patches/setup_external_recruiter_access.py``), so a site that has
  not granted them yet must get an empty board, never a PermissionError dialog.
"""

from collections import Counter

import frappe
from frappe.utils import getdate, nowdate

OPENING_DT = "Job Opening"
APPLICANT_DT = "Job Applicant"

# Order the pipeline chips read in, so a card is scannable left-to-right rather
# than in whatever order Counter happened to produce. Anything not listed (a site
# may add its own status) is appended afterwards, alphabetically.
STATUS_ORDER = [
	"Draft",
	"Open",
	"Shortlisted",
	"Interview",
	"Hold",
	"Approvals",
	"Hired",
	"Accepted",
	"Rejected",
]

# Statuses that mean this candidate is no longer moving forward. Kept out of the
# "in play" headline count so a card does not read as busier than it is.
INACTIVE_STATUSES = {"Rejected"}


@frappe.whitelist()
def get_my_openings():
	"""The openings the caller may work, each with its candidate counts.

	Returns ``{"openings": [...], "can_create_applicant": bool,
	"can_read_applicants": bool}``. The two flags let the block hide buttons it
	would only be able to fail at, rather than offering an action the caller's
	role cannot perform.
	"""
	if not frappe.has_permission(OPENING_DT, "read"):
		return {"openings": [], "can_create_applicant": False, "can_read_applicants": False}

	openings = frappe.get_list(
		OPENING_DT,
		fields=[
			"name",
			"job_title",
			"designation",
			"department",
			"location",
			"company",
			"status",
			"employment_type",
			"custom_work_experience_range",
			"closes_on",
		],
		order_by="modified desc",
		limit_page_length=0,
	)

	can_read_applicants = frappe.has_permission(APPLICANT_DT, "read")
	can_create_applicant = frappe.has_permission(APPLICANT_DT, "create")

	if not openings:
		return {
			"openings": [],
			"can_create_applicant": can_create_applicant,
			"can_read_applicants": can_read_applicants,
		}

	names = [o.name for o in openings]
	windows = _my_posting_windows(names)
	stats = _applicant_stats(names) if can_read_applicants else {}
	today = getdate(nowdate())

	board = []
	for opening in openings:
		stat = stats.get(opening.name) or {}
		# The date this caller's own posting comes down, which is not the same as the
		# opening's closes_on: the opening can stay open while this recruiter's window
		# ends. Showing it stops a recruiter discovering the cut-off by finding the
		# opening has silently vanished from their list.
		posting_closes = windows.get(opening.name)
		days_left = (getdate(posting_closes) - today).days if posting_closes else None

		board.append(
			{
				"name": opening.name,
				"job_title": opening.job_title or opening.name,
				"designation": opening.designation,
				"department": opening.department,
				"location": opening.location,
				"company": opening.company,
				"status": opening.status,
				"employment_type": opening.employment_type,
				"experience": opening.custom_work_experience_range,
				"closes_on": str(opening.closes_on) if opening.closes_on else None,
				"posting_closes_on": str(posting_closes) if posting_closes else None,
				"days_left": days_left,
				"candidate_count": stat.get("total", 0),
				"active_count": stat.get("active", 0),
				"my_count": stat.get("mine", 0),
				"pipeline": stat.get("pipeline", []),
			}
		)

	return {
		"openings": board,
		"can_create_applicant": can_create_applicant,
		"can_read_applicants": can_read_applicants,
	}


def _my_posting_windows(openings):
	"""``{opening: display_to}`` for the caller's own external-recruiter postings.

	Only meaningful for a real external recruiter; an HR user reading this board has
	no TA External Recruiter record and gets ``{}``, so their cards simply carry no
	posting-window note. Where a recruiter is reached by more than one row (directly
	*and* through a group) the latest end date wins — that is the date they actually
	stop being able to submit. An open-ended row (no display_to) beats every dated
	one and is represented by dropping the opening from the map.
	"""
	recruiter = frappe.db.get_value("TA External Recruiter", {"user": frappe.session.user}, "name")
	if not recruiter or not openings:
		return {}

	groups = frappe.get_all(
		"TA External Recruiter Group Member",
		filters={"external_recruiter": recruiter, "parenttype": "TA External Recruiter Group"},
		pluck="parent",
	)

	# ignore_permissions: a child table carries no permissions of its own, and the
	# parents were just resolved through a permission-checked read above — so this
	# can only describe openings the caller can already see.
	rows = frappe.get_all(
		"Job Opening Posting Channel",
		filters={
			"parent": ["in", openings],
			"parenttype": OPENING_DT,
			"parentfield": "custom_posting_options",
			"post_to": ["in", ["External Recruiter", "External Recruiter Group"]],
		},
		fields=["parent", "external_recruiter", "external_recruiter_group", "display_to"],
		ignore_permissions=True,
		limit_page_length=0,
	)

	windows = {}
	open_ended = set()
	for row in rows:
		mine = row.external_recruiter == recruiter or (
			row.external_recruiter_group and row.external_recruiter_group in groups
		)
		if not mine:
			continue
		if not row.display_to:
			open_ended.add(row.parent)
			continue
		current = windows.get(row.parent)
		if not current or getdate(row.display_to) > getdate(current):
			windows[row.parent] = row.display_to

	return {k: v for k, v in windows.items() if k not in open_ended}


def _applicant_stats(openings):
	"""Per-opening candidate counts, in one permission-checked read.

	get_list, not get_all: get_all sets ignore_permissions and would hand every
	external recruiter every opening's candidates. The scoping lives in ``ja_query``.
	"""
	rows = frappe.get_list(
		APPLICANT_DT,
		filters={"job_title": ["in", openings]},
		fields=["name", "job_title", "status", "owner"],
		limit_page_length=0,
	)

	by_opening = {}
	for row in rows:
		bucket = by_opening.setdefault(
			row.job_title, {"total": 0, "active": 0, "mine": 0, "counter": Counter()}
		)
		bucket["total"] += 1
		if row.status not in INACTIVE_STATUSES:
			bucket["active"] += 1
		if row.owner == frappe.session.user:
			bucket["mine"] += 1
		bucket["counter"][row.status or "Open"] += 1

	for bucket in by_opening.values():
		bucket["pipeline"] = _ordered_pipeline(bucket.pop("counter"))
	return by_opening


def _ordered_pipeline(counter):
	"""``Counter`` -> ``[{"status": ..., "count": ...}]`` in STATUS_ORDER order."""
	known = [
		{"status": status, "count": counter[status]} for status in STATUS_ORDER if counter.get(status)
	]
	extra = sorted(set(counter) - set(STATUS_ORDER))
	return known + [{"status": status, "count": counter[status]} for status in extra]


@frappe.whitelist()
def get_opening_candidates(job_opening):
	"""Every candidate the caller can see on one opening, with where they have got to.

	The card can only say how many candidates there are, which is the least
	interesting half of the question. This answers the other half: who they are and
	what status and hiring stage each of them is sitting at.
	"""
	# Re-check on the single document rather than trusting the name off the wire.
	# get_list below is permission-checked too, so this is belt-and-braces — but it
	# turns "someone guessed an opening name" into a clean error instead of a
	# silently empty list that reads like the opening has no candidates.
	#
	# The existence check comes first only so an unknown name answers "not allowed"
	# rather than raising DoesNotExistError out of has_permission(doc=...). Same
	# refusal either way; this one does not put a traceback in front of the user.
	if not frappe.db.exists(OPENING_DT, job_opening) or not frappe.has_permission(
		OPENING_DT, "read", doc=job_opening
	):
		frappe.throw(
			frappe._("You are not allowed to view candidates for this opening."),
			frappe.PermissionError,
		)

	if not frappe.has_permission(APPLICANT_DT, "read"):
		return {"summary": {}, "candidates": []}

	rows = frappe.get_list(
		APPLICANT_DT,
		filters={"job_title": job_opening},
		fields=[
			"name",
			"applicant_name",
			"email_id",
			"phone_number",
			"status",
			"custom_current_stage",
			"source",
			"owner",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=0,
	)

	user = frappe.session.user
	candidates = [
		{
			"job_applicant": row.name,
			"full_name": row.applicant_name or row.name,
			"email_id": row.email_id,
			"phone_number": row.phone_number,
			"status": row.status or "Open",
			"stage": row.custom_current_stage,
			"source": row.source,
			"mine": row.owner == user,
		}
		for row in rows
	]

	counter = Counter(c["status"] for c in candidates)
	return {
		"summary": {
			"total": len(candidates),
			"active": sum(1 for c in candidates if c["status"] not in INACTIVE_STATUSES),
			"mine": sum(1 for c in candidates if c["mine"]),
			"pipeline": _ordered_pipeline(counter),
		},
		"candidates": candidates,
	}
