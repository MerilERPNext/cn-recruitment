"""Onboarding SPOCs — one place to read them.

`Employee Onboarding.custom_onboarding_spoc` is a Table MultiSelect of
"Onboarding Buddy User" rows (it used to be a single Link -> User). The default
list lives on Onboarding Settings -> HR Onboarding SPOCs and is copied onto each
onboarding when it is created.

Read the SPOCs through these helpers rather than `doc.get(...)`: a Table
MultiSelect has no database column, so `frappe.db.get_value(..., "custom_onboarding_spoc")`
fails on a fresh site and returns a stale value on one that had the old column.
"""

import frappe

SPOC_FIELD = "custom_onboarding_spoc"
SETTINGS_DOCTYPE = "Onboarding Settings"
SETTINGS_FIELD = "hr_onboarding_spocs"
ROW_DOCTYPE = "Onboarding Buddy User"

_NOT_A_PERSON = ("Administrator", "Guest")


def _usable(user):
    return (
        bool(user)
        and user not in _NOT_A_PERSON
        and bool(frappe.db.get_value("User", user, "enabled"))
    )


def _rows_to_users(rows):
    out = []
    for row in rows or []:
        user = row.get("user") if hasattr(row, "get") else getattr(row, "user", None)
        if _usable(user) and user not in out:
            out.append(user)
    return out


def settings_spocs():
    """The default SPOC list from Onboarding Settings, in order."""
    users = frappe.get_all(
        ROW_DOCTYPE,
        filters={
            "parent": SETTINGS_DOCTYPE,
            "parenttype": SETTINGS_DOCTYPE,
            "parentfield": SETTINGS_FIELD,
        },
        pluck="user",
        order_by="idx asc",
    )
    return [u for u in dict.fromkeys(users) if _usable(u)]


def onboarding_spocs(doc, fallback_to_settings=True):
    """The SPOC users of one onboarding.

    `doc` may be a Document or a name. An onboarding with no SPOC rows — any
    record created before the field became a list — falls back to the Settings
    list, so it is never left with nobody to notify.
    """
    if isinstance(doc, str):
        rows = frappe.get_all(
            ROW_DOCTYPE,
            filters={"parent": doc, "parenttype": "Employee Onboarding", "parentfield": SPOC_FIELD},
            fields=["user"],
            order_by="idx asc",
        )
    else:
        rows = doc.get(SPOC_FIELD)
        # A pre-change value loaded from the old column is a plain string.
        if isinstance(rows, str):
            rows = [{"user": rows}]

    users = _rows_to_users(rows)
    if not users and fallback_to_settings:
        users = settings_spocs()
    return users


def set_onboarding_spocs(doc, users):
    """Replace the SPOC rows on an in-memory onboarding (caller saves)."""
    doc.set(SPOC_FIELD, [])
    for user in users:
        doc.append(SPOC_FIELD, {"user": user})
