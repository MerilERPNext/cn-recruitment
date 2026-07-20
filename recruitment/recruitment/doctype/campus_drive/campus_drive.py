import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.campus_helpers import validate_unique_job_openings

# Round types that need an interview panel / GD grouping in the reference portal.
PANEL_ROUND_TYPES = {"Group Discussion", "Technical", "HR"}
GD_ROUND_TYPES = {"Group Discussion"}


class CampusDrive(Document):
	def validate(self):
		self.drive_id = self.name
		self._validate_drive_window()
		self._sync_campus_invites()
		validate_unique_job_openings(self, table_fieldname="linked_job_openings")
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

			# An invite can carry several institutes — bring them all in.
			for institute_row in invite.institutes or []:
				if institute_row.institute and institute_row.institute not in known_institutes:
					self.append("participating_institutes", {"institute": institute_row.institute})
					known_institutes.add(institute_row.institute)
					added = True

			for opening in invite.job_openings or []:
				if opening.job_opening and opening.job_opening not in known_openings:
					# Set the read-only fetch_from columns explicitly — fetch_from only
					# resolves on interactive link change, not when rows are appended
					# programmatically like this, so Job Title etc. would otherwise stay
					# blank in the invite-driven flow.
					jo = frappe.db.get_value(
						"Job Opening",
						opening.job_opening,
						["job_title", "department", "employment_type", "location",
						 "planned_vacancies", "vacancies"],
						as_dict=True,
					) or {}
					self.append("linked_job_openings", {
						"job_opening": opening.job_opening,
						"job_title": jo.get("job_title"),
						"department": jo.get("department"),
						"employment_type": jo.get("employment_type"),
						"location": jo.get("location"),
						"planned_hire_count": jo.get("planned_vacancies"),
						"total_open_positions": jo.get("vacancies"),
					})
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
	"""Return the Institutes and Job Openings of a Campus Invite so the client can
	instantly fetch them into the Campus Drive's institute / opening tables."""
	invite = frappe.get_doc("Campus Invite", campus_invite)
	openings = []
	for row in (invite.job_openings or []):
		if not row.job_opening:
			continue
		openings.append({
			"job_opening": row.job_opening,
			"job_title": frappe.db.get_value("Job Opening", row.job_opening, "job_title"),
		})
	return {
		# An invite can carry several institutes.
		"institutes": [row.institute for row in (invite.institutes or []) if row.institute],
		"job_openings": openings,
	}


SHORTLISTED_STATUS = "Shortlisted"
HOLD_STATUS = "Hold"


@frappe.whitelist()
def get_institute_breakdown(campus_drive):
	"""Institute- and opening-wise candidate counts for a Campus Drive, scoped to the
	campus invites selected on that drive.

	An invite carries several institutes AND several job openings; a candidate at an
	institute may apply to any (or several) of those openings. So for every selected
	Campus Invite we list its institutes and, under each, a row per invite opening with
	Applied / Shortlisted / On Hold counts. Applicants carry `custom_campus_invite` +
	`custom_institute` + `job_title` (the opening), which is what pins each application
	to one invite + institute + opening. Returns:
	    {"summary": {...},
	     "invites": [ {invite, institutes:[ {institute, openings:[{...counts}]} ]}, ...]}
	"""
	invite_names = frappe.get_all(
		"Campus Drive Invite",
		filters={"parenttype": "Campus Drive", "parent": campus_drive},
		pluck="campus_invite",
		order_by="idx asc",
	)
	invite_names = [i for i in dict.fromkeys(invite_names) if i]
	summary = {"invites": 0, "institutes": 0, "openings": 0,
	           "applied": 0, "shortlisted": 0, "hold": 0}
	if not invite_names:
		return {"summary": summary, "invites": []}

	invites = frappe.get_all(
		"Campus Invite",
		filters={"name": ["in", invite_names]},
		fields=["name", "campus_invite_name", "status", "region"],
	)
	invites.sort(key=lambda i: invite_names.index(i.name))

	region_ids = list({i.region for i in invites if i.region})
	region_label = {
		r.name: r.location_region
		for r in frappe.get_all("Region", filters={"name": ["in", region_ids]},
		                        fields=["name", "location_region"])
	} if region_ids else {}

	# Institutes per invite
	inst_map = {}
	for row in frappe.get_all(
		"Campus Invite Institute",
		filters={"parenttype": "Campus Invite", "parent": ["in", invite_names]},
		fields=["parent", "institute"],
		order_by="idx asc",
	):
		bucket = inst_map.setdefault(row.parent, [])
		if row.institute and row.institute not in bucket:
			bucket.append(row.institute)

	# Openings per invite
	opening_map = {}
	for row in frappe.get_all(
		"Campus Invite Job Opening",
		filters={"parenttype": "Campus Invite", "parent": ["in", invite_names]},
		fields=["parent", "job_opening"],
		order_by="idx asc",
	):
		bucket = opening_map.setdefault(row.parent, [])
		if row.job_opening and row.job_opening not in bucket:
			bucket.append(row.job_opening)

	all_insts = list({i for lst in inst_map.values() for i in lst})
	inst_name = {
		r.name: r.institute_name
		for r in frappe.get_all("Institute", filters={"name": ["in", all_insts]},
		                        fields=["name", "institute_name"])
	} if all_insts else {}

	all_ops = list({o for lst in opening_map.values() for o in lst})
	op_title = {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", all_ops]},
		                        fields=["name", "job_title"])
	} if all_ops else {}

	# Counts by invite + institute + opening (job_title) + status
	agg = {}
	for c in frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invite_names]},
		fields=["custom_campus_invite as invite", "custom_institute as institute",
		        "job_title as opening", "status", "count(name) as cnt"],
		group_by="custom_campus_invite, custom_institute, job_title, status",
	):
		if not c.institute:
			continue
		d = (agg.setdefault(c.invite, {})
		        .setdefault(c.institute, {})
		        .setdefault(c.opening, {"applied": 0, "shortlisted": 0, "hold": 0}))
		d["applied"] += c.cnt
		if c.status == SHORTLISTED_STATUS:
			d["shortlisted"] += c.cnt
		elif c.status == HOLD_STATUS:
			d["hold"] += c.cnt

	out = []
	for i in invites:
		insts = inst_map.get(i.name, [])
		ops = opening_map.get(i.name, [])
		inst_cards, inv_app, inv_sl, inv_hold = [], 0, 0, 0
		for inst in insts:
			op_cards, t_app, t_sl, t_hold = [], 0, 0, 0
			for op in ops:
				d = agg.get(i.name, {}).get(inst, {}).get(
					op, {"applied": 0, "shortlisted": 0, "hold": 0})
				op_cards.append({
					"job_opening": op,
					"job_title": op_title.get(op, op),
					"applied": d["applied"], "shortlisted": d["shortlisted"], "hold": d["hold"],
				})
				t_app += d["applied"]; t_sl += d["shortlisted"]; t_hold += d["hold"]
			inst_cards.append({
				"institute": inst,
				"institute_name": inst_name.get(inst, inst),
				"applied": t_app, "shortlisted": t_sl, "hold": t_hold,
				"openings": op_cards,
			})
			inv_app += t_app; inv_sl += t_sl; inv_hold += t_hold
		out.append({
			"invite": i.name,
			"invite_name": i.campus_invite_name or i.name,
			"region_label": region_label.get(i.region, i.region or "—"),
			"status": i.status or "—",
			"total_institutes": len(insts),
			"total_openings": len(ops),
			"total_applied": inv_app, "total_shortlisted": inv_sl, "total_hold": inv_hold,
			"institutes": inst_cards,
		})
		summary["institutes"] += len(insts)
		summary["openings"] += len(ops)
		summary["applied"] += inv_app
		summary["shortlisted"] += inv_sl
		summary["hold"] += inv_hold
	summary["invites"] = len(invites)

	return {"summary": summary, "invites": out}
