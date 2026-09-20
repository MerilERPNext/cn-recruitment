# Copyright (c) 2026, Hybrowlabs technologies and contributors
# For license information, please see license.txt

"""Interview Feedback Responses — one row per feedback, one column per question.

A feedback given on a configured evaluation form stores its answers as a single
JSON blob (`custom_form_response`), which is unreadable in a list view or an
export. This report pivots it: every question the form asked becomes a column, and
each interviewer's answers fill the row — so a panel's scoring can be filtered,
sorted, compared and charted like any other sheet.

HOW A QUESTION GETS ITS HEADER
------------------------------
From `custom_response_labels`, the `{key: {label, type}}` map frozen onto each
feedback when it was saved (see recruitment.api.interview_feedback_form).

That is deliberately NOT how the sibling Recruitment Survey Responses report works.
That one stores mangled keys and reverse-engineers the labels out of the live
Microapp Form Widget, which means editing a form retroactively rewrites — or
silently loses — the headers of every response already collected. Here the labels
travel with the answer, so a form edited after the fact cannot change what an
interviewer is recorded as having been asked.

The live widget is never read, so this report costs one query no matter how many
different forms appear in the result.

Read-only: it queries and reshapes, and writes nothing.
"""

import json

import frappe
from frappe import _
from frappe.utils import cstr, escape_html


BASE_COLUMNS = [
    {"fieldname": "name", "label": _("ID"), "fieldtype": "Link",
     "options": "Interview Feedback", "width": 150},
    {"fieldname": "interview", "label": _("Interview"), "fieldtype": "Link",
     "options": "Interview", "width": 140},
    {"fieldname": "job_applicant", "label": _("Job Applicant"), "fieldtype": "Link",
     "options": "Job Applicant", "width": 180},
    {"fieldname": "interviewer", "label": _("Interviewer"), "fieldtype": "Link",
     "options": "User", "width": 180},
    {"fieldname": "custom_evaluation_form", "label": _("Feedback Form"), "fieldtype": "Link",
     "options": "Microapp Form Widget", "width": 180},
    {"fieldname": "result", "label": _("Result"), "fieldtype": "Data", "width": 90},
    {"fieldname": "submitted_on", "label": _("Submitted On"), "fieldtype": "Datetime",
     "width": 160},
]

QUESTION_WIDTH = 240

# Formio component types whose answer is a number worth totalling / charting.
NUMERIC_TYPES = {"number", "currency", "rating"}


def execute(filters=None):
    filters = frappe._dict(filters or {})

    feedbacks = _get_feedbacks(filters)
    if not feedbacks:
        return BASE_COLUMNS, []

    columns, fieldnames = _build_question_columns(feedbacks)
    return BASE_COLUMNS + columns, _build_rows(feedbacks, fieldnames)


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
def _get_feedbacks(filters):
    conditions = {
        # Submitted feedback only. A draft is half an opinion and a cancelled one
        # was withdrawn; neither belongs in a scoring comparison.
        "docstatus": 1,
        # Rows from before a form was configured, or from interviews that use the
        # standard skill grid, have nothing to pivot.
        "custom_evaluation_form": ["is", "set"],
    }

    for field in ("custom_evaluation_form", "job_applicant", "interviewer", "result"):
        if filters.get(field):
            conditions[field] = filters.get(field)

    if filters.get("from_date") and filters.get("to_date"):
        conditions["modified"] = ["between", [filters.from_date, filters.to_date]]
    elif filters.get("from_date"):
        conditions["modified"] = [">=", filters.from_date]
    elif filters.get("to_date"):
        conditions["modified"] = ["<=", filters.to_date]

    # get_list, NOT get_all: `frappe.get_all` sets ignore_permissions=True (its own
    # docstring says it "will not check for permissions"), which would show every
    # feedback on the site to anyone who can open the report — past the User
    # Permissions that scope an HR User to their own company or region.
    #
    # limit_page_length=0 is not optional here. get_list defaults to 20 rows where
    # get_all defaults to unlimited, so dropping it would silently truncate the
    # report to the 20 most recent rows and look like working software.
    return frappe.get_list(
        "Interview Feedback",
        filters=conditions,
        fields=["name", "interview", "job_applicant", "interviewer",
                "custom_evaluation_form", "result", "modified as submitted_on",
                "custom_form_response", "custom_response_labels"],
        order_by="modified desc",
        limit_page_length=0,
    )


def _parse(value):
    """Stored JSON as a dict. Anything unparseable is treated as empty, so one bad
    row cannot take the whole report down."""
    if not value:
        return {}
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


# ---------------------------------------------------------------------------
# Question columns
# ---------------------------------------------------------------------------
def _build_question_columns(feedbacks):
    """One column per distinct question across every form in the result.

    Two forms that ask the same question under the same key share a column, which
    is what makes a side-by-side comparison of two rounds readable. Questions are
    ordered by first appearance — the newest feedback is first, so the most
    recently used form leads the sheet.

    Returns (columns, fieldnames) where `fieldnames` maps a question key to the
    column fieldname holding it.
    """
    columns = []
    fieldnames = {}
    used = set(c["fieldname"] for c in BASE_COLUMNS)

    for feedback in feedbacks:
        labels = _parse(feedback.custom_response_labels)
        for key, meta in labels.items():
            if key in fieldnames:
                continue
            if not isinstance(meta, dict):
                meta = {}

            fieldname = _unique_fieldname(key, used)
            fieldnames[key] = fieldname
            columns.append({
                "fieldname": fieldname,
                "label": cstr(meta.get("label") or key).strip() or key,
                # Everything is Data except a genuine number: a Formio answer can be
                # a list (checkboxes), a dict (a file, an address) or free text, and
                # a typed column would render those as blank rather than as what the
                # interviewer actually chose.
                "fieldtype": "Float" if meta.get("type") in NUMERIC_TYPES else "Data",
                "width": QUESTION_WIDTH,
            })

    return columns, fieldnames


def _unique_fieldname(key, used):
    """A column fieldname that cannot collide with a base column or another question.

    Prefixed because a form is free to use a key like `name` or `result`, which
    would otherwise overwrite a base column in the row dict.
    """
    base = "q_" + "".join(c if c.isalnum() else "_" for c in cstr(key))[:40]
    fieldname = base
    suffix = 2
    while fieldname in used:
        fieldname = f"{base}_{suffix}"
        suffix += 1
    used.add(fieldname)
    return fieldname


# ---------------------------------------------------------------------------
# Rows
# ---------------------------------------------------------------------------
def _build_rows(feedbacks, fieldnames):
    rows = []
    for feedback in feedbacks:
        row = {
            "name": feedback.name,
            "interview": feedback.interview,
            "job_applicant": feedback.job_applicant,
            "interviewer": feedback.interviewer,
            "custom_evaluation_form": feedback.custom_evaluation_form,
            "result": feedback.result,
            "submitted_on": feedback.submitted_on,
        }

        answers = _parse(feedback.custom_form_response)
        for key, value in answers.items():
            fieldname = fieldnames.get(key)
            if fieldname:
                row[fieldname] = _display(value)

        rows.append(row)
    return rows


def _display(value):
    """A Formio answer as something a spreadsheet cell can hold.

    Checkbox groups arrive as `{"option": true}`, multi-selects as a list, a file
    upload as a list of dicts. Flattening them here keeps the export readable
    instead of showing raw JSON in a cell.

    Text is HTML-ESCAPED on the way out. Every value here was typed by an
    interviewer into a free-text box, and Frappe's report renderer does not escape
    it for us: `frappe.form.formatters.Data` returns the value untouched and the
    datatable writes cells as HTML. An answer of `<img src=x onerror=...>` would
    otherwise run in the browser of every recruiter who opens this report. Numbers
    are returned as numbers so the Float columns still sort and total.
    """
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return _("Yes") if value else _("No")
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, list):
        return ", ".join(cstr(_display(v)) for v in value if v not in (None, "")) or None
    if isinstance(value, dict):
        # A checkbox group arrives as {option: bool}. Only the ticked ones say
        # anything — and a group with nothing ticked is a blank cell, not the
        # literal `{"a":false}` that dumping the dict would print.
        if value and all(isinstance(v, bool) for v in value.values()):
            return escape_html(", ".join(k for k, v in value.items() if v)) or None
        for key in ("label", "name", "value"):
            if value.get(key):
                return escape_html(cstr(value[key]))
        return escape_html(json.dumps(value, separators=(",", ":")))
    return escape_html(cstr(value))
