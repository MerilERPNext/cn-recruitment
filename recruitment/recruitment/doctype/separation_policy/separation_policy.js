// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Separation Policy", {
    refresh(frm) {
        frm.trigger("update_approval_flow_child");
    },
    
    capture_date_of_resignation(frm){
        frm.trigger("update_approval_flow_child");
    },
    
    update_approval_flow_child: function(frm){
        if (!frm.doc.capture_date_of_resignation) return;
        (frm.doc.approval_flow_configuration || []).forEach(row => {
            frappe.model.set_value(row.doctype, row.name, "exclude_capture", 0);
            frappe.model.set_value(row.doctype, row.name, "exception", 0);
        });
        ["exclude_capture", "exception"].forEach(field => {
            frm.fields_dict.approval_flow_configuration.grid.update_docfield_property(field, "read_only", 1);
        });
    }
});
