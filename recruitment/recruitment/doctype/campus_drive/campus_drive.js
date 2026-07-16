// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

frappe.ui.form.on("Campus Drive", {
	setup: function (frm) {
		// Only openings actively posted to the Campus channel can be linked.
		frm.set_query("job_opening", "linked_job_openings", function () {
			return { query: "recruitment.api.campus_openings.campus_job_opening_query" };
		});
	},

	refresh: function (frm) {
		// QR for the candidate apply link — only once the drive is saved and the
		// registration form is enabled.
		if (frm.is_new() || !frm.doc.registration_form_enabled) {
			return;
		}
		frm.add_custom_button(
			__("Generate QR Code"),
			function () {
				frm.call({
					doc: frm.doc,
					method: "generate_registration_qr",
					freeze: true,
					freeze_message: __("Generating QR Code..."),
				}).then(function (r) {
					if (r && r.message) {
						frm.reload_doc();
						frappe.show_alert(
							{ message: __("QR Code generated"), indicator: "green" },
							4
						);
					}
				});
			},
			__("Registration Form")
		);
	},
});

frappe.ui.form.on("Campus Drive Invite", {
	campus_invite: function (frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.campus_invite) {
			return;
		}

		frappe.call({
			method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_campus_invite_details",
			args: { campus_invite: row.campus_invite },
			callback: function (r) {
				if (!r.message) {
					return;
				}
				const data = r.message;
				let added = 0;

				// Institutes -> Participating Institutes
				(data.institutes || []).forEach((institute) => {
					const exists = (frm.doc.participating_institutes || []).some(
						(d) => d.institute === institute
					);
					if (!exists) {
						const child = frm.add_child("participating_institutes");
						child.institute = institute;
						added += 1;
					}
				});

				// Job Openings -> Linked Job Openings
				(data.job_openings || []).forEach((jo) => {
					const exists = (frm.doc.linked_job_openings || []).some(
						(d) => d.job_opening === jo.job_opening
					);
					if (!exists) {
						const child = frm.add_child("linked_job_openings");
						child.job_opening = jo.job_opening;
						// fetch_from does not run on programmatic add — set the title
						// explicitly so it shows immediately (no save needed).
						child.job_title = jo.job_title;
						added += 1;
					}
				});

				frm.refresh_field("participating_institutes");
				frm.refresh_field("linked_job_openings");

				if (added) {
					frappe.show_alert(
						{
							message: __("Institute & Job Openings fetched from {0}", [
								row.campus_invite,
							]),
							indicator: "green",
						},
						5
					);
				}
			},
		});
	},
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
