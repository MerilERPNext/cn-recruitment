frappe.ui.form.on("Employee Onboarding", {
    custom_account_present_in_home_account(frm){
		if(frm.doc.custom_account_present_in_home_account==1){
            frm.set_df_property('custom_bank_account_details', 'hidden', 1);
            frm.set_df_property('custom_full_name_of_employee_in_home_bank', 'hidden', 0);
            frm.set_df_property('custom_home_account_type_', 'hidden', 0);
            frm.set_df_property('custom_home_account_ifsc_code', 'hidden', 0);
            frm.set_df_property('custom_home_bank_account_no_', 'hidden', 0);
            frm.set_df_property('custom_confirm_home_bank_account_no', 'hidden', 0);
		}
		else{
            frm.set_df_property('custom_bank_account_details', 'hidden', 0);
            frm.set_df_property('custom_full_name_of_employee_in_home_bank', 'hidden', 1);
            frm.set_df_property('custom_home_account_type_', 'hidden', 1);
            frm.set_df_property('custom_home_account_ifsc_code', 'hidden', 1);
            frm.set_df_property('custom_home_bank_account_no_', 'hidden', 1);
            frm.set_df_property('custom_confirm_home_bank_account_no', 'hidden', 1);
		}
	}
})