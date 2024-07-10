frappe.ui.form.on("Job Opening", {
    refresh: function(frm){
		frm.set_query("custom_division", function() {
			return {
				"filters": {
					"is_group": 1,
				}
			};
		});
		frm.set_query("department", function() {
			return {
				"filters": {
					"is_group": 0,
					"parent_department":frm.doc.custom_division
				}
			};
		});
    },
	after_save: function(frm){
		frappe.call({
			method: "recruitment.customizations.job_opening.job_opening.generate_job_applicant",
			args:{
				"docname": frm.doc.name
			},
			callback: function(r) {
				// code snippet
			}
		});
		if (frm.is_new()) {
            // Perform actions only if the document is new
            frappe.db.set_value('Job Requisition', frm.doc.job_requisition, 'status', 'Job Opening Created')
			.then(r => {
				
			})
        }
	}
})