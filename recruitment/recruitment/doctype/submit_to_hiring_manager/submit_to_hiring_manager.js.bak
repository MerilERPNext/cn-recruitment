// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Submit To Hiring Manager", {
	refresh(frm) {
		frm.fields_dict['shortlisted_candidate'].grid.fields_map['status'].get_query = function() {
            return {
                filters: {
                    'hidden': true
                }
            };
        };
		if(frm.doc.workflow_state == "Approved" && frappe.user.has_role("Job Recruiter")){
			frm.add_custom_button(__('Generate Job Applicants'), function() {
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
	onload: function(frm) {
        // Check if the user has the 'Hiring Manager' role
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'User',
                name: frappe.session.user
            },
            callback: function(r) {
                if (r.message) {
                    let roles = r.message.roles.map(role => role.role);
                    if (!roles.includes('Hiring Manager')) {
                        frm.fields_dict['shortlisted_candidate'].grid.fields_map['status'].hidden = 1;
                        frm.fields_dict['shortlisted_candidate'].grid.refresh();
                    }
                }
            }
        });
    }
});
