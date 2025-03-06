frappe.ui.form.on("Job Offer", {
    // refresh: function(frm){
	// 	if(frm.doc.status=="Awaiting Response"){
	// 		  frm.add_custom_button(__('Send Job Offer'), function(){
	// 			frappe.call({
	// 				method: "recruitment.job_offer_utils.send_job_offer",
	// 				args:{
	// 					"job_offer_url": window.location.origin+"/job_offer?appl="+frm.doc.job_applicant,
	// 					"candidate":frm.doc.applicant_name,
	// 					"mail_id":frm.doc.job_applicant,
	// 					"company":frm.doc.company,
	// 					"designation":frm.doc.designation
	// 				},
	// 				callback: function(r) {
	// 					// code snippet
	// 				}
	// 			});

	// 		});
	// 	}
    // },
	after_save(frm){
		if (frm.doc.status == "Accepted"){
			frappe.call({
				method: "recruitment.job_offer_utils.job_offer_update",
				args:{
					"status": "Accepted",
					"appl":frm.doc.job_applicant
				},
				callback: function(r) {
					// code snippet
				}
			});
		}
		if (frm.doc.status == "Rejected"){
			frappe.call({
				method: "recruitment.job_offer_utils.job_offer_update",
				args:{
					"status": "Rejected",
					"appl":frm.doc.job_applicant
				},
				callback: function(r) {
					// code snippet
				}
			});
		}
	},
	custom_ctc_per_annum:function(frm){
		if(frm.doc.custom_ctc_per_annum){
			frm.set_value("custom_ctc_per_month", Math.round(frm.doc.custom_ctc_per_annum / 12));
		}else{
			frm.set_value("custom_ctc_per_month",null)
		}
	},
	job_applicant: function(frm) {
		if (frm.doc.job_applicant) {
			if(frm.doc.job_applicant){
				frappe.call({
					method: "recruitment.auto_fetch_fields.job_applicant_fields",
					args: {
						"job_applicant": frm.doc.job_applicant,
					},
					callback: function(r) {
						if (r.message) {
							frm.set_value(r.message);
							// var doclist = frappe.model.sync(r.message);
							// frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
						}
					}
				});
			}
			frappe.db.get_value("Job Applicant", frm.doc.job_applicant, "custom_ctc_finalized")
				.then(r => {
					if (r && r.message) {
						frm.set_value("custom_ctc_per_annum", r.message.custom_ctc_finalized);
					}
				});
		} else {
			frm.set_value("custom_ctc_per_annum", null);
		}
	}	
})