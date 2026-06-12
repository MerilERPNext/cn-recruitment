"""Job Applicant Profile Settings — holds the default application-field
configuration that every new Job Opening inherits."""

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
				"view_careers": 0, "mandatory_careers": 0,
				"view_ijp": 0, "mandatory_ijp": 0,
				"view_refer": 0, "mandatory_refer": 0,
				"view_preoffer": 0, "mandatory_preoffer": 0,
				"ctq_flag": 0,
				"visibility": "All",
				"editability": "Editable",
				"preoffer_visibility": "Same as visibility",
				"preoffer_edit_approve": "Editable",
			})
			added_refs.append(f.fieldname)

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
	# onload only fires for the desk form view. Reconcile here too so the Job
	# Opening form and the Settings form can never drift apart. _auto_sync is
	# idempotent and only writes when something actually changed, so after the
	# first reconcile this is a cheap no-op.
	settings._auto_sync()
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
		rows.append({
			"section": section,
			"reference_name": ref,
			"display_name": def_row.display_name or ref,
			"view_careers": pick(ref, "view_careers"),
			"mandatory_careers": pick(ref, "mandatory_careers"),
			"view_ijp": pick(ref, "view_ijp"),
			"mandatory_ijp": pick(ref, "mandatory_ijp"),
			"view_refer": pick(ref, "view_refer"),
			"mandatory_refer": pick(ref, "mandatory_refer"),
			"view_preoffer": pick(ref, "view_preoffer"),
			"mandatory_preoffer": pick(ref, "mandatory_preoffer"),
			"ctq_flag": pick(ref, "ctq_flag"),
			"visibility": pick(ref, "visibility", "All") or "All",
			"editability": pick(ref, "editability", "Editable") or "Editable",
			"preoffer_visibility": pick(ref, "preoffer_visibility", "Same as visibility") or "Same as visibility",
			"preoffer_edit_approve": pick(ref, "preoffer_edit_approve", "Editable") or "Editable",
		})
	return {"sections": sections_order, "rows": rows}
