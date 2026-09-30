// Copyright (c) 2026, NextAI and contributors
// For license information, please see license.txt

// CTC Proposal — HR enters the Annual CTC; the breakup is recalculated on save.
// Send / Revise / Withdraw go through recruitment.api.ctc_proposal.

const CTCP_API = "recruitment.api.ctc_proposal";

frappe.ui.form.on("CTC Proposal", {
	setup(frm) {
		frm.set_query("department", () => ({ filters: { company: frm.doc.company, disabled: 0 } }));
		frm.set_query("salary_structure", () => ({ filters: { docstatus: 1, is_active: "Yes" } }));
		// Same picker the Job Offer uses, fed the proposal as the offer it becomes.
		frm.set_query("offer_letter_template", () => ({
			query: "recruitment.recruitment.offer_document_template.offer_document_template_query",
			filters: {
				job_applicant: frm.doc.job_applicant,
				company: frm.doc.company,
				designation: frm.doc.designation,
				custom_employment_type: frm.doc.employment_type,
			},
		}));
	},

	onload(frm) {
		// The letter only matters when offers are sent as Document Templates.
		frappe.db.get_single_value("Recruitment Settings", "send_offer_via_document_template").then((on) => {
			frm.toggle_display("offer_letter_template", !!on);
			frm.toggle_reqd("offer_letter_template", !!on && frm.doc.status === "Draft");
		});
	},

	refresh(frm) {
		show_intro(frm);
		if (frm.is_new()) return;
		const status = frm.doc.status;
		if (status === "Draft" && !frm.is_dirty()) {
			frm.add_custom_button(__("Send to Candidate"), () => {
				frappe.confirm(
					__("Email this proposal to {0}? It cannot be changed after sending.", [frm.doc.email]),
					() => run(frm, "send_proposal", __("Proposal sent"))
				);
			}).addClass("btn-primary");
		}
		const expired = status === "Sent" && frm.doc.expires_on
			&& frappe.datetime.str_to_obj(frm.doc.expires_on) < new Date();
		if (["Negotiation Requested", "Rejected"].includes(status) || expired) {
			frm.add_custom_button(__("Revise"), () => {
				frappe.call({ method: `${CTCP_API}.revise_proposal`, args: { proposal: frm.doc.name }, freeze: true })
					.then((r) => { if (r.message) frappe.set_route("Form", "CTC Proposal", r.message.name); });
			}).addClass("btn-primary");
		}
		if (["Sent", "Negotiation Requested"].includes(status)) {
			frm.add_custom_button(__("Withdraw"), () => {
				frappe.confirm(__("Withdraw this proposal? The candidate's link stops working."), () =>
					run(frm, "withdraw_proposal", __("Proposal withdrawn")));
			});
		}
		// Offer Failed, or Accepted with no offer made (the offer step never ran).
		if (status === "Offer Failed" || (status === "Accepted" && !frm.doc.job_offer)) {
			frm.add_custom_button(__("Retry Job Offer"), () => {
				frappe.call({ method: `${CTCP_API}.retry_offer`, args: { proposal: frm.doc.name }, freeze: true,
					freeze_message: __("Creating the Job Offer...") })
					.then((r) => {
						if (r.exc) return;
						frappe.show_alert({ message: __("Job Offer {0} created", [r.message.job_offer]), indicator: "green" });
						frm.reload_doc();
					});
			}).addClass("btn-primary");
		}
		if (frm.doc.job_offer) {
			frm.add_custom_button(__("Job Offer"), () =>
				frappe.set_route("Form", "Job Offer", frm.doc.job_offer), __("View"));
		}
		if (frm.doc.job_applicant) {
			frm.add_custom_button(__("Job Applicant"), () =>
				frappe.set_route("Form", "Job Applicant", frm.doc.job_applicant), __("View"));
		}
	},

	// The breakup follows these on save; say so, so HR does not send stale figures.
	ctc: mark_stale,
	salary_structure: mark_stale,
	income_tax_slab: mark_stale,
	epf: mark_stale,
	epf_type: mark_stale,
});

function mark_stale(frm) {
	if (frm.doc.status === "Draft") {
		frm.set_intro(__("Save to recalculate the breakup."), "orange");
	}
}

function show_intro(frm) {
	frm.set_intro("");
	const d = frm.doc;
	const messages = {
		Draft: [__("Enter the Annual CTC and save to see the breakup, then Send to Candidate."), "blue"],
		Sent: [__("Sent to the candidate. Link valid till {0}.", [frappe.datetime.str_to_user(d.expires_on)]), "blue"],
		"Negotiation Requested": [
			__("The candidate asks for {0}: {1}", [format_currency(d.expected_ctc), d.candidate_comment || "-"]), "orange"],
		Accepted: [__("The candidate accepted this proposal."), "green"],
		Rejected: [__("The candidate rejected this proposal: {0}", [d.candidate_comment || "-"]), "red"],
		Superseded: [__("Replaced by a newer version."), "gray"],
		Withdrawn: [__("Withdrawn."), "gray"],
		"Offer Created": d.offer_error
			? [__("Job Offer {0} was created: {1}", [d.job_offer, d.offer_error]), "orange"]
			: [__("Job Offer {0} was created and sent.", [d.job_offer]), "green"],
		"Offer Failed": [__("The Job Offer could not be created: {0}", [d.offer_error || "-"]), "red"],
	};
	const entry = !frm.is_new() && messages[d.status];
	if (entry) frm.set_intro(frappe.utils.escape_html(entry[0]), entry[1]);
}

function run(frm, method, success) {
	frappe.call({ method: `${CTCP_API}.${method}`, args: { proposal: frm.doc.name }, freeze: true }).then((r) => {
		if (r.exc) return;
		frappe.show_alert({ message: success, indicator: "green" });
		frm.reload_doc();
	});
}
