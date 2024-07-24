// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on('Employee Exit Interview', {
    onload: function(frm) {
        if (frm.is_new()) {
            frm.meta.fields.forEach(function(field) {
                frm.set_df_property(field.fieldname, 'hidden', 1);
            });
            //$('.page-head-content').hide();
            frappe.throw("You Can't Create Exit Interview From Here.")
        }
    },
    refresh: function(frm) {
        if (frm.is_new()) {
            frm.meta.fields.forEach(function(field) {
                frm.set_df_property(field.fieldname, 'hidden', 1);
            });
            
        } else {
            frm.meta.fields.forEach(function(field) {
                frm.set_df_property(field.fieldname, 'hidden', 0);
            });
        }
    }
});

