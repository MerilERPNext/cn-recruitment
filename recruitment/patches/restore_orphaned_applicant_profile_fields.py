"""Re-surface Job Applicant fields that were recorded as synced but never added.

``Job Applicant Profile Settings.synced_field_refs`` is the list of fields
``_auto_sync`` must not re-import. It carries two legitimate meanings — a field
an admin deleted from the table on purpose, and one deliberately kept out (the
Feedback tab) — and either way the ref is what makes that decision stick.

``ensure_fields_in_section`` used to add a THIRD, accidental meaning. It skipped
any field missing from the meta it read (``if not df: continue``) but recorded
*every* name it was handed regardless, so a field created through the "Add Custom
Field" dialog could be marked synced without ever reaching the table. Its caller
loads Job Applicant's meta to resolve the section anchor and only cleared that
cache when a field was repositioned, so the read that followed was often stale
and the just-created fields were invisible to it. That is why the same dialog
placed some fields correctly and silently dropped others.

Once poisoned the field is gone for good: it is not in the table, and every later
load sees the ref and skips it. Both sides are fixed at source now — the placement
reads anything the cached meta is missing straight from the Custom Field table,
and records only what it actually added — which stops new fields from being
buried, but says nothing about the ones already in that state. This releases them.

Scope: system-generated Custom Fields only — those exist *because* the dialog
created them, so one missing from the table is this bug rather than a choice.
Standard fields and hand-made custom fields are left alone; an orphaned ref there
is most likely a deliberate delete, and honouring it is the whole point of the
list.

Restored rows come back the way any newly discovered field does — every channel
View OFF — so nothing reaches a candidate form until an admin turns it on.

Idempotent: once a ref is released the field is in the table, so it no longer
matches and later runs do nothing.
"""

import frappe


def execute():
	if not frappe.db.exists("DocType", "Job Applicant Profile Settings"):
		return

	from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
		EXCLUDED_TABS,
		iter_profile_fields,
	)

	settings = frappe.get_single("Job Applicant Profile Settings")
	synced = {r.strip() for r in (settings.synced_field_refs or "").split("\n") if r.strip()}
	if not synced:
		return

	in_table = {
		row.reference_name
		for row in settings.default_application_fields
		if row.reference_name
	}

	# Read through the same helper _auto_sync uses, so "eligible" cannot drift
	# between the two. Cached meta — nothing here mutates the doctype.
	eligible = {
		f.fieldname
		for f, _section, tab in iter_profile_fields(frappe.get_meta("Job Applicant"))
		if tab not in EXCLUDED_TABS
	}

	candidates = [ref for ref in synced if ref not in in_table and ref in eligible]
	if not candidates:
		return

	# Created by the dialog, so absence from the table is the bug, not a decision.
	# Filtered to the candidates, not every system-generated field on the doctype.
	orphans = sorted(
		frappe.get_all(
			"Custom Field",
			filters={
				"dt": "Job Applicant",
				"fieldname": ["in", candidates],
				"is_system_generated": 1,
			},
			pluck="fieldname",
		)
	)
	if not orphans:
		return

	# Strip in memory and let _auto_sync do the append and the single write; saving
	# here first, then re-reading the singleton, costs a round trip and a second
	# full load of an 80+ row child table. If _auto_sync adds nothing the strip is
	# never persisted, which is right: a field it declines to surface is one
	# stripping cannot help.
	settings.synced_field_refs = "\n".join(sorted(synced - set(orphans)))
	settings._auto_sync()

	frappe.logger().info(
		"restore_orphaned_applicant_profile_fields: re-surfaced %d field(s): %s"
		% (len(orphans), ", ".join(orphans))
	)
