// Interview — "Submit Feedback" opens the Interview Feedback FORM, not a dialog.
//
// HRMS ships a quick dialog (skills, result, comment) that creates and submits the
// feedback in one go. That shortcut skips the form, and the form is where this site's
// campus features live: Region Recommendation and Work Location (see
// public/js/interview_feedback.js). A panel filling the dialog could never recommend
// a region or set the candidate's work location, so those steps were simply
// unreachable for anyone who used the button.
//
// Interception point is `frm.events.show_feedback_dialog`, which HRMS's own
// `submit_feedback` calls by name. Overriding that one key leaves HRMS's button, its
// "already submitted" check and its interviewer check exactly as they are — we only
// change what happens after the skill set comes back. Replacing `submit_feedback`
// instead would not work: Frappe runs every registered handler for an event, so the
// dialog would still open alongside the redirect.
//
// The skill set HRMS just fetched is not thrown away — it seeds the feedback's Skill
// Assessment rows, so the panel lands on a form that is already filled in as far as
// it can be.

frappe.ui.form.on("Interview", {
	refresh(frm) {
		// Per-form assignment, in refresh rather than at load: `frm.events` belongs to
		// this form instance, so nothing global is patched and no other doctype is
		// touched.
		frm.events.show_feedback_dialog = (target, skills) =>
			openFeedbackForm(target || frm, skills);
	},
});

function openFeedbackForm(frm, skills) {
	// An interviewer's own draft from an earlier attempt — reopen it rather than
	// starting a second one, or they would end up with two drafts for one interview.
	frappe.db
		.get_value("Interview Feedback", {
			interview: frm.doc.name,
			interviewer: frappe.session.user,
			docstatus: 0,
		}, "name")
		.then((r) => {
			const existing = r && r.message && r.message.name;
			if (existing) {
				frappe.set_route("Form", "Interview Feedback", existing);
				return;
			}
			frappe.set_route("Form", "Interview Feedback", newFeedback(frm, skills).name);
		});
}

function newFeedback(frm, skills) {
	const doc = frappe.model.get_new_doc("Interview Feedback");
	doc.interview = frm.doc.name;
	doc.interviewer = frappe.session.user;
	doc.job_applicant = frm.doc.job_applicant;
	// Set explicitly: fetch_from resolves on an interactive link change, not when a
	// doc is built in code, so this read-only field would otherwise land empty and
	// fail its own mandatory check.
	if (frm.doc.interview_type) doc.interview_type = frm.doc.interview_type;
	if (frm.doc.interview_round) doc.interview_round = frm.doc.interview_round;

	// The round's expected skills, already fetched by HRMS's submit_feedback. The
	// grid is mandatory, so seeding it is the difference between a form the panel can
	// fill in and one they have to build first.
	(skills || []).forEach((row) => {
		const child = frappe.model.add_child(doc, "Skill Assessment", "skill_assessment");
		child.skill = row.skill;
	});
	return doc;
}
