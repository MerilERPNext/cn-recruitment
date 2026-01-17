// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Confirmation Policy", {
    refresh(frm) {
        frm.trigger("set_extension_table_max_rows");
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
