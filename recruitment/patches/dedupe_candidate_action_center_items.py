"""Collapse candidate Action Center items that show one task twice.

Two flows left a candidate with two cards for the same task, so it could sit under
both Pending and Completed at once:

  * Pre offer: every re-send raised its own item, and a field rejection re-opened
    the OLDEST round's item while the newer ones stayed Completed. Each applicant
    now keeps one item, re-pointed at the newest round (see
    `action_center._send_pre_offer_for_applicant`). This keeps that item, open if
    any of the duplicates was still open, and deletes the rest.
  * Job offer: cancelling an offer never touched its item, and the amended offer
    raised a second one. Cancelling now deletes the item. This deletes the items
    of cancelled offers that are still open, or that were amended into a newer
    offer (which carries its own item).

Idempotent.

Dry run (changes nothing, prints what would change):
    bench --site <site> execute \
        recruitment.patches.dedupe_candidate_action_center_items.execute --kwargs "{'dry_run': 1}"
"""

import frappe

from recruitment.api.action_center import ACTION_DOCTYPE

ROW_DOCTYPE = "Job Applicant Pre Offer Form"
DONE_STATUSES = ("Completed", "Approved")


def _dedupe_pre_offer(dry_run):
	items = frappe.get_all(
		ACTION_DOCTYPE,
		filters={"reference_doctype": ROW_DOCTYPE},
		fields=["name", "reference_docname", "status"],
	)
	if not items:
		return []

	rows = {
		r.name: r
		for r in frappe.get_all(
			ROW_DOCTYPE,
			filters={"name": ("in", [i.reference_docname for i in items]), "parenttype": "Job Applicant"},
			fields=["name", "parent", "idx", "portal_form"],
		)
	}
	by_applicant = {}
	for item in items:
		row = rows.get(item.reference_docname)
		# Only the form-less rounds are one task re-sent. A named Portal Form row is
		# a separate task of its own (send_pre_offer_form raises one item per form)
		# and is never merged away.
		if row and not row.portal_form:
			by_applicant.setdefault(row.parent, []).append((row.idx, item))

	changes = []
	for applicant, entries in by_applicant.items():
		if len(entries) < 2:
			continue
		entries.sort(key=lambda e: e[0])
		keep = entries[-1][1]
		drop = [e[1] for e in entries[:-1]]
		still_open = any(e[1].status not in DONE_STATUSES for e in entries)
		status = "Action Required" if still_open else keep.status
		changes.append({"applicant": applicant, "keep": keep.name, "status": status, "delete": [d.name for d in drop]})
		if dry_run:
			continue

		frappe.db.set_value(ACTION_DOCTYPE, keep.name, "status", status)
		for item in drop:
			frappe.delete_doc(ACTION_DOCTYPE, item.name, ignore_permissions=True, force=True)
		# Every round of this applicant now points at the one surviving item.
		for row_name in frappe.get_all(
			ROW_DOCTYPE,
			filters={"parent": applicant, "parenttype": "Job Applicant", "portal_form": ("is", "not set")},
			pluck="name",
		):
			frappe.db.set_value(ROW_DOCTYPE, row_name, "action_item", keep.name, update_modified=False)
	return changes


def _drop_cancelled_offer_items(dry_run):
	items = frappe.get_all(
		ACTION_DOCTYPE,
		filters={"reference_doctype": "Job Offer"},
		fields=["name", "reference_docname", "status"],
	)
	if not items:
		return []

	cancelled = set(
		frappe.get_all(
			"Job Offer",
			filters={"name": ("in", [i.reference_docname for i in items]), "docstatus": 2},
			pluck="name",
		)
	)
	amended = set(
		frappe.get_all(
			"Job Offer",
			filters={"amended_from": ("in", list(cancelled))},
			pluck="amended_from",
		)
		if cancelled
		else []
	)

	drop = [
		i
		for i in items
		if i.reference_docname in cancelled
		and (i.status not in DONE_STATUSES or i.reference_docname in amended)
	]
	if not dry_run:
		for item in drop:
			frappe.delete_doc(ACTION_DOCTYPE, item.name, ignore_permissions=True, force=True)
	return [{"item": i.name, "job_offer": i.reference_docname, "status": i.status} for i in drop]


def execute(dry_run=0):
	dry_run = bool(frappe.utils.cint(dry_run))
	pre_offer = _dedupe_pre_offer(dry_run)
	offers = _drop_cancelled_offer_items(dry_run)
	if dry_run:
		print(frappe.as_json({"pre_offer": pre_offer, "cancelled_offers": offers}))
	else:
		frappe.db.commit()
