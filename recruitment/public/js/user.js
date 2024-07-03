frappe.ui.form.on('User', {
    // frm passed as the first parameter
    after_save(frm) {
        frappe.call('recruitment.customizations.user.user.create_recruiter', {
            user: frm.doc.name
        }).then(r => {
            

        })
    }
})
