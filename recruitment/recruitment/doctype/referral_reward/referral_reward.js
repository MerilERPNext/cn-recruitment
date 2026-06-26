frappe.ui.form.on("Referral Reward", {
	refresh(frm) {
		if (frm.is_new()) {
			return;
		}

		const has_due = (frm.doc.schedules || []).some(
			(s) =>
				s.status === "Pending" &&
				s.due_date &&
				frappe.datetime.get_diff(frappe.datetime.get_today(), s.due_date) >= 0
		);

		if (frm.doc.status !== "Blocked" && frm.doc.status !== "Cancelled" && has_due) {
			frm.add_custom_button(__("Process Due Payouts"), () => {
				frappe.confirm(
					__("Create Additional Salary for all installments due today?"),
					() => {
						frappe.call({
							method:
								"recruitment.recruitment.referral_reward_engine.process_reward_now",
							args: { reward: frm.doc.name },
							freeze: true,
							freeze_message: __("Processing payouts..."),
							callback: () => frm.reload_doc(),
						});
					}
				);
			});
		}
	},
});
