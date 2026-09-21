# Copyright (c) 2026, Chatnext and contributors
# For license information, please see license.txt

"""One Group Discussion — one group, its panel, and its candidates.

An interviewer opens this instead of the Campus Drive. They see the same card HR
sees, for their group only, and mark attendance and Pass/Fail on it. When the group
is done they push it: passers go to the next round, fails are Rejected, and the group
closes on the drive.

WHERE THE MARKS ACTUALLY GO
---------------------------
Not here first. Every action below writes the **Campus Drive** row through the same
`campus_drive` function HR's own buttons call, and that function mirrors the change
back onto this document (see `campus_gd_sync`). So a mark made here and a mark made on
the drive travel the identical path, and the two records cannot drift apart or
disagree about a verdict.

WHO MAY ACT
-----------
The panel on this GD, or anyone with write on the Campus Drive. An interviewer needs
no permission on the drive at all — being on `interviewers` is the whole of their
authority, and it only ever reaches this one group.
"""

import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

GD_DT = "Group Discussion"
# Statuses a panel may set by hand. Completed is deliberately not among them: a GD is
# finished by PUSHING it, and a group marked Completed without its results going
# anywhere is exactly the silent gap this doctype exists to close.
PANEL_STATUSES = ("Planned", "Scheduled", "In Progress")
# What "the GD has started" looks like — set the moment the first mark is made, so the
# drive board shows a group in progress without anybody remembering to say so.
STARTABLE_STATUSES = ("Planned", "Scheduled")

# Everything below mirrors the Campus Drive. `read_only` on these keeps them out of
# the form, but read_only is a CLIENT-side rule: the panel holds write permission on
# this document, so `frappe.client.set_value` would otherwise let a verdict be changed
# here without the drive moving — and the drive is what `apply_gd_results` reads. Then
# the panel would see one verdict and the candidate would be advanced on another.
# candidate_count is deliberately absent: validate derives it from the rows just
# above, so a stale stored value would read as a hand edit on an unrelated save.
MIRRORED_FIELDS = ("campus_drive", "round_code", "group_name", "status", "results_pushed",
                   "panel_name", "region", "job_opening", "institute")


def _same(a, b):
	"""None and "" are the same absence, and 0 and "0" the same number."""
	if a in (None, "") and b in (None, ""):
		return True
	return str(a if a is not None else "") == str(b if b is not None else "")


class GroupDiscussion(Document):
	def validate(self):
		self.candidate_count = len(self.candidates or [])
		self._reject_hand_edits()

	def _reject_hand_edits(self):
		"""Refuse a manual save that changes anything the Campus Drive owns.

		Only the sync writes those (it sets `from_campus_drive`), and only the board
		buttons change a verdict — they go through the drive first, so both records
		move together. A hand edit here would move one and not the other.

		Remarks are the exception and stay editable: they are the panel's own note and
		the drive has no column for them.
		"""
		if self.flags.from_campus_drive or self.is_new():
			return
		before = self.get_doc_before_save()
		if not before:
			return

		changed = [
			self.meta.get_label(f) for f in MIRRORED_FIELDS
			if not _same(before.get(f), self.get(f))
		]
		old_rows = before.candidates or []
		new_rows = self.candidates or []
		if len(old_rows) != len(new_rows):
			changed.append(_("the candidate list"))
		else:
			for old, new in zip(old_rows, new_rows, strict=False):
				if not _same(old.attendance, new.attendance) or not _same(old.result, new.result):
					changed.append(new.applicant_name or new.job_applicant)

		if changed:
			frappe.throw(
				_("{0} is set from the Campus Drive, not by editing this form. Use the "
				  "buttons on the group below — they mark the drive and this document "
				  "together, so the two can never disagree about a verdict.<br><br>"
				  "Changed here: {1}").format(_("Group Discussion"), ", ".join(changed)),
				title=_("Not editable here"),
			)

	def on_trash(self):
		# Deleting the panel's copy would not un-push anything, but it would leave the
		# drive showing a group whose interviewers can no longer reach it — and the
		# next drive save would silently rebuild it anyway.
		if self.results_pushed:
			frappe.throw(
				_("{0} has already been pushed — its candidates have moved on. A completed "
				  "Group Discussion is history and cannot be deleted.").format(frappe.bold(self.name)),
				title=_("Group Discussion is completed"),
			)

	def panel_users(self):
		return [r.interviewer for r in (self.interviewers or []) if r.interviewer]

	def may_conduct(self, user=None):
		"""True when `user` may mark and push this GD: on its panel, or running the
		drive it belongs to.

		The drive check names THIS drive rather than the doctype: write on some other
		campus drive is not authority over this group. It is a per-click check, not a
		loop, and Frappe reads the document lazily for permission checks, so naming it
		costs nothing worth saving.
		"""
		user = user or frappe.session.user
		if user == "Administrator":
			return True
		if user in self.panel_users():
			return True
		return bool(frappe.has_permission("Campus Drive", "write", doc=self.campus_drive,
		                                  user=user))


# ---------------------------------------------------------------------------
# guards
# ---------------------------------------------------------------------------

def _load(group_discussion):
	doc = frappe.get_doc(GD_DT, group_discussion)
	if not doc.may_conduct():
		frappe.throw(
			_("You are not on {0}'s panel, so there is nothing here for you to mark.")
			.format(frappe.bold(doc.group_name or doc.name)),
			frappe.PermissionError,
		)
	return doc


def _row(doc, row_name):
	row = next((r for r in (doc.candidates or []) if r.name == row_name), None)
	if not row:
		frappe.throw(_("That candidate is not in this Group Discussion."))
	if not row.drive_member:
		# A row typed in by hand, with nothing on the drive behind it. Refusing is the
		# honest answer: marking it would move nobody and look as though it had.
		frappe.throw(
			_("{0} is not linked to a candidate on the Campus Drive, so a result here "
			  "would go nowhere. Add them to the group on the drive instead.")
			.format(frappe.bold(row.applicant_name or row.job_applicant)),
			title=_("Candidate not on the drive"),
		)
	return row


def _start(doc):
	"""First mark on a Planned/Scheduled group means the GD is under way."""
	if doc.status in STARTABLE_STATUSES:
		cd._set_gd_group_status(doc.campus_drive, doc.round_code, doc.group_name, "In Progress")
		return "In Progress"
	return doc.status


# ---------------------------------------------------------------------------
# marking — every one of these writes the drive first
# ---------------------------------------------------------------------------

@frappe.whitelist()
def set_candidate_field(group_discussion, row_name, field, value):
	"""Set one candidate's attendance / GD result."""
	doc = _load(group_discussion)
	row = _row(doc, row_name)
	result = cd._set_gd_member_field(doc.campus_drive, row.drive_member, field, value)
	result["status"] = _start(doc)
	frappe.db.commit()
	return result


@frappe.whitelist()
def bulk_attendance(group_discussion, value):
	"""Mark the whole group Present / Absent / Pending in one go."""
	doc = _load(group_discussion)
	result = cd._bulk_gd_attendance(doc.campus_drive, doc.round_code, doc.group_name, value)
	result["status"] = _start(doc)
	frappe.db.commit()
	return result


@frappe.whitelist()
def set_status(group_discussion, status):
	"""Move the GD between Planned / Scheduled / In Progress."""
	if status not in PANEL_STATUSES:
		frappe.throw(
			_("A Group Discussion is completed by pushing its results, not by setting a "
			  "status — otherwise the group would read as finished while its candidates "
			  "sat where they were."),
			title=_("Use Push Results"),
		)
	doc = _load(group_discussion)
	result = cd._set_gd_group_status(doc.campus_drive, doc.round_code, doc.group_name, status)
	frappe.db.commit()
	return result


@frappe.whitelist()
def push_results(group_discussion):
	"""Finish the GD: passers to the next round, fails Rejected, group closed.

	Scoped to THIS group. A panel member pushing their own GD never touches the rest
	of the hall, and the drive's own freeze applies exactly as it does for HR — the
	group becomes Completed and can no longer be regrouped or re-marked.
	"""
	doc = _load(group_discussion)
	if doc.results_pushed:
		frappe.throw(
			_("{0} has already been pushed — its candidates have moved on.")
			.format(frappe.bold(doc.group_name)),
			title=_("Already pushed"),
		)
	if not (doc.candidates or []):
		frappe.throw(_("There are no candidates in this group."))

	result = cd._apply_gd_results(doc.campus_drive, doc.round_code, groups=[doc.group_name])
	frappe.db.commit()
	return result
