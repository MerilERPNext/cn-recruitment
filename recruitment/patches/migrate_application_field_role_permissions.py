"""Rewrite the application-field permission columns as JSON role lists.

The old Select words map as described in field_role_permissions._LEGACY; the new
``profile_view_roles`` column is filled with everyone. Idempotent — values that
are already role lists are left alone.
"""

import json

import frappe

from recruitment.recruitment.field_role_permissions import (
	ALL,
	ROLE_LIST_COLS,
	parse_roles,
	serialize_roles,
)

TABLE = "Job Opening Application Field"


def execute():
	if not frappe.db.table_exists(TABLE):
		return

	meta = frappe.get_meta(TABLE)
	cols = [c for c in ROLE_LIST_COLS if meta.get_field(c)]
	if not cols:
		return

	rows = frappe.get_all(TABLE, fields=["name"] + cols, limit_page_length=0)
	converted = 0
	for row in rows:
		patch = {
			col: serialize_roles(parse_roles(row.get(col)))
			for col in cols
			if not _is_role_list(row.get(col))
		}
		if not patch:
			continue
		# update_modified=False: bumping `modified` on these child rows would make
		# every open Job Opening form think it is stale and refuse the next save.
		frappe.db.set_value(TABLE, row.name, patch, update_modified=False)
		converted += 1

	frappe.db.commit()
	print(f"Application field role permissions: converted {converted} of {len(rows)} row(s).")


def _is_role_list(raw):
	"""True where the column already holds the new JSON-list form. A bare "All" is
	valid JSON too, but it is the old Select word."""
	if not raw:
		return False
	try:
		parsed = json.loads(raw)
	except (ValueError, TypeError):
		return False
	return isinstance(parsed, list) and all(isinstance(v, str) for v in parsed) and (
		ALL not in parsed or parsed == [ALL]
	)
