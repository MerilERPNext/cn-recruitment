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


class JobApplicantProfileSettings(Document):
	"""Singleton holding default applicant-profile rows.

	Auto-syncs on every load: any new Job Applicant fields are appended to the
	table so admins always see the current set without clicking anything.
	"""

	def onload(self):
		self._auto_sync()

	def _auto_sync(self):
		"""Idempotently import Job Applicant fields. Skips:
		  - hidden sections (and all fields inside)
		  - hidden / read-only / no-fieldname fields
		  - layout fieldtypes (Section/Column/Tab Break, HTML, Heading, Button, etc.)
		  - refs that are already tracked in synced_field_refs (deleted refs stay deleted)
		"""
		existing_refs = {row.reference_name for row in self.default_application_fields if row.reference_name}
		synced_refs = {
			r.strip() for r in (self.synced_field_refs or "").split("\n") if r.strip()
		}
		# Anything we've ever seen is off-limits to re-import. existing keeps the table consistent;
		# synced keeps deletes sticky.
		seen = existing_refs | synced_refs

		meta = frappe.get_meta("Job Applicant")

		current_tab = ""
		current_section = ""
		current_section_skipped = False
		added_refs = []
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

			self.append("default_application_fields", {
				"section": current_section or current_tab or "General",
				"reference_name": f.fieldname,
				"display_name": f.label or f.fieldname,
				"visibility": "All",
				"editability": "Editable",
				"preoffer_visibility": "Same as visibility",
				"preoffer_edit_approve": "Editable",
			})
			added_refs.append(f.fieldname)

		if added_refs:
			# Persist the discoveries to the tracker so deletes stick on next load.
			all_refs = sorted(synced_refs | set(added_refs))
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
	# onload only fires for the desk form view — when this method is called
	# from the Job Opening form, the table can be empty, so force the sync.
	if not settings.default_application_fields:
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
