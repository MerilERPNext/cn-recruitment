frappe.ui.form.on('Employee', {
    refresh: function(frm) {
        if (!frm.doc.docstatus) { // Only apply if document is not submitted
            // Hide the "Status" column in the table view
            frm.fields_dict['custom_documents_for_verification'].grid.wrapper
                .find('.grid-static-col[data-fieldname="status"]').remove();

            
        }
    }
});

frappe.ui.form.on('custom_documents_for_verification', {
    form_render: function(frm, cdt, cdn) {
        // Hide "Status" field inside the row edit popup
        frappe.meta.get_docfield("custom_documents_for_verification", "status", frm).hidden = 1;
        frm.refresh_field("custom_documents_for_verification");
    }
});
