"""Keep the Group Discussion records in step with a Campus Drive's GD groups.

WHY THIS EXISTS
---------------
Group Discussions used to live only inside the Campus Drive form: HR split the hall
into groups there and marked every candidate there. That works for HR and for nobody
else — an interviewer who only conducts one GD would have to be given the whole drive
(every college, every role, every other panel's candidates, and write access to the
schedule) just to tick two boxes.

So each group with a panel gets its OWN document: a **Group Discussion**. It carries
the same card as the drive, but scoped to that one group, and a panel member sees only
the ones they are on (permissions/doc_type_permissions.group_discussion_query).

WHICH SIDE IS THE RECORD OF TRUTH
---------------------------------
The **Campus Drive** is. Its `gd_groups` / `gd_group_members` child rows are what
`apply_gd_results`, the freeze and the regroup all read, and they stay that way — a
Group Discussion is a scoped *mirror* of one group, never a second copy of the truth.

That gives one rule, and this module is the whole of it:

    drive -> GD : this module (reconcile / mirror_*)
    GD -> drive : group_discussion.py writes the DRIVE row first, through the very
                  same campus_drive functions HR's own buttons call, then mirrors the
                  result back here.

Nothing writes a Group Discussion candidate row without the drive row moving first,
so the two can never disagree about a verdict.

NO PANEL, NO DOCUMENT
---------------------
A group with no panel produces no Group Discussion — there is nobody it would be for,
and an unassigned GD sitting in the list is just noise. Assign the panel later (by
hand or with Assign Panels) and the document appears then; clear it and the document
goes, unless its results have already been pushed — that GD happened, and history is
not deleted.
"""

import frappe
from frappe import _

GD_DT = "Group Discussion"
GD_GROUP_DT = "Campus Drive GD Group"
GD_MEMBER_DT = "Campus Drive GD Group Member"

_GROUP_FIELDS = ("job_opening", "job_title", "institute", "panel_name")
_MEMBER_FIELDS = ("job_applicant", "applicant_name", "institute", "job_opening",
                  "attendance", "result")

FROZEN_STATUS = "Completed"


# ---------------------------------------------------------------------------
# reading the drive
# ---------------------------------------------------------------------------

def _child_filters(campus_drive, round_code=None, group_names=None):
	filters = {"parent": campus_drive, "parenttype": "Campus Drive"}
	if round_code:
		filters["round_code"] = round_code
	if group_names:
		filters["group_name"] = ["in", list(group_names)]
	return filters


def _drive_groups(campus_drive, round_code=None, group_names=None):
	return frappe.get_all(
		GD_GROUP_DT,
		filters=_child_filters(campus_drive, round_code, group_names),
		fields=["name", "round_code", "group_name", "group_status", *_GROUP_FIELDS],
		order_by="idx asc",
	)


def _drive_members(campus_drive, round_code=None, group_names=None):
	"""``{(round_code, group_name): [member rows]}``, in form order."""
	rows = frappe.get_all(
		GD_MEMBER_DT,
		filters=_child_filters(campus_drive, round_code, group_names),
		fields=["name", "round_code", "group_name", *_MEMBER_FIELDS],
		order_by="idx asc",
	)
	out = {}
	for r in rows:
		out.setdefault((r.round_code, r.group_name), []).append(r)
	return out


def _role_titles(openings):
	"""``{Job Opening: job_title}``, so a candidate row can name their own role even
	in a group that merges several — and name it without the reader needing read
	permission on Job Opening."""
	names = list({o for o in openings if o})
	if not names:
		return {}
	return {
		r.name: r.job_title
		for r in frappe.get_all("Job Opening", filters={"name": ["in", names]},
		                        fields=["name", "job_title"])
	}


def _round_meta(campus_drive, round_codes):
	"""``{round_code: {name, scheduled_at}}`` for the rounds being synced."""
	if not round_codes:
		return {}
	rows = frappe.get_all(
		"Campus Drive Round",
		filters={"parent": campus_drive, "parenttype": "Campus Drive",
		         "round_code": ["in", list(round_codes)]},
		fields=["round_code", "round_name", "scheduled_at"],
	)
	return {r.round_code: r for r in rows}


def _panel_users(campus_drive, round_codes):
	"""``({round_code: {panel label: cfg}}, {user: employee}, drive)`` — who conducts
	which panel, the Employee behind each of them, and the lightly-loaded drive.

	``cfg`` is ``_panels_for_round``'s own: ``users``, ``role`` and ``region``. The
	region tag rides along because it is the first answer to "whose region runs this
	GD" (see ``_group_region``).

	Resolved through the drive's own roster (Round Panelists -> Employee -> user_id),
	so a panel label here is exactly the one the group row stores and the drive's
	board shows. The drive is returned rather than re-loaded by the caller: it is
	several queries' worth of child tables.
	"""
	from recruitment.recruitment.doctype.campus_drive.campus_drive import (
		_drive_lite,
		_employee_user_map,
		_panels_for_round,
	)

	if not round_codes:
		return {}, {}, None
	doc = _drive_lite(campus_drive)
	emp_users = _employee_user_map(doc)
	# Employee behind each user, so the panel table can name the person as HR knows
	# them (the roster is Employees; the interview side is Users).
	user_emp = {}
	for p in (doc.round_panelists or []):
		user = emp_users.get(p.panelist)
		if user:
			user_emp.setdefault(user, p.panelist)

	out = {}
	for code in round_codes:
		panels, _missing = _panels_for_round(doc, code, emp_users=emp_users)
		out[code] = panels
	return out, user_emp, doc


def _institute_regions(institutes):
	"""``{Institute: region}`` — a college sits in one region, and a per-institute
	split therefore tells you the group's."""
	names = list({i for i in institutes if i})
	if not names:
		return {}
	return {
		r.name: r.region
		for r in frappe.get_all("Institute", filters={"name": ["in", names]},
		                        fields=["name", "region"])
	}


def _group_region(panel_cfg, group, inst_regions, drive_region):
	"""Whose region runs this GD, most specific answer first.

	1. The panel's own tag. A panelist tagged with a region has said which region they
	   take, and that is the strongest statement anyone has made about this group.
	2. The college's. A per-institute split names one college, and a college sits in
	   one region.
	3. The drive's, when its campus invites agree on exactly one. A drive spanning two
	   regions cannot answer for a group, and guessing would be worse than blank.
	"""
	return ((panel_cfg or {}).get("region")
	        or inst_regions.get(group.institute)
	        or drive_region)


# ---------------------------------------------------------------------------
# reconcile
# ---------------------------------------------------------------------------

def reconcile(campus_drive, round_code=None, group_names=None):
	"""Create / update / remove the Group Discussions for a drive's GD groups.

	Idempotent and change-detecting: a group whose mirror already matches costs one
	comparison and no write, so this is safe to run on every Campus Drive save.

	Scope it with ``round_code`` / ``group_names`` when only part of the drive moved
	(a panel assigned to one group, a candidate moved between two) — an unscoped call
	also sweeps up Group Discussions whose group no longer exists.
	"""
	groups = _drive_groups(campus_drive, round_code, group_names)
	members = _drive_members(campus_drive, round_code, group_names)
	codes = {g.round_code for g in groups}
	if round_code:
		codes.add(round_code)
	rounds = _round_meta(campus_drive, codes)
	panels, user_emp, drive = _panel_users(campus_drive, codes)
	titles = _role_titles(
		[g.job_opening for g in groups]
		+ [m.job_opening for rows in members.values() for m in rows]
	)
	mode = frappe.db.get_value("Campus Drive", campus_drive, "drive_type") or None
	inst_regions = _institute_regions([g.institute for g in groups])
	drive_region = _sole_drive_region(drive)

	existing = {
		(d.round_code, d.group_name): d
		for d in frappe.get_all(
			GD_DT,
			filters={"campus_drive": campus_drive,
			         **({"round_code": round_code} if round_code else {}),
			         **({"group_name": ["in", list(group_names)]} if group_names else {})},
			fields=["name", *_SCALAR_FIELDS],
		)
	}
	names = [d.name for d in existing.values()]
	rows = _existing_rows(names)
	shares = _existing_shares(names)

	made = updated = removed = skipped = 0
	seen = set()
	for g in groups:
		key = (g.round_code, g.group_name)
		seen.add(key)
		panel_cfg = panels.get(g.round_code, {}).get(g.panel_name or "") or {}
		users = list(panel_cfg.get("users") or [])
		current = existing.get(key)

		# No panel (or a panel with nobody who can log in) -> no document. See the
		# module docstring: an unassigned GD would belong to nobody.
		if not users:
			if current and not current.results_pushed:
				frappe.delete_doc(GD_DT, current.name, force=True, ignore_permissions=True,
				                  delete_permanently=True)
				removed += 1
			elif current:
				skipped += 1
			continue

		payload = _payload(campus_drive, g, members.get(key) or [], users, user_emp,
		                   rounds.get(g.round_code), mode, titles,
		                   _group_region(panel_cfg, g, inst_regions, drive_region))
		if current:
			if _apply(current, payload, users, rows, shares.get(current.name) or {}):
				updated += 1
		else:
			_create(payload, users)
			made += 1

	# Group gone from the drive (regrouped away, round deleted): its mirror goes too.
	for key, d in existing.items():
		if key in seen:
			continue
		if d.results_pushed:
			skipped += 1
			continue
		frappe.delete_doc(GD_DT, d.name, force=True, ignore_permissions=True,
		                  delete_permanently=True)
		removed += 1

	return {"created": made, "updated": updated, "removed": removed, "kept": skipped}


# Everything a Group Discussion holds that is not a child table. Read in the same
# query that finds the documents, so deciding whether one needs writing costs nothing.
_SCALAR_FIELDS = (
	"campus_drive", "round_code", "round_name", "group_name", "status", "results_pushed",
	"scheduled_on", "mode", "panel_name", "region", "job_opening", "job_title",
	"institute", "candidate_count",
)
_INTERVIEWER_FIELDS = ("interviewer", "employee", "panel_name")
_CANDIDATE_FIELDS = ("job_applicant", "applicant_name", "institute", "job_opening",
                     "job_title", "attendance", "result", "drive_member")


def _existing_rows(gd_names):
	"""``{gd: {"interviewers": [...], "candidates": [...]}}`` in two queries.

	Deciding whether a Group Discussion needs saving used to cost a full document read
	EACH — thirty groups meant thirty reads on every drive save, almost always to
	conclude that nothing had changed. Now the whole comparison is three queries for
	the drive and a document is only loaded when it is actually going to be written.
	"""
	out = {name: {"interviewers": [], "candidates": []} for name in gd_names}
	if not gd_names:
		return out
	for field, doctype, cols in (
		("interviewers", "Group Discussion Interviewer", _INTERVIEWER_FIELDS),
		# remarks rides along so a rebuilt roll can carry the panel's own notes over
		("candidates", "Group Discussion Candidate", (*_CANDIDATE_FIELDS, "remarks")),
	):
		for row in frappe.get_all(
			doctype,
			filters={"parenttype": GD_DT, "parentfield": field, "parent": ["in", gd_names]},
			fields=["parent", *cols],
			order_by="parent asc, idx asc",
		):
			out[row.parent][field].append(row)
	return out


def _existing_shares(gd_names):
	"""``{gd: {user: DocShare}}`` in one query, so re-sharing a whole drive's panels
	is not one lookup per group."""
	if not gd_names:
		return {}
	out = {}
	for s in frappe.get_all(
		"DocShare",
		filters={"share_doctype": GD_DT, "share_name": ["in", gd_names]},
		fields=["name", "user", "share_name"],
	):
		out.setdefault(s.share_name, {})[s.user] = s.name
	return out


def _sole_drive_region(drive):
	"""The drive's own region when its campus invites agree on one, else None."""
	if not drive:
		return None
	from recruitment.recruitment.doctype.campus_drive.campus_drive import _drive_home_regions

	regions = _drive_home_regions(drive)
	return next(iter(regions)) if len(regions) == 1 else None


def _payload(campus_drive, group, member_rows, users, user_emp, round_row, mode, titles,
             region):
	"""Everything a Group Discussion holds, derived from the drive."""
	return {
		"doctype": GD_DT,
		"campus_drive": campus_drive,
		"round_code": group.round_code,
		"round_name": (round_row or {}).get("round_name") or group.round_code,
		"group_name": group.group_name,
		"status": group.group_status or "Planned",
		"results_pushed": 1 if group.group_status == FROZEN_STATUS else 0,
		"scheduled_on": (round_row or {}).get("scheduled_at"),
		"mode": mode,
		"panel_name": group.panel_name,
		"region": region,
		"job_opening": group.job_opening,
		"job_title": group.job_title,
		"institute": group.institute,
		"candidate_count": len(member_rows),
		"interviewers": [
			{"interviewer": u, "employee": user_emp.get(u), "panel_name": group.panel_name}
			for u in users
		],
		"candidates": [
			{
				"job_applicant": m.job_applicant,
				"applicant_name": m.applicant_name,
				"institute": m.institute,
				"job_opening": m.job_opening,
				"job_title": titles.get(m.job_opening) or m.job_opening or None,
				"attendance": m.attendance or "Pending",
				"result": m.result or "Pending",
				"drive_member": m.name,
			}
			for m in member_rows
		],
	}


def _create(payload, users):
	doc = frappe.get_doc(payload)
	doc.flags.ignore_permissions = True
	doc.flags.from_campus_drive = True
	doc.insert(ignore_permissions=True)
	share_with(doc.name, users, {})
	return doc


def _apply(current, payload, users, rows, shares):
	"""Write the payload onto an existing Group Discussion — only if it differs.

	A drive save must not churn every GD's `modified` stamp (and every panel member's
	notification feed) when nothing about their group has changed, and must not read
	the document at all to find that out.
	"""
	have = rows.get(current.name) or {"interviewers": [], "candidates": []}
	stale = [f for f in _SCALAR_FIELDS if _differs(current.get(f), payload.get(f))]
	panel_moved = _rows_differ(have["interviewers"], payload["interviewers"],
	                           _INTERVIEWER_FIELDS)
	roll_moved = _rows_differ(have["candidates"], payload["candidates"], _CANDIDATE_FIELDS)

	if not (stale or panel_moved or roll_moved):
		share_with(current.name, users, shares)
		return False

	doc = frappe.get_doc(GD_DT, current.name)
	for field in stale:
		doc.set(field, payload.get(field))
	if panel_moved:
		doc.set("interviewers", payload["interviewers"])
	if roll_moved:
		# Remarks are the panel's own note, kept across a resync — the drive has no
		# column for them, so a rebuild here is the only thing that could lose them.
		notes = {r.drive_member: r.remarks for r in have["candidates"] if r.get("remarks")}
		doc.set("candidates",
		        [dict(r, remarks=notes.get(r["drive_member"])) for r in payload["candidates"]])

	doc.flags.ignore_permissions = True
	doc.flags.from_campus_drive = True
	doc.save(ignore_permissions=True)
	share_with(current.name, users, shares)
	return True


def _differs(current, wanted):
	if current in (None, "") and wanted in (None, ""):
		return False
	# Datetimes come back as objects and go in as strings; compare on the string.
	if hasattr(current, "isoformat") or hasattr(wanted, "isoformat"):
		return str(current or "")[:19] != str(wanted or "")[:19]
	return str(current if current is not None else "") != str(wanted if wanted is not None else "")


def _rows_differ(current, wanted, fields):
	if len(current or []) != len(wanted or []):
		return True
	for have, want in zip(current or [], wanted or [], strict=False):
		for f in fields:
			if _differs(have.get(f), want.get(f)):
				return True
	return False


# ---------------------------------------------------------------------------
# access: the panel gets their own GD, and only theirs
# ---------------------------------------------------------------------------

def share_with(gd_name, users, have):
	"""Share the GD read+write with its panel, and un-share anyone dropped from it.

	The permission query already scopes the list to the panel; the share is what gets
	an ordinary Employee user — who holds no Interviewer role at all — through the
	door in the first place. Both are needed: the share opens it, the query keeps
	everyone else's GDs out of the list.

	``have`` is this GD's ``{user: DocShare}`` as already read by ``_existing_shares``
	— a whole drive's shares come back in one query rather than one per group.
	"""
	wanted = {u for u in (users or []) if u and u != "Administrator"}
	if wanted == set(have):
		return
	for user in wanted - set(have):
		try:
			frappe.share.add(GD_DT, gd_name, user, read=1, write=1, flags={"ignore_share_permission": True})
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"Group Discussion: share failed for {user}")
	for user in set(have) - wanted:
		frappe.delete_doc("DocShare", have[user], ignore_permissions=True, force=True)


# ---------------------------------------------------------------------------
# targeted mirrors — one field moved on the drive, one field moves here
# ---------------------------------------------------------------------------

def _gd_name(campus_drive, round_code, group_name):
	return frappe.db.get_value(
		GD_DT,
		{"campus_drive": campus_drive, "round_code": round_code, "group_name": group_name},
		"name",
	)


def mirror_member_field(campus_drive, member_row, field, value):
	"""One candidate's attendance / result, as just set on the drive."""
	row = frappe.db.get_value("Group Discussion Candidate", {"drive_member": member_row},
	                          ["name", "parent"], as_dict=True)
	if not row:
		return None
	if frappe.db.get_value(GD_DT, row.parent, "campus_drive") != campus_drive:
		return None
	frappe.db.set_value("Group Discussion Candidate", row.name, field, value,
	                    update_modified=False)
	return row.parent


def mirror_group_members(campus_drive, round_code, group_name, field, value):
	"""The same field across a whole group (bulk attendance)."""
	gd = _gd_name(campus_drive, round_code, group_name)
	if not gd:
		return None
	for name in frappe.get_all("Group Discussion Candidate",
	                           filters={"parent": gd, "parenttype": GD_DT}, pluck="name"):
		frappe.db.set_value("Group Discussion Candidate", name, field, value,
		                    update_modified=False)
	return gd


def mirror_group_status(campus_drive, round_code, group_name, status):
	"""The group's own status, and the pushed flag that rides on Completed."""
	gd = _gd_name(campus_drive, round_code, group_name)
	if not gd:
		return None
	frappe.db.set_value(GD_DT, gd, {
		"status": status,
		"results_pushed": 1 if status == FROZEN_STATUS else 0,
	}, update_modified=False)
	return gd


def on_drive_trash(campus_drive):
	"""The drive is going: take its Group Discussions with it, or Frappe's link check
	refuses the delete."""
	for name in frappe.get_all(GD_DT, filters={"campus_drive": campus_drive}, pluck="name"):
		# ignore_on_trash: a pushed GD refuses deletion on its own (it is history), but
		# the drive it belongs to is going, and leaving it behind would only make the
		# drive undeletable.
		frappe.delete_doc(GD_DT, name, force=True, ignore_permissions=True,
		                  ignore_on_trash=True, delete_permanently=True)


# ---------------------------------------------------------------------------
# whitelisted entry point (HR: "rebuild the Group Discussions for this drive")
# ---------------------------------------------------------------------------

@frappe.whitelist()
def sync_drive(campus_drive, round_code=None):
	# Names the drive, not just the doctype: this takes an arbitrary drive from the
	# client, so write on some other drive must not authorise rebuilding this one.
	if not frappe.has_permission("Campus Drive", "write", doc=campus_drive):
		frappe.throw(_("Not permitted to update this Campus Drive."), frappe.PermissionError)
	result = reconcile(campus_drive, round_code=round_code)
	frappe.db.commit()
	return result
