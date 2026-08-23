import re
from collections import Counter

import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.campus_helpers import (
	draft_drive_institutes,
	live_drive_institutes,
	sync_drive_applicant_links,
	validate_unique_job_openings,
)
from recruitment.recruitment.campus_workflow import (
	apply_to_drive as apply_workflow_to_drive,
	apply_to_openings as apply_workflow_to_openings,
)
from recruitment.recruitment.doctype.campus_invite.campus_invite import get_invite_institutes

# Round types that need an interview panel / GD grouping in the reference portal.
PANEL_ROUND_TYPES = {"Group Discussion", "Technical", "HR"}
GD_ROUND_TYPES = {"Group Discussion"}

# How an interview is held. The drive carries the default (Campus Drive → Drive
# Type) because a campus visit is normally one or the other for the whole drive;
# the interview keeps its own copy so HR can switch a single one — a panelist
# joining remotely, a candidate who could not travel.
INTERVIEW_MODES = ("On-Site", "Online")
# The Interview field holding it. Labelled "Mode of Interview" — NOT the stock
# `interview_type` Link, which is the round/skill template.
INTERVIEW_MODE_FIELD = "custom_interview_type"


def _safe(value):
	"""Bold, HTML-escaped. `frappe.bold` does not escape and `throw` / `msgprint`
	render HTML — and an Institute's name IS free text now that it is also the record
	name. Mirrors `candidate_registration._safe`."""
	from frappe.utils import escape_html

	return frappe.bold(escape_html(str(value or "")))


def _safe_list(values):
	"""One bold, escaped, comma-separated run of `values`."""
	from frappe.utils import escape_html

	return frappe.bold(", ".join(escape_html(str(v or "")) for v in values))


def _drive_mode(campus_drive):
	"""This drive's default interview mode (Campus Drive → Drive Type)."""
	return frappe.db.get_value("Campus Drive", campus_drive, "drive_type") or INTERVIEW_MODES[0]


def _resolve_mode(campus_drive, mode=None):
	"""The mode to stamp on an interview: HR's override, else the drive's own."""
	mode = (mode or "").strip()
	if not mode:
		return _drive_mode(campus_drive)
	if mode not in INTERVIEW_MODES:
		frappe.throw(
			_("{0} is not a valid mode. Choose one of: {1}.").format(
				frappe.bold(mode), ", ".join(INTERVIEW_MODES)),
			title=_("Invalid Mode of Interview"),
		)
	return mode


def _set_interview_mode(iv, mode):
	"""Stamp the mode, if this site carries the field."""
	if mode and iv.meta.has_field(INTERVIEW_MODE_FIELD):
		iv.set(INTERVIEW_MODE_FIELD, mode)


class CampusDrive(Document):
	def validate(self):
		self.drive_id = self.name
		self._validate_drive_window()
		self._apply_lifecycle_status()
		self._sync_campus_invites()
		self._validate_participating_institutes()
		validate_unique_job_openings(self, table_fieldname="linked_job_openings")
		self._set_registration_defaults()
		# After the invites are in: the rounds are built from the workflow named in
		# Campus Settings, and its closing Offer round follows the openings' own
		# stages — neither is knowable before the invites resolve.
		apply_workflow_to_drive(self)
		self._set_round_codes()
		self._warn_round_stage_alignment()

	def _lifecycle_status(self):
		"""Where the drive sits in its window: Draft before it starts, Live during,
		Completed after it ends. Returns None if there's no start date to judge by."""
		from frappe.utils import getdate, nowdate

		if not self.drive_start_date:
			return None
		today = getdate(nowdate())
		if today < getdate(self.drive_start_date):
			return "Draft"
		if self.drive_end_date and today > getdate(self.drive_end_date):
			return "Completed"
		return "Live"

	def _apply_lifecycle_status(self):
		"""Auto-advance the status from the drive window. 'Closed' is a manual, terminal
		state we never override; everything else tracks the dates."""
		if self.drive_status == "Closed":
			return
		target = self._lifecycle_status()
		if target and self.drive_status != target:
			self.drive_status = target

	def _sync_campus_invites(self):
		"""Merge each linked Campus Invite's Job Openings into linked_job_openings.
		Additive and idempotent: existing rows are kept and never duplicated, so this
		is safe to run on every save regardless of whether the client already fetched
		them.

		Participating Institutes are deliberately NOT pulled in. An invite carries
		several colleges and HR splits them into drives by candidate count — a
		200-candidate college runs on its own, two 100s are merged — so which colleges
		this drive covers is a decision, not a copy. HR picks them from the invites'
		institutes (see `drive_institute_query`), and `_validate_participating_institutes`
		keeps that choice honest.
		"""
		if not self.campus_invites:
			return

		known_openings = {row.job_opening for row in (self.linked_job_openings or []) if row.job_opening}

		added = False
		for invite_row in self.campus_invites:
			if not invite_row.campus_invite:
				continue
			invite = frappe.get_doc("Campus Invite", invite_row.campus_invite)

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

	def _validate_participating_institutes(self):
		"""The colleges this drive runs: each invited, each listed once, none already
		running elsewhere.

		The last rule is the point of the whole arrangement. A college's registration
		closes when its drive goes live, so a college may belong to only ONE live drive
		per invite — otherwise "closed by DRV-A" and "still being planned on DRV-B"
		would both be true of the same college and its TPO would get contradictory
		answers. Colleges on a Draft drive are still free: HR routinely builds two draft
		drives and moves a college between them while sizing the batches.
		"""
		rows = [row for row in (self.participating_institutes or []) if row.institute]
		if not rows:
			return

		seen = {}
		for row in rows:
			if row.institute in seen:
				frappe.throw(
					_("Institute {0} is listed twice (rows {1} and {2}). Each college runs once "
					  "on a drive.").format(_safe(row.institute), seen[row.institute], row.idx),
					title=_("Duplicate Institute"),
				)
			seen[row.institute] = row.idx

		invites = _drive_invites(self)
		if not invites:
			return

		# Only the colleges these invites actually invited may be run by this drive —
		# the invite is what the candidates are registered against.
		invited = set()
		for invite in invites:
			invited.update(get_invite_institutes(invite))
		stray = [i for i in seen if i not in invited]
		if stray:
			frappe.throw(
				_("Institute(s) {0} are not invited on this drive's Campus Invite(s) {1}. "
				  "Add them to the invite first, or remove them here.").format(
					_safe_list(stray), _safe_list(invites)),
				title=_("Institute Not Invited"),
			)

		taken = live_drive_institutes(invites, exclude_drive=self.name)
		clashes = [i for i in seen if i in taken]
		if clashes:
			frappe.throw(
				_("{0} already running on a live drive: {1}. Pick the colleges that have not "
				  "been scheduled yet.").format(
					_("Institutes") if len(clashes) > 1 else _("Institute"),
					_safe_list(f"{i} → {taken[i]}" for i in clashes),
				),
				title=_("College Already Scheduled"),
			)

		# Two DRAFT drives holding the same college is allowed — that is how HR shuffles
		# colleges while sizing the batches. But both drafts go live by the calendar, not
		# by a save, so nothing re-checks them at that moment: say it now, while there is
		# still a draft to fix.
		drafted = draft_drive_institutes(invites, exclude_drive=self.name)
		overlap = [i for i in seen if i in drafted]
		if overlap:
			frappe.msgprint(
				_("{0} also on draft drive(s): {1}. Only one drive can run a college — drop it "
				  "from the other before both windows open.").format(
					_("Institutes") if len(overlap) > 1 else _("Institute"),
					_safe_list(f"{i} → {drafted[i]}" for i in overlap),
				),
				title=_("Also on Another Draft Drive"), indicator="orange",
			)

	def on_update(self):
		# Point this drive's candidates at it. Runs on every save (after the invite
		# tables are settled) so adding an invite immediately pulls in the applicants
		# who came through it, and removing one lets them go.
		self._link_applicants()

		# An opening with no hiring stages of its own makes every round mapped to one
		# unreachable — the silent "0 waiting". Give it the campus workflow. Here
		# rather than in validate because it saves other documents.
		apply_workflow_to_openings(self)

		# Auto-generate the QR the first time the form is enabled. Refreshing is
		# manual (the "Generate QR Code" button) so the image isn't rebuilt on
		# every save. Best-effort: a QR failure must never block the save.
		if self.registration_form_enabled and not self.registration_form_qr_code:
			try:
				self._write_registration_qr(self._registration_url())
			except Exception:
				frappe.log_error(frappe.get_traceback(), "Campus Drive: QR auto-generate failed")

	def on_trash(self):
		# Release the candidates before Frappe's link check runs (it would otherwise
		# refuse the delete now that Job Applicants point back at the drive).
		for name in frappe.get_all("Job Applicant", filters={"custom_campus_drive": self.name},
		                           pluck="name", ignore_permissions=True):
			frappe.db.set_value("Job Applicant", name, "custom_campus_drive", None,
			                    update_modified=False)

	def _link_applicants(self):
		"""Write this drive onto the Job Applicants of its Campus Invites (and off the
		ones whose invite was removed), then tell HR what moved.

		Best-effort: a save must never fail because of the back-link.
		"""
		try:
			result = sync_drive_applicant_links(self.name, _drive_invites(self))
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Campus Drive: applicant linking failed")
			return

		parts = []
		if result["linked"]:
			parts.append(_("{0} candidate(s) linked to this drive").format(result["linked"]))
		if result["released"]:
			parts.append(_("{0} released (their invite is no longer on it)").format(result["released"]))
		if parts:
			frappe.msgprint(", ".join(parts), title=_("Campus Candidates"), indicator="green",
			                alert=True)

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

	def _warn_round_stage_alignment(self):
		"""Warn (never block) when a round's Hiring Stage isn't a real stage on the
		linked openings — the exact misconfiguration that otherwise surfaces only as a
		silent '0 waiting'. Skipped for new/unsaved drives (openings sync on save)."""
		if self.is_new():
			return
		opening_stages = set(_stage_options(self).get("stages") or [])
		if not opening_stages:
			return
		for r in (self.rounds or []):
			if r.requires_gd_grouping:
				continue
			hs = (r.hiring_stage or "").strip()
			if hs and hs not in opening_stages:
				frappe.msgprint(
					_("Round “{0}” is mapped to stage “{1}”, which none of this drive’s "
					  "openings have. Candidates will never reach it — pick one of: {2}.").format(
						r.round_name or r.round_code, hs, ", ".join(sorted(opening_stages))),
					title=_("Round stage not on any opening"), indicator="orange")

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
def get_campus_invite_details(campus_invite, campus_drive=None):
	"""What a Campus Invite brings to a drive: its Job Openings (copied in) and its
	Institutes split into the ones still free and the ones already running.

	Openings are fetched into the drive automatically — every college on the invite is
	hiring for the same roles. Institutes are only REPORTED, because HR chooses which
	of them this drive covers; `taken` is what the picker must not offer.
	"""
	invite = frappe.get_doc("Campus Invite", campus_invite)
	openings = []
	for row in (invite.job_openings or []):
		if not row.job_opening:
			continue
		openings.append({
			"job_opening": row.job_opening,
			"job_title": frappe.db.get_value("Job Opening", row.job_opening, "job_title"),
		})

	# An invite can carry several institutes.
	institutes = [row.institute for row in (invite.institutes or []) if row.institute]
	taken = live_drive_institutes([campus_invite], exclude_drive=campus_drive)
	return {
		"institutes": institutes,
		"available_institutes": [i for i in institutes if i not in taken],
		"taken_institutes": [{"institute": i, "campus_drive": taken[i]}
		                     for i in institutes if i in taken],
		"job_openings": openings,
	}


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def drive_institute_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link-field query for Campus Drive -> Participating Institutes.

	Offers only the colleges this drive may still run: invited on one of its Campus
	Invites, active, and not already frozen by another live drive. Filtering the
	picker is what makes "the remaining three" the obvious choice — the server check
	in `_validate_participating_institutes` is the one that actually enforces it.
	"""
	filters = filters or {}
	invites = filters.get("campus_invites") or []
	if isinstance(invites, str):
		invites = frappe.parse_json(invites) or []
	invites = [i for i in dict.fromkeys(invites) if i]
	if not invites:
		return []

	invited = []
	for invite in invites:
		invited.extend(get_invite_institutes(invite))
	taken = live_drive_institutes(invites, exclude_drive=filters.get("campus_drive"))
	available = [i for i in dict.fromkeys(invited) if i not in taken]
	if not available:
		return []

	return frappe.get_all(
		"Institute",
		filters={"name": ["in", available], "is_active": 1},
		or_filters=[["name", "like", f"%{txt}%"], ["institute_name", "like", f"%{txt}%"]] if txt else None,
		fields=["name", "institute_name"],
		order_by="institute_name asc",
		start=start,
		page_length=page_len,
		as_list=True,
	)


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

	# counts: opening -> institute -> status.
	# Tallied in Python rather than with a SQL aggregate in `fields`: Frappe v16
	# rejects "count(name) as cnt" as a string in SELECT, and its dict form isn't
	# available on v15 — a plain fetch works identically on both.
	agg = {}
	for c in frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invite_names]},
		fields=["job_title as opening", "custom_institute as institute", "status"],
		limit_page_length=0,
	):
		if not c.opening:
			continue
		by_status = agg.setdefault(c.opening, {}).setdefault(c.institute or "", {})
		by_status[c.status] = by_status.get(c.status, 0) + 1

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

# Parked, not in play: a Hold is an eligibility knock-out, and a rejection or an
# acceptance is decided. None of them is waiting for the next round, none may be
# scheduled into one, and none belongs in a round's "waiting" count — which is what
# put held candidates in front of HR as if they were still to be interviewed.
PARKED_STATUSES = ("Rejected", "Accepted", "Hold")
DEFAULT_GD_GROUP_SIZE = 5

# A group whose results have been pushed. Frozen: never regrouped, re-numbered or
# re-pooled, and its candidates are never offered a GD again. Set by
# apply_gd_results — the moment the GD actually finished.
GD_FROZEN_STATUS = "Completed"


def _highest_group_no(group_names):
	"""The largest N across "Group N" names, so new groups continue the numbering
	instead of restarting at 1 — "Group 3" must not come to mean a different set of
	people than it did this morning."""
	highest = 0
	for name in group_names or []:
		match = re.search(r"(\d+)\s*$", str(name or ""))
		if match:
			highest = max(highest, int(match.group(1)))
	return highest

# Interview statuses that mean "candidate appeared, awaiting the panel's verdict".
# Sites may use "Appeared" and/or the stock "Under Review"; both count as awaiting.
# Kept in sync with the client (campus_drive.js) so the tile filter matches the count.
AWAITING_INTERVIEW_STATUSES = ("Appeared", "Under Review")


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


GD_SPLIT_MODES = ("drive", "role", "institute", "institute_role")


def _gd_pools(applicants, split_by, role_titles):
	"""One ``(role, role_title, institute, ordered candidates)`` pool per split bucket.

	drive          : everyone together — roles AND institutes dealt round-robin.
	role           : a pool per Job Opening, institutes mixed inside it.
	institute      : a pool per college, roles mixed inside it — the campus-day layout,
	                 where each college's students sit their GD together.
	institute_role : a pool per college AND role, the narrowest split.
	"""
	if split_by == "drive":
		return [(None, _("All Roles"), None, _interleave_roles_and_institutes(applicants))]

	split_role = split_by in ("role", "institute_role")
	split_inst = split_by in ("institute", "institute_role")
	# A pool that still holds several roles gets them dealt round-robin; a role-scoped
	# pool only needs its institutes mixed (and a single-institute one, shuffling).
	order = _interleave_by_institute if split_role else _interleave_roles_and_institutes

	buckets = {}
	for a in applicants:
		buckets.setdefault(((a.institute or "") if split_inst else "",
		                    (a.job_opening or "") if split_role else ""), []).append(a)

	return [
		(role or None, role_titles.get(role) or role or _("All Roles"), inst or None,
		 order(buckets[(inst, role)]))
		for inst, role in sorted(buckets, key=lambda k: (k[0], role_titles.get(k[1]) or k[1]))
	]


def _gd_panel_picker(panels):
	"""Deal panels across groups round-robin, so every panel gets a fair share.

	ONE panel takes ONE group. A panel that is already judging a group is not given a
	second one until every other eligible panel has one — which is what keeps a single
	interviewer on a single GD instead of two of them sitting in on the same one while
	the next group waits.

	A panel tagged with a role only takes that role's groups; an untagged panel takes
	any group. Groups facing the same choice of panels share one cursor, so they spread
	instead of piling onto the first panel.
	"""
	cursors = {}

	def pick(role):
		choices = tuple(k for k, v in panels.items() if not v["role"] or not role or v["role"] == role)
		if not choices:
			return None
		i = cursors.get(choices, 0)
		cursors[choices] = i + 1
		return choices[i % len(choices)]

	return pick


@frappe.whitelist()
def generate_gd_groups(campus_drive, round_code=None, group_size=None, split_by="drive",
                       rebuild=0, assign_panels=1):
	"""Build Group Discussion groups for a drive and store them on the drive.

	Pool  : Shortlisted Job Applicants on the drive's campus invites who are NOT
	        already in a group for this round. A GD is sat once — a candidate who has
	        already been grouped is never pulled back in.
	Split : one of GD_SPLIT_MODES — ``"drive"`` (default) pools EVERY candidate on the
	        drive together, so one group can hold candidates from several roles (3 RSM +
	        3 CSM in a group of 6) — a GD panel judges communication, not the role.
	        ``"role"`` keeps each Job Opening in its own groups, ``"institute"`` keeps
	        each college in its own groups (roles still mixed), and ``"institute_role"``
	        splits by both — for a drive that runs one college's role-wise GDs at a time.
	Mix   : whatever a pool still spans (roles, institutes) is dealt round-robin.
	Sizes : balanced, so no undersized group is left behind.

	COMPLETED GROUPS ARE FROZEN
	---------------------------
	Pushing a group's results marks it ``Completed`` (see ``apply_gd_results``). A
	Completed group and its members are never rebuilt, re-numbered or re-pooled — that
	GD happened, and its candidates have already moved on or been rejected.

	This is why running it again is safe. It used to wipe every group for the round and
	re-pool every Shortlisted candidate, so generating groups for three late arrivals
	re-created the whole hall and pushed candidates who had already finished back
	through the flow.

	``rebuild``
	    0 (default) — ADD ONLY. Existing groups stay exactly as they are; only
	    candidates who are in no group yet are grouped, appended after the last group.
	    This is what you want for late arrivals.
	    1 — redo the groups that have NOT been run yet (anything not Completed) and
	    group the ungrouped with them. Frozen groups are still untouched.

	``assign_panels``
	    1 (default) — deal this round's interviewers across the new groups as they are
	    created. 0 — leave them unassigned for HR to set by hand afterwards
	    (``set_gd_group_panel`` / ``assign_gd_panels``).
	"""
	if split_by not in GD_SPLIT_MODES:
		frappe.throw(_("{0} is not a valid grouping.").format(split_by))
	rebuild = int(rebuild or 0)
	assign_panels = int(assign_panels if assign_panels is not None else 1)
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

	# Groups already on this round, split by whether they are frozen. A Completed group
	# is one whose results have been pushed: it is history, and neither it nor its
	# candidates may be touched again.
	frozen_groups = [g for g in (doc.gd_groups or [])
	                 if g.round_code == code and g.group_status == GD_FROZEN_STATUS]
	open_groups = [g for g in (doc.gd_groups or [])
	               if g.round_code == code and g.group_status != GD_FROZEN_STATUS]
	frozen_names = {g.group_name for g in frozen_groups}

	round_members = [m for m in (doc.gd_group_members or []) if m.round_code == code]
	frozen_member_rows = [m for m in round_members if m.group_name in frozen_names]
	# Who must not be pooled again. On a rebuild only the frozen groups hold their
	# candidates back; on an add-only run everyone already grouped is held back.
	spoken_for = {m.job_applicant for m in
	              (frozen_member_rows if rebuild else round_members) if m.job_applicant}

	applicants = frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invite_names], "status": GD_POOL_STATUS},
		fields=["name", "applicant_name", "custom_applicant_last_name",
		        "custom_institute as institute", "job_title as job_opening"],
		order_by="name asc",
	)
	already = len(applicants)
	applicants = [a for a in applicants if a.name not in spoken_for]
	if not applicants:
		if already:
			# Everyone is already grouped — the common case when someone clicks
			# Generate a second time. Say so instead of rebuilding the hall.
			frappe.throw(
				_("Every {0} candidate on this drive is already in a group for {1}. "
				  "Groups are only created for candidates who have not been grouped yet — "
				  "add the new candidates to the drive first, or use Regroup to redo the "
				  "groups that have not run.").format(frappe.bold(GD_POOL_STATUS),
				                                      frappe.bold(code)),
				title=_("Nothing new to group"),
			)
		frappe.throw(
			_("No {0} candidates found on this drive's campus invites.").format(frappe.bold(GD_POOL_STATUS))
		)
	for a in applicants:  # store the full name on the group member snapshot
		a.applicant_name = _full_name(a.applicant_name, a.get("custom_applicant_last_name"))

	by_role = {}
	for a in applicants:
		by_role.setdefault(a.job_opening or "", []).append(a)

	role_titles = {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", list(by_role)]},
		                        fields=["name", "job_title"])
	} if by_role else {}

	pools = _gd_pools(applicants, split_by, role_titles)
	# One interviewer takes one GD. The roster is dealt PER GROUP, not per panel, so a
	# second interviewer is free for the next group rather than sitting in on this one.
	panels, missing_user = _panels_for_round(doc, code)
	pick_panel = _gd_panel_picker(panels) if assign_panels else (lambda role: None)

	# Keep the groups that must survive: the frozen ones always, and on an add-only run
	# the not-yet-run ones too. Other rounds' rows are never touched.
	keep_groups = frozen_groups if rebuild else frozen_groups + open_groups
	keep_names = {g.group_name for g in keep_groups}
	doc.set("gd_groups", [g for g in (doc.gd_groups or []) if g.round_code != code]
	        + list(keep_groups))
	doc.set("gd_group_members",
	        [m for m in (doc.gd_group_members or []) if m.round_code != code]
	        + [m for m in round_members if m.group_name in keep_names])

	# Continue the numbering rather than restarting at 1 — "Group 3" must not come to
	# mean a different set of people than it did this morning.
	group_no = _highest_group_no(keep_names)
	made_groups, made_members = 0, 0
	for (role, role_title, institute, ordered) in pools:
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
				"institute": institute,
				"panel_name": pick_panel(role),
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
		"split_by": split_by,
		"panels": len(panels),
		"missing_user": missing_user,
		# What was left alone, so the UI can say "3 new groups, 7 kept" rather than
		# leaving HR to wonder whether the finished ones were rebuilt.
		"rebuild": bool(rebuild),
		"panels_assigned": bool(assign_panels),
		"frozen_groups": len(frozen_groups),
		"kept_groups": len(keep_names),
		"already_grouped": len(spoken_for),
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


def _assert_group_open(campus_drive, round_code, group_name):
	"""Refuse to change a group whose results have already been pushed.

	Once a GD is pushed its candidates have moved on (or been rejected) on the strength
	of those marks. Editing attendance or a verdict afterwards would leave the group
	saying one thing and the pipeline another, with nothing to reconcile them.
	"""
	status = frappe.db.get_value(
		GD_GROUP_DT,
		{"parent": campus_drive, "parenttype": "Campus Drive",
		 "round_code": round_code, "group_name": group_name},
		"group_status",
	)
	if status == GD_FROZEN_STATUS:
		frappe.throw(
			_("{0} is completed — its results have already been pushed and its "
			  "candidates have moved on. A completed group cannot be changed.")
			.format(frappe.bold(group_name)),
			title=_("Group is completed"),
		)


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
	_assert_group_open(campus_drive, row.round_code, row.group_name)
	frappe.db.set_value(GD_MEMBER_DT, row.name, field, value, update_modified=False)
	frappe.db.commit()
	return {"row": row.name, "field": field, "value": value}


@frappe.whitelist()
def bulk_gd_attendance(campus_drive, round_code, group_name, value):
	"""Mark every candidate in one GD group Present / Absent / Pending."""
	if value not in ("Pending", "Present", "Absent"):
		frappe.throw(_("{0} is not a valid attendance value.").format(value))
	_gd_guard(campus_drive)
	_assert_group_open(campus_drive, round_code, group_name)
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
def set_gd_group_panel(campus_drive, round_code, group_name, panel=None):
	"""Put one GD group in the hands of a panel (or clear it) — the panel that shows
	on the group card, so its interviewers know which GD they take."""
	_gd_guard(campus_drive)
	_assert_group_open(campus_drive, round_code, group_name)
	panel = (panel or "").strip() or None
	doc = _drive_lite(campus_drive)
	if panel and panel not in _panels_for_round(doc, round_code)[0]:
		frappe.throw(_("{0} is not a panel on this round.").format(panel))
	grp = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": round_code, "group_name": group_name}, "name")
	if not grp:
		frappe.throw(_("Group {0} not found on this drive.").format(group_name))
	frappe.db.set_value(GD_GROUP_DT, grp, "panel_name", panel, update_modified=False)
	frappe.db.commit()
	return {"group_name": group_name, "panel": panel}


@frappe.whitelist()
def assign_gd_panels(campus_drive, round_code):
	"""Deal this round's panels across its existing GD groups, round-robin and
	role-aware — so panels can be staffed (or changed) after the groups were built,
	without regrouping the candidates."""
	_gd_guard(campus_drive)
	doc = _drive_lite(campus_drive)
	panels, missing_user = _panels_for_round(doc, round_code)
	if not panels:
		frappe.throw(
			_("Add Round Panelists for round {0} first — a panel name and its interviewers.").format(round_code)
		)
	pick_panel = _gd_panel_picker(panels)
	groups = frappe.get_all(
		GD_GROUP_DT,
		filters={"parent": campus_drive, "parenttype": "Campus Drive", "round_code": round_code},
		fields=["name", "job_opening"], order_by="idx asc",
	)
	for g in groups:
		frappe.db.set_value(GD_GROUP_DT, g.name, "panel_name", pick_panel(g.job_opening),
		                    update_modified=False)
	frappe.db.commit()
	return {"groups": len(groups), "panels": len(panels), "missing_user": missing_user}


@frappe.whitelist()
def move_gd_member(campus_drive, row_name, target_group):
	"""Move one candidate into another group of the SAME round and SAME role, and
	refresh both groups' counts."""
	_gd_guard(campus_drive)
	row = _gd_member_row(campus_drive, row_name)
	if target_group == row.group_name:
		return {"moved": False}
	# Neither end may be a finished group: moving someone out rewrites a pushed
	# result, moving someone in adds them to a GD that has already happened.
	_assert_group_open(campus_drive, row.round_code, row.group_name)
	_assert_group_open(campus_drive, row.round_code, target_group)

	grp = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": row.round_code, "group_name": target_group},
		["name", "job_opening", "institute"], as_dict=True)
	if not grp:
		frappe.throw(_("Group {0} not found in this round.").format(target_group))
	# Only the dimensions the groups were SPLIT by are restricted (they're set on the
	# group row). A drive-wide split mixes roles and colleges by design, so any move
	# within it is fine.
	src = frappe.db.get_value(GD_GROUP_DT, {
		"parent": campus_drive, "parenttype": "Campus Drive",
		"round_code": row.round_code, "group_name": row.group_name},
		["job_opening", "institute"], as_dict=True) or {}
	if grp.job_opening and src.get("job_opening") and grp.job_opening != src["job_opening"]:
		frappe.throw(_("These GD groups are per role — a candidate can only move within the same role."))
	if grp.institute and src.get("institute") and grp.institute != src["institute"]:
		frappe.throw(_("These GD groups are per institute — a candidate can only move within the same institute."))

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

# Shared interview types for a round given to one candidate only — a re-test after a
# weak showing, say. ONE name, reused across every candidate and every round: what
# varies is the reason, which is captured on the interview and on the candidate's
# workflow history — naming the type after the situation ("Technical Round 3") grows
# the master list by a row per person and leaves behind names nobody can define later.
#
# HRMS forbids a candidate sitting the same interview type twice, so a candidate
# needing a SECOND additional round gets the next free variant of this name — see
# _extra_round_type_for. HR never picks a number; they only ever see "Additional Round".
EXTRA_ROUND_TYPE = "Additional Round"

# An additional round is judged by its OWN panel, not by the panel that judged the
# round it hangs off. Those panelists live in the same Round Panelists table under a
# round code derived from that round: R3 -> R3-EXTRA.
#
# Previously every panel on the drive was offered here. That quietly put a candidate
# in front of interviewers nobody had assigned to a second look — the roster said
# "Technical Round 2 · Panel 1" while the interview was an Additional Round — and it
# made a re-test unauditable, because there was no row anywhere saying who was meant
# to take additional rounds. Requiring an explicit roster makes that a deliberate
# setup step instead of a side effect of whoever happened to be on the drive.
EXTRA_PANEL_SUFFIX = "-EXTRA"


def extra_panel_round_code(round_code):
	"""The Round Panelists code an additional round on `round_code` reads.

	Idempotent, so a code that already carries the suffix is returned unchanged (the
	dialog sends the resolved code back on submit).
	"""
	code = (round_code or "").strip()
	if not code:
		return None
	return code if code.endswith(EXTRA_PANEL_SUFFIX) else f"{code}{EXTRA_PANEL_SUFFIX}"


def _round_by_code(doc, round_code):
	row = next((r for r in (doc.rounds or []) if r.round_code == round_code), None)
	if not row:
		frappe.throw(_("No round with code {0} on this drive.").format(round_code))
	return row


def _full_name(first, last):
	"""Full candidate name for display: campus applications store the first name in
	`applicant_name` and the surname in `custom_applicant_last_name`, so combine them
	(guarding against a surname already present in the first field)."""
	full = (first or "").strip()
	last = (last or "").strip()
	if last and last.lower() not in full.lower():
		full = (full + " " + last).strip()
	return full or last


def _applicant_full_names(ja_names):
	"""Map {job_applicant: full name} for a set of Job Applicants, in one query."""
	ja_names = [n for n in set(ja_names) if n]
	if not ja_names:
		return {}
	return {
		r.name: _full_name(r.applicant_name, r.get("custom_applicant_last_name"))
		for r in frappe.get_all(
			"Job Applicant", filters={"name": ["in", ja_names]},
			fields=["name", "applicant_name", "custom_applicant_last_name"],
		)
	}


# Interview fields THIS module already sets — never touched by the auto-filler.
_INTERVIEW_CORE_FIELDS = {
	"job_applicant", "job_opening", "interview_round", "interview_type", "designation",
	"scheduled_on", "from_time", "to_time", "status", "custom_campus_drive",
	"custom_campus_round_code", "custom_interview_panel", "interview_details",
}


def _set_interview_round(iv, round_name):
	"""Set the interview round on whatever field links to it.

	Both the fieldname and the target doctype differ across HRMS versions — v15
	has ``interview_round`` → "Interview Round", v16 renamed it to
	``interview_type`` → "Interview Type" — so we target EVERY Link field whose
	options is the doctype this version actually uses (resolved once by
	``get_interview_round_doctype``) instead of hardcoding a name. This is why the
	round wasn't landing on v16: our old ``iv.interview_round = ...`` set a field
	that no longer exists there.
	"""
	from recruitment.api.hiring_stage import get_interview_round_doctype

	round_doctype = get_interview_round_doctype()
	targets = [df.fieldname for df in iv.meta.fields
	           if df.fieldtype == "Link" and round_doctype and df.options == round_doctype]
	if not targets and iv.meta.get_field("interview_round"):
		targets = ["interview_round"]
	for fn in targets:
		iv.set(fn, round_name)
	return targets


def _interview_autofill_defaults():
	"""Compute default values for mandatory Interview fields ONCE per bulk run.

	This is the version-safety net: HRMS v16 made ``interview_type`` a required stock
	field that v15 didn't have, and different client sites add their own required
	fields — we can't hardcode each, so we default every reqd, non-core field:

	  - Select      -> "On-Site" if offered, else the first option
	  - Data / Text -> "On-Site" for a *type*-ish field, else a neutral "Campus Drive"
	  - Link        -> any existing record of the target doctype (just to satisfy the
	                   constraint; HR can correct it on the Interview if needed)

	Computed once and reused across all interviews in a schedule — the meta scan and
	the link-master lookups do NOT repeat per row (that was a query per interview).
	"""
	defaults = {}
	for df in frappe.get_meta("Interview").fields:
		if not df.reqd or df.fieldname in _INTERVIEW_CORE_FIELDS:
			continue
		ftype = df.fieldtype
		if ftype == "Select":
			options = [o.strip() for o in (df.options or "").split("\n") if o.strip()]
			if options:
				defaults[df.fieldname] = "On-Site" if "On-Site" in options else options[0]
		elif ftype in ("Data", "Small Text", "Text", "Long Text"):
			label_blob = f"{df.fieldname} {df.label or ''}".lower()
			defaults[df.fieldname] = "On-Site" if "type" in label_blob else "Campus Drive"
		elif ftype == "Link" and df.options:
			rec = frappe.db.get_value(df.options, {}, "name")  # one lookup, cached here
			if rec:
				defaults[df.fieldname] = rec
	return defaults


def _apply_interview_defaults(iv, defaults):
	"""Apply the precomputed defaults to one Interview, without overriding set values."""
	for fieldname, value in (defaults or {}).items():
		if not iv.get(fieldname):
			iv.set(fieldname, value)


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
	                                                    "job_opening", "region"]),
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
	"""Group this round's panelists into panels:
	``{panel_name: {"users":[...], "role":opening, "region":region}}``.

	Interview Detail.interviewer is a User, while panelists are Employees — so we map
	through Employee.user_id and skip anyone without a login.

	``role`` and ``region`` are both optional tags taken off the panelist rows: blank
	means "covers everything". A drive that sets neither behaves exactly as it always
	has, which is why existing drives need no migration.

	A panel is its NAME **within its role and region**, not the name alone. Rows that
	share a name but name different regions are different panels — Karnataka's
	"Panel 1" and Maharashtra's "Panel 1" are two panels, and merging them put both
	regions' interviewers on one interview: the transferred candidate got the panel
	they were moved to AND the one they were moved away from. Where a name is reused
	it is qualified for display ("Panel 1 · Maharashtra"), because that label is what
	the interview stores and the board groups by.
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
		key = (r.panel_name or "Panel 1", r.job_opening or None, r.get("region") or None)
		if key not in panels:
			panels[key] = {"users": [], "role": key[1], "region": key[2]}
			order.append(key)
		if user not in panels[key]["users"]:
			panels[key]["users"].append(user)

	# Same name, different role/region -> qualify the label so the two are tellable
	# apart wherever a panel is shown or stored.
	seen = Counter(key[0] for key in order)
	out = {}
	for key in order:
		name, role, region = key
		label = name
		if seen[name] > 1:
			tag = region or role
			label = f"{name} · {tag}" if tag else name
			# Two unqualified rows of the same name would still collide; number them.
			suffix = 2
			while label in out:
				label, suffix = f"{name} · {tag or ''} {suffix}".strip(), suffix + 1
		out[label] = panels[key]
	return out, missing


# Job Applicant columns the region resolver reads, in the order it prefers them.
_REGION_FIELDS = ["custom_interview_region", "custom_region", "custom_campus_invite"]


def _invite_region_map(invites):
	"""``{Campus Invite: region}`` in one query, for the legacy fallback below."""
	if not invites:
		return {}
	return {
		r.name: r.region
		for r in frappe.get_all("Campus Invite", filters={"name": ["in", list(invites)]},
		                        fields=["name", "region"])
	}


def _region_names(regions):
	"""``{Region: location_region}`` — the human label ("Karnataka") for a Region ID."""
	regions = {r for r in regions if r}
	if not regions:
		return {}
	return {
		r.name: r.location_region
		for r in frappe.get_all("Region", filters={"name": ["in", list(regions)]},
		                        fields=["name", "location_region"])
	}


def _effective_region(cand, invite_regions):
	"""The region whose panel should interview this candidate.

	An approved transfer sets ``custom_interview_region``; everyone else is
	interviewed by the region they applied under. ``custom_region`` is fetched from
	the Campus Invite on save, so candidates last saved before that field shipped
	fall back to reading the invite directly — no backfill needed.
	"""
	return (cand.get("custom_interview_region")
	        or cand.get("custom_region")
	        or invite_regions.get(cand.get("custom_campus_invite")))


def _regions_without_panel(panels, candidates, home_regions=None):
	"""``{region: [candidate, ...]}`` for the regions no panel on this round covers.

	A candidate HR transferred (``custom_interview_region``) is interviewed by the
	region they were moved TO — so a panel for that region has to exist, or nobody
	can take their interview. `region` is resolved once by get_round_pool.
	"""
	missing, checked = {}, {}
	for cand in candidates:
		region = cand.get("region")
		if region not in checked:
			checked[region] = bool(_panels_serving_region(panels, region, home_regions))
		if not checked[region]:
			missing.setdefault(region, []).append(cand)
	return missing


def _assert_region_panels(panels, pool, round_code, home_regions=None):
	"""Refuse to schedule when a candidate's region has no panel on this round.

	Silently skipping them was how a transferred candidate went missing: the round
	reported "28 scheduled" and nobody noticed the 29th had nowhere to go. Named
	regions and counts, so the fix is one Round Panelist away.
	"""
	missing = _regions_without_panel(panels, pool, home_regions)
	if not missing:
		return

	labels = _region_names([r for r in missing if r])
	lines = []
	for region, candidates in sorted(missing.items(), key=lambda kv: str(kv[0])):
		who = ", ".join(c.get("applicant_name") or c.name for c in candidates[:5])
		if len(candidates) > 5:
			who += _(" and {0} more").format(len(candidates) - 5)
		lines.append("<li><b>{0}</b> — {1} candidate(s): {2}</li>".format(
			frappe.utils.escape_html(labels.get(region) or region or _("(no region set)")),
			len(candidates), frappe.utils.escape_html(who)))

	frappe.throw(
		_("No panel on round {0} covers these regions, so their interviews cannot be "
		  "created:").format(frappe.bold(round_code))
		+ "<ul>" + "".join(lines) + "</ul>"
		+ _("Add a Round Panelist for this round with that Region — or leave a panel's "
		    "Region blank, which covers every region — and schedule again."),
		title=_("Set up a panel for this region"),
	)


def _drive_home_regions(doc):
	"""The regions this drive is actually running in — its campus invites' own.

	A Karnataka drive's panels are Karnataka's unless they say otherwise; that is
	what an untagged panel means. Empty when the invites carry no region at all, and
	then regions play no part in the drive (see _panels_serving_region).
	"""
	return {r for r in _invite_region_map(_drive_invites(doc)).values() if r}


def _panels_serving_region(panels, region, home_regions=None):
	"""Panels that may interview a candidate of `region`.

	Region is a HARD filter, unlike role: the point of a transfer is that the target
	region's panel conducts the interview, so falling back to some other region's
	panel would quietly defeat it.

	An UNTAGGED panel is the drive's own panel, so it covers the drive's own regions
	(`home_regions`) — the candidates who did not ask to go anywhere. A candidate
	moved to another region is served only by a panel tagged with that region: a
	Karnataka drive's panel does not quietly take the candidate who asked for
	Maharashtra, which is the whole point of asking.

	With no `home_regions` — a drive whose invites name no region — regions play no
	part and an untagged panel covers everyone, exactly as before.
	"""
	if not home_regions:
		return {k: v for k, v in panels.items() if not v["region"] or v["region"] == region}
	# A candidate with no resolvable region at all is treated as the drive's own,
	# rather than being stranded by a rule about transfers they never made.
	at_home = not region or region in home_regions
	return {
		k: v for k, v in panels.items()
		if (v["region"] == region) or (not v["region"] and at_home)
	}


def _round_kind(row, stage_type):
	"""Which body a round drives: ``"pre_offer"``, ``"offer"``, or None (a normal
	interview/assessment round).

	Decided by the **hiring stage the round is mapped to**, not by a second switch
	of its own. That keeps the Job Opening's ``custom_enable_pre_job_offer``
	checkbox as the single source of truth: ``get_opening_stages`` appends the
	virtual "Pre Job Offer" stage only when it is checked, so a round can only be
	mapped to a Pre Offer stage on openings that enabled it — and on openings that
	didn't, the same round maps to the Offer stage and raises Job Offers instead.

	``round_type`` is still honoured as a fallback so drives configured before the
	stage drove this keep working unchanged.
	"""
	stage = (row.hiring_stage or "").strip()
	declared = (row.round_type or "").strip()
	if (stage_type or {}).get(stage) == "Pre Offer" or declared == "Pre Offer":
		return "pre_offer"
	if (stage_type or {}).get(stage) == "Offer" or declared == "Offer":
		return "offer"
	return None


def _terminal_round_pool(campus_drive, round_code):
	"""``(stage, [Job Applicant rows])`` for a terminal (Offer / Pre Offer) round —
	everyone parked at that round's hiring stage, i.e. who cleared everything before
	it. Shared by the offer and pre-offer candidate lists so both read the pipeline
	the same way."""
	doc = _drive_lite(campus_drive)
	row = _round_by_code(doc, round_code)
	stage = (row.hiring_stage or "").strip()
	if not stage:
		frappe.throw(_("Set the Hiring Stage on round {0} first.").format(round_code))

	invites = _drive_invites(doc)
	if not invites:
		return stage, []

	return stage, frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invites], "custom_current_stage": stage,
		         "status": ["not in", PARKED_STATUSES]},
		fields=["name", "applicant_name", "custom_applicant_last_name",
		        "custom_institute as institute", "job_title as job_opening",
		        "designation", "status"],
		order_by="job_title asc, name asc",
	)


def _candidate_card(r, **extra):
	card = {
		"name": r.name,
		"applicant_name": _full_name(r.applicant_name, r.get("custom_applicant_last_name")),
		"institute": r.institute,
		"job_opening": r.job_opening,
		"designation": r.designation,
	}
	card.update(extra)
	return card


# An additional round that has not reached a verdict. Anything other than Cleared or
# Rejected is still undecided — Pending, Under Review, Appeared, and any status a site
# adds — so the list is what a verdict IS, not what it is not.
EXTRA_ROUND_DECIDED = ("Cleared", "Rejected")


def pending_extra_rounds(job_applicants):
	"""``{job applicant: interview}`` for anyone whose additional round is undecided.

	A second look that has not concluded is exactly that: not concluded. Offering the
	candidate anyway makes the round pointless — the panel is still being asked for a
	verdict on somebody who has already been hired.
	"""
	names = [n for n in dict.fromkeys(job_applicants or []) if n]
	if not names:
		return {}
	rows = frappe.get_all(
		"Interview",
		filters={
			"job_applicant": ["in", names],
			"custom_campus_drive": ["is", "set"],
			"custom_extra_interview_reason": ["is", "set"],
			"status": ["not in", EXTRA_ROUND_DECIDED],
			"docstatus": ["<", 2],
		},
		fields=["name", "job_applicant", "status"],
		order_by="creation asc",
	)
	return {r.job_applicant: r.name for r in rows}


def _assert_no_pending_extra_round(job_applicants, action):
	"""Refuse a terminal action for anyone still sitting an additional round."""
	pending = pending_extra_rounds(job_applicants)
	if not pending:
		return
	names = _applicant_full_names(list(pending))
	listed = ", ".join(
		f"{frappe.bold(names.get(ja) or ja)} ({pending[ja]})" for ja in sorted(pending)
	)
	frappe.throw(
		_("{0} still has an Additional Round waiting for a verdict, so {1} cannot be "
		  "done yet. Record the panel's verdict on that round first — clearing it "
		  "moves them on, rejecting it rejects them.").format(listed, action),
		title=_("Additional Round not decided"),
	)


@frappe.whitelist()
def get_offer_candidates(campus_drive, round_code):
	"""Candidates who have reached an Offer round's stage — i.e. cleared everything
	before it — so HR can select them and raise Job Offers straight from the drive.

	Flags anyone who already has a Job Offer so they aren't offered twice, and anyone
	whose Additional Round has not been decided — offering them would settle a
	candidate the panel is still being asked to judge.
	"""
	stage, rows = _terminal_round_pool(campus_drive, round_code)
	names = [r.name for r in rows]
	# The offer's NAME, not just "there is one" — the board links straight to it, so
	# HR can open what was actually sent instead of hunting for it in the Job Offer
	# list. Newest first: an amended offer supersedes the one it replaced.
	with_offer = {}
	if names:
		for row in frappe.get_all(
			"Job Offer",
			filters={"job_applicant": ["in", names], "docstatus": ["!=", 2]},
			fields=["name", "job_applicant", "status"],
			order_by="creation desc",
		):
			with_offer.setdefault(row.job_applicant, row)
	pending = pending_extra_rounds(names)

	return {
		"stage": stage,
		"candidates": [
			_candidate_card(
				r,
				has_offer=r.name in with_offer,
				job_offer=(with_offer.get(r.name) or {}).get("name"),
				job_offer_status=(with_offer.get(r.name) or {}).get("status"),
				pending_extra_round=pending.get(r.name),
			)
			for r in rows
		],
	}


@frappe.whitelist()
def get_pre_offer_candidates(campus_drive, round_code):
	"""Candidates who have reached a Pre Offer round's stage, so HR can send them the
	pre-offer form straight from the drive.

	Unlike a Job Offer, a pre-offer is legitimately re-sendable — each send is a new
	round (see ``_send_pre_offer_for_applicant``) — so an already-sent candidate is
	flagged but NOT locked out; the UI just leaves them unticked so a bulk click
	can't re-spam them by accident.
	"""
	stage, rows = _terminal_round_pool(campus_drive, round_code)
	names = [r.name for r in rows]
	already_sent = set(frappe.get_all(
		"Job Applicant Pre Offer Form",
		filters={"parenttype": "Job Applicant", "parent": ["in", names or [""]],
		         "status": ["in", ("Sent", "Filled", "Reviewed")]},
		pluck="parent")) if names else set()

	return {
		"stage": stage,
		"candidates": [_candidate_card(r, pre_offer_sent=r.name in already_sent) for r in rows],
	}


@frappe.whitelist()
def create_offers_for_candidates(campus_drive, applicants):
	"""Raise Job Offers for the selected candidates (reuses the shared bulk creator so
	the offer records are built exactly like the rest of the app)."""
	from recruitment.api.bulk_job_offer import create_bulk_job_offer

	_gd_guard(campus_drive)
	if isinstance(applicants, str):
		applicants = frappe.parse_json(applicants)
	_assert_no_pending_extra_round(applicants, _("a Job Offer"))
	return create_bulk_job_offer(applicants)


@frappe.whitelist()
def send_pre_offers_for_candidates(campus_drive, applicants):
	"""Send the pre-offer form to the selected candidates (reuses the shared bulk
	sender, so the forms and Action Center items are raised exactly as they are from
	the Job Applicant flow)."""
	from recruitment.api.action_center import send_bulk_pre_offer

	_gd_guard(campus_drive)
	if isinstance(applicants, str):
		applicants = frappe.parse_json(applicants)
	_assert_no_pending_extra_round(applicants, _("the pre-offer form"))
	return send_bulk_pre_offer(applicants)


@frappe.whitelist()
def get_round_pool(campus_drive, round_code):
	"""Candidates waiting at this round's hiring stage, grouped by role.

	Returns the pool plus anyone already scheduled, so the UI can show what a
	"Schedule" click would actually do before doing it.
	"""
	# Lite, not get_doc: this needs the rounds and the invites, and a full load would
	# drag in every GD group and member row on the drive to read two fields.
	doc = _drive_lite(campus_drive)
	row = _round_by_code(doc, round_code)
	stage = (row.hiring_stage or "").strip()
	if not stage:
		frappe.throw(_("Set the <b>Hiring Stage</b> on round {0} first.").format(round_code))

	invites = _drive_invites(doc)
	if not invites:
		return {"stage": stage, "pool": [], "scheduled": 0}

	pool = frappe.get_all(
		"Job Applicant",
		filters={"custom_campus_invite": ["in", invites], "custom_current_stage": stage,
		         "status": ["not in", PARKED_STATUSES]},
		fields=["name", "applicant_name", "custom_applicant_last_name",
		        "custom_institute as institute", "job_title as job_opening", "designation",
		        *_REGION_FIELDS],
		order_by="job_title asc, name asc",
	)
	invite_regions = _invite_region_map({c.get("custom_campus_invite") for c in pool})
	for c in pool:  # show full name in the schedule picker
		c["applicant_name"] = _full_name(c.applicant_name, c.get("custom_applicant_last_name"))
		# Surfaced so the schedule picker can show who is being interviewed by a
		# region other than their own before anyone clicks Schedule.
		c["region"] = _effective_region(c, invite_regions)
		c["transferred"] = bool(c.get("custom_interview_region"))
	# Region IDs read as REGION_15; the picker wants "Karnataka".
	region_names = _region_names({c["region"] for c in pool})
	for c in pool:
		c["region_name"] = region_names.get(c["region"]) or c["region"]
	already = set(frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "docstatus": ["<", 2]},
		pluck="job_applicant",
	))
	# Anyone whose Additional Round has not been decided is held out of the schedulable
	# pool — but reported, not hidden. A candidate silently missing from a round is the
	# thing HR cannot debug; one listed as "held, second look pending" explains itself.
	held = pending_extra_rounds([p.name for p in pool])
	return {
		"stage": stage,
		"pool": [p for p in pool if p.name not in already and p.name not in held],
		"held": [
			{**p, "pending_extra_round": held[p.name]}
			for p in pool if p.name in held and p.name not in already
		],
		# Counted off the interviews, not off the stage-filtered pool: a candidate
		# given an EXTRA interview on this round sits at some other stage, so counting
		# via the pool made them vanish from the round entirely — the round showed
		# their interview in its totals but denied anyone was scheduled for it.
		"already_scheduled": len(already),
	}


@frappe.whitelist()
def schedule_round_interviews(campus_drive, round_code, scheduled_on=None,
                              from_time=None, to_time=None, applicants=None,
                              assignments=None, mode=None):
	"""Bulk-create Interviews for everyone waiting at this round's stage.

	ONE interviewer per interview. Candidates are dealt round-robin across the round's
	individual interviewers — the second candidate goes to the second interviewer, not
	to the same one — so an interview never carries two people. Panels tagged with a
	role only take that role's candidates (per-role scheduling); untagged panels take
	anyone.

	``assignments`` is the manual route: ``{job applicant: interviewer}`` for the
	candidates HR wants to place by hand. Named candidates go to the named interviewer,
	everyone else is dealt automatically, so a round can be part-assigned.

	``mode`` overrides the drive's Drive Type for this batch — an otherwise on-site
	drive running one round over video, say. Omit it to use the drive's own.
	"""
	from recruitment.api.hiring_stage import _ensure_interview_round

	# Lite: the rounds and the panel roster are all this reads off the drive.
	doc = _drive_lite(campus_drive)
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

	mode = _resolve_mode(campus_drive, mode)

	data = get_round_pool(campus_drive, round_code)
	pool = data["pool"]

	# Optional explicit selection — schedule only these candidates (e.g. 30 today,
	# the rest tomorrow). Anything not in the eligible pool is ignored rather than
	# force-scheduled, so a stale UI can't create interviews for the wrong people.
	if applicants:
		if isinstance(applicants, str):
			applicants = frappe.parse_json(applicants)
		wanted = {a for a in (applicants or []) if a}
		# Named explicitly, so say why rather than dropping them from the result:
		# they were asked for by name and must not just vanish.
		_assert_no_pending_extra_round(sorted(wanted), _("scheduling this round"))
		pool = [p for p in pool if p.name in wanted]
		if not pool:
			frappe.throw(_("None of the selected candidates are still waiting at stage {0}.")
			             .format(frappe.bold(stage)))
	elif not pool:
		frappe.throw(_("Nobody is waiting at stage {0} for this drive.").format(frappe.bold(stage)))

	# The drive's own regions: an untagged panel covers those and no others, so a
	# candidate who asked for a different one needs a panel tagged with it.
	home_regions = _drive_home_regions(doc)
	_assert_region_panels(panels, pool, round_code, home_regions)

	# Explicit HR assignment: {job applicant: interviewer user}. Whatever is named here
	# overrides the automatic deal for that candidate; everyone else is dealt normally,
	# so a partly-assigned round is fine.
	by_applicant = assignments
	if isinstance(by_applicant, str):
		by_applicant = frappe.parse_json(by_applicant)
	by_applicant = {k: v for k, v in (by_applicant or {}).items() if k and v}
	roster_users, panel_of_user = set(), {}
	for pname, v in panels.items():
		for u in v["users"]:
			roster_users.add(u)
			panel_of_user.setdefault(u, pname)

	interview_round = _ensure_interview_round(stage)
	autofill = _interview_autofill_defaults()  # computed ONCE, reused for every row
	created, skipped, cursor, bucket_cache = [], [], {}, {}

	def _buckets_for(region):
		"""(by_role, general) INTERVIEWER SLOTS for the panels serving `region`.

		A slot is one ``(panel, interviewer)`` pair, not a panel. ONE interviewer takes
		ONE interview: flattening the roster to individuals is what makes the next
		candidate go to the next person, instead of every member of a panel being put
		on the same interview and then all of them having to file feedback on it.

		Cached per region — a drive has a handful of regions but can have hundreds of
		candidates.
		"""
		if region not in bucket_cache:
			serving = _panels_serving_region(panels, region, home_regions)
			# Panels that name a role serve only that role; the rest are general-purpose.
			by_role, general = {}, []
			for k, v in serving.items():
				slots = [(k, u) for u in v["users"]]
				if v["role"]:
					by_role.setdefault(v["role"], []).extend(slots)
				else:
					general.extend(slots)
			bucket_cache[region] = (by_role, general)
		return bucket_cache[region]

	for cand in pool:
		# Region narrows the panel set first, then the existing role preference picks
		# within it — so a candidate transferred into another region is dealt only to
		# that region's panels, and never silently to their original region's.
		# `region` is resolved once by get_round_pool, which built this pool.
		region = cand.get("region")
		by_role, general = _buckets_for(region)
		if not by_role and not general:
			skipped.append({"applicant": cand.name,
			                "reason": f"no panel for region {region or '(unset)'}"})
			continue

		choices = by_role.get(cand.job_opening) or general
		if not choices:
			skipped.append({"applicant": cand.name, "reason": "no panel for this role"})
			continue
		# Round-robin per distinct panel SET, not per (role, region): candidates who
		# can go to the same panels share one cursor and so are dealt evenly across
		# them. Keying on role/region instead would restart every group at the first
		# panel and pile everyone onto it whenever panels are untagged.
		bucket = tuple(choices)
		i = cursor.get(bucket, 0)
		panel_name, interviewer = choices[i % len(choices)]
		cursor[bucket] = i + 1

		# HR may name the interviewer for a specific candidate; that always wins over
		# the round-robin. Anyone named must still be on this round's roster, so a
		# stale form cannot post an interview to somebody who is not on the panel.
		chosen = by_applicant.get(cand.name)
		if chosen:
			if chosen not in roster_users:
				skipped.append({"applicant": cand.name,
				                "reason": f"{chosen} is not on round {round_code}'s panel"})
				continue
			interviewer = chosen
			panel_name = panel_of_user.get(chosen) or panel_name

		try:
			iv = frappe.new_doc("Interview")
			iv.job_applicant = cand.name
			iv.job_opening = cand.job_opening
			_set_interview_round(iv, interview_round)
			iv.designation = cand.designation
			iv.scheduled_on = date
			iv.from_time = from_time or DEFAULT_DAY_START
			iv.to_time = to_time or DEFAULT_DAY_END
			iv.status = "Pending"
			# Exactly one interviewer. Two on an interview means two feedbacks and a
			# majority verdict, which is what was making the hiring workflow ambiguous.
			iv.append("interview_details", {"interviewer": interviewer})
			iv.custom_campus_drive = campus_drive
			iv.custom_campus_round_code = round_code
			iv.custom_interview_panel = panel_name
			# Before the defaults: the autofill's generic "On-Site" guess must not win
			# over the drive's actual Drive Type.
			_set_interview_mode(iv, mode)
			_apply_interview_defaults(iv, autofill)
			iv.flags.ignore_permissions = True
			iv.insert(ignore_permissions=True)
			created.append(iv.name)
		except Exception as e:
			skipped.append({"applicant": cand.name, "reason": f"{type(e).__name__}: {e}"})

	frappe.db.commit()
	return {
		"round_code": round_code, "stage": stage, "scheduled_on": date, "mode": mode,
		"created": len(created), "skipped": skipped[:10], "skipped_count": len(skipped),
		"panels": list(panels),
	}


# ---------------------------------------------------------------------------
# Assigning a candidate to an interviewer, by hand
#
# Two routes to the same record, because two different people need it:
#   * HR picks the interviewer for a candidate (assign_round_interviewer)
#   * an interviewer takes candidates for themselves (claim_round_candidates)
#
# Both create the SAME single-interviewer Interview the automatic deal creates, so a
# hand-placed candidate is not a second class of record with its own rules.
# ---------------------------------------------------------------------------

def _round_roster(campus_drive, round_code):
	"""``({user: panel}, missing)`` for everyone rostered on this round."""
	doc = _drive_lite(campus_drive)
	panels, missing = _panels_for_round(doc, round_code)
	by_user = {}
	for panel_name, v in panels.items():
		for user in v["users"]:
			by_user.setdefault(user, panel_name)
	return by_user, missing


@frappe.whitelist()
def get_round_assignment_options(campus_drive, round_code):
	"""Who is waiting, and who could take them — for the manual assignment picker."""
	frappe.has_permission("Campus Drive", "read", doc=campus_drive, throw=True)
	pool = get_round_pool(campus_drive, round_code)
	by_user, missing = _round_roster(campus_drive, round_code)
	names = {
		u.name: (u.full_name or u.name)
		for u in frappe.get_all("User", filters={"name": ["in", list(by_user) or [""]]},
		                        fields=["name", "full_name"])
	} if by_user else {}
	return {
		"round_code": round_code,
		"stage": pool.get("stage"),
		"candidates": pool.get("pool") or [],
		"interviewers": [
			{"user": u, "name": names.get(u, u), "panel": p} for u, p in by_user.items()
		],
		"missing_user": missing,
		"already_scheduled": pool.get("already_scheduled", 0),
		"modes": list(INTERVIEW_MODES),
		"drive_mode": _drive_mode(campus_drive),
	}


@frappe.whitelist()
def assign_round_interviewer(campus_drive, round_code, interviewer, applicants,
                             scheduled_on=None, from_time=None, to_time=None, mode=None):
	"""HR: put these candidates in front of THIS interviewer.

	Thin wrapper over the bulk scheduler so a hand-placed interview is built exactly
	like a dealt one — same round, same defaults, same single-interviewer rule.
	"""
	_gd_guard(campus_drive)
	if isinstance(applicants, str):
		applicants = frappe.parse_json(applicants)
	applicants = [a for a in (applicants or []) if a]
	if not applicants:
		frappe.throw(_("Pick at least one candidate."))
	if not interviewer:
		frappe.throw(_("Pick the interviewer who will take them."))

	by_user, _missing = _round_roster(campus_drive, round_code)
	if interviewer not in by_user:
		frappe.throw(
			_("{0} is not on round {1}'s panel. Add them to Round Panelists first.")
			.format(frappe.bold(interviewer), frappe.bold(round_code))
		)

	return schedule_round_interviews(
		campus_drive, round_code, scheduled_on=scheduled_on,
		from_time=from_time, to_time=to_time, applicants=applicants,
		assignments={a: interviewer for a in applicants}, mode=mode,
	)


@frappe.whitelist()
def claim_round_candidates(campus_drive, round_code, applicants, scheduled_on=None,
                          from_time=None, to_time=None):
	"""Interviewer: take these waiting candidates onto my own panel.

	The interviewer is the session user, never a parameter — otherwise this would be a
	way to book someone else's diary. They must already be rostered on the round, so
	claiming can only ever pull work an interviewer was eligible for anyway.
	"""
	user = frappe.session.user
	by_user, _missing = _round_roster(campus_drive, round_code)
	if user not in by_user:
		frappe.throw(
			_("You are not on round {0}'s panel, so there is nothing here to take.")
			.format(frappe.bold(round_code)),
			frappe.PermissionError,
		)
	if isinstance(applicants, str):
		applicants = frappe.parse_json(applicants)
	applicants = [a for a in (applicants or []) if a]
	if not applicants:
		frappe.throw(_("Pick at least one candidate to take."))

	# Deliberately NOT _gd_guard: an interviewer has no write permission on the drive,
	# and the only thing being created is an Interview naming themselves.
	return schedule_round_interviews(
		campus_drive, round_code, scheduled_on=scheduled_on,
		from_time=from_time, to_time=to_time, applicants=applicants,
		assignments={a: user for a in applicants},
	)


# Statuses past the point of moving: the interview has already produced its verdict.
_CONCLUDED_INTERVIEW_STATUSES = ("Cleared", "Rejected")


@frappe.whitelist()
def reassign_round_interview(campus_drive, interview, interviewer=None, mode=None):
	"""Move a scheduled interview to a different interviewer (and/or switch its mode).

	Panels are dealt round-robin, but they do not finish round-robin — one panelist
	gets three quick candidates and is free while another is still on their first. HR
	needs to hand the next candidate to whoever is free, and before this the only way
	was to cancel the interview and re-deal it.

	Refused once the interview has produced anything: a submitted feedback belongs to
	the person who gave it, and a Cleared/Rejected interview has already moved the
	candidate on. Those are re-run as an Additional Round, not quietly re-pointed.
	"""
	_gd_guard(campus_drive)
	if not interview:
		frappe.throw(_("Pick the interview to move."))

	iv = frappe.get_doc("Interview", interview)
	if iv.get("custom_campus_drive") != campus_drive:
		frappe.throw(
			_("Interview {0} does not belong to this campus drive.").format(frappe.bold(interview))
		)
	if iv.docstatus == 2:
		frappe.throw(_("Interview {0} is cancelled.").format(frappe.bold(interview)))

	round_code = iv.get("custom_campus_round_code")
	if frappe.db.exists("Interview Feedback", {"interview": interview, "docstatus": 1}):
		frappe.throw(
			_("Feedback has already been submitted on {0}, so it can no longer be moved. Give "
			  "this candidate an Additional Round instead.").format(frappe.bold(interview)),
			title=_("Feedback Already In"),
		)
	if iv.status in _CONCLUDED_INTERVIEW_STATUSES:
		frappe.throw(
			_("Interview {0} is already {1}. A concluded interview cannot be moved.").format(
				frappe.bold(interview), frappe.bold(iv.status)),
			title=_("Interview Concluded"),
		)

	was_who = [d.interviewer for d in (iv.interview_details or []) if d.interviewer]
	was_mode = iv.get(INTERVIEW_MODE_FIELD)
	changed = []

	if interviewer:
		by_user, _missing = _round_roster(campus_drive, round_code)
		if interviewer not in by_user:
			frappe.throw(
				_("{0} is not on round {1}'s panel. Add them to Round Panelists first.")
				.format(frappe.bold(interviewer), frappe.bold(round_code))
			)
		if was_who != [interviewer]:
			# Replaced, not appended: one interviewer per interview is what keeps the
			# verdict unambiguous (see schedule_round_interviews).
			iv.set("interview_details", [])
			iv.append("interview_details", {"interviewer": interviewer})
			iv.custom_interview_panel = by_user[interviewer]
			changed.append(_("interviewer {0} → {1}").format(
				", ".join(was_who) or _("nobody"), interviewer))

	if mode:
		mode = _resolve_mode(campus_drive, mode)
		if mode != was_mode:
			_set_interview_mode(iv, mode)
			changed.append(_("mode {0} → {1}").format(was_mode or _("unset"), mode))

	if not changed:
		return {"interview": interview, "changed": False}

	iv.flags.ignore_permissions = True
	iv.save(ignore_permissions=True)
	# Audit trail on the interview itself — a candidate moved between panelists is
	# exactly the kind of thing someone asks about afterwards.
	iv.add_comment("Info", _("Reassigned from the campus drive: {0}.").format("; ".join(changed)))
	frappe.db.commit()
	return {
		"interview": interview, "changed": True, "detail": "; ".join(changed),
		"interviewer": interviewer or (was_who[0] if was_who else None),
		"mode": iv.get(INTERVIEW_MODE_FIELD),
	}


@frappe.whitelist()
def get_round_interviews(campus_drive, round_code):
	"""Panel view for an interview round: each panel with its interviewers and the
	candidates assigned to it, showing each candidate's INTERVIEW status.

	Panel assignment creates one standard Interview per candidate (see
	schedule_round_interviews), stamped with the panel name. Feedback is given on
	those Interview records and the verdict advances the candidate automatically —
	the drive never marks Pass/Fail itself.

	What it DOES let HR do is move a candidate to another interviewer
	(`reassign_round_interview`), so every row carries who currently holds it and
	whether it can still be moved, and every interviewer carries their live load —
	panels finish at different speeds, and the point is to spot who is free.
	"""
	doc = _drive_lite(campus_drive)
	panels, missing = _panels_for_round(doc, round_code)
	users = set()
	for v in panels.values():
		users.update(v["users"])
	names = {
		u.name: (u.full_name or u.name)
		for u in frappe.get_all("User", filters={"name": ["in", list(users)]},
		                        fields=["name", "full_name"])
	} if users else {}

	mode_field = ("custom_interview_type as mode"
	              if frappe.get_meta("Interview").has_field(INTERVIEW_MODE_FIELD) else None)
	ivs = frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "docstatus": ["<", 2]},
		fields=["name", "job_applicant", "status", "custom_interview_panel as panel",
		        "scheduled_on"] + ([mode_field] if mode_field else []),
		limit_page_length=0,
	)
	iv_names = [i.name for i in ivs]
	applicant_name = _applicant_full_names([i.job_applicant for i in ivs])
	got, expected, holder = {}, {}, {}
	if iv_names:
		for f in frappe.get_all("Interview Feedback",
		                        filters={"interview": ["in", iv_names], "docstatus": 1},
		                        fields=["interview"], limit_page_length=0):
			got[f.interview] = got.get(f.interview, 0) + 1
		for de in frappe.get_all("Interview Detail",
		                         filters={"parent": ["in", iv_names], "parenttype": "Interview"},
		                         fields=["parent", "interviewer"], order_by="parent asc, idx asc",
		                         limit_page_length=0):
			expected[de.parent] = expected.get(de.parent, 0) + 1
			# One interviewer per interview is the rule, so the first row IS the holder.
			if de.interviewer and de.parent not in holder:
				holder[de.parent] = de.interviewer

	# Live load per interviewer: what is still on their plate vs what they are through
	# with. This is what tells HR whose queue to top up.
	load = {}
	by_panel = {}
	for i in ivs:
		who = holder.get(i.name)
		done = bool(got.get(i.name)) or i.status in _CONCLUDED_INTERVIEW_STATUSES
		if who:
			bucket = load.setdefault(who, {"done": 0, "pending": 0})
			bucket["done" if done else "pending"] += 1
		by_panel.setdefault(i.panel or "", []).append({
			"interview": i.name,
			"job_applicant": i.job_applicant,
			"applicant_name": applicant_name.get(i.job_applicant, i.job_applicant),
			"status": i.status,
			"scheduled_on": str(i.scheduled_on) if i.scheduled_on else None,
			"feedback_got": got.get(i.name, 0),
			"feedback_expected": expected.get(i.name, 0),
			"interviewer": who,
			"interviewer_name": names.get(who, who) if who else None,
			"mode": i.get("mode"),
			# Mirrors reassign_round_interview's own refusals, so the UI only offers
			# Reassign where the server would actually allow it.
			"can_reassign": not done,
		})

	out = []
	for panel_name, v in panels.items():
		out.append({
			"panel": panel_name,
			"role": v["role"],
			"interviewers": [{"user": u, "name": names.get(u, u)} for u in v["users"]],
			"candidates": by_panel.get(panel_name, []),
		})
	for panel_name, rows in by_panel.items():
		if panel_name not in panels:
			out.append({"panel": panel_name or "(unassigned)", "role": None,
			            "interviewers": [], "candidates": rows})
	# Flat roster for the reassign picker: every rostered interviewer on this round,
	# whichever panel they sit on, with their load.
	roster = []
	for panel_name, v in panels.items():
		for user in v["users"]:
			stats = load.get(user) or {"done": 0, "pending": 0}
			roster.append({"user": user, "name": names.get(user, user), "panel": panel_name,
			               "done": stats["done"], "pending": stats["pending"]})
	return {"round_code": round_code, "panels": out, "missing_user": missing,
	        "total_interviews": len(ivs), "roster": roster,
	        "modes": list(INTERVIEW_MODES), "drive_mode": _drive_mode(campus_drive)}


def _gd_group_scope(groups):
	"""The group names a push is limited to — ``[]`` meaning the whole round.

	Arrives as a JSON list from the client (Frappe hands whitelisted args over as
	strings), or as a plain name / list from server-side callers.
	"""
	if not groups:
		return []
	if isinstance(groups, str):
		groups = frappe.parse_json(groups) if groups.strip().startswith("[") else [groups]
	return [g for g in groups if g]


@frappe.whitelist()
def apply_gd_results(campus_drive, round_code, groups=None):
	"""Push GD results into the hiring workflow — a whole round, or named groups.

	Every candidate BEING PUSHED must carry a verdict first: a Pending result blocks
	the push and the message names the groups still to be marked. A verdict is never
	inferred here — failing a candidate is the panel's call, so nobody is rejected for
	a box HR simply hasn't ticked yet.

	``groups`` scopes it: a group that has finished its GD can be sent to the next
	round straight away, without waiting for the rest of the hall.

	Pass -> the candidate lands on the stage AFTER the GD round's own hiring stage
	(so a pass always means "into the next round", wherever they were sitting before).
	Fail -> Rejected. Nobody is ever moved backwards.
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

	filters = {"parent": campus_drive, "parenttype": "Campus Drive", "round_code": round_code}
	wanted = _gd_group_scope(groups)
	if wanted:
		filters["group_name"] = ["in", wanted]

	rows = frappe.get_all(
		GD_MEMBER_DT, filters=filters,
		fields=["name", "group_name", "job_applicant", "result"],
	)
	if not rows:
		frappe.throw(
			_("Group {0} has no candidates on round {1}.").format(", ".join(wanted), round_code)
			if wanted else
			_("No GD groups on round {0} yet — create the groups first.").format(round_code)
		)

	# Only what is being pushed has to be complete: a group that has finished can go on
	# to the next round while the rest of the hall is still being marked.
	unmarked = [r for r in rows if r.result not in ("Pass", "Fail")]
	if unmarked:
		frappe.throw(
			_("{0} candidate(s) have no GD result yet — mark every candidate Pass or Fail "
			  "before pushing. Still to mark: {1}.").format(
				len(unmarked), ", ".join(sorted({r.group_name for r in unmarked})))
		)

	passed = failed = skipped = pending = 0
	# A GD verdict must not carry someone past an Additional Round that is still open.
	held = pending_extra_rounds([r.job_applicant for r in rows])
	stage_cache = {}  # opening -> stages; the pool shares only a handful of openings
	for r in rows:
		if not r.job_applicant or r.result not in ("Pass", "Fail"):
			pending += 1
			continue
		if r.job_applicant in held:
			skipped += 1
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

	# The GD is over for these groups: freeze them. A frozen group is never regrouped,
	# re-numbered or re-pooled, and its candidates are never offered a GD again — which
	# is what stops "generate groups" for three late arrivals from re-creating the whole
	# hall and running finished candidates through the flow a second time.
	frozen = _freeze_gd_groups(campus_drive, round_code,
	                           wanted or sorted({r.group_name for r in rows}))

	frappe.db.commit()
	return {"advanced": passed, "rejected": failed, "skipped": skipped,
	        "pending": pending, "total": len(rows), "groups": wanted,
	        "frozen": frozen,
	        "gd_stage": gd_stage, "moved_to": None if not gd_stage else "stage after " + gd_stage}


def _freeze_gd_groups(campus_drive, round_code, group_names):
	"""Mark the pushed groups Completed. Written with db.set_value so pushing results
	never bumps the drive's `modified` stamp under an open form."""
	names = [g for g in dict.fromkeys(group_names or []) if g]
	if not names:
		return []
	rows = frappe.get_all(
		GD_GROUP_DT,
		filters={"parent": campus_drive, "parenttype": "Campus Drive",
		         "round_code": round_code, "group_name": ["in", names]},
		fields=["name", "group_name", "group_status"],
	)
	frozen = []
	for row in rows:
		if row.group_status != GD_FROZEN_STATUS:
			frappe.db.set_value(GD_GROUP_DT, row.name, "group_status", GD_FROZEN_STATUS,
			                    update_modified=False)
		frozen.append(row.group_name)
	return frozen


@frappe.whitelist()
def reconcile_round(campus_drive, round_code):
	"""Re-sync a round's Cleared/Rejected interviews into the hiring pipeline.

	The auto-advance on feedback is best-effort — if saving the candidate failed at
	the time (e.g. a stale field value), the interview shows Cleared but the candidate
	never moved. This catches up any such stragglers. Safe to re-run: it only advances
	candidates STILL sitting at this round's stage, so already-advanced ones are left
	alone (never double-advanced).
	"""
	from recruitment.api.hiring_stage import get_opening_stages, _find_stage, _enter_stage

	_gd_guard(campus_drive)
	row = _round_by_code(frappe.get_doc("Campus Drive", campus_drive), round_code)
	stage = (row.hiring_stage or "").strip()
	if not stage:
		frappe.throw(_("Set the Hiring Stage on round {0} first.").format(round_code))

	ivs = frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "status": ["in", ["Cleared", "Rejected"]], "docstatus": ["<", 2]},
		fields=["name", "status", "job_applicant"],
	)
	advanced = rejected = skipped = 0
	stage_cache = {}
	for iv in ivs:
		try:
			ja = frappe.get_doc("Job Applicant", iv.job_applicant)
			if iv.status == "Rejected":
				if ja.status != "Rejected":
					ja.status = "Rejected"
					ja.save(ignore_permissions=True)
					rejected += 1
				else:
					skipped += 1
				continue
			# Cleared — advance only if still parked at THIS round's stage.
			if (ja.custom_current_stage or "") != stage:
				skipped += 1
				continue
			opening = ja.job_title
			if opening not in stage_cache:
				stage_cache[opening] = get_opening_stages(opening)
			stages = stage_cache[opening]
			idx = _find_stage(stages, stage)
			if idx < 0 or idx + 1 >= len(stages):
				skipped += 1
				continue
			_enter_stage(ja, stages[idx + 1], result="Auto (Cleared)", interview=iv.name,
			             ignore_permissions=True)
			advanced += 1
		except Exception as e:
			skipped += 1
			frappe.log_error(frappe.get_traceback(), f"Campus reconcile failed for {iv.name}: {e}")
	frappe.db.commit()
	return {"advanced": advanced, "rejected": rejected, "skipped": skipped, "processed": len(ivs)}


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

	# Which drive candidates sit at each hiring stage right now (names, so "waiting"
	# can exclude those already scheduled for the round). Counted in Python — a SQL
	# aggregate in `fields` is rejected by Frappe v16 and the dict form isn't on v15.
	stage_applicants = {}
	# Non-terminal candidates parked at each stage — used by the health check to spot
	# candidates stranded on a stage no round covers.
	stage_active = {}
	# Which region each waiting candidate is interviewed by, so the health check can
	# say up front when a round has nobody to take them — read off the same rows.
	stage_regions = {}
	invite_regions = _invite_region_map(invites)
	if invites:
		for r in frappe.get_all(
			"Job Applicant",
			filters={"custom_campus_invite": ["in", invites]},
			fields=["name", "custom_current_stage as stage", "status", *_REGION_FIELDS],
			limit_page_length=0,
		):
			s = r.stage or ""
			if r.status in PARKED_STATUSES:
				# Knocked out on eligibility, rejected or already accepted: parked on
				# purpose. Not waiting for this round, not stuck at its stage, and not
				# somebody a panel has to be found for.
				continue
			stage_applicants.setdefault(s, set()).add(r.name)
			stage_regions.setdefault(s, {}).setdefault(
				_effective_region(r, invite_regions), []).append(r.name)
			stage_active[s] = stage_active.get(s, 0) + 1

	# Interviews this drive created, with their feedback progress. The extra-round
	# columns ride along on the same rows — the additional rounds are drawn from these,
	# so the board still costs one interview query however many extras there are.
	iv_rows = frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "docstatus": ["<", 2]},
		fields=["name", "custom_campus_round_code as code", "status", "job_applicant",
		        "custom_extra_interview_reason as extra_reason",
		        "custom_interview_panel as panel", "scheduled_on"],
		limit_page_length=0,
	)
	iv_names = [i.name for i in iv_rows]
	got = {}
	if iv_names:
		for f in frappe.get_all("Interview Feedback",
		                        filters={"interview": ["in", iv_names], "docstatus": 1},
		                        fields=["interview"], limit_page_length=0):
			got[f.interview] = got.get(f.interview, 0) + 1

	# Per round: a clean, mutually-exclusive status breakdown that sums to `total`, and
	# the set of candidates already scheduled (to net off "waiting").
	#   Cleared / Rejected  -> the verdict
	#   Awaiting Feedback   -> the candidate appeared (or feedback started) but no
	#                          verdict yet
	#   Pending             -> everything else (created, not yet appeared)
	by_round = {}
	for i in iv_rows:
		b = by_round.setdefault(i.code or "", {
			"total": 0, "cleared": 0, "rejected": 0, "awaiting": 0, "pending": 0,
			"scheduled": set()})
		b["total"] += 1
		b["scheduled"].add(i.job_applicant)
		if i.status == "Cleared":
			b["cleared"] += 1
		elif i.status == "Rejected":
			b["rejected"] += 1
		elif i.status in AWAITING_INTERVIEW_STATUSES or got.get(i.name, 0) > 0:
			b["awaiting"] += 1
		else:
			b["pending"] += 1

	# Additional rounds, per round: one candidate each, so they get their own card
	# under the round they were added to instead of hiding inside its totals.
	all_users = set()
	extras_by_round = {}
	extra_rows = [i for i in iv_rows if i.extra_reason]
	extra_names = _applicant_full_names([i.job_applicant for i in extra_rows])
	# WHO is on the interview, read off the interview itself. The board used to look
	# the panel name up in the ROUND's panel list, which can never match: an
	# additional round is staffed from its own roster (R3 -> R3-EXTRA), so the lookup
	# silently fell through and the card showed the wrong people (or none). Reading
	# the interviewers directly also means the card shows the truth after someone
	# edits the interview, rather than re-deriving it from a roster that has moved on.
	extra_interviewers = {}
	if extra_rows:
		for d in frappe.get_all(
			"Interview Detail",
			filters={"parenttype": "Interview", "parent": ["in", [i.name for i in extra_rows]]},
			fields=["parent", "interviewer"], order_by="idx asc",
		):
			if d.interviewer:
				extra_interviewers.setdefault(d.parent, []).append(d.interviewer)
	for i in extra_rows:
		users = extra_interviewers.get(i.name, [])
		all_users.update(users)
		extras_by_round.setdefault(i.code or "", []).append({
			"interview": i.name,
			"job_applicant": i.job_applicant,
			"applicant_name": extra_names.get(i.job_applicant, i.job_applicant),
			"panel": i.panel,
			"interviewer_users": users,
			"status": i.status,
			"reason": i.extra_reason,
			"scheduled_on": str(i.scheduled_on)[:10] if i.scheduled_on else None,
			"feedback_got": got.get(i.name, 0),
		})

	role_titles = {r.job_opening: r.job_title for r in (doc.linked_job_openings or [])}
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

	# Resolve the extra rounds' interviewers to display names now that the lookup is
	# built, so the board prints who is actually on the interview.
	for rows in extras_by_round.values():
		for e in rows:
			e["interviewers"] = [names.get(u, u) for u in e.pop("interviewer_users", [])]

	empty_stat = {"total": 0, "cleared": 0, "rejected": 0, "awaiting": 0, "pending": 0,
	              "scheduled": set()}
	# Computed before the loop so each round can report the kind of body it drives.
	stage_options = _stage_options(doc)
	stage_type = stage_options.get("stage_type") or {}
	rounds = []
	for r in (doc.rounds or []):
		panels, missing = panels_by_round[r.round_code]
		stat = by_round.get(r.round_code, empty_stat)
		# "waiting" = candidates at this round's stage who are NOT yet scheduled for it
		# (so it drops to 0 once everyone's been assigned, and the NEXT round's waiting
		# rises as candidates clear into its stage).
		at_stage = stage_applicants.get(r.hiring_stage, set()) if r.hiring_stage else set()
		waiting = len(at_stage - stat["scheduled"])
		rounds.append({
			"round_code": r.round_code,
			"round_name": r.round_name,
			"round_type": r.round_type,
			"hiring_stage": r.hiring_stage or "",
			"round_status": r.round_status,
			"scheduled_at": str(r.scheduled_at)[:10] if r.scheduled_at else None,
			"is_gd": bool(r.requires_gd_grouping),
			"round_kind": _round_kind(r, stage_type),
			"waiting": waiting,
			"panels": [
				{"panel": k, "role": v["role"], "role_title": role_titles.get(v["role"]) or v["role"],
				 "interviewers": [{"user": u, "name": names.get(u, u)} for u in v["users"]]}
				for k, v in panels.items()
			],
			"missing_user": missing,
			"extras": extras_by_round.get(r.round_code, []),
			"interviews": stat["total"],
			"cleared": stat["cleared"],
			"rejected": stat["rejected"],
			"awaiting_feedback": stat["awaiting"],
			"pending": stat["pending"],
		})

	# Folded in so the client gets the rounds and the grid's Hiring Stage options in
	# ONE call. The additional-round dialog needs no options of its own: its type is
	# fixed and its panels come from the round it is opened on.
	return {"rounds": rounds, "invites": invites,
	        "roles": [{"job_opening": k, "job_title": v} for k, v in role_titles.items()],
	        "stage_options": stage_options,
	        "extra_round_type": EXTRA_ROUND_TYPE,
	        "health": _drive_health(doc, stage_options, stage_active,
	                                stage_regions, panels_by_round)}


def _drive_health(doc, stage_options, stage_active, stage_regions=None, panels_by_round=None):
	"""Surface, in plain language, the misconfigurations that otherwise show up only
	as a silent "0 waiting" — so HR can see and fix them on the form instead of
	guessing. Checks:
	  1. A round with no Hiring Stage.
	  2. A round mapped to a stage none of the linked openings has.
	  3. An interview round mapped to a stage that isn't of type "Interview" (feedback
	     won't auto-advance those candidates). Offer / Pre Offer rounds are exempt —
	     those stage types are exactly what makes them terminal rounds, so flagging
	     them buried the real issues under a warning on correct configuration.
	  4. Candidates stranded at a stage no round on the drive covers.
	  5. Candidates waiting for a round whose REGION no panel on it covers — the
	     transferred-candidate case, which otherwise only surfaces as a refusal when
	     someone finally clicks Schedule.
	"""
	stage_names = set(stage_options.get("stages") or [])
	stage_type = stage_options.get("stage_type") or {}
	rounds = doc.rounds or []
	covered = {(r.hiring_stage or "").strip() for r in rounds if r.hiring_stage}

	issues = []
	for r in rounds:
		if r.requires_gd_grouping:
			continue
		hs = (r.hiring_stage or "").strip()
		if not hs:
			issues.append({"level": "error",
				"title": _("Round “{0}” has no Hiring Stage").format(r.round_name or r.round_code),
				"detail": _("Set its Hiring Stage so cleared candidates can flow into it.")})
			continue
		if stage_names and hs not in stage_names:
			issues.append({"level": "error",
				"title": _("Round “{0}” points to a stage no opening has").format(r.round_name or r.round_code),
				"detail": _("“{0}” isn’t in any linked opening’s hiring workflow, so candidates can never reach this round. Change it to one of: {1}.").format(
					hs, ", ".join(sorted(stage_names)))})
		elif _round_kind(r, stage_type):
			continue  # terminal round — an Offer / Pre Offer stage is the point of it
		elif stage_type.get(hs) and stage_type.get(hs) != "Interview":
			issues.append({"level": "warning",
				"title": _("Round “{0}”’s stage isn’t an Interview stage").format(r.round_name or r.round_code),
				"detail": _("Stage “{0}” is type “{1}” on the opening. Interview feedback only auto-advances candidates from Interview-type stages — set it to Interview, or this round won’t move people on.").format(
					hs, stage_type.get(hs))})

	# Stranded candidates: sitting (non-terminal) on a stage no round covers.
	for stg, cnt in sorted(stage_active.items()):
		if not stg or stg in covered:
			continue
		orphan = bool(stage_names) and stg not in stage_names
		issues.append({"level": "error" if orphan else "warning",
			"title": _("{0} candidate(s) stuck at “{1}”").format(cnt, stg),
			"detail": (_("This stage is no longer in the opening’s workflow, so these candidates are orphaned — add a round for it or move them to a valid stage.")
			           if orphan else
			           _("No round on this drive covers “{0}”. Add a round mapped to it, or move these candidates.").format(stg)),
			"stage": stg})

	issues.extend(_region_panel_issues(rounds, stage_regions or {}, panels_by_round or {},
	                                   _drive_home_regions(doc)))
	return issues


def _region_panel_issues(rounds, stage_regions, panels_by_round, home_regions=None):
	"""Candidates waiting for a round that has no panel for their region.

	A candidate HR transferred is interviewed by the region they were moved TO, so
	that region needs a panel of its own on the round — the drive's untagged panels
	cover the drive's own regions only. Otherwise scheduling refuses them (see
	_assert_region_panels) and the drive stalls with no visible cause. Said here so
	it is fixed before anyone clicks Schedule.
	"""
	issues = []
	for r in rounds:
		if r.requires_gd_grouping or not r.hiring_stage:
			continue
		panels, _missing = panels_by_round.get(r.round_code, ({}, []))
		if not panels:
			continue  # "no panel at all" is the round card's own warning
		waiting = stage_regions.get(r.hiring_stage) or {}
		uncovered = {
			region: names for region, names in waiting.items()
			if not _panels_serving_region(panels, region, home_regions)
		}
		if not uncovered:
			continue
		labels = _region_names([x for x in uncovered if x])
		for region, names in sorted(uncovered.items(), key=lambda kv: str(kv[0])):
			issues.append({"level": "error", "region": region,
				"title": _("{0} candidate(s) waiting for “{1}” are in region {2}, which no panel covers").format(
					len(names), r.round_name or r.round_code,
					labels.get(region) or region or _("(not set)")),
				"detail": _("Their interviews cannot be created until a panel takes that region. "
				            "Add a Round Panelist on this round with Region = {0} — or leave a "
				            "panel's Region blank, which covers every region.").format(
					labels.get(region) or region or _("(not set)"))})
	return issues


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

	from recruitment.api.hiring_stage import get_openings_stages

	# Batched: two queries for the whole drive rather than two per linked opening.
	stages_by_opening = get_openings_stages(openings)

	per_opening, stage_type = {}, {}
	for op in openings:
		per_opening[op] = []
		for s in (stages_by_opening.get(op) or []):
			nm = s.get("stage_name")
			if nm:
				per_opening[op].append(nm)
				stage_type.setdefault(nm, s.get("stage_type"))

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
		"stage_type": stage_type,
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


def _extra_round_type_for(job_applicant):
	"""The interview type this candidate's next additional round takes.

	``EXTRA_ROUND_TYPE`` until that one is taken, then the next free variant of it
	("Additional Round 2", "Additional Round 3"…) — because HRMS refuses to let a
	candidate sit the same interview type twice. HR is never asked for a number: the
	only reason variants exist is that constraint.
	"""
	from recruitment.api.hiring_stage import get_interview_round_field

	field = get_interview_round_field()
	if not field:
		return EXTRA_ROUND_TYPE
	# Drafts count too: a pending additional round is one this candidate already has.
	taken = {r.get(field) for r in frappe.get_all(
		"Interview",
		filters={"job_applicant": job_applicant, "docstatus": ["<", 2],
		         field: ["like", f"{EXTRA_ROUND_TYPE}%"]},
		fields=[field])}
	if EXTRA_ROUND_TYPE not in taken:
		return EXTRA_ROUND_TYPE
	n = 2
	while f"{EXTRA_ROUND_TYPE} {n}" in taken:
		n += 1
	return f"{EXTRA_ROUND_TYPE} {n}"


@frappe.whitelist()
def get_extra_round_options(campus_drive, round_code):
	"""What the Additional Round dialog offers: who may be given one, and who can take it.

	Candidates: only those who CLEARED this round. An additional round is a second look
	at someone who has finished it — offering the whole drive's pool made the picker
	useless and let an extra round be created for candidates who never sat the round.

	Panels: the additional round's OWN roster only — the Round Panelist rows filed
	under this round's extra code (R3 -> R3-EXTRA). A second look is a deliberate
	decision about who re-examines the candidate, so it needs interviewers who were
	assigned to exactly that, not whoever happened to judge the round. When that
	roster is empty the dialog says which code to add rather than silently borrowing
	another round's panel.
	"""
	doc = _drive_lite(campus_drive)
	names = list(dict.fromkeys(frappe.get_all(
		"Interview",
		filters={"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		         "status": "Cleared", "docstatus": ["<", 2]},
		pluck="job_applicant")))
	detail = {
		r.name: r
		for r in frappe.get_all("Job Applicant", filters={"name": ["in", names]},
		                        fields=["name", "applicant_name", "custom_applicant_last_name",
		                                "custom_institute as institute", "job_title as job_opening"])
	} if names else {}
	role_titles = {r.job_opening: r.job_title for r in (doc.linked_job_openings or [])}

	# The additional round's own roster, read off the drive in memory (one Employee
	# query). Panelists whose Employee has no login are reported as `missing_user` so
	# the dialog can say why a panel it can see still cannot take an interview.
	emp_users = _employee_user_map(doc)
	extra_code = extra_panel_round_code(round_code)
	extra_panels, missing_user = _panels_for_round(doc, extra_code, emp_users)
	panels, users = [], set()
	for panel_name, v in extra_panels.items():
		panels.append({"round_code": extra_code, "round_name": _(EXTRA_ROUND_TYPE),
		               "panel": panel_name, "users": v["users"]})
		users.update(v["users"])
	user_names = {
		u.name: (u.full_name or u.name)
		for u in frappe.get_all("User", filters={"name": ["in", list(users)]},
		                        fields=["name", "full_name"])
	} if users else {}
	for p in panels:
		p["interviewers"] = [user_names.get(u, u) for u in p.pop("users")]

	return {
		"round_code": round_code,
		# The Round Panelists code HR must file this round's additional-round panel
		# under. Returned so the dialog can name it verbatim when it is missing.
		"extra_panel_round_code": extra_code,
		"round_name": next((r.round_name for r in (doc.rounds or [])
		                    if r.round_code == round_code), None) or round_code,
		"candidates": [
			{"name": n,
			 "applicant_name": _full_name(detail[n].applicant_name,
			                              detail[n].get("custom_applicant_last_name")),
			 "institute": detail[n].institute,
			 "job_title": role_titles.get(detail[n].job_opening) or detail[n].job_opening}
			for n in names if n in detail
		],
		"panels": panels,
		# Panelists on the extra roster whose Employee has no User account — they
		# cannot be put on an Interview, so a roster of only these reads as empty.
		"missing_user": missing_user,
	}


def _assert_cleared_this_round(campus_drive, round_code, job_applicant):
	"""An additional round belongs to someone who has finished the round it hangs off."""
	if not round_code:
		return
	if frappe.db.exists("Interview", {
		"custom_campus_drive": campus_drive, "custom_campus_round_code": round_code,
		"job_applicant": job_applicant, "status": "Cleared", "docstatus": ["<", 2],
	}):
		return
	frappe.throw(_(
		"{0} has not cleared round {1}, so there is nothing to add a round on top of. "
		"An additional round is a second look at a candidate who has finished this one."
	).format(frappe.bold(job_applicant), frappe.bold(round_code)))


@frappe.whitelist()
def add_candidate_interview(campus_drive, job_applicant, scheduled_on, round_code=None,
                            panel=None, panel_round=None, from_time=None, to_time=None,
                            reason=None, mode=None):
	"""Give ONE candidate an additional round on top of this round — a second look at a
	borderline candidate, a re-test after a weak showing.

	The type is always ``EXTRA_ROUND_TYPE``; HR picks the candidate, which of the
	round's panels takes it, the date and the reason. The candidate's stage is left
	untouched — this adds an interview, it does not rewrite the opening's workflow for
	everyone — and clearing it hands them on to the round after this one
	(``advance_after_extra_round``).
	"""
	from recruitment.api.hiring_stage import _ensure_interview_round

	_gd_guard(campus_drive)
	if not (job_applicant and scheduled_on):
		frappe.throw(_("Candidate and date are both required."))
	if not (reason or "").strip():
		# The reason is what makes an additional round defensible months later, and it
		# is the only thing distinguishing one from another on the candidate's history.
		frappe.throw(_("Say why this candidate is getting an additional round."))

	ja = frappe.db.get_value("Job Applicant", job_applicant,
	                         ["name", "job_title", "designation", *_REGION_FIELDS], as_dict=True)
	if not ja:
		frappe.throw(_("Job Applicant {0} not found.").format(job_applicant))
	_assert_cleared_this_round(campus_drive, round_code, job_applicant)
	stage_name = _extra_round_type_for(job_applicant)

	doc = _drive_lite(campus_drive)  # only the panel roster is read off the drive
	users = []
	# The additional round reads its OWN roster (R3 -> R3-EXTRA), never the panel that
	# judged the round itself. `panel_round` is what the dialog sends back, already
	# resolved; it is put through the same helper so an API caller passing the plain
	# round code lands on the extra roster too and cannot reach a round's own panel.
	roster_round = extra_panel_round_code(panel_round or round_code)
	if roster_round:
		panels, missing_user = _panels_for_round(doc, roster_round)
		if not panels:
			# Named explicitly, because "add a panel" is useless without the code the
			# row has to carry — round_code on Round Panelists is free text.
			frappe.throw(
				_("No panel is set up for the {0} on round {1}. Add a row in "
				  "<b>Round Panelists</b> with Round Code <b>{2}</b> and the "
				  "interviewer(s) who should take it, save the drive, then try again.")
				.format(_(EXTRA_ROUND_TYPE), frappe.bold(round_code or "-"),
				        roster_round)
				+ (" " + _("({0} panelist(s) are set up but their Employee has no "
				           "User account, so they cannot be put on an interview.)")
				   .format(len(missing_user)) if missing_user else ""),
				title=_("Add an Additional Round panel"),
			)
		if panel and panel not in panels:
			frappe.throw(_("{0} is not a panel on {1} ({2}).").format(
				panel, _(EXTRA_ROUND_TYPE), roster_round))
		if panel:
			users = panels[panel]["users"]
		elif panels:
			# No panel named — fall back to the first one that serves this candidate's
			# region rather than the first one outright, so a transferred candidate is
			# never handed to the region they transferred away from.
			region = _effective_region(ja, _invite_region_map({ja.get("custom_campus_invite")}))
			serving = _panels_serving_region(panels, region, _drive_home_regions(doc))
			if not serving:
				frappe.throw(_("No panel on round {0} covers region {1}.").format(
					roster_round, frappe.bold(region or _("(unset)"))))
			users = list(serving.values())[0]["users"]

	# Interview requires at least one interviewer, so an empty panel would otherwise
	# surface to HR as a raw "interview_details is mandatory" error naming a field the
	# extra-interview dialog does not even show. Reachable when the panel exists but
	# every panelist on it lacks a User account.
	if not users:
		frappe.throw(_("The {0} panel on <b>{1}</b> has nobody who can take this "
		               "interview — its panelists have no User account. Add an "
		               "interviewer with a login to that row and try again.")
		             .format(_(EXTRA_ROUND_TYPE), roster_round)
		             if roster_round else
		             _("No panel was resolved for this interview, so there is nobody to "
		               "take it. Add a panel to the round and try again."))

	iv = frappe.new_doc("Interview")
	iv.job_applicant = ja.name
	iv.job_opening = ja.job_title
	_set_interview_round(iv, _ensure_interview_round(stage_name))
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
	iv.custom_extra_interview_reason = (reason or "").strip() or None
	# Before the defaults, so the drive's Drive Type wins over the autofill's guess.
	_set_interview_mode(iv, _resolve_mode(campus_drive, mode))
	_apply_interview_defaults(iv, _interview_autofill_defaults())
	iv.insert(ignore_permissions=True)
	_record_extra_interview_on_workflow(ja.name, stage_name, iv.name, round_code, reason)
	frappe.db.commit()
	return {"interview": iv.name, "job_applicant": ja.name, "stage": stage_name,
	        "interviewers": len(users)}


def advance_after_extra_round(doc, method=None):
	"""Hand a candidate on once their additional round concludes.

	Called when Interview Feedback is submitted. An additional round is a second look
	at ONE candidate on a round everyone else has already taken, so its verdict means
	the same as the round's own: cleared -> the stage after the round the extra was
	added to, rejected -> Rejected.

	The generic auto-advance (``advance_on_interview_result``) works off the stage the
	candidate is parked at, which may be anything by the time an extra round is added.
	This anchors on the ROUND instead, and never moves anyone backwards — so whichever
	of the two acts first, the other is a no-op.
	"""
	from recruitment.api.hiring_stage import (
		_append_history, _enter_stage, _find_stage, get_opening_stages,
	)

	try:
		iv = frappe.db.get_value(
			"Interview", doc.interview,
			["name", "status", "job_applicant", "custom_campus_drive as drive",
			 "custom_campus_round_code as code", "custom_extra_interview_reason as reason"],
			as_dict=True,
		)
		# Only campus additional rounds; the reason is what marks one as extra.
		if not iv or not iv.drive or not iv.reason or iv.status not in ("Cleared", "Rejected"):
			return

		ja = frappe.get_doc("Job Applicant", iv.job_applicant)
		if iv.status == "Rejected":
			if ja.status != "Rejected":
				ja.status = "Rejected"
				ja.save(ignore_permissions=True)
			return

		stage = frappe.db.get_value("Campus Drive Round",
		                            {"parent": iv.drive, "parenttype": "Campus Drive",
		                             "round_code": iv.code}, "hiring_stage") if iv.code else None
		stages = get_opening_stages(ja.get("job_title"))
		anchor = _find_stage(stages, stage) if stage else -1
		current = _find_stage(stages, ja.get("custom_current_stage") or "")
		if anchor < 0:
			anchor = current
		target = anchor + 1
		if anchor < 0 or target >= len(stages) or target <= current:
			# Nothing to move into, or they are already there or beyond — record the
			# clearance so the history still shows the additional round decided it.
			if current >= 0:
				_append_history(ja, stages[current], "Additional Round Cleared", interview=iv.name)
				ja.save(ignore_permissions=True)
			return
		_enter_stage(ja, stages[target], result="Additional Round Cleared", interview=iv.name,
		             ignore_permissions=True)
	except Exception:
		# The verdict is recorded on the interview either way; a failure to move the
		# candidate must not roll back the panel's feedback.
		frappe.log_error(frappe.get_traceback(), "Campus additional round: advance failed")


def _record_extra_interview_on_workflow(job_applicant, stage_name, interview, round_code,
                                        reason=None):
	"""Log the extra interview on the candidate's hiring workflow.

	Only this candidate is getting this round, so it belongs on their history —
	otherwise the workflow shows an interview that seemingly came from nowhere, and
	nothing links the two.

	The current stage is deliberately NOT moved. An extra round is an addition, not a
	progression, and the chosen type usually is not one of the opening's stages at
	all — writing it into ``custom_current_stage`` would strand the candidate at a
	stage no round covers and break "move to next stage", which walks the opening's
	ordered list by index.

	Appended straight to the child table rather than through ``_enter_stage``: that
	helper's job is to move a candidate, and saving the applicant here would re-run
	every Job Applicant validate hook from inside interview creation.
	"""
	from frappe.utils import now_datetime

	from recruitment.api.hiring_stage import HISTORY_FIELD

	try:
		applicant = frappe.get_doc("Job Applicant", job_applicant)
		applicant.append(HISTORY_FIELD, {
			"stage_name": stage_name,
			"stage_type": "Interview",
			"entered_on": now_datetime(),
			"moved_by": frappe.session.user,
			"result": "Extra Interview",
			"interview": interview,
			"notes": _("Extra interview scheduled on round {0}.").format(round_code)
			if round_code else _("Extra interview scheduled."),
		})
		if (reason or "").strip():
			# The reason is what makes an extra round defensible six months later, so
			# it sits on the history row as well as the interview.
			row = applicant.get(HISTORY_FIELD)[-1]
			row.notes = f"{row.notes} {_('Reason')}: {reason.strip()}"
		applicant.save(ignore_permissions=True)
	except Exception:
		# The interview is already created and is the thing that matters; a failure to
		# annotate the workflow must not roll it back or block HR.
		frappe.log_error(frappe.get_traceback(), "Extra interview: workflow log failed")


def update_drive_statuses():
	"""Daily scheduler job: move each drive's status in step with its window, since a
	drive going Live / Completed happens by the calendar passing, not by a save.
	Manually 'Closed' drives are left untouched.
	"""
	from frappe.utils import getdate, nowdate

	today = getdate(nowdate())
	changed = 0
	for d in frappe.get_all(
		"Campus Drive",
		filters={"drive_status": ["!=", "Closed"]},
		fields=["name", "drive_start_date", "drive_end_date", "drive_status"],
	):
		if not d.drive_start_date:
			continue
		if today < getdate(d.drive_start_date):
			target = "Draft"
		elif d.drive_end_date and today > getdate(d.drive_end_date):
			target = "Completed"
		else:
			target = "Live"
		if target != d.drive_status:
			frappe.db.set_value("Campus Drive", d.name, "drive_status", target,
			                    update_modified=False)
			changed += 1
	frappe.db.commit()
	return {"updated": changed}
