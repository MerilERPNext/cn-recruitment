/* global frappe, __ */
/**
 * Custom Doctype Fields — "Sync fields from Employee" button.
 *
 * For the recruitment-lifecycle targets (Job Applicant, Employee Onboarding),
 * one click mirrors the entire Employee field/layout structure onto this
 * config (and the generated Custom Fields), instead of running the bench
 * `sync_employee_fields` method by hand.
 *
 * Server: recruitment.recruitment.employee_field_sync.sync_employee_fields
 */

frappe.ui.form.on("Custom Doctype Fields", {
	refresh(frm) {
		// Only meaningful for the doctypes we mirror Employee onto.
		const TARGETS = ["Job Applicant", "Employee Onboarding"];
		if (frm.is_new() || !TARGETS.includes(frm.doc.doc_type)) return;

		// Keep mass field-creation to admins / HR.
		const allowed = ["System Manager", "HR Manager"];
		if (!allowed.some((r) => (frappe.user_roles || []).includes(r))) return;

		frm.add_custom_button(__("Sync fields from Employee"), () => {
			frappe.confirm(
				__("Mirror every Employee field and its layout onto {0}? Existing rows are kept and repositioned; only missing fields are added.",
					[frm.doc.doc_type]),
				() => {
					frappe.dom.freeze(__("Syncing fields from Employee…"));
					frappe.call({
						method: "recruitment.recruitment.employee_field_sync.sync_employee_fields",
						args: { targets: frm.doc.doc_type },
						callback: (r) => {
							frappe.dom.unfreeze();
							const res = ((r.message || {}).results || [])[0] || {};
							frappe.msgprint({
								title: __("Sync complete"),
								indicator: "green",
								message: __("Added {0}, updated {1}, deleted {2}, repositioned {3}. Total mirrored rows: {4}.",
									[res.added || 0, res.updated || 0, res.deleted || 0,
									 res.repositioned || 0, res.total_rows || 0]),
							});
							frm.reload_doc();
						},
						error: () => frappe.dom.unfreeze(),
					});
				}
			);
		});
	},
});
