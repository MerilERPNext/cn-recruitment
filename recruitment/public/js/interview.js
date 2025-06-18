frappe.ui.form.on("Interview", {
    refresh: function(frm){
		// if (frm.is_new()){
		// 	let currentTime = new Date();
		// 	frm.set_value("from_time", formattime(currentTime));
		// 	refresh_field('from_time');
		// 	let laterTime = new Date(currentTime.getTime() + (1 * 60 + 30) * 60 * 1000);
		// 	frm.set_value("to_time", formattime(laterTime));
		// 	refresh_field('to_time');
		// }
		if(frm.doc.status=="Pending"){
			  frm.add_custom_button(__('Travel Request'), function(){
				//frappe.msgprint("Page Will Redirect In 6 Seconds.Please Wait")
				var interviewers = [];
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
				/*frm.doc.interview_details.forEach(function (item) {
					frappe.db.get_value(
						"Employee",
						{"user_id": item.interviewer},
						["employee_name"],(r)=>{
							interviewers.push(r.employee_name)
						}
					)
					console.log(interviewers)
				})*/
				
				//setTimeout(() => {
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
				//}, "6000");
				

				
				

			},__("Create"));
		}
    },
	// after_save(frm){
	// 	frappe.call('recruitment.customizations.interview.interview.assign_interviews_to_interviewer', {
	// 		docname: frm.doc.name
	// 	   }).then(r => {
	// 		console.log(r.message)
	// 	   })
	// }
})
function formattime(isoTimestamp){
	const date = new Date(isoTimestamp);

	const istDate = new Date(date.getTime());

	const hours = istDate.getHours().toString().padStart(2, '0');
	const minutes = istDate.getMinutes().toString().padStart(2, '0');
	const seconds = istDate.getSeconds().toString().padStart(2, '0');
	
	const time = `${hours}:${minutes}:${seconds}`;
	return time
}
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
		
        // frappe.db.delete_doc("User Permission",{"allow":"Interview","for_value":frm.doc.name})
	}
})


frappe.ui.form.on('Interview', {
    refresh(frm) {
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
});