// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

frappe.ui.form.on("Campus Drive", {
	// Placeholder for parent form events.
});

frappe.ui.form.on("Campus Drive Job Opening", {
	applicant_count: function (frm, cdt, cdn) {
		const row = locals[cdt][cdn];

		if (!row.job_opening) {
			frappe.msgprint(__("Please select a Job Opening for this row first."));
			return;
		}

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Job Applicant",
				filters: { job_title: row.job_opening },
				fields: [
					"name",
					"applicant_name",
					"email_id",
					"phone_number",
					"status",
				],
				order_by: "creation desc",
				limit_page_length: 0,
			},
			callback: function (r) {
				const applicants = r.message || [];
				show_applicants_dialog(row.job_opening, applicants);
			},
		});
	},
});

function show_applicants_dialog(job_opening, applicants) {
	let body;

	if (!applicants.length) {
		body = `<div class="text-muted" style="padding: 12px 0;">
			${__("No Job Applicants found for this Job Opening.")}
		</div>`;
	} else {
		const rows = applicants
			.map(function (a, idx) {
				const applicant_url = `/app/job-applicant/${encodeURIComponent(a.name)}`;
				const status = a.status ? frappe.utils.escape_html(a.status) : "";
				return `<tr>
					<td>${idx + 1}</td>
					<td><a href="${applicant_url}" target="_blank">${frappe.utils.escape_html(
						a.applicant_name || a.name
					)}</a></td>
					<td>${a.email_id ? frappe.utils.escape_html(a.email_id) : ""}</td>
					<td>${a.phone_number ? frappe.utils.escape_html(a.phone_number) : ""}</td>
					<td><span class="indicator-pill whitespace-nowrap">${status}</span></td>
				</tr>`;
			})
			.join("");

		body = `<div style="max-height: 60vh; overflow-y: auto;">
			<table class="table table-bordered" style="margin-bottom: 0;">
				<thead>
					<tr>
						<th style="width: 40px;">#</th>
						<th>${__("Applicant Name")}</th>
						<th>${__("Email")}</th>
						<th>${__("Phone")}</th>
						<th>${__("Status")}</th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
		</div>`;
	}

	const dialog = new frappe.ui.Dialog({
		title: __("Applicants for {0} ({1})", [job_opening, applicants.length]),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "applicants_html",
				options: body,
			},
		],
		primary_action_label: __("Open in List View"),
		primary_action: function () {
			frappe.set_route("List", "Job Applicant", { job_title: job_opening });
			dialog.hide();
		},
	});

	dialog.show();
}
