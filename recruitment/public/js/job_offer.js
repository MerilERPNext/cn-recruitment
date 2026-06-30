// Hide the HRMS "Create Employee" button for a configured hiring lead when
// 'Allow Hiring lead to Add Employee From Offer' is OFF. The server-side override
// (recruitment.customizations.job_offer.make_employee) enforces this regardless;
// this just keeps the button out of the way. No matching config / not a hiring
// lead / setting ON → button stays as normal.
// --- Percentage-based salary components -------------------------------------
// Each Earnings/Deduction row can carry a % of Basic (custom_base_salary) or of
// monthly CTC; the amount is auto-computed live. Mirrors the server-side
// recruitment.customizations.job_offer.apply_percentage_components.
function jobOfferBasisAmount(frm, row) {
    const annual = (frm.doc.custom_salary_period === "Annual");
    if (row.basis === "CTC") {
        let a = frm.doc.custom_ctc_per_annum || 0;
        if (!a && frm.doc.custom_ctc_per_month) a = frm.doc.custom_ctc_per_month * 12;
        return annual ? a : (a ? a / 12 : 0);
    }
    const base = frm.doc.custom_base_salary || 0;
    return annual ? base * 12 : base;
}
function jobOfferComputeRow(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row || !row.percentage) return; // blank % → keep the manually-typed amount
    frappe.model.set_value(cdt, cdn, "amount", (jobOfferBasisAmount(frm, row) * row.percentage) / 100);
}
function recomputeSalaryComponents(frm) {
    ["custom_earnings", "custom_deduction"].forEach((tbl) => {
        (frm.doc[tbl] || []).forEach((row) => {
            if (row.percentage) row.amount = (jobOfferBasisAmount(frm, row) * row.percentage) / 100;
        });
        frm.refresh_field(tbl);
    });
}

frappe.ui.form.on("Job Offer", {
    refresh(frm) {
        if (frm.is_new() || frm.doc.status !== "Accepted" || frm.doc.docstatus !== 1) {
            return;
        }
        frappe.call({
            method: "recruitment.customizations.hiring_lead_permissions.can_hiring_lead_add_employee_from_offer",
            args: { company: frm.doc.company },
            callback: (r) => {
                if (r && r.message === false) {
                    frm.remove_custom_button(__("Create Employee"));
                }
            },
        });
    },
});

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
	custom_base_salary:function(frm){
		recomputeSalaryComponents(frm);
	},
	custom_salary_period:function(frm){
		recomputeSalaryComponents(frm);
	},
	custom_ctc_per_annum:function(frm){
		if (frm.fields_dict.custom_ctc_per_month) {
			if(frm.doc.custom_ctc_per_annum){
				frm.set_value("custom_ctc_per_month", Math.round(frm.doc.custom_ctc_per_annum / 12));
			}else{
				frm.set_value("custom_ctc_per_month",null)
			}
		}
		recomputeSalaryComponents(frm);
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
// Recompute a row's amount when its % or basis changes.
frappe.ui.form.on("Earnings", {
    percentage: jobOfferComputeRow,
    basis: jobOfferComputeRow,
});
frappe.ui.form.on("Deductions", {
    percentage: jobOfferComputeRow,
    basis: jobOfferComputeRow,
});
