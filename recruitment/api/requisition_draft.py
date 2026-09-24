"""Save an unfinished Job Requisition and come back to it later.

"Save as Draft" on the requisition form stores the form's own state — the same
object the wizard holds in memory — and nothing else happens: no Job Requisition
row, no approval, no validation of half-filled fields. That matters, because
inserting a real requisition would start its approval flow on `after_insert` and
run every save-time rule against a form that is not finished yet.

Submitting is unchanged: the form posts to `create_job_requisition` exactly as
before, so the location-wise / region-wise split stays where it is, and the
draft is deleted once the requisition(s) exist (`discard_on_submit`).

A draft belongs to whoever saved it. Every endpoint below is owner-scoped, and
the doctype itself is visible in Desk to System Managers only — drafts are
working notes, not records anyone else acts on.
"""

import json

import frappe
from frappe import _

DRAFT = "Job Requisition Draft"
JOB_REQUISITION = "Job Requisition"

# A form's state is a few KB; this is a guard against a runaway payload, not a
# limit anyone should ever reach.
MAX_PAYLOAD_BYTES = 512 * 1024
# What the drafts list shows, per draft.
LIST_FIELDS = (
    "name",
    "title",
    "hiring_type",
    "company",
    "department",
    "designation",
    "positions_count",
    "modified",
)


def _ensure_can_raise():
    """Drafting a requisition needs the same right as raising one."""
    frappe.has_permission(JOB_REQUISITION, "create", throw=True)


def _own_draft(name):
    """The caller's own draft, or a 404/403 — never someone else's."""
    if not name:
        frappe.throw(_("Draft is required."))
    owner = frappe.db.get_value(DRAFT, name, "owner")
    if owner is None:
        frappe.throw(_("This draft no longer exists."), frappe.DoesNotExistError)
    if owner != frappe.session.user:
        raise frappe.PermissionError(_("This draft belongs to someone else."))
    return frappe.get_doc(DRAFT, name)


def _summary(state):
    """The labels the drafts list shows. `state` is the form's own keys, so the
    `*_title` companions are preferred — a draft should read as what the user
    typed, not as a document id."""
    def pick(*keys):
        for key in keys:
            value = state.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:140]
        return None

    designation = pick("designation_title", "designation")
    return {
        "title": designation or _("Untitled requisition"),
        "hiring_type": pick("custom_hiring_type") or "Lateral",
        "company": pick("company_title", "company"),
        "department": pick("department_title", "department"),
        "designation": designation,
        "positions_count": frappe.utils.cint(state.get("number_of_positions")),
    }


@frappe.whitelist()
def save_requisition_draft(state=None, name=None):
    """Create or update the caller's draft; returns its name and labels.

    `state` is the form's own state object (or its JSON). `name` updates that
    draft in place, so repeated saves of one form don't pile up.
    """
    _ensure_can_raise()

    if isinstance(state, str):
        try:
            state = json.loads(state)
        except ValueError:
            frappe.throw(_("Draft data is not valid JSON."))
    if not isinstance(state, dict) or not state:
        frappe.throw(_("There is nothing to save yet."))

    payload = json.dumps(state, default=str)
    if len(payload.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        frappe.throw(_("This draft is too large to save."))

    doc = _own_draft(name) if name else frappe.new_doc(DRAFT)
    doc.update(_summary(state))
    doc.payload = payload
    doc.save(ignore_permissions=True)

    return {
        "name": doc.name,
        "title": doc.title,
        "modified": doc.modified,
    }


@frappe.whitelist()
def list_requisition_drafts(limit=20):
    """The caller's own drafts, most recently saved first."""
    _ensure_can_raise()
    return frappe.get_all(
        DRAFT,
        filters={"owner": frappe.session.user},
        fields=list(LIST_FIELDS),
        order_by="modified desc",
        limit=frappe.utils.cint(limit) or 20,
    )


@frappe.whitelist()
def get_requisition_draft(name):
    """One of the caller's drafts, with the form state to reopen it."""
    _ensure_can_raise()
    doc = _own_draft(name)
    try:
        state = json.loads(doc.payload or "{}")
    except ValueError:
        # Saved by an older version, or hand-edited — the draft is unusable.
        frappe.throw(_("This draft could not be read. Delete it and start again."))
    return {"name": doc.name, "title": doc.title, "modified": doc.modified, "state": state}


@frappe.whitelist()
def delete_requisition_draft(name):
    """Discard one of the caller's drafts."""
    _ensure_can_raise()
    _own_draft(name)
    frappe.delete_doc(DRAFT, name, ignore_permissions=True)
    return {"name": name, "deleted": True}


def discard_on_submit(name):
    """Drop the draft its requisition(s) were just created from.

    Called by `create_job_requisition` after the insert has committed: the
    requisition exists, so a failure to delete the draft must not undo it —
    the user would only see a stale draft they can delete by hand.
    """
    if not name:
        return None
    try:
        if frappe.db.get_value(DRAFT, name, "owner") != frappe.session.user:
            return None
        frappe.delete_doc(DRAFT, name, ignore_permissions=True)
        frappe.db.commit()
        return name
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Job Requisition draft: discard on submit failed")
        return None
