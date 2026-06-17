// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Confirmation To Separation Map", {
	onload(frm) {
		load_field_options(frm);
	},
	refresh(frm) {
		load_field_options(frm);
	},
});

frappe.ui.form.on("Confirmation To Separation Map Item", {
	confirmation_field(frm, cdt, cdn) {
		resolve_fieldname(frm, cdt, cdn, "Employee Confirmation", "confirmation_field", "confirmation_fieldname");
	},
	separation_field(frm, cdt, cdn) {
		resolve_fieldname(frm, cdt, cdn, "Employee Separation", "separation_field", "separation_fieldname");
	},
});

function load_field_options(frm) {
	frm._field_label_to_name = frm._field_label_to_name || {};
	set_grid_field_options(frm, "Employee Confirmation", "confirmation_field");
	set_grid_field_options(frm, "Employee Separation", "separation_field");
}

const SKIP_FIELDTYPES = ["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Fold", "Heading"];

function set_grid_field_options(frm, doctype, column) {
	frappe.model.with_doctype(doctype, function () {
		const meta = frappe.get_meta(doctype);
		if (!meta) return;
		const label_to_name = {};
		const labels = [];
		(meta.fields || []).forEach((f) => {
			if (!f.fieldname || !f.label) return;
			if (SKIP_FIELDTYPES.includes(f.fieldtype)) return;
			if (!(f.label in label_to_name)) labels.push(f.label);
			label_to_name[f.label] = f.fieldname;
		});
		frm._field_label_to_name[doctype] = label_to_name;
		const options = ["", ...labels.sort()].join("\n");
		frm.fields_dict.mapping.grid.update_docfield_property(column, "options", options);
		frm.refresh_field("mapping");
	});
}

function resolve_fieldname(frm, cdt, cdn, doctype, label_field, name_field) {
	const row = locals[cdt][cdn];
	const map = (frm._field_label_to_name || {})[doctype] || {};
	frappe.model.set_value(cdt, cdn, name_field, map[row[label_field]] || "");
}
