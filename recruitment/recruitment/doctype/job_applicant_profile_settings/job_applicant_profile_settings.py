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
		"""
		existing_refs = {row.reference_name for row in self.default_application_fields if row.reference_name}
		synced_refs = {
			r.strip() for r in (self.synced_field_refs or "").split("\n") if r.strip()
		}
		# Anything we've ever seen is off-limits to re-import. existing keeps the table consistent;
		# synced keeps deletes (and deliberate skips) sticky.
		seen = existing_refs | synced_refs

		meta = frappe.get_meta("Job Applicant")

		current_tab = ""
		current_section = ""
		current_section_skipped = False
		added_refs = []     # newly imported into the table (channels off by default)
		recorded_refs = []  # kept out (excluded tab), but snapshotted so it sticks
		for f in meta.fields:
			if f.fieldtype == "Tab Break":
				# New tab: its label is the grouping fallback for any fields that
				# sit directly under it / under unlabelled sections.
				current_tab = (f.label or "").strip()
				current_section = ""
				current_section_skipped = False
				continue
			if f.fieldtype == "Section Break":
				if f.hidden:
					# Hidden section: drop it and everything inside.
					current_section = ""
					current_section_skipped = True
				elif f.label and f.label.strip():
					current_section = f.label.strip()
					current_section_skipped = False
				else:
					# Visible but unlabelled (e.g. a mirrored layout section):
					# keep its fields under the previous labelled section rather
					# than discarding them.
					current_section_skipped = False
				continue

			if current_section_skipped:
				continue
			if f.fieldtype in NON_DATA_FIELDTYPES:
				continue
			if not f.fieldname or f.hidden or f.read_only:
				continue
			if f.fieldname in seen:
				continue

			# Internal-process tabs are never application fields: keep them out
			# of the table entirely, but record them so they stay out.
			if current_tab in EXCLUDED_TABS:
				recorded_refs.append(f.fieldname)
				continue

			# Eligible and never seen: surface it with every channel View OFF, so
			# it's available to enable but invisible to candidates until then.
			# (The child doctype defaults view_careers/view_ijp to 1, so the zeros
			# below must be explicit.)
			self.append("default_application_fields", {
				"section": current_section or current_tab or "General",
				"reference_name": f.fieldname,
				"display_name": f.label or f.fieldname,
				"fieldtype": f.fieldtype,
				"child_field_config": (
					_init_child_field_config(f.options) if f.fieldtype in TABLE_FIELDTYPES else ""
				),
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
			})
			added_refs.append(f.fieldname)

		# Backfill fieldtype / child_field_config on existing rows that predate this feature.
		# Use frappe.db.set_value with update_modified=False so this NEVER touches the
		# document's `modified` timestamp. Calling self.save() here (even once) bumps
		# `modified` in the DB while the client holds the old value, causing a version
		# conflict the next time the user tries to save their own changes.
		meta_lookup = {f.fieldname: f for f in meta.fields if f.fieldname}
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

		if added_refs or recorded_refs:
			# Persist imports AND deliberate skips so the next load is a no-op and
			# every exclusion (deletes, Feedback) sticks.
			all_refs = sorted(synced_refs | set(added_refs) | set(recorded_refs))
			self.synced_field_refs = "\n".join(all_refs)
			self.save(ignore_permissions=True)


@frappe.whitelist()
def get_job_applicant_profile_template(opening=None):
	"""Return the merged template the Job Opening form UI renders.

	For each Job Applicant field, we use:
	  - the opening's own row in custom_application_fields if present
	  - otherwise the matching row from Job Applicant Profile Settings
	"""
	settings = frappe.get_single("Job Applicant Profile Settings")
	# _auto_sync() is intentionally NOT called here. It saves the document,
	# which updates `modified` in the DB while the Settings form client still
	# holds the old timestamp — causing a version conflict on the user's next
	# Save. Sync runs in onload() when the admin opens the Settings form.
	defaults = {row.reference_name: row for row in settings.default_application_fields if row.reference_name}

	overrides = {}
	if opening:
		op = frappe.get_doc("Job Opening", opening)
		overrides = {row.reference_name: row for row in op.custom_application_fields if row.reference_name}

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
