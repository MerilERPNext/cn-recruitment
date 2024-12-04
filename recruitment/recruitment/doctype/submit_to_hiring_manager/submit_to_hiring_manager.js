frappe.ui.form.on("Submit To Hiring Manager", {
	refresh(frm) {
        updateStatusFieldProperties(frm)
		
		if ((frm.doc.workflow_state == "Approved" || frm.doc.workflow_state == "Submit") && frappe.user.has_role("Job Recruiter")) {
			frm.add_custom_button(__('Generate Job Applicants'), function() {
				frappe.call({
					method: "recruitment.recruitment.doctype.submit_to_hiring_manager.submit_to_hiring_manager.generate_job_applicant",
					args: {
						"docname": frm.doc.name
					},
					callback: function(r) {
						// code snippet for callback logic
						if (r.message) {
							frappe.msgprint(__('Job Applicants generated successfully.'));
						}
					}
				});
			});
		}
		
		frappe.call({
            method: "recruitment.recruitment.doctype.submit_to_hiring_manager.submit_to_hiring_manager.get_hiring_managers",
            callback: function(r) {
                if (r.message) {
					console.log(r.message)
                   frm.set_query('assigned_to', () => {
						return {
							filters: {
								name: ['in', r.message]
							}
						}
					})
                }
            }
        });
	},
    onload(frm){
        
        updateStatusFieldProperties(frm)
    }
});

function updateStatusFieldProperties(frm) {
    let isJobRecruiter = frappe.user.has_role('Job Recruiter');
		if (isJobRecruiter && frm.doc.workflow_state !== 'Approved') {
                    frm.fields_dict.shortlisted_candidate.grid.toggle_enable('status', false);
        } else {
            frm.fields_dict.shortlisted_candidate.grid.toggle_enable('status', true);
        }
        frm.fields_dict['shortlisted_candidate'].grid.refresh();
    
}