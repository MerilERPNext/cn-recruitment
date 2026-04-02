// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Confirmation Policy", {
	refresh(frm) {
		frm.trigger("set_extension_table_max_rows");
		frm.trigger("render_initiator_display");
	},

	maximum_number_of_extensions_to_probation_period(frm) {
		frm.trigger("set_extension_table_max_rows");
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
