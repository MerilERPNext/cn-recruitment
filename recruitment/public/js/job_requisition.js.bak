frappe.ui.form.on("Job Requisition", {
    refresh: function(frm){
		if (frappe.user.has_role("Recruiter Admin")) {
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 0); 
			frm.set_df_property('status', 'hidden', 0); 
        } else {
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 1);
			frm.set_df_property('status', 'hidden', 1); 
        }
		if (frm.is_new()){
			frappe.db.get_value('Employee', {user_id: frappe.session.user}, 'name')
		.then(r => {
			let values = r.message;
			 cur_frm.set_value("requested_by", values.name);
		})	
		}
		cur_frm.set_value("status", "Open & Approved");
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
    },
	after_save: function(frm){
		if(frm.doc.custom_assign_to_recruiter){
			frappe.call({
				method: "recruitment.customizations.job_requisition.job_requisition.assign_task",
				args:{
					"reference_doctype": "Job Requisition",
					"reference_name":frm.doc.name,
					"assign_to":frm.doc.custom_assign_to_recruiter,
					"description":"Please Do The Needful"
				},
				callback: function(r) {
				}
			});
		}
	}
})