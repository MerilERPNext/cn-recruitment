// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

/**
 * Restrict "Applicable To" to Dynamic User Assignments that are explicitly
 * marked applicable for the hiring-workflow process — i.e. assignments whose
 * `applicable_for_process` includes "TA Interview Strategy Template". Catch-all
 * Default assignments are excluded; other assignments cannot be selected here.
 *
 * Matching against a Job Opening is driven by each chosen assignment's
 * `assignment_conditions` — see get_hiring_stages_for_job_opening (server).
 */

frappe.ui.form.on("TA Interview Strategy Template", {
	setup(frm) {
		// `applicable_to` is a Table MultiSelect (extends Link), so the query is
		// set on the field directly (2-arg form) — NOT the grid/child form.
		frm.set_query("applicable_to", () => ({
			query: "recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_hiring_workflow_user_assignments",
		}));
	},
});
