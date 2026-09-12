"""Hiring pipeline roll-up for one Job Requisition — the "TAT Information" block.

A requisition creates Job Openings, and those openings collect candidates. This
answers, on the requisition itself, what actually happened downstream:

    applied → screened → shortlisted → interview scheduled → interview done
            → offer generated,     plus within / outside TAT,
            plus how many of its own positions are Approved / Rejected.

The numbers are STORED on the requisition (not computed on read) so lists,
reports and the React form can use them without recomputing, and they are
refreshed from every document that can change them — the requisition itself, a
Job Applicant, an Interview, a Job Offer.

WHERE EACH NUMBER COMES FROM
----------------------------
Nothing here infers a status from a name. Every count is read off a real column:

* the requisition's openings         `Job Opening.job_requisition`
* an opening's candidates            `Job Applicant.job_title`
* what stage a candidate reached     `Job Applicant Stage History.stage_type`
                                     ("Screening" / "Shortlist" / …) — the TYPE,
                                     never the stage *name*, which is configured
                                     per opening and differs site to site
* interviews                         `Interview` rows (docstatus < 2)
* interview concluded                `Interview.status` in Cleared / Rejected
* offers                             `Job Offer` rows (docstatus < 2)
* position approvals                 `Position Details.approval_status`
* within / outside TAT               `sla_tat_engine.compute_applicant_tat`

"Screened" and "Shortlisted" count candidates who REACHED that stage (a history
row of that type exists), not who passed it: `result` on the history row is free
text written by several different flows, so passing cannot be read from it
reliably, while reaching it is a fact.

WHY THE COUNTS ARE WRITTEN IN on_update AND NOT IN validate
-----------------------------------------------------------
Identical reasoning to ``requisition_headcount`` (see its module docstring):
``validate_requisition_settings`` refuses business-field edits on an approved
requisition, so derived columns written during validate would make every save of
an approved requisition fail. ``db.set_value(update_modified=False)`` writes them
after the save without doc_events, without bumping ``modified``, and cannot
recurse.
"""

import frappe

JOB_REQUISITION = "Job Requisition"
JOB_OPENING = "Job Opening"
JOB_APPLICANT = "Job Applicant"
STAGE_HISTORY = "Job Applicant Stage History"
POSITION_DETAIL = "Position Details"

# Job Opening Hiring Stage.stage_type values that mark the funnel steps. These are
# a fixed Select on the doctype, unlike stage NAMES which HR configures per
# opening — so matching on type is exact rather than a guess.
STAGE_TYPE_SCREENING = "Screening"
STAGE_TYPE_SHORTLIST = "Shortlist"

# An interview has actually happened once it carries a verdict. Pending / Under
# Review are scheduled-but-not-concluded; Cancelled never happened (and is also
# docstatus 2, so it is excluded from "scheduled" as well).
CONCLUDED_INTERVIEW_STATUSES = ("Cleared", "Rejected")

# Where each count is stored on the requisition.
PIPELINE_FIELDS = {
    "candidates_applied": "custom_candidates_applied",
    "screened": "custom_candidates_screened",
    "shortlisted": "custom_candidates_shortlisted",
    "interview_scheduled": "custom_interviews_scheduled",
    "interview_done": "custom_interviews_done",
    "offer_generated": "custom_offers_generated",
    "within_tat": "custom_within_tat",
    "outside_tat": "custom_outside_tat",
    "approved_positions": "custom_approved_positions",
    "rejected_positions": "custom_rejected_positions",
}
SNAPSHOT_FIELD = "custom_pipeline_last_updated"


def _zero():
    return dict.fromkeys(PIPELINE_FIELDS, 0)


# --------------------------------------------------------------------------- #
# Reading the pipeline
# --------------------------------------------------------------------------- #
def requisition_openings(job_requisition):
    """Job Openings raised from this requisition.

    One link covers both hiring types: a Fresher requisition's per-region
    openings are built by the same mapper as a Lateral one, so they carry
    `job_requisition` too.
    """
    if not job_requisition:
        return []
    return frappe.get_all(
        JOB_OPENING, filters={"job_requisition": job_requisition}, pluck="name"
    )


def _applicants_for(openings):
    """Every candidate under these openings — id and status."""
    if not openings:
        return []
    return frappe.get_all(
        JOB_APPLICANT,
        filters={"job_title": ["in", openings]},
        fields=["name", "status"],
    )


def _stage_reach(applicants):
    """``{stage_type: how many of these candidates ever reached it}``.

    One query over the stage history for the whole candidate set; a candidate is
    counted once per stage type however many times they entered it.
    """
    if not applicants:
        return {}
    rows = frappe.get_all(
        STAGE_HISTORY,
        filters={"parenttype": JOB_APPLICANT, "parent": ["in", applicants]},
        fields=["parent", "stage_type"],
    )
    reached = {}
    for row in rows:
        stage_type = (row.get("stage_type") or "").strip()
        if stage_type:
            reached.setdefault(stage_type, set()).add(row["parent"])
    return {k: len(v) for k, v in reached.items()}


def _interview_counts(applicants):
    """``(scheduled, done)`` — candidates with an interview, and with a verdict.

    Counted per CANDIDATE, not per interview: three rounds for one person is one
    candidate who reached interview, which is what a funnel means.
    """
    if not applicants:
        return 0, 0
    rows = frappe.get_all(
        "Interview",
        filters={"job_applicant": ["in", applicants], "docstatus": ["<", 2]},
        fields=["job_applicant", "status"],
    )
    scheduled, done = set(), set()
    for row in rows:
        scheduled.add(row["job_applicant"])
        if (row.get("status") or "") in CONCLUDED_INTERVIEW_STATUSES:
            done.add(row["job_applicant"])
    return len(scheduled), len(done)


def _offer_count(applicants):
    """Candidates holding at least one live (non-cancelled) Job Offer."""
    if not applicants:
        return 0
    rows = frappe.get_all(
        "Job Offer",
        filters={"job_applicant": ["in", applicants], "docstatus": ["<", 2]},
        pluck="job_applicant",
    )
    return len({r for r in rows if r})


def _position_approvals(job_requisition):
    """``(approved, rejected)`` position rows on the requisition itself."""
    rows = frappe.get_all(
        POSITION_DETAIL,
        filters={"parent": job_requisition, "parenttype": JOB_REQUISITION},
        pluck="approval_status",
    )
    approved = sum(1 for s in rows if s == "Approved")
    rejected = sum(1 for s in rows if s == "Rejected")
    return approved, rejected


def _tat_split(applicants):
    """``(within, outside)`` — candidates inside vs over their target TAT.

    Reuses the SLA engine's own verdict (``compute_applicant_tat`` → Time to Fill
    vs the target for that recruiter / designation) rather than restating it, so
    this block can never disagree with the TA SLA report.

    Returns (0, 0) when SLA & TAT tracking is off or unconfigured — that is the
    engine's own answer, not an assumption made here. This is the one part that
    reads a document per candidate, so it is skipped entirely while the feature is
    disabled, and any candidate whose TAT cannot be resolved is left out of BOTH
    counts rather than guessed into one.
    """
    if not applicants:
        return 0, 0
    try:
        from recruitment.recruitment import sla_tat_engine
    except Exception:
        return 0, 0
    if not sla_tat_engine.is_enabled():
        return 0, 0

    within = outside = 0
    for applicant in applicants:
        try:
            tat = sla_tat_engine.compute_applicant_tat(applicant) or {}
        except Exception:
            continue
        if tat.get("time_to_fill") is None:
            continue
        breach = (tat.get("breach") or {}).get("fill")
        if breach is None:
            # No target configured for this candidate — measured, but nothing to
            # measure it against. Counting it either way would be a guess.
            continue
        outside += 1 if breach else 0
        within += 0 if breach else 1
    return within, outside


def pipeline_for(job_requisition):
    """Every count for one requisition, as ``{key: int}``.

    A requisition with no openings (or none with candidates) reports zeros, which
    is the truth: nobody has applied yet.
    """
    counts = _zero()

    approved, rejected = _position_approvals(job_requisition)
    counts["approved_positions"] = approved
    counts["rejected_positions"] = rejected

    openings = requisition_openings(job_requisition)
    applicant_rows = _applicants_for(openings)
    applicants = [a["name"] for a in applicant_rows]
    if not applicants:
        return counts

    # Every applicant under the requisition's openings counts as applied.
    counts["candidates_applied"] = len(applicants)

    reached = _stage_reach(applicants)
    counts["screened"] = reached.get(STAGE_TYPE_SCREENING, 0)
    counts["shortlisted"] = reached.get(STAGE_TYPE_SHORTLIST, 0)

    scheduled, done = _interview_counts(applicants)
    counts["interview_scheduled"] = scheduled
    counts["interview_done"] = done

    counts["offer_generated"] = _offer_count(applicants)

    within, outside = _tat_split(applicants)
    counts["within_tat"] = within
    counts["outside_tat"] = outside

    return counts


# --------------------------------------------------------------------------- #
# Storing
# --------------------------------------------------------------------------- #
def _store(job_requisition, doc=None):
    """Compute and write the counts. Returns the counts it wrote."""
    from frappe.utils import now

    counts = pipeline_for(job_requisition)

    meta = frappe.get_meta(JOB_REQUISITION)
    updates = {}
    for key, fieldname in PIPELINE_FIELDS.items():
        if meta.has_field(fieldname):
            updates[fieldname] = counts[key]
            if doc is not None:
                doc.set(fieldname, counts[key])
    if meta.has_field(SNAPSHOT_FIELD):
        stamp = now()
        updates[SNAPSHOT_FIELD] = stamp
        if doc is not None:
            doc.set(SNAPSHOT_FIELD, stamp)

    if updates:
        frappe.db.set_value(
            JOB_REQUISITION, job_requisition, updates, update_modified=False
        )
    return counts


def store_pipeline(doc, method=None):
    """``on_update`` on Job Requisition — refresh its own block.

    Mirrors ``requisition_headcount.store_headcount``: written with
    ``db.set_value`` so no validation runs, and swallowed on error, because a
    reporting number must never be why a requisition fails to save.
    """
    try:
        _store(doc.name, doc=doc)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "Job Requisition: pipeline refresh failed"
        )


# --------------------------------------------------------------------------- #
# Refresh from downstream documents
# --------------------------------------------------------------------------- #
def _requisition_of_opening(opening):
    if not opening:
        return None
    return frappe.db.get_value(JOB_OPENING, opening, "job_requisition")


def _requisition_of_applicant(job_applicant):
    if not job_applicant:
        return None
    return _requisition_of_opening(
        frappe.db.get_value(JOB_APPLICANT, job_applicant, "job_title")
    )


def _refresh(job_requisition):
    """Recompute one requisition, never raising — these run inside another
    document's save and must not be able to fail it."""
    if not job_requisition:
        return
    try:
        _store(job_requisition)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "Job Requisition: pipeline refresh failed"
        )


def refresh_from_applicant(doc, method=None):
    """Job Applicant hook — roll the change up to the requisition behind its
    opening. No-op for a candidate whose opening came from no requisition."""
    _refresh(_requisition_of_opening(doc.get("job_title")))


def refresh_from_interview(doc, method=None):
    """Interview hook — an interview scheduled or concluded moves two counts."""
    _refresh(_requisition_of_applicant(doc.get("job_applicant")))


def refresh_from_job_offer(doc, method=None):
    """Job Offer hook — an offer raised, cancelled or amended moves one count."""
    _refresh(_requisition_of_applicant(doc.get("job_applicant")))


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def refresh_requisition_pipeline(job_requisition):
    """Recompute and re-store on demand (a Refresh action / a manual fix-up)."""
    frappe.has_permission(JOB_REQUISITION, "write", doc=job_requisition, throw=True)
    counts = _store(job_requisition)
    frappe.db.commit()
    return counts


@frappe.whitelist()
def get_requisition_pipeline(job_requisition):
    """Live counts without storing them (read-only view)."""
    frappe.has_permission(JOB_REQUISITION, "read", doc=job_requisition, throw=True)
    return pipeline_for(job_requisition)


def backfill(limit=None):
    """Fill the block on every existing requisition — used by the patch, so the
    numbers are not blank until each requisition happens to be saved again."""
    names = frappe.get_all(JOB_REQUISITION, pluck="name", limit_page_length=limit or 0)
    for name in names:
        try:
            _store(name)
        except Exception:
            frappe.log_error(
                frappe.get_traceback(), f"pipeline backfill failed: {name}"
            )
    return len(names)
