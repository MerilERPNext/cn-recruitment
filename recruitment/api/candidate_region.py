"""HR actions on a candidate's interview region.

A candidate applies under one region (``custom_region``, fetched from their Campus
Invite). Two things can argue for interviewing them somewhere else:

* an interview panel suggests it while giving feedback, which only raises a
  ``Pending`` flag — see ``record_region_suggestion``; or
* the candidate asks HR directly.

Either way the region only moves when HR acts, and it moves through this module so
every change lands in one place with a reason on the candidate's timeline. Nothing
else about the candidate changes: same campus, same drive, same institute, same job
opening, same stage. The only downstream effect is that later interview rounds are
panelled by the new region (``Campus Drive Round Panelist.region``).

Already-scheduled interviews keep the panel they were given — re-panelling someone
mid-round would move a slot out from under them.
"""

import frappe
from frappe import _

SUGGESTION_FIELDS = ("custom_suggested_region", "custom_region_suggested_by",
                     "custom_region_suggestion_reason", "custom_region_suggestion_status")

# What marks a candidate as campus. Linkage is checked as well as `source` because
# campus candidates created outside the portal flow (drive imports, seeding) carry
# the invite but may have no source stamped.
CAMPUS_FIELDS = ("custom_campus_invite", "custom_campus_drive", "custom_institute")
CAMPUS_SOURCE = "Campus Hiring"


def _is_campus(doc):
	return bool(any(doc.get(f) for f in CAMPUS_FIELDS) or doc.get("source") == CAMPUS_SOURCE)


def _assert_campus(doc):
	"""Region routing picks a Campus Drive Round panel, so it only means anything for
	campus candidates. Setting it elsewhere would write a field nothing ever reads."""
	if not _is_campus(doc):
		frappe.throw(_("{0} is not a campus candidate — interview region only applies to "
		               "campus hiring, where it selects the drive round's panel.")
		             .format(doc.name))


def _region_label(region):
	if not region:
		return _("their own region")
	return frappe.db.get_value("Region", region, "location_region") or region


def _load(job_applicant):
	"""Fetch the candidate's region state, asserting the caller may change it."""
	if not job_applicant:
		frappe.throw(_("Job Applicant is required."))
	frappe.has_permission("Job Applicant", "write", doc=job_applicant, throw=True)
	doc = frappe.db.get_value(
		"Job Applicant", job_applicant,
		["name", "source", "custom_region", "custom_interview_region",
		 *CAMPUS_FIELDS, *SUGGESTION_FIELDS],
		as_dict=True,
	)
	if not doc:
		frappe.throw(_("Job Applicant {0} not found.").format(job_applicant))
	return doc


def _apply(job_applicant, region, note):
	"""Write the region and record why, in one place for every path in here.

	db.set_value rather than a save: these are routing fields, and a save would
	re-run every Job Applicant validate hook — including the ones that lock a
	candidate down once they are far along the pipeline.
	"""
	frappe.db.set_value("Job Applicant", job_applicant, "custom_interview_region", region)
	frappe.get_doc("Job Applicant", job_applicant).add_comment("Info", note)
	frappe.db.commit()


@frappe.whitelist()
def set_interview_region(job_applicant, region=None, reason=None):
	"""HR points the candidate at a region's interview panel (or clears it).

	Used both for a candidate's own request and for HR overriding a suggestion.
	Passing an empty ``region`` sends them back to the region they applied under.
	"""
	doc = _load(job_applicant)
	_assert_campus(doc)
	region = region or None
	if region and not frappe.db.exists("Region", region):
		frappe.throw(_("Region {0} does not exist.").format(region))
	if region == doc.custom_interview_region:
		return {"changed": False, "interview_region": region}

	reason = (reason or "").strip()
	if region:
		note = _("Interview region set to <b>{0}</b> by {1}.").format(
			_region_label(region), frappe.session.user)
	else:
		note = _("Interview region cleared by {0} — back to {1}.").format(
			frappe.session.user, _region_label(doc.custom_region))
	if reason:
		note += _("<br>Reason: {0}").format(frappe.utils.escape_html(reason))

	_apply(job_applicant, region, note)
	return {"changed": True, "interview_region": region,
	        "region_label": _region_label(region or doc.custom_region)}


@frappe.whitelist()
def accept_region_suggestion(job_applicant, reason=None):
	"""HR agrees with the panel: apply the suggested region and close the flag."""
	doc = _load(job_applicant)
	_assert_campus(doc)
	if doc.custom_region_suggestion_status != "Pending":
		frappe.throw(_("There is no pending region suggestion on this candidate."))
	if not doc.custom_suggested_region:
		frappe.throw(_("The pending suggestion has no region on it."))

	note = _("Region suggestion accepted by {0} — interviews move to <b>{1}</b> "
	         "(suggested by {2}).").format(
		frappe.session.user, _region_label(doc.custom_suggested_region),
		doc.custom_region_suggested_by or _("an interviewer"))
	if (reason or "").strip():
		note += _("<br>Note: {0}").format(frappe.utils.escape_html(reason.strip()))

	frappe.db.set_value("Job Applicant", job_applicant, "custom_region_suggestion_status",
	                    "Accepted")
	_apply(job_applicant, doc.custom_suggested_region, note)
	return {"accepted": True, "interview_region": doc.custom_suggested_region,
	        "region_label": _region_label(doc.custom_suggested_region)}


@frappe.whitelist()
def dismiss_region_suggestion(job_applicant, reason=None):
	"""HR disagrees: close the flag and leave the candidate where they are.

	The suggestion itself is kept, not wiped — a dismissed recommendation is still
	worth reporting on, and the panel's reasoning stays on record.
	"""
	doc = _load(job_applicant)
	if doc.custom_region_suggestion_status != "Pending":
		frappe.throw(_("There is no pending region suggestion on this candidate."))

	note = _("Region suggestion for <b>{0}</b> dismissed by {1} — candidate stays with "
	         "{2}.").format(
		_region_label(doc.custom_suggested_region), frappe.session.user,
		_region_label(doc.custom_interview_region or doc.custom_region))
	if (reason or "").strip():
		note += _("<br>Reason: {0}").format(frappe.utils.escape_html(reason.strip()))

	frappe.db.set_value("Job Applicant", job_applicant, "custom_region_suggestion_status",
	                    "Dismissed")
	frappe.get_doc("Job Applicant", job_applicant).add_comment("Info", note)
	frappe.db.commit()
	return {"dismissed": True}
