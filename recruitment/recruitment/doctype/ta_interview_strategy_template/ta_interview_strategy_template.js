// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

/**
 * Restrict "Applicable To" to Dynamic User Assignments of purpose **Attributes**
 * — the only kind that can restrict which Job Openings a template covers. An
 * assignment is on offer when it is tagged for the "Job Opening" (or legacy
 * "TA Interview Strategy Template") process, or carries no process tags at all.
 *
 * Matching against a Job Opening is driven by each chosen assignment's
 * `assignment_attributes` — see get_hiring_stages_for_job_opening (server).
 */

// A round whose Step Type is "Interview" names a real interview round — the
// Round cell becomes a Link picker (Interview Round on HRMS v15, Interview Type
// on v16; the doctype is resolved server-side). Every other step type stays free
// text. See public/js/interview_round_link.js.
(function () {
	const ROUND_LINK = {
		grid: "interview_rounds",
		name_field: "round_name",
		type_field: "step_type",
	};

	frappe.ui.form.on("TA Interview Strategy Round", {
		step_type(frm, cdt, cdn) {
			recruitment.interview_round_link.sync_row(frm, ROUND_LINK, cdt, cdn);
		},
	});

	frappe.ui.form.on("TA Interview Strategy Template", {
		refresh(frm) {
			recruitment.interview_round_link.sync(frm, ROUND_LINK);
		},

		interview_rounds_add(frm, cdt, cdn) {
			recruitment.interview_round_link.sync_row(frm, ROUND_LINK, cdt, cdn);
		},
	});
})();

frappe.ui.form.on("TA Interview Strategy Template", {
	onload(frm) {
		// `skip_stage_for_sources` is a Table MultiSelect nested inside the
		// interview-rounds child grid. The form's meta bundle only reaches one
		// level deep, so this grandchild target doctype is never shipped to the
		// browser — and rendering the control in the grid-row form (the pencil
		// edit) throws "Table MultiSelect requires a Table with atleast one Link
		// field". Warm its meta up-front so the control can resolve its Link field.
		frappe.model.with_doctype("TA Hiring Source Item");
	},

	setup(frm) {
		// `applicable_to` is a Table MultiSelect (extends Link), so the query is
		// set on the field directly (2-arg form) — NOT the grid/child form.
		frm.set_query("applicable_to", () => ({
			query: "recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_hiring_workflow_user_assignments",
		}));

		// The panel picker is the mirror image — People assignments, not
		// Attributes ones. Three-arg form: this field lives in a child grid.
		frm.set_query("interviewer_pool", "interview_rounds", () => ({
			query: "recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_interviewer_user_assignments",
		}));
		frm.set_query("evaluation_form", "interview_rounds", () => ({ filters: { doc_type: ["in", ["Interview Feedback", "Interview"]], is_archived: 0 } }));
	},
});
