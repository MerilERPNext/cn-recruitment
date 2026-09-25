import frappe
from frappe import _
from frappe.utils import get_link_to_form 

def check_feedback_and_update_result(interview_feedback):
    # Fetch the Interview document
    interview = frappe.get_doc('Interview', interview_feedback.interview)
    
    interview_details = interview.get('interview_details')  # This retrieves the child table records
    
    # Fetch all feedback for the interview excluding 'Cancelled' status
    feedbacks = frappe.get_all('Interview Feedback', 
                                filters={'interview': interview_feedback.interview, 'docstatus': 1}, 
                                fields=['interviewer', 'result'])
    
    # Check if all interviewers have provided feedback (excluding cancelled)
    if len(feedbacks) < len(interview_details):
        # If not all feedbacks are received, exit without changing the status
        return

    # Count the number of "Cleared" and "Rejected" votes
    cleared_count = sum(1 for feedback in feedbacks if feedback.result == 'Cleared')
    rejected_count = sum(1 for feedback in feedbacks if feedback.result == 'Rejected')
    
    # Update the status directly on the Interview document
    if cleared_count > rejected_count:
        interview.status = 'Cleared'
    elif rejected_count > cleared_count:
        interview.status = 'Rejected'
    else:
        interview.status = 'Pending'

    # Save the updated status
    interview.save(ignore_permissions=True)

@frappe.whitelist()
def on_submit_feedback(doc, method):
    check_feedback_and_update_result(doc)


def record_region_suggestion(doc, method=None):
	"""Interviewer suggested this candidate for a different region — flag it for HR.

	The panel does NOT move the candidate. It records what it thinks and raises a
	Pending flag; the candidate's region, campus, drive, role, stage and status are
	all left exactly as they were. Only HR accepting the suggestion (or setting the
	region directly) changes who interviews them next — see
	``recruitment.api.candidate_region``.

	That split is deliberate: a candidate's region should only ever move by a
	decision someone owns, and it keeps the reason auditable when a report later
	asks why this person was interviewed by another region's panel.

	Runs on submit, so the suggestion is immutable once the feedback is in.
	"""
	if not doc.get("custom_recommend_other_region"):
		return

	region = doc.get("custom_recommended_region")
	if not (region and doc.job_applicant):
		return

	# Backstop for the client-side gate in interview_feedback.js: region routing only
	# selects a Campus Drive Round panel, so flagging a non-campus candidate would
	# leave HR a Pending item they cannot accept.
	from recruitment.api.candidate_region import CAMPUS_FIELDS, _is_campus

	applicant = frappe.db.get_value("Job Applicant", doc.job_applicant,
	                                ["name", "source", *CAMPUS_FIELDS], as_dict=True)
	if not (applicant and _is_campus(applicant)):
		return

	reason = (doc.get("custom_region_recommendation_reason") or "").strip()
	interviewer = doc.interviewer or frappe.session.user

	# Mirrored onto the candidate so the suggestion is reportable straight off Job
	# Applicant — a list view, report or filter can use it without joining back to
	# Interview Feedback. The feedback records stay the full history when more than
	# one panel weighs in; these fields carry the latest.
	#
	# db.set_value rather than a save: these are derived fields, and saving the
	# applicant would re-run every Job Applicant validate hook from inside a feedback
	# submission.
	frappe.db.set_value("Job Applicant", doc.job_applicant, {
		"custom_suggested_region": region,
		"custom_region_suggested_by": interviewer,
		"custom_region_suggestion_reason": reason or None,
		"custom_region_suggestion_status": "Pending",
	})

	region_name = frappe.db.get_value("Region", region, "location_region") or region
	frappe.get_doc("Job Applicant", doc.job_applicant).add_comment(
		"Info",
		_("Interview panel suggested region <b>{0}</b> ({1}) on feedback {2} — "
		  "awaiting HR.{3}").format(
			region_name,
			interviewer,
			get_link_to_form("Interview Feedback", doc.name),
			_("<br>Reason: {0}").format(frappe.utils.escape_html(reason)) if reason else "",
		),
	)


def auto_advance_stage(doc, method):
    """After feedback updates the Interview's verdict, let the Hiring Workflow
    auto-advance / reject the candidate (only for stages flagged ``auto``).

    A campus ADDITIONAL ROUND is deliberately left alone here — it is handed on by
    ``campus_drive.advance_after_extra_round`` instead, and the two must not both act.

    They disagree about where the candidate should land, because they anchor on
    different things. This one advances from wherever the candidate is PARKED; the
    campus one anchors on the ROUND the extra hangs off. An extra round is only ever
    given to someone who already cleared that round, so they are normally parked one
    stage further on already — and this hook, running first, advanced them one stage
    beyond THAT. A second look at Technical Round 1 was pushing candidates from HR
    Round to Job Offer, skipping HR Round entirely, and they vanished from the round
    they were supposed to appear in.
    """
    from recruitment.api.hiring_stage import advance_on_interview_result

    if _is_campus_extra_round(doc.interview):
        return

    advance_on_interview_result(doc.interview)


def _is_campus_extra_round(interview):
    """True for a campus additional round. The reason is what marks one as extra —
    the same test ``advance_after_extra_round`` uses, so the two can never disagree
    about which interviews belong to it."""
    if not interview:
        return False
    row = frappe.db.get_value(
        "Interview", interview,
        ["custom_campus_drive", "custom_extra_interview_reason"], as_dict=True,
    )
    return bool(row and row.custom_campus_drive and row.custom_extra_interview_reason)


@frappe.whitelist()
def create_interview_feedback(data, interview_name, interviewer, job_applicant):
    import json

    if isinstance(data, str):
        data = frappe._dict(json.loads(data))

    # Check if the current user is the interviewer
    if frappe.session.user != interviewer:
        frappe.throw(_("Only Interviewers are allowed to submit Interview Feedback"))

    # Create a new Interview Feedback document
    interview_feedback = frappe.new_doc("Interview Feedback")
    interview_feedback.interview = interview_name
    interview_feedback.interviewer = interviewer
    interview_feedback.job_applicant = job_applicant

    # Append skill assessments
    for d in data.skill_set:
        d = frappe._dict(d)
        interview_feedback.append("skill_assessment", {"skill": d.skill, "rating": d.rating})

    # Combine recommended grade and feedback if provided
    if data.get("recommended_grade"):
        if data.get("feedback"):
            feedback_content = f"Recommended Grade: {data.recommended_grade}\nFeedback: {data.feedback}"
        else:
            feedback_content = f"Recommended Grade: {data.recommended_grade}"
    else:
        feedback_content = data.feedback or ""

    interview_feedback.feedback = feedback_content
    interview_feedback.result = data.result

    # Region recommendation, when the interviewer ticked it. Carried explicitly
    # because this API builds the doc field by field rather than from the payload.
    if data.get("recommend_other_region"):
        if not data.get("recommended_region"):
            frappe.throw(_("Select the region you are recommending this candidate for."))
        interview_feedback.custom_recommend_other_region = 1
        interview_feedback.custom_recommended_region = data.get("recommended_region")
        interview_feedback.custom_region_recommendation_reason = data.get(
            "region_recommendation_reason"
        )

    # Work location the panel is taking this candidate for. Campus-only and checked
    # against the region by the validate hook
    # (recruitment.api.interview_work_location); on submit it becomes the
    # candidate's final location.
    #
    # Not taken while this feedback recommends another region: the branch is then that
    # region's panel's to pick, and the validate hook clears it either way. Said out
    # loud rather than dropped in silence, because this caller's form still shows the
    # field next to the tick.
    if data.get("work_location"):
        if interview_feedback.custom_recommend_other_region:
            frappe.msgprint(
                _("Work location was not recorded: you are recommending this candidate "
                  "for another region, so the panel of the region they are moved to "
                  "sets it."),
                indicator="orange", alert=True)
        else:
            interview_feedback.custom_work_location = data.get("work_location")

    # Save and submit the document
    interview_feedback.save()
    interview_feedback.submit()

    # Notify the user of successful submission
    frappe.msgprint(
        _("Interview Feedback {0} submitted successfully").format(
            get_link_to_form("Interview Feedback", interview_feedback.name)
        )
    )




def fill_skill_descriptions(doc, method=None):
    """Stamp each Skill Assessment row with what the skill means for this round.

    The round's Expected Skill Set description wins — it is written for this round
    ("system design at senior level") — and the Skill master's generic description is
    the fallback. On validate rather than in the form, because rows arrive from four
    places (HRMS desk, the Submit Feedback route, the REST API, create_interview_feedback)
    and only some of them run the form's JS.
    """
    rows = doc.get("skill_assessment") or []
    if not rows:
        return
    descriptions = get_skill_descriptions(_feedback_round(doc), [r.skill for r in rows])
    for row in rows:
        row.custom_description = descriptions.get(row.skill)


def _feedback_round(doc):
    """The round this feedback is for, whichever field this HRMS version keeps it in.

    v15 stores it in ``interview_round`` (-> Interview Round), v16 in
    ``interview_type`` (-> Interview Type). Reading ``doc.interview_round`` alone
    found nothing on v16, so every row fell back to the Skill master's generic
    description and the round's own wording was never used.
    """
    from recruitment.api.hiring_stage import get_interview_round_field

    field = get_interview_round_field("Interview Feedback")
    return doc.get(field) if field else None


@frappe.whitelist()
def get_skill_descriptions(interview_round=None, skills=None, interview_type=None):
    """{skill: description} — round's Expected Skill Set first, Skill master second.

    The round may be passed as ``interview_round`` (HRMS v15 naming) or
    ``interview_type`` (v16); either is the name of a record of the round doctype
    this site actually has, and the Expected Skill Set is read from under that
    doctype -- "Interview Round" on v15, "Interview Type" on v16.
    """
    from recruitment.api.hiring_stage import get_interview_round_doctype

    if isinstance(skills, str):
        skills = frappe.parse_json(skills)
    skills = [s for s in (skills or []) if s]
    if not skills:
        return {}

    descriptions = dict(frappe.get_all(
        "Skill", filters={"name": ["in", skills]}, fields=["name", "description"], as_list=True,
    ))
    round_name = interview_round or interview_type
    round_doctype = get_interview_round_doctype()
    if round_name and round_doctype:
        for skill, description in frappe.get_all(
            "Expected Skill Set",
            filters={"parent": round_name, "parenttype": round_doctype, "skill": ["in", skills]},
            fields=["skill", "description"], as_list=True,
        ):
            if description:
                descriptions[skill] = description
    return {s: descriptions.get(s) for s in skills}
