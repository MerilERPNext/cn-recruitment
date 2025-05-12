frappe.ui.form.on('Training Request', {
    request_type: function(frm) {
        if (frm.doc.request_type === 'Self') {
            frm.clear_table('employees');
            frm.refresh_field('employees');
        }
    }
});
