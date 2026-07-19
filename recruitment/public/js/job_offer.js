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

		// Component picker: Earnings -> only Earning salary components,
		// Deductions -> only Deduction ones.
		frm.set_query("component", "custom_earnings", () => ({ filters: { type: "Earning" } }));
		frm.set_query("component", "custom_deduction", () => ({ filters: { type: "Deduction" } }));

		// Offer Letter Template picker: only Document Templates whose reference
		// doctype is Job Offer.
		frm.set_query("custom_offer_letter_template", () => ({
			filters: { doctype_name: "Job Offer" },
		}));

		// Offer-letter buttons — each gated by a Recruitment Settings toggle
		// (both default ON). Only for a saved Job Offer.
		if (!frm.is_new()) {
			// Print-format preview (employment-type-specific format).
			frappe.db.get_single_value("Recruitment Settings", "enable_preview_offer_letter_button").then(function(enabled) {
				if (!enabled) return;
				frm.add_custom_button(__("Preview Offer Letter"), function() {
					frappe.call({
						method: "recruitment.job_offer_utils.get_job_offer_print_preview_url",
						args: { job_offer: frm.doc.name },
					}).then(function(r) {
						if (r && r.message) window.open(r.message, "_blank");
					});
				});
			});

			// Template (raw placeholders) + Preview (rendered) dialog.
			frappe.db.get_single_value("Recruitment Settings", "enable_offer_letter_button").then(function(enabled) {
				if (!enabled) return;
				frm.add_custom_button(__("Offer Letter"), function() {
					recruitment_open_offer_letter_dialog(frm);
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


// ─────────────────────────────────────────────────────────────────────────────
// Offer Letter dialog — Template (raw placeholders) + Preview (rendered).
// Template selection is the `custom_offer_letter_template` field on the form;
// both tabs resolve the template from the Job Offer (form pick → settings default).
// ─────────────────────────────────────────────────────────────────────────────
function recruitment_open_offer_letter_dialog(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Offer Letter"),
		size: "extra-large",
		fields: [{ fieldtype: "HTML", fieldname: "body" }],
	});
	const loaded = {};
	const $body = () => d.fields_dict.body.$wrapper;

	function tabBar(active) {
		const btn = (id, label) =>
			`<button class="offer-tab" data-tab="${id}" style="border:none;background:none;padding:9px 16px;cursor:pointer;` +
			`border-bottom:2px solid ${active === id ? "#2490ef" : "transparent"};` +
			`font-weight:${active === id ? "600" : "400"};color:${active === id ? "#2490ef" : "#666"};">${label}</button>`;
		return `<div style="border-bottom:1px solid #e0e0e0;margin-bottom:14px;">${btn("template", __("Template"))}${btn("preview", __("Preview"))}</div>`;
	}

	function show(tab) {
		$body().html(tabBar(tab) + `<div class="offer-tab-content" style="min-height:320px;">` +
			`<div style="padding:40px;text-align:center;color:#888;">${__("Loading…")}</div></div>`);
		$body().find(".offer-tab").on("click", function () { show($(this).data("tab")); });

		if (loaded[tab]) { $body().find(".offer-tab-content").html(loaded[tab]); return; }

		const method = tab === "template"
			? "recruitment.job_offer_utils.get_offer_template_raw_html"
			: "recruitment.job_offer_utils.get_offer_letter_preview_html";
		frappe.call({ method, args: { job_offer: frm.doc.name } }).then(function (r) {
			const html = (r && r.message && r.message.html) ||
				`<div style="padding:40px;text-align:center;color:#888;">${__("Nothing to show.")}</div>`;
			loaded[tab] = html;
			// Only paint if the user is still on this tab.
			const $c = $body().find(".offer-tab-content");
			if ($c.length) $c.html(html);
		});
	}

	d.show();
	d.$wrapper.find(".modal-dialog").css("max-width", "920px");
	show("template");
}
// --- Dynamic Offer Compensation (grade-based auto breakup) ------------------
// Level + Total Fixed Pay drive the whole fixed-pay breakup. The authoritative
// computation is server-side (recruitment.recruitment.offer_compensation); this
// button previews it live (without saving) and fills the Earnings grid + CTC.
function jobOfferRecomputeCTC(frm) {
    const tfp = frm.doc.custom_total_fixed_pay || 0;
    const inc = frm.doc.custom_variable_incentive || 0;
    const loc = frm.doc.custom_location_allowance || 0;
    if (tfp) frm.set_value("custom_ctc", tfp + inc + loc);
}

function jobOfferComputeCompensation(frm) {
    if (!frm.doc.custom_compensation_level || !frm.doc.custom_total_fixed_pay) {
        frappe.msgprint(__("Set both Level and Total Fixed Pay first."));
        return;
    }
    frappe.call({
        method: "recruitment.recruitment.offer_compensation.preview_offer_compensation",
        args: {
            level: frm.doc.custom_compensation_level,
            total_fixed_pay: frm.doc.custom_total_fixed_pay,
            incentive: frm.doc.custom_variable_incentive || 0,
            location_allowance: frm.doc.custom_location_allowance || 0,
        },
        freeze: true,
        freeze_message: __("Computing compensation breakup…"),
        callback: function (r) {
            if (!r || !r.message) return;
            const res = r.message;
            frm.clear_table("custom_earnings");
            (res.rows || []).forEach((row) => {
                const d = frm.add_child("custom_earnings");
                d.component = row.component;
                d.amount = row.amount;
                d.percentage = 0;
            });
            frm.refresh_field("custom_earnings");
            frm.set_value("custom_ctc", res.ctc);
            frappe.show_alert({ message: __("Compensation breakup computed."), indicator: "green" });
        },
    });
}

frappe.ui.form.on("Job Offer", {
    refresh(frm) {
        // Clause template picker → only active templates of the row's type.
        frm.set_query("clause_template", "custom_offer_clauses", (doc, cdt, cdn) => {
            const row = locals[cdt][cdn];
            const filters = { is_active: 1 };
            if (row && row.clause_type) filters.clause_type = row.clause_type;
            return { filters };
        });

        // Compute button only in "Auto by Grade" mode — the default/legacy
        // "Salary Structure" flow is left completely untouched.
        if (!frm.is_new() && frm.doc.custom_compensation_method === "Auto by Grade") {
            frm.add_custom_button(__("Compute Compensation Breakup"), () => {
                jobOfferComputeCompensation(frm);
            }, __("Compensation"));
        }
    },
    custom_compensation_method(frm) {
        // Re-render so the compute button appears/disappears with the mode.
        frm.refresh();
    },
    custom_total_fixed_pay: jobOfferRecomputeCTC,
    custom_variable_incentive: jobOfferRecomputeCTC,
    custom_location_allowance: jobOfferRecomputeCTC,
    custom_location(frm) {
        // Refresh the (editable) Location Allowance from the master on change.
        if (frm.doc.custom_location) {
            frappe.db.get_value("Location Allowance", frm.doc.custom_location, "amount").then((r) => {
                if (r && r.message) {
                    frm.set_value("custom_location_allowance", r.message.amount || 0);
                }
            });
        } else {
            frm.set_value("custom_location_allowance", 0);
        }
    },
});

// Prefill the editable clause text from the chosen template; recruiter then
// replaces the [XXXX] placeholders with the actual per-offer values.
frappe.ui.form.on("Job Offer Clause", {
    clause_template(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.clause_template) return;
        frappe.db.get_value("Job Offer Clause Template", row.clause_template, ["clause_text", "clause_type"]).then((r) => {
            if (r && r.message) {
                frappe.model.set_value(cdt, cdn, "clause_text", r.message.clause_text);
                if (r.message.clause_type && !row.clause_type) {
                    frappe.model.set_value(cdt, cdn, "clause_type", r.message.clause_type);
                }
            }
        });
    },
    clause_type(frm, cdt, cdn) {
        // Changing the type invalidates a previously chosen template.
        const row = locals[cdt][cdn];
        if (row.clause_template) frappe.model.set_value(cdt, cdn, "clause_template", null);
    },
});
