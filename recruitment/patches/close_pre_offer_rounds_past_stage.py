"""Close the pre-offer round for candidates who are already past the Pre Offer stage.

Completing or skipping the Pre Offer stage from the hiring workflow used to leave
the candidate's portal card on "Action Required", with the form still open. The
workflow now closes the round as the candidate moves on
(`hiring_stage._close_pre_offer_if_left`); this does the same for candidates who
moved on before that fix.

Only candidates whose current stage sits AFTER a Pre Offer stage in their own
workflow are touched. Anyone still on (or before) Pre Offer, or with no current
stage, is left alone. Idempotent.

Dry run (changes nothing, lists who would be closed):
    bench --site <site> execute \
        recruitment.patches.close_pre_offer_rounds_past_stage.execute --kwargs "{'dry_run': 1}"
"""

import frappe

from recruitment.api.action_center import ACTION_DOCTYPE, close_pre_offer_round

ROW_DOCTYPE = "Job Applicant Pre Offer Form"


def _candidates_with_open_rounds():
	open_rows = frappe.get_all(
		ROW_DOCTYPE,
		filters={"parenttype": "Job Applicant", "status": ("in", ("Sent", "Filled"))},
		pluck="parent",
	)
	open_items = frappe.get_all(
		ACTION_DOCTYPE,
		filters={"reference_doctype": ROW_DOCTYPE, "status": ("!=", "Completed")},
		pluck="reference_docname",
	)
	item_parents = (
		frappe.get_all(ROW_DOCTYPE, filters={"name": ("in", open_items)}, pluck="parent")
		if open_items
		else []
	)
	return sorted(set(open_rows) | set(item_parents))


def _past_pre_offer(doc):
	from recruitment.api.hiring_stage import STAGE_FIELD, _find_stage, get_applicant_stages

	current = doc.get(STAGE_FIELD)
	if not current:
		return False
	stages = get_applicant_stages(doc)
	idx = _find_stage(stages, current)
	return idx >= 0 and any(
		(s.get("stage_type") or "") == "Pre Offer" for s in stages[:idx]
	)


def execute(dry_run=0):
	closed = []
	for name in _candidates_with_open_rounds():
		try:
			doc = frappe.get_doc("Job Applicant", name)
			if not _past_pre_offer(doc):
				continue
			if not int(dry_run):
				close_pre_offer_round(doc)
			closed.append(name)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"Close pre-offer round patch: {name}")
	if not int(dry_run):
		frappe.db.commit()
	return {"dry_run": bool(int(dry_run)), "closed": closed}
