/* global frappe, __ */
/**
 * Job Opening — auto-prefill the Hiring workflow tab (custom_hiring_stages)
 * from the matching "Hiring Workflow" master (TA Interview Strategy Template).
 *
 * The master's "Applicable To" lists Dynamic User Assignments of purpose
 * Attributes. A template applies when one of those assignments' attributes
 * (department, designation, location, company, etc.) is satisfied by this Job
 * Opening's own field values; on multiple matches the most specific template
 * wins. The whole live form doc is sent so attributes can name any field.
 *
 * Server: recruitment.recruitment.doctype.ta_interview_strategy_template
 *         .ta_interview_strategy_template.get_hiring_stages_for_job_opening
 */

(function () {
	const METHOD =
		"recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_hiring_stages_for_job_opening";

	// "Interview" stages name a real interview round (Interview Round on HRMS v15,
	// Interview Type on v16) — see interview_round_link.js.
	const STAGE_LINK = {
		grid: "custom_hiring_stages",
		name_field: "stage_name",
		type_field: "stage_type",
	};

	function applyStages(frm, stages) {
		frm.clear_table("custom_hiring_stages");
		(stages || []).forEach((s) => frm.add_child("custom_hiring_stages", s));
		frm.refresh_field("custom_hiring_stages");
		recruitment.interview_round_link.sync(frm, STAGE_LINK);
		recruitment.hiring_round_counts.recount(frm);
	}

	function fetchAndFill(frm, opts) {
		const force = !!(opts && opts.force);
		// Only prefill an empty tab automatically — never clobber the user's
		// own stages unless they explicitly ask to re-fetch.
		if (!force && (frm.doc.custom_hiring_stages || []).length) return;

		frappe.call({
			method: METHOD,
			args: {
				job_opening: frm.is_new() ? null : frm.doc.name,
				// Send the live doc so unsaved openings match and conditions can
				// reference any field the recruiter has filled in.
				doc: JSON.stringify(frm.doc),
			},
			callback: (r) => {
				const msg = (r && r.message) || {};
				const stages = msg.stages || [];
				if (!stages.length) {
					if (force) {
						// A deferred match is not "no match": a template's
						// attributes name a field this opening hasn't filled in
						// yet, so prefilling anything now would be a guess.
						frappe.show_alert({
							message: msg.deferred
								? __("Fill in the opening's details — a hiring workflow template is waiting on them.")
								: __("No matching hiring workflow template found."),
							indicator: "orange",
						});
					}
					return;
				}
				applyStages(frm, stages);
				frm.dirty();
				frappe.show_alert({
					message: __("Hiring workflow loaded from template {0}", [
						frappe.utils.escape_html(msg.template_name || msg.template || ""),
					]),
					indicator: "green",
				});
			},
		});
	}

	frappe.ui.form.on("Job Opening", {
		setup(frm) {
			// Panels are made of people, so only People assignments are offered —
			// the Attributes ones scope which openings a template covers instead.
			// Three-arg form: the field lives in a child grid.
			frm.set_query("interviewer_pool", "custom_hiring_stages", () => ({
				query: "recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_interviewer_user_assignments",
			}));
			frm.set_query("evaluation_form", "custom_hiring_stages", () => ({ filters: { doc_type: ["in", ["Interview Feedback", "Interview"]], is_archived: 0 } }));
		},

		refresh(frm) {
			// Stage Name is a round picker on Interview rows, free text elsewhere.
			recruitment.interview_round_link.sync(frm, STAGE_LINK);

			// Master switch: when the Hiring Workflow feature is off, add no
			// button and don't auto-fill — the Job Opening behaves as before.
			frappe.call({
				method: "recruitment.api.hiring_stage.is_enabled",
				callback: (r) => {
					if (!r.message) return;

					// Manual re-fetch — replaces the current stages with the template's.
					frm.add_custom_button(__("Fetch Hiring Workflow"), () => {
						if ((frm.doc.custom_hiring_stages || []).length) {
							frappe.confirm(
								__("This will replace the current hiring stages with the matching template. Continue?"),
								() => fetchAndFill(frm, { force: true })
							);
						} else {
							fetchAndFill(frm, { force: true });
						}
					});

					// Auto-prefill once, while the tab is still empty.
					fetchAndFill(frm);
				},
			});
		},
	});

	// Switching a row's type flips its Stage Name between a round picker and free
	// text; a freshly added row starts as free text until a type is chosen.
	frappe.ui.form.on("Job Opening Hiring Stage", {
		stage_type(frm, cdt, cdn) {
			recruitment.interview_round_link.sync_row(frm, STAGE_LINK, cdt, cdn);
		},
	});

	frappe.ui.form.on("Job Opening", {
		custom_hiring_stages_add(frm, cdt, cdn) {
			recruitment.interview_round_link.sync_row(frm, STAGE_LINK, cdt, cdn);
		},
	});

	// Re-prefill (only while the tab is empty) when a field commonly used in
	// assignment attributes changes. The "Fetch Hiring Workflow" button covers
	// any other field an attribute might name.
	["department", "designation", "company", "location"].forEach((field) => {
		frappe.ui.form.on("Job Opening", {
			[field](frm) {
				fetchAndFill(frm);
			},
		});
	});
})();
