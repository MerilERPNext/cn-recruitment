frappe.ui.form.on('Leave Allocation', {
    onload: function(frm) {
        if (!frm.doc.__islocal && frm.doc.custom_comp_off_log) {
            frappe.dashboard.add_doctype_count('Comp Off Log', 
                {'name': frm.doc.custom_comp_off_log}, 
                __('Comp Off Details'));
        }
    }
});
