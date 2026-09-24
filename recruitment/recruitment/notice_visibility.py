"""Portal-specific Notice visibility (ESS + Alumni Portal).

Two Check fields on Notice — ``show_in_ess_portal`` and ``show_in_alumni_portal``
(added by ``recruitment.recruitment.install.ensure_notice_portal_fields``) — gate
which portal a notice appears in:

    ESS  ✅ / Alumni ❌  → ESS only
    ESS  ❌ / Alumni ✅  → Alumni only
    ESS  ✅ / Alumni ✅  → both
    ESS  ❌ / Alumni ❌  → ESS only (legacy default — backward compatible)

This module only *filters* an already-fetched notice list (as returned by the
existing nextai ``get_user_notices``); it never changes how notices are fetched,
so all existing targeting / publish / expiry logic is untouched. Before the flag
fields are migrated it is a strict no-op, preserving legacy behaviour.
"""

from __future__ import annotations

import frappe
from frappe.utils import cint

ESS_FLAG = "show_in_ess_portal"
ALUMNI_FLAG = "show_in_alumni_portal"


def flags_available() -> bool:
    """True once both portal flag columns exist on Notice (post-migrate)."""
    return frappe.db.has_column("Notice", ESS_FLAG) and frappe.db.has_column(
        "Notice", ALUMNI_FLAG
    )


def visible_in_portal(
    ess_flag, alumni_flag, portal: str, *, legacy_default_ess: bool = True
) -> bool:
    """Apply the visibility matrix for one notice (or, via `legacy_default_ess`,
    any other doctype reusing this same ESS/Alumni flag pair -- see
    `cn_todo_manager`'s `todo_api.ess_hidden_todo_types` for Todo Type,
    which applies the same matrix with `legacy_default_ess=False` inline).

    ``portal`` is ``"ess"`` or ``"alumni"``. Alumni always shows only
    explicitly-flagged rows. ESS additionally shows the "neither set" legacy
    default when ``legacy_default_ess`` is True (Notice's behaviour, and the
    default here so every existing call site is unaffected); pass False for a
    strict-opt-in caller where "neither set" must mean hidden everywhere.
    """
    ess = cint(ess_flag)
    alumni = cint(alumni_flag)
    if portal == "alumni":
        return alumni == 1
    if legacy_default_ess:
        # ESS: flagged for ESS, or the legacy "neither set" default.
        return ess == 1 or (ess == 0 and alumni == 0)
    return ess == 1


def filter_notices_by_portal(notices: list, portal: str) -> list:
    """Return only the notices from ``notices`` visible in ``portal``.

    ``notices`` is the raw list of dicts from nextai's ``get_user_notices`` (each
    has a ``name``). Reads the two flag columns in one batched query. No-op (returns
    the input unchanged) before the fields are migrated, so legacy callers are
    unaffected.
    """
    if not notices or not flags_available():
        return notices

    names = [n.get("name") for n in notices if n.get("name")]
    if not names:
        return notices

    flags = {
        row.name: row
        for row in frappe.get_all(
            "Notice",
            filters={"name": ["in", names]},
            fields=["name", ESS_FLAG, ALUMNI_FLAG],
        )
    }

    visible = []
    for notice in notices:
        row = flags.get(notice.get("name"))
        if not row:
            continue
        if visible_in_portal(row.get(ESS_FLAG), row.get(ALUMNI_FLAG), portal):
            visible.append(notice)
    return visible
