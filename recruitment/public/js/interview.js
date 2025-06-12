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
        frappe.call({
            method: "recruitment.recruitment.doctype.microsoft_teams_app_settings.microsoft_teams_app_settings.is_teams_enabled",
            callback(enabled_res) {
                if (!enabled_res.message) return;

                frappe.call({
                    method: "frappe.client.get_value",
                    args: {
                        doctype: "Microsoft Teams User Token",
                        filters: { user: frappe.session.user },
                        fieldname: "name"
                    },
                    callback(r) {
                        console.log(r.message)
                        console.log(frappe.session.user)
                        const token_exists = !!(r.message && r.message.name);

                        console.log(token_exists)

                        // Show Authorize button only if token doesn't exist
                        if (!token_exists) {
                            frm.add_custom_button('Authorize Teams', () => {
                                frappe.call({
                                    method: "recruitment.customizations.interview.interview.get_teams_auth_url",
                                    args: { interview_id: frm.doc.name },
                                    callback: function(r) {
                                        if (r.message) {
                                            window.open(r.message, '_blank');
                                        }
                                    }
                                });
                            }, 'Teams Actions');
                        }

                        // Show Schedule button only if no meeting is scheduled
                        if (token_exists && (!frm.doc.custom_zoom_link || !frm.doc.custom_calendar_event_id)) {
                            frm.add_custom_button('Schedule Teams Meeting', () => {
                                frappe.call({
                                    method: "recruitment.customizations.interview.interview.schedule_teams_meeting",
                                    args: { interview_id: frm.doc.name },
                                    callback: function(r) {
                                        if (r.message) {
                                            frappe.msgprint(`Meeting Scheduled: <a href="${r.message}" target="_blank">Join</a>`);
                                            frm.reload_doc();
                                        }
                                    }
                                });
                            }, 'Teams Actions');
                        }

                        // Show Reschedule & Cancel if meeting already scheduled
                        if (frm.doc.custom_zoom_link && frm.doc.custom_calendar_event_id) {
                            frm.add_custom_button('Reschedule Teams Meeting', () => {
                                let d = new frappe.ui.Dialog({
                                    title: 'Reschedule Teams Meeting',
                                    fields: [
                                        {
                                            fieldname: 'scheduled_on',
                                            fieldtype: 'Date',
                                            label: 'New Scheduled On',
                                            reqd: 1,
                                            default: frm.doc.scheduled_on
                                        },
                                        {
                                            fieldname: 'from_time',
                                            fieldtype: 'Time',
                                            label: 'New From Time',
                                            reqd: 1,
                                            default: frm.doc.from_time
                                        },
                                        {
                                            fieldname: 'to_time',
                                            fieldtype: 'Time',
                                            label: 'New To Time',
                                            reqd: 1,
                                            default: frm.doc.to_time
                                        }
                                    ],
                                    primary_action_label: 'Reschedule',
                                    primary_action(values) {
                                        d.hide();
                                        frappe.call({
                                            method: "recruitment.customizations.interview.interview.reschedule_teams_meeting",
                                            args: {
                                                interview_id: frm.doc.name,
                                                scheduled_on: values.scheduled_on,
                                                from_time: values.from_time,
                                                to_time: values.to_time
                                            },
                                            callback: function(r) {
                                                if (r.message) {
                                                    frappe.msgprint(`Meeting Rescheduled: <a href="${r.message}" target="_blank">Join</a>`);
                                                    frm.reload_doc();
                                                }
                                            }
                                        });
                                    }
                                });

                                d.show();
                            }, 'Teams Actions');

                            frm.add_custom_button('Cancel Teams Meeting', () => {
                                frappe.confirm(
                                    'Are you sure you want to cancel the meeting?',
                                    () => {
                                        frappe.call({
                                            method: 'recruitment.customizations.interview.interview.cancel_teams_meeting',
                                            args: { interview_id: frm.doc.name },
                                            callback: function(r) {
                                                if (r.message) {
                                                    frappe.msgprint(r.message);
                                                    frm.reload_doc();
                                                }
                                            }
                                        });
                                    }
                                );
                            }, 'Teams Actions');
                        }
                    }
                });
            }
        });
    }
});
