"""Employee search for the webapp search bar.

Which fields the typed query is matched against is configured in the
**Employee Search Settings** single doctype: any Employee field, and for a Link
field any field on the doctype it points to (``department`` -> ``department_name``).
With no rows configured the defaults below reproduce the fixed field set this API
searched before it became configurable.
"""

import re

import frappe
from frappe import _
from frappe.model import no_value_fields
from frappe.utils import cint, cstr

SETTINGS_DOCTYPE = "Employee Search Settings"
CONFIG_CACHE_KEY = "employee_search:fields"
CONFIG_CACHE_TTL = 3600

# 0 means no limit, everywhere a limit is read: the caller's `limit`, the
# Result Limit setting, and this fallback. Employee search is a person picker -
# a truncated list silently hides the person someone is looking for.
NO_LIMIT = 0
DEFAULT_RESULT_LIMIT = NO_LIMIT
DEFAULT_MIN_QUERY_LENGTH = 2

FIELDNAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

# Keys this API has always returned. The search bar, EmployeeSelect and the
# recent-search cache in the webapp read them by name, so they stay in every
# result even when an admin drops the field from the search configuration.
# (fieldname, link doctype, display field on the linked doctype)
LEGACY_FIELDS = (
    ("employee_name", None, None),
    ("department", "Department", "department_name"),
    ("designation", "Designation", "designation_name"),
    ("branch", "Branch", "branch"),
    ("image", None, None),
    ("company", None, None),
)

# Searched when Employee Search Settings has no rows.
DEFAULT_SEARCH_FIELDS = (
    {"field_name": "name", "field_label": "Employee ID"},
    {"field_name": "employee_name", "field_label": "Employee Name"},
    {
        "field_name": "department",
        "field_label": "Department",
        "link_doctype": "Department",
        "link_field": "department_name",
    },
    {
        "field_name": "designation",
        "field_label": "Designation",
        "link_doctype": "Designation",
        "link_field": "designation_name",
    },
    {
        "field_name": "branch",
        "field_label": "Branch",
        "link_doctype": "Branch",
        "link_field": "branch",
    },
    {"field_name": "company", "field_label": "Company"},
)


class InvalidSearchField(Exception):
    """A configured row that cannot be turned into a column to search on."""


@frappe.whitelist()
def search_employees(query=None, status=None, exclude_own_employee=0, employee=None, limit=None):
    settings = get_settings()
    query = (query or "").strip()

    if len(query) < settings["min_query_length"]:
        return []

    terms = split_terms(query)
    if not terms:
        return []

    entries = build_entries()
    exclude_employee = employee if cint(exclude_own_employee) else None

    rows = run_search(
        entries,
        terms,
        status=normalise_status(status),
        exclude_employee=exclude_employee,
        limit=resolve_limit(limit, settings["result_limit"]),
    )

    return [format_employee(row, entries) for row in rows]


def normalise_status(status):
    """Accept a single status, a comma-separated list, or a JSON array.

    Callers sending ``status=Active`` keep the behaviour they had. Sending
    ``status=Active,Inactive`` (or a JSON list) now widens the search instead
    of matching nothing, which is what a caller wanting both used to get.
    """
    if not status:
        return []

    if isinstance(status, str):
        status = status.strip()
        # The webapp posts arrays as a JSON string.
        if status.startswith("["):
            try:
                status = frappe.parse_json(status)
            except Exception:
                return []
        else:
            status = status.split(",")

    if not isinstance(status, (list, tuple)):
        status = [status]

    seen = []
    for value in status:
        value = cstr(value).strip()
        if value and value not in seen:
            seen.append(value)
    return seen


def split_terms(query):
    """Split on commas and whitespace alike - the webapp sends "john,doe"."""
    seen = []
    for term in re.split(r"[,\s]+", query):
        term = term.strip()
        if term and term not in seen:
            seen.append(term)
    return seen


def resolve_limit(requested, configured):
    """The caller's limit wins; otherwise the configured one. 0 either way = no limit.

    An omitted limit is not the same as `limit=0`: omitted falls through to the
    setting, 0 is an explicit "give me everything".
    """
    if requested not in (None, ""):
        return max(cint(requested), NO_LIMIT)

    return max(cint(configured), NO_LIMIT)


def get_settings():
    min_query_length = DEFAULT_MIN_QUERY_LENGTH
    result_limit = DEFAULT_RESULT_LIMIT

    if frappe.db.exists("DocType", SETTINGS_DOCTYPE):
        min_query_length = (
            cint(frappe.db.get_single_value(SETTINGS_DOCTYPE, "min_query_length"))
            or DEFAULT_MIN_QUERY_LENGTH
        )
        result_limit = cint(frappe.db.get_single_value(SETTINGS_DOCTYPE, "result_limit"))

    return {"min_query_length": max(min_query_length, 1), "result_limit": result_limit}


# ─── Configuration ───────────────────────────────────────────────────────────


def get_search_fields():
    """Configured rows, validated and cached. Falls back to DEFAULT_SEARCH_FIELDS."""
    cached = frappe.cache.get_value(CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    fields = load_search_fields()
    frappe.cache.set_value(CONFIG_CACHE_KEY, fields, expires_in_sec=CONFIG_CACHE_TTL)
    return fields


def load_search_fields():
    rows = []

    if frappe.db.exists("DocType", SETTINGS_DOCTYPE):
        rows = frappe.get_all(
            "Employee Search Field",
            filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE},
            fields=[
                "field_name",
                "field_label",
                "link_doctype",
                "link_field",
                "searchable",
                "show_in_result",
            ],
            order_by="idx asc",
        )

    if not rows:
        rows = [dict(row, searchable=1, show_in_result=0) for row in DEFAULT_SEARCH_FIELDS]

    fields = []
    for row in rows:
        try:
            fields.append(resolve_field(row))
        except InvalidSearchField as e:
            # A field that was renamed or removed shouldn't take the whole search
            # bar down with it - drop the row and carry on.
            frappe.logger("employee_search").warning(
                f"Skipping Employee search field {row.get('field_name')}: {e}"
            )

    return fields


def resolve_field(row):
    """Validate one configured row and normalise it. Raises InvalidSearchField."""
    field_name = (row.get("field_name") or "").strip()
    if not FIELDNAME_PATTERN.match(field_name):
        raise InvalidSearchField(_("{0} is not a valid field name").format(field_name or "''"))

    label = (row.get("field_label") or "").strip()
    fieldtype = "Data"
    link_doctype = link_field = None

    if field_name == "name":
        label = label or _("Employee ID")
    else:
        df = frappe.get_meta("Employee").get_field(field_name)
        if not df:
            raise InvalidSearchField(_("Employee has no field {0}").format(field_name))

        validate_fieldtype("Employee", df)
        validate_column("Employee", field_name)

        fieldtype = df.fieldtype
        label = label or df.label or field_name
        link_doctype, link_field = resolve_link(df, row)

    return {
        "field_name": field_name,
        "field_label": label,
        "field_type": fieldtype,
        "link_doctype": link_doctype,
        "link_field": link_field,
        "searchable": cint(row.get("searchable")),
        "show_in_result": cint(row.get("show_in_result")),
    }


def resolve_link(df, row):
    link_field = (row.get("link_field") or "").strip()
    if not link_field:
        return None, None

    if df.fieldtype != "Link":
        raise InvalidSearchField(
            _("{0} is a {1} field, so it has no linked DocType to read {2} from").format(
                df.fieldname, df.fieldtype, link_field
            )
        )

    link_doctype = (row.get("link_doctype") or df.options or "").strip()
    if not link_doctype or "`" in link_doctype or not frappe.db.exists("DocType", link_doctype):
        raise InvalidSearchField(_("{0} is not a valid DocType").format(link_doctype or "''"))

    if frappe.get_meta(link_doctype).issingle:
        raise InvalidSearchField(_("{0} is a Single DocType and has no table to join").format(link_doctype))

    if not FIELDNAME_PATTERN.match(link_field):
        raise InvalidSearchField(_("{0} is not a valid field name").format(link_field))

    if link_field != "name":
        link_df = frappe.get_meta(link_doctype).get_field(link_field)
        if not link_df:
            raise InvalidSearchField(_("{0} has no field {1}").format(link_doctype, link_field))

        validate_fieldtype(link_doctype, link_df)
        validate_column(link_doctype, link_field)

    return link_doctype, link_field


def validate_fieldtype(doctype, df):
    if df.fieldtype in no_value_fields:
        raise InvalidSearchField(
            _("{0} is a {1} field and holds no value to search").format(df.fieldname, df.fieldtype)
        )

    if df.fieldtype == "Password":
        raise InvalidSearchField(_("{0} is a password field and cannot be searched").format(df.fieldname))

    if df.get("is_virtual"):
        raise InvalidSearchField(
            _("{0} is a virtual field - it is computed on read and not stored in the {1} table").format(
                df.fieldname, doctype
            )
        )

    if cint(df.permlevel) > 0:
        raise InvalidSearchField(
            _("{0} is restricted (permission level {1}) and cannot be searched").format(
                df.fieldname, df.permlevel
            )
        )


def validate_column(doctype, fieldname):
    """Guard against fields that exist in the DocType JSON but not in the table yet."""
    try:
        columns = frappe.db.get_table_columns(doctype)
    except Exception as e:
        raise InvalidSearchField(_("{0} has no database table").format(doctype)) from e

    if fieldname not in columns:
        raise InvalidSearchField(
            _("{0} is not a column in the {1} table - run bench migrate").format(fieldname, doctype)
        )


def clear_cache():
    frappe.cache.delete_value(CONFIG_CACHE_KEY)


# ─── Query ───────────────────────────────────────────────────────────────────


def build_entries():
    """Merge the always-returned legacy fields with the configured ones.

    Returns an ordered {fieldname: entry} map; each entry carries its join alias so
    the SELECT, the JOINs and the WHERE all address the same columns.
    """
    entries = {}

    for field_name, link_doctype, link_field in LEGACY_FIELDS:
        entries[field_name] = {
            "field_name": field_name,
            "field_label": None,
            "link_doctype": link_doctype,
            "link_field": link_field,
            "searchable": 0,
            "show_in_result": 0,
        }

    for row in get_search_fields():
        field_name = row["field_name"]
        entry = entries.get(field_name)

        if not entry:
            entry = dict(row)
            entries[field_name] = entry
        elif row["link_field"]:
            entry["link_doctype"] = row["link_doctype"]
            entry["link_field"] = row["link_field"]

        entry["field_label"] = row["field_label"] or entry["field_label"]
        entry["searchable"] = entry["searchable"] or row["searchable"]
        entry["show_in_result"] = entry["show_in_result"] or row["show_in_result"]

    alias_idx = 0
    for field_name, entry in list(entries.items()):
        # Legacy rows are the only ones not run through resolve_field; drop the
        # ones this site doesn't have rather than emitting a broken column.
        if field_name != "name" and not column_exists("Employee", field_name):
            del entries[field_name]
            continue

        entry["alias"] = None
        if entry["link_field"] and entry["link_doctype"] and link_usable(entry):
            entry["alias"] = f"l{alias_idx}"
            alias_idx += 1
        else:
            entry["link_doctype"] = entry["link_field"] = None

    return entries


def column_exists(doctype, fieldname):
    try:
        return fieldname in frappe.db.get_table_columns(doctype)
    except Exception:
        return False


def link_usable(entry):
    link_doctype, link_field = entry["link_doctype"], entry["link_field"]
    if "`" in link_doctype:
        return False
    return link_field == "name" or column_exists(link_doctype, link_field)


def source_column(entry):
    return "e.`name`" if entry["field_name"] == "name" else f"e.`{entry['field_name']}`"


def linked_column(entry):
    return f"{entry['alias']}.`{entry['link_field']}`"


def run_search(entries, terms, status=None, exclude_employee=None, limit=DEFAULT_RESULT_LIMIT):
    selects = ["e.`name` AS `employee_id`"]
    joins = []
    conditions = []
    search_columns = []
    values = {}

    for entry in entries.values():
        column = source_column(entry)

        if entry["field_name"] != "name":
            selects.append(f"{column} AS `{entry['field_name']}`")

        if entry["alias"]:
            joins.append(
                f"LEFT JOIN `tab{entry['link_doctype']}` {entry['alias']} ON {column} = {entry['alias']}.`name`"
            )
            selects.append(
                f"COALESCE({linked_column(entry)}, {column}) AS `{entry['field_name']}_display`"
            )

        if entry["searchable"]:
            search_columns.append(column)
            if entry["alias"]:
                search_columns.append(linked_column(entry))

    if not search_columns:
        return []

    for idx, term in enumerate(terms):
        key = f"term{idx}"
        values[key] = like_value(term)
        conditions.append(" OR ".join(f"{column} LIKE %({key})s" for column in search_columns))

    if status:
        conditions.append(
            "e.`status` IN (%s)" % ", ".join(f"%(status{i})s" for i in range(len(status)))
        )
        values.update({f"status{i}": value for i, value in enumerate(status)})

    if exclude_employee:
        conditions.append("e.`name` != %(exclude_employee)s")
        values["exclude_employee"] = exclude_employee

    where_clause = " AND ".join(f"({condition})" for condition in conditions)
    limit_clause = f"LIMIT {cint(limit)}" if cint(limit) > NO_LIMIT else ""

    return frappe.db.sql(
        f"""
        SELECT {", ".join(selects)}
        FROM `tabEmployee` e
        {" ".join(joins)}
        WHERE {where_clause}
        ORDER BY e.`employee_name`
        {limit_clause}
        """,
        values,
        as_dict=True,
    )


def like_value(term):
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


# ─── Result shaping ──────────────────────────────────────────────────────────


def format_employee(row, entries):
    result = {
        "employee_id": row.get("employee_id"),
        "employee_name": row.get("employee_name"),
        "image": row.get("image"),
        "company": row.get("company"),
    }

    display_parts = [row.get("employee_name") or ""]

    for field_name in ("department", "designation", "branch"):
        value = row.get(field_name)
        display = row.get(f"{field_name}_display") or value
        result[field_name] = value
        result[f"{field_name}_display"] = display
        if display:
            display_parts.append(display)

    extra_fields = []
    for entry in entries.values():
        if not entry["show_in_result"]:
            continue

        value = entry_value(row, entry)
        extra_fields.append(
            {
                "fieldname": entry["field_name"],
                "label": entry["field_label"] or entry["field_name"],
                "value": value,
            }
        )

        display_value = cstr(value)
        if display_value and display_value not in display_parts:
            display_parts.append(display_value)

    result["search_fields"] = extra_fields
    result["display_text"] = " ".join(part for part in display_parts if part)

    return result


def entry_value(row, entry):
    if entry["field_name"] == "name":
        return row.get("employee_id")

    if entry["alias"]:
        return row.get(f"{entry['field_name']}_display") or row.get(entry["field_name"])

    return row.get(entry["field_name"])
