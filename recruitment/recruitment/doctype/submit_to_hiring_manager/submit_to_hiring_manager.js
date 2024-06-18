// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Submit To Hiring Manager", {
	refresh(frm) {
		if(frm.doc.workflow_state == "Approved"){
			frm.add_custom_button(__('Submit to Hiring Manager'), function() {
				frappe.call({
					method: "recruitment.recruitment.doctype.submit_to_hiring_manager.submit_to_hiring_manager.generate_job_applicant",
					args:{
						"docname": frm.doc.name
					},
					callback: function(r) {
						// code snippet
					}
				});
			})
		}
	}
});
