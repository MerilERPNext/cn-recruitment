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
		self._sync_campus_invites()
		self._set_registration_defaults()
		self._set_round_codes()

	def _sync_campus_invites(self):
		"""Merge each linked Campus Invite's Institute and Job Openings into
		participating_institutes / linked_job_openings. Additive and idempotent:
		existing rows are kept and never duplicated, so this is safe to run on
		every save regardless of whether the client already fetched them."""
		if not self.campus_invites:
			return

		known_institutes = {row.institute for row in (self.participating_institutes or []) if row.institute}
		known_openings = {row.job_opening for row in (self.linked_job_openings or []) if row.job_opening}

		added = False
		for invite_row in self.campus_invites:
			if not invite_row.campus_invite:
				continue
			invite = frappe.get_doc("Campus Invite", invite_row.campus_invite)

			if invite.institute and invite.institute not in known_institutes:
				self.append("participating_institutes", {"institute": invite.institute})
				known_institutes.add(invite.institute)
				added = True

			for opening in invite.job_openings or []:
				if opening.job_opening and opening.job_opening not in known_openings:
					self.append("linked_job_openings", {"job_opening": opening.job_opening})
					known_openings.add(opening.job_opening)
					added = True

		# Link validation (which resolves fetch_from columns like Job Title /
		# Department) already ran before validate(), so re-run it for the rows we
		# just appended — otherwise their read-only columns stay blank until the
		# next save.
		if added:
			self._validate_links()

	def on_update(self):
		# Auto-generate the QR the first time the form is enabled. Refreshing is
		# manual (the "Generate QR Code" button) so the image isn't rebuilt on
		# every save. Best-effort: a QR failure must never block the save.
		if self.registration_form_enabled and not self.registration_form_qr_code:
			try:
				self._write_registration_qr(self._registration_url())
			except Exception:
				frappe.log_error(frappe.get_traceback(), "Campus Drive: QR auto-generate failed")

	def _validate_drive_window(self):
		if self.drive_start_date and self.drive_end_date:
			if self.drive_end_date < self.drive_start_date:
				frappe.throw(_("Drive Window End cannot be before Drive Window Start."))

	def _set_registration_defaults(self):
		if not self.registration_form_enabled:
			return
		if not self.registration_form_title:
			self.registration_form_title = self.drive_name
		# The QR code and the Registration Link both point candidates at the public
		# email-verification page. Keep the link field in sync with the current site
		# URL so it always reflects a working address.
		self.registration_form_link = self._registration_url()

	def _set_round_codes(self):
		for index, row in enumerate(self.rounds or [], start=1):
			row.round_code = f"R{index}"
			# Keep the panel / GD-grouping flags in sync with the round type so the
			# portal knows which round cards render a Panel / GD Groups block.
			row.requires_panel = 1 if row.round_type in PANEL_ROUND_TYPES else 0
			row.requires_gd_grouping = 1 if row.round_type in GD_ROUND_TYPES else 0

	# ------------------------------------------------------------------
	# Registration QR code
	# ------------------------------------------------------------------

	def _registration_url(self):
		"""Public URL the QR code encodes and registration_form_link stores: the
		candidate email-verification page, tagged with this drive so scans are
		traceable back to the drive they came from."""
		from urllib.parse import quote

		from frappe.utils import get_url

		return get_url(f"/verify_email?drive={quote(self.name)}")

	@frappe.whitelist()
	def generate_registration_qr(self):
		"""Button action: (re)build the QR image for the verification-page URL and
		store it in registration_form_qr_code. Also refreshes registration_form_link.
		Returns the encoded URL + file URL."""
		if not self.registration_form_enabled:
			frappe.throw(_("Enable the Campus Registration Form before generating a QR code."))
		url = self._registration_url()
		file_url = self._write_registration_qr(url)
		self.db_set("registration_form_link", url)
		return {"registration_url": url, "file_url": file_url}

	def _write_registration_qr(self, url):
		"""Generate the QR PNG for `url`, replace any previous QR file, and point
		registration_form_qr_code at the new file."""
		from frappe.utils.file_manager import save_file

		self._clear_existing_qr()
		content = _qr_png_bytes(url)
		saved = save_file(
			f"campus-qr-{self.name}.png",
			content,
			self.doctype,
			self.name,
			df="registration_form_qr_code",
			is_private=0,
		)
		self.db_set("registration_form_qr_code", saved.file_url)
		return saved.file_url

	def _clear_existing_qr(self):
		"""Drop the previously attached QR file(s) so we never pile up stale images."""
		stale = frappe.get_all(
			"File",
			filters={
				"attached_to_doctype": self.doctype,
				"attached_to_name": self.name,
				"attached_to_field": "registration_form_qr_code",
			},
			pluck="name",
		)
		for name in stale:
			frappe.delete_doc("File", name, ignore_permissions=True, force=True)
		if self.registration_form_qr_code:
			self.db_set("registration_form_qr_code", None)


def _qr_png_bytes(data):
	"""Return PNG bytes of a QR code encoding `data` (pyqrcode + pypng)."""
	import pyqrcode
	from io import BytesIO

	buffer = BytesIO()
	pyqrcode.create(data, error="M").png(buffer, scale=6, quiet_zone=2)
	return buffer.getvalue()


@frappe.whitelist()
def get_campus_invite_details(campus_invite):
	"""Return the Institute and Job Openings of a Campus Invite so the client can
	instantly fetch them into the Campus Drive's institute / opening tables."""
	invite = frappe.get_doc("Campus Invite", campus_invite)
	return {
		"institute": invite.institute,
		"job_openings": [row.job_opening for row in (invite.job_openings or []) if row.job_opening],
	}
