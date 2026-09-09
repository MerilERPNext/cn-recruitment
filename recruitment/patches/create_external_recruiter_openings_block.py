"""Create the "External Recruiter Openings" Custom HTML Block and put it on the
External Recruiter workspace.

A Custom HTML Block lives only in the database, so an existing dev / staging /
prod site would not have it — hence this patch. The block's html/css/js are kept
as source files under recruitment/recruitment/custom_blocks and pushed in from
there, so the patch never carries a copy that can drift.

A fresh site does not run historical patches, but does not need to: the block is
also placed in the shipped workspace JSON
(recruitment/recruitment/workspace/external_recruiter/external_recruiter.json),
so a new install gets it from there. This patch is what carries it to the sites
that already exist.

Idempotent: safe to re-run, and the same sync also runs on every migrate
(recruitment.recruitment.install.ensure_custom_html_blocks) so later edits to
those source files reach existing sites without a new patch.
"""

import json

import frappe

from recruitment.recruitment.custom_blocks import sync_custom_html_blocks

BLOCK_NAME = "External Recruiter Openings"
WORKSPACE = "External Recruiter"
BLOCK_ID = "er_openings_block"


def execute():
	sync_custom_html_blocks()
	_add_block_to_workspace()


def _add_block_to_workspace():
	"""Place the block on the External Recruiter workspace, under its shortcuts.

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
		# Below the header and the existing Job Openings / Job Applicants shortcuts,
		# which stay exactly as they are — this board is an extra layer on top of
		# them, not a replacement for them.
		leading = {"header", "shortcut"}
		position = next(
			(i for i, block in enumerate(content) if block.get("type") not in leading),
			len(content),
		)
		content.insert(position, entry)
		workspace.content = json.dumps(content)

	if not has_child_row:
		workspace.append("custom_blocks", {"custom_block_name": BLOCK_NAME, "label": BLOCK_NAME})

	workspace.save(ignore_permissions=True)
