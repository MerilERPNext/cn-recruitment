"""Job Applicant Profile Settings — holds the default application-field
configuration that every new Job Opening inherits."""

import json

import frappe
from frappe.model.document import Document


# Job Applicant field types we DON'T want to expose in the applicant profile
# (layout fields, computed/system fields, etc.)
NON_DATA_FIELDTYPES = {
	"Section Break",
	"Column Break",
	"Tab Break",
	"HTML",
	"Heading",
	"Image",
	"Button",
	"Read Only",
}

# Whole Job Applicant tabs that are internal HR-process surfaces, not anything a
# candidate ever fills on an application form. Every field under one of these
# tabs is permanently kept out of the applicant-profile config. Add tab labels
# here to exclude more internal areas.
EXCLUDED_TABS = {
	"Feedback",  # PIP, induction/onboarding feedback, goal-setting, performance
}

TABLE_FIELDTYPES = {"Table", "Table MultiSelect"}


def _init_child_field_config(child_doctype):
	"""Build the default child_field_config JSON for a Table/Table MultiSelect field.
	All child fields start with every channel VIEW enabled (mirrors current show-all behaviour)."""
	if not child_doctype:
		return ""
	try:
		cmeta = frappe.get_meta(child_doctype)
		config = {}
		for cf in cmeta.fields:
			if (
				not cf.fieldname
				or cf.fieldtype in NON_DATA_FIELDTYPES
				or cf.hidden
				or cf.read_only
			):
				continue
			config[cf.fieldname] = {
				"label": cf.label or cf.fieldname,
				"view_careers": 1,      "mandatory_careers": 0,
				"view_ijp": 1,          "mandatory_ijp": 0,
				"view_refer": 1,        "mandatory_refer": 0,
				"view_campus": 1,       "mandatory_campus": 0,
				"view_preoffer": 1,     "mandatory_preoffer": 0,
			}
		return json.dumps(config) if config else ""
	except Exception:
		return ""


def iter_profile_fields(meta):
	"""Yield ``(docfield, section_label, tab_label)`` for every Job Applicant field
	eligible for the applicant-profile config, in meta order.

	This is the single source of truth for how fields group into sections
	(section-break label → tab label → "General"). Both the settings-table build
	(`_auto_sync`) and section-based field placement (field_flow_sync) read from
	it, so "which section a field belongs to" can never be computed two ways.

	Skips exactly what the config never lists: layout fieldtypes, hidden/read-only
	fields, and everything inside a hidden section.
	"""
	current_tab = ""
	current_section = ""
	section_skipped = False
	for f in meta.fields:
		if f.fieldtype == "Tab Break":
			# New tab: its label is the grouping fallback for fields sitting
			# directly under it or under unlabelled sections.
			current_tab = (f.label or "").strip()
			current_section = ""
			section_skipped = False
			continue
		if f.fieldtype == "Section Break":
			if f.hidden:
				# Hidden section: drop it and everything inside.
				current_section = ""
				section_skipped = True
			elif f.label and f.label.strip():
				current_section = f.label.strip()
				section_skipped = False
			else:
				# Visible but unlabelled (e.g. a mirrored layout section): keep the
				# previous labelled section rather than discarding its fields.
				section_skipped = False
			continue

		if section_skipped:
			continue
		if f.fieldtype in NON_DATA_FIELDTYPES:
			continue
		if not f.fieldname or f.hidden or f.read_only:
			continue

		yield f, (current_section or current_tab or "General"), current_tab


def build_default_row(reference_name, display_name, fieldtype, section, child_field_config=""):
	"""A default application-field row: surfaced but with every channel View OFF,
	so it is available to enable yet stays invisible to candidates until an admin
	turns it on. Shared by the meta reconcile (`_auto_sync`) and explicit
	section placement (`ensure_fields_in_section`) so both build rows identically.
	"""
	return {
		"section": section or "General",
		"reference_name": reference_name,
		"display_name": display_name or reference_name,
		"fieldtype": fieldtype or "",
		"child_field_config": child_field_config or "",
		"view_careers": 0, "mandatory_careers": 0,
		"view_ijp": 0, "mandatory_ijp": 0,
		"view_refer": 0, "mandatory_refer": 0,
		"view_campus": 0, "mandatory_campus": 0,
		"view_preoffer": 0, "mandatory_preoffer": 0,
		"ctq_flag": 0,
		"visibility": "All",
		"editability": "Editable",
		"preoffer_visibility": "Same as visibility",
		"preoffer_edit_approve": "Editable",
	}


def ensure_fields_in_section(fieldnames, section):
	"""Ensure each Job Applicant field sits under ``section`` in the settings table.

	The settings sections are a *curated* layer: ``_auto_sync`` groups newly
	discovered fields by the live doctype layout but never re-groups existing
	rows, so an admin's sections (and their labels) can legitimately differ from
	the current meta. When a field is added through the dialog with a chosen
	section, that choice is honoured directly here — assigning the row's section
	rather than recomputing it from meta (which may not even contain that label).

	Fields are also recorded in ``synced_field_refs`` so ``_auto_sync`` treats
	them as already handled and never adds a second, meta-grouped row.
	"""
	section = (section or "").strip() or "General"
	fieldnames = [fn for fn in fieldnames if fn]
	if not fieldnames:
		return

	settings = frappe.get_single("Job Applicant Profile Settings")
	meta = frappe.get_meta("Job Applicant")
	by_ref = {r.reference_name: r for r in settings.default_application_fields if r.reference_name}

	for fn in fieldnames:
		df = meta.get_field(fn)
		if not df:
			continue
		child_cfg = _init_child_field_config(df.options) if df.fieldtype in TABLE_FIELDTYPES else ""
		row = by_ref.get(fn)
		if row:
			row.section = section
			if not row.display_name:
				row.display_name = df.label or fn
			if not row.fieldtype:
				row.fieldtype = df.fieldtype
			if not row.child_field_config and child_cfg:
				row.child_field_config = child_cfg
		else:
			settings.append(
				"default_application_fields",
				build_default_row(fn, df.label or fn, df.fieldtype, section, child_cfg),
			)

	synced = {r.strip() for r in (settings.synced_field_refs or "").split("\n") if r.strip()}
	synced |= set(fieldnames)
	settings.synced_field_refs = "\n".join(sorted(synced))
	settings.save(ignore_permissions=True)


class JobApplicantProfileSettings(Document):
	"""Singleton holding default applicant-profile rows.

	Reconciles with the Job Applicant doctype on load via _auto_sync, but only
	the first sync of an empty table bulk-imports; afterwards the list is the
	admin's curated set and new doctype fields are recorded-but-not-added.
	"""

	def onload(self):
		self._auto_sync()

	def _auto_sync(self):
		"""Idempotently reconcile the table with the Job Applicant doctype.

		Every eligible Job Applicant field is surfaced in the config table so the
		admin has one place to enable/disable anything per channel. Newly imported
		fields land with ALL channel View boxes OFF (view_careers/ijp/refer/preoffer
		= 0), so they never reach a candidate form until the admin turns them on —
		the channel forms only render view_<channel>=1 rows. Existing rows are left
		exactly as configured.

		A field is kept OUT of the table only when it is:
		  - inside a hidden section (the whole section is dropped)
		  - hidden / read-only / no fieldname / a layout fieldtype
		  - under an EXCLUDED_TABS tab (e.g. "Feedback": PIP, induction/onboarding
		    feedback, goals) — internal process data, never an application field
		  - already tracked in synced_field_refs (so manual deletes stay deleted)

		Every kept-out ref is still written to synced_field_refs, so the decision is
		durable: after the first reconcile each subsequent load is a no-op (no
		fragile save-on-every-open) and the Settings form and Job Opening form
		always render the exact same set.

		Reconciliation runs BOTH ways: a field that no longer exists on Job
		Applicant (a custom field the admin deleted) is dropped from the table and
		from synced_field_refs, so it disappears from this form and the Job
		Opening's Application Fields — and re-creating a field of the same name
		surfaces it again as a fresh row rather than being suppressed as an old
		"already seen" ref.
		"""
		existing_refs = {row.reference_name for row in self.default_application_fields if row.reference_name}
		synced_refs = {
			r.strip() for r in (self.synced_field_refs or "").split("\n") if r.strip()
		}
		# Anything we've ever seen is off-limits to re-import. existing keeps the table consistent;
		# synced keeps deletes (and deliberate skips) sticky.
		seen = existing_refs | synced_refs

		meta = frappe.get_meta("Job Applicant")

		added_refs = []     # newly imported into the table (channels off by default)
		recorded_refs = []  # kept out (excluded tab), but snapshotted so it sticks
		for f, section_label, tab_label in iter_profile_fields(meta):
			is_custom = bool(f.get("is_custom_field"))
			in_excluded_tab = tab_label in EXCLUDED_TABS

			if f.fieldname in seen:
				# Re-surface a user-added custom field we previously kept out only
				# because of its tab: it never reached the table, so this is our own
				# exclusion to undo — not a deliberate delete to respect. (A field
				# already in the table, or a built-in one, stays as-is.)
				resurface = is_custom and in_excluded_tab and f.fieldname not in existing_refs
				if not resurface:
					continue

			# Built-in fields under an internal-process tab are never application
			# fields — keep them out (recorded so it sticks). A user-added custom
			# field is a deliberate addition, so surface it wherever it lives.
			if in_excluded_tab and not is_custom:
				recorded_refs.append(f.fieldname)
				continue

			# Eligible and never seen: surface it with every channel View OFF, so
			# it's available to enable but invisible to candidates until then.
			self.append("default_application_fields", build_default_row(
				f.fieldname,
				f.label or f.fieldname,
				f.fieldtype,
				section_label,
				_init_child_field_config(f.options) if f.fieldtype in TABLE_FIELDTYPES else "",
			))
			added_refs.append(f.fieldname)

		meta_lookup = {f.fieldname: f for f in meta.fields if f.fieldname}

		# Drop rows for fields that no longer exist on Job Applicant. A deleted
		# custom field leaves its config row behind, and every consumer keys off
		# `reference_name` — so without this the field keeps rendering here and on
		# the Job Opening's Application Fields long after the field itself is gone.
		dead_refs = {
			row.reference_name
			for row in self.default_application_fields
			if row.reference_name and row.reference_name not in meta_lookup
		}
		if dead_refs:
			self.default_application_fields = [
				row for row in self.default_application_fields
				if row.reference_name not in dead_refs
			]
			for idx, row in enumerate(self.default_application_fields, start=1):
				row.idx = idx

		# Forget every snapshotted ref whose field is gone — including ones that
		# never made it into the table. synced_field_refs is what suppresses a
		# re-import, so a ref left behind here would keep a re-created field of the
		# same name permanently invisible. Refs that still exist in meta stay put:
		# that's what makes a manual delete (or a Feedback-tab skip) stick.
		stale_synced_refs = {ref for ref in synced_refs if ref not in meta_lookup}
		synced_refs -= dead_refs | stale_synced_refs

		# Backfill fieldtype / child_field_config on existing rows that predate this feature.
		# Use frappe.db.set_value with update_modified=False so this NEVER touches the
		# document's `modified` timestamp. Calling self.save() here (even once) bumps
		# `modified` in the DB while the client holds the old value, causing a version
		# conflict the next time the user tries to save their own changes.
		for row in self.default_application_fields:
			ref = row.reference_name
			if not ref or ref not in meta_lookup:
				continue
			mf = meta_lookup[ref]
			db_patch = {}
			if not row.fieldtype:
				row.fieldtype = mf.fieldtype
				db_patch["fieldtype"] = mf.fieldtype
			if not row.child_field_config and mf.fieldtype in TABLE_FIELDTYPES:
				cfg = _init_child_field_config(mf.options)
				row.child_field_config = cfg
				db_patch["child_field_config"] = cfg
			if db_patch and row.name:
				try:
					frappe.db.set_value(
						"Job Opening Application Field", row.name, db_patch, update_modified=False
					)
				except Exception:
					pass  # Column may not exist yet if bench migrate hasn't run

		if added_refs or recorded_refs or dead_refs or stale_synced_refs:
			# Persist imports, deliberate skips AND removals so the next load is a
			# no-op and every decision (deletes, Feedback) sticks.
			all_refs = sorted(synced_refs | set(added_refs) | set(recorded_refs))
			self.synced_field_refs = "\n".join(all_refs)
			self.save(ignore_permissions=True)


@frappe.whitelist()
def get_job_applicant_profile_template(opening=None):
	"""Return the merged template the Job Opening form UI renders.

	For each Job Applicant field, we use:
	  - the opening's own row in custom_application_fields if present
	  - otherwise the matching row from Job Applicant Profile Settings

	Rows whose field no longer exists on Job Applicant are dropped. _auto_sync
	prunes them for good, but only when an admin opens the Settings form — until
	then a just-deleted custom field would still render on every Job Opening.
	"""
	settings = frappe.get_single("Job Applicant Profile Settings")
	# _auto_sync() is intentionally NOT called here. It saves the document,
	# which updates `modified` in the DB while the Settings form client still
	# holds the old timestamp — causing a version conflict on the user's next
	# Save. Sync runs in onload() when the admin opens the Settings form.
	live_fields = {df.fieldname for df in frappe.get_meta("Job Applicant").fields if df.fieldname}
	defaults = {
		row.reference_name: row
		for row in settings.default_application_fields
		if row.reference_name and row.reference_name in live_fields
	}

	overrides = {}
	if opening:
		# Read ONLY the override rows. frappe.get_doc("Job Opening", ...) would pull
		# the parent plus every one of its child tables (candidate list, hiring
		# stages, screener questions, posting channels, …) — 13 extra queries for a
		# table we don't touch, on a call that runs on every Job Opening form load
		# AND behind every candidate-facing channel form.
		overrides = {
			row.reference_name: row
			for row in frappe.get_all(
				"Job Opening Application Field",
				filters={
					"parent": opening,
					"parenttype": "Job Opening",
					"parentfield": "custom_application_fields",
				},
				fields=["*"],
				order_by="idx asc",
			)
			if row.reference_name
		}

	def pick(ref, attr, fallback=0):
		row = overrides.get(ref) or defaults.get(ref)
		return row.get(attr) if row else fallback

	sections_order = []
	rows = []
	for ref, def_row in defaults.items():
		section = def_row.section or "General"
		if section not in sections_order:
			sections_order.append(section)
		override_row = overrides.get(ref)
		rows.append({
			"section": section,
			"reference_name": ref,
			"display_name": pick(ref, "display_name") or ref,
			"fieldtype": def_row.get("fieldtype") or "",
			"child_field_config": (
				(override_row.get("child_field_config") if override_row and override_row.get("child_field_config") else None)
				or def_row.get("child_field_config")
				or ""
			),
			"view_careers": pick(ref, "view_careers"),
			"mandatory_careers": pick(ref, "mandatory_careers"),
			"view_ijp": pick(ref, "view_ijp"),
			"mandatory_ijp": pick(ref, "mandatory_ijp"),
			"view_refer": pick(ref, "view_refer"),
			"mandatory_refer": pick(ref, "mandatory_refer"),
			"view_campus": pick(ref, "view_campus"),
			"mandatory_campus": pick(ref, "mandatory_campus"),
			"view_preoffer": pick(ref, "view_preoffer"),
			"mandatory_preoffer": pick(ref, "mandatory_preoffer"),
			"ctq_flag": pick(ref, "ctq_flag"),
			"visibility": pick(ref, "visibility", "All") or "All",
			"editability": pick(ref, "editability", "Editable") or "Editable",
			"preoffer_visibility": pick(ref, "preoffer_visibility", "Same as visibility") or "Same as visibility",
			"preoffer_edit_approve": pick(ref, "preoffer_edit_approve", "Editable") or "Editable",
		})
	return {"sections": sections_order, "rows": rows}
