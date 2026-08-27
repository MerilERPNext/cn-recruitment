"""Job Applicant Profile Settings — holds the default application-field
configuration that every new Job Opening inherits."""

import json

import frappe
from frappe.model.document import Document
from frappe.utils import cint


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

# Spacing between consecutive settings positions in the merged template's
# `display_order`. The gaps are what a Job Opening drops a repositioned field
# into (see public/js/job_opening.js) — keep it in step with ORDER_STEP there.
ORDER_STEP = 1000


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


def _eligible_child_fields(child_doctype):
	"""Child docfields an admin may configure — the same rule _init_child_field_config
	seeds from: real input fields, nothing hidden or read-only."""
	if not child_doctype:
		return {}
	try:
		cmeta = frappe.get_meta(child_doctype)
	except Exception:
		return {}
	return {
		cf.fieldname: cf
		for cf in cmeta.fields
		if cf.fieldname
		and cf.fieldtype not in NON_DATA_FIELDTYPES
		and not cf.hidden
		and not cf.read_only
	}


def _sync_child_field_config(existing_raw, child_doctype):
	"""Reconcile a stored child_field_config against the child doctype as it is NOW.

	Without this the config is written once and then drifts forever: a child field
	later hidden keeps its row in the Child Fields grid, and one added later never
	appears at all.

	Existing entries for still-eligible fields keep the admin's toggles untouched;
	only the label is refreshed. Newly eligible fields are added with every channel
	VIEW off, matching how _auto_sync surfaces new parent fields. Returns the JSON
	string, or None when nothing changed (so callers can skip the write).
	"""
	eligible = _eligible_child_fields(child_doctype)
	if not eligible:
		return None

	try:
		existing = json.loads(existing_raw) if existing_raw else {}
	except Exception:
		existing = {}
	if not isinstance(existing, dict):
		existing = {}

	# Steady state is "already in sync", and this runs on every template read — bail
	# before rebuilding the dict and re-serialising it.
	if set(existing) == set(eligible) and all(
		(existing.get(fn) or {}).get("label") == (cf.label or fn)
		for fn, cf in eligible.items()
	):
		return None

	config = {}
	for fieldname, cf in eligible.items():
		entry = dict(existing.get(fieldname) or {})
		if entry:
			entry["label"] = cf.label or fieldname
		else:
			entry = {
				"label": cf.label or fieldname,
				"view_careers": 0,      "mandatory_careers": 0,
				"view_ijp": 0,          "mandatory_ijp": 0,
				"view_refer": 0,        "mandatory_refer": 0,
				"view_campus": 0,       "mandatory_campus": 0,
				"view_preoffer": 0,     "mandatory_preoffer": 0,
			}
		config[fieldname] = entry

	updated = json.dumps(config)
	return None if updated == (existing_raw or "") else updated


def _reconciled_child_config(applicant_meta, reference_name, fieldtype, stored_raw):
	"""child_field_config for the merged template, reconciled against the child
	doctype's current fields.

	Done on read as well as on write because the stored copy lives in two places —
	Job Applicant Profile Settings and each Job Opening's own override row — and only
	the settings copy gets healed on load. Reconciling at this single choke point
	means every consumer (the Job Opening grid, the Settings grid, and all the
	channel forms) sees the same live list.
	"""
	if fieldtype not in TABLE_FIELDTYPES:
		return stored_raw
	df = applicant_meta.get_field(reference_name)
	if not df or not df.options:
		return stored_raw
	return _sync_child_field_config(stored_raw, df.options) or stored_raw


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
		"locked": 0,
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

	Only fields actually placed are recorded in ``synced_field_refs``, which is
	what tells ``_auto_sync`` to leave them alone. Recording one this ran past
	would bury it for good: it never reaches the table, and every later load then
	skips it as "already seen".
	"""
	section = (section or "").strip() or "General"
	fieldnames = [fn for fn in fieldnames if fn]
	if not fieldnames:
		return

	settings = frappe.get_single("Job Applicant Profile Settings")
	meta = frappe.get_meta("Job Applicant")

	# Fields created moments ago in this same request are not on the cached meta
	# yet, and that stale read is what used to drop them. Fetch just those from the
	# Custom Field table — one query, against the eight a full meta rebuild costs,
	# and none at all once the cache has caught up.
	unseen = [fn for fn in fieldnames if not meta.get_field(fn)]
	fresh = {}
	if unseen:
		fresh = {
			r.fieldname: r
			for r in frappe.get_all(
				"Custom Field",
				filters={"dt": "Job Applicant", "fieldname": ["in", unseen]},
				fields=["fieldname", "label", "fieldtype", "options"],
			)
		}

	by_ref = {r.reference_name: r for r in settings.default_application_fields if r.reference_name}

	placed = []
	for fn in fieldnames:
		df = meta.get_field(fn) or fresh.get(fn)
		if not df:
			continue
		placed.append(fn)
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

	missing = set(fieldnames) - set(placed)
	if missing:
		# Left unrecorded on purpose, so the next _auto_sync still surfaces them.
		frappe.log_error(
			"Not on Job Applicant: " + ", ".join(sorted(missing)),
			"Job Applicant Profile Settings: field placement skipped",
		)
	if not placed:
		# Saving here would only bump `modified` under an open form and cost the
		# admin a version conflict on their next save.
		return

	synced = {r.strip() for r in (settings.synced_field_refs or "").split("\n") if r.strip()}
	synced |= set(placed)
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
			if mf.fieldtype in TABLE_FIELDTYPES:
				if not row.child_field_config:
					cfg = _init_child_field_config(mf.options)
				else:
					# Re-reconcile every load, not just the first: the child doctype
					# keeps changing under a config that was previously written once
					# and never revisited.
					cfg = _sync_child_field_config(row.child_field_config, mf.options)
				if cfg:
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


def locked_field_refs():
	"""``{reference_name}`` frozen in Job Applicant Profile Settings.

	A locked field is configured once, centrally: every Job Opening shows it
	read-only and cannot override, reposition or remove it. The point is the
	mistake it prevents — a field that must be collected on every opening
	(Applicant Name, say) being switched off on one of them by accident.

	Read straight off the child table rather than through the Single: this runs on
	every Job Opening save and ``get_single`` would pull the whole settings
	document, including the education-stages table nothing here looks at.
	"""
	return set(frappe.get_all(
		"Job Opening Application Field",
		filters={
			"parenttype": "Job Applicant Profile Settings",
			"parentfield": "default_application_fields",
			"locked": 1,
		},
		pluck="reference_name",
		limit_page_length=0,
	))


def enforce_locked_fields(doc, method=None):
	"""Drop a Job Opening's overrides for locked fields (Job Opening ``validate``).

	The UI already renders those rows disabled, but a disabled control is not a
	rule: the override table is ordinary child data that the API, a Data Import or
	a stale form can all write. Locking has to hold at save time or it does not
	hold at all.

	The whole override row goes, not just the toggles — a locked field is frozen
	as a unit, placement and label included, so what every opening shows is
	exactly the settings row. An opening that had configured the field before it
	was locked therefore reverts to the central definition, which is what locking
	is for.
	"""
	rows = doc.get("custom_application_fields") or []
	if not rows:
		return

	locked = locked_field_refs()
	if not locked:
		return

	keep = [r for r in rows if r.reference_name not in locked]
	if len(keep) == len(rows):
		return

	dropped = sorted({r.reference_name for r in rows if r.reference_name in locked})
	doc.set("custom_application_fields", keep)
	frappe.logger("recruitment").info(
		f"Job Opening {doc.name or '(new)'}: discarded overrides for locked application "
		f"field(s) {', '.join(dropped)}."
	)


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
	applicant_meta = frappe.get_meta("Job Applicant")
	live_fields = {df.fieldname for df in applicant_meta.fields if df.fieldname}
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

	rows = []
	for ref, def_row in defaults.items():
		override_row = overrides.get(ref)
		# Placement is per-opening: the opening's own row carries the section it was
		# dragged into and its position within that section. Neither is set until
		# someone moves the field on this opening, so the settings placement is what
		# every untouched field keeps.
		section = (
			(override_row.get("section") if override_row else None)
			or def_row.section
			or "General"
		)
		# Placement key. Settings positions are spaced ORDER_STEP apart so a field
		# moved on this opening can be given a value BETWEEN two others — that is
		# what lets an opening reposition one field without having to restate the
		# position (and therefore the whole configuration) of every other field.
		override_order = cint(override_row.get("display_order")) if override_row else 0
		rows.append({
			"display_order": override_order or (cint(def_row.idx) * ORDER_STEP),
			"_default_order": cint(def_row.idx),
			"section": section,
			"reference_name": ref,
			"display_name": pick(ref, "display_name") or ref,
			"fieldtype": def_row.get("fieldtype") or "",
			"child_field_config": _reconciled_child_config(
				applicant_meta,
				ref,
				def_row.get("fieldtype") or "",
				(override_row.get("child_field_config") if override_row and override_row.get("child_field_config") else None)
				or def_row.get("child_field_config")
				or "",
			),
			# Deliberately `def_row`, not `pick`: locking is a settings decision and
			# an opening must not be able to unlock itself by carrying its own row.
			"locked": 1 if def_row.get("locked") else 0,
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

	# Row order IS the render order — the channel forms lay fields out in the order
	# they arrive here, grouped by section. A field the opening never repositioned
	# has no display_order of its own, so it falls back to its position in the
	# settings table and stays exactly where the defaults put it.
	rows.sort(key=lambda r: (r["display_order"], r["_default_order"]))

	sections_order = []
	for r in rows:
		r.pop("_default_order", None)
		if r["section"] not in sections_order:
			sections_order.append(r["section"])

	return {"sections": sections_order, "rows": rows}
