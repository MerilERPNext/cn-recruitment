// Adds a read-only "Preview Referral Reward" action to Employee Referral.
// Shows which Referral Policy Configuration matches and the projected payout
// schedule, without creating or changing any data.
frappe.ui.form.on("Employee Referral", {
	refresh(frm) {
		if (frm.is_new()) {
			return;
		}

		frm.add_custom_button(
			__("Preview Referral Reward"),
			() => {
				frappe.call({
					method:
						"recruitment.recruitment.referral_reward_engine.preview_referral_reward",
					args: { employee_referral: frm.doc.name },
					freeze: true,
					freeze_message: __("Matching referral policy..."),
					callback: (r) => show_referral_reward_preview(frm, r.message),
				});
			},
			__("Referral Reward")
		);
	},
});

function show_referral_reward_preview(frm, data) {
	if (!data) {
		frappe.msgprint(__("No response from the referral engine."));
		return;
	}

	if (!data.matched) {
		frappe.msgprint({
			title: __("Referral Reward"),
			indicator: "orange",
			message: frappe.utils.escape_html(data.message || __("No applicable policy.")),
		});
		return;
	}

	let rows = (data.schedules || [])
		.map((s) => {
			const due = s.due_date
				? frappe.datetime.str_to_user(s.due_date)
				: __("DOJ + {0} days", [s.days_from_doj]);
			return `<tr>
				<td>${s.schedule_no}</td>
				<td>${due}</td>
				<td style="text-align:right">${format_currency(s.amount, data.payout_currency)}</td>
				<td>${frappe.utils.escape_html(s.status || "")}</td>
			</tr>`;
		})
		.join("");

	if (!rows) {
		rows = `<tr><td colspan="4" class="text-muted">${__("No payout schedule.")}</td></tr>`;
	}

	const eligible = data.is_eligible
		? `<span class="indicator-pill green">${__("Eligible")}</span>`
		: `<span class="indicator-pill red">${__("Blocked")}</span>`;

	const reason = data.eligibility_reason
		? `<div class="text-muted small" style="margin-top:6px">${frappe.utils.escape_html(
				data.eligibility_reason
		  ).replace(/\n/g, "<br>")}</div>`
		: "";

	const existing = data.existing_reward
		? `<div class="small" style="margin-top:8px">${__("Existing Referral Reward")}:
			<a href="/app/referral-reward/${encodeURIComponent(data.existing_reward)}">${frappe.utils.escape_html(
				data.existing_reward
		  )}</a></div>`
		: "";

	const html = `
		<div>
			<p><b>${__("Policy")}:</b> ${frappe.utils.escape_html(data.policy)} &nbsp; ${eligible}</p>
			<p class="small text-muted">${__("Reference Date")}: ${
		data.reference_date ? frappe.datetime.str_to_user(data.reference_date) : "-"
	} &nbsp;|&nbsp; ${__("Total")}: ${format_currency(data.total_amount, data.payout_currency)}</p>
			<table class="table table-bordered" style="margin-top:8px">
				<thead><tr>
					<th>#</th><th>${__("Payout Date")}</th>
					<th style="text-align:right">${__("Amount")}</th><th>${__("Status")}</th>
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>
			${reason}
			${existing}
		</div>`;

	frappe.msgprint({ title: __("Referral Reward Preview"), message: html, wide: true });
}
