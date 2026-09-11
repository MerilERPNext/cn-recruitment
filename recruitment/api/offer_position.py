"""Job Offer <-> Job Requisition Position — claiming and releasing a position.

A lateral offer is made against one specific position. While the offer is active
that position is Filled and carries the candidate; when it is withdrawn, rejected
or cancelled the position returns to Open. "Active" means what offer_validation
already means by it (not cancelled, not in a releasing status) so headcount and
position status cannot disagree.

Campus/Fresher requisitions itemise nothing — they budget openings per region —
so `requires_position` is False for them and their offers never claim a row.
"""

import frappe
from frappe import _
from frappe.utils import cint

from recruitment.api.requisition_status import (
    APPROVED_ACTIVE_STATUS,
    APPROVED_DRAFT_STATUS,
    AUTO_ARCHIVED_STATUS,
    JOB_REQUISITION,
    JOB_REQUISITION_POSITION,
    POSITION_ARCHIVED,
    POSITION_DRAFT,
    POSITION_FILLED,
    POSITION_OPEN,
    ensure_position_rows,
)

JOB_OFFER = "Job Offer"
POSITION_FIELD = "custom_requisition_position"
POSITION_LABEL_FIELD = "custom_position_label"
REQUISITION_FIELD = "custom_job_requisition"

RELEASING_STATUSES = ("Rejected", "Withdrawn")
CLAIMABLE_REQUISITION_STATUSES = (
    APPROVED_ACTIVE_STATUS, APPROVED_DRAFT_STATUS, AUTO_ARCHIVED_STATUS,
)


def _offer_holds_position(doc):
    if cint(doc.get("docstatus")) == 2:
        return False
    return (doc.get("status") or "") not in RELEASING_STATUSES


def _position_label(row):
    label = _("Position {0}").format(row.get("position_no") or "?")
    bits = [b for b in (row.get("location"), row.get("functional_area")) if b]
    return "{0} — {1}".format(label, ", ".join(bits)) if bits else label


def _requisition_is_active(requisition, status=None):
    """Live enough to offer against: Approved Active, or already has an opening.

    Campus drives link their own openings and never press Activate, so the
    requisition stays at Open & Approved while candidates are actively applying.
    Keying purely off status would leave every campus offer with an empty picker.
    """
    status = status or frappe.db.get_value(JOB_REQUISITION, requisition, "status")
    if status == APPROVED_ACTIVE_STATUS:
        return True
    return bool(frappe.db.exists("Job Opening", {"job_requisition": requisition}))


def _is_offerable(row, requisition_active):
    if row.get("candidate"):
        return False
    if row.get("status") == POSITION_OPEN:
        return True
    return requisition_active and row.get("status") == POSITION_DRAFT


def _positions_held_by_other_offers(requisition, exclude_offer=None):
    """Rows already spoken for by another live offer — guards the race where two
    offers are raised before either claims."""
    filters = {
        REQUISITION_FIELD: requisition,
        "docstatus": ["!=", 2],
        "status": ["not in", RELEASING_STATUSES],
        POSITION_FIELD: ["is", "set"],
    }
    if exclude_offer:
        filters["name"] = ["!=", exclude_offer]
    return set(frappe.get_all(JOB_OFFER, filters=filters, pluck=POSITION_FIELD))


POSITION_FIELDS = (
    "name", "position_no", "status", "location", "functional_area", "candidate",
)


def _positions_of(requisition):
    """Every tracked position on the requisition. One fetch, reused by the picker,
    the claim and the rollup so none of them re-query the same rows."""
    return frappe.get_all(
        JOB_REQUISITION_POSITION,
        filters={"parent": requisition, "parenttype": JOB_REQUISITION},
        fields=list(POSITION_FIELDS),
        order_by="position_no asc",
    )


@frappe.whitelist()
def requires_position(requisition):
    """Must an offer here name a position? True for lateral, False for campus."""
    if not requisition:
        return False
    return bool(
        frappe.db.count("Position Details", {"parent": requisition, "parenttype": JOB_REQUISITION})
    )


def first_available_position(requisition, exclude_offer=None):
	"""The lowest-numbered position on `requisition` this offer may claim, or None.

	The picker's rule, answered without the picker: same offerability test
	(`_is_offerable`), same "already claimed by a live offer" guard, so a position
	handed out here is one `validate_position_choice` will accept. Materialises the
	tracking rows first when a requisition has never had them built.

	Exists for the paths that cannot ask a human which seat to use — bulk offer
	creation from the Job Applicant list, most of all, where refusing to choose
	simply meant every lateral applicant failed.
	"""
	if not requisition:
		return None

	rows = _positions_of(requisition)
	if not rows:
		ensure_position_rows(requisition)
		rows = _positions_of(requisition)
	if not rows:
		return None

	active = _requisition_is_active(requisition)
	taken = _positions_held_by_other_offers(requisition, exclude_offer=exclude_offer)
	for row in rows:
		if row.name in taken:
			continue
		if _is_offerable(row, active):
			return row
	return None


@frappe.whitelist()
def get_available_positions(job_requisition=None, job_offer=None, job_applicant=None):
    """Positions this offer may claim. The one it already holds is always
    included and flagged `current`. Materialises tracking rows if absent."""
    if not job_requisition:
        frappe.throw(_("Job Requisition is required."))
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)

    # Rows first: when they already exist (the normal case) this skips the count
    # query ensure_position_rows would otherwise run on every open.
    rows = _positions_of(job_requisition)
    if not rows:
        ensure_position_rows(job_requisition)
        rows = _positions_of(job_requisition)

    current = frappe.db.get_value(JOB_OFFER, job_offer, POSITION_FIELD) if job_offer else None
    req_status = frappe.db.get_value(JOB_REQUISITION, job_requisition, "status")

    # The activation lookup only matters for Draft rows, and the held-by-others
    # lookup only for rows that could otherwise be offered — skip both when
    # nothing would use the answer.
    free = [r for r in rows if not r.candidate]
    req_active = (
        _requisition_is_active(job_requisition, req_status)
        if any(r.status == POSITION_DRAFT for r in free)
        else req_status == APPROVED_ACTIVE_STATUS
    )
    held = (
        _positions_held_by_other_offers(job_requisition, exclude_offer=job_offer)
        if any(_is_offerable(r, req_active) for r in free)
        else set()
    )

    available = [
        {
            "name": r.name,
            "position_no": r.position_no,
            "status": r.status,
            "location": r.location,
            "functional_area": r.functional_area,
            "label": _position_label(r),
            "current": r.name == current,
        }
        for r in rows
        if r.name == current or (_is_offerable(r, req_active) and r.name not in held)
    ]

    # An empty picker with no explanation is indistinguishable from a broken one.
    reason = None
    if not available:
        if not rows:
            reason = _("This requisition has no positions to offer against.")
        elif not req_active:
            reason = _(
                "{0} has not been activated yet. Run Activate on the requisition "
                "(or link a Job Opening to it) so its positions open up for offers."
            ).format(job_requisition)
        else:
            reason = _(
                "Every position on {0} is already filled or claimed by another offer."
            ).format(job_requisition)

    return {
        "job_requisition": job_requisition,
        "requisition_status": req_status,
        "requisition_active": req_active,
        "positions": available,
        "total": len(rows),
        "reason": reason,
    }


@frappe.whitelist()
def get_offer_position_context(job_applicant):
    """Everything "Create Job Offer" needs before opening the form, in one call."""
    from recruitment.customizations.job_offer import _requisition_for_applicant

    requisition = _requisition_for_applicant(job_applicant)
    if not requisition or not requires_position(requisition):
        return {
            "job_requisition": requisition,
            "requires_position": False,
            "positions": [],
        }

    context = get_available_positions(job_requisition=requisition)
    context["requires_position"] = True
    return context


# ---------------------------------------------------------------------------
# Claim / release
# ---------------------------------------------------------------------------

def _rollup_requisition(requisition, statuses=None, current=None):
    """All positions Filled -> requisition Filled ("Auto Archived"); freeing one
    puts a Filled requisition back to Approved Active.

    `statuses` and `current` let a caller that has just fetched the rows pass them
    in, so the common claim/release path does no extra reads. Deliberately narrow
    — only ever moves between those two states, so it can never resurrect
    something HR deliberately closed.
    """
    if not requisition:
        return None

    if current is None:
        current = frappe.db.get_value(JOB_REQUISITION, requisition, "status")
    if current not in (APPROVED_ACTIVE_STATUS, AUTO_ARCHIVED_STATUS):
        return None

    if statuses is None:
        statuses = frappe.get_all(
            JOB_REQUISITION_POSITION,
            filters={"parent": requisition, "parenttype": JOB_REQUISITION},
            pluck="status",
        )
    live = [s for s in statuses if s != POSITION_ARCHIVED]
    if not live:
        return None

    all_filled = all(s == POSITION_FILLED for s in live)
    if all_filled and current == APPROVED_ACTIVE_STATUS:
        frappe.db.set_value(JOB_REQUISITION, requisition, "status", AUTO_ARCHIVED_STATUS)
        return AUTO_ARCHIVED_STATUS
    if not all_filled and current == AUTO_ARCHIVED_STATUS:
        frappe.db.set_value(JOB_REQUISITION, requisition, "status", APPROVED_ACTIVE_STATUS)
        return APPROVED_ACTIVE_STATUS
    return None


def _release(offer_name, row_name, requisition, rows=None, req_status=None):
    if not row_name:
        return
    frappe.db.set_value(
        JOB_REQUISITION_POSITION,
        row_name,
        {"status": POSITION_OPEN, "candidate": None, "candidate_status": None},
        update_modified=False,
    )
    frappe.db.set_value(
        JOB_OFFER, offer_name, {POSITION_FIELD: None, POSITION_LABEL_FIELD: None},
        update_modified=False,
    )
    # Reflect the release locally so the rollup needs no re-read.
    statuses = None
    if rows is not None:
        statuses = [POSITION_OPEN if r.name == row_name else r.status for r in rows]
    _rollup_requisition(requisition, statuses=statuses, current=req_status)


# ---------------------------------------------------------------------------
# Doc events
# ---------------------------------------------------------------------------

def validate_position_choice(doc, method=None):
    """`validate`: the position must be required, belong to this requisition, and be free."""
    requisition = _requisition_of(doc)
    row_name = doc.get(POSITION_FIELD)

    if not row_name:
        # Lateral itemises headcount, so an unpicked offer cannot say what it
        # consumes. Campus has nothing to pick — offer_validation guards it.
        if requisition and requires_position(requisition):
            frappe.throw(
                _(
                    "Select the position on {0} this offer is against. Use the "
                    "Select Position button."
                ).format(frappe.bold(requisition)),
                title=_("Position Required"),
            )
        return

    row = frappe.db.get_value(
        JOB_REQUISITION_POSITION,
        row_name,
        ["name", "parent", "position_no", "status", "location", "functional_area", "candidate"],
        as_dict=True,
    )
    if not row:
        frappe.throw(_("The selected position no longer exists on this requisition."))
    if requisition and row.parent != requisition:
        frappe.throw(
            _("The selected position belongs to {0}, not to this offer's requisition {1}.").format(
                frappe.bold(row.parent), frappe.bold(requisition)
            )
        )
    if row.candidate and row.candidate != doc.get("job_applicant"):
        frappe.throw(
            _("Position {0} is already held by {1}.").format(
                frappe.bold(row.position_no), frappe.bold(row.candidate)
            )
        )
    if row.name in _positions_held_by_other_offers(row.parent, exclude_offer=doc.name):
        frappe.throw(
            _("Position {0} is already claimed by another live offer.").format(
                frappe.bold(row.position_no)
            )
        )

    doc.set(POSITION_LABEL_FIELD, _position_label(row))


def _requisition_of(doc):
    return doc.get(REQUISITION_FIELD)


def sync_offer_position(doc, method=None):
    """Claim the position while the offer is live, release it when it is not.

    Wired to after_insert / on_submit / on_update / on_update_after_submit /
    on_cancel so no path can leave offer and position disagreeing; deletion is
    handled by its sibling `release_offer_position` on on_trash. Cheap exits
    first: an offer with neither a requisition nor a position does no queries at
    all, and an already-correct position is not rewritten. Never raises.
    """
    try:
        requisition = _requisition_of(doc)
        row_name = doc.get(POSITION_FIELD)
        if not requisition and not row_name:
            return

        if not _offer_holds_position(doc):
            if row_name:
                _release(doc.name, row_name, requisition)
            return

        if not requisition:
            return

        req_status = frappe.db.get_value(JOB_REQUISITION, requisition, "status")
        if req_status not in CLAIMABLE_REQUISITION_STATUSES:
            return

        # One fetch serves the lookup, the claim and the rollup.
        rows = _positions_of(requisition)
        if not rows:
            ensure_position_rows(requisition)
            rows = _positions_of(requisition)
            if not rows:
                return

        applicant = doc.get("job_applicant")
        row = next((r for r in rows if r.name == row_name), None) if row_name else None

        if row is None:
            if row_name:
                return  # names a row that no longer exists
            # Fallback for paths that cannot ask (bulk creation, imports).
            held = _positions_held_by_other_offers(requisition, exclude_offer=doc.name)
            req_active = _requisition_is_active(requisition, req_status)
            row = next(
                (r for r in rows if _is_offerable(r, req_active) and r.name not in held), None
            )
            if row is None:
                return
            row_name = row.name
            frappe.db.set_value(JOB_OFFER, doc.name, POSITION_FIELD, row_name, update_modified=False)

        if row.status == POSITION_FILLED and row.candidate == applicant:
            return  # already correct — skip the writes and the rollup

        frappe.db.set_value(
            JOB_REQUISITION_POSITION,
            row_name,
            {
                "status": POSITION_FILLED,
                "candidate": applicant,
                "candidate_status": doc.get("status"),
            },
            update_modified=False,
        )
        frappe.db.set_value(
            JOB_OFFER, doc.name, POSITION_LABEL_FIELD, _position_label(row),
            update_modified=False,
        )
        statuses = [POSITION_FILLED if r.name == row_name else r.status for r in rows]
        _rollup_requisition(requisition, statuses=statuses, current=req_status)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Offer: position sync failed")


def release_offer_position(doc, method=None):
    """`on_trash`: a deleted offer must not keep holding its position.

    Deletion is the one lifecycle event `sync_offer_position` cannot cover — it
    reads the offer's status to decide claim-vs-release, and a deleted offer has
    no status left to mean anything. Without this the row stays Filled against a
    candidate whose offer no longer exists, so the position never reappears in
    the picker and a single-position requisition stays stuck in Auto Archived.

    Deliberately not `_release`: that also blanks the position fields on the
    offer, which is pointless on a row that is about to be deleted. Never raises
    — a failed release must not block the delete.
    """
    try:
        row_name = doc.get(POSITION_FIELD)
        if not row_name:
            return
        frappe.db.set_value(
            JOB_REQUISITION_POSITION,
            row_name,
            {"status": POSITION_OPEN, "candidate": None, "candidate_status": None},
            update_modified=False,
        )
        # Prefer the row's own parent over the offer's link field: the field is
        # editable, and an offer whose requisition was cleared by hand would
        # otherwise release the position but leave the requisition stuck in
        # Auto Archived with nothing left to free it.
        requisition = _requisition_of(doc) or frappe.db.get_value(
            JOB_REQUISITION_POSITION, row_name, "parent"
        )
        # Frees a Filled requisition back to Approved Active; narrow enough that
        # it cannot resurrect something HR closed deliberately.
        _rollup_requisition(requisition)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Offer: position release on delete failed")


@frappe.whitelist()
def withdraw_offer(job_offer, reason=None):
    """Withdraw an offer and return its position to Open.

    Required before a Filled requisition can be archived. Distinct from Rejected,
    which means the candidate refused.
    """
    if not job_offer:
        frappe.throw(_("Job Offer is required."))
    frappe.has_permission(JOB_OFFER, "write", doc=job_offer, throw=True)

    doc = frappe.get_doc(JOB_OFFER, job_offer)
    if (doc.status or "") == "Withdrawn":
        return {"job_offer": job_offer, "status": "Withdrawn", "changed": False}
    if (doc.status or "") == "Accepted":
        frappe.throw(
            _("This offer has already been accepted. Cancel the onboarding instead of withdrawing.")
        )

    row_name = doc.get(POSITION_FIELD)
    requisition = _requisition_of(doc)

    # Submitted offers only accept allow-on-submit writes, so go through the db.
    frappe.db.set_value(JOB_OFFER, job_offer, "status", "Withdrawn")
    _release(job_offer, row_name, requisition)

    actor = (
        frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "employee_name")
        or frappe.session.user
    )
    content = _("{0} withdrew this offer.").format(actor)
    if reason:
        content += " " + _("Reason: {0}").format(reason)
    doc.add_comment("Comment", content)

    return {
        "job_offer": job_offer,
        "status": "Withdrawn",
        "changed": True,
        "position_released": row_name,
        "job_requisition": requisition,
    }
