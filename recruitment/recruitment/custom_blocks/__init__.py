"""Ship Custom HTML Blocks as app source files instead of hand-edited DB records.

A "Custom HTML Block" lives entirely in the database, which makes it invisible to
git and impossible to review or roll back. So the html / css / js for each block
is kept next to this file and pushed into the record on every migrate — the DB
copy is a build artefact, the files are the source of truth.

Editing a block through the Desk UI therefore works for experimenting, but the
next migrate overwrites it. Change the files.
"""

import os

import frappe

# name of the Custom HTML Block  ->  basename of its .html / .css / .js trio
MANAGED_BLOCKS = {
	# Drive cards + "Add Candidates" dialog, placed on the TPO Space workspace.
	# Backed by recruitment.recruitment.tpo_portal.
	"TPO Campus Drives": "tpo_campus_drives",
	# Opening cards + "View Candidates" dialog, placed on the External Recruiter
	# workspace. Backed by recruitment.recruitment.external_recruiter_portal.
	"External Recruiter Openings": "external_recruiter_openings",
}


def sync_custom_html_blocks():
	"""Create or refresh every managed Custom HTML Block from its source files."""
	for block_name, basename in MANAGED_BLOCKS.items():
		try:
			_sync_block(block_name, basename)
		except Exception:
			frappe.logger("recruitment").warning(f"sync_custom_html_blocks: skipped {block_name}")


def _sync_block(block_name, basename):
	payload = {
		"html": _read(f"{basename}.html"),
		"style": _read(f"{basename}.css"),
		"script": _read(f"{basename}.js"),
	}

	if not frappe.db.exists("Custom HTML Block", block_name):
		doc = frappe.new_doc("Custom HTML Block")
		doc.name = block_name
		# Public: a private block is only visible to its owner, and this one has to
		# render for every TPO. Who actually sees it is decided by the workspace it
		# sits on (TPO Space is restricted to the TPO role) — the block's own
		# `roles` table is not enforced anywhere in Frappe, so leaving it empty
		# avoids implying a permission check that does not exist.
		doc.private = 0
		doc.update(payload)
		doc.insert(ignore_permissions=True)
		return

	doc = frappe.get_doc("Custom HTML Block", block_name)
	# Only write when something actually changed, so a migrate does not churn
	# `modified` (and the Version log) on every run.
	if all((doc.get(field) or "") == value for field, value in payload.items()):
		return
	doc.update(payload)
	doc.save(ignore_permissions=True)


def _read(filename):
	path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
	with open(path, encoding="utf-8") as f:
		return f.read()
