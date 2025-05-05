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
    refresh: function(frm) {
        if (!frm.is_new()) {

            // Button: Connect Google Account
            frm.add_custom_button('Connect Google Account', () => {
                window.location.href = `/api/method/recruitment.api.google_auth.start_google_auth?user=${frappe.session.user}`;
            });

            // Button: Schedule Google Meet
            frm.add_custom_button('Schedule Google Meet', () => {
                frappe.call({
                    method: 'recruitment.api.google_meeting.schedule_meeting',
                    args: { interview_id: frm.doc.name },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint(`Google Meet scheduled: <a href="${r.message}" target="_blank">${r.message}</a>`);
                            frm.reload_doc();
                        }
                    }
                });
            });

            // Button: Reschedule Google Meet
            if (frm.doc.google_event_id) {
                frm.add_custom_button('Reschedule Google Meet', () => {
                    frappe.call({
                        method: 'recruitment.api.google_meeting.reschedule_meeting',
                        args: { interview_id: frm.doc.name },
                        callback: function(r) {
                            frappe.msgprint('Google Meet rescheduled.');
                            frm.reload_doc();
                        }
                    });
                });

                // Button: Cancel Google Meet
                frm.add_custom_button('Cancel Google Meet', () => {
                    frappe.call({
                        method: 'recruitment.api.google_meeting.cancel_meeting',
                        args: { interview_id: frm.doc.name },
                        callback: function(r) {
                            frappe.msgprint('Google Meet canceled.');
                            frm.reload_doc();
                        }
                    });
                });
            }
        }
    }
});
