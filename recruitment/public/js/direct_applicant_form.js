/* global frappe, __ */

/*
 * Direct Applicant Onboarding — form flow buttons on a direct applicant.
 *
 * Only acts on applicants with "Direct Applicant" ticked while Recruitment
 * Settings -> "Enable Direct Applicant Onboarding" is on; every other Job
 * Applicant is left exactly as before. Status goes in the form intro (the
 * headline is owned by the region-suggestion banner in job_applicant.js).
 */
(function () {
	const API = "recruitment.api.direct_applicant_form";
	const GROUP = __("Direct Applicant");
	const OPEN = ["Sent", "Resubmission Requested"];

	frappe.ui.form.on("Job Applicant", {
		refresh(frm) {
			if (frm.is_new() || !frm.doc.custom_da_is_direct) return;
			frappe.call({ method: `${API}.get_form_state`, args: { job_applicant: frm.doc.name } }).then((r) => {
				const state = r.message || {};
				if (!state.enabled || !state.direct) return;
				show_status(frm, state);
				if (state.can_write) add_buttons(frm, state);
			});
		},
	});

	function show_status(frm, state) {
		const req = state.request;
		if (!req) {
			frm.set_intro(__("No form has been sent to this direct applicant yet."), "blue");
		} else {
			let text = __("Form {0}: {1}", [req.form, req.status]);
			if (OPEN.includes(req.status)) {
				text += req.expired
					? " · " + __("link expired")
					: " · " + __("link valid till {0}", [frappe.datetime.str_to_user(req.expires_on)]);
			}
			if (req.status === "Submitted") {
				text += req.missing_mandatory.length
					? " · " + __("missing: {0}", [req.missing_mandatory.join(", ")])
					: " · " + __("all mandatory details filled");
			}
			frm.set_intro(frappe.utils.escape_html(text), req.status === "Submitted" && !req.missing_mandatory.length ? "green" : "blue");
		}
		if (state.proposal) {
			frm.set_intro(frappe.utils.escape_html(
				__("CTC Proposal {0} (v{1}): {2}", [state.proposal.name, state.proposal.version, state.proposal.status])
			), state.proposal.status === "Negotiation Requested" ? "orange" : "blue");
		}
		if (state.duplicity_flag) {
			frm.set_intro(
				frappe.utils.escape_html(__("Duplicity match: {0}", [state.duplicity_note])),
				"red"
			);
		}
	}

	function add_buttons(frm, state) {
		const req = state.request;
		const sent_before = req && req.status !== "Revoked";
		frm.add_custom_button(sent_before ? __("Resend Form") : __("Send Form"), () => send_dialog(frm, sent_before), GROUP);
		if (req && req.status === "Submitted") {
			frm.add_custom_button(__("Request Resubmission"), () => resubmit_dialog(frm, req), GROUP);
		}
		if (req && OPEN.includes(req.status)) {
			frm.add_custom_button(__("Revoke Link"), () => {
				frappe.confirm(__("The candidate will no longer be able to open the form. Revoke the link?"), () =>
					run(frm, "revoke_form", {}, __("Link revoked")));
			}, GROUP);
		}
		if (state.can_propose) {
			frm.add_custom_button(__("Create CTC Proposal"), () => {
				frappe.call({
					method: "recruitment.api.ctc_proposal.get_proposal_defaults",
					args: { job_applicant: frm.doc.name },
				}).then((r) => { if (r.message) frappe.new_doc("CTC Proposal", r.message); });
			}, GROUP);
		}
		if (state.proposal) {
			frm.add_custom_button(__("Open CTC Proposal"), () =>
				frappe.set_route("Form", "CTC Proposal", state.proposal.name), GROUP);
		}
		if (state.duplicity_flag) {
			frm.add_custom_button(__("Clear Duplicity Flag"), () => {
				frappe.confirm(__("You have reviewed the duplicity match and want to let this candidate proceed?"), () =>
					run(frm, "clear_duplicity_flag", {}, __("Duplicity flag cleared")));
			}, GROUP);
		}
	}

	function send_dialog(frm, sent_before) {
		frappe.call({ method: `${API}.get_forms_for_applicant`, args: { job_applicant: frm.doc.name } }).then((r) => {
			const forms = r.message || [];
			if (!forms.length) {
				frappe.msgprint(__("No Direct Applicant Form applies to this applicant's company and category. Create one first."));
				return;
			}
			const dialog = new frappe.ui.Dialog({
				title: sent_before ? __("Resend Form") : __("Send Form"),
				fields: [
					{ fieldname: "form", fieldtype: "Select", label: __("Form"), options: forms, default: forms[0], reqd: 1 },
					sent_before ? {
						fieldtype: "HTML",
						options: `<p class="text-muted">${__("The earlier link stops working and a new one is emailed.")}</p>`,
					} : null,
				].filter(Boolean),
				primary_action_label: __("Send"),
				primary_action(values) {
					dialog.hide();
					run(frm, "send_form", { form: values.form }, __("Form sent to {0}", [frm.doc.email_id]));
				},
			});
			dialog.show();
		});
	}

	function resubmit_dialog(frm, req) {
		const dialog = new frappe.ui.Dialog({
			title: __("Request Resubmission"),
			fields: [
				{
					fieldname: "fields", fieldtype: "MultiCheck", label: __("Fields to correct"), reqd: 1, columns: 2,
					options: req.fields.map((f) => ({ label: f.label, value: f.fieldname })),
				},
				{ fieldname: "note", fieldtype: "Small Text", label: __("Note to candidate"),
					description: __("What is wrong, e.g. 'PAN card image is not readable'.") },
			],
			primary_action_label: __("Send"),
			primary_action(values) {
				if (!(values.fields || []).length) {
					frappe.msgprint(__("Select at least one field."));
					return;
				}
				dialog.hide();
				run(frm, "request_resubmission", { fields: JSON.stringify(values.fields), note: values.note || "" },
					__("Resubmission requested"));
			},
		});
		dialog.show();
	}

	function run(frm, method, args, success) {
		frappe.call({
			method: `${API}.${method}`,
			args: Object.assign({ job_applicant: frm.doc.name }, args),
			freeze: true,
		}).then((r) => {
			if (r.exc) return;
			frappe.show_alert({ message: success, indicator: "green" });
			frm.reload_doc();
		});
	}
})();
