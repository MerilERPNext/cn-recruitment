frappe.ui.form.on("Interview", {
    refresh: function(frm){
		if(frm.doc.status=="Pending"){
			  frm.add_custom_button(__('Travel Request'), function(){
				var description="Applicant Name: ";
				frappe.db.get_value('Job Applicant', {"name":frm.doc.job_applicant}, 'applicant_name', (r) => {
					description+=r.applicant_name+"\nInterview Date: "+frm.doc.scheduled_on+"\nCreated By: "
				})
				frappe.db.get_value(
					"Employee",
					{"user_id": frappe.session.user},
					["employee_name"],(r)=>{
						description+=r.employee_name
					}
				)
				frappe.db.get_value('Employee', {"user_id":frappe.session.user}, 'name', (r) => {
					frappe.new_doc("Travel Request", {
						travel_type: "Domestic",
						employee:r.name,
						purpose_of_travel:"Interview",
						description:description
					}).then(doc => {
						frappe.set_route("Form", doc.doctype, doc.name);
					});
				});
			},__("Create"));
		}

	setup_teams_buttons(frm, {
            scheduled_on_field: 'scheduled_on',
            from_time_field: 'from_time',
            to_time_field: 'to_time',
            zoom_link_field: 'custom_zoom_link',
            event_id_field: 'custom_calendar_event_id',
            meeting_status_field: 'custom_meeting_status'
        }, {
            candidate_email_field: 'job_applicant',
            interviewers_field: 'interview_details',
            interviewers_fieldtype: 'Table'
        });
    }
})
frappe.ui.form.on('Interview Detail', {
	interview_details_remove: function(frm, cdt, cdn) {
		frappe.db.get_list('User Permission', {
			fields: ['name'],
			filters: {"allow":"Interview","for_value":frm.doc.name}
		}).then(records => {
			records.forEach(element => {
				frappe.db.delete_doc("User Permission",element.name)
			});
		})
	}
})
