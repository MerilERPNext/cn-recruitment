frappe.ui.form.on("Employee Onboarding", {
    custom_account_present_in_home_account(frm) {
        if (frm.doc.custom_account_present_in_home_account == 1) {
            frm.set_df_property('custom_bank_account_details', 'hidden', 1);
            frm.set_df_property('custom_full_name_of_employee_in_home_bank', 'hidden', 0);
            frm.set_df_property('custom_home_account_type_', 'hidden', 0);
            frm.set_df_property('custom_home_account_ifsc_code', 'hidden', 0);
            frm.set_df_property('custom_home_bank_account_no_', 'hidden', 0);
            frm.set_df_property('custom_confirm_home_bank_account_no', 'hidden', 0);
        } else {
            frm.set_df_property('custom_bank_account_details', 'hidden', 0);
            frm.set_df_property('custom_full_name_of_employee_in_home_bank', 'hidden', 1);
            frm.set_df_property('custom_home_account_type_', 'hidden', 1);
            frm.set_df_property('custom_home_account_ifsc_code', 'hidden', 1);
            frm.set_df_property('custom_home_bank_account_no_', 'hidden', 1);
            frm.set_df_property('custom_confirm_home_bank_account_no', 'hidden', 1);
        }
    }
    // before_save: function(frm) {
    //     // Get all fields from the doctype
    //     const fields = frappe.meta.get_docfield("Employee Onboarding", null, frm.docname);

    //     const items = [];
    //     fields.forEach(field => {
    //         if (field.fieldtype === "Attach" && !field.hidden) {
    //             items.push({
    //                 document: field.label,
    //                 attachment: frm.doc[field.fieldname] || "",
    //                 status: "Pending"
    //             });
    //         }
    //     });

    //     // Check if the document is new and the child table is empty
    //     if (frm.is_new() && frm.doc.custom_documents_for_verification.length === 0) {
    //         items.forEach(item => {
    //             // Add a new row to the child table
    //             let child_row = frappe.model.add_child(frm.doc, "Onboarding Document Verification", "custom_documents_for_verification");

    //             // Set values for the child row fields
    //             child_row.document = item.document;
    //             child_row.attachment = item.attachment;
    //             child_row.status = item.status;
    //         });

    //         // Refresh the child table field to display the new rows
    //         frm.refresh_field("custom_documents_for_verification");
    //     }
    // },
    // refresh: function(frm) {
    //     frm.get_field("custom_documents_for_verification").grid.cannot_add_rows = true;

    //     // Refresh the field to apply the change
    //     frm.refresh_field("custom_documents_for_verification");
    // }
});
