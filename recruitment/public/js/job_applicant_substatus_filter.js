frappe.ui.form.on('Job Applicant', {
    status: function(frm) {
        
        if (!frm.doc.status) return;

        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Sub Status",
                filters: { "parent_status": frm.doc.status },
                fieldname: ["sub_status"]
            },
            callback: function(r) {
                let options = [];
                let description = "";

                if (r.message && r.message.sub_status) {
                    options = r.message.sub_status.split('\n');
                }

                if (options.length === 0) {
                    description = "No sub-status available for this status. Please update the Sub Status master.";
                }

                frm.set_df_property('custom_substatus', 'options', options);
                frm.set_df_property('custom_substatus', 'description', description);
                frm.refresh_field('custom_substatus');
            }
        });
    },

    onload: function(frm) {
        if (frm.doc.status) {
            frm.trigger('status');
        }
    }
});
