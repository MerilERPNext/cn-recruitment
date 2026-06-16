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
    offer_date: function(frm) {
        frm.trigger("filter_jo_expiry_date");
    },
	refresh: function(frm) {
		frm.trigger("filter_jo_expiry_date");

		// Open the print preview using the employment-type-specific print format
		// (Recruitment Settings mapping), not the doctype default that Frappe's
		// own print icon uses. Always available for any saved Job Offer.
		if (!frm.is_new()) {
			frm.add_custom_button(__("Preview Offer Letter"), function() {
				frappe.call({
					method: "recruitment.job_offer_utils.get_job_offer_print_preview_url",
					args: { job_offer: frm.doc.name },
				}).then(function(r) {
					if (r && r.message) {
						window.open(r.message, "_blank");
					}
				});
			});
		}
	},
    filter_jo_expiry_date: function(frm) {
        if (frm.doc.offer_date) {
            let minDate = frappe.datetime.str_to_obj(frm.doc.offer_date);
            let datepicker = frm.fields_dict.custom_jo_expiry_date?.datepicker;

            if (datepicker) {
                datepicker.update({
                    minDate: minDate
                });
            }
            if (
                frm.doc.custom_jo_expiry_date &&
                frm.doc.custom_jo_expiry_date < frm.doc.offer_date
            ) {
                frappe.msgprint(__('Job Expiry Date must be on or after Offer Date'));
                frm.set_value("custom_jo_expiry_date", null);
            }
        }
    },
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
		if (!frm.fields_dict.custom_ctc_per_month) return;
		if(frm.doc.custom_ctc_per_annum){
			frm.set_value("custom_ctc_per_month", Math.round(frm.doc.custom_ctc_per_annum / 12));
		}else{
			frm.set_value("custom_ctc_per_month",null)
		}
	},
	job_applicant: function(frm) {
		if (frm.doc.job_applicant) {
			frappe.call({
				method: "recruitment.auto_fetch_fields.job_applicant_fields",
				args: {
					"job_applicant": frm.doc.job_applicant,
				},
				callback: function(r) {
					if (r.message) {
						frm.set_value(r.message);
					}
				}
			});
			if (frm.fields_dict.custom_ctc_per_annum) {
				frappe.db.get_value("Job Applicant", frm.doc.job_applicant, "custom_ctc_finalized")
					.then(r => {
						if (r && r.message) {
							frm.set_value("custom_ctc_per_annum", r.message.custom_ctc_finalized);
						}
					});
			}
		} else if (frm.fields_dict.custom_ctc_per_annum) {
			frm.set_value("custom_ctc_per_annum", null);
		}
	}
})


frappe.ui.form.on('Job Offer', {
    refresh(frm) {
        if (frm.doc.__islocal || frm.doc.status !== 'Accepted' || !frm.doc.job_applicant) return;

        // Gated by Recruitment Settings -> Enable Pre Onboarding Form Button.
        frappe.db.get_single_value('Recruitment Settings', 'enable_pre_onboarding_form').then((enabled) => {
            if (!enabled) return;
            frm.add_custom_button(__('Send Pre Onboarding Form'), () => {
                frappe.db.get_doc('Job Applicant', frm.doc.job_applicant).then((applicant) => {
                    if (window.recruitment && typeof window.recruitment.open_pre_onboarding_dialog === 'function') {
                        window.recruitment.open_pre_onboarding_dialog(frm.doc.job_applicant, applicant);
                    } else {
                        frappe.set_route('Form', 'Job Applicant', frm.doc.job_applicant);
                    }
                });
            }, __('Actions'));
        });
    }
});