// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("No Dues Clearance", {
    after_save: function(frm) {
        // Make fields read-only after save
        hr_user(frm);
    },
    refresh(frm){
        var owner = frm.doc.owner;

        // Get the session user
        var session_user = frappe.session.user;

        // Check if the owner and session user are the same
        if (owner === session_user) {
            frm.meta.fields.forEach(function(field) {
                frm.set_df_property(field.fieldname, 'read_only', 1);
            })
        }
    },
    onload: function(frm) {
        // If the document is already saved, make fields read-only on load
        if (!frm.is_new()) {
            hr_user(frm);
        }
        
    }, 
        resigned_on: function(frm) {
                
                    let date1 = new Date(frm.doc.date_of_joining);
                    let date2 = new Date(frm.doc.resigned_on);
                    let differenceInTime = date2.getTime() - date1.getTime();
                    let differenceInDays = differenceInTime / (1000 * 3600 * 24);
                    frm.set_value('number_of_days_served', differenceInDays);
                    frm.refresh_field("number_of_days_served")
                
            },
            travel_desk_remarks(frm){
                frm.set_value('datetime', frappe.datetime.get_datetime_as_string(new Date()));
                frm.refresh_field("datetime")
            },
            cc_remarks(frm){
                frm.set_value('cc_datetime', frappe.datetime.get_datetime_as_string(new Date()));
                frm.refresh_field("cc_datetime")
            },
            multi_line(frm){
                frm.set_value('finance_datetime', frappe.datetime.get_datetime_as_string(new Date()));
                frm.refresh_field("finance_datetime")
            }
});
function hr_user(frm) {
    // Get the fields from the first five tabs
    let fields_to_make_read_only = [];
    let tab_count = 0;

    frm.meta.fields.forEach(function(field) {
        if (field.fieldtype === 'Tab Break') {
            tab_count++;
        }
        if (tab_count <= 5) {
            fields_to_make_read_only.push(field.fieldname);
        }
    });
    fields_to_make_read_only.forEach(function(fieldname) {
        frm.set_df_property(fieldname, 'read_only', 1);
    });
}