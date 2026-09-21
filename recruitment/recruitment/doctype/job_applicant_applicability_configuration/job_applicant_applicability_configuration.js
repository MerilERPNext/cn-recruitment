// Copyright (c) 2026, ChatNext and contributors
// For license information, please see license.txt

// Field autocomplete options come from the live Job Applicant layout.
frappe.ui.form.on("Job Applicant Applicability Configuration", {
	onload(frm) {
		frappe.call({
			method:
				"recruitment.recruitment.doctype.job_applicant_applicability_configuration" +
				".job_applicant_applicability_configuration.get_applicant_field_options",
			callback(r) {
				frm._applicant_field_options = r.message || [];
				frm.fields_dict.excluded_fields.grid.update_docfield_property(
					"reference_name",
					"options",
					frm._applicant_field_options
				);
			},
		});
	},
});
