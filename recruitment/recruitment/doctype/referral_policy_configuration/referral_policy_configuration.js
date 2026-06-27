// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

const RESTRICTION_FIELDS = [
	{
		fieldname: "allow_reward_payout_if_referrer_is_on_notice",
		label: "Allow Reward Payout if Referrer is On-Notice",
	},
	{
		fieldname: "allow_reward_payout_if_referee_is_on_notice",
		label: "Allow Reward Payout if Referee is On-Notice",
	},
	{
		fieldname: "allow_reward_payout_if_referee_is_alumni",
		label: "Allow Reward Payout if Referee is alumni",
	},
	{
		fieldname: "allow_reward_payout_if_referrer_is_l1_manager",
		label: "Allow Reward Payout if Referrer is L1 manager",
	},
	{
		fieldname: "allow_reward_payout_if_referrer_is_l2_l3_or_above_manager",
		label: "Allow Reward Payout if Referrer is L2, L3 or any manager above in the hierarchy",
	},
	{
		fieldname: "allow_reward_payout_if_referrer_is_interviewer",
		label: "Allow Reward Payout if Referrer is Interviewer",
	},
];

function get_selected_restrictions(frm) {
	return RESTRICTION_FIELDS.filter((item) => cint(frm.doc[item.fieldname]));
}

function render_additional_restrictions_link(frm) {
	const selected = get_selected_restrictions(frm);
	const count_text = selected.length ? `${selected.length} selected` : "Not configured";

	frm.fields_dict.additional_restrictions_link.$wrapper.html(`
		<div class="mt-2 mb-3">
			<a href="#" class="referral-policy-restrictions-link">
				${__("Additional restrictions")}
			</a>
			<div class="text-muted small mt-1">${frappe.utils.escape_html(count_text)}</div>
		</div>
	`);

	frm.fields_dict.additional_restrictions_link.$wrapper
		.find(".referral-policy-restrictions-link")
		.on("click", (event) => {
			event.preventDefault();
			open_restrictions_dialog(frm);
		});
}

function open_restrictions_dialog(frm) {
	const dialog = new frappe.ui.Dialog({
		title: __("Additional restrictions"),
		fields: RESTRICTION_FIELDS.map((item) => ({
			fieldname: item.fieldname,
			fieldtype: "Check",
			label: __(item.label),
			default: frm.doc[item.fieldname] || 0,
		})),
		primary_action_label: __("Save"),
		primary_action(values) {
			const updates = {};

			RESTRICTION_FIELDS.forEach((item) => {
				updates[item.fieldname] = values[item.fieldname] ? 1 : 0;
			});

			frm.set_value(updates).then(() => {
				render_additional_restrictions_link(frm);
				dialog.hide();
			});
		},
	});

	dialog.show();
}

function toggle_applicable_to_fields(frm) {
	const by_user_assignment = frm.doc.assign_referral_policy_by === "User Assignment";
	const by_job_opening = frm.doc.assign_referral_policy_by === "Job Opening";

	frm.set_df_property("applicable_to_user_assignments", "hidden", !by_user_assignment);
	frm.set_df_property("applicable_to_user_assignments", "reqd", by_user_assignment);
	frm.set_df_property("applicable_to_job_openings", "hidden", !by_job_opening);
	frm.set_df_property("applicable_to_job_openings", "reqd", by_job_opening);
}

frappe.ui.form.on("Referral Policy Configuration", {
	setup(frm) {
		frm.set_query("applicable_to_user_assignments", () => ({
			filters: {
				default: 0,
			},
		}));

		frm.set_query("referrer_user_assignment", "role_specific_limits", () => ({
			filters: {
				default: 0,
			},
		}));

		frm.set_query("referee_user_assignment", "role_specific_limits", () => ({
			filters: {
				default: 0,
			},
		}));
	},

	onload(frm) {
		toggle_applicable_to_fields(frm);
		render_additional_restrictions_link(frm);
	},

	refresh(frm) {
		toggle_applicable_to_fields(frm);
		render_additional_restrictions_link(frm);
	},

	assign_referral_policy_by(frm) {
		toggle_applicable_to_fields(frm);
	},
});

