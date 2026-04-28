// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Draft Application", {
	refresh(frm) {
		if (!frm.is_new() && frm.doc.candidate_email) {
			frm.add_custom_button(__("Open Job Applicant"), () => {
				frappe.set_route("Form", "Job Applicant", frm.doc.candidate_email);
			});
		}
	},
});
