frappe.ui.form.on("Employee Onboarding", {
    refresh: function (frm) {
        if (!frm.doc.employee && frm.doc.docstatus === 1) {
            frm.remove_custom_button("Employee", "Create");

            frm.add_custom_button(
                __("Create Employee"),
                () => frm.events.create_employee(frm),  
                __("Create")
            );
            frm.page.set_inner_btn_group_as_primary(__("Create"));
        }
    },

    create_employee(frm) {
        frappe.call({
            method: "recruitment.auto_fetch_fields.employee_fetch_fields",
            args: { employee_onboarding: frm.doc.name },
            callback: function (r) {
                if (r.message) {
                    let doclist = frappe.model.sync(r.message);
                    frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
                }
            },
        });
    },

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
		var pincode_pattern = /^[0-9]{6}$/;
        if (frm.doc.pincode && !pincode_pattern.test(frm.doc.pincode)) {
            frappe.msgprint(__('Please enter a valid 6-digit pincode number'));
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