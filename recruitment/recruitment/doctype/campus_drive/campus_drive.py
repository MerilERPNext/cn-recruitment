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


def _ja_status_options():
	"""Every status the Job Applicant status field offers, in its declared order."""
	df = frappe.get_meta("Job Applicant").get_field("status")
	return [s.strip() for s in (df.options or "").split("\n") if s and s.strip()]


@frappe.whitelist()
def get_drive_breakdown(campus_drive):
	"""Candidate counts for a Campus Drive, MERGED across the invites it selected.

	A drive merges its Campus Invites: once we're running the drive the institute a
	candidate came from no longer splits the pipeline — what matters is the ROLE
	(Job Opening). So counts roll up per opening across every institute and invite.
	The per-institute split is still returned under each opening so the UI can toggle
	into it on demand.

	Counts are reported for EVERY status on the Job Applicant status field (Draft,
	Open, Shortlisted, Interview, Hold, Approvals, Accepted, Rejected, ...), not just
	a fixed pair. Applicants carry custom_campus_invite + custom_institute + job_title.
	"""
	statuses = _ja_status_options()
	zero = lambda: {s: 0 for s in statuses}  # noqa: E731

	invite_names = frappe.get_all(
		"Campus Drive Invite",
		filters={"parenttype": "Campus Drive", "parent": campus_drive},
		pluck="campus_invite",
		order_by="idx asc",
	)
	invite_names = [i for i in dict.fromkeys(invite_names) if i]
	if not invite_names:
		return {
			"statuses": statuses, "invites": [], "openings": [],
			"summary": {"invites": 0, "institutes": 0, "openings": 0,
			            "total": 0, "by_status": zero()},
		}

	# invite -> institutes / openings
	inst_map, op_map = {}, {}
	for row in frappe.get_all(
		"Campus Invite Institute",
		filters={"parenttype": "Campus Invite", "parent": ["in", invite_names]},
		fields=["parent", "institute"], order_by="idx asc",
	):
		b = inst_map.setdefault(row.parent, [])
		if row.institute and row.institute not in b:
			b.append(row.institute)
	for row in frappe.get_all(
		"Campus Invite Job Opening",
		filters={"parenttype": "Campus Invite", "parent": ["in", invite_names]},
		fields=["parent", "job_opening"], order_by="idx asc",
	):
		b = op_map.setdefault(row.parent, [])
		if row.job_opening and row.job_opening not in b:
			b.append(row.job_opening)

	# opening -> institutes (union across every invite carrying that opening)
	opening_order, opening_institutes = [], {}
	for inv in invite_names:
		for op in op_map.get(inv, []):
			if op not in opening_institutes:
				opening_institutes[op] = []
				opening_order.append(op)
			for inst in inst_map.get(inv, []):
				if inst not in opening_institutes[op]:
					opening_institutes[op].append(inst)

	all_insts = list({i for lst in inst_map.values() for i in lst})
	inst_name = {
		r.name: r.institute_name
		for r in frappe.get_all("Institute", filters={"name": ["in", all_insts]},
		                        fields=["name", "institute_name"])
	} if all_insts else {}
	op_title = {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", opening_order]},
		                        fields=["name", "job_title"])
	} if opening_order else {}

	# counts: opening -> institute -> status
	agg = {}
	for c in frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invite_names]},
		fields=["job_title as opening", "custom_institute as institute",
		        "status", "count(name) as cnt"],
		group_by="job_title, custom_institute, status",
	):
		if not c.opening:
			continue
		by_status = agg.setdefault(c.opening, {}).setdefault(c.institute or "", {})
		by_status[c.status] = by_status.get(c.status, 0) + c.cnt

	openings_out = []
	drive_by_status, grand_total = zero(), 0
	for op in opening_order:
		op_counts = agg.get(op, {})
		listed = opening_institutes.get(op, [])
		merged, op_total, inst_out = zero(), 0, []

		for inst in listed:
			st_map = op_counts.get(inst, {})
			bys, tot = zero(), 0
			for s, n in st_map.items():
				if s in bys:
					bys[s] += n
				tot += n
			inst_out.append({
				"institute": inst,
				"institute_name": inst_name.get(inst, inst),
				"total": tot, "by_status": bys,
			})
			for s in statuses:
				merged[s] += bys[s]
			op_total += tot

		# Applicants whose institute isn't one the invites listed (defensive) still
		# count toward the merged role totals, they just get no institute row.
		for inst, st_map in op_counts.items():
			if inst in listed:
				continue
			for s, n in st_map.items():
				if s in merged:
					merged[s] += n
				op_total += n

		openings_out.append({
			"job_opening": op, "job_title": op_title.get(op, op),
			"total": op_total, "by_status": merged, "institutes": inst_out,
		})
		for s in statuses:
			drive_by_status[s] += merged[s]
		grand_total += op_total

	return {
		"statuses": statuses,
		"invites": invite_names,
		"openings": openings_out,
		"summary": {
			"invites": len(invite_names),
			"institutes": len(all_insts),
			"openings": len(opening_order),
			"total": grand_total,
			"by_status": drive_by_status,
		},
	}


# ---------------------------------------------------------------------------
# Group Discussion — automatic grouping
# ---------------------------------------------------------------------------

GD_POOL_STATUS = "Shortlisted"
DEFAULT_GD_GROUP_SIZE = 5


def _balanced_group_sizes(total, size):
	"""Split `total` candidates into groups of about `size`, with NO undersized
	group left over: the remainder is spread one-per-group across the earliest
	groups (52 @ 5 -> two groups of 6 + eight of 5, not ten of 5 + one of 2).

	When there are fewer than 2*size candidates a single group is returned — the
	only case a group can exceed size+1, because splitting would leave a tiny one.
	"""
	if total <= 0:
		return []
	groups = max(1, total // size)
	base, extra = divmod(total, groups)
	return [base + 1] * extra + [base] * (groups - extra)


def _interleave_buckets(buckets):
	"""Deal round-robin across buckets, largest bucket first, so consecutive picks
	alternate between them and the big buckets spread evenly instead of clumping
	into the last groups."""
	order = sorted((list(v) for v in buckets.values()), key=len, reverse=True)
	out = []
	while any(order):
		for rows in order:
			if rows:
				out.append(rows.pop(0))
	return out


def _interleave_by_institute(candidates):
	"""Order candidates so consecutive slices mix colleges (each institute's own
	candidates are shuffled first)."""
	import random

	buckets = {}
	for c in candidates:
		buckets.setdefault(c.get("institute") or "", []).append(c)
	for rows in buckets.values():
		random.shuffle(rows)
	return _interleave_buckets(buckets)


def _interleave_roles_and_institutes(candidates):
	"""Order candidates so a slice mixes BOTH roles and colleges: each role's pool is
	institute-interleaved first, then the roles are dealt round-robin. With 30 RSM and
	30 CSM shortlisted, a group of 6 comes out ~3 RSM + 3 CSM."""
	by_role = {}
	for c in candidates:
		by_role.setdefault(c.get("job_opening") or "", []).append(c)
	return _interleave_buckets({r: _interleave_by_institute(rows) for r, rows in by_role.items()})


@frappe.whitelist()
def generate_gd_groups(campus_drive, round_code=None, group_size=None, split_by="drive"):
	"""Build Group Discussion groups for a drive and store them on the drive.

	Pool  : Shortlisted Job Applicants on the drive's campus invites.
	Split : ``"drive"`` (default) pools EVERY candidate on the drive together, so one
	        group can hold candidates from several roles (3 RSM + 3 CSM in a group of
	        6) — a GD panel judges communication, not the role. ``"role"`` instead
	        keeps each Job Opening in its own groups, for drives that run role-wise
	        panels; a candidate who applied to two roles is then grouped in each.
	Mix   : roles and institutes are dealt round-robin so a group spans both.
	Sizes : balanced, so no undersized group is left behind.

	Regenerating replaces the existing groups for that round only.
	"""
	doc = frappe.get_doc("Campus Drive", campus_drive)

	# --- resolve the GD round ---
	gd_rounds = [r for r in (doc.rounds or []) if r.requires_gd_grouping]
	if not gd_rounds:
		frappe.throw(_("Add a round of type <b>Group Discussion</b> before generating groups."))
	if round_code:
		row = next((r for r in gd_rounds if r.round_code == round_code), None)
		if not row:
			frappe.throw(_("No Group Discussion round with code {0} on this drive.").format(round_code))
	elif len(gd_rounds) == 1:
		row = gd_rounds[0]
	else:
		frappe.throw(
			_("This drive has {0} Group Discussion rounds — pick which one to group.").format(len(gd_rounds))
		)

	size = int(group_size or row.gd_group_size or DEFAULT_GD_GROUP_SIZE)
	if size < 2:
		frappe.throw(_("Group size must be at least 2."))
	code = row.round_code or "GD"
	# Remember the size actually used, so the round (and the UI's size box) reflects
	# the last generation instead of drifting back to the old stored value.
	row.gd_group_size = size

	# --- candidate pool: Shortlisted applicants on this drive's invites ---
	invite_names = [r.campus_invite for r in (doc.campus_invites or []) if r.campus_invite]
	invite_names = list(dict.fromkeys(invite_names))
	if not invite_names:
		frappe.throw(_("Add at least one Campus Invite to the drive first."))

	applicants = frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invite_names], "status": GD_POOL_STATUS},
		fields=["name", "applicant_name", "custom_institute as institute", "job_title as job_opening"],
		order_by="name asc",
	)
	if not applicants:
		frappe.throw(
			_("No {0} candidates found on this drive's campus invites.").format(frappe.bold(GD_POOL_STATUS))
		)

	by_role = {}
	for a in applicants:
		by_role.setdefault(a.job_opening or "", []).append(a)

	role_titles = {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", list(by_role)]},
		                        fields=["name", "job_title"])
	} if by_role else {}

	# One pool for the whole drive (default), or one pool per role.
	if split_by == "role":
		pools = [
			(role, role_titles.get(role, role), _interleave_by_institute(by_role[role]))
			for role in sorted(by_role, key=lambda r: role_titles.get(r, r) or "")
		]
	else:
		pools = [(None, _("All Roles"), _interleave_roles_and_institutes(applicants))]

	# Drop this round's previous groups; leave any other round's rows untouched.
	doc.set("gd_groups", [g for g in (doc.gd_groups or []) if g.round_code != code])
	doc.set("gd_group_members", [m for m in (doc.gd_group_members or []) if m.round_code != code])

	group_no, made_groups, made_members = 0, 0, 0
	for (role, role_title, ordered) in pools:
		cursor = 0
		for count in _balanced_group_sizes(len(ordered), size):
			group_no += 1
			group_name = f"Group {group_no}"
			members = ordered[cursor:cursor + count]
			cursor += count

			doc.append("gd_groups", {
				"round_code": code,
				"group_name": group_name,
				"job_opening": role or None,
				"job_title": role_title,
				"candidate_count": len(members),
				"group_status": "Planned",
			})
			made_groups += 1
			for m in members:
				doc.append("gd_group_members", {
					"round_code": code,
					"group_name": group_name,
					"job_applicant": m.name,
					"applicant_name": m.applicant_name,
					"institute": m.institute or None,
					# The candidate's OWN role — in a merged group this differs per
					# member, which is what lets the UI show the RSM/CSM mix.
					"job_opening": m.job_opening or None,
					"attendance": "Pending",
					"result": "Pending",
				})
				made_members += 1

	doc.save()
	frappe.db.commit()
	return {
		"round_code": code,
		"group_size": size,
		"groups": made_groups,
		"candidates": made_members,
		"roles": len(by_role),
		"split_by": "role" if split_by == "role" else "drive",
	}


# ---------------------------------------------------------------------------
# GD workspace actions (called from the Campus Drive HTML renderer)
#
# These write single child-row fields with update_modified=False so the parent's
# `modified` stamp is untouched: HR can click Present/Pass all day without the
# open form going dirty or hitting a "Document has been modified" conflict.
# ---------------------------------------------------------------------------

GD_MEMBER_DT = "Campus Drive GD Group Member"
GD_GROUP_DT = "Campus Drive GD Group"


def _gd_guard(campus_drive):
	# Doctype-level check on purpose: passing the doc NAME would make Frappe load the
	# whole Campus Drive (every child table, incl. hundreds of GD member rows) just to
	# answer a permission question, on every button click.
	if not frappe.has_permission("Campus Drive", "write"):
		frappe.throw(_("Not permitted to update this Campus Drive."), frappe.PermissionError)


def _gd_member_row(campus_drive, row_name):
	row = frappe.db.get_value(
		GD_MEMBER_DT, row_name,
		["name", "parent", "parenttype", "round_code", "group_name", "job_opening"],
		as_dict=True,
	)
	if not row or row.parent != campus_drive or row.parenttype != "Campus Drive":
		frappe.throw(_("That candidate row does not belong to this Campus Drive."))
	return row


def _sync_group_count(campus_drive, round_code, group_name):
	"""Keep the group header's candidate_count true after members move."""
	filters = {"parent": campus_drive, "parenttype": "Campus Drive",
	           "round_code": round_code, "group_name": group_name}
	n = frappe.db.count(GD_MEMBER_DT, filters)
	grp = frappe.db.get_value(GD_GROUP_DT, filters, "name")
	if grp:
		frappe.db.set_value(GD_GROUP_DT, grp, "candidate_count", n, update_modified=False)
	return n


@frappe.whitelist()
def set_gd_member_field(campus_drive, row_name, field, value):
	"""Set one candidate's attendance / result within their GD group."""
	allowed = {
		"attendance": {"Pending", "Present", "Absent"},
		"result": {"Pending", "Pass", "Fail"},
	}
	if field not in allowed:
		frappe.throw(_("Only attendance and result can be set here."))
	if value not in allowed[field]:
		frappe.throw(_("{0} is not a valid {1}.").format(value, field))

	_gd_guard(campus_drive)
	row = _gd_member_row(campus_drive, row_name)
	frappe.db.set_value(GD_MEMBER_DT, row.name, field, value, update_modified=False)
	frappe.db.commit()
	return {"row": row.name, "field": field, "value": value}


@frappe.whitelist()
def bulk_gd_attendance(campus_drive, round_code, group_name, value):
	"""Mark every candidate in one GD group Present / Absent / Pending."""
	if value not in ("Pending", "Present", "Absent"):
		frappe.throw(_("{0} is not a valid attendance value.").format(value))
	_gd_guard(campus_drive)
	rows = frappe.get_all(GD_MEMBER_DT, filters={
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": round_code, "group_name": group_name}, pluck="name")
	for r in rows:
		frappe.db.set_value(GD_MEMBER_DT, r, "attendance", value, update_modified=False)
	frappe.db.commit()
	return {"updated": len(rows), "value": value}


@frappe.whitelist()
def set_gd_group_status(campus_drive, round_code, group_name, status):
	"""Set a GD group's own status (Planned / Scheduled / In Progress / Completed)."""
	if status not in ("Planned", "Scheduled", "In Progress", "Completed"):
		frappe.throw(_("{0} is not a valid group status.").format(status))
	_gd_guard(campus_drive)
	grp = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": round_code, "group_name": group_name}, "name")
	if not grp:
		frappe.throw(_("Group {0} not found on this drive.").format(group_name))
	frappe.db.set_value(GD_GROUP_DT, grp, "group_status", status, update_modified=False)
	frappe.db.commit()
	return {"group_name": group_name, "status": status}


@frappe.whitelist()
def move_gd_member(campus_drive, row_name, target_group):
	"""Move one candidate into another group of the SAME round and SAME role, and
	refresh both groups' counts."""
	_gd_guard(campus_drive)
	row = _gd_member_row(campus_drive, row_name)
	if target_group == row.group_name:
		return {"moved": False}

	grp = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": row.round_code, "group_name": target_group},
		["name", "job_opening"], as_dict=True)
	if not grp:
		frappe.throw(_("Group {0} not found in this round.").format(target_group))
	# Only role-scoped groups (job_opening set on the GROUP) are restricted. Groups
	# built from the whole drive are role-mixed by design, so any move is fine.
	source_grp_role = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": row.round_code, "group_name": row.group_name}, "job_opening")
	if grp.job_opening and source_grp_role and grp.job_opening != source_grp_role:
		frappe.throw(_("These GD groups are per role — a candidate can only move within the same role."))

	previous = row.group_name
	frappe.db.set_value(GD_MEMBER_DT, row.name, "group_name", target_group, update_modified=False)
	_sync_group_count(campus_drive, row.round_code, previous)
	_sync_group_count(campus_drive, row.round_code, target_group)
	frappe.db.commit()
	return {"moved": True, "from": previous, "to": target_group}


# ---------------------------------------------------------------------------
# Bulk interview scheduling
#
# We do NOT build a parallel interview system: this creates real HRMS `Interview`
# records, so the existing chain runs untouched —
#   Interview Feedback (per interviewer) -> majority verdict on the Interview
#   -> advance_on_interview_result -> the applicant's hiring stage moves on.
# Campus rounds map to a hiring stage via Campus Drive Round.hiring_stage, so the
# pool for "Technical Round 2" is simply whoever is sitting at that stage.
# ---------------------------------------------------------------------------

# Campus interviews are walk-in: HR gives a date, candidates arrive in any order.
# Interview.from_time / to_time are mandatory in HRMS (and drive its reminders and
# calendar events), so we stamp a day-long window rather than asking HR for times.
DEFAULT_DAY_START = "09:00:00"
DEFAULT_DAY_END = "18:00:00"


def _round_by_code(doc, round_code):
	row = next((r for r in (doc.rounds or []) if r.round_code == round_code), None)
	if not row:
		frappe.throw(_("No round with code {0} on this drive.").format(round_code))
	return row


def _drive_invites(doc):
	names = [r.campus_invite for r in (doc.campus_invites or []) if r.campus_invite]
	return list(dict.fromkeys(names))


# Child tables the round board actually needs. frappe.get_doc() would also pull
# gd_groups / gd_group_members (hundreds of rows on a real drive) for nothing.
_DRIVE_LITE_TABLES = {
	"campus_invites": ("Campus Drive Invite", ["campus_invite"]),
	"rounds": ("Campus Drive Round", ["round_code", "round_name", "round_type", "hiring_stage",
	                                  "round_status", "scheduled_at", "requires_gd_grouping"]),
	"round_panelists": ("Campus Drive Round Panelist", ["round_code", "panelist", "panel_name",
	                                                    "job_opening"]),
	"linked_job_openings": ("Campus Drive Job Opening", ["job_opening", "job_title"]),
}


def _drive_lite(campus_drive):
	"""Load ONLY the child tables the round board reads, ordered as on the form."""
	out = frappe._dict({"name": campus_drive})
	for field, (doctype, cols) in _DRIVE_LITE_TABLES.items():
		out[field] = frappe.get_all(
			doctype,
			filters={"parenttype": "Campus Drive", "parent": campus_drive, "parentfield": field},
			fields=cols, order_by="idx asc",
		)
	return out


def _employee_user_map(doc):
	"""Employee -> user_id for every panelist on the drive, in ONE query.

	Callers that walk all rounds pass this in, so we don't re-query Employees once
	per round.
	"""
	ids = list({p.panelist for p in (doc.round_panelists or []) if p.panelist})
	if not ids:
		return {}
	return {
		e.name: e.user_id
		for e in frappe.get_all("Employee", filters={"name": ["in", ids]},
		                        fields=["name", "user_id"])
	}


def _panels_for_round(doc, round_code, emp_users=None):
	"""Group this round's panelists into panels: {panel_name: {"users":[...], "role":opening}}.

	Interview Detail.interviewer is a User, while panelists are Employees — so we map
	through Employee.user_id and skip anyone without a login.
	"""
	rows = [p for p in (doc.round_panelists or []) if p.round_code == round_code and p.panelist]
	if not rows:
		return {}, []

	if emp_users is None:
		emp_users = _employee_user_map(doc)
	panels, order, missing = {}, [], []
	for r in rows:
		user = emp_users.get(r.panelist)
		if not user:
			missing.append(r.panelist)
			continue
		key = r.panel_name or "Panel 1"
		if key not in panels:
			panels[key] = {"users": [], "role": r.job_opening or None}
			order.append(key)
		if user not in panels[key]["users"]:
			panels[key]["users"].append(user)
		if r.job_opening and not panels[key]["role"]:
			panels[key]["role"] = r.job_opening
	return {k: panels[k] for k in order}, missing


@frappe.whitelist()
def get_round_pool(campus_drive, round_code):
	"""Candidates waiting at this round's hiring stage, grouped by role.

	Returns the pool plus anyone already scheduled, so the UI can show what a
	"Schedule" click would actually do before doing it.
	"""
	doc = frappe.get_doc("Campus Drive", campus_drive)
	row = _round_by_code(doc, round_code)
	stage = (row.hiring_stage or "").strip()
	if not stage:
		frappe.throw(_("Set the <b>Hiring Stage</b> on round {0} first.").format(round_code))

	invites = _drive_invites(doc)
	if not invites:
		return {"stage": stage, "pool": [], "scheduled": 0}

	pool = frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invites], "custom_current_stage": stage},
		fields=["name", "applicant_name", "custom_institute as institute",
		        "job_title as job_opening", "designation"],
		order_by="job_title asc, name asc",
	)
	already = set(frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "docstatus": ["<", 2]},
		pluck="job_applicant",
	))
	return {
		"stage": stage,
		"pool": [p for p in pool if p.name not in already],
		"already_scheduled": len([p for p in pool if p.name in already]),
	}


@frappe.whitelist()
def schedule_round_interviews(campus_drive, round_code, scheduled_on=None,
                              from_time=None, to_time=None, applicants=None):
	"""Bulk-create Interviews for everyone waiting at this round's stage.

	Candidates are dealt to panels round-robin. Panels tagged with a role only take
	that role's candidates (per-role scheduling); untagged panels take anyone.
	"""
	from recruitment.api.hiring_stage import _ensure_interview_round

	doc = frappe.get_doc("Campus Drive", campus_drive)
	row = _round_by_code(doc, round_code)
	stage = (row.hiring_stage or "").strip()
	if not stage:
		frappe.throw(_("Set the <b>Hiring Stage</b> on round {0} first.").format(round_code))

	date = scheduled_on or (row.scheduled_at and str(row.scheduled_at)[:10]) or None
	if not date:
		frappe.throw(_("Pick the interview date for this round."))

	panels, missing = _panels_for_round(doc, round_code)
	if not panels:
		msg = _("Add panelists for round {0} before scheduling.").format(round_code)
		if missing:
			msg += " " + _("These employees have no linked User account: {0}").format(", ".join(missing))
		frappe.throw(msg)

	data = get_round_pool(campus_drive, round_code)
	pool = data["pool"]

	# Optional explicit selection — schedule only these candidates (e.g. 30 today,
	# the rest tomorrow). Anything not in the eligible pool is ignored rather than
	# force-scheduled, so a stale UI can't create interviews for the wrong people.
	if applicants:
		if isinstance(applicants, str):
			applicants = frappe.parse_json(applicants)
		wanted = {a for a in (applicants or []) if a}
		pool = [p for p in pool if p.name in wanted]
		if not pool:
			frappe.throw(_("None of the selected candidates are still waiting at stage {0}.")
			             .format(frappe.bold(stage)))
	elif not pool:
		frappe.throw(_("Nobody is waiting at stage {0} for this drive.").format(frappe.bold(stage)))

	interview_round = _ensure_interview_round(stage)
	# Panels that name a role serve only that role; the rest are general-purpose.
	by_role = {}
	general = [k for k, v in panels.items() if not v["role"]]
	for k, v in panels.items():
		if v["role"]:
			by_role.setdefault(v["role"], []).append(k)

	created, skipped, cursor = [], [], {}
	for cand in pool:
		choices = by_role.get(cand.job_opening) or general
		if not choices:
			skipped.append({"applicant": cand.name, "reason": "no panel for this role"})
			continue
		i = cursor.get(cand.job_opening or "", 0)
		panel_name = choices[i % len(choices)]
		cursor[cand.job_opening or ""] = i + 1

		try:
			iv = frappe.new_doc("Interview")
			iv.job_applicant = cand.name
			iv.job_opening = cand.job_opening
			iv.interview_round = interview_round
			iv.designation = cand.designation
			iv.scheduled_on = date
			iv.from_time = from_time or DEFAULT_DAY_START
			iv.to_time = to_time or DEFAULT_DAY_END
			iv.status = "Pending"
			for user in panels[panel_name]["users"]:
				iv.append("interview_details", {"interviewer": user})
			iv.custom_campus_drive = campus_drive
			iv.custom_campus_round_code = round_code
			iv.custom_interview_panel = panel_name
			iv.flags.ignore_permissions = True
			iv.insert(ignore_permissions=True)
			created.append(iv.name)
		except Exception as e:
			skipped.append({"applicant": cand.name, "reason": f"{type(e).__name__}: {e}"})

	frappe.db.commit()
	return {
		"round_code": round_code, "stage": stage, "scheduled_on": date,
		"created": len(created), "skipped": skipped[:10], "skipped_count": len(skipped),
		"panels": list(panels),
	}


@frappe.whitelist()
def apply_gd_results(campus_drive, round_code):
	"""Push a GD round's results into the hiring workflow.

	Pass -> the candidate lands on the stage AFTER the GD round's own hiring stage
	(so a pass always means "into the next round", wherever they were sitting before).
	Fail -> Rejected. Anyone still Pending is left alone, so HR can run this again as
	results come in. Nobody is ever moved backwards.
	"""
	from recruitment.api.hiring_stage import (
		_enter_stage, _find_stage, get_opening_stages, _append_history,
	)

	_gd_guard(campus_drive)
	# The GD round's own stage anchors the hand-off: pass => the stage after it.
	gd_stage = frappe.db.get_value(
		"Campus Drive Round",
		{"parent": campus_drive, "parenttype": "Campus Drive", "round_code": round_code},
		"hiring_stage",
	)

	rows = frappe.get_all(
		GD_MEMBER_DT,
		filters={"parent": campus_drive, "parenttype": "Campus Drive", "round_code": round_code},
		fields=["name", "job_applicant", "result"],
	)
	passed = failed = skipped = pending = 0
	stage_cache = {}  # opening -> stages; the pool shares only a handful of openings
	for r in rows:
		if not r.job_applicant or r.result not in ("Pass", "Fail"):
			pending += 1
			continue
		try:
			ja = frappe.get_doc("Job Applicant", r.job_applicant)
			if r.result == "Fail":
				ja.status = "Rejected"
				ja.save(ignore_permissions=True)
				failed += 1
				continue

			opening = ja.get("job_title")
			if opening not in stage_cache:
				stage_cache[opening] = get_opening_stages(opening)
			stages = stage_cache[opening]
			current = ja.get("custom_current_stage")
			current_idx = _find_stage(stages, current) if current else -1

			# Anchor on the GD round's stage when it maps onto this opening's workflow;
			# otherwise fall back to wherever the candidate currently is.
			anchor = _find_stage(stages, gd_stage) if gd_stage else -1
			if anchor < 0:
				anchor = current_idx
			target = anchor + 1

			if anchor < 0 or target >= len(stages):
				if current_idx >= 0:
					_append_history(ja, stages[current_idx], "GD Cleared")
					ja.save(ignore_permissions=True)
				skipped += 1
				continue
			if target <= current_idx:
				# Already at or beyond the next round — record it, don't move backwards.
				_append_history(ja, stages[current_idx], "GD Cleared")
				ja.save(ignore_permissions=True)
				skipped += 1
				continue

			_enter_stage(ja, stages[target], result="GD Cleared", ignore_permissions=True)
			passed += 1
		except Exception as e:
			skipped += 1
			frappe.log_error(frappe.get_traceback(), f"Campus GD result push failed for {r.job_applicant}: {e}")

	frappe.db.commit()
	return {"advanced": passed, "rejected": failed, "skipped": skipped,
	        "pending": pending, "total": len(rows),
	        "gd_stage": gd_stage, "moved_to": None if not gd_stage else "stage after " + gd_stage}


@frappe.whitelist()
def get_rounds_overview(campus_drive):
	"""Per-round tracking for the drive: who is waiting, what is scheduled, what is
	still awaiting interviewer feedback, and how it concluded.

	Interviewers are configured ONCE on the round (round_panelists: round + position
	+ panel), so this also reports each round's standing panels — scheduling reuses
	them every time instead of asking HR to pick people again.
	"""
	doc = _drive_lite(campus_drive)
	invites = _drive_invites(doc)

	# How many drive candidates sit at each hiring stage right now
	stage_counts = {}
	if invites:
		for r in frappe.get_all(
			"Job Applicant",
			filters={"custom_campus_invite": ["in", invites]},
			fields=["custom_current_stage as stage", "count(name) as cnt"],
			group_by="custom_current_stage",
		):
			stage_counts[r.stage or ""] = r.cnt

	# Interviews this drive created, with their feedback progress
	iv_rows = frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "docstatus": ["<", 2]},
		fields=["name", "custom_campus_round_code as code", "status"],
	)
	iv_names = [i.name for i in iv_rows]
	got, expected = {}, {}
	if iv_names:
		for f in frappe.get_all("Interview Feedback",
		                        filters={"interview": ["in", iv_names], "docstatus": 1},
		                        fields=["interview", "count(name) as cnt"], group_by="interview"):
			got[f.interview] = f.cnt
		for d in frappe.get_all("Interview Detail",
		                        filters={"parent": ["in", iv_names], "parenttype": "Interview"},
		                        fields=["parent", "count(name) as cnt"], group_by="parent"):
			expected[d.parent] = d.cnt

	by_round = {}
	for i in iv_rows:
		b = by_round.setdefault(i.code or "", {"total": 0, "by_status": {}, "awaiting": 0})
		b["total"] += 1
		b["by_status"][i.status] = b["by_status"].get(i.status, 0) + 1
		if i.status in ("Pending", "Under Review") and got.get(i.name, 0) < expected.get(i.name, 0):
			b["awaiting"] += 1

	role_titles = {r.job_opening: r.job_title for r in (doc.linked_job_openings or [])}
	all_users = set()
	panels_by_round = {}
	emp_users = _employee_user_map(doc)  # one Employee query for the whole drive
	for r in (doc.rounds or []):
		panels, missing = _panels_for_round(doc, r.round_code, emp_users)
		panels_by_round[r.round_code] = (panels, missing)
		for v in panels.values():
			all_users.update(v["users"])
	names = {
		u.name: (u.full_name or u.name)
		for u in frappe.get_all("User", filters={"name": ["in", list(all_users)]},
		                        fields=["name", "full_name"])
	} if all_users else {}

	rounds = []
	for r in (doc.rounds or []):
		panels, missing = panels_by_round[r.round_code]
		stat = by_round.get(r.round_code, {"total": 0, "by_status": {}, "awaiting": 0})
		rounds.append({
			"round_code": r.round_code,
			"round_name": r.round_name,
			"round_type": r.round_type,
			"hiring_stage": r.hiring_stage or "",
			"round_status": r.round_status,
			"scheduled_at": str(r.scheduled_at)[:10] if r.scheduled_at else None,
			"is_gd": bool(r.requires_gd_grouping),
			"waiting": stage_counts.get(r.hiring_stage, 0) if r.hiring_stage else 0,
			"panels": [
				{"panel": k, "role": v["role"], "role_title": role_titles.get(v["role"]) or v["role"],
				 "interviewers": [{"user": u, "name": names.get(u, u)} for u in v["users"]]}
				for k, v in panels.items()
			],
			"missing_user": missing,
			"interviews": stat["total"],
			"by_status": stat["by_status"],
			"awaiting_feedback": stat["awaiting"],
		})

	# Folded in so the client gets rounds + the stage picker's options in ONE call.
	return {"rounds": rounds, "invites": invites,
	        "roles": [{"job_opening": k, "job_title": v} for k, v in role_titles.items()],
	        "stage_options": _stage_options(doc)}


@frappe.whitelist()
def get_drive_stage_options(campus_drive):
	"""Stage names available on this drive's linked openings (standalone endpoint)."""
	return _stage_options(frappe.get_doc("Campus Drive", campus_drive))


def _stage_options(doc):
	"""Stage names available on this drive's linked openings.

	Feeds the Hiring Stage picker on a round so HR can't mistype a stage that no
	opening has (which would silently strand every candidate). When the openings
	disagree on their stage lists we report it — a round maps to ONE stage name, so
	a name missing from some openings would only schedule part of the drive.
	"""
	openings = [r.job_opening for r in (doc.linked_job_openings or []) if r.job_opening]
	if not openings:
		return {"stages": [], "common": [], "partial": [], "openings": 0}

	from recruitment.api.hiring_stage import get_opening_stages

	per_opening = {}
	for op in openings:
		per_opening[op] = [s.get("stage_name") for s in (get_opening_stages(op) or []) if s.get("stage_name")]

	ordered, seen = [], set()
	for op in openings:
		for s in per_opening[op]:
			if s not in seen:
				seen.add(s)
				ordered.append(s)
	common = [s for s in ordered if all(s in v for v in per_opening.values())]
	return {
		"stages": ordered,
		"common": common,
		"partial": [s for s in ordered if s not in common],
		"openings": len(openings),
	}


@frappe.whitelist()
def nudge_pending_feedback(campus_drive, round_code):
	"""Assign the still-open interviews to the interviewers who owe feedback.

	Creates a ToDo per (interviewer, interview) so it lands in their "Assigned to me"
	without emailing anyone — deliberate, so a nudge on a 58-candidate round can't
	blast mail at real people. Idempotent: an existing open ToDo is left alone.
	"""
	from frappe.desk.form.assign_to import add as assign_to

	_gd_guard(campus_drive)
	ivs = frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "status": ["in", ["Pending", "Under Review"]], "docstatus": ["<", 2]},
		pluck="name",
	)
	if not ivs:
		return {"nudged": 0, "interviews": 0}

	submitted = {}
	for f in frappe.get_all("Interview Feedback",
	                        filters={"interview": ["in", ivs], "docstatus": 1},
	                        fields=["interview", "interviewer"]):
		submitted.setdefault(f.interview, set()).add(f.interviewer)

	# Panel members and existing open ToDos are fetched ONCE for every interview in
	# the round — doing either per-interview turned a 58-candidate nudge into ~170
	# queries.
	panel_of = {}
	for row in frappe.get_all("Interview Detail",
	                          filters={"parent": ["in", ivs], "parenttype": "Interview"},
	                          fields=["parent", "interviewer"]):
		panel_of.setdefault(row.parent, []).append(row.interviewer)

	open_todos = set()
	for t in frappe.get_all("ToDo",
	                        filters={"reference_type": "Interview", "reference_name": ["in", ivs],
	                                 "status": "Open"},
	                        fields=["reference_name", "allocated_to"]):
		open_todos.add((t.reference_name, t.allocated_to))

	nudged, people = 0, set()
	for iv in ivs:
		done = submitted.get(iv, set())
		for who in panel_of.get(iv, []):
			if not who or who in done or (iv, who) in open_todos:
				continue
			try:
				assign_to({
					"doctype": "Interview", "name": iv, "assign_to": [who],
					"description": _("Interview feedback pending for {0}").format(iv),
					"notify": 0,
				})
				nudged += 1
				people.add(who)
			except Exception:
				frappe.log_error(frappe.get_traceback(), f"Campus nudge failed for {iv} / {who}")

	frappe.db.commit()
	return {"nudged": nudged, "interviewers": len(people), "interviews": len(ivs)}


@frappe.whitelist()
def add_candidate_interview(campus_drive, job_applicant, stage_name, scheduled_on,
                            round_code=None, panel=None, from_time=None, to_time=None):
	"""Give ONE candidate an extra interview — an additional round beyond the standard
	pipeline (e.g. a third technical round just for this person).

	The candidate's stage is left untouched: this adds an interview, it does not
	rewrite the opening's workflow for everyone.
	"""
	from recruitment.api.hiring_stage import _ensure_interview_round

	_gd_guard(campus_drive)
	if not (job_applicant and stage_name and scheduled_on):
		frappe.throw(_("Candidate, stage and date are all required."))

	ja = frappe.db.get_value("Job Applicant", job_applicant,
	                         ["name", "job_title", "designation"], as_dict=True)
	if not ja:
		frappe.throw(_("Job Applicant {0} not found.").format(job_applicant))

	doc = frappe.get_doc("Campus Drive", campus_drive)
	users = []
	if round_code:
		panels, _missing = _panels_for_round(doc, round_code)
		if panel and panel in panels:
			users = panels[panel]["users"]
		elif panels:
			users = list(panels.values())[0]["users"]

	iv = frappe.new_doc("Interview")
	iv.job_applicant = ja.name
	iv.job_opening = ja.job_title
	iv.interview_round = _ensure_interview_round(stage_name)
	iv.designation = ja.designation
	iv.scheduled_on = scheduled_on
	iv.from_time = from_time or DEFAULT_DAY_START
	iv.to_time = to_time or DEFAULT_DAY_END
	iv.status = "Pending"
	for u in users:
		iv.append("interview_details", {"interviewer": u})
	iv.custom_campus_drive = campus_drive
	if round_code:
		iv.custom_campus_round_code = round_code
	if panel:
		iv.custom_interview_panel = panel
	iv.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"interview": iv.name, "job_applicant": ja.name, "stage": stage_name,
	        "interviewers": len(users)}
