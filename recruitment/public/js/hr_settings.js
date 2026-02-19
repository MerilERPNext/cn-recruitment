frappe.ui.form.on("HR Settings", {
	refresh(frm) {
		recruitment.render_duplicate_check_table(frm);
	},

	custom_enable_duplicate_check(frm) {
		recruitment.render_duplicate_check_table(frm);
	},
});

// Namespace to avoid global pollution
if (!window.recruitment) window.recruitment = {};

recruitment.parse_duplicate_check_fields = function (frm) {
	try {
		return JSON.parse(frm.doc.custom_duplicate_check_fields || "[]");
	} catch (e) {
		return [];
	}
};

recruitment.render_duplicate_check_table = function (frm) {
	if (!frm.fields_dict.custom_duplicate_check_html) return;

	if (!frm.doc.custom_enable_duplicate_check) {
		frm.fields_dict.custom_duplicate_check_html.$wrapper.html("");
		return;
	}

	let fields = recruitment.parse_duplicate_check_fields(frm);

	let html = `
		<div class="duplicate-check-config">
			<table class="table table-bordered table-sm" style="margin-bottom: 10px;">
				<thead>
					<tr>
						<th style="width: 50px;">#</th>
						<th>Field Label</th>
						<th>Fieldname</th>
						<th style="width: 80px;">Action</th>
					</tr>
				</thead>
				<tbody>`;

	if (fields.length === 0) {
		html += `
					<tr>
						<td colspan="4" class="text-muted text-center" style="padding: 15px;">
							No fields configured. Click "Add Field" to add fields for duplicate checking.
						</td>
					</tr>`;
	} else {
		fields.forEach(function (field, idx) {
			html += `
					<tr>
						<td>${idx + 1}</td>
						<td>${field.label}</td>
						<td><code>${field.fieldname}</code></td>
						<td>
							<button class="btn btn-xs btn-danger btn-remove-field" data-idx="${idx}">
								Remove
							</button>
						</td>
					</tr>`;
		});
	}

	html += `
				</tbody>
			</table>
			<button class="btn btn-xs btn-primary btn-add-field">
				+ Add Field
			</button>
		</div>`;

	frm.fields_dict.custom_duplicate_check_html.$wrapper.html(html);

	// Bind Add Field button
	frm.fields_dict.custom_duplicate_check_html.$wrapper
		.find(".btn-add-field")
		.on("click", function () {
			recruitment.show_add_field_dialog(frm);
		});

	// Bind Remove buttons
	frm.fields_dict.custom_duplicate_check_html.$wrapper
		.find(".btn-remove-field")
		.on("click", function () {
			let idx = $(this).data("idx");
			recruitment.remove_duplicate_check_field(frm, idx);
		});
};

recruitment.show_add_field_dialog = function (frm) {
	frappe.call({
		method: "recruitment.customizations.employee.duplicate_check.get_employee_fields_for_duplicate_check",
		callback: function (r) {
			let employee_fields = r.message || [];

			// Filter out already added fields
			let existing = recruitment.parse_duplicate_check_fields(frm);
			let existing_fieldnames = existing.map((f) => f.fieldname);

			let all_options = employee_fields
				.filter((f) => !existing_fieldnames.includes(f.fieldname))
				.map((f) => ({
					label: f.label + " (" + f.fieldname + ")",
					value: JSON.stringify(f),
				}));

			if (all_options.length === 0) {
				frappe.msgprint("All available fields have already been added.");
				return;
			}

			let d = new frappe.ui.Dialog({
				title: "Add Field for Duplicate Check",
				fields: [
					{
						fieldname: "field_select",
						fieldtype: "Autocomplete",
						label: "Select Employee Field",
						options: all_options.map((o) => o.label),
						reqd: 1,
					},
				],
				primary_action_label: "Add",
				primary_action: function (values) {
					let selected_option = all_options.find(
						(o) => o.label === values.field_select
					);
					if (!selected_option) return;

					let field_data = JSON.parse(selected_option.value);

					let fields = recruitment.parse_duplicate_check_fields(frm);

					fields.push(field_data);
					frm.set_value(
						"custom_duplicate_check_fields",
						JSON.stringify(fields)
					);
					frm.dirty();
					recruitment.render_duplicate_check_table(frm);
					d.hide();
				},
			});
			d.show();
		},
	});
};

recruitment.remove_duplicate_check_field = function (frm, idx) {
	let fields = recruitment.parse_duplicate_check_fields(frm);

	if (idx >= 0 && idx < fields.length) {
		let removed = fields.splice(idx, 1)[0];
		frm.set_value("custom_duplicate_check_fields", JSON.stringify(fields));
		frm.dirty();
		recruitment.render_duplicate_check_table(frm);
		frappe.show_alert({
			message: `Removed "${removed.label}" from duplicate check fields.`,
			indicator: "orange",
		});
	}
};
