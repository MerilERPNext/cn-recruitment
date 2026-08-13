"""Work location on Interview Feedback — the panel decides where a campus hire sits.

A campus candidate is interviewed by a region (their Campus Invite's region, or the
one HR routed them to). The panel that clears them is the party that actually knows
which branch in that region the candidate is being taken for, so the feedback form
carries the choice: pick a Work Location, submit, and it becomes the candidate's
location — ``Job Applicant.custom_location``, the same field the offer and Employee
Onboarding (``custom_work_location``) read downstream.

Two rules make it safe to let an interviewer write a candidate-level field:

* **Campus only.** Region routing, and therefore this list, only exists for campus
  hiring. For a lateral / referral / IJP interview the field is hidden and cleared —
  see ``validate_work_location``.
* **Inside the region.** The options are the Work Locations whose ``custom_region``
  is the candidate's region, so a panel cannot post someone to a branch their region
  does not run.

The region itself is never typed in: it is derived from the candidate (see
``resolve_region``) and shown read-only next to the location.
"""

import frappe
from frappe import _
from frappe.utils import get_link_to_form

from recruitment.api.candidate_region import CAMPUS_FIELDS, _is_campus

# Branch carries two "not usable any more" flags — a legacy `disabled` alongside
# `custom_disabled`. Either being set takes the location out of the list.
DISABLED_BRANCH_FIELDS = ("disabled", "custom_disabled")

_APPLICANT_FIELDS = ("name", "source", "custom_region", "custom_interview_region",
                     "custom_location", *CAMPUS_FIELDS)


def _region_label(region):
	if not region:
		return ""
	return frappe.db.get_value("Region", region, "location_region") or region


def _applicant(job_applicant):
	if not job_applicant:
		return None
	return frappe.db.get_value("Job Applicant", job_applicant, list(_APPLICANT_FIELDS),
	                           as_dict=True)


def _invite_region(campus_invite):
	# Guarded because frappe.db.get_value with a None name filters on nothing and
	# hands back an arbitrary row's region.
	if not campus_invite:
		return None
	return frappe.db.get_value("Campus Invite", campus_invite, "region")


def _drive_region(campus_drive):
	"""The region of a Campus Drive, when it points at exactly one.

	Region lives on the Campus Invite, and a drive is a set of invites. Almost every
	drive is run for one region, so this resolves; a genuinely multi-region drive is
	ambiguous and returns nothing rather than guessing one. Only reached for older
	candidates who carry the drive but no invite.
	"""
	if not campus_drive:
		return None

	invites = frappe.get_all("Campus Drive Invite",
	                         filters={"parent": campus_drive, "parenttype": "Campus Drive"},
	                         pluck="campus_invite")
	if not invites:
		return None

	regions = {r for r in frappe.get_all("Campus Invite", filters={"name": ("in", invites)},
	                                     pluck="region") if r}
	return regions.pop() if len(regions) == 1 else None


def resolve_region(applicant, recommended_region=None):
	"""Which region's locations this candidate may be posted to.

	A recommendation on the feedback wins: if this same panel is arguing the
	candidate belongs to another region, the location they pick has to be a location
	of *that* region — offering the old region's branches alongside a
	"recommended for elsewhere" tick would produce a contradictory record.

	Otherwise it is the region that actually owns the candidate: the one HR routed
	them to, else the one they applied under.

	``custom_region`` is a fetch_from of the Campus Invite and only fills in on a
	save, so plenty of campus candidates carry the invite with the region still
	blank — hence reading the invite directly before falling back to the drive.
	"""
	if recommended_region:
		return recommended_region
	if not applicant:
		return None
	return (applicant.get("custom_interview_region")
	        or applicant.get("custom_region")
	        or _invite_region(applicant.get("custom_campus_invite"))
	        or _drive_region(applicant.get("custom_campus_drive")))


def get_region_branches(region):
	"""Enabled Work Locations belonging to a Region, or [] when none are mapped.

	The mapping is maintained on the WORK LOCATION: each Branch carries a
	``custom_region`` Link, and that field alone decides which region a location
	belongs to. This is the one direction the filter reads, here and everywhere else
	region-to-location filtering happens.

	``Region.locations`` (a Table MultiSelect on the Region master) expressed the same
	link from the other side and used to be unioned in here. Two masters for one fact
	is how they drift: the same branch could sit under two regions, a branch removed
	from one side stayed visible through the other, and neither side could be trusted
	as the answer. The Branch field wins because a location belongs to exactly one
	region — that is a property of the location, not a list the region keeps.
	"""
	if not region:
		return []

	rows = frappe.get_all("Branch", filters={"custom_region": region},
	                      fields=["name", *DISABLED_BRANCH_FIELDS], order_by="name asc")
	return [r.name for r in rows if not any(r.get(f) for f in DISABLED_BRANCH_FIELDS)]


def locked_location(job_applicant, exclude=None):
	"""The work location an earlier panel already committed to, if there is one.

	The first submitted feedback that carries a location settles it; every later round
	shows that value read-only. Otherwise each panel would overwrite the one before
	and the candidate's posting would be decided by whoever happened to submit last.

	Keyed off earlier **feedback**, deliberately, not off the candidate's
	``custom_location``: that field is pre-filled from the job opening
	(``fetch_from: job_title.custom_location``), so keying off it would lock the field
	before any interviewer had touched it.

	Oldest first — the round that decided it, not the most recent to mention it.
	"""
	if not job_applicant:
		return None

	filters = {"job_applicant": job_applicant, "docstatus": 1,
	           "custom_work_location": ("is", "set")}
	if exclude:
		filters["name"] = ("!=", exclude)
	rows = frappe.get_all("Interview Feedback", filters=filters,
	                      fields=["name", "custom_work_location", "interviewer",
	                              "custom_work_location_region"],
	                      order_by="creation asc", limit=1)
	if not rows:
		return None

	# A settled location only binds while the candidate is still being interviewed by
	# the region that settled it. Once HR moves them — the candidate asked to sit in
	# Gujarat, say — a branch in the region they left is the wrong answer, and the
	# panel taking the next round has to pick one in the new region. Feedback from
	# before this field existed carries no region and keeps binding, as it did.
	settled_in = rows[0].get("custom_work_location_region")
	if settled_in and settled_in != resolve_region(_applicant(job_applicant)):
		return None
	return rows[0]


def _may_see(job_applicant):
	"""Who is allowed to ask which locations a candidate can be posted to.

	Read permission on the Job Applicant is the obvious answer, but the panel filling
	in the feedback usually does not have it — the Interviewer role carries no Job
	Applicant permission — and they are exactly who the field is for. Sitting on the
	panel of one of this candidate's interviews is therefore enough.

	The panel check goes first because it is one indexed query, while a doc-level
	``has_permission`` loads the whole Job Applicant — every child table with it —
	just to answer. Panel members are the common caller here, so they pay one query
	instead of four; HR pays one extra cheap one before the permission check they
	were always going to pass.
	"""
	on_panel = frappe.db.sql(
		"""select 1 from `tabInterview Detail` d
		   join `tabInterview` i on i.name = d.parent
		   where d.interviewer = %s and i.job_applicant = %s limit 1""",
		(frappe.session.user, job_applicant),
	)
	return bool(on_panel) or frappe.has_permission("Job Applicant", "read",
	                                               doc=job_applicant)


@frappe.whitelist()
def get_work_location_context(job_applicant=None, recommended_region=None):
	"""Everything the Interview Feedback form needs to draw the Work Location field.

	``restricted`` is False when the region has no locations mapped to it yet. The
	form then offers every branch rather than an empty dropdown the panel cannot get
	past — an unmaintained location master should not block interview feedback.
	"""
	blank = {"is_campus": False, "region": None, "region_label": None, "branches": [],
	         "restricted": False, "current_location": None, "locked_to": None,
	         "locked_by": None}
	if not job_applicant or not frappe.db.exists("Job Applicant", job_applicant):
		return blank

	if not _may_see(job_applicant):
		frappe.throw(_("Not permitted."), frappe.PermissionError)

	applicant = _applicant(job_applicant)
	if not applicant or not _is_campus(applicant):
		return blank

	region = resolve_region(applicant, recommended_region)
	branches = get_region_branches(region)
	locked = locked_location(job_applicant)
	return {
		"is_campus": True,
		"region": region,
		"region_label": _region_label(region),
		"branches": branches,
		"restricted": bool(branches),
		"current_location": applicant.get("custom_location"),
		# Set once an earlier round has settled the location: the form shows it
		# read-only so a later panel cannot move the candidate somewhere else.
		"locked_to": locked.custom_work_location if locked else None,
		"locked_by": locked.interviewer if locked else None,
	}


def validate_work_location(doc, method=None):
	"""Stamp the region and keep the location honest, on every save of the feedback.

	Clearing rather than throwing for a non-campus interview is deliberate: the field
	is hidden there, so anything in it arrived from an amend, a copied doc or an API
	caller — dropping it silently is right, blocking an otherwise valid feedback is
	not.
	"""
	applicant = _applicant(doc.job_applicant)

	if not applicant or not _is_campus(applicant):
		doc.custom_work_location = None
		doc.custom_work_location_region = None
		return

	# An earlier round already settled this. The form shows the field read-only, so a
	# different value here came from an API caller or a stale tab — take the settled
	# one rather than reject the feedback, which is the part that actually matters.
	locked = locked_location(doc.job_applicant, exclude=doc.name)
	if locked:
		doc.custom_work_location = locked.custom_work_location

	recommended = (doc.get("custom_recommended_region")
	               if doc.get("custom_recommend_other_region") else None)
	region = resolve_region(applicant, recommended)
	doc.custom_work_location_region = region

	if not doc.custom_work_location:
		return

	# An empty `allowed` means the region has nothing mapped to it; the form offered
	# every branch in that case, so accept what was picked rather than reject it.
	allowed = get_region_branches(region)
	if allowed and doc.custom_work_location not in allowed:
		frappe.throw(_("{0} is not a location of region {1}. Pick one of that region's "
		               "locations as the work location.")
		             .format(doc.custom_work_location, _region_label(region) or region))


def apply_work_location(doc, method=None):
	"""On submit, the panel's pick becomes the candidate's work location.

	Written to ``Job Applicant.custom_location`` — the field the offer and Employee
	Onboarding read — so what the panel chose is where the candidate is finally
	posted.

	Only the round that settles it writes. Once an earlier feedback has set a
	location, later rounds carry the same value read-only and write nothing: the
	decision is made, and HR may have adjusted it on the candidate since, which a
	later panel must not silently undo.

	db.set_value rather than a save: this is one field, and saving the applicant from
	inside a feedback submission would re-run every Job Applicant validate hook,
	including the ones that lock a candidate down late in the pipeline.
	"""
	location = doc.get("custom_work_location")
	if not (location and doc.job_applicant):
		return
	if locked_location(doc.job_applicant, exclude=doc.name):
		return

	previous = frappe.db.get_value("Job Applicant", doc.job_applicant, "custom_location")
	if previous == location:
		return

	frappe.db.set_value("Job Applicant", doc.job_applicant, "custom_location", location)

	region_label = _region_label(doc.get("custom_work_location_region"))
	note = _("Work location set to <b>{0}</b>{1} by {2} on feedback {3}.").format(
		frappe.utils.escape_html(location),
		_(" — region {0}").format(frappe.utils.escape_html(region_label)) if region_label else "",
		doc.interviewer or frappe.session.user,
		get_link_to_form("Interview Feedback", doc.name),
	)
	if previous:
		note += _("<br>Replaces: {0}.").format(frappe.utils.escape_html(previous))

	frappe.get_doc("Job Applicant", doc.job_applicant).add_comment("Info", note)


def clear_location_on_region_change(doc, method=None):
	"""Empty the candidate's work location when HR moves them to another region.

	The location is a branch, and a branch belongs to one region — leaving Borivali
	on a candidate now being interviewed in Gujarat states something untrue, and the
	offer and the Employee record both read this field.

	So the change unsettles it: the field is cleared and the panel taking the next
	round picks a location in the new region on their feedback, which writes it back
	(``apply_work_location``). ``locked_location`` stops binding across a region
	change for the same reason.
	"""
	if doc.is_new():
		return
	before = doc.get_doc_before_save()
	if not before:
		return
	if (before.get("custom_interview_region") or "") == (doc.get("custom_interview_region") or ""):
		return
	if not doc.get("custom_location"):
		return

	frappe.msgprint(
		_("Work location {0} was cleared: it is in the region this candidate is moving "
		  "away from. The panel taking their next round will pick one in {1}.").format(
			frappe.bold(doc.get("custom_location")),
			frappe.bold(_region_label(doc.get("custom_interview_region")) or _("the new region"))),
		title=_("Work location cleared"), indicator="orange", alert=True)
	doc.custom_location = None
