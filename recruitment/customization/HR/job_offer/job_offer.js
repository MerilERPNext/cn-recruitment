frappe.ui.form.on("Job Offer", {
    refresh: function(frm) {
          frm.add_custom_button(__('Send Job Offer'), function(){
            frappe.msgprint("button clicked");
        });
    }
})