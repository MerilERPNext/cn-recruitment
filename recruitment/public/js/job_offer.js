frappe.ui.form.on("Job Offer", {
    refresh: function(frm){
		if(frm.doc.status=="Awaiting Response"){
			  frm.add_custom_button(__('Send Job Offer'), function(){
				frappe.call({
					method: "recruitment.job_offer_utils.send_job_offer",
					args:{
						"job_offer_url": window.location.origin+"/job_offer?appl="+frm.doc.job_applicant,
						"candidate":frm.doc.applicant_name,
						"mail_id":frm.doc.job_applicant,
						"company":frm.doc.company,
						"designation":frm.doc.designation
					},
					callback: function(r) {
						// code snippet
					}
				});

			});
		}
    },
	// after_save(frm){
	// 	frappe.call({
	// 		method: "recruitment.job_offer_utils.job_offer_update",
	// 		args:{
	// 			"status": frm.doc.status,
	// 			"appl":frm.doc.job_applicant
	// 		},
	// 		callback: function(r) {
	// 			// code snippet
	// 		}
	// 	});
	// }
})