"""Keep Job Applicant Profile Settings in step with nextai-managed fields.

Custom Doctype Fields (nextai) owns where a managed field sits on the Job
Applicant FORM. Job Applicant Profile Settings owns where it sits in the
CANDIDATE-FACING config -- a deliberately curated layer whose ``_auto_sync``
groups a field into a section once, when it first appears, and never re-groups
it afterwards so an admin's own arrangement is not overwritten on every load.

That leaves managed fields in the wrong place, because their arrangement is not
the admin's to curate -- it is whatever Custom Doctype Fields currently says.
Two symptoms, both seen on homefirst-uat:

  * Move a managed field to another section and the form follows, but its
    settings row keeps the section it was discovered in (``home_city`` /
    ``home_state`` read "Basic Details" while the form has them under "Address
    Information").

  * Delete a managed field and re-add it and it can vanish from the settings
    table for good. ``_auto_sync`` only forgets a ``synced_field_refs`` entry
    while the field is ABSENT from meta; deleting and re-adding from the Custom
    Doctype Fields UI never opens this form in between, so the entry survives,
    the fieldname reads as "already seen", and no row is ever built for it
    (``mba_specialization``, ``mba_or_pgdm_year_of_passing``).

So managed fields are re-placed from the live layout whenever their
configuration is saved. Only fieldnames the configuration actually lists are
touched; every other row stays exactly as curated.
"""

import frappe

SOURCE_DOCTYPE = "Job Applicant"
SETTINGS_DOCTYPE = "Job Applicant Profile Settings"
SETTINGS_ROW_DOCTYPE = "Job Opening Application Field"


def sync_managed_field_placement(doc, method=None):
	"""``Custom Doctype Fields.on_update`` — re-place this config's fields.

	Runs after the engine's own ``on_update``, so the Custom Fields are written
	and the doctype's meta cache is already cleared. Read uncached anyway: the
	whole point is the layout as it is NOW, and a stale copy would re-place every
	field into the section it just moved out of.

	Never allowed to fail the save. Getting the candidate-facing grouping wrong is
	a cosmetic problem; refusing to save the field configuration is not.
	"""
	if getattr(doc, "doc_type", None) != SOURCE_DOCTYPE:
		return

	try:
		from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
			ensure_fields_in_section,
			iter_profile_fields,
		)

		# Rows targeting a child table become columns on that child doctype and
		# never appear in the applicant profile, so they are not ours to place.
		managed = {
			row.field
			for row in (doc.get("fields") or [])
			if row.get("field") and not row.get("child_table")
		}
		if not managed:
			return

		by_section = {}
		meta_order = {}
		for df, section_label, _tab_label in iter_profile_fields(
			frappe.get_meta(SOURCE_DOCTYPE, cached=False)
		):
			meta_order[df.fieldname] = len(meta_order)
			if df.fieldname in managed:
				by_section.setdefault(section_label, []).append(df.fieldname)

		# Every managed field was skipped by iter_profile_fields (all hidden or
		# read-only). Nothing to place, so do not pay for the settings read below.
		if not by_section:
			return

		# Each ensure_fields_in_section call re-reads the settings single and
		# saves it, rewriting every child row. Saving the doctype's field
		# configuration is a routine edit, and most of them move nothing at all,
		# so the sections that already agree are filtered out first -- one read
		# here in place of a full save per section, every time.
		current = {
			row.reference_name: (row.section or "")
			for row in frappe.get_single(SETTINGS_DOCTYPE).default_application_fields
			if row.reference_name
		}

		# A managed field missing from by_section was skipped by
		# iter_profile_fields — it is hidden or read-only. Those are deliberately
		# not application fields, so leave them out rather than forcing a row.
		for section_label, fieldnames in by_section.items():
			if any(current.get(fn) != section_label for fn in fieldnames):
				ensure_fields_in_section(fieldnames, section_label)

		# Section alone is not placement. Ordering inside it comes from the row's
		# position in the settings table, and ensure_fields_in_section APPENDS —
		# so a field lands last, in creation order, wherever the form puts it.
		_reorder_to_layout(managed, meta_order)
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			f"recruitment: managed field placement not synced for {getattr(doc, 'name', '?')}",
		)


def forget_deleted_field(doc, method=None):
	"""``Custom Field.on_trash`` — drop the fieldname from ``synced_field_refs``.

	``synced_field_refs`` is what suppresses a re-import, and ``_auto_sync`` only
	prunes it on a load that happens to catch the field missing. Pruning at the
	moment of deletion makes it reliable instead of incidental, so a field of the
	same name created later is treated as new rather than as "already seen".

	The settings ROW is left for ``_auto_sync``'s dead-ref pass to remove — that
	already works, and removing it here would mean a second write.

	Deliberately writes with ``set_single_value``: calling ``save()`` on the
	settings single would bump its ``modified`` under an admin's open form and
	cost them a version conflict on their next save.
	"""
	if getattr(doc, "dt", None) != SOURCE_DOCTYPE or not getattr(doc, "fieldname", None):
		return

	try:
		raw = frappe.db.get_single_value(SETTINGS_DOCTYPE, "synced_field_refs")
		refs = {r.strip() for r in (raw or "").split("\n") if r.strip()}
		if doc.fieldname not in refs:
			return

		refs.discard(doc.fieldname)
		frappe.db.set_single_value(
			SETTINGS_DOCTYPE, "synced_field_refs", "\n".join(sorted(refs))
		)
	except Exception:
		# Never let profile bookkeeping block deleting a field.
		frappe.log_error(
			frappe.get_traceback(),
			f"recruitment: synced_field_refs not pruned for {getattr(doc, 'fieldname', '?')}",
		)


def _reorder_to_layout(managed, meta_order):
	"""Move managed rows to the position the Job Applicant layout gives them.

	The settings table's row order IS the default field order: a row's
	``display_order`` falls back to ``idx * ORDER_STEP`` (see
	``build_merged_application_fields``). A managed field appended at the end
	therefore renders last no matter where it sits on the form -- create
	``testing12`` directly after ``testing`` and it still shows up after
	``testing_1``, because that is the order the three were created in.

	Only managed rows move. Every other row keeps its position relative to the
	rest, so an order curated by hand is disturbed no more than it has to be.

	``idx`` is written per row with ``update_modified=False`` rather than saving
	the single: a save here would bump ``modified`` under an admin's open form
	and cost them a version conflict on their next save -- the same reason
	``_auto_sync`` backfills its rows this way.
	"""
	rows = frappe.get_single(SETTINGS_DOCTYPE).default_application_fields
	movable = {
		row.name
		for row in rows
		if row.name and row.reference_name in managed and row.reference_name in meta_order
	}
	if not movable:
		return

	ordered = [row for row in rows if row.name not in movable]

	# In layout order, so a run of managed fields keeps its own sequence: each
	# one is placed after every row that already precedes it on the form.
	for row in sorted(
		(r for r in rows if r.name in movable),
		key=lambda r: meta_order[r.reference_name],
	):
		target = meta_order[row.reference_name]
		pos = 0
		for i, other in enumerate(ordered):
			other_pos = meta_order.get(other.reference_name)
			if other_pos is not None and other_pos < target:
				pos = i + 1
		ordered.insert(pos, row)

	for idx, row in enumerate(ordered, start=1):
		if row.idx != idx:
			frappe.db.set_value(
				SETTINGS_ROW_DOCTYPE, row.name, "idx", idx, update_modified=False
			)
