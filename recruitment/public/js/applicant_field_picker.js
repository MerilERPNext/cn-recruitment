/**
 * applicant_field_picker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates the "Applicant Field" Select pickers (eligibility rules, screener
 * questions, duplicity / rehire check fields) from Job Applicant metadata.
 *
 * The Select shows each field's LABEL but stores its FIELDNAME (Frappe Select
 * supports {label, value} options), so the engines keep reading the value as an
 * ordinary Job Applicant fieldname. Replaces the old TA Job Applicant Field
 * mirror doctype.
 * ─────────────────────────────────────────────────────────────────────────────
 */

frappe.provide("recruitment.applicant_field_picker");

recruitment.applicant_field_picker._cache = null;

recruitment.applicant_field_picker.load = function () {
	// Fetch once per page load, reuse across grids/forms.
	if (recruitment.applicant_field_picker._cache) {
		return Promise.resolve(recruitment.applicant_field_picker._cache);
	}
	return frappe.call({
		method: "recruitment.api.applicant_field_options.get_job_applicant_field_options",
	}).then((r) => {
		recruitment.applicant_field_picker._cache = (r && r.message) || [];
		return recruitment.applicant_field_picker._cache;
	});
};

// Apply the {label, value} options to one grid's Select column.
recruitment.applicant_field_picker.apply = function (frm, gridFieldname, selectField) {
	const grid = frm.fields_dict[gridFieldname] && frm.fields_dict[gridFieldname].grid;
	if (!grid) return;
	recruitment.applicant_field_picker.load().then((options) => {
		grid.update_docfield_property(selectField, "options", options);
		(grid.grid_rows || []).forEach((row) => {
			const f = row.on_grid_fields_dict && row.on_grid_fields_dict[selectField];
			if (f) { f.df.options = options; if (f.set_options) f.set_options(); }
		});
		grid.refresh();
	});
};

// ── Job Opening: eligibility rules + screener questions ─────────────────────
frappe.ui.form.on("Job Opening", {
	refresh(frm) {
		recruitment.applicant_field_picker.apply(frm, "custom_eligibility_rules", "field_name");
		recruitment.applicant_field_picker.apply(frm, "custom_screener_questions", "applicant_field");
	},
});

// ── Duplicity / Rehire check settings ───────────────────────────────────────
frappe.ui.form.on("TA Duplicity Check Settings", {
	refresh(frm) {
		recruitment.applicant_field_picker.apply(frm, "select_duplicity_check_fields", "applicant_field");
	},
});
frappe.ui.form.on("TA Rehire Check Settings", {
	refresh(frm) {
		recruitment.applicant_field_picker.apply(frm, "select_rehire_check_fields", "applicant_field");
	},
});
