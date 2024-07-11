frappe.ui.form.on("Interview", {
    refresh: function(frm){
		if (frm.is_new()){
			let currentTime = new Date();
			frm.set_value("from_time", currentTime);
			refresh_field('from_time');
			let laterTime = new Date(currentTime.getTime() + (1 * 60 + 30) * 60 * 1000);
			frm.set_value("to_time", laterTime);
			refresh_field('to_time');
		}
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
    }
})