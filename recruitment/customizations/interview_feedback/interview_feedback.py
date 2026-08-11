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
    auto-advance / reject the candidate (only for stages flagged ``auto``)."""
    from recruitment.api.hiring_stage import advance_on_interview_result

    advance_on_interview_result(doc.interview)


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
    if data.get("work_location"):
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


