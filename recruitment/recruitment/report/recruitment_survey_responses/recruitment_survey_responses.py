# Copyright (c) 2026, Hybrowlabs technologies and contributors
# For license information, please see license.txt

"""Recruitment Survey Responses — one row per candidate, one column per question.

The doctype's own list export puts the whole answer set into a single `Response`
cell of raw JSON, which is unreadable in Excel. This report pivots it: the
questions become column headers and each candidate's answers fill the row, so the
export can be filtered, sorted and charted like any other sheet.

HOW A RESPONSE MAPS BACK TO ITS QUESTION
----------------------------------------
`response_json` is a flat {question_key: answer} dict. Its keys are not the form's
field keys — the portal derives them by splitting the field key on capitals and
lowercasing, so `DidThePrePlacementTalkPptBeginAsPerTheScheduledTime` is stored as
"did the pre placement talk ppt begin as per the scheduled time".

`_response_key` reproduces exactly that transformation, which is what lets the
Microapp Form Widget's real labels be recovered for the headers. When a key cannot
be matched to a widget field (an older form, a since-renamed question) the stored
key itself is title-cased, so a column is never silently dropped.

Read-only: it queries and reshapes, and writes nothing.
"""

import json
import re

import frappe
from frappe import _
from frappe.utils import cstr


BASE_COLUMNS = [
    {"fieldname": "name", "label": _("ID"), "fieldtype": "Link",
     "options": "Recruitment Survey Response", "width": 150},
    {"fieldname": "job_applicant", "label": _("Job Applicant"), "fieldtype": "Link",
     "options": "Job Applicant", "width": 180},
    {"fieldname": "job_opening", "label": _("Job Opening"), "fieldtype": "Link",
     "options": "Job Opening", "width": 180},
    {"fieldname": "microapp_form_widget", "label": _("Form Widget"), "fieldtype": "Link",
     "options": "Microapp Form Widget", "width": 200},
    {"fieldname": "submitted_at", "label": _("Submitted At"), "fieldtype": "Datetime",
     "width": 160},
]

QUESTION_WIDTH = 260

# Leading question numbering on a form label ("2. Did the ..."), dropped from the
# column header — the column order already conveys it.
_LEADING_NUMBER = re.compile(r"^\s*\d+\s*[.)]\s*")

# Split at a lowercase→uppercase boundary, the same rule the portal uses when it
# builds a response key from a form field key. Deliberately NOT a split before
# every capital: two adjacent capitals stay joined, which is why
# `...CompletedWithinASingleDay` is stored as "...completed within asingle day".
_CAMEL_BOUNDARY = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


def execute(filters=None):
    filters = frappe._dict(filters or {})

    responses = _get_responses(filters)
    if not responses:
        return BASE_COLUMNS, []

    labels = _question_labels(responses)
    question_columns, fieldnames = _build_question_columns(responses, labels)

    return BASE_COLUMNS + question_columns, _build_rows(responses, fieldnames)


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def _get_responses(filters):
    conditions = {}
    if filters.get("job_opening"):
        conditions["job_opening"] = filters.job_opening
    if filters.get("microapp_form_widget"):
        conditions["microapp_form_widget"] = filters.microapp_form_widget
    if filters.get("from_date") and filters.get("to_date"):
        conditions["submitted_at"] = ["between", [filters.from_date, filters.to_date]]
    elif filters.get("from_date"):
        conditions["submitted_at"] = [">=", filters.from_date]
    elif filters.get("to_date"):
        conditions["submitted_at"] = ["<=", filters.to_date]

    return frappe.get_all(
        "Recruitment Survey Response",
        filters=conditions,
        fields=["name", "job_applicant", "job_opening", "microapp_form_widget",
                "submitted_at", "response_json"],
        order_by="submitted_at desc",
    )


def _parse(response_json):
    """The stored answers as a flat dict. Anything unparseable is treated as an
    empty response so one bad row cannot take the whole report down."""
    if not response_json:
        return {}
    try:
        parsed = json.loads(response_json) if isinstance(response_json, str) else response_json
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


# ---------------------------------------------------------------------------
# Question headers
# ---------------------------------------------------------------------------

def _response_key(field_key):
    """The response_json key the portal produces for a form field key."""
    spaced = _CAMEL_BOUNDARY.sub(" ", cstr(field_key))
    return re.sub(r"\s+", " ", spaced).strip().lower()


def _question_labels(responses):
    """{response_key: (widget_label, order)} across every widget in the result.

    `order` keeps the questions in the order the form asks them, rather than the
    arbitrary order a JSON dict happens to iterate in.
    """
    widgets = {r.microapp_form_widget for r in responses if r.microapp_form_widget}
    labels = {}
    order = 0

    for widget in sorted(widgets):
        for key, label in _widget_fields(widget):
            response_key = _response_key(key)
            if not response_key or response_key in labels:
                continue
            labels[response_key] = (_LEADING_NUMBER.sub("", cstr(label)).strip(), order)
            order += 1

    return labels


def _widget_fields(widget):
    """[(field_key, label), ...] from a Microapp Form Widget's form.io definition.

    Best-effort: a widget whose config is missing or unreadable simply contributes
    no labels, and its questions fall back to their stored keys.
    """
    try:
        raw = frappe.db.get_value("Microapp Form Widget", widget, "custom_form_data")
        config = json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return []
    if not config:
        return []

    found = []
    seen = set()

    def walk(node):
        if isinstance(node, dict):
            key, label = node.get("key"), node.get("label")
            # A button is a control, not a question.
            if key and label and node.get("type") != "button" and key not in seen:
                seen.add(key)
                found.append((key, label))
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(config)
    return found


def _build_question_columns(responses, labels):
    """One column per question actually present in the data.

    Only keys that appear in at least one response become columns, so a form's
    unanswered conditional follow-ups do not pad the sheet with empty columns.
    """
    present = set()
    for row in responses:
        present.update(_parse(row.response_json).keys())

    def sort_key(key):
        # Questions the form defines come first, in form order; anything unmatched
        # follows alphabetically so the layout is still stable between runs.
        if key in labels:
            return (0, labels[key][1], "")
        return (1, 0, key)

    columns, fieldnames = [], {}
    used = set()

    for key in sorted(present, key=sort_key):
        fieldname = _fieldname_for(key, used)
        fieldnames[key] = fieldname
        columns.append({
            "fieldname": fieldname,
            "label": labels[key][0] if key in labels else key.title(),
            "fieldtype": "Data",
            "width": QUESTION_WIDTH,
        })

    return columns, fieldnames


def _fieldname_for(key, used):
    """A safe, unique column fieldname for a question key.

    Two questions can share a label (a form repeats the same follow-up prompt), so
    uniqueness is enforced on the fieldname rather than assumed.
    """
    base = re.sub(r"[^a-z0-9]+", "_", cstr(key).lower()).strip("_")[:100] or "question"
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

def _build_rows(responses, fieldnames):
    rows = []
    for response in responses:
        row = {
            "name": response.name,
            "job_applicant": response.job_applicant,
            "job_opening": response.job_opening,
            "microapp_form_widget": response.microapp_form_widget,
            "submitted_at": response.submitted_at,
        }
        answers = _parse(response.response_json)
        for key, fieldname in fieldnames.items():
            row[fieldname] = _display(answers.get(key))
        rows.append(row)
    return rows


def _display(value):
    """Answers are usually plain strings; a multi-select arrives as a list and a
    grid as a dict. Flatten those rather than printing raw Python."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return _("Yes") if value else _("No")
    if isinstance(value, list):
        return ", ".join(_display(v) for v in value if v not in (None, ""))
    if isinstance(value, dict):
        return ", ".join(f"{k}: {_display(v)}" for k, v in value.items())
    return cstr(value)
