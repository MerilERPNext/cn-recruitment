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

        frm.set_query("clause_type", "custom_offer_clauses", () => ({ filters: { custom_variable_part_of_ctc: 1 } }));
		frm.set_query("salary_component", "custom_extra_payment", () => ({ filters: { custom_is_special_payment: 1 } }));




		// Offer Letter Template picker: only Document Templates whose reference
		// doctype is Job Offer.
		frm.set_query("custom_offer_letter_template", () => ({
			filters: { doctype_name: "Job Offer" },
		}));

		// Offer Letter tab (Template / Preview), rendered inline on the form.
		recruitment_offer_letter_styles();
		recruitment_render_offer_letter_tab(frm);

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



        // Clause type picker (Job Offer Clause.clause_type → Salary Component).
        //
        // This filtered on `custom_variable_part_of_ctc`, which exists on no
        // doctype in any installed app. HRMS v15 silently drops an unknown filter
        // field, but v16 validates it and aborts the link search with a
        // "You do not have permission to access field" PermissionError — so the
        // picker was dead on v16. Left unfiltered until the intended rule is
        // confirmed: the closest real fields (`custom_is_part_of_ctc` +
        // `custom_component_sub_type = "Variable"`) match NO component at all, so
        // guessing would just swap the error for an empty list.
        // frm.set_query("clause_type", "custom_offer_clauses", () => ({}));

        // Extra payment picker → components flagged as extra payments.
        // Was `custom_is_special_payment`, which likewise doesn't exist; the real
        // flag on Salary Component is `custom_is_extra_payment` ("Is Extra
        // Payment"), matching this table's own name.
        frm.set_query("salary_component", "custom_extra_payment", () => ({
            filters: { custom_is_extra_payment: 1 },
        }));

        frm.set_query("clause_type", "custom_offer_clauses", () => ({
            filters: { custom_variable_part_of_ctc: 1 },
        }));




        

        

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


frappe.ui.form.on("Extra Payment Child Doc", {
    recovery_applicable: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.recovery_applicable) {
                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Payroll Settings",
                       
                    },
                    callback: function(r) {
                        if (r.message) {
                            let days = r.message.clock_back_days || 0;

                            console.log(days,"444")

                            if (frm.doc.offer_date) {
                                let clock_back = frappe.datetime.add_days(
                                    frm.doc.offer_date,
                                    days
                                );

                                console.log(clock_back,"55555555")

                                frappe.model.set_value(
                                    cdt,
                                    cdn,
                                    "date",        // child table fieldname
                                    clock_back
                                );
                            }
                        }
                    }
                });
        }
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Offer Letter tab — Template (raw placeholders) + Preview (rendered).
//
// Same two endpoints the dialog uses, rendered inline on the form's "Offer
// Letter" tab so the letter sits beside the fields instead of behind a button.
// `get_offer_letter_preview_html` resolves the Document Template first and falls
// back to the Job Offer print format, so Preview always shows something.
// ─────────────────────────────────────────────────────────────────────────────
function recruitment_render_offer_letter_tab(frm) {
	const field = frm.fields_dict && frm.fields_dict.custom_offer_letter_html;
	if (!field || !field.$wrapper) return;
	const $w = field.$wrapper;

	if (frm.is_new()) {
		$w.html(`<div class="ol-empty">${__("Save this Job Offer to see its offer letter.")}</div>`);
		return;
	}

	// Cache per document — switching tabs shouldn't re-render the PDF each time.
	if (frm._ol_cache_for !== frm.doc.name) {
		frm._ol_cache_for = frm.doc.name;
		frm._ol_cache = {};
	}

	// Shell is painted once and kept: switching Template <-> Preview swaps only the
	// body, so the tab bar never repaints and the click binding survives.
	$w.html(`
		<div class="ol-tabs">
			<button type="button" class="ol-tab active" data-tab="template">${__("Template")}</button>
			<button type="button" class="ol-tab" data-tab="preview">${__("Preview")}</button>
		</div>
		<div class="ol-body"></div>`);

	const $body = $w.find(".ol-body");
	let active = "template";

	function paint(tab) {
		if (frm._ol_cache[tab]) {
			$body.html(frm._ol_cache[tab]);
			return;
		}
		$body.html(`<div class="ol-empty">${__("Loading…")}</div>`);
		const method = tab === "template"
			? "recruitment.job_offer_utils.get_offer_template_raw_html"
			: "recruitment.job_offer_utils.get_offer_letter_preview_html";
		frappe.call({ method, args: { job_offer: frm.doc.name } }).then(function (r) {
			const html = (r && r.message && r.message.html)
				|| `<div class="ol-empty">${__("Nothing to show.")}</div>`;
			frm._ol_cache[tab] = html;
			if (active === tab) $body.html(html);   // user may have switched while we waited
		});
	}

	$w.find(".ol-tab").on("click", function () {
		const tab = this.dataset.tab;
		if (tab === active) return;
		active = tab;
		$w.find(".ol-tab").each(function () { this.classList.toggle("active", this.dataset.tab === tab); });
		paint(tab);
	});

	// Don't fetch until the tab is actually looked at — Preview renders a PDF
	// server-side, which is far too heavy to fire on every form refresh.
	const tab = ((frm.layout && frm.layout.tabs) || []).find(
		(t) => t.df && t.df.fieldname === "custom_offer_letter_tab"
	);
	const isShowing = !tab || !tab.tab_link || tab.tab_link.find("a").hasClass("active");
	if (isShowing) {
		paint(active);
	} else {
		// Namespaced, and cleared first: this function re-runs on every form
		// refresh, so binding without removing would leave one handler per refresh
		// — and the first click would then fire them all at once, each issuing its
		// own server call before any of them had populated the cache.
		tab.tab_link.find("a").off("click.ol").on("click.ol", () => paint(active));
	}
}

function recruitment_offer_letter_styles() {
	if (document.getElementById("ol-tab-styles")) return;
	const style = document.createElement("style");
	style.id = "ol-tab-styles";
	style.textContent = `
		.ol-tabs { display:flex; gap:4px; border-bottom:1px solid var(--border-color,#e2e6e9); margin-bottom:16px; }
		.ol-tab {
			border:none; background:none; padding:9px 18px; cursor:pointer;
			font-size:13px; font-weight:500; color:var(--text-muted,#6b7280);
			border-bottom:2px solid transparent; margin-bottom:-1px;
		}
		.ol-tab:hover { color:var(--text-color,#1f272e); }
		.ol-tab.active { color:var(--blue-600,#1479d6); font-weight:600; border-bottom-color:var(--blue-600,#1479d6); }
		.ol-body { min-height:340px; }
		.ol-empty { padding:48px; text-align:center; color:var(--text-muted,#8d99a6); }
	`;
	document.head.appendChild(style);
}

// --- Job Requisition behind the offer + sending from the form ----------------
(function () {
    // Prefill the requisition and its agreed pay as soon as a candidate is picked,
    // so HR sees the numbers while building the offer rather than after saving.
    // The same resolution runs server-side on validate, so a scripted or imported
    // offer is stamped too — this is convenience, not the source of truth.
    function fillFromRequisition(frm) {
        if (!frm.doc.job_applicant) return;
        frappe.call({
            method: "recruitment.customizations.job_offer.get_requisition_defaults",
            args: { job_applicant: frm.doc.job_applicant },
            callback: (r) => {
                const d = (r && r.message) || {};
                if (!d.job_requisition) return;
                frm.set_value("custom_job_requisition", d.job_requisition);
                // Never clobber an amount already on the offer — HR may have
                // negotiated away from the requisition's band.
                Object.entries(d.pay || {}).forEach(([field, value]) => {
                    if (frm.fields_dict[field] && !frm.doc[field]) frm.set_value(field, value);
                });
            },
        });
    }

    frappe.ui.form.on("Job Offer", {
        job_applicant(frm) {
            fillFromRequisition(frm);
        },

        refresh(frm) {
            // "Send Job Offer" existed only as a list-view bulk action, so sending a
            // single offer meant going back to the list. Same action, same server
            // call (send_bulk_job_offer with one name) so the template, PDF
            // attachment and status handling cannot drift between the two paths.
            //
            // Gated on its own toggle, following enable_offer_letter_button and
            // friends — NOT on allow_bulk_job_offer_email. Turning off mass emailing
            // should not also remove a recruiter's ability to send one offer.
            if (frm.doc.docstatus !== 1) return;

            frappe.db.get_single_value("Recruitment Settings", "enable_send_job_offer_button")
                .then((enabled) => {
                    if (!enabled) return;
                    frm.add_custom_button(__("Send Job Offer"), () => {
                        frappe.confirm(
                            __("Send the offer email to {0}?", [
                                frappe.utils.escape_html(frm.doc.applicant_name || frm.doc.job_applicant),
                            ]),
                            () => {
                                frappe.call({
                                    method: "recruitment.api.bulk_job_offer.send_bulk_job_offer",
                                    args: { job_offers: JSON.stringify([frm.doc.name]) },
                                    freeze: true,
                                    freeze_message: __("Sending offer…"),
                                    callback: (r) => {
                                        const m = (r && r.message) || {};
                                        if (m.sent) {
                                            frappe.show_alert({
                                                message: __("Offer email sent."), indicator: "green",
                                            });
                                        } else if (m.skipped) {
                                            // Skipped means the candidate has already
                                            // accepted/rejected — say so rather than
                                            // reporting a silent success.
                                            frappe.msgprint({
                                                title: __("Not sent"), indicator: "orange",
                                                message: __("Skipped — this candidate has already responded to an offer."),
                                            });
                                        } else {
                                            frappe.msgprint({
                                                title: __("Not sent"), indicator: "red",
                                                message: __("Sending failed. Check Email Status on this offer for the reason."),
                                            });
                                        }
                                        frm.reload_doc();
                                    },
                                });
                            }
                        );
                    });
                });
        },
    });
})();
