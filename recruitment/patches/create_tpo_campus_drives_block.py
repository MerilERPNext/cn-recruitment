"""Create the "TPO Campus Drives" Custom HTML Block and put it on TPO Space.

A Custom HTML Block lives only in the database, so a fresh dev / staging / prod
site would not have it — hence this patch. The block's html/css/js are kept as
source files under recruitment/recruitment/custom_blocks and pushed in from
there, so the patch never carries a copy that can drift.

Idempotent: safe to re-run, and the same sync also runs on every migrate
(recruitment.recruitment.install.ensure_custom_html_blocks) so later edits to
those source files reach existing sites without a new patch.
"""

import json

import frappe

from recruitment.recruitment.custom_blocks import sync_custom_html_blocks

BLOCK_NAME = "TPO Campus Drives"
WORKSPACE = "TPO Space"
BLOCK_ID = "tpo_drives_block"


def execute():
	sync_custom_html_blocks()
	_add_block_to_workspace()


def _add_block_to_workspace():
	"""Place the block on the TPO Space workspace, just under its header.

	A workspace needs the block in two places: a `custom_block` entry in the
	`content` layout JSON, and a row in the `custom_blocks` child table. Missing
	either one renders an empty slot.
	"""
	if not frappe.db.exists("Workspace", WORKSPACE):
		return

	workspace = frappe.get_doc("Workspace", WORKSPACE)
	content = json.loads(workspace.content or "[]")

	already_placed = any(
		block.get("type") == "custom_block"
		and (block.get("data") or {}).get("custom_block_name") == BLOCK_NAME
		for block in content
	)
	has_child_row = any(row.custom_block_name == BLOCK_NAME for row in workspace.custom_blocks)
	if already_placed and has_child_row:
		return

	if not already_placed:
		entry = {
			"id": BLOCK_ID,
			"type": "custom_block",
			"data": {"custom_block_name": BLOCK_NAME, "col": 12},
		}
		# Right after the header block, so the drives are the first thing a TPO
		# sees rather than sitting below the shortcuts.
		position = 1 if content and content[0].get("type") == "header" else 0
		content.insert(position, entry)
		workspace.content = json.dumps(content)

	if not has_child_row:
		workspace.append("custom_blocks", {"custom_block_name": BLOCK_NAME, "label": BLOCK_NAME})

	workspace.save(ignore_permissions=True)
