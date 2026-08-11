// Interview — a panel member sees only what they need to take the interview.
//
// HR runs the schedule from this form: meeting links, travel, panel composition,
// the interview summary, the ratings block. None of that is an interviewer's to
// read, and "Expected Average Rating" in particular anchors a panel on a number
// before they have met the candidate. So everything outside the list below is
// hidden for anyone who is not running recruitment.
//
// The test is "does this user run recruitment", NOT "does this user hold the
// Interviewer role" — panel members here are ordinary Employee / Employee Self
// Service users who reach the form through a share, and none of them carry the
// Interviewer role. Gating on that role would have hidden nothing from anyone.
//
// Hidden rather than permission-restricted, deliberately: this is about clutter on
// one form, not about secrets. The fields still exist and HR still owns them, so
// nothing here can quietly break the scheduling flow.

// The fields the panel is meant to see, plus the structure holding them and the
// Feedback tab — which is not information about the interview, it is how the panel
// does their job, so dropping it would leave them a read-only page.
const PANEL_VISIBLE_FIELDS = [
	"interview_details_section",
	"interview_type",
	"job_applicant",
	"designation",
	"custom_resume_attachment",
	"column_break_4",
	"status",
	"scheduled_on",
	"feedback_tab",
	"feedback_html",
];

// Holding any of these means the user runs recruitment rather than sitting on
// panels, and they keep the whole form.
const FULL_VIEW_ROLES = ["HR User", "HR Manager", "System Manager", "Job Recruiter"];

frappe.ui.form.on("Interview", {
	refresh(frm) {
		if (runsRecruitment() || frm.__panel_view_applied) return;
		trimToPanelView(frm);
		// Once per form: the hidden flags live on the form's own copy of the meta and
		// survive later refreshes, so redoing the sweep on every refresh would only
		// re-render fields that are already hidden.
		frm.__panel_view_applied = true;
	},
});

function runsRecruitment() {
	const roles = frappe.user_roles || [];
	return FULL_VIEW_ROLES.some((r) => roles.includes(r));
}

function trimToPanelView(frm) {
	const keep = new Set(PANEL_VISIBLE_FIELDS);
	// Driven off the meta rather than a hardcoded hide-list, so a field added to the
	// Interview later is hidden by default instead of silently appearing for panels.
	(frm.meta.fields || []).forEach((df) => {
		if (keep.has(df.fieldname) || isEmptyMandatory(frm, df)) return;
		frm.set_df_property(df.fieldname, "hidden", 1);
	});
}

function isEmptyMandatory(frm, df) {
	// Never hide a mandatory field that has no value: saving would fail against a
	// field the user cannot see or fill. Every scheduled interview has these filled,
	// so this is a guard against bad data, not the normal path.
	if (!df.reqd) return false;
	const value = frm.doc[df.fieldname];
	return Array.isArray(value) ? value.length === 0 : !value;
}
