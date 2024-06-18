frappe.ui.form.on("Job Requisition", {
    refresh: function(frm){
		if (frappe.user.has_role("Hiring Manager")) {
            // Show a particular field for users with the "Hiring Manager" role
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 0);  // Replace 'fieldname_to_show' with your actual field name
        } else {
            // Hide the field for users without the "Hiring Manager" role
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 1);  // Replace 'fieldname_to_show' with your actual field name
        }
		 /*if(frm.doc.status=="Open & Approved"){
			 frm.add_custom_button(__('Job Opening'), function(){
				frappe.call({
					method: "recruitment.customizations.job_requisition.job_requisition.generate_job_opening",
					args:{
						"job_requisition": frm.doc.name
					},
					callback: function(r) {
						// code snippet
					}
				});

			},__("Create"));
		}*/
		frm.set_query("custom_salary", function() {
        return {
            "filters": {
                "disabled": 0,
            }
        };
    });
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
    }
})