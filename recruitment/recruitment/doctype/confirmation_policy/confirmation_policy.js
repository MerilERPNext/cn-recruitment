// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

const LETTER_EVENT_OPTIONS = [
	"Employee's Confirmation is Approved",
	"Employee's Probation is Extended",
];

const NOTIFICATION_TYPE_OPTIONS = [
	"Confirmed",
	"Extended",
	"Separated",
];

function cp_get_duplicate_values(rows, fieldname) {
	const seen = [];
	const duplicates = [];
	(rows || []).forEach((row) => {
		const value = row[fieldname];
		if (!value) return;
		if (seen.includes(value) && !duplicates.includes(value)) {
			duplicates.push(value);
			return;
		}
		seen.push(value);
	});
	return duplicates;
}

function cp_enforce_child_row_rules(frm, table_fieldname, options, max_rows, label, value_fieldname) {
	const rows = frm.doc[table_fieldname] || [];
	if (rows.length > max_rows) {
		frappe.throw(__("{0} can have at most {1} rows.", [label, max_rows]));
	}

	const invalid_values = rows
		.map((row) => row[value_fieldname])
		.filter((value) => value && !options.includes(value));
	if (invalid_values.length) {
		frappe.throw(__("{0} contains invalid value(s): {1}", [label, invalid_values.join(", ")]));
	}

	const duplicates = cp_get_duplicate_values(rows, value_fieldname);
	if (duplicates.length) {
		frappe.throw(__("{0} value can be selected only once: {1}", [label, duplicates.join(", ")]));
	}
}

function cp_prevent_extra_row(frm, table_fieldname, cdt, cdn, max_rows, label) {
	if ((frm.doc[table_fieldname] || []).length > max_rows) {
		frappe.model.clear_doc(cdt, cdn);
		frm.refresh_field(table_fieldname);
		frappe.msgprint(__("{0} can have at most {1} rows.", [label, max_rows]));
		return true;
	}
	return false;
}

function cp_prevent_duplicate_child_value(frm, table_fieldname, cdt, cdn, fieldname, label) {
	const row = locals[cdt][cdn];
	if (!row || !row[fieldname]) return;
	const duplicate = (frm.doc[table_fieldname] || []).some((child) => child.name !== cdn && child[fieldname] === row[fieldname]);
	if (duplicate) {
		frappe.model.set_value(cdt, cdn, fieldname, "");
		frappe.msgprint(__("{0} can be selected only once.", [label]));
	}
}

function cp_get_available_options(frm, table_fieldname, fieldname, all_options, current_row_name) {
	const used_values = (frm.doc[table_fieldname] || [])
		.filter((row) => row.name !== current_row_name)
		.map((row) => row[fieldname])
		.filter(Boolean);

	return all_options.filter((option) => !used_values.includes(option));
}

function cp_set_row_select_options(grid_row, fieldname, options) {
	if (!grid_row || !grid_row.docfields) return;
	const docfield = grid_row.docfields.find((df) => df.fieldname === fieldname);
	if (!docfield) return;
	docfield.options = [""].concat(options).join("\n");
	if (grid_row.grid_form && grid_row.grid_form.fields_dict[fieldname]) {
		grid_row.grid_form.fields_dict[fieldname].df.options = docfield.options;
		grid_row.grid_form.fields_dict[fieldname].refresh();
	}
}

function cp_refresh_child_table_controls(frm) {
	const letter_grid = frm.fields_dict.letter_configuration && frm.fields_dict.letter_configuration.grid;
	if (letter_grid) {
		const can_add_letter = (frm.doc.letter_configuration || []).length < 2;
		letter_grid.wrapper.find(".grid-add-row, .grid-add-multiple-rows").toggle(can_add_letter);
		(letter_grid.grid_rows || []).forEach((grid_row) => {
			cp_set_row_select_options(
				grid_row,
				"event",
				cp_get_available_options(frm, "letter_configuration", "event", LETTER_EVENT_OPTIONS, grid_row.doc.name)
			);
		});
	}

	const notification_grid = frm.fields_dict.notification_configuration && frm.fields_dict.notification_configuration.grid;
	if (notification_grid) {
		const can_add_notification = (frm.doc.notification_configuration || []).length < 3;
		notification_grid.wrapper.find(".grid-add-row, .grid-add-multiple-rows").toggle(can_add_notification);
		(notification_grid.grid_rows || []).forEach((grid_row) => {
			cp_set_row_select_options(
				grid_row,
				"type",
				cp_get_available_options(frm, "notification_configuration", "type", NOTIFICATION_TYPE_OPTIONS, grid_row.doc.name)
			);
		});
	}
}

function cp_open_unified_recipient_dialog(frm, cdt, cdn, {
	title,
	roles_field,
	users_field,
	level_field,
	emp_field,
	user_field,
}) {
	const row = locals[cdt][cdn];
	const existing_roles = (row[roles_field] || "").split(",").map((r) => r.trim()).filter(Boolean);
	const existing_users = (row[users_field] || "").split(",").map((u) => u.trim()).filter(Boolean);
	const existing_levels = (row[level_field] || "").split(",").map((l) => l.trim()).filter(Boolean);
	const existing_emp_fields = (row[emp_field] || "").split(",").map((f) => f.trim()).filter(Boolean);
	const existing_user_fields = (row[user_field] || "").split(",").map((f) => f.trim()).filter(Boolean);

	const level_options = ["L1", "L2", "L3", "L4", "L5"].map((level) => ({
		label: level,
		value: level,
		checked: existing_levels.includes(level),
	}));

	const employee_field_options = (frm.__recipient_employee_fields || []).map((fieldname) => ({
		label: (frm.__employee_field_label_map && frm.__employee_field_label_map[fieldname]) || fieldname,
		value: fieldname,
		checked: existing_emp_fields.includes(fieldname),
	}));

	const user_field_options = (frm.__user_link_fields || []).map((fieldname) => ({
		label: (frm.__user_field_label_map && frm.__user_field_label_map[fieldname]) || fieldname,
		value: fieldname,
		checked: existing_user_fields.includes(fieldname),
	}));

	Promise.all([
		frappe.model.with_doctype("Role Table"),
		frappe.model.with_doctype("User Group Member"),
	]).then(() => {
		const d = new frappe.ui.Dialog({
			title: __(title),
			size: "large",
			fields: [
				{
					fieldtype: "MultiCheck",
					fieldname: "levels",
					label: __("Levels"),
					options: level_options,
					columns: 5,
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "MultiCheck",
					fieldname: "emp_fields",
					label: __("Employee Fields"),
					options: employee_field_options,
					columns: 3,
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "MultiCheck",
					fieldname: "user_fields",
					label: __("User Fields (From Document)"),
					options: user_field_options,
					columns: 3,
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "Table MultiSelect",
					fieldname: "roles",
					label: __("Roles"),
					options: "Role Table",
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "Table MultiSelect",
					fieldname: "users",
					label: __("Users"),
					options: "User Group Member",
				},
			],
			primary_action_label: __("Apply"),
			primary_action() {
				const values = d.get_values();
				const selected_roles = (d.fields_dict.roles.rows || []).map((r) => r.role).filter(Boolean);
				const selected_users = (d.fields_dict.users.rows || []).map((r) => r.user).filter(Boolean);
				const selected_levels = (values.levels || []).filter(Boolean);
				const selected_emp_fields = (values.emp_fields || []).filter(Boolean);
				const selected_user_fields = (values.user_fields || []).filter(Boolean);

				frappe.model.set_value(cdt, cdn, roles_field, selected_roles.join(", "));
				frappe.model.set_value(cdt, cdn, users_field, selected_users.join(", "));
				frappe.model.set_value(cdt, cdn, level_field, selected_levels.join(", "));
				frappe.model.set_value(cdt, cdn, emp_field, selected_emp_fields.join(", "));
				frappe.model.set_value(cdt, cdn, user_field, selected_user_fields.join(", "));

				d.hide();
				frm.dirty();
			},
		});

		d.show();

		if (existing_roles.length) {
			d.fields_dict.roles.set_formatted_input(existing_roles.map((role) => ({ role })));
		}
		if (existing_users.length) {
			d.fields_dict.users.set_formatted_input(existing_users.map((user) => ({ user })));
		}
	});
}

frappe.ui.form.on("Confirmation Policy", {
	refresh(frm) {
		frm.trigger("set_extension_table_max_rows");
		frm.trigger("render_initiator_display");
		frm.trigger("setup_recipient_field_options");
		frm.trigger("set_child_table_options");
		cp_refresh_child_table_controls(frm);
	},

	maximum_number_of_extensions_to_probation_period(frm) {
		frm.trigger("set_extension_table_max_rows");
	},

	setup_recipient_field_options(frm) {
		frappe.model.with_doctype("Employee Confirmation", () => {
			const meta = frappe.get_meta("Employee Confirmation");
			const employee_link_fields = meta.fields.filter(
				(field) => field.fieldtype === "Link" && field.options === "Employee"
			);
			const user_link_fields = meta.fields.filter(
				(field) => field.fieldtype === "Link" && field.options === "User"
			);

			const employee_field_label_map = {};
			const recipient_employee_fields = [];

			employee_link_fields.forEach((field) => {
				recipient_employee_fields.push(field.fieldname);
				employee_field_label_map[field.fieldname] = field.fieldname === "employee" ? "Self" : field.label;
			});

			if (employee_link_fields.length) {
				frappe.model.with_doctype("Employee", () => {
					const employee_meta = frappe.get_meta("Employee");
					employee_meta.fields
						.filter((field) => field.fieldtype === "Link" && field.options === "Employee")
						.forEach((field) => {
							const dotted_fieldname = `${employee_link_fields[0].fieldname}.${field.fieldname}`;
							recipient_employee_fields.push(dotted_fieldname);
							employee_field_label_map[dotted_fieldname] = field.label;
						});
				});
			}

			const user_field_label_map = {};
			const user_fieldnames = [];

			user_link_fields.forEach((field) => {
				user_fieldnames.push(field.fieldname);
				user_field_label_map[field.fieldname] = field.label;
			});

			frm.__recipient_employee_fields = recipient_employee_fields;
			frm.__employee_field_label_map = employee_field_label_map;
			frm.__user_link_fields = user_fieldnames;
			frm.__user_field_label_map = user_field_label_map;
		});
	},

	set_child_table_options(frm) {
		frm.fields_dict.letter_configuration.grid.update_docfield_property(
			"event",
			"options",
			[""].concat(LETTER_EVENT_OPTIONS).join("\n")
		);
		frm.fields_dict.notification_configuration.grid.update_docfield_property(
			"type",
			"options",
			[""].concat(NOTIFICATION_TYPE_OPTIONS).join("\n")
		);
		cp_refresh_child_table_controls(frm);
	},

	set_extension_table_max_rows(frm) {
		const max_extensions = parseInt(frm.doc.maximum_number_of_extensions_to_probation_period) || 0;
		if (max_extensions === 0) {
			frm.clear_table("extension_workflow_configurations");
			frm.refresh_field("extension_workflow_configurations");
			return;
		}
		if (frm.doc.extension_workflow_configurations && frm.doc.extension_workflow_configurations.length > max_extensions) {
			frm.doc.extension_workflow_configurations = frm.doc.extension_workflow_configurations.slice(0, max_extensions);
			frm.refresh_field("extension_workflow_configurations");
		}
	},

	render_initiator_display(frm) {
		let field = frm.fields_dict.initiator;
		if (!field) return;
		let val = frm.doc.initiator;
		if (!val) {
			field.$wrapper.find(".like-disabled-input").html("<span style='color:#888;'>Not configured</span>");
			return;
		}
		try {
			let cfg = JSON.parse(val);
			let parts = [];
			if (cfg.self) parts.push("Self (Employee)");
			if (cfg.roles && cfg.roles.length) parts.push("Roles: " + cfg.roles.join(", "));
			if (cfg.users && cfg.users.length) parts.push("Users: " + cfg.users.join(", "));
			if (cfg.employee_fields && cfg.employee_fields.length) {
				parts.push("Fields: " + cfg.employee_fields.map(f => f.label || f.field).join(", "));
			}
			if (!parts.length) {
				field.$wrapper.find(".like-disabled-input").html("<span style='color:#888;'>Not configured</span>");
				return;
			}
			let html = parts.map(p =>
				`<span class="badge" style="margin:2px;padding:4px 8px;font-size:12px;">${p}</span>`
			).join("");
			field.$wrapper.find(".like-disabled-input").html(html);
		} catch (e) {}
	},

	configure_initiator(frm) {
		let cfg = {};
		try { cfg = JSON.parse(frm.doc.initiator || "{}"); } catch (e) {}
		if (Array.isArray(cfg)) cfg = {};

		let existing_roles = (cfg.roles || []);
		let existing_users = (cfg.users || []);
		let existing_fields = (cfg.employee_fields || []);

		Promise.all([
			frappe.model.with_doctype("Role Table"),
			frappe.model.with_doctype("User Group Member"),
			frappe.model.with_doctype("Employee"),
		]).then(() => {
			let emp_fields = [];
			let emp_meta = frappe.get_meta("Employee");
			if (emp_meta) {
				emp_fields = emp_meta.fields
					.filter(f => f.fieldtype === "Link" && f.options === "Employee")
					.map(f => ({ fieldname: f.fieldname, label: f.label }));
			}
			let d = new frappe.ui.Dialog({
				title: __("Configure Initiators"),
				size: "large",
				fields: [
					{
						fieldname: "self",
						fieldtype: "Check",
						label: "Self (Employee)",
						default: cfg.self ? 1 : 0
					},
					{ fieldtype: "Section Break", label: "Roles" },
					{
						fieldname: "roles",
						fieldtype: "Table MultiSelect",
						label: "Select Roles",
						options: "Role Table"
					},
					{ fieldtype: "Section Break", label: "Users" },
					{
						fieldname: "users",
						fieldtype: "Table MultiSelect",
						label: "Select Users",
						options: "User Group Member"
					},
					{ fieldtype: "Section Break", label: "Employee Fields" },
					{
						fieldname: "employee_fields",
						fieldtype: "Table MultiSelect",
						label: "Select Employee Fields",
						options: "Role Table",
						hidden: 1
					},
					{
						fieldname: "employee_fields_html",
						fieldtype: "HTML"
					}
				],
				primary_action_label: __("Save"),
				primary_action() {
					let selected_roles = (d.fields_dict.roles.rows || []).map(r => r.role).filter(Boolean);
					let selected_users = (d.fields_dict.users.rows || []).map(r => r.user).filter(Boolean);
					let selected_fields = [];
					d.$wrapper.find(".emp-field-check:checked").each(function () {
						let fn = $(this).data("fieldname");
						let match = emp_fields.find(f => f.fieldname === fn);
						selected_fields.push({ field: fn, label: match ? match.label : fn });
					});
					let new_cfg = {
						self: d.get_value("self") ? true : false,
						roles: selected_roles,
						users: selected_users,
						employee_fields: selected_fields
					};
					frm.set_value("initiator", JSON.stringify(new_cfg));
					frm.trigger("render_initiator_display");
					frm.dirty();
					d.hide();
				}
			});

			d.show();

			if (existing_roles.length) {
				d.fields_dict.roles.set_formatted_input(
					existing_roles.map(r => ({ role: r }))
				);
			}
			if (existing_users.length) {
				d.fields_dict.users.set_formatted_input(
					existing_users.map(u => ({ user: u }))
				);
			}

			let fields_html = "";
			if (emp_fields.length) {
				fields_html = emp_fields.map(f => {
					let checked = existing_fields.some(ef => ef.field === f.fieldname) ? "checked" : "";
					return `<div style="padding:4px 0;">
						<label><input type="checkbox" class="emp-field-check" data-fieldname="${f.fieldname}" ${checked}> ${f.label} <span style="color:#888;">(${f.fieldname})</span></label>
					</div>`;
				}).join("");
			} else {
				fields_html = `<span style="color:#888;">No Employee link fields found on Employee</span>`;
			}
			d.fields_dict.employee_fields_html.$wrapper.html(fields_html);
		});
	},

	validate(frm) {
		cp_enforce_child_row_rules(
			frm,
			"letter_configuration",
			LETTER_EVENT_OPTIONS,
			2,
			"Letter Configuration",
			"event"
		);
		cp_enforce_child_row_rules(
			frm,
			"notification_configuration",
			NOTIFICATION_TYPE_OPTIONS,
			3,
			"Notification Configuration",
			"type"
		);

		const max_extensions = parseInt(frm.doc.maximum_number_of_extensions_to_probation_period) || 0;
		if (frm.doc.extension_workflow_configurations && frm.doc.extension_workflow_configurations.length > max_extensions) {
			frappe.throw(__("Extension Workflow Configurations cannot have more than {0} rows (based on Maximum number of extensions)", [max_extensions]));
		}
		if (frm.doc.extension_workflow_configurations) {
			const extension_numbers = [];
			for (const row of frm.doc.extension_workflow_configurations) {
				if (row.extension_number < 1 || row.extension_number > max_extensions) {
					frappe.throw(__("Extension Number in row {0} must be between 1 and {1}", [row.idx, max_extensions]));
				}
				if (extension_numbers.includes(row.extension_number)) {
					frappe.throw(__("Duplicate Extension Number {0} found in Extension Workflow Configurations", [row.extension_number]));
				}
				extension_numbers.push(row.extension_number);
			}
		}
	}
});

frappe.ui.form.on("Letter Configuration Table", {
	letter_configuration_add(frm, cdt, cdn) {
		const blocked = cp_prevent_extra_row(frm, "letter_configuration", cdt, cdn, 2, "Letter Configuration");
		if (!blocked) {
			cp_refresh_child_table_controls(frm);
		}
	},

	event(frm, cdt, cdn) {
		cp_prevent_duplicate_child_value(frm, "letter_configuration", cdt, cdn, "event", "Event");
		cp_refresh_child_table_controls(frm);
	},

	select_cc(frm, cdt, cdn) {
		cp_open_unified_recipient_dialog(frm, cdt, cdn, {
			title: "Select CC",
			roles_field: "cc_roles",
			users_field: "cc_selected_users",
			level_field: "cc_level",
			emp_field: "cc_employee_field",
			user_field: "cc_user_field",
		});
	},

	form_render(frm) {
		cp_refresh_child_table_controls(frm);
	},
});

frappe.ui.form.on("Notification Configuration Table", {
	notification_configuration_add(frm, cdt, cdn) {
		const blocked = cp_prevent_extra_row(frm, "notification_configuration", cdt, cdn, 3, "Notification Configuration");
		if (!blocked) {
			cp_refresh_child_table_controls(frm);
		}
	},

	type(frm, cdt, cdn) {
		cp_prevent_duplicate_child_value(frm, "notification_configuration", cdt, cdn, "type", "Type");
		cp_refresh_child_table_controls(frm);
	},

	select_assignees(frm, cdt, cdn) {
		cp_open_unified_recipient_dialog(frm, cdt, cdn, {
			title: "Select Assignees",
			roles_field: "select_roles",
			users_field: "select_users",
			level_field: "recipient_level",
			emp_field: "recipient_employee_field",
			user_field: "assignee_user_field",
		});
	},

	form_render(frm) {
		cp_refresh_child_table_controls(frm);
	},
});

frappe.ui.form.on("Extension Workflow Configuration", {
	extension_workflow_configurations_add(frm, cdt, cdn) {
		const max_extensions = parseInt(frm.doc.maximum_number_of_extensions_to_probation_period) || 0;
		if (frm.doc.extension_workflow_configurations.length > max_extensions) {
			frappe.model.clear_doc(cdt, cdn);
			frm.refresh_field("extension_workflow_configurations");
			frappe.msgprint(__("Cannot add more than {0} rows in Extension Workflow Configurations", [max_extensions]));
			return;
		}
		const row = locals[cdt][cdn];
		const existing_numbers = frm.doc.extension_workflow_configurations
			.filter(r => r.name !== cdn)
			.map(r => r.extension_number);
		for (let i = 1; i <= max_extensions; i++) {
			if (!existing_numbers.includes(i)) {
				row.extension_number = i;
				break;
			}
		}
		frm.refresh_field("extension_workflow_configurations");
	}
});
