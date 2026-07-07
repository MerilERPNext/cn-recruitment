import frappe
from frappe import _
from frappe.model.document import Document

# Round types that need an interview panel / GD grouping in the reference portal.
PANEL_ROUND_TYPES = {"Group Discussion", "Technical", "HR"}
GD_ROUND_TYPES = {"Group Discussion"}


class CampusDrive(Document):
	def validate(self):
		self.drive_id = self.name
		self._validate_drive_window()
		self._set_registration_defaults()
		self._set_registration_summary()
		self._set_round_codes()

	def _validate_drive_window(self):
		if self.drive_start_date and self.drive_end_date:
			if self.drive_end_date < self.drive_start_date:
				frappe.throw(_("Drive Window End cannot be before Drive Window Start."))

	def _set_registration_defaults(self):
		# The candidate apply URL is derived from the drive name by the portal,
		# so we never overwrite the user-entered marketing registration_link here.
		if self.registration_form_enabled and not self.registration_form_title:
			self.registration_form_title = self.drive_name

	def _set_registration_summary(self):
		active_fields = [row for row in (self.registration_fields or []) if row.enabled]
		self.form_field_count = len(active_fields)
		self.mandatory_field_count = len([row for row in active_fields if row.is_mandatory])
		self.tpo_verified_field_count = len([row for row in active_fields if row.tpo_verified])

	def _set_round_codes(self):
		for index, row in enumerate(self.rounds or [], start=1):
			row.round_code = f"R{index}"
			# Keep the panel / GD-grouping flags in sync with the round type so the
			# portal knows which round cards render a Panel / GD Groups block.
			row.requires_panel = 1 if row.round_type in PANEL_ROUND_TYPES else 0
			row.requires_gd_grouping = 1 if row.round_type in GD_ROUND_TYPES else 0
