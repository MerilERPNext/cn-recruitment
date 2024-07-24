frappe.ui.form.on("Employee Separation", {
    refresh: function(frm) {
        frm.add_custom_button(__(frm.doc.employee), function() {
            frappe.set_route('Form', 'No Dues Clearance', frm.doc.employee);
            // frappe.call('recruitment.exit_process.get_exit_interviews').then(r => {
            //     console.log(r.message)
            // })
        });

    },
    custom_last_working_date: function(frm) {
        var d = new Date(frm.doc.custom_last_working_date);
        d.setDate(d.getDate() - 2);

        // Format the date as YYYY-MM-DD
        var formatted_date = d.toISOString().split('T')[0];

        frm.set_value('boarding_begins_on', formatted_date);
    },
});
