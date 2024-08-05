frappe.ui.form.on("Employee Onboarding", {
	validate: function(frm) {
       
        var mobile_pattern = /^[0-9]{10}$/;
        if (frm.doc.mobile && !mobile_pattern.test(frm.doc.custom_personal_contact_no)) {
            frappe.msgprint(__('Please enter a valid 10-digit mobile number'));
            frappe.validated = false;
        }
        var pan_pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (frm.doc.custom_pan_card_number && !pan_pattern.test(frm.doc.custom_pan_card_number)) {
            frappe.msgprint(__('Please enter a valid PAN card number'));
            frappe.validated = false;
        }
        var aadhaar_pattern = /^[0-9]{12}$/;
        if (frm.doc.custom_aadhar_card_number && !aadhaar_pattern.test(frm.doc.custom_aadhar_card_number)) {
            frappe.msgprint(__('Please enter a valid 12-digit Aadhaar card number'));
            frappe.validated = false;
        }
    },
	custom_have_applied_for_pan(frm){
		if(frm.doc.custom_have_applied_for_pan==1){
			frm.set_df_property('custom_upload_pan_card', 'hidden', 1);
			frm.set_df_property('custom_pan_card_number', 'hidden', 1);
		}
		else{
			frm.set_df_property('custom_upload_pan_card', 'hidden', 0);
			frm.set_df_property('custom_pan_card_number', 'hidden', 0);
		}
	}
})