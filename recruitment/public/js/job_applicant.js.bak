frappe.ui.form.on("Job Applicant", {
    refresh: function(frm){
		
    }
})
frappe.ui.form.on('Job Applicant Notes', {
    custom_notes_add: function (frm,cdt,cdn) {
        var child = locals[cdt][cdn];
		child.added_by=frappe.session.user
		child.added_on=new Date()
		cur_frm.refresh_field("custom_notes");
    },
})