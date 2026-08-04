"""Align existing candidates' status / sub-status with the stage they are on.

Until now ``_enter_stage`` synced ``status`` only for a "Done" stage and never
wrote ``custom_substatus`` at all, so a candidate parked mid-pipeline kept
whatever the screening / eligibility engines had last set: someone sitting on
"Technical Round 1" still read *Shortlisted*, someone on the Job Offer stage
still read *Open*, and the sub-status was blank throughout.

This brings existing records in line with the stage they actually occupy, using
the very mapping the engine now applies on every transition
(``recruitment.api.hiring_stage.STATUS_BY_STAGE_TYPE``), so a backfilled record
is indistinguishable from one that moved after the fix. Each stage name is also
registered in the Sub Status master, which is what the Job Applicant form builds
its sub-status dropdown from.

Deliberately conservative — it skips:
  - candidates with no current stage (nothing to derive a status from)
  - Rejected / Accepted candidates: that status is a decision about the person,
    not a position in the pipeline, and must not be overwritten
  - stages whose type carries no mapping (Screening / System are owned by the
    screening and eligibility engines)
  - rows that already read correctly

and it never overwrites a sub-status that is already set. Live sub-statuses are
written by process events *after* stage entry ("Pre Offer Form Sent", "Pre
Onboarding Released", the screening results) and say strictly more than the stage
name does — replacing them with the stage name would throw information away for
no gain, since the stage is already in its own field. Only blank sub-statuses are
filled in. Going forward the engine writes the stage name on entry and those same
events refine it from there.

Idempotent: re-running changes nothing once applied.
"""

import frappe

# A status that reflects an outcome, not a position — never rewritten from a stage.
TERMINAL_STATUSES = {"Rejected", "Accepted"}


def plan():
	"""The changes this patch would make, as
	``[{applicant, stage, from_status, to_status, from_sub, to_sub}, …]``.

	Exposed separately so it can be run as a dry run before anything is written.
	"""
	from recruitment.api.hiring_stage import STATUS_BY_STAGE_TYPE, get_openings_stages

	rows = frappe.get_all(
		"Job Applicant",
		filters={"custom_current_stage": ["is", "set"]},
		fields=["name", "job_title", "custom_current_stage", "status", "custom_substatus"],
	)
	# One batched read for every opening involved, rather than two queries each.
	stages_by_opening = get_openings_stages([r.job_title for r in rows if r.job_title])

	changes = []
	for row in rows:
		if (row.status or "") in TERMINAL_STATUSES:
			continue
		stage = next(
			(
				s for s in (stages_by_opening.get(row.job_title) or [])
				if (s.get("stage_name") or "") == row.custom_current_stage
			),
			None,
		)
		if not stage:
			continue  # stage no longer on the opening's workflow — leave it be

		status = STATUS_BY_STAGE_TYPE.get((stage.get("stage_type") or "").strip())
		if not status:
			continue

		# Fill a blank sub-status from the stage; keep an existing one, which a
		# later process event set and which says more than the stage name.
		current_sub = (row.custom_substatus or "").strip()
		sub = current_sub or (stage.get("stage_name") or "").strip()

		if row.status == status and current_sub == sub:
			continue

		changes.append({
			"applicant": row.name,
			"stage": row.custom_current_stage,
			"from_status": row.status,
			"to_status": status,
			"from_sub": row.custom_substatus,
			"to_sub": sub,
		})
	return changes


def register_pairs_in_use():
	"""Make every (status, sub-status) pair actually present on Job Applicants
	selectable on the form.

	The form's sub-status dropdown is filtered by the record's ``status``, so a
	pair the app writes but the master files under a *different* parent status
	shows up blank. That predates the hiring workflow: the screening engine pairs
	"Screening Completed" with status *Shortlisted* while the master files it
	under a "Screening" parent that isn't even a valid ``status`` option, and the
	same happens to the pre-offer sub-statuses once a candidate reaches Accepted.

	Reconciles whatever is genuinely in use rather than a hardcoded list, so later
	drift heals itself on the next run. Purely additive — no applicant is touched.
	"""
	from recruitment.api.hiring_stage import _ensure_sub_status_option

	pairs = {
		(row.status, (row.custom_substatus or "").strip())
		for row in frappe.get_all(
			"Job Applicant",
			filters={"custom_substatus": ["is", "set"], "status": ["is", "set"]},
			fields=["status", "custom_substatus"],
		)
	}
	for status, sub in sorted(p for p in pairs if p[1]):
		_ensure_sub_status_option(status, sub)
	return len(pairs)


def execute():
	from recruitment.api.hiring_stage import _ensure_sub_status_option

	changes = plan()
	for change in changes:
		# update_modified=False: a data correction shouldn't make every candidate
		# look freshly edited in list views and "recently modified" reports.
		frappe.db.set_value(
			"Job Applicant", change["applicant"],
			{"status": change["to_status"], "custom_substatus": change["to_sub"]},
			update_modified=False,
		)

	for status, sub in {(c["to_status"], c["to_sub"]) for c in changes}:
		_ensure_sub_status_option(status, sub)

	# Also heal pairs that predate the hiring workflow (screening / pre-offer).
	pairs = register_pairs_in_use()

	frappe.db.commit()
	print(
		f"Hiring workflow: status/sub-status aligned on {len(changes)} Job Applicant(s); "
		f"{pairs} sub-status pair(s) registered in the Sub Status master"
	)
