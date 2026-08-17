"""The candidate's name — one place that knows how to build it.

A Job Applicant keeps the parts separate, exactly as the candidate typed them:

    applicant_name                  first name   "Yashwanth"
    custom_applicant_middle_name    middle name  "Kumar"
    custom_applicant_last_name      surname      "Dasari"
    custom_full_name                derived      "Yashwanth Kumar Dasari"

WHY THIS MODULE EXISTS
----------------------
The campus application used to overwrite ``applicant_name`` with the WHOLE name so
that lists and cards would show something complete. That left the field labelled
"Applicant First Name" holding "Yashwanth Dasari", and every screen that then joined
first + surname produced "Yashwanth Dasari Dasari" — the "Neha Iyer Iyer" bug. Seven
different call sites were each re-implementing the join, some with a de-duplication
guard and some without, so the same record rendered differently depending on where
you looked at it.

The fix is structural, not another guard: the parts stay clean, ``custom_full_name``
is derived once on validate, and anything that wants a display name reads that field
(it is also the doctype's title, so the list view, breadcrumb and link previews all
get it for free).

``full_name()`` keeps a de-duplication guard anyway, because it is also used on rows
that were written before this existed and on registration data typed by a TPO, where
a surname may already be sitting in the first-name box.
"""

import frappe

APPLICANT_DOCTYPE = "Job Applicant"

FIRST_FIELD = "applicant_name"
MIDDLE_FIELD = "custom_applicant_middle_name"
LAST_FIELD = "custom_applicant_last_name"
FULL_FIELD = "custom_full_name"


def _clean(value):
    return " ".join((value or "").split())


def full_name(first=None, middle=None, last=None):
    """"Yashwanth Kumar Dasari" from its parts.

    A part already present in an earlier part is not repeated, so legacy rows whose
    first-name box holds "Yashwanth Dasari" do not come back as
    "Yashwanth Dasari Dasari". Matching is whole-word and case-insensitive: a
    surname "Ram" must not be swallowed by a first name "Ramesh".
    """
    out = []
    seen = set()
    for part in (_clean(first), _clean(middle), _clean(last)):
        if not part:
            continue
        words = [w for w in part.lower().split() if w]
        if words and all(w in seen for w in words):
            continue          # every word of this part is already in the name
        out.append(part)
        seen.update(words)
    return " ".join(out)


def full_name_of(doc):
    """Full name for a Job Applicant document or dict."""
    get = doc.get if hasattr(doc, "get") else (lambda k: None)
    return full_name(get(FIRST_FIELD), get(MIDDLE_FIELD), get(LAST_FIELD))


def set_full_name(doc, method=None):
    """``validate`` on Job Applicant: keep ``custom_full_name`` true to its parts.

    Also the safety net for the old data shape: when the first-name box still holds
    the whole name, the surname is not appended a second time (see ``full_name``),
    so the derived name is correct even before the repair patch has run.
    """
    if not doc.meta.has_field(FULL_FIELD):
        return
    doc.set(FULL_FIELD, full_name_of(doc) or _clean(doc.get(FIRST_FIELD)))


def split_full_name(value):
    """Best-effort ``(first, middle, last)`` from a single typed-in name.

    Used only to repair data that was captured as one blob — first word is the given
    name, last word the surname, anything between is the middle name. It is a
    heuristic and is never applied to input a candidate entered in separate boxes.
    """
    words = _clean(value).split()
    if not words:
        return "", "", ""
    if len(words) == 1:
        return words[0], "", ""
    if len(words) == 2:
        return words[0], "", words[1]
    return words[0], " ".join(words[1:-1]), words[-1]


@frappe.whitelist()
def get_full_name(job_applicant):
    """Display name for one applicant, for callers that hold only the id."""
    row = frappe.db.get_value(
        APPLICANT_DOCTYPE, job_applicant,
        [FIRST_FIELD, MIDDLE_FIELD, LAST_FIELD, FULL_FIELD], as_dict=True,
    )
    if not row:
        return ""
    return row.get(FULL_FIELD) or full_name(
        row.get(FIRST_FIELD), row.get(MIDDLE_FIELD), row.get(LAST_FIELD))


def full_names_for(names):
    """``{job applicant: full name}`` for many applicants, in one query."""
    names = [n for n in dict.fromkeys(names or []) if n]
    if not names:
        return {}
    rows = frappe.get_all(
        APPLICANT_DOCTYPE, filters={"name": ["in", names]},
        fields=["name", FIRST_FIELD, MIDDLE_FIELD, LAST_FIELD, FULL_FIELD],
    )
    return {
        r.name: r.get(FULL_FIELD) or full_name(
            r.get(FIRST_FIELD), r.get(MIDDLE_FIELD), r.get(LAST_FIELD))
        for r in rows
    }
