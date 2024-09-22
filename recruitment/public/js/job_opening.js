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
	},
	job_requisition: function (frm) {
		if (frm.doc.job_requisition) {
		  frappe.call({
			method:
			  "recruitment.customizations.job_opening.job_opening.get_job_title",
			args: {
			  job_requisition: frm.doc.job_requisition,
			},
			callback: function (r) {
			  if (r.message) {
				frm.clear_table("custom_qualifications");
	
				r.message.forEach(function (row) {
				  var new_row = frm.add_child("custom_qualifications");
				  new_row.schooluniversity = row.schooluniversity;
				  new_row.qualification = row.qualification;
				  new_row.level=row.level;
				  new_row.year_of_passing = row.year_of_passing;
				});
	
				frm.refresh_field("custom_qualifications");
			  }
			},
		  });
		} else {
		  frm.clear_table("custom_qualifications");
		  frm.refresh_field("custom_qualifications");
		}
	  }
})