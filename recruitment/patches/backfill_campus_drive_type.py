"""Give every existing Campus Drive a Drive Type.

Campus Drive gained ``drive_type`` (On-Site / Online) so a drive can say how it is
run, and every interview it creates opens in that mode. The field is mandatory —
"the mode was never set" is not a state an interview should be able to inherit —
and a `default` only applies to NEW documents. Without this, every drive created
before the field existed carries an empty Drive Type and refuses to save the next
time HR touches it, complaining about a field they never filled in.

On-Site is the right backfill rather than a guess: campus hiring is a visit to a
college, and every drive that predates this field was run that way.

Idempotent — only rows with nothing in the column are written, and the write skips
the modified timestamp so a backfill does not look like someone edited the drive.
"""

import frappe


def execute():
	if not frappe.db.has_column("Campus Drive", "drive_type"):
		# The doctype sync runs before patches on a normal migrate, so this is only
		# reachable on an unusual ordering. Nothing to do rather than an error.
		return

	names = frappe.get_all(
		"Campus Drive",
		filters=[["drive_type", "in", [None, ""]]],
		pluck="name",
	)
	for name in names:
		frappe.db.set_value("Campus Drive", name, "drive_type", "On-Site",
		                    update_modified=False)
	frappe.db.commit()
