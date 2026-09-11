frappe.ui.form.on('Employee', {
    refresh: function(frm) {
        // Hide the "Status" field of Documents for Verification, both as a grid
        // column and inside the row edit form. Set on the per-form docfield copy
        // instead of removing DOM nodes, since the grid may not be rendered yet
        // (e.g. when it sits in a tab that isn't open).
        const df = frappe.meta.get_docfield("Onboarding Document Verification", "status", frm.doc.name);
        if (df) {
            df.hidden = 1;
            frm.refresh_field("custom_documents_for_verification");
        }
    }
});
