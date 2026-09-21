"""Put the Candidate Registration shortcut above the campus drives board.

A TPO opens TPO Space to do one of two things: register a batch of candidates, or
look at how their drives are going. The registration shortcut sat UNDERNEATH the
drives block — a full-width board of cards — so the link they came for was below
the fold and the board they were only browsing was the first thing in front of them.

The layout lives in the database (`Workspace.content`), so the fixture alone would
not reach a site that already has the workspace. Idempotent: a workspace already in
that order is left untouched.
"""

import json

import frappe

WORKSPACE = "TPO Space"
# Everything that belongs above the drives board, in this order.
LEADING_TYPES = ("header", "shortcut")


def _rank(entry):
	kind = entry.get("type")
	return LEADING_TYPES.index(kind) if kind in LEADING_TYPES else len(LEADING_TYPES)


def _backfill_type():
	"""`Workspace.type` is mandatory and this workspace predates it.

	Left empty, EVERY save of this workspace throws MandatoryError — including
	create_tpo_campus_drives_block's, which is how the drives block gets placed on a
	site that does not have it yet. Filling it in is what makes the workspace saveable
	again; "Workspace" is the field's own default and what this row has always been.

	The field itself only arrived in Frappe v16. On v15 there is no `type` column, so
	asking for its value is a hard SQL error (1054) that takes the whole migrate down
	— and there is nothing to backfill, because nothing is mandatory yet. Asked of the
	schema rather than assumed from a version number: db, not meta, because the two
	calls it guards are direct SQL that bypasses meta.
	"""
	if not frappe.db.has_column("Workspace", "type"):
		return

	if not frappe.db.get_value("Workspace", WORKSPACE, "type"):
		frappe.db.set_value("Workspace", WORKSPACE, "type", "Workspace",
		                    update_modified=False)


def execute():
	if not frappe.db.exists("Workspace", WORKSPACE):
		return

	_backfill_type()

	content = json.loads(frappe.db.get_value("Workspace", WORKSPACE, "content") or "[]")
	if not content:
		return

	# A stable sort, so blocks of the same kind keep the order someone arranged them
	# in — this only lifts the shortcuts above the board, it does not reshuffle them.
	ordered = sorted(content, key=_rank)
	if ordered != content:
		# db.set_value rather than a save: this is a layout string being reordered, not
		# a change of meaning, and it must not depend on the rest of an old workspace
		# row validating.
		frappe.db.set_value("Workspace", WORKSPACE, "content", json.dumps(ordered),
		                    update_modified=False)
		print(f"{WORKSPACE}: Candidate Registration moved above the campus drives board")

	frappe.clear_cache()
	frappe.db.commit()
