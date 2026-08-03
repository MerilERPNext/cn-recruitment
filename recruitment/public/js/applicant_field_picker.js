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

recruitment.applicant_field_picker._cache = {};

recruitment.applicant_field_picker.load = function (includeChildren) {
	// Fetch once per (includeChildren) variant per page load, reuse across grids.
	const key = includeChildren ? "1" : "0";
	if (recruitment.applicant_field_picker._cache[key]) {
		return Promise.resolve(recruitment.applicant_field_picker._cache[key]);
	}
	return frappe.call({
		method: "recruitment.api.applicant_field_options.get_job_applicant_field_options",
		args: { include_children: includeChildren ? 1 : 0 },
	}).then((r) => {
		recruitment.applicant_field_picker._cache[key] = (r && r.message) || [];
		return recruitment.applicant_field_picker._cache[key];
	});
};

// Apply the {label, value} options to one grid's Select column.
recruitment.applicant_field_picker.apply = function (frm, gridFieldname, selectField, includeChildren) {
	const grid = frm.fields_dict[gridFieldname] && frm.fields_dict[gridFieldname].grid;
	if (!grid) return;
	recruitment.applicant_field_picker.load(includeChildren).then((options) => {
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
		// Eligibility rules can target child-row fields (Education, Work Experience),
		// so field_name + match_field include child-table fields.
		recruitment.applicant_field_picker.apply(frm, "custom_eligibility_rules", "field_name", true);
		recruitment.applicant_field_picker.apply(frm, "custom_eligibility_rules", "match_field", true);
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
