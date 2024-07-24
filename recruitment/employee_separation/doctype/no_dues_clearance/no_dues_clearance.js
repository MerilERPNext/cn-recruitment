// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("No Dues Clearance", {
        onload: function(frm) {
                if (frm.is_new()) {
                    frm.meta.fields.forEach(function(field) {
                        frm.set_df_property(field.fieldname, 'hidden', 1);
                    });
                    //$('.page-head-content').hide();
                    frappe.throw("You Can't Create It From Here.")
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
                    let date1 = new Date(frm.doc.date_of_joining);
                        let date2 = new Date(frm.doc.resigned_on);
                        let differenceInTime = date2.getTime() - date1.getTime();
                        let differenceInDays = differenceInTime / (1000 * 3600 * 24);
                        frm.set_value('number_of_days_served', differenceInDays);
                }
            }
});
