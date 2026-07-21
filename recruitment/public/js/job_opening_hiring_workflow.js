/* global frappe, __ */
/**
 * Job Opening — auto-prefill the Hiring workflow tab (custom_hiring_stages)
 * from the matching "Hiring Workflow" master (TA Interview Strategy Template).
 *
 * The master's "Applicable To" lists Dynamic User Assignments. A template
 * applies when one of those assignments' conditions (department, designation,
 * location, company, etc.) is satisfied by this Job Opening's own field
 * values; on multiple matches the most recently created template wins. The
 * whole live form doc is sent so conditions can reference any field.
 *
 * Server: recruitment.recruitment.doctype.ta_interview_strategy_template
 *         .ta_interview_strategy_template.get_hiring_stages_for_job_opening
 */

(function () {
	const METHOD =
		"recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template.get_hiring_stages_for_job_opening";

	function applyStages(frm, stages) {
		frm.clear_table("custom_hiring_stages");
		(stages || []).forEach((s) => frm.add_child("custom_hiring_stages", s));
		frm.refresh_field("custom_hiring_stages");
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
						frappe.show_alert({
							message: __("No matching hiring workflow template found."),
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
		refresh(frm) {
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

	// Re-prefill (only while the tab is empty) when a field commonly used in
	// assignment conditions changes. The "Fetch Hiring Workflow" button covers
	// any other field a condition might reference.
	["department", "designation", "company", "location"].forEach((field) => {
		frappe.ui.form.on("Job Opening", {
			[field](frm) {
				fetchAndFill(frm);
			},
		});
	});
})();
